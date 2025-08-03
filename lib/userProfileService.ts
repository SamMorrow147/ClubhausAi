import SimpleLogger from './simpleLogger'

export interface UserProfile {
  userId: string
  name?: string
  email?: string
  phone?: string
  businessName?: string
  projectBudget?: string
  createdAt: string
  updatedAt: string
  sessionId: string
}

export interface UserInfoStatus {
  hasName: boolean
  hasEmail: boolean
  hasPhone: boolean
  hasBusinessName: boolean
  hasProjectBudget: boolean
  isComplete: boolean
}

export class UserProfileService {
  private static instance: UserProfileService
  private logger: SimpleLogger

  private constructor() {
    this.logger = SimpleLogger.getInstance()
  }

  public static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService()
    }
    return UserProfileService.instance
  }

  /**
   * Store or update user profile information
   */
  async updateUserProfile(userId: string, sessionId: string, updates: Partial<Pick<UserProfile, 'name' | 'email' | 'phone' | 'businessName' | 'projectBudget'>>): Promise<UserProfile> {
    try {
      // Get existing profile
      const existingProfile = await this.getUserProfile(userId, sessionId)
      
      const profile: UserProfile = {
        userId,
        sessionId,
        name: updates.name || existingProfile?.name,
        email: updates.email || existingProfile?.email,
        phone: updates.phone || existingProfile?.phone,
        businessName: updates.businessName || existingProfile?.businessName,
        projectBudget: updates.projectBudget || existingProfile?.projectBudget,
        createdAt: existingProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Store in metadata of the logger system
      await this.logger.logUserMessage(userId, `[PROFILE_UPDATE] ${JSON.stringify(updates)}`, {
        sessionId,
        type: 'profile_update',
        userProfile: profile,
        isSystemMessage: true
      })

      console.log('👤 Updated user profile for:', userId)
      return profile
    } catch (error) {
      console.error('❌ Failed to update user profile:', error)
      throw error
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId: string, sessionId: string): Promise<UserProfile | null> {
    try {
      // Get all logs for the session and look for profile updates
      const sessionLogs = await this.logger.getLogsBySession(sessionId)
      
      // Find the most recent profile information
      let profile: UserProfile | null = null
      
      for (const log of sessionLogs.reverse()) { // Most recent first
        if (log.metadata?.userProfile) {
          profile = log.metadata.userProfile
          break
        }
        
        // Also check for profile information extracted from messages
        if (log.metadata?.extractedProfile) {
          profile = {
            userId,
            sessionId,
            createdAt: log.timestamp,
            updatedAt: log.timestamp,
            ...log.metadata.extractedProfile
          }
          break
        }
      }

      return profile
    } catch (error) {
      console.error('❌ Failed to get user profile:', error)
      return null
    }
  }

  /**
   * Get user information status
   */
  async getUserInfoStatus(userId: string, sessionId: string): Promise<UserInfoStatus> {
    const profile = await this.getUserProfile(userId, sessionId)
    
    const hasName = !!(profile?.name && profile.name.trim().length > 0)
    const hasEmail = !!(profile?.email && profile.email.trim().length > 0)
    const hasPhone = !!(profile?.phone && profile.phone.trim().length > 0)
    const hasBusinessName = !!(profile?.businessName && profile.businessName.trim().length > 0)
    const hasProjectBudget = !!(profile?.projectBudget && profile.projectBudget.trim().length > 0)
    
    return {
      hasName,
      hasEmail,
      hasPhone,
      hasBusinessName,
      hasProjectBudget,
      isComplete: hasName && hasEmail && hasPhone && hasBusinessName && hasProjectBudget
    }
  }

  /**
   * Extract user information from a message
   */
  extractUserInfoFromMessage(message: string, context?: { askedForName?: boolean }): Partial<Pick<UserProfile, 'name' | 'email' | 'phone' | 'businessName' | 'projectBudget'>> {
    const extracted: Partial<Pick<UserProfile, 'name' | 'email' | 'phone' | 'businessName' | 'projectBudget'>> = {}
    
    // Extract email using regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const emailMatch = message.match(emailRegex)
    if (emailMatch && emailMatch[0]) {
      extracted.email = emailMatch[0]
    }

    // Extract phone using regex (various formats)
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g
    const phoneMatch = message.match(phoneRegex)
    if (phoneMatch && phoneMatch[0]) {
      extracted.phone = phoneMatch[0]
    }

    // Extract name - enhanced to handle both explicit patterns and simple name responses
    const namePatterns = [
      /(?:my name is|i'm|i am|call me|this is)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    ]
    
    // First try explicit patterns
    for (const pattern of namePatterns) {
      const nameMatch = message.match(pattern)
      if (nameMatch && nameMatch[1]) {
        const possibleName = nameMatch[1].trim()
        // Enhanced validation - avoid common false positives including question words
        if (possibleName.length > 1 && possibleName.length < 30 && 
            !['yes', 'no', 'ok', 'sure', 'thanks', 'hello', 'hi', 'hey', 'what', 'why', 'how', 'when', 'where', 'who', 'which'].includes(possibleName.toLowerCase())) {
          extracted.name = possibleName
          break
        }
      }
    }

    // If no explicit pattern found, check for simple name response
    if (!extracted.name) {
      const trimmedMessage = message.trim()
      
      // Check if the message looks like a simple name response
      // Criteria: 1-3 words, all letters, no special characters except spaces
      const simpleNameRegex = /^[a-zA-Z]+(?:\s+[a-zA-Z]+){0,2}$/
      if (simpleNameRegex.test(trimmedMessage)) {
        const possibleName = trimmedMessage.trim()
        
        // Enhanced validation for simple name responses
        if (possibleName.length > 1 && possibleName.length < 30 && 
            !['yes', 'no', 'ok', 'sure', 'thanks', 'hello', 'hi', 'hey', 'what', 'why', 'how', 'when', 'where', 'who', 'which'].includes(possibleName.toLowerCase())) {
          // Additional check: avoid common non-name words
          const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now']
          
          // If we just asked for a name, be more lenient with the validation
          const isNameContext = context?.askedForName
          
          if (!commonWords.includes(possibleName.toLowerCase()) || isNameContext) {
            // If we asked for a name, accept it even if it's a common word (like "sam")
            if (isNameContext || !commonWords.includes(possibleName.toLowerCase())) {
              extracted.name = possibleName
            }
          }
        }
      }
    }

    return extracted
  }

  /**
   * Determine what user information to ask for next
   */
  async getNextInfoToCollect(userId: string, sessionId: string): Promise<'name' | 'email' | 'phone' | 'businessName' | 'projectBudget' | null> {
    const status = await getUserInfoStatus(userId, sessionId)
    
    if (!status.hasName) return 'name'
    if (!status.hasEmail) return 'email'
    if (!status.hasPhone) return 'phone'
    if (!status.hasBusinessName) return 'businessName'
    if (!status.hasProjectBudget) return 'projectBudget'
    
    return null // All information collected
  }

  /**
   * Generate a casual question to collect missing user information
   */
  generateUserInfoQuestion(infoType: 'name' | 'email' | 'phone' | 'businessName' | 'projectBudget', context: string = ''): string {
    const questions = {
      name: [
        "What should I call you?",
        "I'd love to know your name!",
        "By the way, what's your name?",
        "What name would you like me to use?"
      ],
      email: [
        "What's your email address?",
        "Can I get your email so we can follow up?",
        "What's the best email to reach you at?",
        "Mind sharing your email address?"
      ],
      phone: [
        "What's your phone number?",
        "Can I get your phone number?",
        "What's the best number to reach you at?",
        "Mind sharing your phone number?"
      ],
      businessName: [
        "What's the name of your business?",
        "What should I call your company?",
        "What's your business name?",
        "What company are you with?"
      ],
      projectBudget: [
        "What's your budget for this project?",
        "What's your budget range?",
        "What's your budget for this work?",
        "What budget are you working with?"
      ]
    }
    
    const options = questions[infoType]
    return options[Math.floor(Math.random() * options.length)]
  }
}

// Helper function to check user info status
export async function getUserInfoStatus(userId: string, sessionId: string): Promise<UserInfoStatus> {
  const service = UserProfileService.getInstance()
  return await service.getUserInfoStatus(userId, sessionId)
}

export default UserProfileService 