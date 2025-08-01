import { createGroq } from '@ai-sdk/groq'
import fs from 'fs'
import path from 'path'
import { detectProjectType, getProjectQuestions } from '../../../lib/projectPatterns'
import { findStrategicResponse, formatStrategicResponse } from '../../../lib/responses'
import { createBreweryResponse, BreweryConversationState } from '../../../lib/breweryHandler'
import { createMuralResponse, MuralConversationState } from '../../../lib/muralHandler'
import { checkProjectTriggers } from '../../../lib/projectHandler'
import SimpleLogger from '../../../lib/simpleLogger'
import UserProfileService from '../../../lib/userProfileService'

// Create Groq provider instance
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Load knowledge base directly
function loadKnowledgeBase() {
  try {
    const knowledgeFilePath = path.join(process.cwd(), 'data', 'clubhaus-knowledge.md')
    const markdownContent = fs.readFileSync(knowledgeFilePath, 'utf-8')
    console.log('📖 Loaded knowledge base, length:', markdownContent.length)
    return markdownContent
  } catch (error) {
    console.error('❌ Failed to load knowledge base:', error)
    return ''
  }
}

// Simple text search function
function searchKnowledge(query: string, knowledgeContent: string): string {
  const queryLower = query.toLowerCase()
  const sections = knowledgeContent.split(/(?=^##[^#])/gm)
  const relevantSections: string[] = []
  
  console.log('🔍 Searching for query:', query)
  console.log('📚 Found', sections.length, 'sections')
  
  // Keywords that should boost relevance
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2)
  const boostKeywords = ['hours', 'operating', 'schedule', 'time', 'open', 'close', 'access']
  
  for (const section of sections) {
    const sectionLower = section.toLowerCase()
    const headingMatch = section.match(/^#+\s*(.+)/m)
    const heading = headingMatch ? headingMatch[1].toLowerCase() : ''
    
    let score = 0
    
    // Check for exact word matches
    for (const word of queryWords) {
      const contentMatches = (sectionLower.match(new RegExp(word, 'g')) || []).length
      const headingMatches = (heading.match(new RegExp(word, 'g')) || []).length
      score += contentMatches * 2 + headingMatches * 10 // Heading matches are much more important
    }
    
    // Boost score for relevant keywords
    for (const keyword of boostKeywords) {
      if (queryLower.includes(keyword) && sectionLower.includes(keyword)) {
        score += 50 // Significant boost for keyword matches
      }
    }
    
    // Special handling for operating hours queries
    if (queryLower.includes('hour') || queryLower.includes('operating') || queryLower.includes('schedule')) {
      if (sectionLower.includes('hour') || sectionLower.includes('operating') || sectionLower.includes('schedule')) {
        score += 100 // Maximum boost for operating hours queries
      }
    }
    
    if (score > 0) {
      relevantSections.push(section.trim())
      console.log('✅ Found relevant section with score:', score, 'Heading:', heading)
    }
  }
  
  // If no relevant sections found, return the entire knowledge base
  if (relevantSections.length === 0) {
    console.log('⚠️  No relevant sections found, returning all content')
    return knowledgeContent
  }
  
  const result = relevantSections.slice(0, 3).join('\n\n---\n\n')
  console.log('📝 Returning', relevantSections.length, 'relevant sections')
  return result
}

export async function POST(req: Request) {
  try {
    console.log('🔍 Chat API called')
    console.log('🔑 GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY)
    console.log('🔑 GROQ_API_KEY starts with:', process.env.GROQ_API_KEY?.substring(0, 10))
    
    // Parse the request body
    const { messages, sessionId: providedSessionId } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log('❌ No messages provided')
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the last user message for context retrieval
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') {
      console.log('❌ Last message is not from user')
      return new Response(
        JSON.stringify({ error: 'Last message must be from user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📝 User message:', lastMessage.content)

    // Initialize simple logger for chat logging
    const logger = SimpleLogger.getInstance()
    const userProfileService = UserProfileService.getInstance()
    const userId = 'anonymous' // In a real app, this would come from authentication
    const sessionId = providedSessionId || `session_${Date.now()}`
    
    // Extract user information from the message
    const extractedInfo = userProfileService.extractUserInfoFromMessage(lastMessage.content)
    
    // Update user profile if any info was extracted
    if (Object.keys(extractedInfo).length > 0) {
      console.log('👤 Extracted user info:', extractedInfo)
      await userProfileService.updateUserProfile(userId, sessionId, extractedInfo)
    }
    
    // Log the user message
    await logger.logUserMessage(userId, lastMessage.content, {
      sessionId,
      extractedProfile: Object.keys(extractedInfo).length > 0 ? extractedInfo : undefined
    })

    // Check for project triggers first
    const projectTrigger = checkProjectTriggers(lastMessage.content)
    if (projectTrigger) {
      console.log('🎯 Found project trigger for:', projectTrigger.name)
      return new Response(
        JSON.stringify({ 
          message: projectTrigger.response.text,
          context: `Project trigger: ${projectTrigger.name}`,
          projectTrigger: projectTrigger
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check for strategic responses first
    const strategicResponse = findStrategicResponse(lastMessage.content)
    if (strategicResponse) {
      console.log('🎯 Found strategic response for:', strategicResponse.triggers[0])
      console.log('📝 Strategic response triggered, bypassing RAG')
      
      // Check if this is a brewery-related strategic response
      const isBreweryResponse = strategicResponse.triggers.some(trigger => 
        trigger.includes('brewery') || trigger.includes('beer') || trigger.includes('brewing')
      )
      
      // Check if this is a mural-related strategic response
      const isMuralResponse = strategicResponse.triggers.some(trigger => 
        trigger.includes('mural') || trigger.includes('public art') || trigger.includes('installation') || trigger.includes('lake byllesby')
      )
      
      if (isBreweryResponse) {
        console.log('🍺 Brewery response detected, checking for follow-up details')
        
        // Initialize brewery conversation state if not exists
        let breweryState: BreweryConversationState = {
          hasMentionedOmni: true,
          hasSharedMultiLocation: false,
          hasSharedBrandPersonality: false,
          hasSharedPhotography: false,
          hasSharedMicroInteractions: false,
          hasSharedLink: false,
          conversationCount: 1
        }
        
        // Check if we should share additional brewery details
        const { response: breweryDetail, newState } = createBreweryResponse(lastMessage.content, breweryState)
        
        // Combine initial response with brewery detail if available
        let finalResponse = formatStrategicResponse(strategicResponse)
        if (breweryDetail && breweryDetail !== "What kind of brewery project are you thinking about?") {
          finalResponse += `\n\n${breweryDetail}`
        }
        
        return new Response(
          JSON.stringify({ 
            message: finalResponse,
            context: 'Brewery strategic response with details',
            breweryState: newState
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      } else if (isMuralResponse) {
        console.log('🎨 Mural response detected, checking for follow-up details')
        
        // Initialize mural conversation state if not exists
        let muralState: MuralConversationState = {
          hasMentionedLakeByllesby: true,
          hasSharedConcept: false,
          hasSharedMaterials: false,
          hasSharedExecution: false,
          hasSharedCommunity: false,
          hasSharedLink: false,
          conversationCount: 1
        }
        
        // Check if we should share additional mural details
        const { response: muralDetail, newState } = createMuralResponse(lastMessage.content, muralState)
        
        // Combine initial response with mural detail if available
        let finalResponse = formatStrategicResponse(strategicResponse)
        if (muralDetail && muralDetail !== "What kind of mural or public art project are you thinking about?") {
          finalResponse += `\n\n${muralDetail}`
        }
        
        return new Response(
          JSON.stringify({ 
            message: finalResponse,
            context: 'Mural strategic response with details',
            muralState: newState
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      } else {
        // Regular strategic response
        const formattedResponse = formatStrategicResponse(strategicResponse)
        return new Response(
          JSON.stringify({ 
            message: formattedResponse,
            context: 'Strategic response triggered'
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      }
    } else {
      console.log('📝 No strategic response found, proceeding with RAG')
    }

    // Detect project type from user message
    const detectedProjectType = detectProjectType(lastMessage.content)
    if (detectedProjectType) {
      console.log('🎯 Detected project type:', detectedProjectType)
    }

    // Get user profile status for context
    const userInfoStatus = await userProfileService.getUserInfoStatus(userId, sessionId)
    const nextInfoToCollect = await userProfileService.getNextInfoToCollect(userId, sessionId)
    const userProfile = await userProfileService.getUserProfile(userId, sessionId)
    
    console.log('👤 User info status:', userInfoStatus)
    if (nextInfoToCollect) {
      console.log('👤 Next info to collect:', nextInfoToCollect)
    }

    // Load knowledge base and search for relevant content
    const knowledgeContent = loadKnowledgeBase()
    const relevantContext = searchKnowledge(lastMessage.content, knowledgeContent)

    console.log('📚 Found relevant context length:', relevantContext.length)

    // Construct the system prompt with context
    let projectGuidance = ''
    if (detectedProjectType) {
      const projectQuestions = getProjectQuestions(detectedProjectType)
      projectGuidance = `

🎯 PROJECT DETECTED: ${detectedProjectType.toUpperCase()}
The user is asking about ${detectedProjectType}. Use these discovery questions in your response:
${projectQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Acknowledge their request naturally, then ask 1-2 of these questions. Keep it conversational and under 80 words.`
    }

    // User information collection guidance
    let userInfoGuidance = ''
    if (!userInfoStatus.isComplete) {
      const missingInfo = []
      if (!userInfoStatus.hasName) missingInfo.push('name')
      if (!userInfoStatus.hasEmail) missingInfo.push('email')  
      if (!userInfoStatus.hasPhone) missingInfo.push('phone number')
      
      userInfoGuidance = `
🎯 USER INFORMATION COLLECTION:
Missing user info: ${missingInfo.join(', ')}

IMPORTANT: Always try to collect the user's name, email, and phone number early in the conversation. Ask casually and naturally, not all at once unless it makes sense. Be polite and helpful.

${nextInfoToCollect ? `Next to collect: ${nextInfoToCollect}` : ''}

Guidelines:
- Weave requests for missing information naturally into your responses
- Don't make it feel like a form - keep it conversational
- If they're asking for help with a project, you can say something like "I'd love to help with that! What should I call you?" 
- For email: "What's your email so we can follow up with more details?"
- For phone: "What's the best number to reach you at?"
- Once you have all three pieces of information, don't ask again`
    }

    const systemPrompt = `You are the Clubhaus AI assistant. You represent a creative agency that values sharp thinking, curiosity, and clarity.

🧠 Core Tone:
- Only say "Welcome to the club" on the first message in a new conversation. Don't repeat it after that — it gets awkward.
- Speak naturally, like a helpful creative strategist
- Be short, smart, and human — not robotic or overly polished
- Show curiosity about the user's business before offering solutions
- Speak in a curious, helpful tone — especially when users are sharing info about their own projects
- Ask thoughtful follow-up questions when users mention they need help (e.g. with logos, websites, SEO)
- Keep replies concise and natural — focused more on conversation than promoting services unless prompted
- Use casual first-person phrasing like "I can help with that," "Happy to explain," etc.
- Avoid forced or gimmicky phrases like "you're part of the club" or similar themed taglines
- Use natural, conversational intros like "Hey there — how can I help?" or "What are you working on?"

🎯 Strategic Response Guidelines:
1. **Prioritize flagship projects** - After high-impact work like X Games, lead with other flagship projects (Twisted Pin, Blasted Ink, Experience Maple Grove)
2. **Connect cultural threads** - If someone mentions skateboards and tattoos, lean into that crossover: "Skateboards and tattoos go hand-in-hand"
3. **Portfolio-first approach** - Always offer specific project links over generic responses
4. **Confident, not cautious** - Don't say "tattoos are a big commitment" - say "tattoos and skateboard design go hand-in-hand"
5. **Lead with confidence** - "Definitely. After [previous project], some of our other favorites include..."

🎯 Behavioral Rules:
1. NEVER say you'll do something you can't actually do.
   - ❌ Don't say "I'll send a link" or "Let me check"
   - ✅ Instead say: "A Clubhaus team member will follow up to help with that."

2. NEVER say "I don't have that info" if it's available in the knowledge base.
   - Use the knowledge base context to provide accurate information
   - Only say you don't have info if it's truly not available

3. Only talk about Clubhaus services when asked or when clearly relevant.
   - Focus more on asking the user about their goals and style.

4. If a user mentions a logo or file:
   - Ask what file format it is
   - Offer guidance or say: "One of our team members will reach out to collect it."

5. If the user asks for contact info:
   - Provide: support@clubhausagency.com
   - Do not make up personal emails or roles unless documented

🌐 Website Help Protocol:
When a user says they need help with a website, ask first:
- What platform is it built on (WordPress, Squarespace, custom)?
- Who's hosting it?

Then ask what's not working or what they're hoping to improve.

Do NOT start by guessing the problem. This will steer you toward better discovery-style questioning and away from canned problem trees.

🧾 Writing Style:
- Replies should be max 80 words unless detail is specifically requested
- Never list more than 2 services in a single response
- End responses with questions when appropriate
- Avoid phrases like "I'm not sure" unless you clarify that you're an AI and a team member can follow up
- Strategic responses for pricing/service questions take priority over general knowledge base responses${projectGuidance}${userInfoGuidance}

KNOWLEDGE BASE CONTEXT:
${relevantContext}

Use this information to inform your responses, but speak like a sharp, curious creative strategist.`

    console.log('🤖 Building conversation messages...')
    
    // Build conversation messages with system prompt
    const conversationMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ]

    console.log('🤖 Calling Groq API with', conversationMessages.length, 'messages...')

    // Get the response using the Groq API directly
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Groq API error:', errorData)
      throw new Error(`Groq API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    let aiResponse = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    console.log('✅ Got response from Groq')

    // Check if this might be a brewery follow-up conversation
    const breweryKeywords = ['brewery', 'beer', 'brewing', 'omni', 'location', 'bear', 'mascot', 'photo', 'animation', 'interaction', 'website', 'site']
    const hasBreweryKeywords = breweryKeywords.some(keyword => lastMessage.content.toLowerCase().includes(keyword))
    
    // Check if this might be a mural follow-up conversation
    const muralKeywords = ['mural', 'public art', 'installation', 'lake byllesby', 'locus', 'ceiling', 'stain', 'wood', 'pavilion', 'river', 'water', 'architecture']
    const hasMuralKeywords = muralKeywords.some(keyword => lastMessage.content.toLowerCase().includes(keyword))
    
    if (hasBreweryKeywords) {
      console.log('🍺 Potential brewery follow-up detected')
      
      // Initialize brewery state for follow-up conversation
      const breweryState: BreweryConversationState = {
        hasMentionedOmni: true,
        hasSharedMultiLocation: false,
        hasSharedBrandPersonality: false,
        hasSharedPhotography: false,
        hasSharedMicroInteractions: false,
        hasSharedLink: false,
        conversationCount: 1
      }
      
      const { response: breweryDetail, newState } = createBreweryResponse(lastMessage.content, breweryState)
      
      // If we have a specific brewery detail to share, use it instead of the AI response
      if (breweryDetail && breweryDetail !== "What kind of brewery project are you thinking about?") {
        console.log('🍺 Using brewery-specific response')
        aiResponse = breweryDetail
      }
    } else if (hasMuralKeywords) {
      console.log('🎨 Potential mural follow-up detected')
      
      // Initialize mural state for follow-up conversation
      const muralState: MuralConversationState = {
        hasMentionedLakeByllesby: true,
        hasSharedConcept: false,
        hasSharedMaterials: false,
        hasSharedExecution: false,
        hasSharedCommunity: false,
        hasSharedLink: false,
        conversationCount: 1
      }
      
      const { response: muralDetail, newState } = createMuralResponse(lastMessage.content, muralState)
      
      // If we have a specific mural detail to share, use it instead of the AI response
      if (muralDetail && muralDetail !== "What kind of mural or public art project are you thinking about?") {
        console.log('🎨 Using mural-specific response')
        aiResponse = muralDetail
      }
    }

    // Post-response filter to prevent false promises
    const falsePromisePatterns = [
      /let me check/i,
      /i'll check/i,
      /i'll send you a link/i,
      /i'll send a link/i,
      /let me send/i,
      /i'll get back to you/i,
      /i'll follow up/i,
      /i'll look into/i,
      /i'll find/i,
      /i'll get/i
    ]

    const hasFalsePromise = falsePromisePatterns.some(pattern => pattern.test(aiResponse))
    if (hasFalsePromise) {
      console.log('🚫 Intercepted false promise, replacing with team follow-up message')
      aiResponse = "I can't do that myself, but a Clubhaus team member will follow up to help with that."
    }

    // Log the AI response
    try {
      await logger.logAIResponse(userId, aiResponse, {
        sessionId,
        projectType: detectedProjectType || 'general'
      })
    } catch (memoryError) {
      console.error('❌ Failed to log AI response:', memoryError)
      // Don't fail the request if logging fails
    }

    // Return the response
    return new Response(
      JSON.stringify({ 
        message: aiResponse,
        context: relevantContext.substring(0, 200) + '...'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Chat API error:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    // Handle specific error types
    if (error.message?.includes('API key') || error.message?.includes('401')) {
      return new Response(
        JSON.stringify({ error: 'API configuration error. Please check your GROQ_API_KEY.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 