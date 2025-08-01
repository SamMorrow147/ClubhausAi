# 🚀 Vercel Deployment Guide

This guide will walk you through deploying your Clubhaus AI Chatbot to Vercel.

## ✅ Prerequisites

1. **GitHub Repository**: Your code is now pushed to [https://github.com/SamMorrow147/ClubhausAi.git](https://github.com/SamMorrow147/ClubhausAi.git)
2. **API Keys**: You'll need:
   - **Groq API Key**: Get from [console.groq.com](https://console.groq.com)
   - **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com/api-keys)

## 🎯 Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Visit Vercel**: Go to [vercel.com](https://vercel.com) and sign in with your GitHub account

2. **Import Project**: 
   - Click "New Project"
   - Select "Import Git Repository"
   - Choose `ClubhausAi` from your repositories
   - Click "Import"

3. **Configure Project**:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `.next` (should auto-detect)

4. **Set Environment Variables**:
   - Click "Environment Variables" section
   - Add the following variables:
     ```
     GROQ_API_KEY=your_actual_groq_api_key_here
     OPENAI_API_KEY=your_actual_openai_api_key_here
     ```
   - Make sure to select "Production", "Preview", and "Development" environments

5. **Deploy**: Click "Deploy" and wait for the build to complete

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to your project directory
cd "/Users/sammorrow/Documents/Local Web Builds/CH Bot"

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: clubhaus-ai (or your preferred name)
# - Directory: ./ (current directory)
# - Override settings? No

# Set environment variables
vercel env add GROQ_API_KEY
vercel env add OPENAI_API_KEY
```

## 🔧 Post-Deployment Configuration

### 1. Verify Environment Variables

After deployment, verify your environment variables are set correctly:

1. Go to your Vercel dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Ensure both `GROQ_API_KEY` and `OPENAI_API_KEY` are set

### 2. Test Your Deployment

1. Visit your deployed URL (e.g., `https://your-project.vercel.app`)
2. Test the chat functionality
3. Check the browser console for any errors

### 3. Custom Domain (Optional)

1. In Vercel dashboard, go to "Settings" → "Domains"
2. Add your custom domain
3. Follow the DNS configuration instructions

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check that all dependencies are in `package.json`
   - Ensure Node.js version is 18+ (Vercel auto-detects)

2. **Environment Variable Errors**:
   - Verify API keys are correctly set in Vercel dashboard
   - Check that keys have proper permissions

3. **Runtime Errors**:
   - Check Vercel function logs in the dashboard
   - Verify API endpoints are working

4. **Knowledge Base Issues**:
   - Ensure all markdown files are committed to Git
   - Check that file paths are correct

### Debugging

1. **View Logs**: In Vercel dashboard, go to "Functions" to see serverless function logs
2. **Local Testing**: Test locally with `npm run dev` to isolate issues
3. **Environment Check**: Add console logs to verify environment variables

## 🔄 Continuous Deployment

Once deployed, Vercel will automatically:
- Deploy new versions when you push to the `main` branch
- Create preview deployments for pull requests
- Handle environment variables across all environments

## 📊 Monitoring

- **Analytics**: View usage in Vercel dashboard
- **Performance**: Monitor function execution times
- **Errors**: Check function logs for issues

## 🔒 Security Notes

- Never commit API keys to Git (they're already in `.gitignore`)
- Use Vercel's environment variable system for secrets
- Consider implementing rate limiting for production use

---

Your Clubhaus AI Chatbot should now be live and accessible via your Vercel URL! 🎉 