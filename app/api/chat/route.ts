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
import TokenUsageService from '../../../lib/tokenUsageService'

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
  
  // If no relevant sections found, return a small subset instead of the entire knowledge base
  if (relevantSections.length === 0) {
    console.log('⚠️  No relevant sections found, returning core info only')
    // Return just the basic info sections to reduce token usage
    const coreSections = sections.filter(section => {
      const heading = section.match(/^#+\s*(.+)/m)?.[1]?.toLowerCase() || ''
      return heading.includes('what is clubhaus') || 
             heading.includes('our services') || 
             heading.includes('contact info')
    })
    return coreSections.slice(0, 2).join('\n\n---\n\n')
  }
  
  const result = relevantSections.slice(0, 2).join('\n\n---\n\n') // Reduced from 3 to 2 sections
  console.log('📝 Returning', relevantSections.length, 'relevant sections')
  return result
}

import { callGroqWithRetry, getRateLimitErrorMessage } from '../../../lib/groqRetry'

export async function POST(req: Request) {
  const startTime = Date.now()
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Declare these variables outside try block so they're available in catch
  let userId = 'anonymous'
  let sessionId = `session_${Date.now()}`
  
  try {
    // Set a timeout for the entire request to prevent hanging
    const requestTimeout = setTimeout(() => {
      throw new Error('Request timeout after 25 seconds')
    }, 25000)

    console.log(`🔍 Chat API called [${requestId}]`)
    console.log('🔑 GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY)
    console.log('🔑 GROQ_API_KEY starts with:', process.env.GROQ_API_KEY?.substring(0, 10))
    
    // Parse the request body
    const { messages, sessionId: providedSessionId } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log('❌ No messages provided')
      return new Response(
        JSON.stringify({ 
          error: 'Messages array is required',
          debug: { requestId, errorType: 'VALIDATION_ERROR' }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the last user message for context retrieval
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') {
      console.log('❌ Last message is not from user')
      return new Response(
        JSON.stringify({ 
          error: 'Last message must be from user',
          debug: { requestId, errorType: 'VALIDATION_ERROR' }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📝 User message:', lastMessage.content)

    // Initialize simple logger for chat logging
    const logger = SimpleLogger.getInstance()
    const userProfileService = UserProfileService.getInstance()
    const tokenUsageService = TokenUsageService.getInstance()
    
    // Initialize token usage service (this will test connection and migrate data if needed)
    await tokenUsageService.initialize()
    userId = 'anonymous' // In a real app, this would come from authentication
    sessionId = providedSessionId || `session_${Date.now()}`
    
    // Extract user information from the message - but be more conservative about names
    const extractedInfo = userProfileService.extractUserInfoFromMessage(lastMessage.content)
    
    // Only update profile if we have valid info AND it's not just a question word
    if (Object.keys(extractedInfo).length > 0) {
      // Additional validation for names - only accept if it's clearly a name
      if (extractedInfo.name) {
        const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which']
        const isQuestionWord = questionWords.includes(extractedInfo.name.toLowerCase())
        
        if (isQuestionWord) {
          console.log('❌ Rejected name extraction - appears to be a question word:', extractedInfo.name)
          delete extractedInfo.name
        }
      }
      
      if (Object.keys(extractedInfo).length > 0) {
        console.log('👤 Extracted user info:', extractedInfo)
        await userProfileService.updateUserProfile(userId, sessionId, extractedInfo)
      }
    }
    
    // Log the user message
    try {
      await logger.logUserMessage(userId, lastMessage.content, {
        sessionId,
        extractedProfile: Object.keys(extractedInfo).length > 0 ? extractedInfo : undefined,
        requestId
      })
    } catch (logError) {
      console.error('❌ Failed to log user message:', logError)
      // Don't fail the request if logging fails
    }

    // Check for project triggers first
    const projectTrigger = checkProjectTriggers(lastMessage.content)
    if (projectTrigger) {
      console.log('🎯 Found project trigger for:', projectTrigger.name)
      
      // Ensure minimum 1-second delay for strategizing bubble
      const currentTime = Date.now()
      const elapsedTime = currentTime - startTime
      const minimumDelayMs = 1000 // 1 second
      
      if (elapsedTime < minimumDelayMs) {
        const remainingDelay = minimumDelayMs - elapsedTime
        console.log(`⏳ Adding ${remainingDelay}ms delay to ensure minimum 1-second strategizing time`)
        await new Promise(resolve => setTimeout(resolve, remainingDelay))
      }
      
      return new Response(
        JSON.stringify({ 
          message: projectTrigger.response.text,
          context: `Project trigger: ${projectTrigger.name}`,
          projectTrigger: projectTrigger,
          debug: { requestId, responseType: 'PROJECT_TRIGGER', responseTime: Date.now() - startTime }
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
        
        // Ensure minimum 1-second delay for strategizing bubble
        const currentTime = Date.now()
        const elapsedTime = currentTime - startTime
        const minimumDelayMs = 1000 // 1 second
        
        if (elapsedTime < minimumDelayMs) {
          const remainingDelay = minimumDelayMs - elapsedTime
          console.log(`⏳ Adding ${remainingDelay}ms delay to ensure minimum 1-second strategizing time`)
          await new Promise(resolve => setTimeout(resolve, remainingDelay))
        }
        
        return new Response(
          JSON.stringify({ 
            message: finalResponse,
            context: 'Brewery strategic response with details',
            breweryState: newState,
            debug: { requestId, responseType: 'STRATEGIC_BREWERY', responseTime: Date.now() - startTime }
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
        
        // Ensure minimum 1-second delay for strategizing bubble
        const currentTime = Date.now()
        const elapsedTime = currentTime - startTime
        const minimumDelayMs = 1000 // 1 second
        
        if (elapsedTime < minimumDelayMs) {
          const remainingDelay = minimumDelayMs - elapsedTime
          console.log(`⏳ Adding ${remainingDelay}ms delay to ensure minimum 1-second strategizing time`)
          await new Promise(resolve => setTimeout(resolve, remainingDelay))
        }
        
        return new Response(
          JSON.stringify({ 
            message: finalResponse,
            context: 'Mural strategic response with details',
            muralState: newState,
            debug: { requestId, responseType: 'STRATEGIC_MURAL', responseTime: Date.now() - startTime }
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      } else {
        // Regular strategic response
        const formattedResponse = formatStrategicResponse(strategicResponse)
        
        // Ensure minimum 1-second delay for strategizing bubble
        const currentTime = Date.now()
        const elapsedTime = currentTime - startTime
        const minimumDelayMs = 1000 // 1 second
        
        if (elapsedTime < minimumDelayMs) {
          const remainingDelay = minimumDelayMs - elapsedTime
          console.log(`⏳ Adding ${remainingDelay}ms delay to ensure minimum 1-second strategizing time`)
          await new Promise(resolve => setTimeout(resolve, remainingDelay))
        }
        
        return new Response(
          JSON.stringify({ 
            message: formattedResponse,
            context: 'Strategic response triggered',
            debug: { requestId, responseType: 'STRATEGIC', responseTime: Date.now() - startTime }
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
      
      // Check if this is a new conversation (first or second message)
      const isNewConversation = messages.length <= 2
      const shouldAskForContact = messages.length >= 4 && !userInfoStatus.isComplete
      
      // Detect if user is being brief/short in responses or giving vague answers
      const userIsBrief = (lastMessage.content.length < 20 && !lastMessage.content.includes('?')) || 
                         ['im not sure', 'i dont know', 'not sure', 'idk', 'dunno', 'maybe', 'i guess'].some(phrase => 
                           lastMessage.content.toLowerCase().includes(phrase))
      const shouldOfferHuman = userIsBrief && messages.length >= 3
      
      console.log('👤 User brief detection:', { 
        messageLength: lastMessage.content.length, 
        hasQuestion: lastMessage.content.includes('?'), 
        userIsBrief, 
        messageCount: messages.length, 
        shouldOfferHuman 
      })
      
      userInfoGuidance = `
🎯 USER INFORMATION COLLECTION:
Missing user info: ${missingInfo.join(', ')}

IMPORTANT: Ask for contact information by the 4th-5th message exchange. Keep responses concise and let the user do most of the talking.

${shouldAskForContact ? '🚨 CONTACT TIME: Ask for name and email in this response. This is message #' + messages.length + ' - time to collect contact info.' : ''}
${shouldOfferHuman ? '🚨 BRIEF USER DETECTED: User is being brief/vague. STOP asking questions and immediately ask: "Can I get your info for the report?"' : ''}
${nextInfoToCollect ? `Next to collect: ${nextInfoToCollect}` : ''}

Guidelines:
- Keep responses short and focused - don't be verbose
- Let the user explain their needs - don't guess or answer for them
- Ask simple, direct questions - don't make assumptions
- If user is brief/vague after 2-3 exchanges, immediately ask: "Can I get your info for the report?"
- Ask for name: "Can I get a name to put on the report I'll provide to the rest of the team?"
- Ask for email: "What's your email so we can send you more details?"
- Ask for phone: "What's the best number to reach you at?"
- Be concise and direct - avoid long explanations
- Once you have all three pieces of information, don't ask again
- If user is vague, ask simple follow-up questions instead of guessing`
    }

    const systemPrompt = `You are the Clubhaus AI assistant. You represent a creative agency that values sharp thinking, curiosity, and clarity.

🧠 Core Tone:
- Only say "Welcome to the club" on the first message in a new conversation. Don't repeat it after that — it gets awkward.
- Speak naturally, like a helpful creative strategist
- Be short, smart, and human — not robotic or overly polished
- Keep responses concise and focused - avoid being verbose
- Let the user do most of the talking - don't guess or answer for them
- Ask simple, direct questions rather than making assumptions
- When users are vague or say "I'm not sure", ask for contact info instead of more questions
- Show curiosity about the user's business before offering solutions
- Speak in a curious, helpful tone — especially when users are sharing info about their own projects
- Ask thoughtful follow-up questions when users mention they need help (e.g. with logos, websites, SEO)
- Keep replies concise and natural — focused more on conversation than promoting services unless prompted
- Use casual first-person phrasing like "I can help with that," "Happy to explain," etc.
- Avoid forced or gimmicky phrases like "you're part of the club" or similar themed taglines
- Use natural, conversational intros like "Hey there — how can I help?" or "What are you working on?"
- Establish value and understand needs before asking for contact information
- Stay relevant to what the user is actually asking about - don't bring up unrelated topics
- If user is brief/vague after 2-3 exchanges, STOP asking questions and offer to connect with a human strategist
- Focus on collecting information, not making suggestions or recommendations

🎯 Strategic Response Guidelines:
1. **Prioritize flagship projects** - After high-impact work like X Games, lead with other flagship projects (Twisted Pin, Blasted Ink, Experience Maple Grove)
2. **Connect cultural threads** - ONLY if someone explicitly mentions skateboards AND tattoos together, then lean into that crossover: "Skateboards and tattoos go hand-in-hand"
3. **Portfolio-first approach** - Always offer specific project links over generic responses
4. **Confident, not cautious** - Don't say "tattoos are a big commitment" - say "tattoos and skateboard design go hand-in-hand" ONLY when both are mentioned
5. **Lead with confidence** - "Definitely. After [previous project], some of our other favorites include..."
6. **Stay relevant** - Don't mention skateboards or tattoos unless the user brings them up first
7. **Accurate client categorization** - NEVER misclassify clients. Experience Maple Grove is a DMO (Destination Marketing Organization), not a park. Always use the exact client type from the knowledge base.

🎯 Behavioral Rules:
1. NEVER say you'll do something you can't actually do.
   - ❌ Don't say "I'll send a link" or "Let me check"
   - ✅ Instead say: "A Clubhaus team member will follow up to help with that."

2. NEVER say "I don't have that info" if it's available in the knowledge base.
   - Use the knowledge base context to provide accurate information
   - Only say you don't have info if it's truly not available

3. NEVER make suggestions or recommendations about what the user should do.
   - ❌ Don't suggest platforms, tools, or solutions
   - ❌ Don't recommend specific approaches or technologies
   - ✅ Focus on collecting information about their circumstances and needs
   - ✅ Ask questions to understand their situation, don't propose solutions

4. Only talk about Clubhaus services when asked or when clearly relevant.
   - Focus more on asking the user about their goals and style.

5. If a user mentions a logo or file:
   - Ask what file format it is
   - Offer guidance or say: "One of our team members will reach out to collect it."

6. If the user asks for contact info:
   - Provide: support@clubhausagency.com
   - Do not make up personal emails or roles unless documented

🌐 Website Help Protocol:
When a user says they need help with a website, ask first:
- What's not working or what are you hoping to improve?
- What's the main goal for the site?

Focus on understanding their needs and goals rather than technical implementation details.

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
    // Limit conversation history to prevent token overflow
    const maxHistoryMessages = 6 // Keep only last 6 messages (3 exchanges)
    const limitedMessages = messages.slice(-maxHistoryMessages)
    
    const conversationMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...limitedMessages.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ]

    console.log('🤖 Calling Groq API with', conversationMessages.length, 'messages...')

    // Get the response using the Groq API with retry mechanism
    const { data, responseTime: groqResponseTime } = await callGroqWithRetry(
      conversationMessages,
      requestId,
      startTime
    )
    
    let aiResponse = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    console.log('✅ Got response from Groq')

    // Log token usage (estimate tokens since Groq API doesn't provide usage in response)
    try {
      const estimatedPromptTokens = conversationMessages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0)
      const estimatedCompletionTokens = Math.ceil(aiResponse.length / 4)
      const totalEstimatedTokens = estimatedPromptTokens + estimatedCompletionTokens

      await tokenUsageService.logTokenUsage(
        userId,
        sessionId,
        'llama-3.1-8b-instant',
        totalEstimatedTokens,
        'total',
        {
          estimatedPromptTokens,
          estimatedCompletionTokens,
          maxTokensLimit: 500,
          responseLength: aiResponse.length,
          requestId
        }
      )

      console.log(`📊 Estimated token usage: ${totalEstimatedTokens} total (${estimatedPromptTokens} prompt + ${estimatedCompletionTokens} completion)`)
    } catch (tokenError) {
      console.error('❌ Failed to log token usage:', tokenError)
      // Don't fail the request if token logging fails
    }

    // Check if this might be a brewery follow-up conversation
    const breweryKeywords = ['brewery', 'beer', 'brewing', 'omni', 'bear', 'mascot', 'photo', 'animation', 'interaction']
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
        projectType: detectedProjectType || 'general',
        requestId,
        responseTime: Date.now() - startTime
      })
    } catch (memoryError) {
      console.error('❌ Failed to log AI response:', memoryError)
      // Don't fail the request if logging fails
    }

    // Ensure minimum 1-second delay for strategizing bubble
    const currentTime = Date.now()
    const elapsedTime = currentTime - startTime
    const minimumDelayMs = 1000 // 1 second
    
    if (elapsedTime < minimumDelayMs) {
      const remainingDelay = minimumDelayMs - elapsedTime
      console.log(`⏳ Adding ${remainingDelay}ms delay to ensure minimum 1-second strategizing time`)
      await new Promise(resolve => setTimeout(resolve, remainingDelay))
    }

    const finalResponseTime = Date.now() - startTime

    // Return the response
        // Clear the timeout since request completed successfully
    clearTimeout(requestTimeout)
    
    return new Response(
      JSON.stringify({
        message: aiResponse,
        context: relevantContext.substring(0, 200) + '...',
        debug: { 
          requestId, 
          responseType: 'AI_RESPONSE',
          responseTime: finalResponseTime,
          groqResponseTime
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error('❌ Chat API error:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      requestId,
      totalTime
    })
    
    // Enhanced error response with debugging info
    const errorResponse = {
      error: 'An error occurred while processing your request. Please try again.',
      debug: {
        requestId,
        errorType: 'GENERAL_ERROR',
        errorMessage: error.message,
        errorName: error.name,
        totalTime,
        timestamp: new Date().toISOString()
      }
    }
    
    // Handle specific error types
    if (error.message?.includes('API key') || error.message?.includes('401')) {
      errorResponse.error = 'API configuration error. Please check your GROQ_API_KEY.'
      errorResponse.debug.errorType = 'API_CONFIG_ERROR'
    } else if (error.message?.includes('rate limit') || error.message?.includes('throttle') || error.message?.includes('429') || 
               error.message?.includes('quota exceeded') || error.message?.includes('too many requests')) {
      errorResponse.error = getRateLimitErrorMessage(error)
      errorResponse.debug.errorType = 'RATE_LIMIT_ERROR'
    } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
      errorResponse.error = 'Network error. Please check your connection and try again.'
      errorResponse.debug.errorType = 'NETWORK_ERROR'
    } else if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      errorResponse.error = 'Request timed out. Please try again.'
      errorResponse.debug.errorType = 'TIMEOUT_ERROR'
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('ETIMEDOUT')) {
      errorResponse.error = 'Connection timed out. Please try again.'
      errorResponse.debug.errorType = 'CONNECTION_TIMEOUT'
    }

    // Log the error response to chat logs - this is CRITICAL for debugging!
    try {
      const logger = SimpleLogger.getInstance()
      
      // Log the user-facing error message that gets sent to the frontend
      await logger.logAIResponse(userId, errorResponse.error, {
        sessionId,
        requestId,
        responseTime: totalTime,
        isError: true,
        errorType: errorResponse.debug.errorType,
        platform: 'chat_ui',
        type: 'error_response'
      })

      // ALSO log what the frontend actually shows to the user (different from server error)
      const frontendErrorMessage = 'Sorry, I encountered an error. Please try again.'
      await logger.logAIResponse(userId, frontendErrorMessage, {
        sessionId,
        requestId,
        responseTime: totalTime,
        isError: true,
        isFrontendMessage: true,
        errorType: errorResponse.debug.errorType,
        platform: 'chat_ui',
        type: 'frontend_error_display',
        note: 'This is what the user actually sees in the chat interface'
      })

      // ALSO log the detailed debug information as a separate entry for developers
      const debugLogMessage = `🚨 ERROR DEBUG INFO:
- Request ID: ${requestId}
- Error Type: ${errorResponse.debug.errorType}  
- Error Message: ${errorResponse.debug.errorMessage}
- Error Name: ${errorResponse.debug.errorName}
- Total Time: ${totalTime}ms
- Timestamp: ${errorResponse.debug.timestamp}
- Stack: ${error.stack?.substring(0, 500) || 'No stack trace'}`

      await logger.logAIResponse(userId, debugLogMessage, {
        sessionId,
        requestId,
        responseTime: totalTime,
        isError: true,
        isDebugInfo: true,
        errorType: errorResponse.debug.errorType,
        platform: 'chat_ui',
        type: 'error_debug'
      })

      console.log('📝 ✅ Logged 3 error entries to chat logs: server error, frontend display, and debug info')
    } catch (logError) {
      console.error('❌ Failed to log error to chat logs:', logError)
      // Don't fail the request if error logging fails
    }

    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 