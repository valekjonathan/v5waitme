import { useMemo } from 'react'
import { useAuth } from '../../../lib/AuthContext'
import Section from '../../../ui/layout/Section'
import ProfileHeader from '../../profile/components/ProfileHeader'
import ReviewsSummary from '../components/ReviewsSummary'
import ReviewsList from '../components/ReviewsList'
import ProfileReviewsLayout, {
  profileReviewsShellContentStyle,
} from '../../shared/layout/ProfileReviewsLayout'
import { profileReviewsSectionFlushStyle } from '../../shared/profileReviewsLayout'
import { getReviewsForScreen } from '../../../services/reviews'
import { getAverage } from '../../../lib/reviewsModel'
import { EmbeddedShellContent } from '../../../lib/AuthenticatedOverlayEmbeddedContext.jsx'

export default function ReviewsPage() {
  const { headerProfile, user } = useAuth()
  const reviews = useMemo(() => getReviewsForScreen(), [])
  const headerAverage = useMemo(() => getAverage(reviews), [reviews])

  const inner = (
    <ProfileReviewsLayout
      header={
        <ProfileHeader
          profile={headerProfile}
          averageRating={headerAverage}
          surface="reviews"
          subjectUserId={user?.id ?? ''}
        />
      }
    >
      <Section style={profileReviewsSectionFlushStyle}>
        <ReviewsSummary reviews={reviews} />
      </Section>
      <Section
        style={{
          ...profileReviewsSectionFlushStyle,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ReviewsList reviews={reviews} />
      </Section>
    </ProfileReviewsLayout>
  )

  /** `ScreenShell` global en `App.jsx`; aquí solo el slot de contenido. */
  return (
    <EmbeddedShellContent contentStyle={profileReviewsShellContentStyle}>{inner}</EmbeddedShellContent>
  )
}
