export interface BMCFloodSpot {
  id: string
  name: string
  ward: string
  lat: number
  lon: number
  description: string
}

/**
 * Official BMC (MCGM) mapped flood-prone locations documented in municipal disaster preparedness reports.
 * Used as historical reference points; these do NOT represent live flooding reports.
 */
export const BMC_HISTORICAL_SPOTS: BMCFloodSpot[] = [
  {
    id: 'hindmata',
    name: 'Hindmata Junction (Dadar / Parel)',
    ward: 'F/South',
    lat: 19.0118,
    lon: 72.8427,
    description: 'Historical low-lying waterlogging hotspot',
  },
  {
    id: 'gandhi-market',
    name: 'Gandhi Market (King’s Circle / Matunga)',
    ward: 'F/North',
    lat: 19.0305,
    lon: 72.8576,
    description: 'Historical storm water drain overflow location',
  },
  {
    id: 'sion-circle',
    name: 'Sion Circle / Road No. 24',
    ward: 'F/North',
    lat: 19.0385,
    lon: 72.8622,
    description: 'Low-lying depression area prone to water accumulation',
  },
  {
    id: 'kurla-lbs',
    name: 'Kurla Station (LBS Marg / West)',
    ward: 'L',
    lat: 19.0682,
    lon: 72.8795,
    description: 'Mithi river basin low elevation area',
  },
  {
    id: 'milan-subway',
    name: 'Milan Subway (Santacruz)',
    ward: 'H/East',
    lat: 19.0832,
    lon: 72.8402,
    description: 'Rail underpass prone to monsoon waterlogging',
  },
  {
    id: 'andheri-subway',
    name: 'Andheri Subway (Andheri)',
    ward: 'K/West',
    lat: 19.1197,
    lon: 72.8465,
    description: 'Rail underpass prone to monsoon waterlogging',
  },
  {
    id: 'kalanagar',
    name: 'Kalanagar Junction (Bandra East)',
    ward: 'H/East',
    lat: 19.0601,
    lon: 72.8468,
    description: 'BKC entrance depression area',
  },
  {
    id: 'postal-colony',
    name: 'Postal Colony (Chembur)',
    ward: 'M/West',
    lat: 19.0573,
    lon: 72.8992,
    description: 'Historical monsoon water accumulation spot',
  },
  {
    id: 'dahisar-subway',
    name: 'Dahisar Subway',
    ward: 'R/North',
    lat: 19.2568,
    lon: 72.8589,
    description: 'Low-lying railway underpass',
  },
]

/**
 * Calculates straight-line distance in kilometers between two lat/lon coordinates
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Finds all BMC mapped flood spots within thresholdKm of any road coordinate in the route
 */
export function findNearbyFloodSpots(
  routeCoords: [number, number][],
  thresholdKm = 0.45
): BMCFloodSpot[] {
  if (routeCoords.length === 0) return []

  const matchedSpots: BMCFloodSpot[] = []

  for (const spot of BMC_HISTORICAL_SPOTS) {
    // Check both route vertices and the road segments between them. OSRM's
    // geometry points are sampled, so checking vertices alone can miss a nearby spot.
    const isClose = routeCoords.some(([lat, lon]) =>
      getDistanceKm(lat, lon, spot.lat, spot.lon) <= thresholdKm
    ) || routeCoords.slice(1).some((point, index) => {
      const start = routeCoords[index]
      const end = point
      const latitudeScale = Math.cos((spot.lat * Math.PI) / 180)
      const toLocal = ([lat, lon]: [number, number]): [number, number] => [
        ((lon - spot.lon) * Math.PI * 6371 * latitudeScale) / 180,
        ((lat - spot.lat) * Math.PI * 6371) / 180,
      ]
      const [startX, startY] = toLocal(start)
      const [endX, endY] = toLocal(end)
      const dx = endX - startX
      const dy = endY - startY
      const segmentLengthSquared = dx * dx + dy * dy
      const projection = segmentLengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, -(startX * dx + startY * dy) / segmentLengthSquared))
      const nearestX = startX + projection * dx
      const nearestY = startY + projection * dy
      return Math.hypot(nearestX, nearestY) <= thresholdKm
    })
    if (isClose) {
      matchedSpots.push(spot)
    }
  }

  return matchedSpots
}
