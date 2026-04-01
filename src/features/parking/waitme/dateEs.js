/** Equivalente a date-fns format(..., 'es') para tarjetas WaitMe (sin dependencia date-fns). */

export function formatEsMonthDayTime(ms) {
  const d = new Date(ms)
  const datePart = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(d)
  const capitalized = datePart.charAt(0).toUpperCase() + datePart.slice(1)
  const timePart = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
  return `${capitalized} - ${timePart}`
}

export function formatTimeHHmm(ms) {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms))
}

/** Cabecera tarjeta: "1 Abril - 19:26" (día + mes sin "de" + hora). */
export function formatCardHeaderDate(ms) {
  const d = new Date(ms)
  const day = d.getDate()
  const monthRaw = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(d)
  const monthName = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1)
  const time = formatTimeHHmm(ms)
  return `${day} ${monthName} - ${time}`
}
