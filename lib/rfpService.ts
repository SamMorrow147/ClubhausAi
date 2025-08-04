export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  company?: string;
}

export interface RFPFlowState {
  step: string;
  contactInfo?: ContactInfo;
  serviceType?: string;
  timeline?: string;
  budget?: string;
  goals?: string;
  proposalFormat?: string;
  isActive: boolean;
  lastQuestionTime?: number;
  questionRepeatCount?: number;
  userResponses: string[];
}

export interface RFPData {
  contactInfo: ContactInfo;
  serviceType: string;
  timeline: string;
  budget: string;
  goals: string;
  proposalFormat?: string;
}

class RFPService {
  private flowStates: Map<string, RFPFlowState> = new Map();

  /**
   * Start RFP flow for a user session
   */
  startRFPFlow(sessionId: string, existingInfo?: Partial<RFPData>): RFPFlowState {
    const flowState: RFPFlowState = {
      step: 'contact_info',
      isActive: true,
      lastQuestionTime: Date.now(),
      questionRepeatCount: 0,
      userResponses: []
    };

    // Pre-populate with existing information
    if (existingInfo) {
      if (existingInfo.contactInfo) {
        flowState.contactInfo = existingInfo.contactInfo;
      }
      if (existingInfo.serviceType) {
        flowState.serviceType = existingInfo.serviceType;
      }
      if (existingInfo.timeline) {
        flowState.timeline = existingInfo.timeline;
      }
      if (existingInfo.budget) {
        flowState.budget = existingInfo.budget;
      }
      if (existingInfo.goals) {
        flowState.goals = existingInfo.goals;
      }

      // Determine starting step based on what we have
      if (!flowState.contactInfo || !flowState.contactInfo.name) {
        flowState.step = 'contact_info';
      } else if (!flowState.serviceType) {
        flowState.step = 'service_type';
      } else if (!flowState.timeline) {
        flowState.step = 'timeline';
      } else if (!flowState.budget) {
        flowState.step = 'budget';
      } else if (!flowState.goals) {
        flowState.step = 'goals';
      } else {
        flowState.step = 'proposal_format';
      }
    }

    this.flowStates.set(sessionId, flowState);
    return flowState;
  }

  /**
   * Get current flow state for a session
   */
  getFlowState(sessionId: string): RFPFlowState | null {
    return this.flowStates.get(sessionId) || null;
  }

  /**
   * Check if user is being repetitive or unresponsive
   */
  private isUserRepetitive(flowState: RFPFlowState, userMessage: string): boolean {
    const messageLower = userMessage.toLowerCase();
    
    // Check if user is giving very brief responses
    const isBrief = userMessage.length < 10 && !messageLower.includes('?');
    
    // Check if user is being vague
    const isVague = ['not sure', 'i dont know', 'idk', 'maybe', 'i guess', 'dunno'].some(phrase => 
      messageLower.includes(phrase)
    );
    
    // Check if user is repeating themselves
    const hasRepeatedResponse = flowState.userResponses.some(response => {
      const responseLower = response.toLowerCase();
      const similarity = this.calculateSimilarity(messageLower, responseLower);
      return similarity > 0.8; // 80% similarity threshold
    });
    
    return isBrief || isVague || hasRepeatedResponse;
  }

  /**
   * Check if specific information has already been provided
   */
  hasInformationBeenProvided(flowState: RFPFlowState, infoType: string): boolean {
    switch (infoType) {
      case 'timeline':
        return !!flowState.timeline && flowState.timeline !== 'Not provided';
      case 'budget':
        return !!flowState.budget && flowState.budget !== 'Not provided';
      case 'goals':
        return !!flowState.goals && flowState.goals !== 'Not provided';
      case 'contact':
        return !!(flowState.contactInfo?.name && flowState.contactInfo?.email && 
                 flowState.contactInfo.name !== 'Not provided' && 
                 flowState.contactInfo.email !== 'Not provided');
      case 'service':
        return !!flowState.serviceType && flowState.serviceType !== 'Not provided';
      default:
        return false;
    }
  }

  /**
   * Check if RFP is essentially complete
   */
  isRFPComplete(flowState: RFPFlowState): boolean {
    return this.hasInformationBeenProvided(flowState, 'contact') &&
           this.hasInformationBeenProvided(flowState, 'timeline') &&
           this.hasInformationBeenProvided(flowState, 'budget') &&
           this.hasInformationBeenProvided(flowState, 'goals');
  }

  /**
   * Calculate similarity between two strings (simple implementation)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * Update flow state with contact information
   */
  updateContactInfo(sessionId: string, contactInfo: ContactInfo): RFPFlowState | null {
    const flowState = this.flowStates.get(sessionId);
    if (!flowState || !flowState.isActive) return null;

    flowState.contactInfo = contactInfo;
    flowState.step = 'service_type';
    flowState.lastQuestionTime = Date.now();
    flowState.questionRepeatCount = 0;
    flowState.userResponses = [];
    return flowState;
  }

  /**
   * Update flow state with service type
   */
  updateServiceType(sessionId: string, serviceType: string): RFPFlowState | null {
    const flowState = this.flowStates.get(sessionId);
    if (!flowState || !flowState.isActive) return null;

    flowState.serviceType = serviceType;
    flowState.step = 'timeline';
    flowState.lastQuestionTime = Date.now();
    flowState.questionRepeatCount = 0;
    flowState.userResponses = [];
    return flowState;
  }

  /**
   * Update flow state with timeline
   */
  updateTimeline(sessionId: string, timeline: string): RFPFlowState | null {
    const flowState = this.flowStates.get(sessionId);
    if (!flowState || !flowState.isActive) return null;

    flowState.timeline = timeline;
    flowState.step = 'budget';
    flowState.lastQuestionTime = Date.now();
    flowState.questionRepeatCount = 0;
    flowState.userResponses = [];
    return flowState;
  }

  /**
   * Update flow state with budget
   */
  updateBudget(sessionId: string, budget: string): RFPFlowState | null {
    const flowState = this.flowStates.get(sessionId);
    if (!flowState || !flowState.isActive) return null;

    flowState.budget = budget;
    flowState.step = 'goals';
    flowState.lastQuestionTime = Date.now();
    flowState.questionRepeatCount = 0;
    flowState.userResponses = [];
    return flowState;
  }

  /**
   * Update flow state with goals
   */
  updateGoals(sessionId: string, goals: string): RFPFlowState | null {
    const flowState = this.flowStates.get(sessionId);
    if (!flowState || !flowState.isActive) return null;

    flowState.goals = goals;
    flowState.step = 'proposal_format';
    flowState.lastQuestionTime = Date.now();
    flowState.questionRepeatCount = 0;
    flowState.userResponses = [];
    return flowState;
  }

  /**
   * Update flow state with proposal format choice
   */
  updateProposalFormat(sessionId: string, format: string): RFPFlowState | null {
    const flowState = this.flowStates.get(sessionId);
    if (!flowState || !flowState.isActive) return null;

    flowState.proposalFormat = format;
    flowState.step = 'complete';
    flowState.lastQuestionTime = Date.now();
    flowState.questionRepeatCount = 0;
    flowState.userResponses = [];
    return flowState;
  }

  /**
   * Add user response to flow state
   */
  addUserResponse(sessionId: string, userMessage: string): void {
    const flowState = this.flowStates.get(sessionId);
    if (!flowState || !flowState.isActive) return;

    flowState.userResponses.push(userMessage);
    
    // Keep only last 5 responses to prevent memory issues
    if (flowState.userResponses.length > 5) {
      flowState.userResponses = flowState.userResponses.slice(-5);
    }
    
    // Check if user is being repetitive
    if (this.isUserRepetitive(flowState, userMessage)) {
      flowState.questionRepeatCount = (flowState.questionRepeatCount || 0) + 1;
    }
  }

  /**
   * Check if we should skip to next step due to user being unresponsive
   */
  shouldSkipStep(sessionId: string): boolean {
    const flowState = this.flowStates.get(sessionId);
    if (!flowState || !flowState.isActive) return false;

    return (flowState.questionRepeatCount || 0) >= 2; // Skip after 2 repetitive responses
  }

  /**
   * Complete RFP flow and get final data
   */
  completeRFPFlow(sessionId: string): RFPData | null {
    const flowState = this.flowStates.get(sessionId);
    if (!flowState || !flowState.isActive || !flowState.contactInfo) return null;

    const rfpData: RFPData = {
      contactInfo: flowState.contactInfo,
      serviceType: flowState.serviceType || '',
      timeline: flowState.timeline || '',
      budget: flowState.budget || '',
      goals: flowState.goals || '',
      proposalFormat: flowState.proposalFormat
    };

    // Mark flow as inactive
    flowState.isActive = false;
    return rfpData;
  }

  /**
   * End RFP flow for a session
   */
  endRFPFlow(sessionId: string): void {
    this.flowStates.delete(sessionId);
  }

  /**
   * Extract contact information from user message
   */
  extractContactInfo(message: string): ContactInfo | null {
    // Enhanced regex patterns for email and phone
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/;
    
    // Also look for creative contact formats
    const cosmicEmailRegex = /(?:cosmic email|email is|my email)\s+(?:is\s+)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})/i;
    const quantumPhoneRegex = /(?:quantum communication frequency|phone|frequency|contact)\s+(?:is\s+)?([0-9\-A-Z]+)/i;
    
    const email = message.match(emailRegex)?.[0] || message.match(cosmicEmailRegex)?.[1];
    const phone = message.match(phoneRegex)?.[0] || message.match(quantumPhoneRegex)?.[1];
    
    // Extract name with more flexible patterns
    const namePatterns = [
      /(?:my name is|i'm|i am|call me|this is|i'm)\s+([^@.!?]+?)(?=\s+[\w.-]+@)/i,
      /(?:i'm)\s+([^@.!?]+?)(?=\s+[\w.-]+@)/i,
      /(?:name is)\s+([^@.!?]+?)(?=\s+[\w.-]+@)/i,
      /(?:i'm)\s+([^@.!?]+?)(?=\s+(?:ceo|founder|owner))/i,
      /(?:i'm)\s+([^@.!?]+?)(?=\s+(?:of|at))/i
    ];
    
    let name = 'Not provided';
    for (const pattern of namePatterns) {
      const nameMatch = message.match(pattern);
      if (nameMatch && nameMatch[1]) {
        name = nameMatch[1].trim();
        break;
      }
    }

    // If we have either email or phone, return the contact info
    if (email || phone) {
      return {
        name,
        email: email || 'Not provided',
        phone: phone || 'Not provided'
      };
    }

    return null;
  }

  /**
   * Extract RFP information from conversation context
   */
  extractExistingInfo(userMessage: string, userProfile?: any): Partial<RFPData> {
    const messageLower = userMessage.toLowerCase();
    const existingInfo: Partial<RFPData> = {};

    // Check for frustration indicators - don't extract info from frustrated messages
    const frustrationIndicators = [
      'i\'ve asked', 'ive asked', 'asked multiple times', 'asked several times',
      'still waiting', 'haven\'t answered', 'havent answered', 'ignoring my question',
      'not answering', 'repeatedly asked', 'asked five times', 'asked four times',
      'asked three times', 'asked twice', 'standard business practice',
      'cannot move forward', 'need this information', 'essential for my budget',
      'cannot evaluate', 'look elsewhere', 'frustrated', 'annoyed', 'upset'
    ];
    
    const isFrustratedMessage = frustrationIndicators.some(indicator => 
      messageLower.includes(indicator)
    );
    
    if (isFrustratedMessage) {
      console.log('🚫 Detected frustrated message, skipping info extraction:', messageLower);
      return existingInfo;
    }

    // Extract contact info from user profile
    if (userProfile && (userProfile.name || userProfile.email)) {
      existingInfo.contactInfo = {
        name: userProfile.name || 'Not provided',
        email: userProfile.email || '',
        phone: userProfile.phone || ''
      };
    }

    // Extract business name from message
    const businessMatch = userMessage.match(/(?:business is called|company is|business name is|we are|i'm with|i work for|my company is)\s+([^.!?]+)/i);
    if (businessMatch) {
      if (!existingInfo.contactInfo) existingInfo.contactInfo = { name: 'Not provided', email: '', phone: '' };
      existingInfo.contactInfo.company = businessMatch[1].trim();
    }

    // Extract budget information
    const budgetMatch = userMessage.match(/budget\s*(?:of|is)?\s*\$?([0-9,]+)/i);
    if (budgetMatch) {
      existingInfo.budget = `$${budgetMatch[1]}`;
    }

    // Extract timeline information
    const timelinePatterns = [
      /(\d+)\s*months?/i,
      /next\s*(\d+)\s*months?/i,
      /(\d+)\s*weeks?/i,
      /asap|immediately|right away|urgent/i,
      /launch\s*in\s*([^.!?]+)/i
    ];
    
    for (const pattern of timelinePatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        existingInfo.timeline = match[0];
        break;
      }
    }

    // Extract goals information
    if (messageLower.includes('goal') || messageLower.includes('objective') || messageLower.includes('increase') || messageLower.includes('leads')) {
      const goalMatch = userMessage.match(/(?:goal|objective|want to|looking to|need to|increase|boost|improve|generate)\s+([^.!?]+)/i);
      if (goalMatch) {
        existingInfo.goals = goalMatch[0];
      }
    }

    // Extract service type from context
    if (messageLower.includes('marketing') || messageLower.includes('advertising') || messageLower.includes('campaign')) {
      existingInfo.serviceType = 'Marketing and advertising services';
    }

    return existingInfo;
  }

  /**
   * Generate smart RFP start message based on existing information
   */
  generateSmartStartMessage(existingInfo: Partial<RFPData>, userProfile?: any): string {
    const hasName = userProfile?.name;
    const hasCompany = existingInfo.contactInfo?.company;
    const hasBudget = existingInfo.budget;
    const hasTimeline = existingInfo.timeline;
    const hasGoals = existingInfo.goals;

    let message = "Awesome! ";

    // Acknowledge what we already know
    if (hasName && hasCompany) {
      message += `Thanks, ${hasName}. With ${hasCompany}'s `;
    } else if (hasCompany) {
      message += `With ${hasCompany}'s `;
    } else if (hasName) {
      message += `Thanks, ${hasName}. With your `;
    } else {
      message += "With your ";
    }

    // Reference their goals and budget
    const parts = [];
    if (hasGoals) parts.push(`goal of ${hasGoals.toLowerCase()}`);
    if (hasBudget) parts.push(`${hasBudget} budget`);
    if (hasTimeline) parts.push(`${hasTimeline} timeline`);

    if (parts.length > 0) {
      message += parts.join(' and ') + ", we've got a great framework to start from. ";
    } else {
      message += "project details, we can build a comprehensive proposal. ";
    }

    return message + "What else would you like to include in your RFP?";
  }

  /**
   * Generate progress recap showing what's been collected so far
   */
  generateProgressRecap(flowState: RFPFlowState): string {
    const collected = [];
    
    if (flowState.contactInfo?.name && flowState.contactInfo.name !== 'Not provided') {
      collected.push(`• Name: ${flowState.contactInfo.name}`);
    }
    if (flowState.contactInfo?.email && flowState.contactInfo.email !== 'Not provided') {
      collected.push(`• Email: ${flowState.contactInfo.email}`);
    }
    if (flowState.contactInfo?.company) {
      collected.push(`• Company: ${flowState.contactInfo.company}`);
    }
    if (flowState.serviceType) {
      collected.push(`• Service Type: ${flowState.serviceType}`);
    }
    if (flowState.timeline) {
      collected.push(`• Timeline: ${flowState.timeline}`);
    }
    if (flowState.budget) {
      collected.push(`• Budget: ${flowState.budget}`);
    }
    if (flowState.goals) {
      collected.push(`• Goals: ${flowState.goals}`);
    }

    if (collected.length === 0) {
      return "Let's start building your RFP. What's the main goal for your project?";
    }

    return `Great! I can help walk you through building out your RFP. So far I've got:

${collected.join('\n')}

To keep things moving, what's the next detail we should capture?`;
  }

  /**
   * Generate proposal summary from collected data
   */
  generateProposalSummary(rfpData: RFPData): string {
    // Only show contact info if we have real data (not placeholders)
    const hasRealContactInfo = rfpData.contactInfo.name !== 'Not provided' && 
                              rfpData.contactInfo.email !== 'Not provided';
    
    const contactSection = hasRealContactInfo ? `
**Contact Information:**
• Name: ${rfpData.contactInfo.name}
• Email: ${rfpData.contactInfo.email}
• Phone: ${rfpData.contactInfo.phone}
${rfpData.contactInfo.company ? `• Company: ${rfpData.contactInfo.company}` : ''}` : '';

    return `
📋 **RFP Summary**
${contactSection}

**Project Details:**
• Service Type: ${rfpData.serviceType}
• Timeline: ${rfpData.timeline}
• Budget: ${rfpData.budget}
• Goals: ${rfpData.goals}

**Next Steps:**
Perfect! I've captured all the key details for your RFP. Our team will use this information to prepare a comprehensive proposal that addresses your specific needs and timeline.

You can reach out to us at support@clubhausagency.com to continue the conversation, or is there anything else you'd like to add to your project requirements?
    `.trim();
  }
}

export const rfpService = new RFPService(); 