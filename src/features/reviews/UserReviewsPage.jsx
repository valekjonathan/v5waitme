import { useMemo } from 'react'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import { colors } from '../../design/colors'
import Button from '../../ui/Button'
import { useAppScreen } from '../../lib/AppScreenContext'

const shellStyle = { backgroundColor: colors.background }

const FAKE_REVIEWS = [
  { rating: 5, text: 'Perfecto, puntual', date: 'hace 2 días' },
  { rating: 4, text: 'Todo bien', date: 'hace 1 semana' },
  { rating: 5, text: 'Repetiría', date: 'hace 3 semanas' },
]

function avgRating(list) {
  if (!list.length) return 0
  return list.reduce((s, r) => s + r.rating, 0) / list.length
}

export default function UserReviewsPage() {
  const { viewingUserReviewsId, openHome } = useAppScreen()
  const reviews = useMemo(() => FAKE_REVIEWS, [])
  const mean = useMemo(() => avgRating(reviews), [reviews])
  const shortId = String(viewingUserReviewsId ?? '').slice(0, 8)

  return (
    <ScreenShell
      style={shellStyle}
      mainMode={SCREEN_SHELL_MAIN_MODE.INSET}
      mainOverflow="auto"
    >
      <div
        style={{
          padding: '12px 16px 8px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Button
          type="button"
          variant="ghost"
          style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}
          onClick={() => openHome()}
        >
          Volver
        </Button>
        <span style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>Reseñas</span>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 12,
              backgroundColor: colors.surface,
              border: `2px solid ${colors.primaryBorderMuted}`,
              overflow: 'hidden',
            }}
          >
            <img
              src={`https://i.pravatar.cc/150?u=${encodeURIComponent(viewingUserReviewsId || 'u')}`}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.textPrimary }}>
              Usuario
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.textMuted }}>
              ID · {shortId || '—'}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 700, color: colors.accentYellow }}>
              {mean.toFixed(1)} ★
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map((r, i) => (
            <div
              key={i}
              style={{
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surface,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: colors.accentYellow }}>{r.rating} ★</span>
                <span style={{ fontSize: 12, color: colors.textMuted }}>{r.date}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: colors.textPrimary, lineHeight: 1.4 }}>
                {r.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ScreenShell>
  )
}
