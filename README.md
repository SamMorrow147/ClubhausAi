# CH Bot

A Next.js-based AI chatbot for Clubhaus Agency, built with Groq's LLM API.

## Features

- **AI Chat Interface**: Powered by Groq's Llama 3.1 8B Instant model
- **Knowledge Base Integration**: RAG (Retrieval-Augmented Generation) with Clubhaus-specific content
- **User Profile Management**: Collects and manages user information
- **Strategic Responses**: Pre-configured responses for common scenarios
- **Token Usage Tracking**: Monitors API usage and costs
- **Memory Management**: Persistent conversation history
- **Rate Limiting Protection**: Automatic retry mechanism for Groq API throttling

## Groq API Retry Mechanism

The application includes a robust retry mechanism to handle Groq's rate limiting and throttling:

### Features
- **Exponential Backoff**: Starts at 1 second, doubles each retry (max 10 seconds)
- **Jitter**: Adds random variation to prevent thundering herd problems
- **Smart Error Detection**: Identifies retryable vs non-retryable errors
- **User-Friendly Messages**: Clear error messages for rate limiting scenarios

### Configuration
```typescript
const GROQ_RETRY_CONFIG = {
  maxRetries: 3,        // Maximum retry attempts
  baseDelay: 1000,      // Initial delay (1 second)
  maxDelay: 10000,      // Maximum delay (10 seconds)
  jitter: 0.1,          // 10% random variation
}
```

### Error Handling
- **429 Status Codes**: Rate limiting errors
- **Groq-specific messages**: "rate limit", "throttle", "too many requests", "quota exceeded"
- **Server errors (5xx)**: Temporary server issues
- **Network errors**: Connection issues

### User Experience
When rate limiting occurs, users receive friendly messages like:
- "The service is temporarily busy. Please wait a moment and try again."
- "Service capacity reached. Please try again in a moment."

## Setup

### 1. Prerequisites

- Node.js 18+ installed
- API keys for:
  - **Groq API** (for chat completion)
  - **OpenAI API** (for embeddings)

### 2. Installation

```bash
# Clone the repository (if applicable)
# cd into project directory

# Install dependencies
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Required: Groq API Key for chat completions
GROQ_API_KEY=your_groq_api_key_here

# Required: OpenAI API Key for memory embeddings
OPENAI_API_KEY=your_openai_api_key_here
```

**Getting API Keys:**

- **Groq**: Sign up at [console.groq.com](https://console.groq.com) and create an API key
- **OpenAI**: Sign up at [platform.openai.com](https://platform.openai.com) and create an API key for embeddings

### 4. Run the Application

```bash
# Start the development server
npm run dev

# Open http://localhost:3000 in your browser

## 🧠 Chat Logging System

The AI assistant now includes persistent chat logging using a simple file-based system. This allows you to:

- **Log all user messages** with metadata and timestamps
- **Log all AI responses** for complete conversation tracking
- **Export conversation history** per user
- **Analyze chat patterns** and user interactions

### Logging Features

- **Automatic Logging**: All user messages and AI responses are automatically logged
- **Metadata Tracking**: Timestamps, session IDs, project types, and platform info
- **Vector Storage**: Messages are stored as vectorized records for future analysis
- **Simple Retrieval**: Easy export and query capabilities

### Testing Chat Logs

Visit `/test-memory` to view and manage stored chat logs:

- **Session-based organization** - Conversations grouped by session
- **Collapsible conversations** - Click to expand full conversations
- **Message previews** - See first and last messages at a glance
- **Rich metadata** - View timestamps, project types, and session info
- **Delete functionality** - Clear logs for testing

### Logging Configuration

The logging system uses:
- **Storage**: Local JSON file (`logs/chat_logs.json`) for persistence
- **No API Dependencies**: Works completely offline
- **Metadata**: Rich metadata including timestamps, session IDs, and user info
- **CSV Export**: Download logs for analysis in Excel/Google Sheets

## 💡 How It Works

### RAG Pipeline

1. **Knowledge Loading**: On server start, the system loads `data/clubhaus-knowledge.md`
2. **Text Chunking**: Content is split into logical chunks (~1000 characters)
3. **Embedding Generation**: Each chunk is converted to vector embeddings using OpenAI
4. **Query Processing**: User messages are converted to embeddings
5. **Similarity Search**: Top 3 most relevant chunks are retrieved using cosine similarity
6. **Context Injection**: Retrieved chunks are added to the system prompt
7. **Response Generation**: Groq's Llama model generates contextual responses

### Key Components

- **`lib/embed.ts`**: Handles markdown processing and embedding generation
- **`lib/rag.ts`**: Manages vector similarity search and context formatting
- **`pages/api/chat.ts`**: API endpoint that orchestrates the RAG pipeline
- **`pages/index.tsx`**: React chat interface with streaming support

## 📝 Customizing the Knowledge Base

Edit `data/clubhaus-knowledge.md` to customize the chatbot's knowledge:

```markdown
# Your Company Knowledge Base

## About Your Company
Your company description here...

## Services
- Service 1: Description
- Service 2: Description

## Policies
### Policy 1
Details about policy 1...
```

The system will automatically:
- Split content by headers (`##`, `###`)
- Create embeddings for each section
- Enable semantic search across all content

## 🎨 UI Customization

The chat interface uses Tailwind utility classes. Key styling areas:

- **Colors**: Change `indigo-600` to your brand colors
- **Layout**: Modify the responsive grid and spacing
- **Messages**: Customize bubble styles in the message mapping
- **Animations**: Adjust loading states and transitions

## 🚀 Deployment

### Vercel (Recommended)

#### Option 1: Deploy via Vercel Dashboard

1. **Push to GitHub**: First, push your code to the GitHub repository
2. **Connect to Vercel**: Go to [vercel.com](https://vercel.com) and connect your GitHub account
3. **Import Project**: Import the `ClubhausAi` repository
4. **Configure Environment Variables**: Add the following environment variables in Vercel dashboard:
   - `GROQ_API_KEY`: Your Groq API key
   - `OPENAI_API_KEY`: Your OpenAI API key
5. **Deploy**: Vercel will automatically build and deploy your application

#### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add GROQ_API_KEY
vercel env add OPENAI_API_KEY
```

### Environment Variables Setup

For both deployment methods, you'll need to set this environment variable:

```env
# Required: Groq API Key for chat completions
GROQ_API_KEY=your_groq_api_key_here
```

### Other Platforms

Compatible with any platform supporting Node.js:
- Netlify
- Railway
- Render
- AWS Lambda

## 🐛 Troubleshooting

### Common Issues

1. **"Knowledge base not initialized"**
   - Check that `data/clubhaus-knowledge.md` exists
   - Ensure OpenAI API key is valid

2. **"API configuration error"**
   - Verify Groq API key in `.env.local`
   - Check API key permissions

3. **Embedding errors**
   - Confirm OpenAI API key and billing status
   - Check network connectivity

4. **Build errors**
   - Run `npm install` to ensure dependencies
   - Check Node.js version (18+ required)

### Debug Mode

Enable verbose logging by adding to `.env.local`:

```env
DEBUG=true
```

## 📊 Performance Notes

- **First Request**: May take 10-30 seconds as embeddings are generated
- **Subsequent Requests**: Fast response times (~1-3 seconds)
- **Memory Usage**: ~50MB for knowledge base in memory
- **Embedding Cost**: ~$0.001 per 1000 tokens (one-time setup cost)

## 🔒 Security Considerations

- **API Keys**: Never commit `.env.local` to version control
- **Rate Limiting**: Consider implementing rate limits for production
- **Input Validation**: The system includes basic input sanitization
- **CORS**: Configure appropriate CORS settings for production

## 📈 Scaling & Production

For production deployments:

1. **Database Storage**: Replace in-memory vectors with a vector database (Pinecone, Weaviate)
2. **Caching**: Implement Redis caching for frequent queries
3. **Rate Limiting**: Add API rate limiting
4. **Monitoring**: Integrate observability tools
5. **Load Balancing**: Scale horizontally as needed

## 🤝 Contributing

To extend this project:

1. **Add New Data Sources**: Extend `lib/embed.ts` to handle other formats
2. **Improve Search**: Implement semantic ranking or hybrid search
3. **UI Enhancements**: Add features like message editing, export, etc.
4. **Model Options**: Support multiple LLM providers

## 📜 License

This project is open source and available under the MIT License.

## 🆘 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the [Vercel AI SDK documentation](https://sdk.vercel.ai)
3. Check [Groq documentation](https://console.groq.com/docs)

---

**Built with ❤️ using Vercel AI SDK, Next.js, and Groq** 