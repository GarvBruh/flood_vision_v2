import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapCanvas.css'
import type { Place, RouteData } from './routeTypes'
import { BMC_HISTORICAL_SPOTS } from '../../data/bmcFloodSpots'

const MUMBAI: Place = { name: 'Mumbai', lat: 19.076, lon: 72.8777 }
const FLOOD_SPOTS_URL =
  'https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers_WGS/MapServer/344/query?where=1%3D1&geometry=72.7%2C18.8%2C73.1%2C19.3&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=NAME%2CWARD&returnGeometry=true&outSR=4326&geometryPrecision=5&f=geojson'

type Rain = { precipitation: number | null; rain: number | null; time: string; locationName: string }

export interface MapCanvasProps {
  activeRoute?: RouteData | null
  alternativeRoute?: RouteData | null
  selectedRouteId?: string
  rainEstimateOverride?: number | null
  isMinimized?: boolean
}

export function MapCanvas({
  activeRoute,
  alternativeRoute,
  selectedRouteId = 'primary',
  rainEstimateOverride,
  isMinimized = false,
}: MapCanvasProps) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const routeLayerGroup = useRef<L.LayerGroup | null>(null)
  const floodRiskLayerGroup = useRef<L.LayerGroup | null>(null)
  const hadRouteRef = useRef(false)
  const rainRequestId = useRef(0)

  const [rain, setRain] = useState<Rain | null>(null)
  const [showFloodSpots, setShowFloodSpots] = useState(true)
  const [tileError, setTileError] = useState(false)

  // Initial map setup
  useEffect(() => {
    if (!element.current) return
    const instance = L.map(element.current, { zoomControl: false }).setView([MUMBAI.lat, MUMBAI.lon], 11)
    map.current = instance

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(instance)

    tileLayer.on('tileerror', () => {
      setTileError(true)
    })
    tileLayer.on('tileload', () => {
      setTileError(false)
    })

    L.control.zoom({ position: 'bottomright' }).addTo(instance)

    // Municipal historical risk spots layer (visible by default)
    const bmcGroup = L.layerGroup().addTo(instance)
    floodRiskLayerGroup.current = bmcGroup
    for (const spot of BMC_HISTORICAL_SPOTS) {
      L.circleMarker([spot.lat, spot.lon], {
        radius: 7,
        color: '#c2410c',
        weight: 1.5,
        fillColor: '#ea580c',
        fillOpacity: 0.6,
      })
        .bindPopup(
          `<strong>${spot.name}</strong><br/>` +
            `<span style="color:#64748b;font-size:11px;">Ward ${spot.ward} · ${spot.description}</span><br/>` +
            `<span style="color:#ea580c;font-size:11px;font-weight:600;">BMC mapped flood-prone area (historical risk, not live flooding).</span>`
        )
        .addTo(bmcGroup)
    }

    routeLayerGroup.current = L.layerGroup().addTo(instance)

    // Attempt loading ArcGIS BMC flood-prone layer if reachable
    const loadArcGisSpots = async () => {
      try {
        const response = await fetch(FLOOD_SPOTS_URL, { signal: AbortSignal.timeout(6000) })
        if (!response.ok) throw new Error('ArcGIS layer unavailable')
        const data = await response.json()
        if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          L.geoJSON(data, {
            style: { color: '#ea580c', weight: 1.5, fillColor: '#f97316', fillOpacity: 0.25 },
            onEachFeature: (feature, layer) => {
              const name = feature.properties?.NAME || feature.properties?.name || 'BMC flood-prone area'
              layer.bindPopup(
                `<strong>${String(name)}</strong><br/><span style="color:#ea580c;font-size:11px;">BMC mapped flood-prone area (historical risk, not live flooding).</span>`
              )
            },
          }).addTo(bmcGroup)
        }
      } catch {
        // Fallback already rendered via BMC_HISTORICAL_SPOTS
      }
    }
    void loadArcGisSpots()

    // Baseline rain check
    const initialRainRequest = ++rainRequestId.current
    void fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${MUMBAI.lat}&longitude=${MUMBAI.lon}&current=precipitation,rain&timezone=Asia%2FKolkata`
    )
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((json) => {
        if (initialRainRequest !== rainRequestId.current) return
        setRain({
          precipitation: Number(json.current?.precipitation),
          rain: Number(json.current?.rain),
          time: String(json.current?.time || ''),
          locationName: 'Mumbai',
        })
      })
      .catch(() => {})

    // ResizeObserver to ensure container resize (e.g. panel minimize/open) redraws the map properly
    const resizeObserver = new ResizeObserver(() => {
      instance.invalidateSize()
    })
    resizeObserver.observe(element.current)

    const handleWindowResize = () => {
      instance.invalidateSize()
    }
    window.addEventListener('resize', handleWindowResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleWindowResize)
      instance.remove()
      map.current = null
      floodRiskLayerGroup.current = null
    }
  }, [])

  // Invalidate map size whenever isMinimized changes
  useEffect(() => {
    if (!map.current) return
    const timer = setTimeout(() => {
      map.current?.invalidateSize()
    }, 120)
    return () => clearTimeout(timer)
  }, [isMinimized])

  // Toggle flood spots visibility
  useEffect(() => {
    if (!map.current || !floodRiskLayerGroup.current) return
    if (showFloodSpots) floodRiskLayerGroup.current.addTo(map.current)
    else floodRiskLayerGroup.current.remove()
  }, [showFloodSpots])

  // Handle route display on the map using real road coordinates
  useEffect(() => {
    if (!map.current || !routeLayerGroup.current) return
    routeLayerGroup.current.clearLayers()

    if (!activeRoute) {
      if (hadRouteRef.current) {
        rainRequestId.current += 1
        setRain(null)
        map.current.setView([MUMBAI.lat, MUMBAI.lon], 11)
        hadRouteRef.current = false
      }
      return
    }
    hadRouteRef.current = true

    const { from, to, coordinates } = activeRoute

    // Start Marker (Home - Green)
    const fromMarker = L.circleMarker([from.lat, from.lon], {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#16a34a',
      fillOpacity: 1,
    }).bindPopup(`<strong>Start: ${from.name}</strong><br/>Route start point`)

    // Destination Marker (Office - Dark Blue)
    const toMarker = L.circleMarker([to.lat, to.lon], {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#1d4ed8',
      fillOpacity: 1,
    }).bindPopup(`<strong>Destination: ${to.name}</strong><br/>Route destination`)

    routeLayerGroup.current.addLayer(fromMarker)
    routeLayerGroup.current.addLayer(toMarker)

    // NEVER draw straight lines. Only draw if real road coordinates exist.
    if (coordinates && coordinates.length > 1) {
      const isPrimarySelected = selectedRouteId === 'primary'

      // Primary road route polyline
      const primaryPolyline = L.polyline(coordinates, {
        color: isPrimarySelected ? '#2563eb' : '#64748b',
        weight: isPrimarySelected ? 5 : 3.5,
        opacity: isPrimarySelected ? 0.95 : 0.65,
        dashArray: isPrimarySelected ? undefined : '6, 6',
      }).bindPopup(
        `<strong>${activeRoute.name}</strong><br/>` +
          `Distance: ${activeRoute.distanceKm} km · Road travel time: ~${activeRoute.durationMins || 15} mins`
      )
      routeLayerGroup.current.addLayer(primaryPolyline)

      // If alternative road route is provided
      if (alternativeRoute && alternativeRoute.coordinates && alternativeRoute.coordinates.length > 1) {
        const isAltSelected = selectedRouteId === 'alternative'
        const altPolyline = L.polyline(alternativeRoute.coordinates, {
          color: isAltSelected ? '#0d9488' : '#64748b',
          weight: isAltSelected ? 5 : 3.5,
          opacity: isAltSelected ? 0.95 : 0.65,
          dashArray: isAltSelected ? undefined : '6, 6',
        }).bindPopup(
          `<strong>Alternative Route</strong><br/>` +
            `Distance: ${alternativeRoute.distanceKm} km · Travel time: ~${alternativeRoute.durationMins || 15} mins<br/>` +
            `<span style="color:#0d9488;font-size:11px;">Alternative road route with fewer historical hotspots.</span>`
        )
        routeLayerGroup.current.addLayer(altPolyline)
      }

      // Fit the selected road path
      const selectedCoordinates =
        selectedRouteId === 'alternative' && alternativeRoute?.coordinates?.length
          ? alternativeRoute.coordinates
          : coordinates
      map.current.fitBounds(selectedCoordinates, { padding: [60, 60], maxZoom: 14 })
    }

    // Update rain reading for destination area
    const targetLat = to.lat
    const targetLon = to.lon
    const targetName = to.name
    const requestId = ++rainRequestId.current
    void fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=precipitation,rain&timezone=Asia%2FKolkata`,
      { signal: AbortSignal.timeout(8000) }
    )
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((json) => {
        if (requestId !== rainRequestId.current) return
        const precipitation = Number(json.current?.precipitation)
        setRain({
          precipitation: Number.isFinite(precipitation) ? precipitation : null,
          rain: Number.isFinite(Number(json.current?.rain)) ? Number(json.current?.rain) : null,
          time: String(json.current?.time || ''),
          locationName: targetName,
        })
      })
      .catch(() => {
        if (requestId === rainRequestId.current) setRain(null)
      })
  }, [activeRoute, alternativeRoute, selectedRouteId])

  const flyTo = (place: Place) => {
    map.current?.flyTo([place.lat, place.lon], 13, { duration: 1 })
  }

  const effectiveRain =
    rainEstimateOverride !== undefined && rainEstimateOverride !== null
      ? rainEstimateOverride
      : rain?.precipitation ?? null

  return (
    <>
      <div className="leaflet-map" ref={element} aria-label="Interactive map of Mumbai" />

      {/* Network or tile availability notice */}
      {tileError && (
        <div className="map-tile-error-banner" role="alert">
          Map tiles loading slowly. Street markers and BMC layers remain active.
        </div>
      )}

      {/* BMC Flood-Spots Layer Toggle */}
      <button
        type="button"
        className={`flood-layer-toggle ${showFloodSpots ? 'is-active' : ''}`}
        onClick={() => setShowFloodSpots((visible) => !visible)}
        aria-pressed={showFloodSpots}
        title={showFloodSpots ? 'Hide mapped flood-risk spots' : 'Show mapped flood-risk spots'}
      >
        <span className="flood-toggle-dot" aria-hidden="true" />
        <span>{showFloodSpots ? 'BMC spots on' : 'Show BMC spots'}</span>
      </button>

      {/* Practical Environmental Data Card */}
      <aside className="commute-data-card" aria-live="polite">
        <div className="commute-card-row">
          <span className="card-label">Rain near {rain?.locationName || MUMBAI.name}:</span>
          <span className="card-value">
            {effectiveRain === null ? 'Unavailable' : `${effectiveRain.toFixed(1)} mm`}
            {rainEstimateOverride !== undefined && rainEstimateOverride !== null
              ? ' (Demo simulation)'
              : ' (Model estimate)'}
          </span>
        </div>
        <div className="card-subtext">
          Source: Open-Meteo numerical weather model. Not live radar.
        </div>

        <div className="commute-card-row" style={{ marginTop: '6px' }}>
          <span className="card-label">BMC Risk Layer:</span>
          <span className="card-tag-bmc">Orange zones mapped</span>
        </div>
        <div className="card-subtext">
          Historical flood-prone areas mapped by BMC. Does not indicate live flooding.
        </div>

        <div className="card-source-links">
          <a href="https://api.open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo API
          </a>
          {' · '}
          <a
            href="https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers_WGS/MapServer/344"
            target="_blank"
            rel="noreferrer"
          >
            BMC GIS Source
          </a>
        </div>
      </aside>

      <div className="map-tools">
        <button type="button" onClick={() => map.current?.zoomIn()} aria-label="Zoom in" title="Zoom in">
          +
        </button>
        <button type="button" onClick={() => map.current?.zoomOut()} aria-label="Zoom out" title="Zoom out">
          −
        </button>
        <button type="button" onClick={() => flyTo(MUMBAI)} aria-label="Center Mumbai" title="Center Mumbai">
          ⌂
        </button>
      </div>
    </>
  )
}
export default MapCanvas
