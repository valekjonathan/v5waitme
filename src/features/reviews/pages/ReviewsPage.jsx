import { useMemo } from 'react'
import { useAuth } from '../../../lib/AuthContext'
import Section from '../../../ui/layout/Section'
import ProfileHeader from '../../profile/components/ProfileHeader'
import ReviewsSummary from '../components/ReviewsSummary'
import ReviewsList from '../components/ReviewsList'
import ProfileReviewsLayout from '../../shared/layout/ProfileReviewsLayout'
import { profileReviewsSectionFlushStyle } from '../../shared/profileReviewsLayout'
import { getReviewsForScreen } from '../../../services/reviews'

export default function ReviewsPage() {
  const { headerProfile } = useAuth()
  const reviews = useMemo(() => getReviewsForScreen(), [])

  return (
    <ProfileReviewsLayout header={<ProfileHeader profile={headerProfile} />}>
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
}
