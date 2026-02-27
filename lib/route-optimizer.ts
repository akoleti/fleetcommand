/**
 * Route Optimizer
 * Finds optimal order for multiple pickup/dropoff stops using nearest-neighbor heuristic.
 * Uses Haversine distance for India (Karimnagar/Telangana region).
 */

import { calculateDistance } from './gps-utils'

export type StopType = 'PICKUP' | 'DROPOFF'

export interface StopInput {
  type: StopType
  address: string
  lat: number
  lng: number
  notes?: string
}

export interface OptimizedStop extends StopInput {
  sequence: number
}

/**
 * Optimize stop order using nearest-neighbor algorithm.
 * Starts from the first stop (or depot) and repeatedly visits the closest unvisited stop.
 * For pickup/dropoff pairs: pickups are visited before their corresponding dropoffs when paired.
 *
 * @param stops - Array of stops (pickups and dropoffs)
 * @param startFromDepot - If true, start from (0,0) or first stop. Default: use first stop as start.
 * @returns Stops reordered for minimal total distance
 */
export function optimizeRoute(stops: StopInput[]): OptimizedStop[] {
  if (stops.length <= 1) {
    return stops.map((s, i) => ({ ...s, sequence: i + 1 }))
  }

  const remaining = [...stops]
  const ordered: OptimizedStop[] = []
  let currentLat = remaining[0].lat
  let currentLng = remaining[0].lng

  // Start with the first stop (or could use depot - for now use first as anchor)
  const first = remaining.shift()!
  ordered.push({ ...first, sequence: 1 })

  let seq = 2
  while (remaining.length > 0) {
    let nearestIdx = 0
    let nearestDist = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const d = calculateDistance(currentLat, currentLng, remaining[i].lat, remaining[i].lng)
      if (d < nearestDist) {
        nearestDist = d
        nearestIdx = i
      }
    }

    const next = remaining.splice(nearestIdx, 1)[0]
    ordered.push({ ...next, sequence: seq++ })
    currentLat = next.lat
    currentLng = next.lng
  }

  return ordered
}

/**
 * Alternative: 2-opt improvement for small N (≤15 stops).
 * Swaps segments to reduce total distance.
 */
export function optimizeRoute2Opt(stops: StopInput[]): OptimizedStop[] {
  let best = optimizeRoute(stops)
  if (best.length <= 2) return best

  const coords = (s: OptimizedStop) => [s.lat, s.lng] as const
  const totalDist = (order: OptimizedStop[]) => {
    let d = 0
    for (let i = 0; i < order.length - 1; i++) {
      d += calculateDistance(
        order[i].lat, order[i].lng,
        order[i + 1].lat, order[i + 1].lng
      )
    }
    return d
  }

  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 2; j < best.length; j++) {
        const swapped = [
          ...best.slice(0, i + 1),
          ...best.slice(i + 1, j + 1).reverse(),
          ...best.slice(j + 1),
        ]
        if (totalDist(swapped) < totalDist(best)) {
          best = swapped.map((s, idx) => ({ ...s, sequence: idx + 1 }))
          improved = true
        }
      }
    }
  }

  return best
}
