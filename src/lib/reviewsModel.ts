/**
 * Fuente de verdad para medias y distribución (1–5★).
 * Cualquier objeto con `rating` numérico es válido.
 */

export type RatingEntry = { rating: number }

export function getAverage(
  reviews: ReadonlyArray<{ rating?: number } | null | undefined> | null | undefined
): number {
  if (!reviews?.length) return 0
  const sum = reviews.reduce((acc, r) => acc + Number(r?.rating ?? 0), 0)
  return +(sum / reviews.length).toFixed(1)
}

export function getDistribution(
  reviews: ReadonlyArray<{ rating?: number } | null | undefined> | null | undefined
): Record<1 | 2 | 3 | 4 | 5, number> {
  const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews || []) {
    const n = Math.round(Number(r?.rating ?? 0))
    if (n >= 1 && n <= 5) dist[n as 1 | 2 | 3 | 4 | 5] += 1
  }
  return dist
}

function hashString(s: string): number {
  let h = 0
  const str = String(s ?? '')
  for (let i = 0; i < str.length; i += 1) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return h >>> 0
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Reseñas simuladas deterministas por id (mapa, hilos DM, perfil visitado). */
export function generateReviewsForEntityId(id: string): RatingEntry[] {
  const rng = mulberry32(hashString(String(id)))
  const count = 7 + Math.floor(rng() * 14)
  const out: RatingEntry[] = []
  for (let i = 0; i < count; i += 1) {
    out.push({ rating: 1 + Math.floor(rng() * 5) })
  }
  return out
}
