import { useState, type FormEvent } from 'react'

type Coordinates = { lat: number; lon: number }
type Resource = { id: string; name: string; category: string; address: string; lat: number; lon: number; distance: number }
type OverpassElement = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

function distanceKm(a: Coordinates, b: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const dLat = radians(b.lat - a.lat)
  const dLon = radians(b.lon - a.lon)
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function getCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Location is not supported by this browser.')); return }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      (error) => reject(new Error(error.code === error.PERMISSION_DENIED ? 'Location permission was denied. Enter coordinates manually to search.' : 'Your location could not be obtained. Enter coordinates manually to search.')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  })
}

function addressFromTags(tags: Record<string, string>) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  return [street, tags['addr:suburb'], tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'], tags['addr:postcode']].filter(Boolean).join(', ')
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
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Nearby search timed out. Try again or enter coordinates manually.')
    throw new Error('Could not reach the OpenStreetMap search service. Check your connection and retry.')
  } finally { window.clearTimeout(timeoutId) }
  if (!response.ok) {
    if (response.status === 429) throw new Error('The map search service is rate-limiting requests. Wait a moment, then retry.')
    if (response.status === 504 || response.status === 503) throw new Error('The map search service is temporarily busy. Try again shortly or use manual coordinates.')
    throw new Error(`The map search service returned an error (HTTP ${response.status}). Please retry later.`)
  }
  let data: { elements?: OverpassElement[] }
  try { data = await response.json() as { elements?: OverpassElement[] } }
  catch { throw new Error('The map search service returned an unreadable response. Please retry later.') }
  const elements = Array.isArray(data.elements) ? data.elements : []
  return elements.flatMap((element) => {
    const lat = element.lat ?? element.center?.lat
    const lon = element.lon ?? element.center?.lon
    const tags = element.tags ?? {}
    if (lat === undefined || lon === undefined) return []
    const originCoordinates = { lat, lon }
    const category = tags.amenity === 'pharmacy' ? 'Pharmacy' : tags.amenity === 'hospital' ? 'Hospital' : 'Clinic'
    return [{ id: `${element.type}-${element.id}`, name: tags.name || `${category} (name not provided)`, category, address: addressFromTags(tags), lat, lon, distance: distanceKm(origin, originCoordinates) }]
  }).sort((a, b) => a.distance - b.distance)
}

function NearbyResources() {
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [status, setStatus] = useState('')
  const [locationLabel, setLocationLabel] = useState('Location not shared')
  const [locationFeedback, setLocationFeedback] = useState('')
  const [origin, setOrigin] = useState<Coordinates | null>(null)
  const [resultsExpanded, setResultsExpanded] = useState(false)

  async function runSearch(origin: Coordinates) {
    setOrigin(origin)
    setResultsExpanded(true)
    setLoading(true)
    setSearched(true)
    setStatus('Searching OpenStreetMap…')
    try {
      const results = await searchOverpass(origin)
      setResources(results)
      setStatus(results.length ? '' : 'No hospitals, clinics, or pharmacies with mapped coordinates were returned within 5 km.')
    } catch (error) {
      setResources([])
      setStatus(error instanceof Error ? error.message : 'Nearby search failed. Please try again later.')
    } finally { setLoading(false) }
  }

  async function searchNearMe() {
    setResources([])
    setSearched(false)
    setOrigin(null)
    setLocationFeedback('')
    setResultsExpanded(false)
    setLocationLabel('Requesting location permission…')
    setStatus('Requesting location permission…')
    try {
      const position = await getCoordinates()
      setLat(position.lat.toFixed(6))
      setLon(position.lon.toFixed(6))
      setLocationLabel('Device location obtained')
      await runSearch(position)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Your location could not be obtained.'
      setLocationLabel(message)
      setStatus(message)
      setResultsExpanded(true)
    }
  }

  function searchManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const latitude = Number(lat)
    const longitude = Number(lon)
    if (!lat.trim() || !lon.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      setResources([])
      setSearched(false)
      setOrigin(null)
      setLocationLabel('Manual coordinates needed')
      setResultsExpanded(true)
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

  return (
    <section className="medical-strip" aria-label="Location and nearby medical help">
      <div className="medical-location-status">
        <span className="medical-location-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg></span>
        <span className={`medical-location-dot${origin ? ' has-location' : ''}`} aria-hidden="true" />
        <span><strong>{locationLabel}</strong><small>{origin ? `${origin.lat.toFixed(5)}, ${origin.lon.toFixed(5)}` : 'Location is only requested when you choose to search.'}</small></span>
      </div>
      <div className="medical-strip-actions">
        {origin && <button className="emergency-text-button" type="button" onClick={() => void copyLocation()}>Copy location</button>}
        <button className="emergency-secondary-button" type="button" onClick={() => void searchNearMe()} disabled={loading}>{loading ? 'Finding nearby help…' : origin ? 'Refresh location' : 'Find nearby help'}</button>
      </div>
      {locationFeedback && <span className="medical-feedback" role="status">{locationFeedback}</span>}
      <details className="emergency-accordion medical-accordion" open={resultsExpanded} onToggle={(event) => setResultsExpanded(event.currentTarget.open)}>
        <summary><span><strong>Hospitals &amp; pharmacies</strong><small>OpenStreetMap listings near your location · 5 km search radius</small></span><span className="accordion-chevron" aria-hidden="true">⌄</span></summary>
        <div className="accordion-content">
          <p className="emergency-muted">Listings may be incomplete or outdated. No opening hours, phone numbers, or availability are verified here; call ahead using a trusted source. When you search, your coordinates are sent to the public Overpass API.</p>
          <form className="medical-manual-form" onSubmit={searchManual}>
            <fieldset disabled={loading}>
              <legend>Or enter coordinates manually</legend>
              <label>Latitude<input inputMode="decimal" value={lat} onChange={(event) => setLat(event.target.value)} placeholder="e.g. 19.0760" /></label>
              <label>Longitude<input inputMode="decimal" value={lon} onChange={(event) => setLon(event.target.value)} placeholder="e.g. 72.8777" /></label>
              <button className="emergency-secondary-button" type="submit">Search this area</button>
            </fieldset>
          </form>
          {status && <p className={`medical-status${status.startsWith('No hospitals') ? ' medical-empty' : ''}`} role="status" aria-live="polite">{status}</p>}
          {status && !loading && origin && resources.length === 0 && <button className="emergency-secondary-button medical-retry" type="button" onClick={() => void runSearch(origin)}>Retry nearby search</button>}
          {searched && resources.length > 0 && <ul className="medical-results">
            {resources.map((resource) => <li key={resource.id}>
              <div><strong>{resource.name}</strong><span>{resource.category} · {resource.distance.toFixed(1)} km</span>{resource.address && <small>{resource.address}</small>}</div>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${resource.lat},${resource.lon}`} target="_blank" rel="noreferrer noopener">Directions</a>
            </li>)}
          </ul>}
          <p className="medical-attribution">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">OpenStreetMap contributors</a>. Search uses the public Overpass API; availability and completeness are not guaranteed.</p>
          <a href="https://112.gov.in/" target="_blank" rel="noreferrer noopener">For an urgent medical emergency, call 112</a>
        </div>
      </details>
    </section>
  )
}

export default NearbyResources
