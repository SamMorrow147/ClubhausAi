# RFP Pivot Implementation

## Overview
This implementation adds a natural and friendly response that pivots users from basic project descriptions into building a proper RFP (Request for Proposal). The pivot occurs around the 7th message in a conversation and offers to help users create a structured brief.

## Key Features

### 1. Strategic Response for Basic Project Descriptions
- **Location**: `lib/responses.ts`
- **Trigger**: Basic project descriptions like "ice cream cone logo", "website", "branding", etc.
- **Response**: Friendly offer to walk through a quick RFP
- **Follow-up**: Starts with business name collection

### 2. 7th Message Pivot Logic
- **Location**: `app/api/chat/route.ts`
- **Trigger**: 7th bot message in conversation
- **Condition**: User provides basic project description (not already in RFP flow)
- **Response**: "Got it — want to walk through a few quick questions so we can get the right info over to the design team? No pressure — just takes a minute."

### 3. Follow-up Logic for Yes/No Responses
- **Yes Response**: Starts RFP flow with "What's the name of your business?"
- **No Response**: "Thanks! If you ever want to turn this into a more formal brief or RFP, just say the word—I've got your back."

## Implementation Details

### Message Counting
- Uses existing `botMessageCount` tracking
- 7th message = `botMessageCount === 6`
- Checks for basic project descriptions vs. simple responses

### RFP Flow Integration
- Integrates with existing `rfpService`
- Starts RFP flow when user agrees
- Maintains conversation state

### Response Detection
- Detects yes/no responses using keyword matching
- Handles variations: "yes", "yeah", "sure", "okay", "ok"
- Handles declines: "no", "not", "maybe later", "not right now"

## Usage Examples

### Scenario 1: Basic Project Description
**User**: "I want an ice cream cone logo thingy"
**Bot**: "Got it — want to walk through a few quick questions so we can get the right info over to the design team? No pressure — just takes a minute."

### Scenario 2: User Agrees
**User**: "Yes, that sounds good"
**Bot**: "Great! What's the name of your business?"

### Scenario 3: User Declines
**User**: "Not right now"
**Bot**: "Thanks! If you ever want to turn this into a more formal brief or RFP, just say the word—I've got your back."

## Technical Implementation

### Files Modified
1. `lib/responses.ts` - Added new strategic response for basic project descriptions
2. `app/api/chat/route.ts` - Added 7th message pivot logic and follow-up handling

### Key Functions
- `findStrategicResponse()` - Detects basic project descriptions
- `rfpService.startRFPFlow()` - Initiates RFP process
- Message counting and response detection logic

### Error Handling
- Graceful fallback if RFP service unavailable
- Continues normal conversation flow if pivot conditions not met
- Logs all RFP pivot interactions for debugging

## Testing
The implementation has been tested and builds successfully. The RFP pivot will trigger:
- Around the 7th message in a conversation
- When user provides a basic project description
- When not already in an RFP flow
- When the description is substantial (not just "thanks" or "ok")

## Future Enhancements
- Could add more sophisticated project description detection
- Could add timing-based triggers (e.g., after 5 minutes of conversation)
- Could add industry-specific RFP templates
- Could add A/B testing for different pivot messages 