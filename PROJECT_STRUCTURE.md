# Clubhaus Bot Project Structure

This document explains the structured approach for managing project references in the Clubhaus AI bot.

## Overview

The bot uses a three-tier system for project references:

1. **Context Files** (`data/*.md`) - Detailed project information
2. **Trigger Scripts** (`data/project-triggers.json`) - When to reference projects
3. **Metadata Index** (`data/projects-index.json`) - Project organization

## File Structure

```
data/
├── clubhaus-knowledge.md          # Main knowledge base
├── twisted-pin.md                # Twisted Pin project details
├── project-triggers.json         # Trigger conditions
└── projects-index.json           # Project metadata
```

## Adding a New Project

### 1. Create the Context File

Create a new markdown file in `data/` with detailed project information:

```markdown
# Project Name – Brief Description

Detailed project overview and context...

## Key Highlights

- **Feature 1:** Description
- **Feature 2:** Description

## Voice & Tone

Project-specific voice and tone notes...

## Project Link

[View Full Project](https://link-to-project)
```

### 2. Add Trigger Script

Add a new entry to `data/project-triggers.json`:

```json
{
  "name": "Project Name – Brief Description",
  "tags": ["relevant", "tags", "here"],
  "trigger_phrases": [
    "we want to gamify our space",
    "designing for an arcade",
    "interactive signage"
  ],
  "response": {
    "text": "That reminds me of a project we did for [Project Name]...",
    "confidence_threshold": 0.7,
    "follow_up_questions": [
      "What kind of space are you looking to gamify?",
      "Are you thinking about interactive elements?"
    ]
  }
}
```

### 3. Update Metadata Index

Add project metadata to `data/projects-index.json`:

```json
{
  "id": "project-id",
  "title": "Project Name – Brief Description",
  "tags": ["relevant", "tags"],
  "link": "https://link-to-project",
  "source": "project-name.md",
  "category": "branding",
  "client_type": "entertainment",
  "key_techniques": ["technique1", "technique2"]
}
```

## Trigger System

The bot checks for project triggers in this order:

1. **Project Triggers** - Exact phrase matches
2. **Strategic Responses** - Pre-defined responses
3. **RAG Search** - Knowledge base search

## Testing

Use the test endpoint to verify triggers:

```bash
curl http://localhost:3007/api/test
```

## Example: Twisted Pin

The Twisted Pin project demonstrates the complete implementation:

- **Context**: `data/twisted-pin.md` - Detailed case study
- **Triggers**: `data/project-triggers.json` - Gamification triggers
- **Metadata**: `data/projects-index.json` - Project organization

## Best Practices

1. **Trigger Phrases**: Use natural language that clients would actually say
2. **Tags**: Include both specific and general terms
3. **Response**: Keep it conversational and include a call-to-action
4. **Follow-up Questions**: Guide the conversation naturally
5. **Metadata**: Use consistent categories and client types

## Categories

- `branding` - Complete brand identity and experience design
- `web` - Website design and development  
- `ai` - AI-powered tools and experiences
- `print` - Print and packaging design

## Client Types

- `entertainment` - Bars, restaurants, venues, entertainment spaces
- `retail` - Product brands, retail spaces, e-commerce
- `events` - Event branding and marketing
- `tech` - Technology companies and startups 