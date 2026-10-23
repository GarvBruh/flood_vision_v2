export interface RoadRoute {
  id: string
  name: string
  distanceKm: number
  durationMins: number
  coordinates: [number, number][] // [lat, lon] format for Leaflet
  summary: string
}

/**
 * Fetches real road routes using the public OpenStreetMap OSRM routing service.
 * Never creates straight lines or cuts across water.
 * If the service fails, it throws an error so no fake route is drawn.
 */
export async function fetchRoadRoutes(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<RoadRoute[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&alternatives=true`

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) {
    throw new Error(`Routing service error (${response.status})`)
  }

  const data = await response.json()
  if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error('No road route could be found between these locations.')
  }

  return data.routes.map((r: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }, index: number) => {
    // GeoJSON coordinates are [lon, lat]; convert to Leaflet [lat, lon]
    const leafletCoords: [number, number][] = r.geometry.coordinates.map(([lon, lat]) => [lat, lon])

    return {
      id: index === 0 ? 'primary' : `alt-${index}`,
      name: index === 0 ? 'Primary Route' : `Alternative Route ${index}`,
      distanceKm: Number((r.distance / 1000).toFixed(1)),
      durationMins: Math.round(r.duration / 60),
      coordinates: leafletCoords,
      summary: index === 0 ? 'Fastest road connection' : 'Alternative road path',
    }
  })
}
