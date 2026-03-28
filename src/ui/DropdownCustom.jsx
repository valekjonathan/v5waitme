import { useEffect, useMemo, useRef, useState } from 'react'
import { colors } from '../design/colors'
import { radius } from '../design/radius'
import { LAYOUT } from './layout/layout'

const s = LAYOUT.spacing

const rootStyle = {
  position: 'relative',
  width: '100%',
}

const triggerStyle = {
  width: '100%',
  height: 36,
  boxSizing: 'border-box',
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.small,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: `0 ${s.md}px`,
  color: colors.textPrimary,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const triggerLeftStyle = {
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
}

const triggerLabelStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const menuStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  width: '100%',
  marginTop: 4,
  background: colors.background,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.small,
  zIndex: 120,
  overflow: 'visible',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  boxSizing: 'border-box',
  paddingLeft: s.md,
  paddingRight: s.md,
}

const menuInnerWrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'center',
}

const optionBaseStyle = {
  width: '100%',
  maxWidth: '100%',
  alignSelf: 'stretch',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '8px 0',
  background: 'transparent',
  border: 'none',
  color: colors.textPrimary,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const optionInnerRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 8,
}

const optionHoverStyle = {
  background: colors.primary,
}

const chevronStyle = {
  width: 8,
  height: 8,
  borderRight: `1.5px solid ${colors.primary}`,
  borderBottom: `1.5px solid ${colors.primary}`,
  transform: 'rotate(45deg)',
  flexShrink: 0,
}

const optionLabelStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.2,
  textAlign: 'left',
  minWidth: 90,
  flexShrink: 0,
}

function optionIconSlotStyle(iconSlotPx) {
  return {
    width: iconSlotPx,
    minWidth: iconSlotPx,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  }
}

function OptionRow({ option, renderIcon, onPick, iconSlotPx }) {
  const [hover, setHover] = useState(false)
  const slotSx = optionIconSlotStyle(iconSlotPx)
  return (
    <button
      type="button"
      style={hover ? { ...optionBaseStyle, ...optionHoverStyle } : optionBaseStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onPick(option.value)}
    >
      <span style={optionInnerRowStyle}>
        {renderIcon ? <span style={slotSx}>{renderIcon(option)}</span> : null}
        <span style={optionLabelStyle}>{option.label}</span>
      </span>
    </button>
  )
}

export default function DropdownCustom({
  value,
  options,
  onChange,
  ariaLabel,
  renderIcon,
  showTriggerIcon = true,
  placeholder = 'Seleccionar',
  triggerStyleOverride,
  /** Ancho columna icono/bolita (20 color, ~56 tipo con icono grande). */
  optionIconSlotPx = 20,
  /** Si `value` no está en `options` (datos antiguos), etiqueta/icono del trigger. */
  legacySelected,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = useMemo(() => {
    const found = options.find((option) => option.value === value)
    if (found) return found
    if (value == null || value === '') return null
    return legacySelected?.(String(value)) ?? null
  }, [options, value, legacySelected])

  useEffect(() => {
    function handleOutside(event) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target)) setOpen(false)
    }
    window.addEventListener('mousedown', handleOutside)
    return () => window.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={rootRef} style={rootStyle}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          ...triggerStyle,
          ...triggerStyleOverride,
          position: 'relative',
          justifyContent: 'center',
        }}
      >
        <span style={triggerLeftStyle}>
          {selected && renderIcon && showTriggerIcon ? renderIcon(selected) : null}
          <span style={triggerLabelStyle}>{selected ? selected.label : placeholder}</span>
        </span>
        <span
          style={{
            ...chevronStyle,
            position: 'absolute',
            right: 12,
          }}
        />
      </button>
      {open ? (
        <div style={menuStyle}>
          <div style={menuInnerWrapperStyle}>
            {options.map((option) => (
              <OptionRow
                key={option.value}
                option={option}
                renderIcon={renderIcon}
                iconSlotPx={optionIconSlotPx}
                onPick={(next) => {
                  onChange?.(next)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
