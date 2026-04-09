/**
 * Capa de datos de reseñas (mock → API real sin cambiar la UI).
 */
import {
  generateReviewsForEntityId,
  getAverage,
  getDistribution,
} from '../lib/reviewsModel'

type Review = {
  id: string
  name: string
  date: string
  rating: number
  comment: string
}

type RatingBucket = { stars: number; count: number }

function hashUserId(s: string): number {
  let h = 0
  const str = String(s ?? '')
  for (let i = 0; i < str.length; i += 1) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return h >>> 0
}

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
    rating: 5,
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

function getReviewsMock(): Review[] {
  return MOCK_REVIEWS
}

/** Lista mostrada en reseñas: siempre la fila de prueba primero, luego el mock base (o API). */
function mergeReviewsWithTestRow(base: Review[]): Review[] {
  return [REVIEWS_TEST_ROW, ...base]
}

/**
 * Fuente única para la pantalla Reseñas: lista + resumen deben usar solo esto (mismo array lógico).
 */
export function getReviewsForScreen(): Review[] {
  return mergeReviewsWithTestRow(getReviewsMock())
}

const PROFILE_NAMES = [
  'Ana García',
  'Pablo Fernández',
  'Marta López',
  'Luis Ramírez',
  'Elena Sánchez',
  'Carlos Martínez',
  'Lucía Rodríguez',
  'Jorge González',
]

const PROFILE_BRANDS = ['Audi', 'BMW', 'Seat', 'Toyota', 'Peugeot', 'Mercedes', 'Renault', 'Ford']

const PROFILE_MODELS = ['A3', 'Serie 1', 'León', 'Corolla', '308', 'Clase A', 'Clio', 'Focus']

const PROFILE_PLATES = [
  '1234 ABC',
  '5678 DEF',
  '9012 GHI',
  '3456 JKL',
  '7890 MNO',
  '2468 PQR',
  '1357 STU',
  '8642 VWX',
]

const PROFILE_COLORS = ['gris', 'negro', 'blanco', 'azul', 'rojo']

/** Perfil mínimo para `ProfileHeader` en reseñas de otro usuario (mock determinista). */
export function buildMockProfileForUserReviews(userId: string | null) {
  const id = String(userId ?? '').trim() || 'user'
  const h = hashUserId(id)
  return {
    full_name: PROFILE_NAMES[h % PROFILE_NAMES.length],
    email: '',
    avatar_url: `https://i.pravatar.cc/150?u=${encodeURIComponent(id)}`,
    brand: PROFILE_BRANDS[h % PROFILE_BRANDS.length],
    model: PROFILE_MODELS[h % PROFILE_MODELS.length],
    plate: PROFILE_PLATES[h % PROFILE_PLATES.length],
    color: PROFILE_COLORS[h % PROFILE_COLORS.length],
    vehicle_type: 'car',
  }
}

const REVIEW_AUTHOR_NAMES = ['Laura M.', 'Carlos P.', 'Sofía R.', 'Andrés T.', 'Marta L.', 'Iván R.']

const REVIEW_DATES = ['hoy', 'hace 2 días', 'hace 1 semana', 'hace 2 semanas', 'hace 3 semanas']

const COMMENT_BY_RATING: Record<number, string> = {
  5: 'Excelente, todo perfecto.',
  4: 'Muy bien, repetiría.',
  3: 'Correcto, sin problemas.',
  2: 'Regular, mejorable.',
  1: 'No cumplió expectativas.',
}

function expandRatingsToReviews(userId: string, ratings: { rating: number }[]): Review[] {
  const h = hashUserId(userId)
  return ratings.map((r, i) => ({
    id: `${userId}-rev-${i}`,
    name: REVIEW_AUTHOR_NAMES[(h + i) % REVIEW_AUTHOR_NAMES.length],
    date: REVIEW_DATES[(h + i) % REVIEW_DATES.length],
    rating: r.rating,
    comment: COMMENT_BY_RATING[r.rating] ?? 'Valoración recibida.',
  }))
}

/** Lista para reseñas de otro usuario — misma forma que `getReviewsForScreen`. */
export function getReviewsForUserScreen(userId: string): Review[] {
  const id = String(userId ?? '').trim() || 'guest'
  const ratings = generateReviewsForEntityId(id)
  return mergeReviewsWithTestRow(expandRatingsToReviews(id, ratings))
}

export function buildRatingDistribution(reviews: Review[]): RatingBucket[] {
  const d = getDistribution(reviews)
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: d[stars as keyof typeof d] ?? 0,
  }))
}

export function computeAverageRating(reviews: Review[]): number {
  return getAverage(reviews)
}
