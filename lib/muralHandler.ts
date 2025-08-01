export interface MuralConversationState {
  hasMentionedLakeByllesby: boolean;
  hasSharedConcept: boolean;
  hasSharedMaterials: boolean;
  hasSharedExecution: boolean;
  hasSharedCommunity: boolean;
  hasSharedLink: boolean;
  conversationCount: number;
}

export const MURAL_DETAILS = {
  concept: "We partnered with Locus Architecture to bring their vision to life. The mural guides your eyes upward as soon as you enter — charting the path of the river across the ceiling, inspired by real water systems.",
  
  materials: "We tested a specific diluted orange stain to preserve the natural grain while making the water pathways visible. It was all done by hand, using a repeatable method with stencils for precision.",
  
  execution: "Working 30 feet up had its challenges — we even had to adjust for gusts of wind coming off the reservoir. But we built a process that kept the results consistent from start to finish.",
  
  community: "It's more than a mural — it's a moment of reflection. Visitors are reminded of how vast and connected our environment is. The pavilion itself is dedicated to Richard Samuelson, a local advocate for community spaces.",
  
  link: "Totally — you can see photos and more details about that project here:\n👉 https://www.clubhausagency.com/projects/1ZmOoZGUuZps8xYHs95Peh\nLet me know if you're thinking about something similar — I'd love to hear your idea."
};

export function shouldShareMuralDetail(
  userMessage: string, 
  state: MuralConversationState
): { shouldShare: boolean; detail?: string; newState: MuralConversationState } {
  const messageLower = userMessage.toLowerCase();
  const newState = { ...state, conversationCount: state.conversationCount + 1 };
  
  // Check for interest indicators
  const interestIndicators = [
    'tell me more', 'more details', 'what else', 'interesting', 'cool', 'nice',
    'sounds good', 'that sounds', 'impressive', 'awesome', 'great', 'love that',
    'concept', 'vision', 'architecture', 'locus', 'river', 'water', 'ceiling',
    'materials', 'stain', 'wood', 'grain', 'hand', 'stencils', 'process',
    'execution', 'challenges', 'wind', 'reservoir', 'height', '30 feet',
    'community', 'reflection', 'environment', 'richard samuelson', 'pavilion',
    'website', 'site', 'link', 'url', 'check it out', 'see it', 'photos'
  ];
  
  const hasInterest = interestIndicators.some(indicator => messageLower.includes(indicator));
  
  // If user shows interest and we haven't shared concept details yet
  if (hasInterest && !state.hasSharedConcept) {
    newState.hasSharedConcept = true;
    return { shouldShare: true, detail: MURAL_DETAILS.concept, newState };
  }
  
  // If user mentions concept, vision, architecture, or water systems
  if ((messageLower.includes('concept') || messageLower.includes('vision') || messageLower.includes('architecture') || messageLower.includes('locus') || messageLower.includes('river') || messageLower.includes('water') || messageLower.includes('ceiling')) && !state.hasSharedConcept) {
    newState.hasSharedConcept = true;
    return { shouldShare: true, detail: MURAL_DETAILS.concept, newState };
  }
  
  // If user mentions materials, stain, wood, or process
  if ((messageLower.includes('materials') || messageLower.includes('stain') || messageLower.includes('wood') || messageLower.includes('grain') || messageLower.includes('hand') || messageLower.includes('stencils') || messageLower.includes('process')) && !state.hasSharedMaterials) {
    newState.hasSharedMaterials = true;
    return { shouldShare: true, detail: MURAL_DETAILS.materials, newState };
  }
  
  // If user mentions execution, challenges, height, or wind
  if ((messageLower.includes('execution') || messageLower.includes('challenges') || messageLower.includes('wind') || messageLower.includes('reservoir') || messageLower.includes('height') || messageLower.includes('30 feet')) && !state.hasSharedExecution) {
    newState.hasSharedExecution = true;
    return { shouldShare: true, detail: MURAL_DETAILS.execution, newState };
  }
  
  // If user mentions community, reflection, environment, or Richard
  if ((messageLower.includes('community') || messageLower.includes('reflection') || messageLower.includes('environment') || messageLower.includes('richard') || messageLower.includes('samuelson') || messageLower.includes('pavilion')) && !state.hasSharedCommunity) {
    newState.hasSharedCommunity = true;
    return { shouldShare: true, detail: MURAL_DETAILS.community, newState };
  }
  
  // If user asks for link or wants to see the project
  if ((messageLower.includes('link') || messageLower.includes('url') || messageLower.includes('website') || messageLower.includes('site') || messageLower.includes('check') || messageLower.includes('see') || messageLower.includes('photos')) && !state.hasSharedLink) {
    newState.hasSharedLink = true;
    return { shouldShare: true, detail: MURAL_DETAILS.link, newState };
  }
  
  // If conversation has progressed and user shows general interest, share next available detail
  if (hasInterest && state.conversationCount > 1) {
    if (!state.hasSharedConcept) {
      newState.hasSharedConcept = true;
      return { shouldShare: true, detail: MURAL_DETAILS.concept, newState };
    }
    if (!state.hasSharedMaterials) {
      newState.hasSharedMaterials = true;
      return { shouldShare: true, detail: MURAL_DETAILS.materials, newState };
    }
    if (!state.hasSharedExecution) {
      newState.hasSharedExecution = true;
      return { shouldShare: true, detail: MURAL_DETAILS.execution, newState };
    }
    if (!state.hasSharedCommunity) {
      newState.hasSharedCommunity = true;
      return { shouldShare: true, detail: MURAL_DETAILS.community, newState };
    }
    if (!state.hasSharedLink) {
      newState.hasSharedLink = true;
      return { shouldShare: true, detail: MURAL_DETAILS.link, newState };
    }
  }
  
  return { shouldShare: false, newState };
}

export function createMuralResponse(
  userMessage: string,
  state: MuralConversationState
): { response: string; newState: MuralConversationState } {
  const { shouldShare, detail, newState } = shouldShareMuralDetail(userMessage, state);
  
  if (shouldShare && detail) {
    return {
      response: detail,
      newState
    };
  }
  
  // Default response if no specific detail to share
  return {
    response: "What kind of mural or public art project are you thinking about?",
    newState
  };
} 