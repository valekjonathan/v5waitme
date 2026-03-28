import { colors } from '../../../design/colors'
import { renderStars } from '../../../lib/ratingStars'
import { useAppScreen } from '../../../lib/AppScreenContext'

const fallbackAvatars = [
  'https://i.pravatar.cc/150?img=12',
  'https://i.pravatar.cc/150?img=32',
  'https://i.pravatar.cc/150?img=5',
  'https://i.pravatar.cc/150?img=45',
  'https://i.pravatar.cc/150?img=22',
]

const cardOuterStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 0,
  padding: 12,
  borderRadius: 14,
  background: 'rgba(255,255,255,0.02)',
  boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
  transition: 'border 0.2s ease',
  width: '100%',
  boxSizing: 'border-box',
  cursor: 'pointer',
}

const reviewRowStyle = {
  display: 'flex',
  gap: 12,
  alignItems: 'flex-start',
  width: '100%',
}

const avatarStyle = {
  width: 64,
  height: 64,
  borderRadius: 14,
  border: '2px solid #A855F7',
  overflow: 'hidden',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: colors.surfaceMuted,
  cursor: 'pointer',
}

const contentStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
}

const topRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const nameStyle = {
  fontWeight: '600',
  color: '#fff',
  fontSize: 14,
  flexShrink: 0,
}

const dateInlineStyle = {
  fontSize: 11,
  color: '#888',
  flex: 1,
  textAlign: 'center',
}

const starsStyle = {
  display: 'flex',
  gap: 2,
  color: '#FFD54A',
  flexShrink: 0,
}

const starCharStyle = { fontSize: 14 }

function commentBoxStyle(isExpanded) {
  return {
    fontSize: 13,
    color: '#ccc',
    marginTop: 6,
    lineHeight: 1.4,
    overflow: isExpanded ? 'visible' : 'hidden',
    display: isExpanded ? 'block' : '-webkit-box',
    WebkitLineClamp: isExpanded ? undefined : 2,
    WebkitBoxOrient: 'vertical',
  }
}

export default function ReviewItem({
  review,
  animationDelayMs = 0,
  avatarIndex = 0,
  isSelected = false,
  onSelect = () => {},
}) {
  const { openProfile } = useAppScreen()
  const userName = String(review?.name ?? '').trim()
  const displayName = userName.split(/\s+/)[0] || 'Usuario'
  const comment = String(review?.comment ?? '').trim() || 'Sin comentario.'
  const date = String(review?.date ?? '').trim() || ''
  const rating = Number(review?.rating ?? 0)
  const avatarUrl = String(review?.avatarUrl ?? '').trim()
  const avatarSrc = avatarUrl || fallbackAvatars[avatarIndex % fallbackAvatars.length]
  const starChars = renderStars(rating).split('')

  const handleAvatarClick = (e) => {
    e.stopPropagation()
    openProfile?.()
  }

  const handleClick = () => {
    onSelect()
  }

  return (
    <article
      style={{
        opacity: 0,
        animation: `waitmeReviewsFadeUp 0.4s ease forwards`,
        animationDelay: `${animationDelayMs}ms`,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
        style={{
          ...cardOuterStyle,
          border: isSelected ? '2px solid #7C3AED' : '1.5px solid rgba(255,255,255,0.35)',
        }}
      >
        <div style={reviewRowStyle}>
          <div style={avatarStyle} onClick={handleAvatarClick}>
            <img
              src={avatarSrc}
              alt={`Avatar de ${displayName}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={contentStyle}>
            <div style={topRowStyle}>
              <div style={nameStyle}>{displayName}</div>
              <div style={dateInlineStyle}>{date}</div>
              <div style={starsStyle}>
                {starChars.map((ch, i) => (
                  <span key={i} style={starCharStyle}>
                    {ch}
                  </span>
                ))}
              </div>
            </div>

            <div style={commentBoxStyle(isSelected)}>{comment}</div>
          </div>
        </div>
      </div>
    </article>
  )
}
