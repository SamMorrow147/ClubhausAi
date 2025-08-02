# Groq API Retry Mechanism

## Overview

This implementation adds a robust retry mechanism to handle Groq's rate limiting and throttling errors. Instead of immediately failing when Groq returns rate limiting errors, the system will automatically retry with exponential backoff.

## How It Works

### 1. Error Detection
The system identifies retryable errors by checking:
- HTTP status code 429 (Too Many Requests)
- Error messages containing: "rate limit", "throttle", "too many requests", "quota exceeded"
- Server errors (5xx status codes)

### 2. Exponential Backoff
- **Initial delay**: 1 second
- **Maximum delay**: 10 seconds
- **Jitter**: 10% random variation to prevent thundering herd
- **Formula**: `min(baseDelay * 2^attempt, maxDelay) + random(-jitter, +jitter)`

### 3. Retry Configuration
```typescript
const GROQ_RETRY_CONFIG = {
  maxRetries: 3,        // Maximum 3 retry attempts
  baseDelay: 1000,      // Start with 1 second
  maxDelay: 10000,      // Cap at 10 seconds
  jitter: 0.1,          // 10% random variation
}
```

## Implementation Details

### Files Modified
1. **`lib/groqRetry.ts`** - New utility file with retry logic
2. **`app/api/chat/route.ts`** - Updated to use retry mechanism
3. **`README.md`** - Added documentation

### Key Functions

#### `callGroqWithRetry()`
- Wraps the Groq API call with retry logic
- Returns `{ data, responseTime }` on success
- Throws error after max retries exceeded

#### `isRetryableError()`
- Determines if an error should trigger a retry
- Checks status codes and error messages

#### `calculateBackoffDelay()`
- Calculates exponential backoff with jitter
- Ensures minimum 100ms delay

#### `getRateLimitErrorMessage()`
- Provides user-friendly error messages
- Differentiates between rate limiting scenarios

## User Experience

### Before (Immediate Failure)
```
User: "Tell me about your services"
Bot: "Sorry, I encountered an error. Please try again."
```

### After (Automatic Retry)
```
User: "Tell me about your services"
Bot: [Waits 1-10 seconds if rate limited, then responds normally]
```

### If All Retries Fail
```
User: "Tell me about your services"
Bot: "The service is temporarily busy. Please wait a moment and try again."
```

## Error Scenarios Handled

1. **Rate Limiting (429)**: Automatic retry with backoff
2. **Throttling Messages**: "rate limit", "throttle", "too many requests"
3. **Quota Exceeded**: "quota exceeded" messages
4. **Server Errors (5xx)**: Temporary server issues
5. **Network Errors**: Connection issues

## Benefits

- **Improved User Experience**: Users don't see immediate failures
- **Automatic Recovery**: System handles temporary issues gracefully
- **Reduced Support Burden**: Fewer "broken bot" reports
- **Cost Optimization**: Prevents unnecessary API calls during rate limiting
- **Reliability**: More robust handling of Groq's throttling

## Monitoring

The system logs retry attempts for monitoring:
```
🤖 Calling Groq API (attempt 1/4)
⏳ Rate limited/throttled. Retrying in 1234ms...
🤖 Calling Groq API (attempt 2/4)
✅ Got response from Groq
```

## Configuration

To adjust retry behavior, modify `GROQ_RETRY_CONFIG` in `lib/groqRetry.ts`:

```typescript
const GROQ_RETRY_CONFIG = {
  maxRetries: 5,        // More retries for higher reliability
  baseDelay: 2000,      // Start with 2 seconds
  maxDelay: 15000,      // Cap at 15 seconds
  jitter: 0.2,          // 20% random variation
}
``` 