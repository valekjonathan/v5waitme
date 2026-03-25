import { colors } from '../../../design/colors'
import { spacing } from '../../../design/spacing'
import { radius } from '../../../design/radius'
import Card from '../../../ui/Card'
import Switch from '../../../ui/Switch'

export default function ProfileStats({ allowPhoneCalls, onToggle }) {
  return (
    <Card
      style={{
        background: colors.surface,
        borderRadius: radius.medium,
        padding: spacing.sm,
        border: `1px solid ${colors.borderMuted}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M22 16.92v3a2 2 0 01-2.18 2 19.84 19.84 0 01-8.63-3.07A19.5 19.5 0 015.15 12.8 19.84 19.84 0 012.08 4.16 2 2 0 014 2h3a2 2 0 012 1.72c.12.89.33 1.77.62 2.61a2 2 0 01-.45 2.11L8 9.62a16 16 0 006.38 6.38l1.18-1.17a2 2 0 012.11-.45c.84.29 1.72.5 2.61.62A2 2 0 0122 16.92z"
            stroke={colors.primary}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span style={{ color: colors.textPrimary, fontSize: 14 }}>Permitir llamadas</span>
      </div>
      <Switch checked={allowPhoneCalls} onToggle={onToggle} ariaLabel="Permitir llamadas telefónicas" />
    </Card>
  )
}
