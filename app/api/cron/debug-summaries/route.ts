import { NextRequest } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const headerSecret = req.headers.get('x-cron-secret')
    if (headerSecret !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) {
    return new Response(JSON.stringify({ error: 'No DB URL' }), { status: 500 })
  }

  const sql = neon(databaseUrl)

  try {
    // Check notified_sessions table
    const notified = await sql`SELECT session_id, notified_at FROM notified_sessions ORDER BY notified_at DESC LIMIT 20`

    // Check sessions with last message > 5 min ago
    const coldSessions = await sql`
      SELECT
        session_id,
        MAX(created_at) AS last_message,
        COUNT(*) AS message_count
      FROM chat_logs
      WHERE content NOT LIKE '[PROFILE_UPDATE]%'
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      GROUP BY session_id
      HAVING MAX(created_at) < NOW() - (5 * INTERVAL '1 minute')
      ORDER BY MAX(created_at) DESC
    `

    // Check which of those are already notified
    const notifiedIds = notified.map((r: any) => r.session_id)
    const unnotified = coldSessions.filter((s: any) => !notifiedIds.includes(s.session_id))

    return new Response(
      JSON.stringify({
        notified_sessions: notified,
        cold_sessions: coldSessions,
        unnotified_sessions: unnotified,
        now: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500 }
    )
  }
}
