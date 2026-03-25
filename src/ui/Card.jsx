/**
 * Contenedor base tipo tarjeta; solo añade box-sizing. Los estilos visuales van en `style`.
 */
export default function Card({ style, children, ...rest }) {
  return (
    <div style={{ boxSizing: 'border-box', ...style }} {...rest}>
      {children}
    </div>
  )
}
