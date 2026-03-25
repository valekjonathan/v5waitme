import { useMemo } from 'react'
import HomePage from '../../home/components/HomePage'
import LoginButtons from './LoginButtons'

export default function LoginPage() {
  const centerContent = useMemo(() => <LoginButtons />, [])
  return <HomePage centerContent={centerContent} />
}
