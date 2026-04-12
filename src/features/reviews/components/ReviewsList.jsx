import { useState } from 'react'
import { Stack } from '../../../ui/primitives/Stack'
import ReviewItem from './ReviewItem'

const listWrapStyle = {
  width: '100%',
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  paddingRight: 2,
  boxSizing: 'border-box',
  WebkitOverflowScrolling: 'touch',
}

const keyframesStyle = (
  <style>{`
    @keyframes waitmeReviewsFadeUp {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `}</style>
)

export default function ReviewsList({ reviews = [] }) {
  const [selectedId, setSelectedId] = useState(null)

  return (
    <section style={listWrapStyle} aria-label="Lista de reseñas">
      {keyframesStyle}
      <Stack gap={8}>
        {reviews.map((review, index) => (
          <ReviewItem
            key={review.id}
            review={review}
            animationDelayMs={index * 45}
            avatarIndex={index}
            isSelected={selectedId === review.id}
            onSelect={() => setSelectedId((prev) => (prev === review.id ? null : review.id))}
          />
        ))}
      </Stack>
    </section>
  )
}
