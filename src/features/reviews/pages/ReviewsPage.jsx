import { useMemo } from 'react'
import { useAuth } from '../../../lib/AuthContext'
import ScreenShell from '../../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../../ui/layout/layout'
import Section from '../../../ui/layout/Section'
import { colors } from '../../../design/colors'
import ProfileHeader from '../../profile/components/ProfileHeader'
import ReviewsSummary from '../components/ReviewsSummary'
import ReviewsList from '../components/ReviewsList'
import ProfileReviewsLayout, {
  profileReviewsShellContentStyle,
} from '../../shared/layout/ProfileReviewsLayout'
import { profileReviewsSectionFlushStyle } from '../../shared/profileReviewsLayout'
import { getReviewsForScreen } from '../../../services/reviews'

const shellStyle = { backgroundColor: colors.background }

export default function ReviewsPage() {
  const { headerProfile } = useAuth()
  const reviews = useMemo(() => getReviewsForScreen(), [])

  return (
    <ScreenShell
      style={shellStyle}
      contentStyle={profileReviewsShellContentStyle}
      mainMode={SCREEN_SHELL_MAIN_MODE.INSET}
      mainOverflow="hidden"
    >
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
    </ScreenShell>
  )
}
