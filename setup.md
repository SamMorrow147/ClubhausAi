# 🚀 Quick Start Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy this and replace with your actual API keys
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### Get Your API Keys:

1. **Groq API Key**: 
   - Go to [console.groq.com](https://console.groq.com)
   - Sign up/login and create an API key
   - Copy the key (starts with `gsk_...`)

2. **OpenAI API Key**:
   - Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Sign up/login and create an API key
   - Copy the key (starts with `sk-...`)

## Step 3: Run the Development Server

```bash
npm run dev
```

## Step 4: Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## 🎉 You're Ready!

- The first request may take 10-30 seconds while embeddings are generated
- After that, responses should be fast (1-3 seconds)
- Try asking: "What membership plans do you offer?"

## 🛠️ Customization

- Edit `data/clubhaus-knowledge.md` to update the knowledge base
- Modify `pages/index.tsx` to customize the UI
- Update colors by changing `indigo-600` to your brand colors

## ❗ Troubleshooting

- **"Cannot find module 'ai/react'"**: Run `npm install` again
- **"Knowledge base not initialized"**: Check your OpenAI API key
- **API errors**: Verify both API keys are correct in `.env.local` 