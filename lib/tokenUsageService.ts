import fs from 'fs'
import path from 'path'

export interface TokenUsage {
  id: string
  date: string // YYYY-MM-DD format
  timestamp: string
  userId: string
  sessionId: string
  model: string
  tokensUsed: number
  tokenType: 'completion' | 'prompt' | 'total'
  metadata?: Record<string, any>
}

export interface DailyTokenUsage {
  date: string
  totalTokens: number
  completionTokens: number
  promptTokens: number
  requestCount: number
  uniqueUsers: number
  uniqueSessions: number
}

export class TokenUsageService {
  private static instance: TokenUsageService
  private logDir: string
  private logFile: string
  private isVercel: boolean
  private inMemoryUsage: TokenUsage[] = []

  private constructor() {
    this.isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
    this.logDir = path.join(process.cwd(), 'logs')
    this.logFile = path.join(this.logDir, 'token_usage.json')
    
    if (!this.isVercel) {
      this.ensureLogDirectory()
    }
  }

  public static getInstance(): TokenUsageService {
    if (!TokenUsageService.instance) {
      TokenUsageService.instance = new TokenUsageService()
    }
    return TokenUsageService.instance
  }

  private ensureLogDirectory(): void {
    if (!this.isVercel && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private readUsage(): TokenUsage[] {
    // On Vercel, use in-memory storage (resets on deployment)
    if (this.isVercel) {
      return this.inMemoryUsage
    }
    
    // On local, read from file
    try {
      if (!fs.existsSync(this.logFile)) {
        return []
      }
      const data = fs.readFileSync(this.logFile, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('❌ Failed to read token usage:', error)
      return []
    }
  }

  private writeUsage(usage: TokenUsage[]): void {
    // On Vercel, store in memory
    if (this.isVercel) {
      this.inMemoryUsage = usage
      return
    }
    
    // On local, write to file
    try {
      fs.writeFileSync(this.logFile, JSON.stringify(usage, null, 2))
    } catch (error) {
      console.error('❌ Failed to write token usage:', error)
    }
  }

  /**
   * Log token usage
   */
  async logTokenUsage(
    userId: string,
    sessionId: string,
    model: string,
    tokensUsed: number,
    tokenType: 'completion' | 'prompt' | 'total' = 'total',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const now = new Date()
    const date = now.toISOString().split('T')[0] // YYYY-MM-DD format
    
    const usageEntry: TokenUsage = {
      id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date,
      timestamp: now.toISOString(),
      userId,
      sessionId,
      model,
      tokensUsed,
      tokenType,
      metadata: {
        ...metadata,
        platform: 'chat_ui'
      }
    }

    const usage = this.readUsage()
    usage.push(usageEntry)
    this.writeUsage(usage)

    console.log(`📊 Logged ${tokensUsed} ${tokenType} tokens for model ${model} (${this.isVercel ? 'Memory' : 'File'})`)
  }

  /**
   * Get token usage for a specific date
   */
  async getTokenUsageForDate(date: string): Promise<DailyTokenUsage | null> {
    const usage = this.readUsage()
    const dateUsage = usage.filter(u => u.date === date)
    
    if (dateUsage.length === 0) {
      return null
    }

    const completionTokens = dateUsage
      .filter(u => u.tokenType === 'completion')
      .reduce((sum, u) => sum + u.tokensUsed, 0)
    
    const promptTokens = dateUsage
      .filter(u => u.tokenType === 'prompt')
      .reduce((sum, u) => sum + u.tokensUsed, 0)
    
    const totalTokens = dateUsage
      .filter(u => u.tokenType === 'total')
      .reduce((sum, u) => sum + u.tokensUsed, 0)

    const uniqueUsers = new Set(dateUsage.map(u => u.userId)).size
    const uniqueSessions = new Set(dateUsage.map(u => u.sessionId)).size

    return {
      date,
      totalTokens: totalTokens || (completionTokens + promptTokens),
      completionTokens,
      promptTokens,
      requestCount: dateUsage.length,
      uniqueUsers,
      uniqueSessions
    }
  }

  /**
   * Get token usage for today
   */
  async getTodayTokenUsage(): Promise<DailyTokenUsage | null> {
    const today = new Date().toISOString().split('T')[0]
    return await this.getTokenUsageForDate(today)
  }

  /**
   * Get token usage for the last N days
   */
  async getTokenUsageForLastDays(days: number = 7): Promise<DailyTokenUsage[]> {
    const results: DailyTokenUsage[] = []
    const today = new Date()
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateString = date.toISOString().split('T')[0]
      
      const usage = await this.getTokenUsageForDate(dateString)
      if (usage) {
        results.push(usage)
      } else {
        // Add empty day data
        results.push({
          date: dateString,
          totalTokens: 0,
          completionTokens: 0,
          promptTokens: 0,
          requestCount: 0,
          uniqueUsers: 0,
          uniqueSessions: 0
        })
      }
    }
    
    return results.reverse() // Oldest first
  }

  /**
   * Get all token usage records
   */
  async getAllTokenUsage(): Promise<TokenUsage[]> {
    return this.readUsage()
  }

  /**
   * Reset all token usage data
   */
  async resetAllTokenUsage(): Promise<void> {
    this.writeUsage([])
    console.log('🔄 Reset all token usage data')
  }

  /**
   * Get token usage statistics
   */
  async getStats(): Promise<{
    totalTokensAllTime: number
    totalRequests: number
    avgTokensPerRequest: number
    mostActiveDate: string | null
    daysTracked: number
  }> {
    const usage = this.readUsage()
    
    if (usage.length === 0) {
      return {
        totalTokensAllTime: 0,
        totalRequests: 0,
        avgTokensPerRequest: 0,
        mostActiveDate: null,
        daysTracked: 0
      }
    }

    const totalTokens = usage.reduce((sum, u) => sum + u.tokensUsed, 0)
    const uniqueDates = new Set(usage.map(u => u.date))
    
    // Find most active date
    const dateUsage: Record<string, number> = {}
    usage.forEach(u => {
      dateUsage[u.date] = (dateUsage[u.date] || 0) + u.tokensUsed
    })
    
    const dates = Object.keys(dateUsage)
    const mostActiveDate = dates.length > 0 
      ? dates.reduce((a, b) => dateUsage[a] > dateUsage[b] ? a : b)
      : null

    return {
      totalTokensAllTime: totalTokens,
      totalRequests: usage.length,
      avgTokensPerRequest: Math.round(totalTokens / usage.length),
      mostActiveDate,
      daysTracked: uniqueDates.size
    }
  }

  /**
   * Get environment info
   */
  getEnvironmentInfo(): { isVercel: boolean; storageType: string } {
    return {
      isVercel: this.isVercel,
      storageType: this.isVercel ? 'in-memory' : 'file-system'
    }
  }
}

export default TokenUsageService 