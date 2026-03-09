import { NextRequest } from 'next/server'
import {
  ensureNotifiedSessionsTable,
  getSessionsToNotify,
  markSessionsNotified,
  formatSessionEmail,
  sendEmail,
} from '../../../../lib/twilioNotifier'

/**
 * GET /api/cron/send-summaries
 *
 * Called by an external cron (e.g. cron-job.org) every 10 minutes.
 * Requires header: x-cron-secret: <CRON_SECRET env var>
 *
 * Finds conversation sessions that:
 *   - ended (no new message) more than 5 minutes ago
 *   - haven't already been notified
 * Then sends a concise back-and-forth email for each via Resend.
 */
export async function GET(req: NextRequest) {
  // --- Auth check ---
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

  try {
    await ensureNotifiedSessionsTable()

    const sessions = await getSessionsToNotify(5)

    if (!sessions.length) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No new sessions to notify', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const notified: string[] = []
    const failed: string[] = []

    for (const session of sessions) {
      const { subject, body } = formatSessionEmail(session)
      const ok = await sendEmail(subject, body)
      if (ok) {
        notified.push(session.sessionId)
      } else {
        failed.push(session.sessionId)
      }
    }

    if (notified.length) {
      await markSessionsNotified(notified)
    }

    console.log(`📧 Cron: sent ${notified.length} email summaries, ${failed.length} failed`)

    return new Response(
      JSON.stringify({
        ok: true,
        sent: notified.length,
        failed: failed.length,
        notifiedSessions: notified,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Cron send-summaries error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
