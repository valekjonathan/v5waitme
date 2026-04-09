import { useMemo } from 'react'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import Section from '../../ui/layout/Section'
import { colors } from '../../design/colors'
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
import { useAppScreen } from '../../lib/AppScreenContext'

const shellStyle = { backgroundColor: colors.background }

export default function UserReviewsPage() {
  const { viewingUserReviewsId } = useAppScreen()
  const profile = useMemo(
    () => buildMockProfileForUserReviews(viewingUserReviewsId),
    [viewingUserReviewsId]
  )
  const reviews = useMemo(
    () => getReviewsForUserScreen(String(viewingUserReviewsId ?? '')),
    [viewingUserReviewsId]
  )

  return (
    <ScreenShell
      style={shellStyle}
      contentStyle={profileReviewsShellContentStyle}
      mainMode={SCREEN_SHELL_MAIN_MODE.INSET}
      mainOverflow="hidden"
    >
      <ProfileReviewsLayout header={<ProfileHeader profile={profile} />}>
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
    </ScreenShell>
  )
}
