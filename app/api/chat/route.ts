import { createGroq } from '@ai-sdk/groq'
import fs from 'fs'
import path from 'path'
import { detectProjectType, getProjectQuestions } from '../../../lib/projectPatterns'
import { findStrategicResponse, formatStrategicResponse, getConversationState } from '../../../lib/responses'
import { createBreweryResponse, BreweryConversationState } from '../../../lib/breweryHandler'
import { createMuralResponse, MuralConversationState } from '../../../lib/muralHandler'
import { checkProjectTriggers } from '../../../lib/projectHandler'
import SimpleLogger from '../../../lib/simpleLogger'
import UserProfileService from '../../../lib/userProfileService'
import TokenUsageService from '../../../lib/tokenUsageService'
import { projectService } from '../../../lib/rfpService'
import { callGroqWithRetry, getRateLimitErrorMessage } from '../../../lib/groqRetry'
// Personality phrases disabled - removed gambling/casino references
// import { getContextualPersonalityPhrase } from '../../../lib/personalityPhrases'

// Create Groq provider instance
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Cached knowledge base for instant access
let cachedKnowledgeBase: string | null = null

// Load knowledge base directly with caching
function loadKnowledgeBase() {
  if (cachedKnowledgeBase !== null) {
    return cachedKnowledgeBase
  }
  
  try {
    const knowledgeFilePath = path.join(process.cwd(), 'data', 'clubhaus-knowledge.md')
    const markdownContent = fs.readFileSync(knowledgeFilePath, 'utf-8')
    cachedKnowledgeBase = markdownContent
    console.log('📖 Loaded and cached knowledge base, length:', markdownContent.length)
    return markdownContent
  } catch (error) {
    console.error('❌ Failed to load knowledge base:', error)
    cachedKnowledgeBase = ''
    return ''
  }
}

// Simple text search function
function searchKnowledge(query: string, knowledgeContent: string, conversationContext?: string): string {
  const queryLower = query.toLowerCase()
  const sections = knowledgeContent.split(/(?=^##[^#])/gm)
  const relevantSections: string[] = []
  
  console.log('🔍 Searching for query:', query)
  console.log('📚 Found', sections.length, 'sections')
  
  // Keywords that should boost relevance
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2)
  const boostKeywords = ['hours', 'operating', 'schedule', 'time', 'open', 'close', 'access']
  
  // Keywords that indicate business/marketing context (should prioritize these)
  const businessKeywords = ['marketing', 'advertising', 'campaign', 'budget', 'leads', 'sales', 'business', 'service', 'client', 'project', 'strategy', 'social media', 'facebook', 'ads', 'website', 'websites', 'web design', 'web development', 'build websites', 'conversion']
  
  // Keywords that indicate case study context (should deprioritize these unless specifically asked)
  const caseStudyKeywords = ['mural', 'locus', 'architecture', 'lake byllesby', 'brewery', 'omni', 'twisted pin', 'blasted ink', 'x games', 'skateboard']
  
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
    
    // Boost score for business/marketing keywords
    for (const keyword of businessKeywords) {
      if (queryLower.includes(keyword) && sectionLower.includes(keyword)) {
        score += 100 // High boost for business context
      }
    }
    
    // MASSIVE boost for website queries matching web design section
    if ((queryLower.includes('website') || queryLower.includes('build website') || queryLower.includes('web design')) && 
        (sectionLower.includes('web design') || sectionLower.includes('website') || heading.includes('services'))) {
      score += 500 // Maximum boost to ensure correct section is returned
    }
    
    // Deprioritize case study content unless specifically asked
    const hasCaseStudyKeywords = caseStudyKeywords.some(keyword => 
      queryLower.includes(keyword) || sectionLower.includes(keyword)
    )
    const isCaseStudySection = caseStudyKeywords.some(keyword => 
      sectionLower.includes(keyword)
    )
    
    // If this is a case study section but user didn't ask for examples, reduce score
    if (isCaseStudySection && !hasCaseStudyKeywords) {
      score = score * 0.1 // Severely reduce score for case studies unless specifically requested
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
    
    // If conversation context indicates business discussion, prioritize business sections
    if (conversationContext && conversationContext.toLowerCase().includes('business')) {
      const isBusinessSection = businessKeywords.some(keyword => sectionLower.includes(keyword))
      if (isBusinessSection) {
        score += 200 // Very high boost for business sections in business context
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
  
  // Return knowledge base context without truncation
  const result = relevantSections.slice(0, 2).join('\n\n---\n\n') // Return up to 2 sections
  console.log('📝 Returning', relevantSections.length, 'relevant sections')
  return result
}

// Helper function to calculate response delay - DISABLED for instant responses
function calculateResponseDelay(botMessageCount: number, elapsedTime: number): number {
  // NO DELAY - return 0 for instant responses
  return 0
}

// Helper function to detect conversation tone
function detectConversationTone(userMessage: string, botMessageCount: number): 'casual' | 'formal' | 'serious' | 'fun' {
  const messageLower = userMessage.toLowerCase();
  
  // Check for serious/formal indicators
  const seriousKeywords = ['error', 'bug', 'problem', 'issue', 'complaint', 'refund', 'cancel', 'wrong', 'broken', 'doesn\'t work', 'not working', 'failed', 'disappointed', 'unhappy', 'urgent', 'emergency', 'critical'];
  const hasSeriousContent = seriousKeywords.some(keyword => messageLower.includes(keyword));
  
  if (hasSeriousContent) {
    return 'serious';
  }
  
  // Check for formal indicators
  const formalKeywords = ['sir', 'madam', 'please', 'kindly', 'would you', 'could you', 'thank you', 'appreciate', 'regards', 'best regards'];
  const hasFormalContent = formalKeywords.some(keyword => messageLower.includes(keyword));
  
  if (hasFormalContent) {
    return 'formal';
  }
  
  // Check for fun indicators
  const funKeywords = ['haha', 'lol', 'jk', 'just kidding', 'sarcasm', 'sarcastic', 'joking', 'not really', 'kidding', '😊', '😄', '😂', '😉', '😎', '🎉', '🎊', '🎯', '🔥', '💯', '✨'];
  const hasFunContent = funKeywords.some(keyword => messageLower.includes(keyword));
  
  if (hasFunContent) {
    return 'fun';
  }
  
  // Default to casual
  return 'casual';
}

// Helper function to determine response type
function determineResponseType(botMessageCount: number, userMessage: string, isStrategicResponse: boolean): 'intro' | 'confirmation' | 'follow-up' | 'sign-off' | 'general' {
  // First message in conversation
  if (botMessageCount === 0) {
    return 'intro';
  }
  
  // Check for sign-off indicators
  const signOffKeywords = ['thanks', 'thank you', 'that\'s all', 'i\'m good', 'i\'m done', 'that\'s it', 'got it', 'perfect', 'great', 'awesome', 'sounds good'];
  const isSignOff = signOffKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
  
  if (isSignOff) {
    return 'sign-off';
  }
  
  // Check for confirmation indicators
  const confirmationKeywords = ['yes', 'yeah', 'sure', 'okay', 'ok', 'definitely', 'absolutely', 'interested', 'like to', 'want to', 'sounds good', 'perfect'];
  const isConfirmation = confirmationKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
  
  if (isConfirmation) {
    return 'confirmation';
  }
  
  // Check for follow-up indicators (asking questions)
  const followUpKeywords = ['what', 'how', 'when', 'where', 'why', 'which', '?'];
  const isFollowUp = followUpKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
  
  if (isFollowUp) {
    return 'follow-up';
  }
  
  // Default to general
  return 'general';
}

export async function POST(req: Request) {
  const startTime = Date.now()
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Declare these variables outside try block so they're available in catch
  let userId = 'anonymous'
  let sessionId = `session_${Date.now()}`
  
  try {
    // Set a timeout for the entire request to prevent hanging
    const requestTimeout = setTimeout(() => {
      console.error('⏰ Request timeout after 25 seconds')
      // Don't throw error, just log it
    }, 25000)

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

    // Count bot messages in conversation to trigger contact capture and RFP pivot
    const botMessageCount = messages.filter(msg => msg.role === 'assistant').length
    const isThirdBotMessage = botMessageCount === 2 // This will be the 3rd bot message
    const isSeventhMessage = botMessageCount === 6 // This will be the 7th bot message
    
    console.log('🤖 Bot message count:', botMessageCount, 'Is 3rd message:', isThirdBotMessage, 'Is 7th message:', isSeventhMessage)

    // Initialize simple logger for chat logging
    const logger = SimpleLogger.getInstance()
    const userProfileService = UserProfileService.getInstance()
    const tokenUsageService = TokenUsageService.getInstance()
    
    // Initialize token usage service in background (non-blocking)
    tokenUsageService.initialize().catch(error => {
      console.error('❌ Token usage service initialization failed (non-blocking):', error)
    })
    
    userId = 'anonymous' // In a real app, this would come from authentication
    sessionId = providedSessionId || `session_${Date.now()}`
    
    // Extract user information from the message - but be more conservative about names
    const extractedInfo = userProfileService.extractUserInfoFromMessage(lastMessage.content)
    
    // Additional validation for names - only accept if it's clearly a name
    if (Object.keys(extractedInfo).length > 0) {
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
      }
    }
    
    // CRITICAL: PRIORITY 1 - Check for meeting/help requests that require contact info collection FIRST
    const meetingKeywords = ['meeting', 'meet', 'talk', 'call', 'schedule', 'appointment', 'consultation', 'help', 'need help', 'want to work', 'work with you', 'hire you', 'get started', 'begin', 'start project']
    const hasMeetingIntent = meetingKeywords.some(keyword => 
      lastMessage.content.toLowerCase().includes(keyword)
    )
    
    // Check if user is expressing interest in working with us
    const interestKeywords = ['yeah', 'yes', 'sure', 'okay', 'ok', 'definitely', 'absolutely', 'interested', 'like to', 'want to']
    const hasInterest = interestKeywords.some(keyword => 
      lastMessage.content.toLowerCase().includes(keyword)
    )
    
    // Check if this is likely a response to a service question
    const isLikelyServiceResponse = hasInterest && (
      lastMessage.content.toLowerCase().includes('meeting') ||
      lastMessage.content.toLowerCase().includes('help') ||
      lastMessage.content.toLowerCase().includes('work') ||
      lastMessage.content.toLowerCase().includes('you guys') ||
      lastMessage.content.toLowerCase().includes('team')
    )
    
    // PRIORITY 1: Contact collection when user expresses interest in working with us
    if (hasMeetingIntent || isLikelyServiceResponse) {
      console.log('🎯 Meeting/help request detected - checking contact info status')
      
      // Get current user profile to see what contact info we have
      const currentUserProfile = await userProfileService.getUserProfile(userId, sessionId)
      const userInfoStatus = await userProfileService.getUserInfoStatus(userId, sessionId)
      
      console.log('👤 Current contact info status:', userInfoStatus)
      
      // If we don't have complete contact info, collect it systematically
      if (!userInfoStatus.isComplete) {
        const missingInfo = []
        if (!userInfoStatus.hasName) missingInfo.push('name')
        if (!userInfoStatus.hasEmail) missingInfo.push('email')
        if (!userInfoStatus.hasPhone) missingInfo.push('phone')
        
        console.log('📝 Missing contact info:', missingInfo)
        
        // Start with name if we don't have it
        if (!userInfoStatus.hasName) {
          const contactCaptureMessage = "Great! I'd love to help get that set up. What's your name?"
          
          // Log the contact capture response
          logger.logAIResponse(userId, contactCaptureMessage, {
            sessionId,
            projectType: 'contact_capture',
            requestId,
            responseTime: Date.now() - startTime,
            isContactCapture: true,
            missingInfo: missingInfo
          }).catch(logError => {
            console.error('❌ Failed to log contact capture message:', logError)
          })

          return new Response(
            JSON.stringify({ 
              message: contactCaptureMessage,
              context: 'Contact capture - asking for name',
              debug: { requestId, responseType: 'CONTACT_CAPTURE_NAME', responseTime: Date.now() - startTime }
            }),
            { 
              status: 200, 
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        }
        
        // If we have name but missing email
        if (userInfoStatus.hasName && !userInfoStatus.hasEmail) {
          const contactCaptureMessage = "Thanks! What's your email address?"
          
          logger.logAIResponse(userId, contactCaptureMessage, {
            sessionId,
            projectType: 'contact_capture',
            requestId,
            responseTime: Date.now() - startTime,
            isContactCapture: true,
            missingInfo: missingInfo
          }).catch(logError => {
            console.error('❌ Failed to log contact capture message:', logError)
          })

          return new Response(
            JSON.stringify({ 
              message: contactCaptureMessage,
              context: 'Contact capture - asking for email',
              debug: { requestId, responseType: 'CONTACT_CAPTURE_EMAIL', responseTime: Date.now() - startTime }
            }),
            { 
              status: 200, 
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        }
        
        // If we have name and email but missing phone
        if (userInfoStatus.hasName && userInfoStatus.hasEmail && !userInfoStatus.hasPhone) {
          const contactCaptureMessage = "Perfect! And what's your phone number?"
          
          logger.logAIResponse(userId, contactCaptureMessage, {
            sessionId,
            projectType: 'contact_capture',
            requestId,
            responseTime: Date.now() - startTime,
            isContactCapture: true,
            missingInfo: missingInfo
          }).catch(logError => {
            console.error('❌ Failed to log contact capture message:', logError)
          })

          return new Response(
            JSON.stringify({ 
              message: contactCaptureMessage,
              context: 'Contact capture - asking for phone',
              debug: { requestId, responseType: 'CONTACT_CAPTURE_PHONE', responseTime: Date.now() - startTime }
            }),
            { 
              status: 200, 
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        }
      }
      
      // If we have complete contact info, proceed with meeting setup
      if (userInfoStatus.isComplete) {
        const meetingSetupMessage = "Perfect! I'll pass this along and someone from our team will reach out to schedule a time that works for you."
        
        logger.logAIResponse(userId, meetingSetupMessage, {
          sessionId,
          projectType: 'meeting_setup',
          requestId,
          responseTime: Date.now() - startTime,
          isMeetingSetup: true
        }).catch(logError => {
          console.error('❌ Failed to log meeting setup message:', logError)
        })

        return new Response(
          JSON.stringify({ 
            message: meetingSetupMessage,
            context: 'Meeting setup with complete contact info',
            debug: { requestId, responseType: 'MEETING_SETUP', responseTime: Date.now() - startTime }
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      }
    }
    
    // PRIORITY 2: Check if user just provided contact info and we need to continue the collection flow
    const hasProvidedContactInfo = extractedInfo.name || extractedInfo.email || extractedInfo.phone
    if (hasProvidedContactInfo) {
      console.log('📝 User provided contact info:', extractedInfo)
      
      // Update user profile FIRST and wait for it to complete
      await userProfileService.updateUserProfile(userId, sessionId, extractedInfo)
      
      // Get updated user profile after extraction
      const updatedUserProfile = await userProfileService.getUserProfile(userId, sessionId)
      const updatedUserInfoStatus = await userProfileService.getUserInfoStatus(userId, sessionId)
      
      console.log('👤 Updated contact info status:', updatedUserInfoStatus)
      
      // If user provided email, acknowledge it and ask for next missing piece
      if (extractedInfo.email) {
        console.log('📧 User provided email:', extractedInfo.email)
        
        // Check what's still missing
        if (!updatedUserInfoStatus.hasPhone) {
          const nextContactMessage = "Perfect! And what's your phone number?"
          
          logger.logAIResponse(userId, nextContactMessage, {
            sessionId,
            projectType: 'contact_capture',
            requestId,
            responseTime: Date.now() - startTime,
            isContactCapture: true,
            providedInfo: extractedInfo
          }).catch(logError => {
            console.error('❌ Failed to log contact capture message:', logError)
          })

          return new Response(
            JSON.stringify({ 
              message: nextContactMessage,
              context: 'Contact capture - asking for phone after email',
              debug: { requestId, responseType: 'CONTACT_CAPTURE_PHONE_FOLLOWUP', responseTime: Date.now() - startTime }
            }),
            { 
              status: 200, 
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        } else {
          // All contact info collected
          const completionMessage = "Perfect! I have all the information I need. I'll pass this along and someone from our team will reach out to schedule a time that works for you."
          
          logger.logAIResponse(userId, completionMessage, {
            sessionId,
            projectType: 'contact_capture_complete',
            requestId,
            responseTime: Date.now() - startTime,
            isContactCaptureComplete: true,
            providedInfo: extractedInfo
          }).catch(logError => {
            console.error('❌ Failed to log contact capture completion message:', logError)
          })

          return new Response(
            JSON.stringify({ 
              message: completionMessage,
              context: 'Contact capture complete',
              debug: { requestId, responseType: 'CONTACT_CAPTURE_COMPLETE', responseTime: Date.now() - startTime }
            }),
            { 
              status: 200, 
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        }
      }
      
      // If user provided name, ask for email
      if (extractedInfo.name && !updatedUserInfoStatus.hasEmail) {
        const nextContactMessage = "Thanks! What's your email address?"
        
        logger.logAIResponse(userId, nextContactMessage, {
          sessionId,
          projectType: 'contact_capture',
          requestId,
          responseTime: Date.now() - startTime,
          isContactCapture: true,
          providedInfo: extractedInfo
        }).catch(logError => {
          console.error('❌ Failed to log contact capture message:', logError)
        })

        return new Response(
          JSON.stringify({ 
            message: nextContactMessage,
            context: 'Contact capture - asking for email after name',
            debug: { requestId, responseType: 'CONTACT_CAPTURE_EMAIL_FOLLOWUP', responseTime: Date.now() - startTime }
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      }
      
      // If user provided phone, ask for email
      if (extractedInfo.phone && !updatedUserInfoStatus.hasEmail) {
        const nextContactMessage = "Thanks! What's your email address?"
        
        logger.logAIResponse(userId, nextContactMessage, {
          sessionId,
          projectType: 'contact_capture',
          requestId,
          responseTime: Date.now() - startTime,
          isContactCapture: true,
          providedInfo: extractedInfo
        }).catch(logError => {
          console.error('❌ Failed to log contact capture message:', logError)
        })

        return new Response(
          JSON.stringify({ 
            message: nextContactMessage,
            context: 'Contact capture - asking for email after phone',
            debug: { requestId, responseType: 'CONTACT_CAPTURE_EMAIL_FOLLOWUP', responseTime: Date.now() - startTime }
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      }
      
      // If we now have complete contact info, proceed with meeting setup
      if (updatedUserInfoStatus.isComplete) {
        const meetingSetupMessage = "Perfect! I'll pass this along and someone from our team will reach out to schedule a time that works for you."
        
        logger.logAIResponse(userId, meetingSetupMessage, {
          sessionId,
          projectType: 'meeting_setup',
          requestId,
          responseTime: Date.now() - startTime,
          isMeetingSetup: true,
          contactInfoComplete: true
        }).catch(logError => {
          console.error('❌ Failed to log meeting setup message:', logError)
        })

        return new Response(
          JSON.stringify({ 
            message: meetingSetupMessage,
            context: 'Meeting setup after contact info completion',
            debug: { requestId, responseType: 'MEETING_SETUP_COMPLETE', responseTime: Date.now() - startTime }
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      }
    }
    
    // Log the user message in background (non-blocking)
    logger.logUserMessage(userId, lastMessage.content, {
      sessionId,
      extractedProfile: Object.keys(extractedInfo).length > 0 ? extractedInfo : undefined,
      requestId
    }).catch(logError => {
      console.error('❌ Failed to log user message (non-blocking):', logError)
      // Log additional debug info
      console.error('❌ User message logging failed - userId:', userId, 'sessionId:', sessionId, 'message length:', lastMessage.content.length)
    })

    // Get user profile status for context (only needed for contact capture and guidance)
    // For first few messages, make this non-blocking to improve speed
    let userInfoStatus, nextInfoToCollect, userProfile
    
    if (botMessageCount >= 2) {
      // Only load user profile data when we actually need it (3rd message onwards)
      userInfoStatus = await userProfileService.getUserInfoStatus(userId, sessionId)
      nextInfoToCollect = await userProfileService.getNextInfoToCollect(userId, sessionId)
      userProfile = await userProfileService.getUserProfile(userId, sessionId)
      
      console.log('👤 User info status:', userInfoStatus)
      if (nextInfoToCollect) {
        console.log('👤 Next info to collect:', nextInfoToCollect)
      }
    } else {
      // For first 2 messages, set defaults to avoid blocking
      userInfoStatus = { isComplete: false, hasName: false, hasEmail: false, hasPhone: false }
      nextInfoToCollect = null
      userProfile = null
      console.log('⚡ Skipping user profile checks for fast first message')
    }

    // PRIORITY 3: Contact capture on 8th bot message (moved from 5th to allow much more natural conversation first)
    const isEighthBotMessage = botMessageCount === 7 // This will be the 8th bot message
    if (isEighthBotMessage) {
      console.log('🎯 8th bot message detected - considering contact capture')
      
      // Check if we already have contact info to avoid being pushy
      const hasContact = userProfile && (userProfile.email || userProfile.phone)
      
      // Check if we've already asked for contact info in this session
      const sessionLogs = await logger.getLogsBySession(sessionId)
      const hasAskedForContact = sessionLogs.some(log => 
        log.metadata?.isContactCapture || 
        log.content?.toLowerCase().includes('name and contact info') ||
        log.content?.toLowerCase().includes('what\'s your name')
      )
      
      // Only ask for contact if user has shown significant engagement and interest
      const userHasAskedQuestions = sessionLogs.some(log => 
        log.role === 'user' && log.content?.includes('?')
      )
      
      // Check if user has provided significant context (avoid asking for name if they've shared meaningful business info)
      const conversationState = getConversationState(sessionId)
      const hasSignificantIntent = conversationState?.providedContext?.hasSignificantIntent
      
      // Only ask if user seems genuinely interested and engaged
      const userIsEngaged = sessionLogs.filter(log => log.role === 'user').length >= 3
      
      if (!hasContact && !hasAskedForContact && userHasAskedQuestions && !hasSignificantIntent && userIsEngaged) {
        const contactCaptureMessage = "I'd love to have one of our strategists follow up with some specific ideas for your project. What's your name?"
        
        // Log the contact capture response in background (non-blocking)
        logger.logAIResponse(userId, contactCaptureMessage, {
          sessionId,
          projectType: 'contact_capture',
          requestId,
          responseTime: Date.now() - startTime,
          isContactCapture: true
        }).catch(logError => {
          console.error('❌ Failed to log contact capture message (non-blocking):', logError)
          // Log additional debug info
          console.error('❌ Contact capture logging failed - userId:', userId, 'sessionId:', sessionId, 'response length:', contactCaptureMessage.length)
        })

        return new Response(
          JSON.stringify({ 
            message: contactCaptureMessage,
            context: 'Contact capture on 8th message',
            debug: { requestId, responseType: 'CONTACT_CAPTURE', responseTime: Date.now() - startTime, messageNumber: 8 }
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      } else {
        console.log('👤 User already has contact info, we\'ve already asked, or user hasn\'t engaged enough yet, skipping contact capture')
      }
    }

    // RFP pivot on 10th bot message - offer to build proper RFP (moved from 7th to allow more natural conversation)
    const isTenthMessage = botMessageCount === 9 // This will be the 10th bot message
    if (isTenthMessage) {
      console.log('🎯 10th bot message detected - considering RFP pivot')
      
      // Check if we've already offered RFP in this session
      const sessionLogs = await logger.getLogsBySession(sessionId)
      const hasOfferedRFP = sessionLogs.some(log => 
        log.metadata?.isRFPPivot || 
        log.content?.toLowerCase().includes('request for proposal') ||
        log.content?.toLowerCase().includes('rfp')
      )
      
      // Check if user has given a basic project description (not already in project flow)
      const currentProjectFlow = projectService.getFlowState(sessionId)
      const hasBasicProjectDescription = lastMessage.content.length > 10 && 
        !currentProjectFlow?.isActive &&
        !lastMessage.content.toLowerCase().includes('yes') &&
        !lastMessage.content.toLowerCase().includes('no') &&
        !lastMessage.content.toLowerCase().includes('thanks') &&
        !lastMessage.content.toLowerCase().includes('thank you')
      
      // Check if project is already complete (don't re-offer)
      const isProjectComplete = currentProjectFlow && projectService.isProjectComplete(currentProjectFlow)
      
      // Check if user is being casual (avoid RFP for casual users)
      const isCasualUser = lastMessage.content.toLowerCase().includes('eh') ||
                          lastMessage.content.toLowerCase().includes('just want') ||
                          lastMessage.content.toLowerCase().includes('not really') ||
                          lastMessage.content.toLowerCase().includes('not a big') ||
                          lastMessage.content.toLowerCase().includes('haven\'t really')
      
      // Only offer RFP if user seems genuinely interested and engaged
      const userIsEngaged = sessionLogs.filter(log => log.role === 'user').length >= 4
      
      if (hasBasicProjectDescription && !hasOfferedRFP && !isCasualUser && !isProjectComplete && userIsEngaged) {
        const rfpPivotMessage = "Sounds good. If you want to get a formal proposal together later, just let me know."
        
        // Log the RFP pivot response in background (non-blocking)
        logger.logAIResponse(userId, rfpPivotMessage, {
          sessionId,
          projectType: 'rfp_pivot',
          requestId,
          responseTime: Date.now() - startTime,
          isRFPPivot: true
        }).catch(logError => {
          console.error('❌ Failed to log RFP pivot message (non-blocking):', logError)
          // Log additional debug info
          console.error('❌ RFP pivot logging failed - userId:', userId, 'sessionId:', sessionId, 'response length:', rfpPivotMessage.length)
        })

        return new Response(
          JSON.stringify({ 
            message: rfpPivotMessage,
            context: 'RFP pivot on 10th message',
            debug: { requestId, responseType: 'RFP_PIVOT', responseTime: Date.now() - startTime, messageNumber: 10 }
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      } else {
        console.log('📝 User response doesn\'t warrant RFP pivot or we\'ve already offered, continuing normal flow')
      }
    }

    // Check for strategic responses FIRST (more targeted than project triggers)
    const strategicResponse = findStrategicResponse(lastMessage.content, sessionId)
    if (strategicResponse) {
      console.log('🎯 Found strategic response for:', strategicResponse.triggers?.[0] || 'unknown')
      console.log('📝 Strategic response triggered, bypassing other checks')
      
      // Check if this is an RFP-related strategic response
      if (strategicResponse.requiresContactInfo) {
        console.log('📋 RFP flow initiated')
        
        // Extract existing information from the conversation
        const conversationHistory = messages.map(msg => msg.content);
        const existingInfo = projectService.extractExistingInfo(lastMessage.content, userProfile, conversationHistory)
        
        // Start project flow with existing information
        projectService.startProjectFlow(sessionId, existingInfo)
        
        const formattedResponse = formatStrategicResponse(strategicResponse, lastMessage.content, sessionId)
        
        return new Response(
          JSON.stringify({
            message: formattedResponse,
            context: 'RFP flow initiated',
            debug: { requestId, responseType: 'RFP_INITIATED', responseTime: Date.now() - startTime }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      // Regular strategic response
      const formattedResponse = formatStrategicResponse(strategicResponse, lastMessage.content, sessionId)
      
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

    // Check for project triggers second (after strategic responses)
    const projectTrigger = checkProjectTriggers(lastMessage.content)
    if (projectTrigger) {
      console.log('🎯 Found project trigger for:', projectTrigger.name)
      
      // Skip AI identity trigger if conversation has started
      if (projectTrigger.name === "AI Agent Introduction") {
        console.log('🔄 Skipping AI identity trigger - conversation already started')
      } else {
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
    }

    // Check for project flow
    const currentProjectFlow = projectService.getFlowState(sessionId)
    
    if (currentProjectFlow && currentProjectFlow.isActive) {
      console.log('📋 Project flow active, step:', currentProjectFlow.step)
      
      // Add user response to track repetitive behavior
      projectService.addUserResponse(sessionId, lastMessage.content)
      
      // Check if we should skip this step due to repetitive responses
      if (projectService.shouldSkipStep(sessionId)) {
        console.log('⚠️ User being repetitive, skipping to next step')
        // Force advance to next step
        switch (currentProjectFlow.step) {
          case 'contact_info':
            projectService.updateContactInfo(sessionId, { name: 'Not provided', email: 'not@provided.com', phone: '000-000-0000' })
            break
          case 'service_type':
            projectService.updateServiceType(sessionId, 'General services')
            break
          case 'timeline':
            projectService.updateTimeline(sessionId, 'Flexible timeline')
            break
          case 'budget':
            projectService.updateBudget(sessionId, 'Budget to be determined')
            break
          case 'goals':
            projectService.updateGoals(sessionId, 'General project goals')
            break
        }
        // Get updated flow state
        const updatedFlow = projectService.getFlowState(sessionId)
        if (updatedFlow) {
          currentProjectFlow.step = updatedFlow.step
        }
      }
      
      // Handle different project flow steps
      switch (currentProjectFlow.step) {
        case 'contact_info':
          // Extract contact info from user message
          const contactInfo = projectService.extractContactInfo(lastMessage.content)
          if (contactInfo) {
            projectService.updateContactInfo(sessionId, contactInfo)
            return new Response(
              JSON.stringify({
                message: "Great! What type of service or product are you requesting a proposal for?",
                context: 'Project flow - contact info collected',
                debug: { requestId, responseType: 'PROJECT_CONTACT_COLLECTED', responseTime: Date.now() - startTime }
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          } else {
            return new Response(
              JSON.stringify({
                message: "I need your name, email, and phone number to get started. Could you provide those?",
                context: 'Project flow - contact info needed',
                debug: { requestId, responseType: 'PROJECT_CONTACT_NEEDED', responseTime: Date.now() - startTime }
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }
          
        case 'service_type':
          projectService.updateServiceType(sessionId, lastMessage.content)
          
          // Check if timeline has already been provided
          if (projectService.hasInformationBeenProvided(currentProjectFlow, 'timeline')) {
            // Skip to budget if timeline is already known
            currentProjectFlow.step = 'budget'
            projectService.updateBudget(sessionId, lastMessage.content)
            return new Response(
              JSON.stringify({
                message: "Thanks! Do you already have a budget range or cap in mind?",
                context: 'Project flow - service type collected, timeline already known',
                debug: { requestId, responseType: 'PROJECT_SERVICE_COLLECTED_SKIP_TIMELINE', responseTime: Date.now() - startTime }
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }
          
          return new Response(
            JSON.stringify({
              message: "Got it. What's your ideal timeline or deadline for this project?",
              context: 'Project flow - service type collected',
              debug: { requestId, responseType: 'PROJECT_SERVICE_COLLECTED', responseTime: Date.now() - startTime }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
          
        case 'timeline':
          projectService.updateTimeline(sessionId, lastMessage.content)
          
          // Check if budget has already been provided
          if (projectService.hasInformationBeenProvided(currentProjectFlow, 'budget')) {
            // Skip to goals if budget is already known
            currentProjectFlow.step = 'goals'
            projectService.updateGoals(sessionId, lastMessage.content)
            return new Response(
              JSON.stringify({
                message: "Understood. What outcomes or goals are you hoping this project achieves? (e.g., increased sales, better UX, new product launch, rebranding)",
                context: 'Project flow - timeline collected, budget already known',
                debug: { requestId, responseType: 'PROJECT_TIMELINE_COLLECTED_SKIP_BUDGET', responseTime: Date.now() - startTime }
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }
          
          return new Response(
            JSON.stringify({
              message: "Thanks! Do you already have a budget range or cap in mind?",
              context: 'Project flow - timeline collected',
              debug: { requestId, responseType: 'PROJECT_TIMELINE_COLLECTED', responseTime: Date.now() - startTime }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
          
        case 'budget':
          projectService.updateBudget(sessionId, lastMessage.content)
          
          // Check if goals have already been provided
          if (projectService.hasInformationBeenProvided(currentProjectFlow, 'goals')) {
            // Skip to complete if goals are already known
            currentProjectFlow.step = 'complete'
            const projectData = projectService.completeProjectFlow(sessionId)
            if (projectData) {
              const summary = projectService.generateProjectSummary(projectData)
              return new Response(
                JSON.stringify({
                  message: summary,
                  context: 'Project flow - budget collected, goals already known',
                  projectData,
                  debug: { requestId, responseType: 'PROJECT_BUDGET_COLLECTED_SKIP_GOALS', responseTime: Date.now() - startTime }
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            }
          }
          
          return new Response(
            JSON.stringify({
              message: "Understood. What outcomes or goals are you hoping this project achieves? (e.g., increased sales, better UX, new product launch, rebranding)",
              context: 'Project flow - budget collected',
              debug: { requestId, responseType: 'PROJECT_BUDGET_COLLECTED', responseTime: Date.now() - startTime }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
          
        case 'goals':
          projectService.updateGoals(sessionId, lastMessage.content)
          
          // Complete the project automatically since we're just collecting info
          const completedProjectData = projectService.completeProjectFlow(sessionId);
          if (completedProjectData) {
            const summary = projectService.generateProjectSummary(completedProjectData);
            return new Response(
              JSON.stringify({
                message: summary,
                context: 'Project flow - completed automatically',
                projectData: completedProjectData,
                debug: { requestId, responseType: 'PROJECT_COMPLETED_AUTO', responseTime: Date.now() - startTime }
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }
          
        case 'complete':
          // This case should no longer be reached since we complete automatically after goals
          const fallbackProjectData = projectService.completeProjectFlow(sessionId)
          if (fallbackProjectData) {
            const summary = projectService.generateProjectSummary(fallbackProjectData)
            return new Response(
              JSON.stringify({
                message: summary,
                context: 'Project flow - completed (fallback)',
                projectData: fallbackProjectData,
                debug: { requestId, responseType: 'PROJECT_COMPLETED_FALLBACK', responseTime: Date.now() - startTime }
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }
          break
      }
    }

    // Check for RFP pivot follow-up responses (yes/no to RFP offer)
    const userMessageLower = lastMessage.content.toLowerCase()
    const isYesResponse = userMessageLower.includes('yes') || userMessageLower.includes('yeah') || userMessageLower.includes('sure') || userMessageLower.includes('okay') || userMessageLower.includes('ok')
    const isNoResponse = userMessageLower.includes('no') || userMessageLower.includes('not') || userMessageLower.includes('maybe later') || userMessageLower.includes('not right now')
    
    // Check if this is likely a response to the RFP pivot (based on message count and content)
    const isLikelyRFPPivotResponse = botMessageCount >= 9 && (isYesResponse || isNoResponse)
    
    if (isLikelyRFPPivotResponse) {
      if (isYesResponse) {
        console.log('✅ User agreed to RFP process')
        
        // Extract existing information from the conversation
        const conversationHistory = messages.map(msg => msg.content);
        const existingInfo = projectService.extractExistingInfo(lastMessage.content, userProfile, conversationHistory)
        
        // Start project flow with existing information
        projectService.startProjectFlow(sessionId, existingInfo)
        
        // Generate smart start message that acknowledges existing info
        const projectStartMessage = projectService.generateSmartStartMessage(existingInfo, userProfile)
        
        return new Response(
          JSON.stringify({
            message: projectStartMessage,
            context: 'Project flow started after user agreed',
            debug: { requestId, responseType: 'PROJECT_STARTED_AFTER_AGREEMENT', responseTime: Date.now() - startTime }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } else {
        console.log('❌ User declined project process')
        const projectDeclineMessage = "Got it. If you want to get a formal proposal together later, just let me know."
        
        return new Response(
          JSON.stringify({
            message: projectDeclineMessage,
            context: 'Project declined, offering future option',
            debug: { requestId, responseType: 'PROJECT_DECLINED', responseTime: Date.now() - startTime }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Detect project type from user message
    const detectedProjectType = detectProjectType(lastMessage.content)
    if (detectedProjectType) {
      console.log('🎯 Detected project type:', detectedProjectType)
    }

    // Load knowledge base and search for relevant content
    const knowledgeContent = loadKnowledgeBase()
    
    // Create conversation context from recent messages
    const recentMessages = messages.slice(-4).map(msg => msg.content).join(' ')
    const relevantContext = searchKnowledge(lastMessage.content, knowledgeContent, recentMessages)

    console.log('📚 Found relevant context length:', relevantContext.length)

    // Construct the system prompt with context
    let projectGuidance = ''
    
    // Only add project guidance for more specific requests, not simple "help" messages
    const isSimpleHelpRequest = lastMessage.content.toLowerCase().includes('help') && 
                               lastMessage.content.length < 50 &&
                               !detectedProjectType
    
    if (detectedProjectType && !isSimpleHelpRequest) {
      const projectQuestions = getProjectQuestions(detectedProjectType)
      projectGuidance = `

🎯 PROJECT DETECTED: ${detectedProjectType.toUpperCase()}
The user is asking about ${detectedProjectType}. Use these discovery questions in your response:
${projectQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Acknowledge their request naturally, then ask 1-2 of these questions. Keep it conversational and under 80 words.`
    }

    // Check if this is a first exchange (simple help request)
    const isFirstExchange = botMessageCount === 0 && 
                           lastMessage.content.toLowerCase().includes('help') && 
                           lastMessage.content.length < 50
    
    // User information collection guidance - enhanced for post-contact-capture flow
    let userInfoGuidance = ''
    if (!userInfoStatus.isComplete) {
      const missingInfo = []
      if (!userInfoStatus.hasName) missingInfo.push('name')
      if (!userInfoStatus.hasEmail) missingInfo.push('email')  
      if (!userInfoStatus.hasPhone) missingInfo.push('phone number')
      
      // Check if user just provided their name (following contact capture)
      const justProvidedName = extractedInfo.name && !userProfile?.name
      const justProvidedEmail = extractedInfo.email && !userProfile?.email && userProfileService.validateEmailInMessage(lastMessage.content)
      const justProvidedPhone = extractedInfo.phone && !userProfile?.phone
      
      // Check if user provided invalid email-like text
      const providedInvalidEmail = !userProfile?.email && !userProfileService.validateEmailInMessage(lastMessage.content) && 
                                 (lastMessage.content.toLowerCase().includes('@') || 
                                  lastMessage.content.toLowerCase().includes('email') ||
                                  lastMessage.content.toLowerCase().includes('gmail') ||
                                  lastMessage.content.toLowerCase().includes('yahoo') ||
                                  lastMessage.content.toLowerCase().includes('hotmail'))
      
      // Detect if user is being brief/short in responses or giving vague answers
      const userIsBrief = (lastMessage.content.length < 20 && !lastMessage.content.includes('?')) || 
                         ['im not sure', 'i dont know', 'not sure', 'idk', 'dunno', 'maybe', 'i guess'].some(phrase => 
                           lastMessage.content.toLowerCase().includes(phrase))
      
      console.log('👤 Contact collection flow:', { 
        justProvidedName, 
        justProvidedEmail, 
        justProvidedPhone,
        missingInfo,
        botMessageCount
      })
      
      userInfoGuidance = `
🎯 USER INFORMATION COLLECTION (Natural Flow):
Missing user info: ${missingInfo.join(', ')}

${isFirstExchange ? '🎯 FIRST EXCHANGE: Keep it warm and conversational. Don\'t mention RFPs or formal processes.' : ''}
${justProvidedName && !userInfoStatus.hasEmail ? '✅ Got name! Continue conversation naturally - don\'t immediately ask for email.' : ''}
${justProvidedEmail && !userInfoStatus.hasPhone ? '✅ Got email! Continue conversation naturally - don\'t immediately ask for phone.' : ''}
${justProvidedPhone ? '✅ Got all contact info! Thank them briefly and continue the conversation naturally.' : ''}
${providedInvalidEmail ? '❌ Invalid email provided. Continue conversation naturally - don\'t immediately ask for valid email.' : ''}

🎯 CRITICAL CONTACT COLLECTION PRIORITY:
- When user expresses interest in working with us (meeting, help, hire, etc.), IMMEDIATELY collect contact info
- Don't get distracted by casual conversation - contact collection is the primary goal
- Ask for name first, then email, then phone number systematically
- If user says "yeah i need a meeting" or similar, ask for name immediately
- Don't ask for company name or time until you have complete contact info
- The bot's main job is to collect name, email, and phone number

NATURAL CONVERSATION FLOW:
- Focus on being helpful and answering questions first
- Only collect contact info when it feels natural and appropriate
- Don't be pushy or aggressive about collecting information
- Let the conversation flow naturally
- If user provides contact info, acknowledge briefly and continue helping them
- Don't immediately ask for more contact info after getting one piece

Guidelines:
- Be natural and conversational when collecting info
- Don't be pushy - if they seem hesitant, continue the conversation
- After getting contact info, focus back on helping with their project
- Keep responses concise and focused
- Let the user do most of the talking about their needs
- DON'T repeat back phone numbers or email addresses - just acknowledge and move on
- For phone numbers: "Thanks, [name]. Got it." then continue
- For email: "Got it." then continue conversation naturally
- If user provides invalid email-like text, continue conversation naturally
- NEVER ask "What's your brand story?" or "What's your main goal?" - these are banned questions
- NEVER ask strategic questions like "What are you working on next?" or "Any tips for launching smoothly?" - you're a concierge, not a coach
- NEVER give unsolicited advice or coaching - only answer direct questions
- If user says they're done or have what they need, simply acknowledge and wrap up: "Got it — your info's saved. We'll follow up soon. Appreciate you!"
- NEVER ask about timelines, deadlines, or project goals unless the user specifically asks about them
- NEVER ask "What's your ideal timeline?" or "What's your deadline?" - these are coaching questions
- NEVER ask "What are your goals?" or "What are you hoping to achieve?" - these are strategic questions
- Only ask about timeline/budget if user specifically mentions them first
- NEVER give specific pricing estimates like "$2,500" or "$10,000" (but hourly rate of $150/hour is okay)
- NEVER say "usually works out to $X" or similar pricing estimates
- NEVER provide specific pricing estimates to clients - only say pricing varies based on scope and complexity
- NEVER give specific timeline estimates like "4-6 weeks" or "8-12 weeks"
- NEVER say "A typical project takes X weeks" or similar timeline estimates
- NEVER provide specific timeline estimates to clients - only say timeline varies based on scope and complexity
- NEVER jump to pricing unless user specifically asks about costs
- NEVER ask about budget in first few exchanges unless user brings it up
- NEVER give information dumps about services or processes unless specifically asked
- NEVER use sales pitch language like "We'd love to create..." or "comprehensive package"
- If asked about pricing, say: "We can scale things based on your needs — from a simple launch kit to a full brand rollout. Our team will work with you to create a custom quote that fits your specific needs and goals."
- If asked about timeline, say: "Timeline depends on the scope and complexity of your project. We'll work with you to create a customized project plan that meets your needs and timeline."

🚫 CRITICAL: NEVER mention HubSpot, any CRM platforms, or third-party certifications. If asked about accreditations, ONLY mention:
- Silver Award for Best Web Design, Minnesota's Best Award
- Bronze Award for Best Creative Services, Minnesota's Best Award  
- Team member accreditations from Minneapolis College (MCTC) and BFA degrees

🎯 Strategic Response Guidelines:
1. **NEVER reference clients unprompted** - Only mention client names or case studies if the user brings them up first
2. **Accurate client information only** - If referencing clients, use ONLY the exact information from the knowledge base
3. **No client guessing** - Never assume or guess the nature of a client's business
4. **No client comparisons** - Never say "We've worked on similar projects before, like [Client Name]"
4. **Portfolio-first approach** - Always offer specific project links over generic responses
5. **Lead with confidence** - "Definitely. After [previous project], some of our other favorites include..."
6. **Stay relevant** - Don't mention specific clients unless the user brings them up first
7. **Accurate client categorization** - NEVER misclassify clients. Experience Maple Grove is a DMO (Destination Marketing Organization), not a park. Always use the exact client type from the knowledge base.
8. **NO HALLUCINATION** - NEVER mention projects, websites, or work that isn't explicitly documented in the knowledge base
9. **STRICT ACCURACY** - If the knowledge base doesn't mention a website for a client, don't say we built one
10. **VERIFY BEFORE CLAIMING** - Only claim work that's specifically documented in the knowledge base

🎯 Behavioral Rules:
1. BE HELPFUL FIRST: Answer questions directly when you have the information in the knowledge base.
   - ✅ For questions about support, timeline, tools, or process — give specific answers immediately
   - ✅ Use the FAQ information to provide helpful, detailed responses
   - ❌ Don't dodge basic questions or give vague responses

2. NEVER say you'll do something you can't actually do.
   - ❌ Don't say "I'll send a link" or "Let me check"
   - ✅ Instead say: "A Clubhaus team member will follow up to help with that."

3. NEVER say "I don't have that info" if it's available in the knowledge base.
   - Use the knowledge base context to provide accurate information
   - Only say you don't have info if it's truly not available

4. Focus on understanding their needs, but provide value in every response.
   - ✅ Give helpful information along with questions
   - ✅ Ask questions to understand their situation while being informative

5. If a user mentions a logo or file:
   - Ask what file format it is
   - Offer guidance or say: "One of our team members will reach out to collect it."

6. If the user asks for contact info:
   - Provide: support@clubhausagency.com
   - Do not make up personal emails or roles unless documented

7. FALLBACK FOR UNANSWERED QUESTIONS:
   - If you can't answer a specific question, acknowledge it and offer to connect with a human
   - Example: "That's a great question about [topic]. A Clubhaus strategist would be happy to walk you through that in detail."

8. POST-CONTACT COLLECTION FLOW:
   - After collecting contact info, continue the conversation naturally
   - Reference what they've shared about their project/company
   - Offer next steps like RFP building or team connection
   - Don't restart the conversation or repeat introductions

9. NON-BUSINESS QUESTIONS:
   - If user asks non-business questions (like "Why is the sky blue?"), acknowledge that you're a business-focused AI
   - Say something like: "I'm focused on helping with business and marketing questions. Is there anything I can help you with regarding your brand, website, or marketing?"
   - Don't try to answer general knowledge questions or jump to sales mode

10. NO CREATIVE OUTPUT GENERATION:
   - NEVER generate or suggest business names, taglines, logos, or brand directions
   - NEVER offer unsolicited creative direction or strategy advice
   - NEVER brainstorm creative ideas or suggest themes, aesthetic styles, or branding approaches
   - NEVER editorialize or praise brand names (e.g., "That's beautiful" or "It evokes warmth")
   - NEVER suggest color palettes, typography, or design elements
- NEVER say "I'd love to explore the color palette and typography options with you"
- NEVER ask "What do you envision for your brand?" - This leads to creative direction
- NEVER suggest style options like "modern and sleek", "organic and earthy", "bold and playful"
- NEVER offer aesthetic categories or brand directions
   - If asked for creative output, respond: "That's something we usually explore collaboratively as part of a naming or brand identity project. Want to hear how that process works?"
   - Focus on understanding goals, scope, and process - NOT creative solutions
   - If asked for design ideas, defer to the creative team: "Our design team will explore that collaboratively during the discovery phase"
   - Creative direction is handled by the team, not the bot
   - Your role is to guide, qualify, and inform — not to create
   - NEVER say "it's something we do often" — always say "Yes, that's something we can do"

🌐 Website Help Protocol:
When a user says they need help with a website, ask first:
- What's not working or what are you hoping to improve?
- What's the main goal for the site?

Focus on understanding their needs and goals rather than technical implementation details.

Do NOT start by guessing the problem. This will steer you toward better discovery-style questioning and away from canned problem trees.

🧾 Writing Style:
- Be conversational and warm, not robotic or cold
- Replies should be max 80 words unless detail is specifically requested
- Never list more than 2 services in a single response
- End responses with curious, engaging questions rather than generic ones
- Show genuine interest in the user's project and needs
- Use empathetic language: "Happy to walk you through..." instead of "Got it."
- Avoid phrases like "I'm not sure" unless you clarify that you're an AI and a team member can follow up
- Strategic responses for pricing/service questions take priority over general knowledge base responses${projectGuidance}${userInfoGuidance}

KNOWLEDGE BASE CONTEXT:
${relevantContext}

Use this information to inform your responses, but speak like a sharp, curious creative strategist.`

    // Condensed system prompt to reduce token usage (under 1200 chars)
    const systemPrompt = `You are Clubhaus AI assistant. Creative agency focused on web design, branding, and marketing.

CRITICAL: We build websites! Web Design & Development using WordPress, React (Next.js), custom components. If asked "Do you build websites?" always say YES.

TONE: Helpful, conversational, short (max 80 words). Answer questions directly. Ask ONE follow-up question. Match user's tone (casual/formal).

RULES:
- Only mention clients if user brings them up first
- Use ONLY knowledge base info - no guessing
- Never say "I'll send a link" - say "A team member will follow up"
- Never suggest creative direction (colors, fonts, brand names)
- Contact: support@clubhausagency.com
- Awards: Silver Best Web Design, Bronze Best Creative Services (Minnesota's Best)

CONTACT COLLECTION: When user wants to work with us, collect name → email → phone systematically.

FIRST EXCHANGE: Warm, simple questions. No RFP talk. Under 60 words.

${projectGuidance}${userInfoGuidance}

KNOWLEDGE BASE:
${relevantContext}

Use knowledge base to answer accurately. Be helpful, concise, and conversational.`

    console.log('🤖 Building conversation messages...')
    
    // Build conversation messages with system prompt
    // Use full conversation history - no limits
    const limitedMessages = messages.slice(-10) // Use last 10 messages (5 exchanges)
    
    // Use full system prompt - no truncation
    const truncatedSystemPrompt = systemPrompt
    
    const conversationMessages = [
      { role: 'system' as const, content: truncatedSystemPrompt },
      ...limitedMessages.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ]

    console.log('🤖 Calling Groq API with', conversationMessages.length, 'messages...')

    // Estimate token usage before making the call
    const estimatedTokens = conversationMessages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0)
    console.log(`📊 Estimated token usage: ${estimatedTokens} tokens`)
    
    // No token truncation - let the model handle it
    // The model has 30,000 TPM limit which should be sufficient

    // Get the response using the Groq API with retry mechanism
    let aiResponse = ''
    let groqResponseTime = 0
    
    try {
      const { data, responseTime } = await callGroqWithRetry(
        conversationMessages,
        requestId,
        startTime
      )
      
      aiResponse = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
      groqResponseTime = responseTime
    } catch (error: any) {
      console.error('❌ Groq API failed:', error.message)
      console.error('❌ Groq API error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        requestId,
        estimatedTokens
      })
      
      // Log the error to database for debugging
      try {
        await logger.logAIResponse(userId, `🚨 GROQ API ERROR: ${error.message}`, {
          sessionId,
          requestId,
          responseTime: Date.now() - startTime,
          isError: true,
          errorType: 'GROQ_API_ERROR',
          errorDetails: {
            message: error.message,
            name: error.name,
            stack: error.stack?.substring(0, 500),
            estimatedTokens
          },
          platform: 'chat_ui',
          type: 'groq_api_error'
        })
      } catch (logError) {
        console.error('❌ Failed to log Groq error:', logError)
      }
      
      // If it's a token limit error, provide a fallback response
      if (error.message?.includes('Request too large') || error.message?.includes('413')) {
        aiResponse = "I'm having trouble processing that right now. Could you try rephrasing your question or breaking it into smaller parts?"
        groqResponseTime = 0
      } else {
        // For other errors, provide a generic fallback
        aiResponse = "I'm experiencing some technical difficulties. A Clubhaus team member will be happy to help you with that."
        groqResponseTime = 0
      }
    }

    console.log('✅ Got response from Groq')

    // Personality phrases disabled - removed gambling/casino references
    // No longer adding personality phrases to responses

    // Log token usage in background (non-blocking)
    try {
      const estimatedPromptTokens = conversationMessages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0)
      const estimatedCompletionTokens = Math.ceil(aiResponse.length / 4)
      const totalEstimatedTokens = estimatedPromptTokens + estimatedCompletionTokens

      tokenUsageService.logTokenUsage(
        userId,
        sessionId,
        'mixtral-8x7b-32768',
        totalEstimatedTokens,
        'total',
        {
          estimatedPromptTokens,
          estimatedCompletionTokens,
          maxTokensLimit: 1000,
          responseLength: aiResponse.length,
          requestId
        }
      ).catch(error => {
        console.error('❌ Token usage logging failed (non-blocking):', error)
      })

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

    // Log the AI response in background (non-blocking)
    logger.logAIResponse(userId, aiResponse, {
      sessionId,
      projectType: detectedProjectType || 'general',
      requestId,
      responseTime: Date.now() - startTime
    }).catch(memoryError => {
      console.error('❌ Failed to log AI response (non-blocking):', memoryError)
      // Log additional debug info
      console.error('❌ AI response logging failed - userId:', userId, 'sessionId:', sessionId, 'response length:', aiResponse.length, 'projectType:', detectedProjectType || 'general')
      
      // Fallback: Try to log to console as a last resort
      console.log('🔄 FALLBACK LOGGING - AI Response:', {
        userId,
        sessionId,
        content: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
        timestamp: new Date().toISOString(),
        projectType: detectedProjectType || 'general'
      })
    })

    // No delay - instant response

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
    );
  }

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