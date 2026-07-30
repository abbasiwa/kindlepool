import express from 'express'
import cors from 'cors'

const app = express()
const PORT = parseInt(process.env.KINDPOOL_NOTIFIER_PORT ?? '3003', 10)

app.use(cors())
app.use(express.json())

// In-memory subscription store (in production: database)
const subscriptions: Map<string, { email: string; events: string[] }> = new Map()

/**
 * Subscribe an email to a wallet address for notifications.
 */
app.post('/api/v1/subscribe', (req, res) => {
  const { email, address, events } = req.body as { email: string; address: string; events: string[] }
  if (!email || !address) {
    res.status(400).json({ error: 'Missing email or address' })
    return
  }
  subscriptions.set(address, {
    email,
    events: events ?? ['deposit', 'goal_reached', 'work_submitted', 'vote_cast', 'pool_paid', 'pool_refunded'],
  })
  console.log(`[subscribe] ${email} -> ${address}`)
  res.json({ success: true })
})

/**
 * Unsubscribe an address.
 */
app.post('/api/v1/unsubscribe', (req, res) => {
  const { address } = req.body as { address: string }
  subscriptions.delete(address)
  res.json({ success: true })
})

/**
 * Send a notification email for a pool event.
 * In production: integrates with Resend/SendGrid/AWS SES.
 */
app.post('/api/v1/notify', (req, res) => {
  const { address, eventType, poolTitle } = req.body as {
    address: string
    eventType: string
    poolTitle: string
    amount?: string
  }

  const sub = subscriptions.get(address)
  if (!sub) {
    res.json({ success: false, reason: 'not subscribed' })
    return
  }

  if (!sub.events.includes(eventType)) {
    res.json({ success: false, reason: 'event type not subscribed' })
    return
  }

  const subject = emailSubjects[eventType] ?? 'KindlePool Update'
  const body = emailBodies[eventType] ?? `Update on "${poolTitle}"`
  const finalBody = body.replace('{{pool}}', poolTitle)

  console.log(`[email] To: ${sub.email}`)
  console.log(`[email] Subject: ${subject}`)
  console.log(`[email] Body: ${finalBody}`)
  console.log('---')

  res.json({ success: true, email: sub.email, subject, body: finalBody })
})

const emailSubjects: Record<string, string> = {
  deposit: 'Deposit Confirmed — KindlePool',
  goal_reached: '🎉 Goal Reached! — KindlePool',
  work_submitted: 'Work Submitted for Review — KindlePool',
  vote_cast: 'Vote Cast — KindlePool',
  pool_paid: '✅ Funds Released! — KindlePool',
  pool_refunded: '🔄 Pool Refunded — KindlePool',
  pool_expired: '⏰ Pool Expired — KindlePool',
}

const emailBodies: Record<string, string> = {
  deposit: 'Your deposit has been confirmed for "{{pool}}". Thank you for your support!',
  goal_reached: 'The pool "{{pool}}" has reached its funding goal! Work will be submitted for review soon.',
  work_submitted: 'Work has been submitted for "{{pool}}". Please cast your vote before the deadline.',
  vote_cast: 'Your vote on "{{pool}}" has been recorded.',
  pool_paid: 'The creator of "{{pool}}" has been paid. Thank you for being part of this success!',
  pool_refunded: 'The pool "{{pool}}" has been refunded to all supporters.',
  pool_expired: 'The pool "{{pool}}" has expired without reaching its goal. Funds have been refunded.',
}

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', subscribers: subscriptions.size })
})

app.listen(PORT, () => {
  console.log(`KindlePool Notifier running on port ${PORT}`)
})
