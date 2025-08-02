import SimpleLogger from './simpleLogger'

export interface UserProfile {
  userId: string
  name?: string
  email?: string
  phone?: string
  createdAt: string
  updatedAt: string
  sessionId: string
}

export interface UserInfoStatus {
  hasName: boolean
  hasEmail: boolean
  hasPhone: boolean
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
  async updateUserProfile(userId: string, sessionId: string, updates: Partial<Pick<UserProfile, 'name' | 'email' | 'phone'>>): Promise<UserProfile> {
    try {
      // Get existing profile
      const existingProfile = await this.getUserProfile(userId, sessionId)
      
      const profile: UserProfile = {
        userId,
        sessionId,
        name: updates.name || existingProfile?.name,
        email: updates.email || existingProfile?.email,
        phone: updates.phone || existingProfile?.phone,
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
    
    return {
      hasName,
      hasEmail,
      hasPhone,
      isComplete: hasName && hasEmail && hasPhone
    }
  }

  /**
   * Extract user information from a message
   */
  extractUserInfoFromMessage(message: string): Partial<Pick<UserProfile, 'name' | 'email' | 'phone'>> {
    const extracted: Partial<Pick<UserProfile, 'name' | 'email' | 'phone'>> = {}
    
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

    // Extract name - ONLY from explicit name patterns, not from random capitalized words
    const namePatterns = [
      /(?:my name is|i'm|i am|call me|this is)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    ]
    
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

    return extracted
  }

  /**
   * Determine what user information to ask for next
   */
  async getNextInfoToCollect(userId: string, sessionId: string): Promise<'name' | 'email' | 'phone' | null> {
    const status = await getUserInfoStatus(userId, sessionId)
    
    if (!status.hasName) return 'name'
    if (!status.hasEmail) return 'email'
    if (!status.hasPhone) return 'phone'
    
    return null // All information collected
  }

  /**
   * Generate a casual question to collect missing user information
   */
  generateUserInfoQuestion(infoType: 'name' | 'email' | 'phone', context: string = ''): string {
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