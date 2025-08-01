import { checkProjectTriggers } from '../../../lib/projectHandler'

export async function GET() {
  const testQueries = [
    "we want to gamify our space",
    "designing for an arcade",
    "interactive signage",
    "check-in more fun",
    "feels like a game",
    "bowling alley branding",
    "gamified experience",
    "interactive touchpoints",
    "playful branding",
    "arcade-style design",
    "game mechanics in design",
    "interactive displays",
    "fun user experience",
    "engaging customer experience",
    "brand that feels like a game",
    "hello world", // This should not trigger
    "website design", // This should not trigger
  ]

  const results = testQueries.map(query => {
    const trigger = checkProjectTriggers(query)
    return {
      query,
      triggered: !!trigger,
      triggerName: trigger?.name || null,
      response: trigger?.response.text || null
    }
  })

  return new Response(
    JSON.stringify({
      message: 'Project trigger test results',
      results,
      summary: {
        total: results.length,
        triggered: results.filter(r => r.triggered).length,
        notTriggered: results.filter(r => !r.triggered).length
      }
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  )
} 