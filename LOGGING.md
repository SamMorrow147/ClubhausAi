# Simple Chat Logging System

This system logs all chat conversations to a local JSON file without requiring any API keys.

## 🎯 Features

- **No API Keys Required** - Works completely offline
- **Simple JSON Storage** - All logs stored in `logs/chat_logs.json`
- **Rich Metadata** - Timestamps, session IDs, user roles, project types
- **CSV Export** - Download logs as CSV for analysis
- **Statistics** - Get usage stats and analytics
- **Session Tracking** - Group conversations by session

## 📁 File Structure

```
logs/
└── chat_logs.json    # All chat logs stored here
```

## 🔧 API Endpoints

### Get Chat Logs
```bash
GET /api/memory?userId=anonymous
```

### Get All Logs with Options
```bash
GET /api/logs                    # All logs
GET /api/logs?userId=anonymous   # User-specific logs
GET /api/logs?format=csv         # Export as CSV
GET /api/logs?format=stats       # Get statistics
```

### Delete Logs
```bash
DELETE /api/memory?userId=anonymous  # Delete user logs
DELETE /api/logs                      # Reset all logs
```

## 📊 Log Entry Structure

Each log entry contains:

```json
{
  "id": "user_1704067200000_abc123",
  "userId": "anonymous",
  "sessionId": "session_1704067200000",
  "role": "user",
  "content": "I need help with a logo design",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "metadata": {
    "platform": "chat_ui",
    "type": "user_input",
    "projectType": "logo_design"
  }
}
```

## 🚀 Usage Examples

### 1. View Logs in Browser
Visit: `http://localhost:3002/test-memory`

### 2. Export to CSV
```bash
curl "http://localhost:3002/api/logs?format=csv" > chat_logs.csv
```

### 3. Get Statistics
```bash
curl "http://localhost:3002/api/logs?format=stats"
```

### 4. View User Logs
```bash
curl "http://localhost:3002/api/logs?userId=anonymous"
```

## 📈 Statistics Response

```json
{
  "totalMessages": 150,
  "totalUsers": 25,
  "totalSessions": 45,
  "userStats": {
    "anonymous": 50,
    "user123": 30,
    "user456": 70
  }
}
```

## 🎯 Benefits

- **Zero Dependencies** - No external APIs required
- **Privacy First** - All data stays local
- **Easy Analysis** - JSON/CSV export for any tool
- **Session Tracking** - See complete conversation flows
- **Rich Metadata** - Track project types, timestamps, etc.

## 🔄 Migration from Mem0

The system now uses simple file-based logging instead of Mem0:

- ✅ **No OpenAI API key required**
- ✅ **Works immediately**
- ✅ **All conversations logged**
- ✅ **Easy to analyze and export**
- ✅ **Privacy-focused (local storage only)**

## 📝 Example Log Output

After chatting with the AI, your `logs/chat_logs.json` will look like:

```json
[
  {
    "id": "user_1704067200000_abc123",
    "userId": "anonymous",
    "sessionId": "session_1704067200000",
    "role": "user",
    "content": "What is Clubhaus?",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "metadata": {
      "platform": "chat_ui",
      "type": "user_input"
    }
  },
  {
    "id": "ai_1704067201000_def456",
    "userId": "anonymous",
    "sessionId": "session_1704067200000",
    "role": "assistant",
    "content": "Clubhaus is a creative agency...",
    "timestamp": "2024-01-01T12:00:01.000Z",
    "metadata": {
      "platform": "chat_ui",
      "type": "ai_response"
    }
  }
]
```

Perfect for tracking user interactions, analyzing common questions, and understanding how people use your AI assistant! 