import { useState, type FormEvent } from 'react'

type Coordinates = { lat: number; lon: number }
type Resource = {
  id: string; name: string; category: string; address: string;
  lat: number; lon: number; distance: number
}
type OverpassElement = {
  type: string; id: number; lat?: number; lon?: number;
  center?: { lat: number; lon: number }; tags?: Record<string, string>
}

function distanceKm(a: Coordinates, b: Coordinates) {
  const rad = (d: number) => d * Math.PI / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const v = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v))
}

function getCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Location is not supported by this browser.')); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(
        err.code === err.PERMISSION_DENIED
          ? 'Location permission was denied. Enter coordinates manually to search.'
          : 'Your location could not be obtained. Enter coordinates manually to search.',
      )),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  })
}

function addressFromTags(tags: Record<string, string>) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  return [
    street,
    tags['addr:suburb'],
    tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'],
    tags['addr:postcode'],
  ].filter(Boolean).join(', ')
}

async function searchOverpass(origin: Coordinates): Promise<Resource[]> {
  const query = `[out:json][timeout:25];(nwr["amenity"~"^(hospital|clinic|pharmacy)$"](around:5000,${origin.lat},${origin.lon}););out center tags 60;`
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 30000)
  let response: Response
  try {
    response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError')
      throw new Error('Nearby search timed out. Try again or enter coordinates manually.')
    throw new Error('Could not reach the OpenStreetMap search service. Check your connection and retry.')
  } finally { window.clearTimeout(timeoutId) }

  if (!response.ok) {
    if (response.status === 429) throw new Error('The map search service is rate-limiting requests. Wait a moment, then retry.')
    if (response.status === 504 || response.status === 503)
      throw new Error('The map search service is temporarily busy. Try again shortly or use manual coordinates.')
    throw new Error(`The map search service returned an error (HTTP ${response.status}). Please retry later.`)
  }
  let data: { elements?: OverpassElement[] }
  try { data = await response.json() as { elements?: OverpassElement[] } }
  catch { throw new Error('The map search service returned an unreadable response. Please retry later.') }

  const elements = Array.isArray(data.elements) ? data.elements : []
  return elements.flatMap((el) => {
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    const tags = el.tags ?? {}
    if (lat === undefined || lon === undefined) return []
    const category = tags.amenity === 'pharmacy' ? 'Pharmacy' : tags.amenity === 'hospital' ? 'Hospital' : 'Clinic'
    return [{
      id: `${el.type}-${el.id}`,
      name: tags.name || `${category} (name not provided)`,
      category,
      address: addressFromTags(tags),
      lat, lon,
      distance: distanceKm(origin, { lat, lon }),
    }]
  }).sort((a, b) => a.distance - b.distance)
}

function NearbyResources() {
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [resources, setResources]         = useState<Resource[]>([])
  const [loading, setLoading]             = useState(false)
  const [searched, setSearched]           = useState(false)
  const [status, setStatus]               = useState('')
  const [locationLabel, setLocationLabel] = useState('Location not shared')
  const [locationFeedback, setLocationFeedback] = useState('')
  const [origin, setOrigin]               = useState<Coordinates | null>(null)
  const [resultsOpen, setResultsOpen]     = useState(false)

  async function runSearch(coords: Coordinates) {
    setOrigin(coords)
    setResultsOpen(true)
    setLoading(true)
    setSearched(true)
    setStatus('Searching OpenStreetMap…')
    try {
      const results = await searchOverpass(coords)
      setResources(results)
      setStatus(results.length ? '' : 'No hospitals, clinics, or pharmacies with mapped coordinates were returned within 5 km.')
    } catch (err) {
      setResources([])
      setStatus(err instanceof Error ? err.message : 'Nearby search failed. Please try again later.')
    } finally { setLoading(false) }
  }

  async function searchNearMe() {
    setResources([])
    setSearched(false)
    setOrigin(null)
    setLocationFeedback('')
    setResultsOpen(false)
    setLocationLabel('Requesting location…')
    setStatus('Requesting location permission…')
    try {
      const coords = await getCoordinates()
      setLat(coords.lat.toFixed(6))
      setLon(coords.lon.toFixed(6))
      setLocationLabel('Device location obtained')
      await runSearch(coords)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Your location could not be obtained.'
      setLocationLabel(message)
      setStatus(message)
      setResultsOpen(true)
    }
  }

  function searchManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const latitude  = Number(lat)
    const longitude = Number(lon)
    if (!lat.trim() || !lon.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      setResources([])
      setSearched(false)
      setOrigin(null)
      setLocationLabel('Manual coordinates needed')
      setResultsOpen(true)
      setStatus('Enter valid latitude (−90 to 90) and longitude (−180 to 180).')
      return
    }
    setLocationLabel('Using manually entered coordinates')
    void runSearch({ lat: latitude, lon: longitude })
  }

  async function copyLocation() {
    if (!origin) return
    try {
      await navigator.clipboard.writeText(`${origin.lat.toFixed(6)}, ${origin.lon.toFixed(6)}`)
      setLocationFeedback('Coordinates copied.')
    } catch { setLocationFeedback('Clipboard access is unavailable in this browser.') }
  }

  const isLocating = loading && !origin

  return (
    <div style={{ marginTop: 20 }}>
      <div className="ep-panel">
        <div className="ep-panel-header">
          <div>
            <p className="ep-panel-label">OpenStreetMap · 5 km radius</p>
            <p className="ep-panel-title">Hospitals &amp; pharmacies nearby</p>
          </div>
        </div>

        {/* Location status */}
        <div className="ep-location-strip">
          <span
            className={`ep-location-dot${origin ? ' is-active' : isLocating ? ' is-loading' : ''}`}
            aria-hidden="true"
          />
          <span>
            <span className="ep-location-label">{locationLabel}</span>
            {origin && (
              <span className="ep-location-coords" style={{ display: 'block' }}>
                {origin.lat.toFixed(5)}, {origin.lon.toFixed(5)}
              </span>
            )}
          </span>
        </div>

        <div className="ep-location-actions">
          {origin && (
            <button
              className="ep-btn ep-btn-ghost"
              type="button"
              onClick={() => void copyLocation()}
            >
              Copy location
            </button>
          )}
          <button
            className="ep-btn ep-btn-secondary"
            type="button"
            onClick={() => void searchNearMe()}
            disabled={loading}
          >
            {loading ? 'Searching…' : origin ? 'Refresh' : 'Find nearby help'}
          </button>
        </div>

        {locationFeedback && (
          <p className="ep-inline-status" role="status">{locationFeedback}</p>
        )}

        {/* Disclaimer */}
        <p style={{ fontSize: 'var(--fs-small)', color: 'var(--faint)', margin: '12px 0 4px', lineHeight: 1.5 }}>
          Listings may be incomplete or outdated. No opening hours, phone numbers, or availability
          are verified here; call ahead using a trusted source. When you search, your coordinates
          are sent to the public Overpass API.
        </p>

        {/* Manual coordinate form */}
        <form className="ep-coord-form" onSubmit={searchManual}>
          <fieldset disabled={loading}>
            <legend>Or enter coordinates manually</legend>
            <div className="ep-field-group">
              <label className="ep-label" htmlFor="ep-coord-lat">Latitude</label>
              <input
                id="ep-coord-lat"
                className="ep-input"
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="e.g. 19.0760"
              />
            </div>
            <div className="ep-field-group">
              <label className="ep-label" htmlFor="ep-coord-lon">Longitude</label>
              <input
                id="ep-coord-lon"
                className="ep-input"
                inputMode="decimal"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="e.g. 72.8777"
              />
            </div>
            <button className="ep-btn ep-btn-secondary" type="submit" style={{ alignSelf: 'flex-end' }}>
              Search
            </button>
          </fieldset>
        </form>

        {/* Status message */}
        {status && (
          <p
            className="ep-inline-status"
            role="status"
            aria-live="polite"
            style={{ marginTop: 8 }}
          >
            {status}
          </p>
        )}

        {/* Retry */}
        {status && !loading && origin && resources.length === 0 && (
          <button
            className="ep-btn ep-btn-secondary"
            type="button"
            onClick={() => void runSearch(origin)}
            style={{ marginTop: 8 }}
          >
            Retry nearby search
          </button>
        )}

        {/* Results */}
        {searched && resources.length > 0 && (
          <details open={resultsOpen} onToggle={(e) => setResultsOpen(e.currentTarget.open)}>
            <summary
              className="ep-accordion-trigger"
              style={{ marginTop: 12, borderTop: '1px solid var(--rule)', paddingTop: 12 }}
            >
              <span className="ep-accordion-text">
                <strong>
                  {resources.length} result{resources.length > 1 ? 's' : ''} within 5 km
                </strong>
              </span>
              <span className="ep-accordion-chevron" aria-hidden="true">▾</span>
            </summary>
            <ul className="ep-results" aria-label="Nearby medical facilities">
              {resources.map((r) => (
                <li key={r.id} className="ep-result-row">
                  <div className="ep-result-info">
                    <span className="ep-result-name">{r.name}</span>
                    <span className="ep-result-meta">
                      {r.category} · {r.distance.toFixed(1)} km
                    </span>
                    {r.address && <span className="ep-result-address">{r.address}</span>}
                  </div>
                  <a
                    className="ep-result-link"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Directions ↗
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Attribution */}
        <p className="ep-attribution">
          Map data ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">
            OpenStreetMap contributors
          </a>
          . Search uses the public Overpass API; availability and completeness are not guaranteed.{' '}
          <a href="https://112.gov.in/" target="_blank" rel="noreferrer noopener">
            For urgent medical emergencies, call 112.
          </a>
        </p>
      </div>
    </div>
  )
}

export default NearbyResources
