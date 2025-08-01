import fs from 'fs'
import path from 'path'

export interface ChatLog {
  id: string
  userId: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: Record<string, any>
}

export class SimpleLogger {
  private static instance: SimpleLogger
  private logDir: string
  private logFile: string

  private constructor() {
    this.logDir = path.join(process.cwd(), 'logs')
    this.logFile = path.join(this.logDir, 'chat_logs.json')
    this.ensureLogDirectory()
  }

  public static getInstance(): SimpleLogger {
    if (!SimpleLogger.instance) {
      SimpleLogger.instance = new SimpleLogger()
    }
    return SimpleLogger.instance
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private readLogs(): ChatLog[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return []
      }
      const data = fs.readFileSync(this.logFile, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('❌ Failed to read logs:', error)
      return []
    }
  }

  private writeLogs(logs: ChatLog[]): void {
    try {
      fs.writeFileSync(this.logFile, JSON.stringify(logs, null, 2))
    } catch (error) {
      console.error('❌ Failed to write logs:', error)
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

    const logs = this.readLogs()
    logs.push(logEntry)
    this.writeLogs(logs)

    console.log('📝 Logged user message for user:', userId)
  }

  /**
   * Log an AI response
   */
  async logAIResponse(
    userId: string,
    response: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
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

    const logs = this.readLogs()
    logs.push(logEntry)
    this.writeLogs(logs)

    console.log('🤖 Logged AI response for user:', userId)
  }

  /**
   * Get all chat logs for a user
   */
  async getAllChatLogs(userId: string): Promise<ChatLog[]> {
    const logs = this.readLogs()
    return logs.filter(log => log.userId === userId)
  }

  /**
   * Get all chat logs
   */
  async getAllLogs(): Promise<ChatLog[]> {
    return this.readLogs()
  }

  /**
   * Get chat logs by session
   */
  async getLogsBySession(sessionId: string): Promise<ChatLog[]> {
    const logs = this.readLogs()
    return logs.filter(log => log.sessionId === sessionId)
  }

  /**
   * Delete all chat logs for a user
   */
  async deleteAllChatLogs(userId: string): Promise<void> {
    const logs = this.readLogs()
    const filteredLogs = logs.filter(log => log.userId !== userId)
    this.writeLogs(filteredLogs)
    console.log('🗑️ Deleted all chat logs for user:', userId)
  }

  /**
   * Reset all chat logs (use with caution)
   */
  async resetAllChatLogs(): Promise<void> {
    this.writeLogs([])
    console.log('🔄 Reset all chat logs')
  }

  /**
   * Export logs to CSV
   */
  async exportToCSV(userId?: string): Promise<string> {
    const logs = userId ? await this.getAllChatLogs(userId) : await this.getAllLogs()
    
    const csvHeader = 'id,userId,sessionId,role,content,timestamp,metadata\n'
    const csvRows = logs.map(log => {
      const metadata = JSON.stringify(log.metadata || {}).replace(/"/g, '""')
      return `"${log.id}","${log.userId}","${log.sessionId}","${log.role}","${log.content.replace(/"/g, '""')}","${log.timestamp}","${metadata}"`
    }).join('\n')
    
    return csvHeader + csvRows
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
    const logs = this.readLogs()
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
  }
}

export default SimpleLogger 