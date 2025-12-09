import { neon } from '@neondatabase/serverless'

export interface ChatLog {
  id: string
  userId: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: Record<string, any>
}

export class DatabaseLogger {
  private static instance: DatabaseLogger
  private sql: any = null
  private isConnected: boolean = false

  private constructor() {}

  public static getInstance(): DatabaseLogger {
    if (!DatabaseLogger.instance) {
      DatabaseLogger.instance = new DatabaseLogger()
    }
    return DatabaseLogger.instance
  }

  private async getDatabaseConnection() {
    if (this.sql && this.isConnected) {
      return this.sql
    }

    try {
      // Use Neon database URL
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
      if (!databaseUrl) {
        console.error('❌ DATABASE_URL or POSTGRES_URL not set')
        return null
      }

      this.sql = neon(databaseUrl)
      this.isConnected = true
      console.log('✅ Neon database connected')
      return this.sql
    } catch (error) {
      console.error('❌ Failed to connect to Neon database:', error)
      this.isConnected = false
      return null
    }
  }

  /**
   * Log a user message
   */
  async logUserMessage(
    userId: string,
    message: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const sql = await this.getDatabaseConnection()
      if (!sql) {
        console.log('⚠️ Database not available, skipping log')
        return
      }

      const sessionId = metadata.sessionId || `session_${Date.now()}`
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const timestamp = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      
      const logMetadata = {
        ...metadata,
        platform: 'chat_ui',
        type: 'user_input'
      }

      await sql`
        INSERT INTO chat_logs (id, user_id, session_id, role, content, metadata, created_at, expires_at)
        VALUES (${id}, ${userId}, ${sessionId}, 'user', ${message}, ${JSON.stringify(logMetadata)}::jsonb, ${timestamp}::timestamptz, ${expiresAt}::timestamptz)
      `

      console.log('📝 Logged user message for user:', userId, '(Database)')
    } catch (error) {
      console.error('❌ Failed to log user message to database:', error)
      // Don't throw - we don't want logging failures to break the chat
    }
  }

  /**
   * Log an AI response
   */
  async logAIResponse(
    userId: string,
    response: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const sql = await this.getDatabaseConnection()
      if (!sql) {
        console.log('⚠️ Database not available, skipping log')
        console.error('❌ Database connection failed - DATABASE_URL:', !!process.env.DATABASE_URL, 'POSTGRES_URL:', !!process.env.POSTGRES_URL)
        return
      }

      const sessionId = metadata.sessionId || `session_${Date.now()}`
      const id = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const timestamp = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      
      const logMetadata = {
        ...metadata,
        platform: 'chat_ui',
        type: 'ai_response'
      }

      await sql`
        INSERT INTO chat_logs (id, user_id, session_id, role, content, metadata, created_at, expires_at)
        VALUES (${id}, ${userId}, ${sessionId}, 'assistant', ${response}, ${JSON.stringify(logMetadata)}::jsonb, ${timestamp}::timestamptz, ${expiresAt}::timestamptz)
      `

      console.log('🤖 Logged AI response for user:', userId, '(Database)')
    } catch (error) {
      console.error('❌ Failed to log AI response to database:', error)
      console.error('❌ Database logging failed - userId:', userId, 'response length:', response.length, 'sessionId:', metadata.sessionId)
      // Don't throw - we don't want logging failures to break the chat
    }
  }

  /**
   * Get all chat logs for a user
   */
  async getAllChatLogs(userId: string): Promise<ChatLog[]> {
    try {
      const sql = await this.getDatabaseConnection()
      if (!sql) {
        console.log('⚠️ Database not available, returning empty logs')
        return []
      }

      const rows = await sql`
        SELECT id, user_id, session_id, role, content, metadata, created_at
        FROM chat_logs
        WHERE user_id = ${userId}
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ORDER BY created_at DESC
      `
      
      return rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        role: row.role,
        content: row.content,
        timestamp: row.created_at,
        metadata: row.metadata || {}
      }))
    } catch (error) {
      console.error('❌ Failed to get chat logs from database:', error)
      return []
    }
  }

  /**
   * Get all chat logs
   */
  async getAllLogs(): Promise<ChatLog[]> {
    try {
      const sql = await this.getDatabaseConnection()
      if (!sql) {
        console.log('⚠️ Database not available, returning empty logs')
        return []
      }

      const rows = await sql`
        SELECT id, user_id, session_id, role, content, metadata, created_at
        FROM chat_logs
        WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
      `
      
      return rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        role: row.role,
        content: row.content,
        timestamp: row.created_at,
        metadata: row.metadata || {}
      }))
    } catch (error) {
      console.error('❌ Failed to get all logs from database:', error)
      return []
    }
  }

  /**
   * Get chat logs by session
   */
  async getLogsBySession(sessionId: string): Promise<ChatLog[]> {
    try {
      const sql = await this.getDatabaseConnection()
      if (!sql) {
        console.log('⚠️ Database not available, returning empty logs')
        return []
      }

      const rows = await sql`
        SELECT id, user_id, session_id, role, content, metadata, created_at
        FROM chat_logs
        WHERE session_id = ${sessionId}
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ORDER BY created_at ASC
      `
      
      return rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        role: row.role,
        content: row.content,
        timestamp: row.created_at,
        metadata: row.metadata || {}
      }))
    } catch (error) {
      console.error('❌ Failed to get session logs from database:', error)
      return []
    }
  }

  /**
   * Delete all chat logs for a user
   */
  async deleteAllChatLogs(userId: string): Promise<void> {
    try {
      const sql = await this.getDatabaseConnection()
      if (!sql) {
        console.log('⚠️ Database not available, skipping delete')
        return
      }

      await sql`
        DELETE FROM chat_logs
        WHERE user_id = ${userId}
      `
      
      console.log('🗑️ Deleted all chat logs for user:', userId, '(Database)')
    } catch (error) {
      console.error('❌ Failed to delete chat logs from database:', error)
    }
  }

  /**
   * Reset all chat logs (use with caution)
   */
  async resetAllChatLogs(): Promise<void> {
    try {
      const sql = await this.getDatabaseConnection()
      if (!sql) {
        console.log('⚠️ Database not available, skipping reset')
        return
      }

      await sql`TRUNCATE TABLE chat_logs`
      
      console.log('🔄 Reset all chat logs (Database)')
    } catch (error) {
      console.error('❌ Failed to reset chat logs in database:', error)
    }
  }

  /**
   * Get conversation statistics
   */
  async getStats(): Promise<{
    totalMessages: number
    totalUsers: number
    totalSessions: number
    userStats: Record<string, number>
  }> {
    try {
      const logs = await this.getAllLogs()
      const users = new Set(logs.map(log => log.userId))
      const sessions = new Set(logs.map(log => log.sessionId))
      
      const userStats: Record<string, number> = {}
      logs.forEach(log => {
        userStats[log.userId] = (userStats[log.userId] || 0) + 1
      })

      return {
        totalMessages: logs.length,
        totalUsers: users.size,
        totalSessions: sessions.size,
        userStats
      }
    } catch (error) {
      console.error('❌ Failed to get stats from database:', error)
      return {
        totalMessages: 0,
        totalUsers: 0,
        totalSessions: 0,
        userStats: {}
      }
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const sql = await this.getDatabaseConnection()
      if (!sql) {
        return false
      }

      // Test connection by running a simple query
      const result = await sql`SELECT 1 as test`
      return result && result.length > 0
    } catch (error) {
      console.error('❌ Database connection test failed:', error)
      return false
    }
  }

  /**
   * Close database connection (no-op for Neon serverless)
   */
  async disconnect(): Promise<void> {
    // Neon serverless driver doesn't require explicit connection closing
    this.isConnected = false
    this.sql = null
    console.log('🔌 Database connection closed')
  }
}

export default DatabaseLogger 