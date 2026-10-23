export interface Place {
  name: string
  lat: number
  lon: number
}

export interface SavedNamedRoute {
  id: string
  name: string
  from: Place
  to: Place
  createdAt: string
}

export interface RouteData {
  id: string
  name: string
  from: Place
  to: Place
  distanceKm: number
  durationMins?: number
  coordinates?: [number, number][] // Real road coordinates
  createdAt: string
  isAlternative?: boolean
}

export const MUMBAI_HUBS: Place[] = [
  { name: 'Dadar', lat: 19.0178, lon: 72.8478 },
  { name: 'Bandra', lat: 19.0596, lon: 72.8295 },
  { name: 'BKC (Bandra Kurla Complex)', lat: 19.0662, lon: 72.8687 },
  { name: 'Andheri', lat: 19.1136, lon: 72.8697 },
  { name: 'Lower Parel', lat: 18.9953, lon: 72.8310 },
  { name: 'Kurla', lat: 19.0726, lon: 72.8845 },
  { name: 'Sion', lat: 19.0434, lon: 72.8634 },
  { name: 'Chembur', lat: 19.0522, lon: 72.8995 },
  { name: 'Ghatkopar', lat: 19.0860, lon: 72.9090 },
  { name: 'Colaba', lat: 18.9067, lon: 72.8147 },
  { name: 'Nariman Point', lat: 18.9256, lon: 72.8242 },
  { name: 'Worli', lat: 19.0166, lon: 72.8176 },
  { name: 'Borivali', lat: 19.2288, lon: 72.8541 },
  { name: 'Thane', lat: 19.2183, lon: 72.9781 },
  { name: 'Vashi (Navi Mumbai)', lat: 19.0771, lon: 72.9986 },
  { name: 'CSMIA Airport (T2)', lat: 19.0974, lon: 72.8745 },
  { name: 'Malad', lat: 19.1874, lon: 72.8484 },
  { name: 'Powai', lat: 19.1176, lon: 72.9060 },
]

export function calculateDistanceKm(from: Place, to: Place): number {
  const R = 6371 // Earth radius in km
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLon = ((to.lon - from.lon) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(1))
}

const SAVED_ROUTES_KEY = 'floodvision_saved_named_routes_v2'

export function getSavedNamedRoutes(): SavedNamedRoute[] {
  try {
    const raw = localStorage.getItem(SAVED_ROUTES_KEY)
    if (!raw) {
      // Initialize with sample regular commute routes for Mumbai demo
      const dadar = MUMBAI_HUBS.find((h) => h.name === 'Dadar') || MUMBAI_HUBS[0]
      const bkc = MUMBAI_HUBS.find((h) => h.name.includes('BKC')) || MUMBAI_HUBS[2]
      const lowerParel = MUMBAI_HUBS.find((h) => h.name.includes('Lower Parel')) || MUMBAI_HUBS[4]

      const initial: SavedNamedRoute[] = [
        {
          id: 'route-home-office',
          name: 'Home to Office',
          from: dadar,
          to: bkc,
          createdAt: 'Saved',
        },
        {
          id: 'route-home-market',
          name: 'Home to Market',
          from: dadar,
          to: lowerParel,
          createdAt: 'Saved',
        },
        {
          id: 'route-market-office',
          name: 'Market to Office',
          from: lowerParel,
          to: bkc,
          createdAt: 'Saved',
        },
      ]
      localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(initial))
      return initial
    }
    return JSON.parse(raw) as SavedNamedRoute[]
  } catch {
    return []
  }
}

export function saveNamedRoute(route: SavedNamedRoute): SavedNamedRoute[] {
  try {
    const current = getSavedNamedRoutes()
    const filtered = current.filter((r) => r.id !== route.id)
    const updated = [route, ...filtered]
    localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(updated))
    return updated
  } catch (err) {
    console.error(err)
    return []
  }
}

export function deleteNamedRoute(id: string): SavedNamedRoute[] {
  try {
    const current = getSavedNamedRoutes()
    const updated = current.filter((r) => r.id !== id)
    localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(updated))
    return updated
  } catch (err) {
    console.error(err)
    return []
  }
}

/**
 * Builds a direct Google Maps navigation URL for real road routing between coordinates.
 */
export function buildGoogleMapsUrl(from: Place, to: Place): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&travelmode=driving`
}
