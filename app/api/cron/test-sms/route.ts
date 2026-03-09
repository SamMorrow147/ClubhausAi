import { NextRequest } from 'next/server'
import { sendEmail } from '../../../../lib/twilioNotifier'

/**
 * GET /api/cron/test-sms
 * Sends a test email to CONVERSATION_NOTIFY_EMAIL to verify Resend is configured.
 * Protected by x-cron-secret header.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const headerSecret = req.headers.get('x-cron-secret')
    if (headerSecret !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const ok = await sendEmail(
    'CH Bot – Test Notification',
    'This is a test email from your CH Chatbot notification system. If you received this, email notifications are working!'
  )

  return new Response(
    JSON.stringify({
      ok,
      to: process.env.CONVERSATION_NOTIFY_EMAIL || 'NOT SET',
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasFromEmail: !!process.env.RESEND_FROM_EMAIL,
    }),
    { status: ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
  )
}
