import { Memory } from 'mem0ai/oss'

// Initialize Mem0 with basic configuration
let memory: Memory | null = null

// Only initialize if OpenAI API key is available
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  memory = new Memory({
    version: 'v1.1',
    embedder: {
      provider: 'openai',
      config: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'text-embedding-3-small',
      },
    },
    vectorStore: {
      provider: 'memory',
      config: {
        collectionName: 'clubhaus_chat_logs',
        dimension: 1536,
      },
    },
    historyDbPath: './chat_logs.db',
    disableHistory: false,
    customPrompt: "I'm Clubman, the Clubhaus AI assistant. I help users with creative projects, design work, and business inquiries.",
  })
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export interface MemoryMetadata {
  userId?: string
  sessionId?: string
  category?: string
  projectType?: string
  tags?: string[]
}

export class MemoryService {
  private static instance: MemoryService

  private constructor() {}

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService()
    }
    return MemoryService.instance
  }

  /**
   * Log a user message
   */
  async logUserMessage(
    userId: string,
    message: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!memory) {
      console.log('⚠️  Memory logging disabled - OpenAI API key not configured')
      return
    }

    try {
      await memory.add([{ role: 'user', content: message }], {
        userId,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          platform: 'chat_ui',
          type: 'user_input'
        }
      })

      console.log('📝 Logged user message for user:', userId)
    } catch (error) {
      console.error('❌ Failed to log user message:', error)
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
    if (!memory) {
      console.log('⚠️  Memory logging disabled - OpenAI API key not configured')
      return
    }

    try {
      await memory.add([{ role: 'assistant', content: response }], {
        userId,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          platform: 'chat_ui',
          type: 'ai_response'
        }
      })

      console.log('🤖 Logged AI response for user:', userId)
    } catch (error) {
      console.error('❌ Failed to log AI response:', error)
      // Don't throw - we don't want logging failures to break the chat
    }
  }

  /**
   * Get all chat logs for a user
   */
  async getAllChatLogs(userId: string): Promise<any[]> {
    if (!memory) {
      console.log('⚠️  Memory logging disabled - OpenAI API key not configured')
      return []
    }

    try {
      const result = await memory.getAll({ userId })
      return result.results || []
    } catch (error) {
      console.error('❌ Failed to get chat logs:', error)
      return []
    }
  }

  /**
   * Delete all chat logs for a user
   */
  async deleteAllChatLogs(userId: string): Promise<void> {
    if (!memory) {
      console.log('⚠️  Memory logging disabled - OpenAI API key not configured')
      return
    }

    try {
      await memory.deleteAll({ userId })
      console.log('🗑️ Deleted all chat logs for user:', userId)
    } catch (error) {
      console.error('❌ Failed to delete chat logs:', error)
    }
  }

  /**
   * Reset all chat logs (use with caution)
   */
  async resetAllChatLogs(): Promise<void> {
    if (!memory) {
      console.log('⚠️  Memory logging disabled - OpenAI API key not configured')
      return
    }

    try {
      await memory.reset()
      console.log('🔄 Reset all chat logs')
    } catch (error) {
      console.error('❌ Failed to reset chat logs:', error)
    }
  }
}

export default MemoryService 