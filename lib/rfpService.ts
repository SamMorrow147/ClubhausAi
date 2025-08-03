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
  startRFPFlow(sessionId: string): RFPFlowState {
    const flowState: RFPFlowState = {
      step: 'contact_info',
      isActive: true
    };
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
   * Update flow state with contact information
   */
  updateContactInfo(sessionId: string, contactInfo: ContactInfo): RFPFlowState | null {
    const flowState = this.flowStates.get(sessionId);
    if (!flowState || !flowState.isActive) return null;

    flowState.contactInfo = contactInfo;
    flowState.step = 'service_type';
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
    return flowState;
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
    // Simple regex patterns for email and phone
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/;
    
    const email = message.match(emailRegex)?.[0];
    const phone = message.match(phoneRegex)?.[0];
    
    if (!email || !phone) return null;

    // Extract name (everything before email, after any common prefixes)
    const nameMatch = message.match(/(?:my name is|i'm|i am|call me|this is)\s+([^@]+?)(?=\s+[\w.-]+@)/i);
    const name = nameMatch?.[1]?.trim() || 'Not provided';

    return {
      name,
      email,
      phone
    };
  }

  /**
   * Generate proposal summary from collected data
   */
  generateProposalSummary(rfpData: RFPData): string {
    return `
📋 **RFP Summary**

**Contact Information:**
• Name: ${rfpData.contactInfo.name}
• Email: ${rfpData.contactInfo.email}
• Phone: ${rfpData.contactInfo.phone}
${rfpData.contactInfo.company ? `• Company: ${rfpData.contactInfo.company}` : ''}

**Project Details:**
• Service Type: ${rfpData.serviceType}
• Timeline: ${rfpData.timeline}
• Budget: ${rfpData.budget}
• Goals: ${rfpData.goals}

**Next Steps:**
We'll review this information and get back to you with a detailed proposal within 24-48 hours. Our team will assess the scope and provide you with a comprehensive quote and project timeline.

Would you like us to include any specific examples of similar work we've done?
    `.trim();
  }
}

export const rfpService = new RFPService(); 