// Sentry error monitoring initialization
// https://docs.sentry.io/platforms/javascript/guides/react/

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) {
    console.log('Sentry not configured — set VITE_SENTRY_DSN in production')
    return
  }

  // Dynamic import to avoid bundle overhead when not configured
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE ?? 'development',
      tracesSampleRate: 0.1,
      integrations: [Sentry.browserTracingIntegration()],
      beforeSend(event) {
        // Don't send errors if user has disabled telemetry
        if (localStorage.getItem('kindlepool-telemetry') === 'false') return null
        return event
      },
    })
    console.log('Sentry initialized')
  }).catch(() => {
    // Sentry not installed — skip silently
  })
}
