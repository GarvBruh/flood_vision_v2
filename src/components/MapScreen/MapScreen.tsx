import React, { useState, useEffect, useCallback, useRef } from 'react'
import './MapScreen.css'
import { MapCanvas } from './MapCanvas'
import {
  MUMBAI_HUBS,
  type Place,
  type RouteData,
  type SavedNamedRoute,
  getSavedNamedRoutes,
  saveNamedRoute,
  deleteNamedRoute,
  buildGoogleMapsUrl,
} from './routeTypes'
import { fetchRoadRoutes } from '../../services/routingService'
import { findNearbyFloodSpots, type BMCFloodSpot } from '../../data/bmcFloodSpots'

export interface MapScreenProps {
  onEmergencyClick?: () => void
}

export const MapScreen: React.FC<MapScreenProps> = ({ onEmergencyClick }) => {
  // Saved named routes (Home to Office, Home to Market, Market to Office, etc.)
  const [savedRoutes, setSavedRoutes] = useState<SavedNamedRoute[]>(() => getSavedNamedRoutes())
  // Initially null: NO route is selected by default; page opens with clean map
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Panel minimize state
  const [isMinimized, setIsMinimized] = useState(false)

  // Creation mode for new named route
  const [isCreating, setIsCreating] = useState(false)
  const [newRouteName, setNewRouteName] = useState('')
  const [newFromHub, setNewFromHub] = useState('Dadar')
  const [newToHub, setNewToHub] = useState('BKC (Bandra Kurla Complex)')

  // Route evaluation state
  const [primaryRoute, setPrimaryRoute] = useState<RouteData | null>(null)
  const [altRoute, setAltRoute] = useState<RouteData | null>(null)
  const [alternativeSpotCount, setAlternativeSpotCount] = useState(0)
  const [activeRouteVariant, setActiveRouteVariant] = useState<'primary' | 'alternative'>('primary')
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const routeRequestId = useRef(0)

  // Rain and Risk state
  const [rainEstimate, setRainEstimate] = useState<number | null>(null)
  const [demoRainSimulation, setDemoRainSimulation] = useState<boolean>(false)
  const [overlappingSpots, setOverlappingSpots] = useState<BMCFloodSpot[]>([])

  // Teammate emergency modal
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)

  // Currently active selected saved route (null when no route is chosen)
  const activeSavedRoute = selectedRouteId
    ? savedRoutes.find((r) => r.id === selectedRouteId) || null
    : null

  // Filtered routes based on search query
  const filteredRoutes = savedRoutes.filter((r) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      r.name.toLowerCase().includes(q) ||
      r.from.name.toLowerCase().includes(q) ||
      r.to.name.toLowerCase().includes(q)
    )
  })

  // Effective rain value: demo simulation takes immediate precedence if active
  const effectiveRain = demoRainSimulation ? 15.0 : rainEstimate

  // Risk Condition: Rain is estimated near the route AND the real road route overlaps a BMC mapped flood spot
  const hasWaterloggingRisk = effectiveRain !== null && effectiveRain > 0 && overlappingSpots.length > 0

  const getHub = (name: string): Place => {
    return MUMBAI_HUBS.find((h) => h.name === name) || MUMBAI_HUBS[0]
  }

  // Evaluates a road route from origin to destination using OSRM
  const evaluateRoute = useCallback(async (from: Place, to: Place, routeTitle: string) => {
    const requestId = ++routeRequestId.current
    setIsLoadingRoute(true)
    setRouteError(null)
    setActiveRouteVariant('primary')
    setPrimaryRoute(null)
    setAltRoute(null)
    setOverlappingSpots([])
    setAlternativeSpotCount(0)
    setRainEstimate(null)

    try {
      // Fetch real road routes (never straight line, never across water)
      const roadRoutes = await fetchRoadRoutes(from.lat, from.lon, to.lat, to.lon)
      if (requestId !== routeRequestId.current) return

      const primary: RouteData = {
        id: 'primary',
        name: routeTitle,
        from,
        to,
        distanceKm: roadRoutes[0].distanceKm,
        durationMins: roadRoutes[0].durationMins,
        coordinates: roadRoutes[0].coordinates,
        createdAt: new Date().toLocaleTimeString(),
      }

      // Find BMC-mapped spots near the primary route
      const nearbySpots = findNearbyFloodSpots(primary.coordinates || [], 0.45)

      // Look for a valid alternative road route
      let alternative: RouteData | null = null
      let altSpotCount = 0
      if (roadRoutes.length > 1) {
        const altCandidates = roadRoutes.slice(1).map((candidate) => ({
          candidate,
          spots: findNearbyFloodSpots(candidate.coordinates || [], 0.45),
        }))
        const bestAlt = altCandidates.find((c) => c.spots.length < nearbySpots.length) || altCandidates[0]
        if (bestAlt) {
          alternative = {
            id: 'alternative',
            name: `Alternative Route for ${routeTitle}`,
            from,
            to,
            distanceKm: bestAlt.candidate.distanceKm,
            durationMins: bestAlt.candidate.durationMins,
            coordinates: bestAlt.candidate.coordinates,
            createdAt: new Date().toLocaleTimeString(),
            isAlternative: true,
          }
          altSpotCount = bestAlt.spots.length
        }
      }

      setPrimaryRoute(primary)
      setAltRoute(alternative)
      setOverlappingSpots(nearbySpots)
      setAlternativeSpotCount(altSpotCount)

      // Fetch real Open-Meteo rain forecast for destination
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${to.lat}&longitude=${to.lon}&current=precipitation,rain&timezone=Asia%2FKolkata`,
          { signal: AbortSignal.timeout(8000) }
        )
        if (!res.ok) throw new Error('Rain estimate unavailable')
        const data = await res.json()
        const estimate = Number(data.current?.precipitation)
        if (requestId === routeRequestId.current) {
          setRainEstimate(Number.isFinite(estimate) ? estimate : null)
        }
      } catch {
        if (requestId === routeRequestId.current) setRainEstimate(null)
      }
    } catch (err) {
      if (requestId !== routeRequestId.current) return
      setRouteError(
        err instanceof Error
          ? err.message
          : 'Unable to calculate road route. Routing service unavailable.'
      )
      setPrimaryRoute(null)
      setAltRoute(null)
    } finally {
      if (requestId === routeRequestId.current) setIsLoadingRoute(false)
    }
  }, [])

  // Automatically evaluate route ONLY when an active route is selected
  useEffect(() => {
    if (activeSavedRoute) {
      const timer = setTimeout(() => {
        void evaluateRoute(activeSavedRoute.from, activeSavedRoute.to, activeSavedRoute.name)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [activeSavedRoute, evaluateRoute])

  // Selected variant falls back to 'primary' if risk or altRoute is not present
  const currentVariant = hasWaterloggingRisk && altRoute ? activeRouteVariant : 'primary'

  // Clear route selection (cleans route line and markers from map)
  const handleClearSelection = () => {
    routeRequestId.current += 1
    setSelectedRouteId(null)
    setIsLoadingRoute(false)
    setPrimaryRoute(null)
    setAltRoute(null)
    setOverlappingSpots([])
    setAlternativeSpotCount(0)
    setRainEstimate(null)
    setRouteError(null)
  }

  // Select or toggle a saved route
  const handleSelectRoute = (route: SavedNamedRoute) => {
    if (selectedRouteId === route.id) {
      handleClearSelection()
    } else {
      setSelectedRouteId(route.id)
      setIsCreating(false)
    }
  }

  // Delete a saved route
  const handleDeleteRoute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = deleteNamedRoute(id)
    setSavedRoutes(updated)
    if (selectedRouteId === id) {
      handleClearSelection()
    }
  }

  // Save a new named route
  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault()
    const from = getHub(newFromHub)
    const to = getHub(newToHub)

    if (from.name === to.name) {
      setRouteError('Origin and destination cannot be the same.')
      return
    }

    const defaultTitle = `${from.name} to ${to.name}`
    const finalTitle = newRouteName.trim() || defaultTitle

    const newRoute: SavedNamedRoute = {
      id: `route-${Date.now()}`,
      name: finalTitle,
      from,
      to,
      createdAt: 'Custom',
    }

    const updated = saveNamedRoute(newRoute)
    setSavedRoutes(updated)
    setSelectedRouteId(newRoute.id)
    setIsCreating(false)
    setNewRouteName('')
  }

  // Active route plotted on the map (null if no route is chosen)
  const activeMapRoute =
    activeSavedRoute
      ? currentVariant === 'alternative' && altRoute
        ? altRoute
        : primaryRoute
      : null

  return (
    <div className="commute-screen">
      {/* Top Header */}
      <header className="commute-header">
        <div className="header-brand">
          <span className="brand-title">Flood Vision</span>
          <span className="brand-subtitle">Commute Waterlogging Check · Mumbai</span>
        </div>

        {/* Teammate Emergency Action (Preserved & Separate) */}
        <button
          type="button"
          className="btn-emergency-commute"
          onClick={() => {
            if (onEmergencyClick) onEmergencyClick()
            else setShowEmergencyModal(true)
          }}
          aria-label="Emergency assistance"
        >
          Emergency Help
        </button>
      </header>

      {/* Floating Reopen Button (Visible when panel is minimized) */}
      {isMinimized && (
        <button
          type="button"
          className="btn-reopen-panel"
          onClick={() => setIsMinimized(false)}
          aria-label="Reopen route panel"
          title="Open route panel"
        >
          <span className="reopen-icon" aria-hidden="true">🗺️</span>
          <span>Saved Routes{activeSavedRoute ? ` · ${activeSavedRoute.name}` : ''}</span>
        </button>
      )}

      {/* Main Commute Panel */}
      {!isMinimized && (
        <div className="commute-panel" role="region" aria-label="Route Planning Panel">
          {/* Panel Top Bar with Heading, Clear Selection, and Minimize Button */}
          <div className="panel-top-bar">
            <span className="panel-heading">My Saved Routes</span>
            <div className="panel-actions">
              {selectedRouteId && (
                <button
                  type="button"
                  className="btn-clear-selection"
                  onClick={handleClearSelection}
                  title="Clear selected route from map"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="btn-minimize-panel"
                onClick={() => setIsMinimized(true)}
                aria-label="Minimize route panel"
                title="Minimize panel"
              >
                −
              </button>
            </div>
          </div>

          {/* Search/Filter Bar */}
          <div className="routes-search-bar">
            <input
              type="text"
              className="routes-search-input"
              placeholder="Filter saved routes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter saved routes"
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
                aria-label="Clear filter"
                title="Clear filter"
              >
                ×
              </button>
            )}
          </div>

          {/* Saved Routes Selector (Pills) */}
          <div className="saved-routes-selector" role="tablist" aria-label="Select a saved route">
            {filteredRoutes.length === 0 ? (
              <div className="routes-empty-state">
                <span>No routes match "{searchQuery}"</span>
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={() => setSearchQuery('')}
                >
                  Clear filter
                </button>
              </div>
            ) : (
              filteredRoutes.map((r) => {
                const isSelected = r.id === selectedRouteId
                return (
                  <div
                    key={r.id}
                    role="tab"
                    tabIndex={0}
                    aria-selected={isSelected}
                    className={`route-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectRoute(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSelectRoute(r)
                    }}
                  >
                    <span className="pill-name">{r.name}</span>
                    {savedRoutes.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove-pill"
                        onClick={(e) => handleDeleteRoute(r.id, e)}
                        title={`Delete route ${r.name}`}
                        aria-label={`Delete ${r.name}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Toggle New Route Creation */}
          {!isCreating ? (
            <button
              type="button"
              className="btn-add-route"
              onClick={() => setIsCreating(true)}
              aria-label="Add a new named route"
            >
              + Add New Route
            </button>
          ) : (
            <form className="new-route-form" onSubmit={handleCreateRoute}>
              <div className="form-title">Save New Commute Route</div>

              <div className="form-field">
                <label htmlFor="new-route-name-input" className="field-label">
                  Route Name:
                </label>
                <input
                  id="new-route-name-input"
                  type="text"
                  className="text-input"
                  placeholder="e.g. Home to Gym"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="new-from-select" className="field-label">
                  From:
                </label>
                <select
                  id="new-from-select"
                  className="select-field"
                  value={newFromHub}
                  onChange={(e) => setNewFromHub(e.target.value)}
                >
                  {MUMBAI_HUBS.map((h) => (
                    <option key={h.name} value={h.name}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="new-to-select" className="field-label">
                  To:
                </label>
                <select
                  id="new-to-select"
                  className="select-field"
                  value={newToHub}
                  onChange={(e) => setNewToHub(e.target.value)}
                >
                  {MUMBAI_HUBS.map((h) => (
                    <option key={h.name} value={h.name}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-buttons">
                <button type="submit" className="btn-save-new">
                  Save in Browser
                </button>
                <button
                  type="button"
                  className="btn-cancel-new"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Loading Indicator */}
          {isLoadingRoute && (
            <div className="evaluating-banner" role="status">
              <span>Calculating road route & checking risk...</span>
            </div>
          )}

          {/* Error Message */}
          {routeError && (
            <div className="alert-box error" role="alert">
              <strong>Routing Notice:</strong> {routeError}
            </div>
          )}

          {/* Clean Map Guidance (shown when NO route is selected) */}
          {!activeSavedRoute && !isLoadingRoute && (
            <div className="clean-map-hint">
              <span className="hint-bullet" aria-hidden="true">🗺️</span>
              <div className="hint-content">
                <span className="hint-title">Clean Map View</span>
                <span className="hint-copy">
                  Select a saved route above to calculate road paths, check BMC flood-spot overlap, and see Google Maps links.
                </span>
              </div>
            </div>
          )}

          {/* Active Route Status Card */}
          {activeSavedRoute && primaryRoute && (
            <div className="route-status-card">
              <div className="active-route-meta">
                <div className="meta-endpoints">
                  <span>{activeSavedRoute.from.name}</span>
                  <span className="arrow-sep">→</span>
                  <span>{activeSavedRoute.to.name}</span>
                </div>
                <div className="meta-stats">
                  <span>{primaryRoute.distanceKm} km via road</span>
                  <span>·</span>
                  <span>~{primaryRoute.durationMins || 15} mins</span>
                </div>
              </div>

              {/* Open Main Route in Google Maps */}
              <div className="google-maps-actions">
                <a
                  href={buildGoogleMapsUrl(primaryRoute.from, primaryRoute.to)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-google-maps"
                >
                  Open main route in Google Maps ↗
                </a>
                <div className="google-maps-disclaimer">
                  Opens directions between {primaryRoute.from.name} and {primaryRoute.to.name}. Google Maps calculates its own route and live traffic.
                </div>
              </div>

              {/* Rain forecast section */}
              <div className="rain-section">
                <div className="rain-row">
                  <span>
                    Rain estimate:{' '}
                    <strong>{effectiveRain === null ? 'Unavailable' : `${effectiveRain.toFixed(1)} mm`}</strong>
                  </span>
                  <span className="source-tag">
                    {demoRainSimulation ? 'Demo Simulation' : 'Open-Meteo Model'}
                  </span>
                </div>
                <div className="rain-disclaimer">
                  Forecast model estimate for destination. Not live ground radar.
                </div>

                {/* Clearly labeled demo simulation toggle */}
                <label className="demo-sim-toggle">
                  <input
                    type="checkbox"
                    checked={demoRainSimulation}
                    onChange={(e) => setDemoRainSimulation(e.target.checked)}
                  />
                  <span>Simulate monsoon rain (15 mm) for demo</span>
                </label>
              </div>

              {/* Waterlogging Risk Assessment */}
              {hasWaterloggingRisk ? (
                <div className="alert-box risk" role="status">
                  <div className="alert-title">
                    {demoRainSimulation ? '⚠️ High hotspot exposure (demo)' : '⚠️ Possible waterlogging risk'}
                  </div>
                  <p className="alert-text">
                    {demoRainSimulation ? 'Demo rain (15.0 mm) applied. ' : 'Rain is estimated near this route. '}
                    Route passes near BMC-mapped historical flood hotspot(s):{' '}
                    <strong>{overlappingSpots.map((s) => s.name).join(', ')}</strong>.
                  </p>
                  <p className="alert-sub">
                    Based on municipal historical flood records and rainfall data; does not confirm active street waterlogging right now.
                  </p>
                </div>
              ) : effectiveRain === null ? (
                <div className="alert-box unknown" role="status">
                  <div className="alert-title">Rain data unavailable</div>
                  <p className="alert-text">
                    {overlappingSpots.length > 0
                      ? `Route passes near BMC historical hotspot(s) (${overlappingSpots.map((s) => s.name).join(', ')}), but live rain data could not be loaded. Use "Simulate monsoon rain" to test risk.`
                      : 'Live rain data could not be loaded. Route condition cannot be confirmed.'}
                  </p>
                  <p className="alert-sub">
                    Do not assume route is clear or safe. Check municipal announcements before traveling.
                  </p>
                </div>
              ) : overlappingSpots.length > 0 ? (
                <div className="alert-box info" role="status">
                  <div className="alert-title">Mapped hotspots nearby (No rain estimated)</div>
                  <p className="alert-text">
                    Route passes near BMC-mapped historical hotspot(s): <strong>{overlappingSpots.map((s) => s.name).join(', ')}</strong>. Current destination forecast shows 0.0 mm rain.
                  </p>
                  <p className="alert-sub">
                    Historical vulnerability only. Waterlogging typically occurs during heavy rain.
                  </p>
                </div>
              ) : (
                <div className="alert-box clear" role="status">
                  <div className="alert-title">✓ No mapped BMC hotspot overlap</div>
                  <p className="alert-text">
                    {effectiveRain > 0
                      ? `Rain is estimated (${effectiveRain.toFixed(1)} mm), but this route does not intersect any mapped BMC chronic flood hotspots.`
                      : 'No rain estimated and no BMC chronic flood hotspots mapped along this route.'}
                  </p>
                  <p className="alert-sub">
                    Covers BMC documented chronic hotspots only. Unmapped waterlogging may still occur.
                  </p>
                </div>
              )}

              {/* Alternative Route Section (ONLY SHOWN WHEN RISK IS PRESENT) */}
              {hasWaterloggingRisk && altRoute && (
                <div className="alternative-box">
                  <div className="alt-title">Alternative Road Route Available</div>
                  <p className="alt-desc">
                    A road path is available with {alternativeSpotCount} hotspot(s), compared with {overlappingSpots.length} on the primary route.
                  </p>

                  <div className="variant-switch-group">
                    <button
                      type="button"
                      className={`btn-variant ${currentVariant === 'primary' ? 'active' : ''}`}
                      onClick={() => setActiveRouteVariant('primary')}
                    >
                      Primary Route ({primaryRoute.distanceKm} km · {overlappingSpots.length} hotspot{overlappingSpots.length === 1 ? '' : 's'})
                    </button>
                    <button
                      type="button"
                      className={`btn-variant alt ${currentVariant === 'alternative' ? 'active' : ''}`}
                      onClick={() => setActiveRouteVariant('alternative')}
                    >
                      Alternative Route ({altRoute.distanceKm} km · {alternativeSpotCount} hotspot{alternativeSpotCount === 1 ? '' : 's'})
                    </button>
                  </div>

                  {/* Open Alternative in Google Maps */}
                  <a
                    href={buildGoogleMapsUrl(altRoute.from, altRoute.to)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-google-maps btn-google-maps-alt"
                  >
                    Open alternative in Google Maps ↗
                  </a>
                  <div className="google-maps-disclaimer">
                    Opens directions from {altRoute.from.name} to {altRoute.to.name} in Google Maps. Google Maps calculates its own route and may not follow the exact line shown above.
                  </div>
                </div>
              )}

              {/* Notice when alternative is omitted */}
              {!hasWaterloggingRisk && effectiveRain !== null && (
                <div className="no-alt-info">
                  No alternative is suggested: this check found no rain-plus-hotspot overlap on the main route.
                </div>
              )}
            </div>
          )}

          {/* Transparent Data Limitations Note */}
          <div className="data-limits-footer">
            <div className="limits-head">Data Limitations & Transparency</div>
            <ul className="limits-list">
              <li>
                <strong>Roads:</strong> Routes follow actual streets via OpenStreetMap OSRM. Direct
                lines and water crossings are disabled.
              </li>
              <li>
                <strong>No Live Traffic:</strong> Travel durations use road speed limits. No live
                traffic congestion feeds are connected.
              </li>
              <li>
                <strong>BMC Risk Layer:</strong> Orange spots show municipal historical drainage
                hotspots, not real-time flooding.
              </li>
              <li>
                <strong>Rainfall:</strong> Weather readings are Open-Meteo numerical forecast model
                estimates.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Main Map Viewport */}
      <main className="map-viewport" role="region" aria-label="Interactive Map Area">
        <MapCanvas
          activeRoute={activeMapRoute}
          alternativeRoute={hasWaterloggingRisk ? altRoute : null}
          selectedRouteId={currentVariant}
          rainEstimateOverride={demoRainSimulation ? 15.0 : null}
          isMinimized={isMinimized}
        />
      </main>

      {/* Separate Teammate Emergency Modal */}
      {showEmergencyModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergency-dialog-title"
          onClick={() => setShowEmergencyModal(false)}
        >
          <div className="emergency-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 id="emergency-dialog-title" className="dialog-title">
              Emergency Helplines & Resources
            </h2>
            <div className="dialog-body">
              <p>
                Emergency services, verified helplines, and hospital directories are maintained by
                the Emergency team on <code>feat/emergency</code>.
              </p>
              <p>Integration point ready. No numbers or facilities are invented here.</p>
            </div>
            <div className="dialog-footer">
              <button
                type="button"
                className="btn-dismiss"
                onClick={() => setShowEmergencyModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default MapScreen
