import { neon } from '@neondatabase/serverless'
import { Resend } from 'resend'

export interface SessionSummary {
  sessionId: string
  startTime: Date
  endTime: Date
  messageCount: number
  messages: { role: string; content: string; timestamp: Date }[]
}

function getDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) throw new Error('DATABASE_URL or POSTGRES_URL not set')
  return neon(databaseUrl)
}

/**
 * Ensures the notified_sessions table exists (safe to call repeatedly)
 */
export async function ensureNotifiedSessionsTable(): Promise<void> {
  const sql = getDatabaseConnection()
  await sql`
    CREATE TABLE IF NOT EXISTS notified_sessions (
      session_id TEXT PRIMARY KEY,
      notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

/**
 * Returns sessions that:
 *  - Had their last message more than IDLE_MINUTES ago
 *  - Have not already been notified
 *  - Have at least 2 messages (a real back-and-forth, not just an open)
 */
export async function getSessionsToNotify(idleMinutes = 5): Promise<SessionSummary[]> {
  const sql = getDatabaseConnection()

  const rows = await sql`
    SELECT
      c.session_id,
      MIN(c.created_at) AS start_time,
      MAX(c.created_at) AS end_time,
      COUNT(*)          AS message_count
    FROM chat_logs c
    WHERE
      -- Don't include internal profile-update entries
      c.content NOT LIKE '[PROFILE_UPDATE]%'
      AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)
      -- Last message is older than idleMinutes
      AND c.session_id NOT IN (
        SELECT session_id FROM chat_logs
        WHERE created_at > NOW() - (${idleMinutes} * INTERVAL '1 minute')
          AND content NOT LIKE '[PROFILE_UPDATE]%'
      )
      -- Not already notified
      AND c.session_id NOT IN (
        SELECT session_id FROM notified_sessions
      )
    GROUP BY c.session_id
    HAVING COUNT(*) >= 2
    ORDER BY MAX(c.created_at) DESC
  `

  if (!rows.length) return []

  const sessions: SessionSummary[] = []

  for (const row of rows) {
    const messages = await sql`
      SELECT role, content, created_at
      FROM chat_logs
      WHERE session_id = ${row.session_id}
        AND content NOT LIKE '[PROFILE_UPDATE]%'
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY created_at ASC
    `

    sessions.push({
      sessionId: row.session_id,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      messageCount: Number(row.message_count),
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
      })),
    })
  }

  return sessions
}

/**
 * Marks sessions as notified so we don't send again
 */
export async function markSessionsNotified(sessionIds: string[]): Promise<void> {
  if (!sessionIds.length) return
  const sql = getDatabaseConnection()
  for (const sessionId of sessionIds) {
    await sql`
      INSERT INTO notified_sessions (session_id, notified_at)
      VALUES (${sessionId}, NOW())
      ON CONFLICT (session_id) DO NOTHING
    `
  }
}

/**
 * Formats a session into a readable email body (plain text) and returns
 * both the subject line and the body.
 */
export function formatSessionEmail(session: SessionSummary): { subject: string; body: string } {
  const dateStr = session.startTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeStr = session.startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  })

  const subject = `CH Chatbot Exchange (${dateStr} at ${timeStr})`

  const lines: string[] = [
    `New conversation on ${dateStr} at ${timeStr}`,
    `${session.messageCount} messages`,
    ``,
    `─────────────────────────────────`,
    ``,
  ]

  for (const msg of session.messages) {
    const time = msg.timestamp.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const label = msg.role === 'user' ? 'Visitor' : 'CH Bot'
    lines.push(`[${time}] ${label}:`)
    lines.push(msg.content)
    lines.push('')
  }

  return { subject, body: lines.join('\n') }
}

/**
 * Sends an email notification via Resend
 */
export async function sendEmail(subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONVERSATION_NOTIFY_EMAIL
  const from = process.env.RESEND_FROM_EMAIL || 'CH Bot <onboarding@resend.dev>'

  if (!apiKey || !to) {
    console.error('❌ Missing email env vars (RESEND_API_KEY, CONVERSATION_NOTIFY_EMAIL)')
    return false
  }

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      text: body,
    })
    if (error) {
      console.error('❌ Resend email failed:', error)
      return false
    }
    console.log('✅ Email sent to', to)
    return true
  } catch (error) {
    console.error('❌ Email send error:', error)
    return false
  }
}
