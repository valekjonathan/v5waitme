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
import { getReviewsMock } from '../../../services/reviews'

const shellStyle = { backgroundColor: colors.background }

function profileFromUser(user) {
  const meta =
    user?.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {}
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    ''
  const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url : ''
  return {
    full_name: name,
    avatar_url: avatarUrl,
    brand: '',
    model: '',
    plate: '',
    color: 'negro',
    vehicle_type: 'car',
  }
}

export default function ReviewsPage() {
  const { user } = useAuth()
  const profile = useMemo(() => profileFromUser(user), [user])
  const reviews = useMemo(() => getReviewsMock(), [])

  return (
    <ScreenShell
      style={shellStyle}
      contentStyle={profileReviewsShellContentStyle}
      mainMode={SCREEN_SHELL_MAIN_MODE.INSET}
      mainOverflow="hidden"
    >
      <ProfileReviewsLayout header={<ProfileHeader profile={profile} />}>
        <Section style={profileReviewsSectionFlushStyle}>
          <ReviewsSummary />
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
