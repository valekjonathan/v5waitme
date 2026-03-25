import ProfileStats from './ProfileStats'
import { resolveColorFill } from './profileColors'
import { vehicleLabel } from './VehicleIcons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { colors } from '../../../design/colors'
import { spacing } from '../../../design/spacing'
import { radius } from '../../../design/radius'
import { shadows } from '../../../design/shadows'
import Input from '../../../ui/Input'
import Button from '../../../ui/Button'
import CheckIcon from '../../../ui/icons/CheckIcon'

const labelStyle = {
  display: 'block',
  color: colors.primary,
  fontSize: 14,
  marginBottom: spacing.sm,
  textAlign: 'center',
  width: '100%',
}

const fieldWrap = { marginBottom: spacing.sm }

const selectInnerLayout = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  width: '100%',
  paddingLeft: spacing.sm,
  paddingRight: 28,
  pointerEvents: 'none',
}

const chevronStyle = {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: 16,
  fontWeight: 700,
  color: colors.textMuted,
  pointerEvents: 'none',
}

function Field({ id, labelText, value, onChange, maxLength, placeholder }) {
  return (
    <div style={fieldWrap}>
      <label htmlFor={id} style={labelStyle}>
        {labelText}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        name="x"
        data-form-type="other"
        data-lpignore="true"
        inputMode="none"
        readOnly
        onFocus={(e) => {
          e.target.removeAttribute('readOnly')
        }}
        maxLength={maxLength}
        placeholder={placeholder}
      />
    </div>
  )
}

function DropdownField({ id, labelText, value, onChange, options, renderTrigger, renderItem }) {
  const [open, setOpen] = useState(false)
  const active = useMemo(() => options.find((o) => o.value === value) || options[0], [options, value])
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const onEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onEscape)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ ...fieldWrap, position: 'relative' }}>
      <label htmlFor={id} style={labelStyle}>
        {labelText}
      </label>
      <Button id={id} type="button" variant="selectTrigger" onClick={() => setOpen((v) => !v)}>
        <div style={selectInnerLayout}>
          {renderTrigger ? renderTrigger(active) : <span>{active.label}</span>}
        </div>
        <div style={chevronStyle}>{'⌄'}</div>
      </Button>
      {open ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 52,
            zIndex: 30,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.medium,
            padding: spacing.xs,
            boxShadow: shadows.dropdown,
          }}
        >
          {options.map((o) => (
            <Button
              key={o.value}
              type="button"
              variant="menuRow"
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              <span>{renderItem ? renderItem(o) : o.label}</span>
              <span style={{ width: 14, height: 14, opacity: o.value === value ? 1 : 0 }}>
                <CheckIcon />
              </span>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

const COLOR_OPTIONS = [
  { value: 'gris', label: 'Gris' },
  { value: 'negro', label: 'Negro' },
  { value: 'blanco', label: 'Blanco' },
  { value: 'rojo', label: 'Rojo' },
  { value: 'azul', label: 'Azul' },
  { value: 'verde', label: 'Verde' },
  { value: 'amarillo', label: 'Amarillo' },
  { value: 'otro', label: 'Otro' },
]

const VEHICLE_TYPE_OPTIONS = [
  { value: 'car', label: 'Coche normal' },
  { value: 'suv', label: 'Voluminoso' },
  { value: 'van', label: 'Furgoneta' },
]

export default function ProfileForm({ value, onChange, Plate, VehicleIcon }) {
  const patch = (key) => (v) => onChange((prev) => ({ ...prev, [key]: v }))
  const selectedFill = useMemo(() => resolveColorFill(value.color), [value.color])

  const phoneShellStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    color: colors.textPrimary,
    borderRadius: radius.small,
    height: 36,
    padding: '0 12px',
    fontSize: 14,
    outline: 'none',
    textAlign: 'center',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
  }

  const phoneInputStyle = {
    flex: 1,
    minWidth: 0,
    width: '100%',
    height: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: 'inherit',
  }

  return (
    <form
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}
      autoComplete="off"
      data-form-type="other"
      onSubmit={(e) => e.preventDefault()}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
        <div style={fieldWrap}>
          <label htmlFor="profile-full_name" style={labelStyle}>
            Nombre
          </label>
          <Input
            value={String(value.full_name ?? '').slice(0, 10)}
            maxLength={10}
            onChange={(e) => onChange((prev) => ({ ...prev, full_name: e.target.value.slice(0, 10) }))}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            name="x"
            data-form-type="other"
            data-lpignore="true"
            inputMode="none"
            readOnly
            onFocus={(e) => {
              e.target.removeAttribute('readOnly')
            }}
            id="profile-full_name"
            style={{ width: '100%', height: 36, textAlign: 'center' }}
          />
        </div>
        <div style={fieldWrap}>
          <label htmlFor="profile-phone" style={labelStyle}>
            Teléfono
          </label>
          <div style={phoneShellStyle}>
            <input
              id="profile-phone"
              value={String(value.phone ?? '')}
              onChange={(e) => patch('phone')(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              name="x"
              data-form-type="other"
              data-lpignore="true"
              inputMode="tel"
              readOnly
              onFocus={(e) => {
                e.target.removeAttribute('readOnly')
              }}
              placeholder="+34 …"
              style={phoneInputStyle}
            />
          </div>
        </div>
      </div>

      <ProfileStats allowPhoneCalls={value.allow_phone_calls} onToggle={patch('allow_phone_calls')} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
        <Field id="profile-brand" labelText="Marca" value={value.brand} onChange={patch('brand')} placeholder="Seat, Renault..." />
        <Field id="profile-model" labelText="Modelo" value={value.model} onChange={patch('model')} placeholder="Ibiza, Megane..." />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
        <DropdownField
          id="profile-color"
          labelText="Color"
          value={value.color}
          onChange={patch('color')}
          options={COLOR_OPTIONS}
          renderTrigger={(active) => (
            <>
              <div style={{ width: 72, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <VehicleIcon type={value.vehicle_type || 'car'} color={resolveColorFill(active.value)} size="default" />
              </div>
              <span style={{ color: colors.textPrimary, whiteSpace: 'nowrap', fontSize: 13, transform: 'scale(0.95)' }}>
                {active.label}
              </span>
            </>
          )}
          renderItem={(o) => (
            <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <VehicleIcon type={value.vehicle_type || 'car'} color={resolveColorFill(o.value)} size="default" />
              {o.label}
            </span>
          )}
        />
        <DropdownField
          id="profile-vehicle_type"
          labelText="Vehículo"
          value={value.vehicle_type}
          onChange={patch('vehicle_type')}
          options={VEHICLE_TYPE_OPTIONS}
          renderTrigger={() => (
            <>
              <div style={{ width: 72, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <VehicleIcon type={value.vehicle_type} color={selectedFill} size="default" />
              </div>
              <span style={{ color: colors.textPrimary, whiteSpace: 'nowrap', fontSize: 13, transform: 'scale(0.95)' }}>
                {vehicleLabel(value.vehicle_type)}
              </span>
            </>
          )}
          renderItem={(o) => (
            <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <VehicleIcon type={o.value} color={selectedFill} size="default" />
              {o.label}
            </span>
          )}
        />
      </div>

      <div style={fieldWrap}>
        <label htmlFor="profile-plate" style={labelStyle}>
          Matrícula
        </label>
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: spacing.sm,
          }}
        >
          <div
            style={{
              width: 124,
              height: 36,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 154,
                height: 36,
                flexShrink: 0,
                transform: 'scaleX(0.8051948051948052)',
                transformOrigin: 'center center',
              }}
            >
              <Plate value={value.plate} editable={true} onChange={(plate) => onChange((prev) => ({ ...prev, plate }))} />
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
