/**
 * Adapta el usuario simulado de v5 al shape que espera UserAlertCard (WaitMe).
 * @param {object} u
 */
export function simulatedUserToAlert(u) {
  if (!u) return null
  const now = Date.now()
  const avail = 10 + (String(u.id).length % 20)
  return {
    user_name: u.name,
    brand: u.brand,
    model: u.model,
    plate: u.plate,
    price: u.priceEUR,
    latitude: u.lat,
    longitude: u.lng,
    user_photo: u.avatarUrl,
    color: 'gris',
    address: u.address || 'C/ Uría, 1',
    available_in_minutes: avail,
    wait_until: new Date(now + avail * 60 * 1000).toISOString(),
    created_date: now,
    phone: null,
    allow_phone_calls: false,
    isIncomingRequest: false,
  }
}
