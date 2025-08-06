// Casino- and card-themed personality phrases for the Clubhaus AI assistant
// These are optional phrases that may be used occasionally to add flavor to responses
// DO NOT treat these as required or mandatory in any message
// Only include them when the tone is appropriate (fun, casual, supportive)
// Avoid using them in serious, apologetic, or sensitive conversations (e.g. bugs, complaints, refunds)
// Limit to 1 per conversation segment (intro, confirmation, follow-up, sign-off)
// The assistant should continue using clear, helpful, friendly language as the primary voice — these phrases are optional spice

export const CARD_PHRASES = {
  classicSayings: [
    "Big deal",
    "Ace up our sleeve",
    "In the cards",
    "Play your cards right",
    "All in",
    "Wild card",
    "High roller",
    "Double down",
    "Ante up",
    "Full house",
    "Royal flush",
    "Safe bet",
    "Raise the stakes",
    "On the table",
    "A sure thing",
    "Card shark",
    "Stack the deck",
    "Shuffle things up",
    "Playing the long game",
    "Hitting the jackpot",
    "Playing it close to the vest",
    "Not our first hand",
    "A winning hand",
    "Going all out",
    "Worth the gamble"
  ],
  slotLanguage: [
    "Hit the jackpot",
    "Roll the dice",
    "Lucky streak",
    "Spin to win",
    "Bet on it",
    "Odds are good",
    "Jackpot vibes",
    "In your corner",
    "High-stakes support",
    "No need to hedge your bets",
    "We're on a hot streak",
    "All signs point to win",
    "Ready when the reels stop"
  ],
  confirmations: [
    "Cards are in motion",
    "We're laying it all on the table",
    "You're holding a winning hand",
    "Let's raise the stakes",
    "Your move — we'll back you up",
    "Deal me in",
    "We've got a full deck of ideas",
    "That's a solid bet",
    "Let's reshuffle and try again",
    "We'll play this one right",
    "Already ahead of the deal",
    "We're anteing up support",
    "Let's stack the odds in your favor",
    "You've got the aces — we're just here to help",
    "Putting our chips behind you",
    "Not a gamble — just great service"
  ],
  funOneLiners: [
    "Just a little card trick up our sleeve",
    "Big hand, big help",
    "Aces, not guesswork",
    "The only thing stacked is our knowledge",
    "We don't deal in maybes"
  ]
};

// Helper function to get a random phrase from a specific category
export function getRandomPhrase(category: keyof typeof CARD_PHRASES): string {
  const phrases = CARD_PHRASES[category];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// Helper function to get a random phrase from any category
export function getRandomPhraseFromAny(): string {
  const allCategories = Object.keys(CARD_PHRASES) as (keyof typeof CARD_PHRASES)[];
  const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)];
  return getRandomPhrase(randomCategory);
}

// Helper function to check if a response should include a personality phrase
export function shouldIncludePersonalityPhrase(
  userMessage: string,
  responseType: 'intro' | 'confirmation' | 'follow-up' | 'sign-off' | 'general',
  conversationTone: 'casual' | 'formal' | 'serious' | 'fun'
): boolean {
  // Don't use phrases in serious or formal contexts
  if (conversationTone === 'serious' || conversationTone === 'formal') {
    return false;
  }
  
  // Don't use phrases in the first message (intro)
  if (responseType === 'intro') {
    return false;
  }
  
  // Don't use phrases for sensitive topics
  const sensitiveKeywords = [
    'error', 'bug', 'problem', 'issue', 'complaint', 'refund', 'cancel', 'wrong',
    'broken', 'doesn\'t work', 'not working', 'failed', 'disappointed', 'unhappy'
  ];
  
  const hasSensitiveContent = sensitiveKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword)
  );
  
  if (hasSensitiveContent) {
    return false;
  }
  
  // Don't use phrases in goodbye/closing messages
  const goodbyeKeywords = [
    'goodbye', 'bye', 'see you', 'talk to you later', 'catch you later', 'take care',
    'have a good day', 'have a great day', 'thanks that\'s all', 'that\'s all i need',
    'i\'m good', 'i\'m done', 'that\'s it', 'got it', 'perfect', 'great', 'awesome',
    'sounds good', 'appreciate you', 'we\'ll follow up', 'follow up soon'
  ];
  
  const isGoodbyeMessage = goodbyeKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword)
  );
  
  if (isGoodbyeMessage) {
    return false;
  }
  
  // Use phrases more sparingly - only about 10% of the time (reduced from 15%)
  const shouldUse = Math.random() < 0.10;
  
  return shouldUse;
}

// Helper function to get an appropriate personality phrase based on context
export function getContextualPersonalityPhrase(
  userMessage: string,
  responseType: 'intro' | 'confirmation' | 'follow-up' | 'sign-off' | 'general',
  conversationTone: 'casual' | 'formal' | 'serious' | 'fun'
): string | null {
  if (!shouldIncludePersonalityPhrase(userMessage, responseType, conversationTone)) {
    return null;
  }
  
  // Choose category based on response type
  switch (responseType) {
    case 'intro':
      return getRandomPhrase('classicSayings');
    case 'confirmation':
      return getRandomPhrase('confirmations');
    case 'follow-up':
      return getRandomPhrase('slotLanguage');
    case 'sign-off':
      return getRandomPhrase('funOneLiners');
    case 'general':
    default:
      return getRandomPhraseFromAny();
  }
} 