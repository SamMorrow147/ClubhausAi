import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Check environment variables
    const envChecks = {
      GROQ_API_KEY: {
        exists: !!process.env.GROQ_API_KEY,
        startsWith: process.env.GROQ_API_KEY?.substring(0, 10) || 'N/A',
        length: process.env.GROQ_API_KEY?.length || 0
      },
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL
    }

    // Check file system access
    const fsChecks = {
      knowledgeBase: {
        exists: false,
        size: 0,
        error: null as string | null
      }
    }

    try {
      const fs = require('fs')
      const path = require('path')
      const knowledgePath = path.join(process.cwd(), 'data', 'clubhaus-knowledge.md')
      const stats = fs.statSync(knowledgePath)
      fsChecks.knowledgeBase.exists = true
      fsChecks.knowledgeBase.size = stats.size
    } catch (error) {
      fsChecks.knowledgeBase.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test Groq API connectivity
    let groqTest = {
      success: false,
      responseTime: 0,
      error: null as string | null
    }

    if (process.env.GROQ_API_KEY) {
      try {
        const groqStartTime = Date.now()
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          },
        })
        const groqResponseTime = Date.now() - groqStartTime
        
        if (response.ok) {
          groqTest.success = true
          groqTest.responseTime = groqResponseTime
        } else {
          groqTest.error = `HTTP ${response.status}: ${response.statusText}`
        }
      } catch (error) {
        groqTest.error = error instanceof Error ? error.message : 'Unknown error'
      }
    } else {
      groqTest.error = 'No GROQ_API_KEY configured'
    }

    const totalTime = Date.now() - startTime

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      responseTime: totalTime,
      environment: envChecks,
      fileSystem: fsChecks,
      groqApi: groqTest,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }, { status: 500 })
  }
} 