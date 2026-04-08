/**
 * Datos mock solo para UI de chats (sin backend).
 * @typedef {{ id: string, from: 'me' | 'them', text: string, at: string }} ChatMsg
 * @typedef {{ id: string, name: string, rating: number, lastMessage: string, time: string, brand: string, model: string, plate: string, messages: ChatMsg[] }} ChatThread
 */

/** @type {ChatThread[]} */
export const CHAT_MOCK_THREADS = [
  {
    id: 'carlos',
    name: 'Carlos',
    rating: 4,
    lastMessage: 'Sí, estoy en la zona',
    time: '10:03',
    brand: 'Opel',
    model: 'Corsa',
    plate: '2145 BCD',
    messages: [
      { id: 'c1', from: 'them', text: '¿Sigues esperando sitio?', at: '10:02' },
      { id: 'c2', from: 'me', text: 'Sí, estoy en la zona', at: '10:03' },
    ],
  },
  {
    id: 'lucia',
    name: 'Lucía',
    rating: 5,
    lastMessage: 'Perfecto gracias!',
    time: '09:42',
    brand: 'Toyota',
    model: 'Yaris',
    plate: '9012 XYZ',
    messages: [
      { id: 'l1', from: 'them', text: 'Ya me fui, te dejo el sitio', at: '09:41' },
      { id: 'l2', from: 'me', text: 'Perfecto gracias!', at: '09:42' },
    ],
  },
  {
    id: 'andres',
    name: 'Andrés',
    rating: 4,
    lastMessage: 'Voy en 5 min',
    time: '11:15',
    brand: 'VW',
    model: 'Golf',
    plate: '5566 MNO',
    messages: [
      { id: 'a1', from: 'me', text: '¿Sigues con la plaza?', at: '11:10' },
      { id: 'a2', from: 'them', text: 'Sí, te la guardo', at: '11:11' },
      { id: 'a3', from: 'them', text: 'Voy en 5 min', at: '11:15' },
    ],
  },
  {
    id: 'marta',
    name: 'Marta',
    rating: 5,
    lastMessage: 'Genial, nos vemos',
    time: '08:56',
    brand: 'Renault',
    model: 'Clio',
    plate: '7788 PQR',
    messages: [
      { id: 'm1', from: 'them', text: 'Te aviso cuando salga', at: '08:55' },
      { id: 'm2', from: 'me', text: 'Genial, nos vemos', at: '08:56' },
    ],
  },
]

/** @param {ChatThread} t */
export function threadToChatAlert(t) {
  return {
    id: t.id,
    user_name: t.name,
    rating: t.rating,
    brand: t.brand,
    model: t.model,
    plate: t.plate,
    chatLastMessage: t.lastMessage,
    user_photo: null,
  }
}
