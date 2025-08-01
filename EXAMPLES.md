# Chat Logging Examples

This document shows how the Mem0 AI chat logging system works in practice.

## How It Works

### 1. User Sends Message
When a user sends a message like "I need help with a logo design", the system:

```typescript
// Automatically logs the user message
await memoryService.logUserMessage(userId, "I need help with a logo design", {
  sessionId: "session_1234567890",
  projectType: "logo_design"
})
```

### 2. AI Responds
When the AI responds, it's also logged:

```typescript
// Automatically logs the AI response
await memoryService.logAIResponse(userId, "I'd love to help with your logo design! What's your brand about?", {
  sessionId: "session_1234567890",
  projectType: "logo_design"
})
```

### 3. What Gets Stored

Each log entry includes:
- **Message content** (user input or AI response)
- **User ID** (for tracking conversations per user)
- **Timestamp** (when the message was sent)
- **Session ID** (to group conversations)
- **Project type** (if detected)
- **Platform** (chat_ui)
- **Type** (user_input or ai_response)

### 4. Example Log Entry

```json
{
  "id": "abc123",
  "memory": "I need help with a logo design",
  "metadata": {
    "timestamp": 1704067200000,
    "platform": "chat_ui",
    "type": "user_input",
    "sessionId": "session_1234567890",
    "projectType": "logo_design"
  },
  "userId": "anonymous",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

## API Endpoints

### Get All Chat Logs
```bash
GET /api/memory?userId=anonymous
```

Response:
```json
{
  "chatLogs": [
    {
      "id": "abc123",
      "memory": "I need help with a logo design",
      "metadata": { ... },
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "count": 1,
  "userId": "anonymous"
}
```

### Delete All Chat Logs
```bash
DELETE /api/memory?userId=anonymous
```

## Testing

1. **Start a conversation** on the main chat page
2. **Visit `/test-memory`** to see your logged conversations
3. **Try different project types** to see how metadata is tracked
4. **Delete logs** to test the cleanup functionality

## Benefits

- **Complete conversation history** for each user
- **Rich metadata** for analysis
- **Vector storage** for future semantic search
- **Easy export** for analytics
- **Session tracking** for conversation flow analysis

## Future Enhancements

- Export conversations to CSV/JSON
- Analyze most common questions
- Track user engagement patterns
- Generate conversation summaries
- Sentiment analysis of conversations 