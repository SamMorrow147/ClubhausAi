# Personality Phrases Feature

## Overview

The Clubhaus AI assistant now has optional casino- and card-themed personality phrases that can add flavor to responses. These phrases are designed to be used sparingly and only in appropriate contexts.

## How It Works

### 1. Phrase Categories

The personality phrases are organized into four categories:

- **Classic Sayings**: Traditional card game phrases like "Ace up our sleeve," "In the cards," "All in"
- **Slot Language**: Casino-themed phrases like "Hit the jackpot," "Roll the dice," "Lucky streak"
- **Confirmations**: Supportive phrases like "Cards are in motion," "You're holding a winning hand"
- **Fun One-liners**: Brief, playful phrases like "Big hand, big help," "Aces, not guesswork"

### 2. Usage Rules

The phrases are used according to strict guidelines:

- **Frequency**: Only about 15% of responses include personality phrases
- **Context**: Only used in fun, casual, supportive conversations
- **Avoidance**: Never used in serious, formal, or sensitive contexts
- **Goodbye Messages**: Never used in closing/goodbye messages
- **Limitation**: Maximum 1 phrase per conversation segment
- **Natural Integration**: Phrases should feel natural, not forced

### 3. Context Detection

The system automatically detects:

- **Conversation Tone**: casual, formal, serious, or fun
- **Response Type**: intro, confirmation, follow-up, sign-off, or general
- **Sensitive Content**: errors, bugs, complaints, refunds, problems

### 4. Implementation

The feature is implemented in several places:

- **`lib/personalityPhrases.ts`**: Core phrase definitions and helper functions
- **`app/api/chat/route.ts`**: Integration with the main chat API
- **`lib/responses.ts`**: Enhancement of strategic responses

## Technical Details

### Helper Functions

- `getRandomPhrase(category)`: Gets a random phrase from a specific category
- `getRandomPhraseFromAny()`: Gets a random phrase from any category
- `shouldIncludePersonalityPhrase()`: Determines if a phrase should be included
- `getContextualPersonalityPhrase()`: Gets an appropriate phrase based on context

### Integration Points

1. **Main Chat API**: Phrases are added to AI responses after generation
2. **Strategic Responses**: Phrases can enhance predefined responses
3. **System Prompt**: AI is instructed on when and how to use phrases

### Tone Detection

The system detects conversation tone by analyzing:
- Serious keywords: error, bug, problem, issue, complaint, refund
- Formal keywords: sir, madam, please, kindly, thank you
- Fun keywords: haha, lol, jk, emojis, sarcasm

## Example Usage

### Appropriate Contexts
- User: "Haha, that sounds great! 😊"
- Response: "Absolutely! We've got a full deck of ideas for your project. What's your business name?"

### Inappropriate Contexts
- User: "I have a problem with my website"
- Response: "I'm sorry to hear that. Let me help you troubleshoot this issue." (No personality phrase)

- User: "Thanks, that's all I need!"
- Response: "Got it — your info's saved. We'll follow up soon. Appreciate you!" (No personality phrase)

## Configuration

The personality phrases can be easily modified by editing the `CARD_PHRASES` object in `lib/personalityPhrases.ts`. The usage frequency can be adjusted by changing the probability in `shouldIncludePersonalityPhrase()`.

## Testing

A test file `test-personality-phrases.js` is included to verify the functionality works correctly across different conversation contexts. 