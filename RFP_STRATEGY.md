# RFP Strategy Implementation

## Overview

This implementation provides a structured flow for handling RFP (Request for Proposal) and proposal assistance requests. The system automatically detects when users need help with proposals and guides them through a step-by-step intake process.

## Key Features

### 1. Trigger Phrase Detection
The system automatically detects RFP-related phrases such as:
- "I need help with an RFP"
- "Can you help me write a proposal?"
- "I have a project I need to submit a bid for"
- "proposal assistance"
- "RFP help"
- "bid assistance"

### 2. Structured Flow
When triggered, the system presents users with a step-by-step intake process:

1. **Contact Information Collection**
   - Name, email, and phone number
   - Uses regex patterns to extract contact info from user messages
   - Validates that all required fields are provided

2. **Service Type Identification**
   - Identifies what type of service they need (branding, web design, development, marketing, etc.)
   - Supports comprehensive service categories

3. **Timeline Establishment**
   - Captures project timeline and deadlines
   - Handles various time formats (ASAP, Q1, Q2, specific weeks/months)

4. **Budget Discussion**
   - Collects budget range or constraints
   - Handles flexible budgets and "to be determined" scenarios

5. **Goals and Outcomes**
   - Identifies project goals and desired outcomes
   - Captures success metrics and KPIs

6. **Proposal Format Choice**
   - Offers to format into a proposal document or keep conversational
   - Generates a comprehensive summary

## Implementation Details

### Files Modified/Created

1. **`lib/responses.ts`**
   - Added RFP-specific strategic responses
   - Enhanced `StrategicResponse` interface with `nextStep` and `requiresContactInfo` properties
   - Added comprehensive trigger phrases for RFP detection

2. **`lib/rfpService.ts`** (New)
   - Complete RFP flow management service
   - Contact information extraction using regex
   - Multi-step flow state management
   - Proposal summary generation

3. **`app/api/chat/route.ts`**
   - Integrated RFP service into chat flow
   - Added RFP flow handling before strategic responses
   - Maintains session state for multi-step conversations

4. **`app/test-rfp/page.tsx`** (New)
   - Test interface for demonstrating RFP flow
   - Automated test sequence
   - Manual testing capabilities

### Flow States

The RFP service manages conversation state through these steps:

1. `contact_info` - Collecting name, email, phone
2. `service_type` - Identifying service category
3. `timeline` - Establishing project timeline
4. `budget` - Discussing budget constraints
5. `goals` - Defining project goals
6. `proposal_format` - Choosing output format
7. `complete` - Flow finished, summary generated

### Contact Information Extraction

The system uses regex patterns to extract:
- **Email**: Standard email format validation
- **Phone**: Multiple formats (555-123-4567, (555) 123-4567, etc.)
- **Name**: Extracted from context or user input

### Service Categories Supported

- Branding & Brand Identity
- Web Design & Development
- Digital Marketing
- Social Media
- Print Design
- UI/UX Design
- E-commerce
- Content Creation
- SEO & PPC
- Video Production
- And many more...

## Usage Examples

### Triggering the Flow
```
User: "I need help with an RFP"
Bot: "Happy to help you walk through your RFP! Let's start with a few questions to get clarity on your project. First, I'll need your contact information to get started. What's your name, email, and phone number?"
```

### Contact Information Collection
```
User: "My name is John Smith, john@example.com, 555-123-4567"
Bot: "Great! What type of service or product are you requesting a proposal for?"
```

### Service Type Identification
```
User: "We need a new website"
Bot: "Got it. What's your ideal timeline or deadline for this project?"
```

### Timeline Discussion
```
User: "ASAP"
Bot: "Thanks! Do you already have a budget range or cap in mind?"
```

### Budget Discussion
```
User: "Under $10k"
Bot: "Understood. What outcomes or goals are you hoping this project achieves? (e.g., increased sales, better UX, new product launch, rebranding)"
```

### Goals Definition
```
User: "Increase sales and improve user experience"
Bot: "Thanks for all the details! Would you like me to help you format this into a proposal document or keep it conversational for now?"
```

### Final Summary
The system generates a comprehensive summary including:
- Contact information
- Project details
- Timeline and budget
- Goals and outcomes
- Next steps for follow-up

## Testing

Visit `/test-rfp` to test the complete RFP flow with an automated sequence or manual testing.

## Future Enhancements

1. **Integration with CRM** - Connect collected data to customer relationship management
2. **Proposal Templates** - Generate actual proposal documents
3. **Follow-up Automation** - Automatic email notifications to team members
4. **Analytics** - Track conversion rates and flow completion
5. **Custom Triggers** - Allow clients to customize trigger phrases
6. **Multi-language Support** - Extend to other languages
7. **Advanced Validation** - Enhanced contact information validation
8. **Integration with Project Management** - Connect to project tracking systems

## Technical Notes

- Session-based state management ensures conversation continuity
- Regex-based contact extraction handles multiple formats
- Comprehensive trigger phrases cover various ways users might request proposal help
- Integration with existing strategic response system maintains consistency
- Non-blocking operations ensure fast response times
- Error handling prevents flow interruption 