export interface BreweryConversationState {
  hasMentionedOmni: boolean;
  hasSharedMultiLocation: boolean;
  hasSharedBrandPersonality: boolean;
  hasSharedPhotography: boolean;
  hasSharedMicroInteractions: boolean;
  hasSharedLink: boolean;
  conversationCount: number;
}

export const BREWERY_DETAILS = {
  multiLocation: "The site lets users choose their location up front — Maple Grove, Rosemount, or Victoria — and the experience shifts based on where they land. It's clean, scalable, and easy for their team to update.",
  
  brandPersonality: "We brought their iconic bear mascot to life with subtle animations throughout the site. It's playful and adds a ton of personality.",
  
  photography: "We art-directed a top-down photo style for their pizzas and beers — looks editorial and makes the food seriously craveable.",
  
  microInteractions: "There are fun little animations too — like a pizza icon getting a bite taken out of it, or a beer glass filling up on hover. Little details that reward interaction.",
  
  link: "You can check out the live site here: https://omnibrewing.com"
};

export function shouldShareBreweryDetail(
  userMessage: string, 
  state: BreweryConversationState
): { shouldShare: boolean; detail?: string; newState: BreweryConversationState } {
  const messageLower = userMessage.toLowerCase();
  const newState = { ...state, conversationCount: state.conversationCount + 1 };
  
  // Check for interest indicators
  const interestIndicators = [
    'tell me more', 'more details', 'what else', 'interesting', 'cool', 'nice',
    'sounds good', 'that sounds', 'impressive', 'awesome', 'great', 'love that',
    'location', 'locations', 'maple grove', 'rosemount', 'victoria',
    'bear', 'mascot', 'animation', 'animations',
    'photo', 'photography', 'pictures', 'images', 'visual',
    'interaction', 'interactions', 'animation', 'hover', 'fun',
    'website', 'site', 'link', 'url', 'check it out', 'see it'
  ];
  
  const hasInterest = interestIndicators.some(indicator => messageLower.includes(indicator));
  
  // If user shows interest and we haven't shared multi-location details yet
  if (hasInterest && !state.hasSharedMultiLocation) {
    newState.hasSharedMultiLocation = true;
    return { shouldShare: true, detail: BREWERY_DETAILS.multiLocation, newState };
  }
  
  // If user mentions locations or multi-site functionality
  if ((messageLower.includes('location') || messageLower.includes('site') || messageLower.includes('multiple')) && !state.hasSharedMultiLocation) {
    newState.hasSharedMultiLocation = true;
    return { shouldShare: true, detail: BREWERY_DETAILS.multiLocation, newState };
  }
  
  // If user mentions brand, personality, or mascot
  if ((messageLower.includes('brand') || messageLower.includes('personality') || messageLower.includes('mascot') || messageLower.includes('bear')) && !state.hasSharedBrandPersonality) {
    newState.hasSharedBrandPersonality = true;
    return { shouldShare: true, detail: BREWERY_DETAILS.brandPersonality, newState };
  }
  
  // If user mentions photos, visuals, or food
  if ((messageLower.includes('photo') || messageLower.includes('visual') || messageLower.includes('food') || messageLower.includes('pizza') || messageLower.includes('beer')) && !state.hasSharedPhotography) {
    newState.hasSharedPhotography = true;
    return { shouldShare: true, detail: BREWERY_DETAILS.photography, newState };
  }
  
  // If user mentions interactions, animations, or fun elements
  if ((messageLower.includes('interaction') || messageLower.includes('animation') || messageLower.includes('fun') || messageLower.includes('hover')) && !state.hasSharedMicroInteractions) {
    newState.hasSharedMicroInteractions = true;
    return { shouldShare: true, detail: BREWERY_DETAILS.microInteractions, newState };
  }
  
  // If user asks for link or wants to see the site
  if ((messageLower.includes('link') || messageLower.includes('url') || messageLower.includes('website') || messageLower.includes('site') || messageLower.includes('check') || messageLower.includes('see')) && !state.hasSharedLink) {
    newState.hasSharedLink = true;
    return { shouldShare: true, detail: BREWERY_DETAILS.link, newState };
  }
  
  // If conversation has progressed and user shows general interest, share next available detail
  if (hasInterest && state.conversationCount > 1) {
    if (!state.hasSharedMultiLocation) {
      newState.hasSharedMultiLocation = true;
      return { shouldShare: true, detail: BREWERY_DETAILS.multiLocation, newState };
    }
    if (!state.hasSharedBrandPersonality) {
      newState.hasSharedBrandPersonality = true;
      return { shouldShare: true, detail: BREWERY_DETAILS.brandPersonality, newState };
    }
    if (!state.hasSharedPhotography) {
      newState.hasSharedPhotography = true;
      return { shouldShare: true, detail: BREWERY_DETAILS.photography, newState };
    }
    if (!state.hasSharedMicroInteractions) {
      newState.hasSharedMicroInteractions = true;
      return { shouldShare: true, detail: BREWERY_DETAILS.microInteractions, newState };
    }
    if (!state.hasSharedLink) {
      newState.hasSharedLink = true;
      return { shouldShare: true, detail: BREWERY_DETAILS.link, newState };
    }
  }
  
  return { shouldShare: false, newState };
}

export function createBreweryResponse(
  userMessage: string,
  state: BreweryConversationState
): { response: string; newState: BreweryConversationState } {
  const { shouldShare, detail, newState } = shouldShareBreweryDetail(userMessage, state);
  
  if (shouldShare && detail) {
    return {
      response: detail,
      newState
    };
  }
  
  // Default response if no specific detail to share
  return {
    response: "What kind of brewery project are you thinking about?",
    newState
  };
} 