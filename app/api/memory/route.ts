import { NextRequest } from 'next/server'
import SimpleLogger from '../../../lib/simpleLogger'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || 'anonymous'
    
    const logger = SimpleLogger.getInstance()
    const chatLogs = await logger.getAllChatLogs(userId)
    const envInfo = logger.getEnvironmentInfo()
    
    // Test database connection on Vercel
    let dbConnectionStatus = null
    let debugInfo = null
    if (envInfo.isVercel) {
      dbConnectionStatus = await logger.testDatabaseConnection()
      
      // Add debug information
      debugInfo = {
        hasDatabaseUrl: !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL,
        databaseUrlPrefix: (process.env.DATABASE_URL || process.env.POSTGRES_URL)?.substring(0, 20) || 'not set',
        hasGroqKey: !!process.env.GROQ_API_KEY,
        groqKeyPrefix: process.env.GROQ_API_KEY?.substring(0, 10) || 'not set'
      }
    }
    
    return new Response(
      JSON.stringify({ 
        chatLogs,
        count: chatLogs.length,
        userId,
        environment: envInfo,
        dbConnectionStatus,
        debugInfo,
        message: envInfo.isVercel 
          ? 'Logs are stored in database on Vercel and persist between deployments' 
          : 'Logs are stored in local file system'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ Memory API error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to retrieve chat logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || 'anonymous'
    
    const logger = SimpleLogger.getInstance()
    await logger.deleteAllChatLogs(userId)
    const envInfo = logger.getEnvironmentInfo()
    
    return new Response(
      JSON.stringify({ 
        message: 'All chat logs deleted successfully',
        userId,
        environment: envInfo
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ Memory deletion error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to delete chat logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 