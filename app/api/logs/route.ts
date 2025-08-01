import { NextRequest } from 'next/server'
import SimpleLogger from '../../../lib/simpleLogger'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const format = searchParams.get('format') || 'json'
    
    const logger = SimpleLogger.getInstance()
    
    if (format === 'csv') {
      const csv = await logger.exportToCSV(userId || undefined)
      return new Response(csv, {
        status: 200,
        headers: { 
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="chat_logs.csv"'
        }
      })
    }
    
    if (format === 'stats') {
      const stats = await logger.getStats()
      return new Response(
        JSON.stringify(stats),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Default: return JSON logs
    const logs = userId ? await logger.getAllChatLogs(userId) : await logger.getAllLogs()
    
    return new Response(
      JSON.stringify({ 
        logs,
        count: logs.length,
        userId: userId || 'all'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ Logs API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve logs' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const logger = SimpleLogger.getInstance()
    await logger.resetAllChatLogs()
    
    return new Response(
      JSON.stringify({ 
        message: 'All chat logs reset successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ Logs reset error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to reset logs' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 