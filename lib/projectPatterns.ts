export interface ProjectPattern {
  triggers: string[];
  questions: string[];
}

export const projectPatterns: Record<string, ProjectPattern> = {
  logo: {
    triggers: ["need a logo", "logo design", "want a logo", "create a logo"],
    questions: [
      "Can you tell me a little about the business this is for?",
      "Are you thinking just a logo, or a full brand identity? We do both, but we love helping build the full story.",
      "Do you have a rough budget in mind?"
    ]
  },
  seo: {
    triggers: ["need help with seo", "seo help", "improve ranking", "search engine optimization", "get found online"],
    questions: [
      "Who are you hoping to reach?",
      "Are there any keywords or searches you want to rank for, or should we help define that?"
    ]
  },
  newBusiness: {
    triggers: ["starting a new business", "starting a company", "launching a business", "new business", "startup"],
    questions: [
      "What's the idea? I'd love to hear more.",
      "Is this still early planning, or are you already building things out?"
    ]
  },
  website: {
    triggers: ["need a website", "build a website", "create a website", "website design"],
    questions: [
      "What's the main goal for the site?",
      "Who's your target audience?",
      "What kind of content or functionality do you need?"
    ]
  },
  branding: {
    triggers: ["brand identity", "branding", "brand design", "visual identity"],
    questions: [
      "What's the story behind the business?",
      "Who's your ideal customer?",
      "Any brands you admire or want to feel similar to?"
    ]
  },
  marketing: {
    triggers: ["marketing help", "need marketing", "promote my business", "advertising", "help with marketing"],
    questions: [
      "What's your current marketing situation?",
      "Who's your target audience?",
      "What channels are you thinking about?"
    ]
  }
};

export function detectProjectType(message: string): string | null {
  const messageLower = message.toLowerCase();
  
  for (const [projectType, pattern] of Object.entries(projectPatterns)) {
    for (const trigger of pattern.triggers) {
      if (messageLower.includes(trigger)) {
        return projectType;
      }
    }
  }
  
  return null;
}

export function getProjectQuestions(projectType: string): string[] {
  return projectPatterns[projectType]?.questions || [];
} 