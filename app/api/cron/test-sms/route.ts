import { NextRequest } from 'next/server'
import { sendSms } from '../../../../lib/twilioNotifier'

/**
 * GET /api/cron/test-sms
 * Sends a quick test SMS to CONVERSATION_NOTIFY_PHONE to verify Twilio is configured.
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

  const ok = await sendSms('CH Bot test message - Twilio is working! 🎉')

  return new Response(
    JSON.stringify({
      ok,
      to: process.env.CONVERSATION_NOTIFY_PHONE || 'NOT SET',
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasMessagingService: !!process.env.TWILIO_MESSAGING_SERVICE_SID,
    }),
    { status: ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
  )
}
