import fs from 'fs'
import path from 'path'
import { createClient } from 'redis'

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
  private redis: any = null
  private isConnected: boolean = false

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

  private async getRedisClient() {
    if (this.redis && this.isConnected) {
      return this.redis
    }

    try {
      // Use Vercel KV environment variables
      const redis = createClient({
        url: process.env.KV_REST_API_URL,
        password: process.env.KV_REST_API_TOKEN,
      })

      await redis.connect()
      this.redis = redis
      this.isConnected = true
      console.log('✅ Redis client connected for token usage')
      return redis
    } catch (error) {
      console.error('❌ Failed to connect to Redis for token usage:', error)
      this.isConnected = false
      return null
    }
  }

  private async readUsageFromDatabase(): Promise<TokenUsage[]> {
    try {
      const redis = await this.getRedisClient()
      if (!redis) {
        console.log('⚠️ Redis not available for token usage, using fallback')
        return this.readUsageFromFile()
      }

      const keys = await redis.keys('token_usage:*')
      const usage: TokenUsage[] = []
      
      for (const key of keys) {
        const data = await redis.get(key)
        if (data) {
          const usageEntry = JSON.parse(data) as TokenUsage
          usage.push(usageEntry)
        }
      }
      
      return usage.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    } catch (error) {
      console.error('❌ Failed to read token usage from database:', error)
      return this.readUsageFromFile()
    }
  }

  private async writeUsageToDatabase(usage: TokenUsage[]): Promise<void> {
    try {
      const redis = await this.getRedisClient()
      if (!redis) {
        console.log('⚠️ Redis not available for token usage, using fallback')
        this.writeUsageToFile(usage)
        return
      }

      // Clear existing token usage data
      const keys = await redis.keys('token_usage:*')
      for (const key of keys) {
        await redis.del(key)
      }

      // Write new data
      for (const entry of usage) {
        const key = `token_usage:${entry.id}`
        await redis.set(key, JSON.stringify(entry))
        // Set expiration for cleanup (90 days)
        await redis.expire(key, 90 * 24 * 60 * 60)
      }

      console.log('📊 Token usage data written to database')
    } catch (error) {
      console.error('❌ Failed to write token usage to database:', error)
      this.writeUsageToFile(usage)
    }
  }

  private readUsageFromFile(): TokenUsage[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return []
      }
      const data = fs.readFileSync(this.logFile, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('❌ Failed to read token usage from file:', error)
      return []
    }
  }

  private writeUsageToFile(usage: TokenUsage[]): void {
    try {
      fs.writeFileSync(this.logFile, JSON.stringify(usage, null, 2))
    } catch (error) {
      console.error('❌ Failed to write token usage to file:', error)
    }
  }

  private async readUsage(): Promise<TokenUsage[]> {
    // On Vercel, use database storage
    if (this.isVercel) {
      return await this.readUsageFromDatabase()
    }
    
    // On local, read from file
    return this.readUsageFromFile()
  }

  private async writeUsage(usage: TokenUsage[]): Promise<void> {
    // On Vercel, store in database
    if (this.isVercel) {
      await this.writeUsageToDatabase(usage)
      return
    }
    
    // On local, write to file
    this.writeUsageToFile(usage)
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

    const usage = await this.readUsage()
    usage.push(usageEntry)
    await this.writeUsage(usage)

    console.log(`📊 Logged ${tokensUsed} ${tokenType} tokens for model ${model} (${this.isVercel ? 'Database' : 'File'})`)
  }

  /**
   * Get token usage for a specific date
   */
  async getTokenUsageForDate(date: string): Promise<DailyTokenUsage | null> {
    const usage = await this.readUsage()
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
    return await this.readUsage()
  }

  /**
   * Reset all token usage data
   */
  async resetAllTokenUsage(): Promise<void> {
    await this.writeUsage([])
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
    const usage = await this.readUsage()
    
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
      storageType: this.isVercel ? 'database' : 'file-system'
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isVercel) {
      return true // File system always works
    }

    try {
      const redis = await this.getRedisClient()
      if (!redis) {
        return false
      }

      await redis.set('test_token_usage', 'ok')
      const result = await redis.get('test_token_usage')
      await redis.del('test_token_usage')
      return result === 'ok'
    } catch (error) {
      console.error('❌ Token usage database connection test failed:', error)
      return false
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.redis && this.isConnected) {
      await this.redis.disconnect()
      this.isConnected = false
      console.log('🔌 Token usage Redis client disconnected')
    }
  }

  /**
   * Migrate data from file system to database (for Vercel deployments)
   */
  async migrateFromFileToDatabase(): Promise<{ migrated: number; errors: number }> {
    if (!this.isVercel) {
      console.log('⚠️ Migration only needed on Vercel')
      return { migrated: 0, errors: 0 }
    }

    try {
      // Read existing data from file
      const fileData = this.readUsageFromFile()
      if (fileData.length === 0) {
        console.log('📊 No file data to migrate')
        return { migrated: 0, errors: 0 }
      }

      console.log(`📊 Migrating ${fileData.length} token usage records to database...`)

      // Write to database
      await this.writeUsageToDatabase(fileData)

      console.log(`✅ Successfully migrated ${fileData.length} records to database`)
      return { migrated: fileData.length, errors: 0 }
    } catch (error) {
      console.error('❌ Failed to migrate token usage data:', error)
      return { migrated: 0, errors: 1 }
    }
  }

  /**
   * Initialize service and migrate data if needed
   */
  async initialize(): Promise<void> {
    if (this.isVercel) {
      console.log('🚀 Initializing token usage service for Vercel deployment...')
      
      // Test database connection
      const connectionTest = await this.testConnection()
      if (connectionTest) {
        console.log('✅ Database connection successful')
        
        // Try to migrate any existing file data
        const migration = await this.migrateFromFileToDatabase()
        if (migration.migrated > 0) {
          console.log(`📊 Migrated ${migration.migrated} records from file to database`)
        }
      } else {
        console.log('⚠️ Database connection failed, will use fallback storage')
      }
    } else {
      console.log('🚀 Initializing token usage service for local development...')
    }
  }
}

export default TokenUsageService 