import { useEffect, useMemo, useState } from 'react'
import { colors } from '../../../design/colors'
import { Row } from '../../../ui/primitives/Row'
import {
  buildRatingDistribution,
  computeAverageRating,
  getReviewsMock,
  mergeReviewsWithTestRow,
} from '../../../services/reviews'

const cardStyle = {
  width: '100%',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 14,
  background: colors.background,
  padding: 0,
  boxSizing: 'border-box',
  boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
  transition: 'all 0.2s ease',
}

const summaryContainer = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '12px 16px',
}

const ratingCircle = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  border: '3px solid #FFD54A',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  fontWeight: 700,
  color: '#FFD54A',
  background: 'transparent',
  flexShrink: 0,
}

const ratingMeta = {
  fontSize: 12,
  color: '#aaa',
  marginTop: 4,
  textAlign: 'center',
}

const circleColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  flexShrink: 0,
}

const labelStyle = {
  margin: 0,
  minWidth: 14,
  fontSize: 12,
  fontWeight: 700,
  color: colors.textSecondary,
}
const percentStyle = {
  margin: 0,
  minWidth: 34,
  textAlign: 'right',
  fontSize: 11,
  fontWeight: 700,
  color: colors.textMuted,
}

const rowFullWidthStyle = { width: '100%' }

const barTrackStyle = {
  flex: 1,
  height: 6,
  borderRadius: 999,
  background: colors.surfaceMuted,
  overflow: 'hidden',
}

const BAR_FILL = '#FFD54A'

const barsColumnStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

function normalizeDistribution(distribution) {
  const map = new Map((distribution || []).map((item) => [item.stars, item.count]))
  const rows = [4, 3, 2, 1].map((stars) => ({ stars, count: Number(map.get(stars) || 0) }))
  const total = rows.reduce((sum, row) => sum + row.count, 0) || 1
  return rows.map((row) => ({ ...row, ratio: row.count / total }))
}

function AnimatedBarFill({ ratio }) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const id = window.setTimeout(() => setPct(Math.round(ratio * 100)), 40)
    return () => window.clearTimeout(id)
  }, [ratio])
  return (
    <div
      style={{
        width: `${pct}%`,
        height: '100%',
        borderRadius: 999,
        background: BAR_FILL,
        transition: 'width 0.6s ease',
      }}
    />
  )
}

export default function ReviewsSummary() {
  const reviews = useMemo(() => mergeReviewsWithTestRow(getReviewsMock() || []), [])
  const distribution = useMemo(() => buildRatingDistribution(reviews), [reviews])
  const average = useMemo(() => computeAverageRating(reviews), [reviews])
  const rows = normalizeDistribution(distribution)
  const totalSafe = Math.max(0, reviews.length)
  return (
    <section style={cardStyle} aria-label="Resumen de reseñas">
      <div style={summaryContainer}>
        <div style={circleColumnStyle}>
          <div style={ratingCircle}>{Number(average).toFixed(1)}</div>
          <div style={ratingMeta}>
            {totalSafe} reseña{totalSafe === 1 ? '' : 's'}
          </div>
        </div>
        <div style={barsColumnStyle}>
          {rows.map((row) => (
            <Row key={row.stars} gap={8} align="center" style={rowFullWidthStyle}>
              <p style={labelStyle}>{row.stars}</p>
              <div style={barTrackStyle} aria-hidden>
                <AnimatedBarFill ratio={row.ratio} />
              </div>
              <p style={percentStyle}>{Math.round(row.ratio * 100)}%</p>
            </Row>
          ))}
        </div>
      </div>
    </section>
  )
}
