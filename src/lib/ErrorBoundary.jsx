import * as Sentry from '@sentry/react'
import React from 'react'
import { colors } from '../design/colors'
import { resetKeysChanged } from './errorBoundaryReset.js'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
    /** Tras un error, el primer cambio de `resetKeys` suele ser la navegación al sitio que rompe; no limpiar ahí. */
    this.ignoreNextResetKeysSync = false
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    this.ignoreNextResetKeysSync = true
    console.log('REACT CRASH', error, info)
    const label = this.props.name
      ? `[WaitMe][ErrorBoundary:${this.props.name}]`
      : '[WaitMe][ErrorBoundary]'
    console.error(label, error?.message ?? error, info?.componentStack ?? info)
    if (error?.stack) console.error(`${label} stack:`, error.stack)
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info?.componentStack } },
      ...(this.props.name ? { tags: { waitme_error_boundary: this.props.name } } : {}),
    })
  }

  componentDidUpdate(prevProps) {
    const { resetKeys } = this.props
    if (!this.state.hasError || resetKeys == null) return
    if (!resetKeysChanged(prevProps.resetKeys, resetKeys)) return
    if (this.ignoreNextResetKeysSync) {
      this.ignoreNextResetKeysSync = false
      return
    }
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      const minimal = this.props.fallbackMessage
      if (typeof minimal === 'string' && minimal.trim()) {
        return (
          <div
            style={{
              color: '#ffffff',
              padding: 24,
              minHeight: 'var(--app-height, 100vh)',
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#000000',
            }}
          >
            {minimal}
          </div>
        )
      }
      return (
        <div
          data-waitme-error-fallback="default"
          style={{
            display: 'flex',
            minHeight: 'var(--app-height)',
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
