import { colors } from '../../../design/colors'
import InputBase from '../../../ui/InputBase'
import Switch from '../../../ui/Switch'
import DropdownCustom from '../../../ui/DropdownCustom'
import { Row } from '../../../ui/primitives/Row'
import { Stack } from '../../../ui/primitives/Stack'
import { LAYOUT } from '../../../ui/layout/layout'
import { profileFormVerticalGapPx } from '../../shared/profileReviewsLayout'
import { profileDisplayFirstName } from '../../../services/profile.js'
import { resolveColorFill } from './profileColors'
import { VehicleIcon } from './VehicleIcons'

const s = LAYOUT.spacing
const formStyle = { width: '100%' }
const rowStyle = { width: '100%', alignItems: 'center' }
const labelStyle = {
  width: 92,
  flexShrink: 0,
  fontSize: 16,
  color: colors.primary,
  fontWeight: 600,
}
const inputWrapStyle = { flex: 1, minWidth: 0 }
const phoneInputWrapStyle = { flex: 1, minWidth: 0, marginRight: 14 }
const errorTextStyle = { margin: 0, marginTop: 2, color: '#fda4af', fontSize: 12 }
const toggleWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'center',
  gap: 8,
  flexShrink: 0,
}
const toggleLabelStyle = {
  margin: 0,
  fontSize: 12,
  color: colors.textMuted,
  fontWeight: 700,
}
const selectWrapStyle = { flex: 1, minWidth: 0 }
const colorIconStyle = {
  width: 15,
  height: 15,
  borderRadius: '50%',
  border: `1px solid ${colors.border}`,
  flexShrink: 0,
}
const stackFullWidthStyle = { width: '100%' }

function colorDotStyleFor(value) {
  return { ...colorIconStyle, background: resolveColorFill(value) }
}

const COLOR_OPTIONS = [
  { value: 'negro', label: 'Negro' },
  { value: 'blanco', label: 'Blanco' },
  { value: 'gris', label: 'Gris' },
  { value: 'rojo', label: 'Rojo' },
  { value: 'azul', label: 'Azul' },
  { value: 'otro', label: 'Otro' },
]

const VEHICLE_TYPE_OPTIONS = [
  { value: 'car', label: 'Coche normal' },
  { value: 'suv', label: 'Voluminoso' },
  { value: 'van', label: 'Furgoneta' },
]

function legacyColorSelected(value) {
  if (value === 'verde') return { value: 'verde', label: 'Verde' }
  if (value === 'amarillo') return { value: 'amarillo', label: 'Amarillo' }
  return null
}

function legacyVehicleSelected(value) {
  if (value === 'furgoneta') return { value: 'furgoneta', label: 'Furgoneta' }
  if (value === 'moto') return { value: 'moto', label: 'Moto' }
  if (value === 'other') return { value: 'other', label: 'Otro' }
  return null
}

function renderColorDot(option) {
  return <span aria-hidden style={colorDotStyleFor(option.value)} />
}

function LabeledInputRow({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  inputMode = 'text',
  autoCapitalize = 'none',
  rightSlot = null,
}) {
  return (
    <Stack gap={4} style={stackFullWidthStyle}>
      <Row gap={s.sm} style={rowStyle}>
        <label htmlFor={id} style={labelStyle}>
          {label}
        </label>
        <div style={rightSlot ? phoneInputWrapStyle : inputWrapStyle}>
          <InputBase
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize={autoCapitalize}
            spellCheck={false}
            name="x"
            data-form-type="other"
            data-lpignore="true"
            inputMode={inputMode}
            readOnly
            onFocus={(e) => e.target.removeAttribute('readOnly')}
            placeholder={placeholder}
          />
        </div>
        {rightSlot}
      </Row>
      {error ? <p style={errorTextStyle}>{error}</p> : null}
    </Stack>
  )
}

export default function ProfileForm({ value, onChange, errors = {} }) {
  const patch = (key) => (v) => onChange((prev) => ({ ...prev, [key]: v }))
  const phoneToggleText = value.allow_phone_calls ? 'ON' : 'OFF'
  const displayName = profileDisplayFirstName(value.full_name)

  return (
    <form
      style={formStyle}
      autoComplete="off"
      data-form-type="other"
      onSubmit={(e) => e.preventDefault()}
    >
      <Stack gap={profileFormVerticalGapPx}>
        <LabeledInputRow
          id="profile-full_name"
          label="Nombre"
          value={displayName}
          onChange={(v) => patch('full_name')(v)}
          placeholder=""
          error={errors.full_name}
          autoCapitalize="words"
        />

        <LabeledInputRow
          id="profile-phone"
          label="Teléfono"
          value={String(value.phone ?? '')}
          onChange={patch('phone')}
          placeholder=""
          error={errors.phone}
          inputMode="tel"
          rightSlot={
            <div style={toggleWrapStyle}>
              <Switch
                checked={Boolean(value.allow_phone_calls)}
                onToggle={(next) => patch('allow_phone_calls')(next)}
                ariaLabel="Permitir llamadas"
              />
              <p style={toggleLabelStyle}>{phoneToggleText}</p>
            </div>
          }
        />

        <LabeledInputRow
          id="profile-brand"
          label="Marca"
          value={String(value.brand ?? '')}
          onChange={patch('brand')}
          placeholder=""
          error={errors.brand}
        />

        <LabeledInputRow
          id="profile-model"
          label="Modelo"
          value={String(value.model ?? '')}
          onChange={patch('model')}
          placeholder=""
          error={errors.model}
        />

        <Stack gap={4} style={stackFullWidthStyle}>
          <Row gap={s.sm} style={rowStyle}>
            <label htmlFor="profile-color" style={labelStyle}>
              Color
            </label>
            <div style={selectWrapStyle}>
              <DropdownCustom
                value={String(value.color ?? 'negro')}
                onChange={patch('color')}
                options={COLOR_OPTIONS}
                ariaLabel="Color del vehículo"
                renderIcon={renderColorDot}
                legacySelected={legacyColorSelected}
                triggerStyleOverride={{
                  justifyContent: 'center',
                }}
              />
            </div>
          </Row>
        </Stack>

        <Stack gap={4} style={stackFullWidthStyle}>
          <Row gap={s.sm} style={rowStyle}>
            <label htmlFor="profile-vehicle_type" style={labelStyle}>
              Tipo
            </label>
            <div style={selectWrapStyle}>
              <DropdownCustom
                value={String(value.vehicle_type ?? 'car')}
                onChange={patch('vehicle_type')}
                options={VEHICLE_TYPE_OPTIONS}
                ariaLabel="Tipo de vehículo"
                showTriggerIcon={false}
                legacySelected={legacyVehicleSelected}
                optionIconSlotPx={56}
                renderIcon={(option) => (
                  <VehicleIcon type={option.value} color={resolveColorFill('negro')} />
                )}
              />
            </div>
          </Row>
        </Stack>

        <LabeledInputRow
          id="profile-plate"
          label="Matrícula"
          value={String(value.plate ?? '')}
          onChange={patch('plate')}
          placeholder=""
          error={errors.plate}
          autoCapitalize="characters"
        />
      </Stack>
    </form>
  )
}
