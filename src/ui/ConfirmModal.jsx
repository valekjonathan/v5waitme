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

const rowStyle = {
  display: 'flex',
  gap: 10,
  marginTop: 4,
}

/**
 * @param {{ open: boolean, message: string, cancelLabel?: string, confirmLabel?: string, onCancel: () => void, onConfirm: () => void }} props
 */
export default function ConfirmModal({
  open,
  message,
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  onCancel,
  onConfirm,
}) {
  return (
    <div
      role="dialog"
      aria-modal={open}
      aria-hidden={!open}
      style={{
        ...overlayStyle,
        display: open ? 'flex' : 'none',
      }}
      onClick={onCancel}
    >
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <p style={textStyle}>{message}</p>
        <div style={rowStyle}>
          <Button type="button" variant="secondary" style={{ flex: 1 }} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="primary" style={{ flex: 1 }} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
