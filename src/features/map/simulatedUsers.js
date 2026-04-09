import { vehicleTypeForSimulatedIndex } from '../parking/waitme/carUtils.js'
import { generateReviewsForEntityId } from '../../lib/reviewsModel'

/** Nombres de color coherentes con `getCarFill` / tarjetas. */
const SIM_COLOR_NAMES = ['rojo', 'azul', 'negro', 'blanco', 'gris', 'verde', 'naranja']

function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashAnchor(lat, lng) {
  const s = `${lat.toFixed(5)},${lng.toFixed(5)}`
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h >>> 0
}

/** Nombre y apellidos coherentes (estilo España). */
const FULL_NAMES = [
  'Ana García',
  'Pablo Fernández',
  'Marta López',
  'Luis Ramírez',
  'Elena Sánchez',
  'Carlos Martínez',
  'Lucía Rodríguez',
  'Jorge González',
  'Sara Hernández',
  'David Pérez',
  'Cristina Díaz',
  'Iván Moreno',
  'Paula Muñoz',
  'Sergio Álvarez',
  'Nuria Romero',
  'Óscar Navarro',
  'Andrea Gutiérrez',
  'Rubén Ruiz',
  'Clara Iglesias',
  'Miguel Vázquez',
  'Laura Jiménez',
  'Alberto Torres',
  'Silvia Molina',
  'Fernando Castro',
  'Isabel Ortega',
  'Diego Rubio',
  'Rosa Delgado',
  'Héctor Ramos',
  'Patricia Gil',
  'Víctor Serrano',
  'Carmen Blanco',
  'Javier Suárez',
  'Teresa Morales',
  'Francisco Medina',
  'Pilar Castro',
  'Manuel Vega',
  'Eva Cortés',
  'Antonio León',
  'Natalia Prieto',
  'Gonzalo Cabrera',
  'Alicia Fuentes',
  'Ricardo Peña',
  'Beatriz Calvo',
  'Álvaro Crespo',
  'Sonia Domínguez',
  'Roberto Herrera',
  'Mónica Aguilar',
  'Enrique Vidal',
  'Eva Montero',
  'Javier Benítez',
  'Teresa Campos',
]

/** Direcciones realistas en Oviedo (texto para UI). */
const ADDRESSES = [
  'C/ Uría, 12',
  'Av. Galicia, 45',
  'C/ Campoamor, 7',
  'C/ Jovellanos, 3',
  'Pl. Alfonso II, 5',
  'C/ Fray Ceferino, 14',
  'C/ Covadonga, 22',
  'C/ San Francisco, 8',
  'Av. Torcuato Fernández Miranda, 31',
  'C/ Gascona, 11',
  'C/ Rosal, 19',
  'C/ Palacio Valdés, 4',
  'C/ Mon, 16',
  'C/ Doctor Fleming, 27',
  'C/ Argüelles, 9',
  'C/ Fuente Nueva, 13',
  'C/ Asturias, 6',
  'C/ Schultz, 21',
  'C/ Nicanor Piñole, 2',
  'C/ Marqués de Gastañaga, 18',
]

const BRANDS = [
  'Seat',
  'VW',
  'Toyota',
  'BMW',
  'Audi',
  'Renault',
  'Peugeot',
  'Ford',
  'Hyundai',
  'Kia',
  'Mercedes',
  'Citroën',
  'Nissan',
  'Opel',
  'Mazda',
  'Skoda',
  'Fiat',
  'Mini',
  'Volvo',
  'Dacia',
]

const MODELS = [
  'León',
  'Golf',
  'Corolla',
  '320d',
  'A4',
  'Clio',
  '308',
  'Focus',
  'i30',
  'Ceed',
  'Clase A',
  'C3',
  'Qashqai',
  'Corsa',
  'CX-5',
  'Octavia',
  '500',
  'Cooper',
  'XC40',
  'Sandero',
]

const PLATES = [
  '1234 ABC',
  '5678 DEF',
  '9012 GHI',
  '3456 JKL',
  '7890 MNO',
  '2468 PQR',
  '1357 STU',
  '8642 VWX',
  '9753 YZZ',
  '1111 AAA',
  '2222 BBB',
  '3333 CCC',
  '4444 DDD',
  '5555 EEE',
  '6666 FFF',
  '7777 GGG',
  '8888 HHH',
  '9999 III',
  '0000 JJJ',
  '1212 KKK',
  '3434 LLL',
  '5656 MMM',
  '7878 NNN',
  '9090 OOO',
  '1020 PPP',
  '3040 QQQ',
  '5060 RRR',
  '7080 SSS',
  '9010 TTT',
  '2460 UUU',
  '4680 VVV',
  '6802 WWW',
  '8024 XXX',
  '1359 YYY',
  '7913 ZZZ',
  '4682 ABC',
  '5791 DEF',
  '6804 GHI',
  '7915 JKL',
  '8026 MNO',
  '9137 PQR',
  '0248 STU',
  '1359 VWX',
  '2460 YZZ',
  '3571 AAA',
  '4682 BBB',
  '5793 CCC',
  '6804 DDD',
  '7915 EEE',
  '8026 FFF',
  '9137 GGG',
  '0248 HHH',
  '1359 III',
  '2460 JJJ',
  '3571 KKK',
]

/**
 * 50 usuarios coherentes: 10 cerca del ancla GPS, 40 repartidos por el área de Oviedo.
 * @param {number} anchorLat
 * @param {number} anchorLng
 */
export function buildSimulatedUsers(anchorLat, anchorLng) {
  const rng = mulberry32(hashAnchor(anchorLat, anchorLng))
  const users = []

  for (let i = 0; i < 10; i += 1) {
    const lat = anchorLat + (rng() - 0.5) * 0.007
    const lng = anchorLng + (rng() - 0.5) * 0.007
    users.push(buildOne(i, lat, lng, rng))
  }

  for (let i = 10; i < 50; i += 1) {
    const lat = 43.33 + rng() * 0.065
    const lng = -5.885 + rng() * 0.07
    users.push(buildOne(i, lat, lng, rng))
  }

  return users
}

function buildOne(index, lat, lng, rng) {
  const name = FULL_NAMES[index % FULL_NAMES.length]
  const brand = BRANDS[Math.floor(rng() * BRANDS.length)]
  const model = MODELS[Math.floor(rng() * MODELS.length)]
  const plate = PLATES[index % PLATES.length]
  const priceEUR = 4 + Math.floor(rng() * 12)
  const id = `sim-${index}-${lat.toFixed(4)}-${lng.toFixed(4)}`
  const reviews = generateReviewsForEntityId(id)
  const address = ADDRESSES[index % ADDRESSES.length]
  const portraitIdx = index % 99
  const women = index % 2 === 0
  const avatarUrl = women
    ? `https://randomuser.me/api/portraits/women/${portraitIdx}.jpg`
    : `https://randomuser.me/api/portraits/men/${portraitIdx}.jpg`

  return {
    id,
    name,
    address,
    avatarUrl,
    brand,
    model,
    plate,
    priceEUR,
    reviews,
    lat,
    lng,
    vehicleType: vehicleTypeForSimulatedIndex(index),
    colorName: SIM_COLOR_NAMES[index % SIM_COLOR_NAMES.length],
    /** Mix para UI: teléfono disponible o no (tarjeta). */
    hasPhoneActive: index % 3 !== 1,
  }
}
