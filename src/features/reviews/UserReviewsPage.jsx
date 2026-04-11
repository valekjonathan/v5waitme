import { useMemo } from 'react'
import Section from '../../ui/layout/Section'
import ProfileHeader from '../profile/components/ProfileHeader'
import ReviewsSummary from './components/ReviewsSummary'
import ReviewsList from './components/ReviewsList'
import ProfileReviewsLayout, {
  profileReviewsShellContentStyle,
} from '../shared/layout/ProfileReviewsLayout'
import { profileReviewsSectionFlushStyle } from '../shared/profileReviewsLayout'
import {
  buildMockProfileForUserReviews,
  getReviewsForUserScreen,
} from '../../services/reviews'
import { getAverage } from '../../lib/reviewsModel'
import { useAppScreen } from '../../lib/AppScreenContext'
import { EmbeddedShellContent } from '../../lib/AuthenticatedOverlayEmbeddedContext.jsx'

export default function UserReviewsPage() {
  const { viewingUserReviewsId, userReviewsPeerRow } = useAppScreen()
  const profile = useMemo(
    () => buildMockProfileForUserReviews(viewingUserReviewsId, userReviewsPeerRow),
    [viewingUserReviewsId, userReviewsPeerRow]
  )
  const reviews = useMemo(
    () => getReviewsForUserScreen(String(viewingUserReviewsId ?? '')),
    [viewingUserReviewsId]
  )
  const headerAverage = useMemo(() => getAverage(reviews), [reviews])

  const inner = (
    <ProfileReviewsLayout
      header={
        <ProfileHeader
          profile={profile}
          averageRating={headerAverage}
          surface="reviews"
          subjectUserId={String(viewingUserReviewsId ?? '')}
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
