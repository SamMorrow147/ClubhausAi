import { NextRequest } from 'next/server'
import SimpleLogger from '../../../lib/simpleLogger'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || 'anonymous'
    
    const logger = SimpleLogger.getInstance()
    const chatLogs = await logger.getAllChatLogs(userId)
    
    return new Response(
      JSON.stringify({ 
        chatLogs,
        count: chatLogs.length,
        userId 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ Memory API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve chat logs' }),
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
    
    return new Response(
      JSON.stringify({ 
        message: 'All chat logs deleted successfully',
        userId 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ Memory deletion error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to delete chat logs' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 