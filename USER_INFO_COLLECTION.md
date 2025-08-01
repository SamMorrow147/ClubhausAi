# User Information Collection System

This system automatically collects user name, email, and phone number during conversations and displays them in the test-memory dashboard.

## 🎯 Features

- **Automatic Extraction**: Detects user information (name, email, phone) from natural conversation
- **Casual Collection**: AI asks for missing information naturally, not like a form
- **Progressive Gathering**: Collects one piece at a time, doesn't overwhelm users
- **Visual Dashboard**: Displays collected information at the top of conversation sessions
- **Completion Tracking**: Shows which information has been collected with visual indicators

## 🔧 How It Works

### 1. Automatic Detection
The system uses regex patterns to automatically extract:
- **Email addresses**: Standard email format validation
- **Phone numbers**: Various US phone number formats
- **Names**: Patterns like "I'm John", "My name is...", "Call me..."

### 2. Natural Collection
The AI is instructed to:
- Ask for missing information casually during conversation
- Weave requests naturally into responses  
- Not make it feel like filling out a form
- Only ask for one piece of information at a time
- Stop asking once all three pieces are collected

### 3. Storage
User information is stored in the chat log metadata as:
```typescript
interface UserProfile {
  userId: string
  name?: string
  email?: string
  phone?: string
  createdAt: string
  updatedAt: string
  sessionId: string
}
```

## 📊 Dashboard Display

In `/test-memory`, each conversation session shows:

- **User Information Card**: Displays name, email, phone at the top of each session
- **Completion Indicators**: Green/gray dots showing what's been collected (x/3)
- **Missing Information**: Shows "Not provided" for missing fields
- **No Profile Indicator**: Shows when no user information has been collected

## 🚀 Usage Examples

### User shares information naturally:
**User**: "I'm Sarah and I need help with a logo"
**System**: Automatically extracts "Sarah" as the name

### AI asks for missing information:
**AI**: "I'd love to help with that logo, Sarah! What's your email so we can follow up with details?"

### Progressive collection:
1. First interaction: AI gets name naturally
2. Second interaction: AI asks for email when relevant
3. Third interaction: AI asks for phone number
4. After all three: AI stops asking and focuses on helping

## 🔧 Implementation Files

- `lib/userProfileService.ts` - Core user profile management
- `app/api/chat/route.ts` - Integration with chat API
- `app/test-memory/page.tsx` - Dashboard display
- `lib/simpleLogger.ts` - Storage integration

## 🎯 AI Prompting Guidelines

The AI follows these guidelines for collecting user information:

1. **Be Natural**: "What should I call you?" vs "Please provide your name"
2. **Context Relevant**: Ask for email when offering to follow up
3. **One at a Time**: Don't ask for all three pieces at once
4. **Stop When Complete**: Once all info is collected, focus on helping
5. **Casual Tone**: Keep it conversational, not formal

## 📈 Benefits

- **Lead Generation**: Automatically captures contact information
- **Personalization**: AI can address users by name
- **Follow-up Capability**: Email and phone for continued engagement
- **Analytics**: Track information collection completion rates
- **User Experience**: Feels natural, not like a form

## 🔍 Testing

1. Start a conversation on the main chat page
2. Share your name, email, or phone naturally in conversation
3. See how the AI asks for missing information
4. Visit `/test-memory` to see the collected information displayed
5. Try different conversation flows to test the collection patterns 