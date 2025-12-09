import { NextResponse } from 'next/server'
import TokenUsageService from '../../../lib/tokenUsageService'

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
      DATABASE_URL: {
        exists: !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL,
        startsWith: (process.env.DATABASE_URL || process.env.POSTGRES_URL)?.substring(0, 20) || 'N/A'
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

    // Test Token Usage Database connection
    let tokenUsageTest = {
      success: false,
      responseTime: 0,
      error: null as string | null,
      environment: null as any
    }

    try {
      const tokenStartTime = Date.now()
      const tokenUsageService = TokenUsageService.getInstance()
      const connectionTest = await tokenUsageService.testConnection()
      const tokenResponseTime = Date.now() - tokenStartTime
      
      tokenUsageTest.success = connectionTest
      tokenUsageTest.responseTime = tokenResponseTime
      tokenUsageTest.environment = tokenUsageService.getEnvironmentInfo()
    } catch (error) {
      tokenUsageTest.error = error instanceof Error ? error.message : 'Unknown error'
    }

    const totalTime = Date.now() - startTime

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      responseTime: totalTime,
      environment: envChecks,
      fileSystem: fsChecks,
      groqApi: groqTest,
      tokenUsage: tokenUsageTest,
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