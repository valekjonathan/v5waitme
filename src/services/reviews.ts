/**
 * Capa de datos de reseñas (mock → API real sin cambiar la UI).
 */
export type Review = {
  id: string
  name: string
  date: string
  rating: number
  comment: string
}

export type RatingBucket = { stars: number; count: number }

/** Fila extra para lista + resumen (misma referencia lógica; evita duplicar en UI). */
const REVIEWS_TEST_ROW: Review = {
  id: 'test-1',
  name: 'Mario',
  rating: 1,
  date: 'hoy',
  comment:
    'Muy mala experiencia, tardaron muchísimo en avisarme del sitio.\nCuando llegué ya estaba ocupado.\nEl sistema no es fiable y me hizo perder tiempo.\nNo repetiría ni lo recomendaría.\nDebería mejorar mucho.',
}

const MOCK_REVIEWS: Review[] = [
  {
    id: 'r1',
    name: 'Laura M.',
    date: 'hoy',
    rating: 4,
    comment: 'Muy puntual y amable. Todo perfecto.',
  },
  {
    id: 'r2',
    name: 'Carlos P.',
    date: 'hace 2 días',
    rating: 3,
    comment: 'Buena experiencia, repetiría sin duda.',
  },
  {
    id: 'r3',
    name: 'Sofía R.',
    date: 'hace 1 semana',
    rating: 4,
    comment: 'Comunicación rápida y excelente trato.',
  },
  {
    id: 'r4',
    name: 'Andrés T.',
    date: 'hace 2 semanas',
    rating: 3,
    comment: 'Todo bien y muy profesional.',
  },
]

export function getReviewsMock(): Review[] {
  return MOCK_REVIEWS
}

/** Lista mostrada en reseñas: siempre la fila de prueba primero, luego el mock base (o API). */
export function mergeReviewsWithTestRow(base: Review[]): Review[] {
  return [REVIEWS_TEST_ROW, ...base]
}

/**
 * Fuente única para la pantalla Reseñas: lista + resumen deben usar solo esto (mismo array lógico).
 */
export function getReviewsForScreen(): Review[] {
  return mergeReviewsWithTestRow(getReviewsMock())
}

export function buildRatingDistribution(reviews: Review[]): RatingBucket[] {
  return [4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((item) => Number(item.rating) === stars).length,
  }))
}

export function computeAverageRating(reviews: Review[]): number {
  if (!reviews.length) return 0
  const score = reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0)
  return score / reviews.length
}
