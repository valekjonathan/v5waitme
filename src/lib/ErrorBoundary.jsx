import React from 'react'
import { colors } from '../design/colors'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('GLOBAL ERROR:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            backgroundColor: colors.background,
            color: colors.textMuted,
            fontSize: 14,
            fontWeight: 500,
            padding: 24,
            textAlign: 'center',
          }}
        >
          La app se está recuperando
        </div>
      )
    }
    return this.props.children
  }
}
