# Strategic Response System

## Overview

The strategic response system provides context-rich, confident, and curiosity-driven responses to pricing and service-related questions. It replaces vague or generic replies with strategic messaging that aligns with Clubhaus's voice and approach.

## How It Works

1. **Trigger Detection**: User messages are checked against predefined trigger phrases
2. **Priority Override**: Strategic responses take priority over RAG (Retrieval-Augmented Generation) when triggered
3. **Curiosity-Driven**: All responses end with follow-up questions to encourage conversation
4. **Tone Consistency**: Responses maintain Clubhaus's confident, curious, and concise voice

## Response Categories

### 🔁 Membership & Pricing
- **Triggers**: "membership plans", "subscriptions", "packages", "retainers"
- **Response**: Explains hourly-based pricing with collaboration discounts
- **Follow-up**: "Want me to break that down further?"

### 💵 Logo & Brand Identity
- **Triggers**: "how much is a logo", "logo cost", "branding"
- **Response**: Differentiates between quick logos and strategic brand identity
- **Follow-up**: "Does that sound like what you're looking for?"

### 🌐 Website Development
- **Triggers**: "how much is a website", "website cost"
- **Response**: Asks about functionality and features before pricing
- **Follow-up**: "Should we dive into a specific option?"

### 🤖 AI Chatbot Services
- **Triggers**: "ai chatbot", "chatbot services", "automation"
- **Response**: Explores use case before discussing implementation
- **Follow-up**: "What's the main goal you're trying to achieve?"

### 🎨 Website Differentiation
- **Triggers**: "what's different about your websites", "what makes your websites special"
- **Response**: Emphasizes experiential design and user experience
- **Follow-up**: "Is that the kind of experience you're looking for?"

### 📱 Social Media & Marketing
- **Triggers**: "social media", "marketing materials", "print design"
- **Response**: Focuses on strategic storytelling and purposeful design
- **Follow-up**: Platform-specific or goal-oriented questions

### 🍺 Brewery Portfolio (Omni Brewing)
- **Triggers**: "brewery", "breweries", "beer", "brewing", "worked with breweries", "brewery experience", "brewery branding", "brewery website", "brewery design", "omni brewing", "beer branding", "beer website"
- **Initial Response**: "Yeah, actually! Omni Brewing was one of our favorite projects. We redesigned their website to match their handcrafted vibe — and built it to scale across all three of their locations. Want me to tell you more?"
- **Layered Details**: 
  - Multi-location structure
  - Brand personality (bear mascot)
  - Photography and visual storytelling
  - Micro-interactions and animations
  - Live site link: https://omnibrewing.com
- **Follow-up**: "What kind of brewery project are you thinking about?"

### 🎨 Mural & Public Art (Lake Byllesby)
- **Triggers**: "mural", "murals", "public art", "large-scale installation", "large scale installation", "community art", "ceiling mural", "pavilion art", "outdoor art", "wall painting", "street art", "community spaces", "lake byllesby", "locus architecture"
- **Initial Response**: "Yeah! One of our favorite mural projects was painting the ceiling of a public pavilion at Lake Byllesby. It's a giant nature-inspired map of the local water systems, stained directly into the wood overhead. Want to hear more?"
- **Layered Details**: 
  - Concept & collaboration with Locus Architecture
  - Materials & process (orange stain, stencils)
  - Execution details (30 feet up, wind challenges)
  - Community impact & Richard Samuelson dedication
  - Project link: https://www.clubhausagency.com/projects/1ZmOoZGUuZps8xYHs95Peh
- **Follow-up**: "What kind of mural or public art project are you thinking about?"

## Adding New Responses

To add a new strategic response:

1. **Edit `/lib/responses.ts`**
2. **Add to `STRATEGIC_RESPONSES` array**:
   ```typescript
   {
     triggers: ["trigger phrase 1", "trigger phrase 2"],
     response: "Your strategic response here...",
     followUp: "Your follow-up question here?"
   }
   ```

3. **Follow the tone guidelines**:
   - Keep responses under 80 words
   - Be confident and curious
   - End with a question
   - Avoid generic or vague language

## Implementation Details

- **Location**: `/lib/responses.ts`
- **Integration**: `/app/api/chat/route.ts`
- **Priority**: Strategic responses override RAG when triggered
- **Logging**: Console logs show when strategic responses are triggered

## Tone Guidelines

- **Confident**: No hedging or uncertainty
- **Curious**: Ask smart questions
- **Concise**: Under 80 words unless detail requested
- **Human**: Natural, not robotic
- **Strategic**: Focus on value and outcomes, not just features 