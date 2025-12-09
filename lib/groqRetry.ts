// Retry configuration for Groq API calls
export const GROQ_RETRY_CONFIG = {
  maxRetries: 2, // Reduced from 3 to 2
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  jitter: 0.1, // 10% jitter
}

// Helper function to calculate exponential backoff with jitter
export function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    GROQ_RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
    GROQ_RETRY_CONFIG.maxDelay
  )
  
  const jitter = exponentialDelay * GROQ_RETRY_CONFIG.jitter * (Math.random() - 0.5)
  return Math.max(exponentialDelay + jitter, 100) // Minimum 100ms
}

// Helper function to check if error is retryable
export function isRetryableError(status: number, errorData: any): boolean {
  // Rate limiting errors (429)
  if (status === 429) return true
  
  // Groq-specific rate limiting errors
  if (errorData?.error?.message?.includes('rate limit') || 
      errorData?.error?.message?.includes('throttle') ||
      errorData?.error?.message?.includes('too many requests') ||
      errorData?.error?.message?.includes('quota exceeded')) {
    return true
  }
  
  // Token limit errors (413) - these are NOT retryable as they indicate the request is too large
  if (status === 413 || errorData?.error?.message?.includes('Request too large')) {
    return false
  }
  
  // Server errors (5xx) that might be temporary
  if (status >= 500 && status < 600) return true
  
  return false
}

// Retry wrapper for Groq API calls
export async function callGroqWithRetry(
  conversationMessages: any[],
  requestId: string,
  startTime: number
): Promise<{ data: any; responseTime: number }> {
  let lastError: any = null
  
  for (let attempt = 0; attempt <= GROQ_RETRY_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`🤖 Calling Groq API (attempt ${attempt + 1}/${GROQ_RETRY_CONFIG.maxRetries + 1})`)
      
      const groqStartTime = Date.now()
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile', // Higher token limit (30,000 TPM) than llama-3.1-8b-instant
          messages: conversationMessages,
          temperature: 0.7,
          max_tokens: 2000, // Increased from 1000 to allow longer responses
        }),
      })

      const groqResponseTime = Date.now() - groqStartTime
      console.log(`⏱️ Groq API response time: ${groqResponseTime}ms`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`❌ Groq API error (attempt ${attempt + 1}):`, errorData)
        console.error(`❌ Response status: ${response.status}`)
        
        // Check if this is a retryable error
        if (isRetryableError(response.status, errorData)) {
          lastError = new Error(`Groq API error: ${errorData.error?.message || 'Unknown error'} (Status: ${response.status})`)
          
          if (attempt < GROQ_RETRY_CONFIG.maxRetries) {
            const delay = calculateBackoffDelay(attempt)
            console.log(`⏳ Rate limited/throttled. Retrying in ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }
        
        // Non-retryable error or max retries reached
        throw new Error(`Groq API error: ${errorData.error?.message || 'Unknown error'} (Status: ${response.status})`)
      }

      const data = await response.json()
      console.log('✅ Got response from Groq')
      
      return { data, responseTime: groqResponseTime }
      
    } catch (error: any) {
      lastError = error
      
      // If this is the last attempt, throw the error
      if (attempt === GROQ_RETRY_CONFIG.maxRetries) {
        console.error(`❌ Groq API failed after ${GROQ_RETRY_CONFIG.maxRetries + 1} attempts`)
        throw error
      }
      
      // For network errors or other issues, retry with backoff
      const delay = calculateBackoffDelay(attempt)
      console.log(`⏳ API call failed. Retrying in ${delay}ms... (${error.message})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Helper function to get user-friendly error messages for rate limiting
export function getRateLimitErrorMessage(error: any): string {
  if (error.message?.includes('rate limit') || error.message?.includes('throttle') || error.message?.includes('429')) {
    return 'The service is temporarily busy. Please wait a moment and try again.'
  }
  
  if (error.message?.includes('quota exceeded') || error.message?.includes('too many requests')) {
    return 'Service capacity reached. Please try again in a moment.'
  }
  
  return 'An error occurred while processing your request. Please try again.'
} 