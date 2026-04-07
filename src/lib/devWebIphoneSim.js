/**
 * Safari Mac (dev): por encima de este ancho de ventana se aplica la simulación tipo iPhone
 * (`force-iphone` en App.jsx + marco opcional en IphoneFrame en localhost).
 * Debe ser un único valor para evitar que el mismo Safari muestre layout distinto según tramo de ancho.
 * Capacitor nativo no usa esta constante.
 */
export const DEV_WEB_IPHONE_SIM_MIN_INNER_WIDTH = 500
