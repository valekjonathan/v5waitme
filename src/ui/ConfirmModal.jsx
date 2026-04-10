import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { colors } from '../design/colors'
import Button from './Button'

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 2147483646,
  backgroundColor: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  boxSizing: 'border-box',
  pointerEvents: 'auto',
}

const boxStyle = {
  maxWidth: 320,
  width: '100%',
  backgroundColor: colors.background,
  borderRadius: 16,
  padding: 20,
  border: `1px solid ${colors.border}`,
  boxSizing: 'border-box',
}

const textStyle = {
  margin: 0,
  marginBottom: 16,
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.45,
  color: colors.textPrimary,
  textAlign: 'center',
  whiteSpace: 'pre-line',
}

const errorTextStyle = {
  margin: 0,
  marginBottom: 12,
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.35,
  color: colors.danger,
  textAlign: 'center',
}

const rowStyle = {
  display: 'flex',
  gap: 10,
  marginTop: 4,
}

/**
 * Modal de confirmación. Se renderiza con portal en `document.body` para que los clics
 * funcionen aunque el padre tenga `pointer-events: none` (p. ej. overlay del mapa).
 *
 * @param {{ open: boolean, message: string, errorMessage?: string | null, cancelLabel?: string, confirmLabel?: string, onCancel: () => void, onConfirm: () => void }} props
 */
export default function ConfirmModal({
  open,
  message,
  errorMessage = null,
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  onCancel,
  onConfirm,
}) {
  const [mountNode, setMountNode] = useState(/** @type {HTMLElement | null} */ (null))

  useEffect(() => {
    setMountNode(typeof document !== 'undefined' ? document.body : null)
  }, [])

  if (!open || !mountNode) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-hidden={false}
      style={overlayStyle}
      onClick={onCancel}
    >
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <p style={textStyle}>{message}</p>
        {errorMessage ? (
          <p role="alert" style={errorTextStyle}>
            {errorMessage}
          </p>
        ) : null}
        <div style={rowStyle}>
          <Button type="button" variant="secondary" style={{ flex: 1 }} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="primary" style={{ flex: 1 }} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    mountNode
  )
}
