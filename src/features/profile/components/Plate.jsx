import { colors } from '../../../design/colors'
import { radius } from '../../../design/radius'

export default function Plate({ value, editable = false, onChange }) {
  const formatPlate = (raw) => {
    const clean = String(raw || '')
      .replace(/\s/g, '')
      .toUpperCase()
    if (clean.length <= 4) return clean
    return clean.slice(0, 4) + ' ' + clean.slice(4, 7)
  }

  return (
    <div
      style={{
        width: 154,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        border: `2px solid ${colors.plateBorder}`,
        borderRadius: radius.medium,
        overflow: 'hidden',
        background: colors.white,
      }}
    >
      <div
        style={{
          width: 22,
          height: '100%',
          background: colors.plateBlue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.textPrimary,
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        E
      </div>

      {/* CONTENIDO INTERNO (NO TOCAR CONTENEDOR) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: colors.plateInnerText,
        }}
      >
        {editable ? (
          <input
            value={formatPlate(value)}
            onChange={(e) => {
              const clean = e.target.value.replace(/\s/g, '').toUpperCase()
              onChange(clean)
            }}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="nope"
            data-form-type="other"
            data-lpignore="true"
            inputMode="text"
            readOnly
            onFocus={(e) => e.target.removeAttribute('readOnly')}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              textAlign: 'center',
              font: 'inherit',
              letterSpacing: 'inherit',
              color: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <span
            style={{
              font: 'inherit',
              letterSpacing: 'inherit',
            }}
          >
            {formatPlate(value)}
          </span>
        )}
      </div>
    </div>
  )
}
