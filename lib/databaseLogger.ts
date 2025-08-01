import { kv } from '@vercel/kv'

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

  private constructor() {}

  public static getInstance(): DatabaseLogger {
    if (!DatabaseLogger.instance) {
      DatabaseLogger.instance = new DatabaseLogger()
    }
    return DatabaseLogger.instance
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
      const sessionId = metadata.sessionId || `session_${Date.now()}`
      
      const logEntry: ChatLog = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        sessionId,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        metadata: {
          ...metadata,
          platform: 'chat_ui',
          type: 'user_input'
        }
      }

      // Store in KV with a unique key
      const key = `chat_log:${logEntry.id}`
      await kv.set(key, logEntry)
      
      // Also store in a list for easy retrieval
      await kv.lpush(`user_logs:${userId}`, logEntry.id)
      await kv.lpush(`session_logs:${sessionId}`, logEntry.id)
      
      // Set expiration for cleanup (30 days)
      await kv.expire(key, 30 * 24 * 60 * 60)
      await kv.expire(`user_logs:${userId}`, 30 * 24 * 60 * 60)
      await kv.expire(`session_logs:${sessionId}`, 30 * 24 * 60 * 60)

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
      const sessionId = metadata.sessionId || `session_${Date.now()}`
      
      const logEntry: ChatLog = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        sessionId,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        metadata: {
          ...metadata,
          platform: 'chat_ui',
          type: 'ai_response'
        }
      }

      // Store in KV with a unique key
      const key = `chat_log:${logEntry.id}`
      await kv.set(key, logEntry)
      
      // Also store in a list for easy retrieval
      await kv.lpush(`user_logs:${userId}`, logEntry.id)
      await kv.lpush(`session_logs:${sessionId}`, logEntry.id)
      
      // Set expiration for cleanup (30 days)
      await kv.expire(key, 30 * 24 * 60 * 60)
      await kv.expire(`user_logs:${userId}`, 30 * 24 * 60 * 60)
      await kv.expire(`session_logs:${sessionId}`, 30 * 24 * 60 * 60)

      console.log('🤖 Logged AI response for user:', userId, '(Database)')
    } catch (error) {
      console.error('❌ Failed to log AI response to database:', error)
      // Don't throw - we don't want logging failures to break the chat
    }
  }

  /**
   * Get all chat logs for a user
   */
  async getAllChatLogs(userId: string): Promise<ChatLog[]> {
    try {
      const logIds = await kv.lrange(`user_logs:${userId}`, 0, -1)
      const logs: ChatLog[] = []
      
      for (const id of logIds) {
        const log = await kv.get(`chat_log:${id}`) as ChatLog
        if (log) {
          logs.push(log)
        }
      }
      
      // Sort by timestamp (newest first)
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
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
      // This is more complex with KV, so we'll use a pattern to get all logs
      const keys = await kv.keys('chat_log:*')
      const logs: ChatLog[] = []
      
      for (const key of keys) {
        const log = await kv.get(key) as ChatLog
        if (log) {
          logs.push(log)
        }
      }
      
      // Sort by timestamp (newest first)
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
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
      const logIds = await kv.lrange(`session_logs:${sessionId}`, 0, -1)
      const logs: ChatLog[] = []
      
      for (const id of logIds) {
        const log = await kv.get(`chat_log:${id}`) as ChatLog
        if (log) {
          logs.push(log)
        }
      }
      
      // Sort by timestamp (oldest first for conversation flow)
      return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
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
      const logIds = await kv.lrange(`user_logs:${userId}`, 0, -1)
      
      // Delete individual log entries
      for (const id of logIds) {
        await kv.del(`chat_log:${id}`)
      }
      
      // Delete the user's log list
      await kv.del(`user_logs:${userId}`)
      
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
      const keys = await kv.keys('chat_log:*')
      for (const key of keys) {
        await kv.del(key)
      }
      
      const userKeys = await kv.keys('user_logs:*')
      for (const key of userKeys) {
        await kv.del(key)
      }
      
      const sessionKeys = await kv.keys('session_logs:*')
      for (const key of sessionKeys) {
        await kv.del(key)
      }
      
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
      await kv.set('test_connection', 'ok')
      const result = await kv.get('test_connection')
      await kv.del('test_connection')
      return result === 'ok'
    } catch (error) {
      console.error('❌ Database connection test failed:', error)
      return false
    }
  }
}

export default DatabaseLogger 