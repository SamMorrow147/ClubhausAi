import TokenUsageService, { DailyTokenUsage } from '../../../lib/tokenUsageService'

export async function GET(req: Request) {
  try {
    const tokenUsageService = TokenUsageService.getInstance()
    
    // Initialize the service (this will test connection and migrate data if needed)
    await tokenUsageService.initialize()
    
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'today'
    const days = parseInt(url.searchParams.get('days') || '7')
    const date = url.searchParams.get('date')

    console.log('🔍 Token usage API called with action:', action)

    let data: any = {}

    switch (action) {
      case 'today':
        data.todayUsage = await tokenUsageService.getTodayTokenUsage()
        break
        
      case 'date':
        if (!date) {
          return new Response(
            JSON.stringify({ error: 'Date parameter required for date action' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
        data.dateUsage = await tokenUsageService.getTokenUsageForDate(date)
        break
        
      case 'history':
        data.history = await tokenUsageService.getTokenUsageForLastDays(days)
        break
        
      case 'stats':
        data.stats = await tokenUsageService.getStats()
        break
        
      case 'all':
        data.todayUsage = await tokenUsageService.getTodayTokenUsage()
        data.history = await tokenUsageService.getTokenUsageForLastDays(7)
        data.stats = await tokenUsageService.getStats()
        break
        
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Valid actions: today, date, history, stats, all' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }

    // Add environment info
    data.environment = tokenUsageService.getEnvironmentInfo()
    data.timestamp = new Date().toISOString()

    return new Response(
      JSON.stringify(data),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Token usage API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve token usage data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const tokenUsageService = TokenUsageService.getInstance()

    console.log('🗑️ Token usage DELETE API called')

    await tokenUsageService.resetAllTokenUsage()

    return new Response(
      JSON.stringify({ 
        message: 'All token usage data has been reset',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Token usage DELETE API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to reset token usage data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 