import { projectService } from './rfpService'
import { getContextualPersonalityPhrase } from './personalityPhrases'

export interface StrategicResponse {
  triggers: string[];
  response: string | ((userMessage: string, sessionId?: string) => string);
  followUp?: string | ((userMessage: string, sessionId?: string) => string);
  nextStep?: string; // For multi-step flows
  requiresContactInfo?: boolean; // Flag for project flows that need contact info first
}

// Add conversation state tracking to prevent repetitive responses
export interface ConversationState {
  lastStrategicResponse?: string;
  lastStrategicTrigger?: string;
  strategicResponseCount: number;
  lastResponseTime: number;
  userResponses: string[];
  hasIntroducedAI?: boolean; // Track if AI identity has been mentioned
  repeatedRequests: Map<string, number>; // Track how many times user asks for same thing
  lastUserRequest?: string; // Track the last request to detect repetition
  providedContext?: {
    hasCompanyName?: boolean;
    hasGoals?: boolean;
    hasTimeline?: boolean;
    hasBudget?: boolean;
    hasSignificantIntent?: boolean; // User has shared meaningful business context
  };
}

// Global conversation state tracker (in production, this should be session-based)
const conversationStates = new Map<string, ConversationState>();

export const STRATEGIC_RESPONSES: StrategicResponse[] = [
  // CASUAL TESTING/EXPLORATION
  {
    triggers: [
      "testing you out",
      "testing you",
      "just testing",
      "testing the bot",
      "testing this",
      "trying you out",
      "trying this out",
      "just trying",
      "exploring",
      "just exploring",
      "checking this out",
      "just checking",
      "seeing what you do",
      "what can you do",
      "what do you do",
      "tell me about you",
      "what are you",
      "who are you"
    ],
    response: "Thanks! I'm here to help with creative projects and marketing. What's your name?",
    followUp: "What kind of project are you thinking about?",
    requiresContactInfo: true,
    nextStep: "contact_info_collected"
  },
  // CASUAL NOTE-TAKING OFFER
  {
    triggers: [
      "ice cream cone logo",
      "logo thingy",
      "simple logo",
      "basic logo",
      "quick logo",
      "want a logo",
      "need a logo",
      "looking for logo",
      "want branding",
      "need branding",
      "looking for branding",
      "want website",
      "need website",
      "looking for website",
      "want web design",
      "need web design",
      "looking for web design",
      "want social media",
      "need social media",
      "looking for social media",
      "want marketing",
      "need marketing",
      "looking for marketing",
      "want graphic design",
      "need graphic design",
      "looking for graphic design",
      "want print design",
      "need print design",
      "looking for print design",
      "want business cards",
      "need business cards",
      "looking for business cards",
      "want brochures",
      "need brochures",
      "looking for brochures",
      "want flyers",
      "need flyers",
      "looking for flyers",
      "want packaging",
      "need packaging",
      "looking for packaging",
      "want illustration",
      "need illustration",
      "looking for illustration",
      "want animation",
      "need animation",
      "looking for animation",
      "want video",
      "need video",
      "looking for video",
      "want photography",
      "need photography",
      "looking for photography",
      "want content creation",
      "need content creation",
      "looking for content creation",
      "want copywriting",
      "need copywriting",
      "looking for copywriting",
      "want brand identity",
      "need brand identity",
      "looking for brand identity",
      "want visual identity",
      "need visual identity",
      "looking for visual identity",
      "want UI/UX",
      "need UI/UX",
      "looking for UI/UX",
      "want app design",
      "need app design",
      "looking for app design",
      "want mobile design",
      "need mobile design",
      "looking for mobile design",
      "want e-commerce",
      "need e-commerce",
      "looking for e-commerce",
      "want online store",
      "need online store",
      "looking for online store",
      "want digital marketing",
      "need digital marketing",
      "looking for digital marketing",
      "want email marketing",
      "need email marketing",
      "looking for email marketing",
      "want SEO",
      "need SEO",
      "looking for SEO",
      "want PPC",
      "need PPC",
      "looking for PPC",
      "want advertising",
      "need advertising",
      "looking for advertising",
      "want campaign",
      "need campaign",
      "looking for campaign",
      "want promotional materials",
      "need promotional materials",
      "looking for promotional materials",
      "want product design",
      "need product design",
      "looking for product design",
      "want consulting",
      "need consulting",
      "looking for consulting",
      "want strategy",
      "need strategy",
      "looking for strategy"
    ],
    response: function(userMessage: string) {
      // Check if we should offer to take notes based on the user's message
      if (projectService.shouldOfferToTakeNotes(userMessage)) {
        return projectService.generateNoteTakingOffer(userMessage);
      }
      // If not ready for note-taking, give a casual response
      return "Got it. If you want to get a formal proposal together later, just let me know.";
    },
    followUp: "What's your business name?",
    nextStep: "project_initiated"
  },
  // PROJECT ASSISTANCE FLOW
  {
    triggers: [
      "help with an RFP",
      "write a proposal",
      "submit a proposal", 
      "respond to an RFP",
      "draft a proposal",
      "create a bid",
      "need help with a proposal",
      "proposal assistance",
      "RFP help",
      "bid assistance",
      "proposal writing",
      "RFP response",
      "submit a bid",
      "create a proposal",
      "proposal support",
      "RFP support",
      "bid writing",
      "proposal development",
      "RFP development",
      "bid development"
    ],
    response: "Happy to help you walk through your project details! Let's start with a few questions to get clarity on your project.",
    followUp: "First, I'll need your contact information to get started. What's your name, email, and phone number?",
    requiresContactInfo: true,
    nextStep: "contact_info_collected"
  },
  {
    triggers: [
      "i need branding",
      "i want web design", 
      "we need development",
      "looking for marketing help",
      "need a website built",
      "want brand identity work",
      "need social media design",
      "looking for print design",
      "need digital marketing",
      "want content creation",
      "need graphic design work",
      "looking for logo design",
      "need brand design",
      "want visual identity",
      "need UI/UX work",
      "looking for app design",
      "need mobile design",
      "want e-commerce site",
      "need online store",
      "looking for advertising help",
      "need promotional materials",
      "want packaging design",
      "need product design",
      "looking for illustration work",
      "need animation",
      "want video production",
      "need photography",
      "looking for copywriting",
      "need content strategy",
      "want brand strategy",
      "need marketing strategy",
      "looking for creative direction",
      "need consulting help"
    ],
    response: "Got it. What's your business name?",
    nextStep: "business_name_collected"
  },
  {
    triggers: [
      "1 week",
      "2 weeks", 
      "3 weeks",
      "1 month",
      "2 months",
      "3 months",
      "Q1",
      "Q2", 
      "Q3",
      "Q4",
      "ASAP",
      "urgent",
      "rush",
      "quick turnaround",
      "fast",
      "soon",
      "immediately",
      "right away",
      "next week",
      "next month",
      "this quarter",
      "this year",
      "flexible timeline",
      "no rush",
      "take your time",
      "whenever",
      "open timeline"
    ],
    response: "Thanks! Do you already have a budget range or cap in mind?",
    nextStep: "budget_established"
  },
  {
    triggers: [
      "under $5k",
      "under $10k",
      "under $15k", 
      "under $20k",
      "under $25k",
      "under $30k",
      "under $50k",
      "under $100k",
      "$5k-$10k",
      "$10k-$20k",
      "$20k-$50k",
      "$50k-$100k",
      "$100k+",
      "no budget yet",
      "we're exploring",
      "flexible budget",
      "open budget",
      "depends on scope",
      "not sure yet",
      "still figuring out",
      "need to discuss",
      "budget to be determined",
      "TBD",
      "to be determined",
      "not set",
      "open to discussion",
      "negotiable",
      "reasonable",
      "fair",
      "competitive",
      "market rate",
      "standard rate",
      "hourly rate",
      "project rate",
      "flat rate",
      "retainer"
    ],
    response: "Understood. What outcomes or goals are you hoping this project achieves? (e.g., increased sales, better UX, new product launch, rebranding)",
    nextStep: "goals_established"
  },
  {
    triggers: [
      "increase sales",
      "better UX",
      "launch product",
      "rebrand",
      "improve conversion",
      "generate leads",
      "build awareness",
      "establish brand",
      "refresh brand",
      "modernize",
      "professional look",
      "better user experience",
      "user experience",
      "customer experience",
      "improve engagement",
      "increase traffic",
      "boost visibility",
      "competitive advantage",
      "market positioning",
      "brand recognition",
      "customer acquisition",
      "customer retention",
      "lead generation",
      "sales growth",
      "revenue increase",
      "market expansion",
      "product launch",
      "service launch",
      "new market entry",
      "digital transformation",
      "process improvement",
      "efficiency",
      "automation",
      "streamline",
      "optimize",
      "performance",
      "results",
      "ROI",
      "return on investment",
      "measurable results",
      "trackable outcomes",
      "success metrics",
      "KPIs",
      "key performance indicators"
    ],
    response: "Thanks for all the details! Would you like me to help you format this into a proposal document or keep it conversational for now?",
    nextStep: "proposal_format_choice"
  },
  {
    triggers: [
      "who's on your team",
      "who are your team members",
      "who works at clubhaus",
      "who runs clubhaus",
      "who owns clubhaus",
      "who are the founders",
      "who are your names",
      "what are your names",
      "who is on the team",
      "who are you guys",
      "who are you all",
      "who makes up the team",
      "who are the people at clubhaus",
      "who are the creatives",
      "who are the designers",
      "who are the developers",
      "who is sam",
      "who is noah",
      "who is darby",
      "who is liam",
      "tell me about the team",
      "introduce the team",
      "who are the core team",
      "who are the creative team"
    ],
    response: "Our core creative aces are:\n• Sam – CCO and co-founder\n• Noah – Developer and co-founder\n• Darby – Art & Design\n• Liam – Full Stack Developer\n\nWe collaborate as a tight-knit crew of creatives across strategy, branding, dev, and design.",
    followUp: "What kind of project are you thinking about?"
  },
  {
    triggers: [
      "do you know sam",
      "is sam on your team",
      "i worked with sam",
      "i worked with sam before",
      "sam from clubhaus",
      "sam at clubhaus",
      "sam works here",
      "sam is part of",
      "sam is on the team",
      "sam is with you",
      "sam is with clubhaus",
      "sam from your team",
      "sam at your company",
      "sam works with you",
      "sam is your",
      "sam is one of",
      "sam is a",
      "sam does",
      "sam handles",
      "sam leads",
      "sam manages",
      "sam runs",
      "sam owns",
      "sam founded",
      "sam started",
      "sam created",
      "sam built",
      "sam designed",
      "sam developed",
      "sam works",
      "sam handles",
      "sam takes care of",
      "sam is responsible for",
      "sam oversees",
      "sam directs",
      "sam guides",
      "sam helps",
      "sam assists",
      "sam supports",
      "sam collaborates",
      "sam partners",
      "sam works alongside",
      "sam works with",
      "sam works for",
      "sam works at",
      "sam is employed by",
      "sam is part of the",
      "sam is a member of",
      "sam belongs to",
      "sam is affiliated with",
      "sam is associated with",
      "sam is connected to",
      "sam is linked to",
      "sam is related to",
      "sam is involved with",
      "sam is engaged with",
      "sam is committed to",
      "sam is dedicated to",
      "sam is devoted to",
      "sam is loyal to",
      "sam is faithful to",
      "sam is true to",
      "sam is steadfast to",
      "sam is unwavering to",
      "sam is resolute to",
      "sam is determined to",
      "sam is focused on",
      "sam is concentrated on",
      "sam is centered on",
      "sam is fixed on",
      "sam is set on",
      "sam is bent on",
      "sam is intent on",
      "sam is keen on",
      "sam is eager for",
      "sam is enthusiastic about",
      "sam is excited about",
      "sam is passionate about",
      "sam is zealous about",
      "sam is fervent about",
      "sam is ardent about",
      "sam is vehement about",
      "sam is intense about",
      "sam is serious about"
    ],
    response: "Sam is our Chief Creative Officer and co-founder of Clubhaus. He leads strategy, branding, and creative direction across projects. If you've worked with us before, there's a good chance you've crossed paths with him.",
    followUp: "What kind of project are you thinking about?"
  },
  {
    triggers: [
      "are sam and noah related",
      "are sam! and noah related",
      "sam and noah brothers",
      "sam! and noah brothers"
    ],
    response: "Yep — they're brothers. They started Clubhaus together after moving to Minneapolis.",
    followUp: undefined
  },
  {
    triggers: [
      "are sam and darby dating",
      "is sam dating darby",
      "are darby and sam together",
      "what's the deal with sam and darby",
      "sam and darby relationship",
      "darby and sam relationship"
    ],
    response: "Ha! That's a fun question. Sam and Darby are just creative collaborators — though I'm sure they'd both appreciate the compliment on their chemistry!",
    followUp: undefined
  },
  {
    triggers: [
      "where are you located",
      "where are you based",
      "location",
      "address",
      "where is clubhaus"
    ],
    response: "We're based in Uptown Minneapolis.",
    followUp: undefined
  },
  {
    triggers: [
      "do you have an office",
      "do you have a studio",
      "office space",
      "studio space",
      "physical office",
      "workplace"
    ],
    response: "Kind of — we're more of a group of digital nomads. We work fluidly between coworking spaces, home studios, and wherever the creative energy flows.",
    followUp: undefined
  },
  {
    triggers: [
      "sam art background",
      "sam's art background",
      "sam! art background",
      "sam! art career",
      "sam art career"
    ],
    response: "Sam would say his art career started in the womb — literally. His mother was in art school while pregnant, so he's been surrounded by creativity since day one.",
    followUp: undefined
  },
  {
    triggers: [
      "darby accreditation",
      "darby credentials",
      "darby education",
      "darby degree",
      "darby bfa",
      "darby background"
    ],
    response: "Darby has a Bachelor of Fine Arts (BFA) and has been active in the art world from the start. She's experienced in social media, marketing, animation, murals, painting, and illustration.",
    followUp: undefined
  },
  {
    triggers: [
      "accreditation",
      "accreditations", 
      "certification",
      "certifications",
      "certified",
      "awards",
      "recognition",
      "clubhaus accreditations",
      "clubhaus certifications",
      "clubhaus awards",
      "what awards",
      "what certifications",
      "what accreditations",
      "tell me about clubhaus accreditations",
      "what are clubhaus accreditations",
      "clubhaus credentials",
      "clubhaus qualifications"
    ],
    response: "We're proud of our recognition and expertise. Clubhaus has won the Silver Award for Best Web Design and Bronze Award for Best Creative Services in Minnesota's Best Awards. Our team members have diverse accreditations including design certifications from Minneapolis College (MCTC), Bachelor of Fine Arts degrees, and specialized expertise in AI integration, development, and creative strategy.",
    followUp: "What's driving your need for a logo right now?"
  },
  {
    triggers: [
      "what membership plans do you offer",
      "do you offer subscriptions",
      "do you have packages or retainers",
      "membership plans",
      "subscription options",
      "retainer packages"
    ],
    response: "Our membership isn't your typical monthly plan. We offer discounted rates on our hourly cost depending on how closely we collaborate over time. If you're in it for the long haul, we make sure the numbers reflect that. Everything we do is based on actual hours worked, with occasional material or tech costs depending on the project.",
    followUp: "Want me to break that down further?"
  },
  {
    triggers: [
      "how much is a logo",
      "logo cost",
      "logo pricing",
      "logo price",
      "how much for a logo"
    ],
    response: "That really depends — how good do you want it to be? A quick logo with no real strategy can be pretty cheap. A well-crafted brand identity rooted in research, positioning, and storytelling is an investment — but it shows. I can walk you through both.",
    followUp: "Does that sound like what you're looking for?"
  },
  {
    triggers: [
      "how much is a website",
      "website cost",
      "website pricing",
      "website price",
      "how much for a website"
    ],
    response: "Depends on the build. Is this an informational site, a portfolio, something with e-commerce or bookings? Do you need a payment gateway, animations, a CMS, or a customer portal? I can give you a better idea once I know the functionality you're imagining.",
    followUp: "Should we dive into a specific option?"
  },
  {
    triggers: [
      "do you build ai chatbots",
      "ai chatbot",
      "chatbot services",
      "ai bot",
      "automation chatbot"
    ],
    response: "We do — but I'm curious, what are you thinking? Internal automation, customer support, lead gen? The use case really shapes how we'd build it out.",
    followUp: "What's the main goal you're trying to achieve?"
  },
  {
    triggers: [
      "what's different about your websites",
      "what makes your websites special",
      "what's unique about your websites",
      "website differentiator",
      "what sets your websites apart"
    ],
    response: "We focus on experiential design — making sites that feel less like a chore and more like a brand experience. Beautiful interfaces, intuitive flows, and unexpected delight. We want your customers to enjoy the process, not just complete the task.",
    followUp: "Is that the kind of experience you're looking for?"
  },
  {
    triggers: [
      "how much do you charge",
      "what are your rates",
      "pricing",
      "cost",
      "price",
      "rates"
    ],
    response: "We work on an hourly basis, with rates that adjust based on project scope and ongoing collaboration. No fixed packages — we believe in paying for actual work done, not arbitrary tiers. What kind of project are you thinking about?",
    followUp: "Should we talk about your specific needs?"
  },
  {
    triggers: [
      "brand identity",
      "branding",
      "brand design",
      "visual identity"
    ],
    response: "Yes, branding is something we can do. Want to walk through the basics together?",
    followUp: "What's your name?"
  },
  {
    triggers: [
      "social media",
      "social media design",
      "instagram",
      "facebook",
      "social content"
    ],
    response: "Yes, social media is something we can do. Want to talk through what you're looking for?",
    followUp: "Which platforms matter most to your audience?"
  },
  {
    triggers: [
      "marketing materials",
      "brochures",
      "flyers",
      "print design",
      "business cards"
    ],
    response: "Yes, marketing materials are something we can do. Want to talk through what you're looking for?",
    followUp: "What's the main goal for these materials?"
  },
  {
    triggers: [
      "brewery",
      "breweries",
      "beer",
      "brewing",
      "worked with breweries",
      "brewery experience",
      "brewery branding",
      "brewery website",
      "brewery design",
      "omni brewing",
      "beer branding",
      "beer website"
    ],
    response: "Yeah, actually! Omni Brewing was one of our favorite projects. We redesigned their website to match their handcrafted vibe — and built it to scale across all three of their locations. Want me to tell you more?",
    followUp: "What kind of brewery project are you thinking about?"
  },
  {
    triggers: [
      "mural",
      "murals",
      "public art",
      "large-scale installation",
      "large scale installation",
      "community art",
      "ceiling mural",
      "pavilion art",
      "outdoor art",
      "wall painting",
      "street art",
      "community spaces",
      "lake byllesby",
      "locus architecture"
    ],
    response: "Yeah! One of our favorite mural projects was painting the ceiling of a public pavilion at Lake Byllesby. It's a giant nature-inspired map of the local water systems, stained directly into the wood overhead. Want to hear more?",
    followUp: "What kind of mural or public art project are you thinking about?"
  },
  {
    triggers: [
      "packaging and launch strategy",
      "packaging launch strategy",
      "how do you approach packaging",
      "launch strategy",
      "packaging strategy",
      "product launch",
      "subscription box launch",
      "box launch"
    ],
    response: "Great question — both are huge for a subscription box like Cozy Crate. Would you like to dive into packaging first or the launch plan?",
    followUp: "What's your ideal launch timeline? And are there social channels you already plan to use?"
  },
  {
    triggers: [
      "creative direction",
      "brand strategy",
      "brand direction",
      "creative strategy",
      "brand positioning",
      "creative ideas",
      "design direction",
      "visual direction",
      "brand themes",
      "aesthetic direction"
    ],
    response: "Yes, that's something we can do. Want to walk through the basics together?",
    followUp: "What's your name?"
  },
  {
    triggers: [
      "they're called",
      "it's called",
      "my brand is called",
      "our brand is called",
      "the brand is called",
      "called",
      "brand name is",
      "company name is"
    ],
    response: (userMessage: string) => {
      // Extract the brand name from the message
      const brandNameMatch = userMessage.match(/(?:they're called|it's called|my brand is called|our brand is called|the brand is called|called|brand name is|company name is)\s+([A-Za-z\s]+)/i);
      if (brandNameMatch) {
        const brandName = brandNameMatch[1].trim();
        return `Got it — ${brandName}. What do you offer, or what are you hoping to create?`;
      }
      return "Got it. What do you offer, or what are you hoping to create?";
    },
    followUp: "What's your main goal for this project?"
  },
  {
    triggers: [
      "haha",
      "lol",
      "jk",
      "just kidding",
      "sarcasm",
      "sarcastic",
      "joking",
      "not really",
      "kidding"
    ],
    response: "Haha, got it. What are you actually working on?",
    followUp: "What's your main goal for this project?"
  },
  {
    triggers: [
      "thanks",
      "thank you",
      "appreciate it",
      "that's helpful",
      "got it",
      "ok",
      "okay",
      "sounds good",
      "perfect",
      "great"
    ],
    response: "You're welcome — we're here if you need us!",
    followUp: undefined
  },
  {
    triggers: [
      "aesthetic advice",
      "style suggestions",
      "visual direction",
      "brand direction",
      "tone suggestions",
      "color suggestions",
      "typography suggestions",
      "design advice",
      "creative direction",
      "brand vision",
      "envision for your brand"
    ],
    response: "Our design team can help explore those directions with you — I'll make sure they see your notes.",
    followUp: "What's your timeline for getting started?"
  },
  {
    triggers: [
      "business name",
      "company name",
      "brand name",
      "naming",
      "name ideas",
      "business name ideas",
      "company name ideas",
      "brand name ideas",
      "help with naming",
      "need a name",
      "want a name",
      "looking for a name"
    ],
    response: "Yes, naming is something we can do. Want to walk through the basics together?",
    followUp: "What's your name?"
  },
  // FAQ RESPONSES - Common pre-sale questions
  {
    triggers: [
      "do you offer ongoing support",
      "do you offer support",
      "ongoing support",
      "maintenance",
      "support after launch",
      "post-launch support",
      "website maintenance",
      "updates and maintenance"
    ],
    response: "Yes, we offer ongoing support for updates, design tweaks, and new collateral after launch — either hourly or on retainer.",
    followUp: "What kind of support are you thinking about?"
  },
  {
    triggers: [
      "what's your timeline",
      "whats your timeline",
      "timeline",
      "how long does it take",
      "project timeline",
      "when can we start",
      "delivery timeline",
      "typical timeline"
    ],
    response: "Timeline depends on the scope and complexity of your project. We'll work with you to create a customized project plan that meets your needs and timeline.",
    followUp: "What's your ideal timeline for this project?"
  },
  {
    triggers: [
      "what tools do you use",
      "do you use figma",
      "do you use adobe",
      "figma",
      "adobe creative suite",
      "design tools",
      "software tools"
    ],
    response: "Yes! Our team uses Figma for most web and UI work, and Adobe Creative Suite (Illustrator, Photoshop, InDesign) for branding and visual assets.",
    followUp: "Are you working with any specific tools or formats?"
  },
  // DIFFERENTIATION QUESTIONS
  {
    triggers: [
      "what makes clubhaus different",
      "what makes you different",
      "how are you different",
      "what sets you apart",
      "why choose clubhaus",
      "what's unique about clubhaus",
      "whats unique about clubhaus",
      "how do you stand out",
      "what's your competitive advantage",
      "whats your competitive advantage"
    ],
    response: "We stand out by combining high-end creative strategy with in-house development. You're not bouncing between teams — we handle everything from brand strategy to launch, with deep attention to both creativity and user experience.",
    followUp: "Are you thinking about rebranding or launching something new?"
  },
  // MARKETING SERVICES QUESTIONS
  {
    triggers: [
      "what sorts of marketing",
      "marketing or advertising services",
      "marketing partner",
      "marketing services",
      "advertising services",
      "what services do you provide",
      "what do you offer",
      "marketing help"
    ],
    response: "We're a full-service creative agency, so we offer a range of marketing services that can help you reach your goals. What's your current marketing situation - are you looking to refresh your brand, boost online presence, or drive more sales?",
    followUp: "What's driving your need for marketing support right now?"
  },
  // PROCESS QUESTIONS
  {
    triggers: [
      "explain your website design process",
      "website design process",
      "design process",
      "how do you design websites",
      "what's your process",
      "whats your process",
      "walk me through your process",
      "step by step process",
      "design methodology",
      "how do you approach logo design",
      "logo design process",
      "branding process",
      "how do you create brands"
    ],
    response: "Our design process has four main phases: Discovery (understand your goals, audience, and brand personality), Strategy (define direction and messaging), Design (our creative team explores concepts and visual directions), and Delivery (finalize assets and guidelines). We collaborate closely with you at each stage to ensure the final result reflects your vision.",
    followUp: "What specific deliverables are you looking for - logo, website, brand guidelines, or a combination?"
  },
  // PRICING QUESTIONS
  {
    triggers: [
      "how do you price",
      "pricing structure",
      "logo design pricing",
      "website pricing",
      "how much for a logo",
      "how much for a website",
      "logo vs website pricing",
      "pricing difference",
      "cost comparison"
    ],
    response: "We offer different packages to fit various project scopes and budgets. Our team will work with you to create a custom quote that fits your specific needs and goals.",
    followUp: "What specific deliverables are you looking for - logo, website, brand guidelines, or a combination?"
  },
  // MARKETING CAMPAIGN SUCCESS MEASUREMENT
  {
    triggers: [
      "how do you measure success",
      "measure the success",
      "campaign success",
      "marketing success",
      "measure marketing campaigns",
      "how do you track",
      "success metrics",
      "kpis",
      "roi measurement",
      "conversion tracking"
    ],
    response: "We measure success by tracking KPIs like engagement, conversions, traffic, and ROI — depending on your goals. We usually tie everything to a clear outcome so you can see what's working.",
    followUp: "Want help defining those goals?"
  },
  // SOCIAL MEDIA MARKETING
  {
    triggers: [
      "social media marketing",
      "social media help",
      "ad campaigns",
      "social media campaigns",
      "facebook ads",
      "instagram ads",
      "social ads",
      "digital advertising",
      "paid advertising",
      "social media strategy"
    ],
    response: "We can help with strategy, content, and creative for both. While we don't manage ad buys directly, we design ads that convert and work with your media team if needed.",
    followUp: "Are you planning a specific campaign?"
  },
  // DIGITAL MARKETING SERVICES
  {
    triggers: [
      "digital marketing",
      "content creation",
      "social media management",
      "content marketing",
      "digital advertising",
      "online marketing",
      "web marketing",
      "internet marketing"
    ],
    response: "Yes, we offer digital marketing, content creation, and social media strategy. We focus on creating content that builds your audience and drives action, rather than just posting for the sake of it.",
    followUp: "Which platforms matter most to your audience?"
  },
  // CAMPAIGN EXAMPLES
  {
    triggers: [
      "examples of successful campaigns",
      "campaign examples",
      "successful marketing campaigns",
      "show me examples",
      "what campaigns have you done",
      "campaign case studies",
      "marketing examples"
    ],
    response: "We've worked with a range of clients across industries, and I'd be happy to connect you with someone on our team to share relevant examples if you'd like.",
    followUp: "What type of campaign are you thinking about?"
  },
  // STRATEGY AND REPORTING
  {
    triggers: [
      "how do you handle strategy",
      "creative and reporting",
      "point person",
      "who is my contact",
      "strategy process",
      "reporting process",
      "project management"
    ],
    response: "Yes — you'll have a dedicated strategist as your point of contact, and we provide regular reports depending on the scope of work. We handle everything from initial strategy through final reporting.",
    followUp: "What's your ideal timeline for getting started?"
  },
  // PROCESS AND POINT PERSON QUESTIONS
  {
    triggers: [
      "what does your process look like",
      "process for new client",
      "do you start with strategy",
      "who is my main contact",
      "who is my point of contact",
      "main contact on your team",
      "point person",
      "who will i work with",
      "client process",
      "new client process"
    ],
    response: "We always start with strategy. Once we understand your goals, we build out a creative plan tied to those outcomes. You'll work directly with one of our strategists who coordinates everything — from kickoff to delivery.",
    followUp: "Want to tell me a bit about your brand?"
  },
  // CONTACT INFO COLLECTION
  {
    triggers: [
      "my name is",
      "my email is",
      "my phone is",
      "i'm",
      "i am",
      "call me",
      "this is",
      "email is",
      "phone is",
      "contact is"
    ],
    response: "Thanks! That gives us a solid starting point. Based on what you've shared, we can definitely help with your project goals. Would you like to start building that RFP together now, or would you prefer to chat with someone from our team first?",
    followUp: undefined
  },
  // CONTACT AND BUDGET COLLECTION
  {
    triggers: [
      "my name is",
      "my email is",
      "budget is",
      "budget of",
      "our budget",
      "my budget",
      "email me at",
      "contact me at",
      "you can email me",
      "you can reach me"
    ],
    response: "Perfect! That gives us everything we need to get started. With your budget and timeline in mind, we can definitely help optimize your ad performance and improve your website for lead generation. Would you prefer to start with updating your Facebook strategy or explore other platforms like Google Ads?",
    followUp: undefined
  },
  // MARKETING FOR SMALL BUSINESSES
  {
    triggers: [
      "do you do marketing stuff",
      "marketing stuff for small businesses",
      "do you do facebook ads",
      "facebook ads",
      "fb ads",
      "social media ads",
      "online advertising"
    ],
    response: "We definitely do. Our team has experience helping small businesses grow their brand and online presence. What's your business name?",
    followUp: undefined
  },
  // FACEBOOK ADS SPECIFIC
  {
    triggers: [
      "do you do facebook ads",
      "facebook ad campaigns",
      "fb ad campaigns",
      "facebook advertising",
      "fb advertising"
    ],
    response: "We've run successful Facebook ad campaigns for our clients. How big is your marketing budget, and what are your goals for Facebook ads?",
    followUp: undefined
  },
  // AD PROBLEMS
  {
    triggers: [
      "ads aren't working",
      "not getting new customers",
      "ads not working",
      "facebook ads not working",
      "not getting results",
      "ads not converting"
    ],
    response: "That can be frustrating. Let's dive in a bit deeper. What do you think is going wrong with your ads - are you targeting the right audience, or maybe the messaging isn't resonating?",
    followUp: undefined
  },
  // CASUAL BUDGET RESPONSES
  {
    triggers: [
      "haven't really set a budget",
      "no budget yet",
      "not sure about budget",
      "just want more calls",
      "just want more leads",
      "not a big company"
    ],
    response: "Got it. What kinds of jobs are you hoping to book more of through your site — yard cleanups, snow removal, that kind of thing?",
    followUp: undefined
  },
  // LOCAL BUSINESS SERVICES
  {
    triggers: [
      "landscaping",
      "yard cleanup",
      "snow removal",
      "local homeowners",
      "more calls from local",
      "local leads",
      "landscape services"
    ],
    response: "We've had success with local businesses like yours using a mix of targeted online advertising and search engine optimization (SEO) to drive more local leads. I can also walk you through some quick win strategies like optimizing your website for local search, building a lead magnet to capture potential customers' contact info, and creating a sense of urgency with limited-time offers. Want me to send over a quick list of high-impact ideas to get more local calls — or would you rather jump into a full strategy chat?",
    followUp: undefined
  },
  // NON-BUSINESS QUESTIONS
  {
    triggers: [
      "why is the sky blue",
      "what is the meaning of life",
      "tell me a joke",
      "what is your favorite color",
      "how are you",
      "what time is it",
      "what is the weather",
      "who is the president",
      "what is 2+2",
      "can you help me with homework",
      "what is the definition of",
      "how do you spell",
      "what is the population of",
      "what is the capital of",
      "how do you make coffee",
      "how do you cook",
      "what is the best",
      "what is the difference between",
      "how do you say",
      "what is the formula for",
      "how do you solve",
      "what is the answer to",
      "can you explain",
      "what does this mean",
      "how do you pronounce",
      "what is the origin of",
      "how do you measure",
      "what is the history of",
      "how do you make",
      "what is the process for",
      "how do you build",
      "what is the purpose of",
      "how do you create",
      "what is the function of",
      "how do you design",
      "what is the structure of",
      "how do you organize",
      "what is the method for",
      "how do you approach",
      "what is the technique for",
      "how do you handle",
      "what is the strategy for",
      "how do you manage",
      "what is the system for",
      "how do you plan",
      "what is the approach to",
      "how do you structure",
      "what is the framework for",
      "how do you develop",
      "what is the methodology for"
    ],
    response: "I'm focused on helping with business and marketing questions. Is there anything I can help you with regarding your brand, website, or marketing?",
    followUp: undefined
  },
  // PRICING QUESTIONS
  {
    triggers: [
      "hourly rate",
      "hourly rates",
      "how much do you charge",
      "what do you charge",
      "pricing",
      "rates",
      "cost",
      "price",
      "budget",
      "how much",
      "what's your rate",
      "whats your rate",
      "how much per hour",
      "hourly pricing",
      "design rates",
      "logo pricing",
      "website pricing",
      "branding pricing",
      "design cost",
      "logo cost",
      "website cost",
      "branding cost",
      "concepts",
      "revision rounds",
      "revisions included",
      "bundled services",
      "small business package",
      "package pricing"
    ],
    response: "Our hourly rate is $150/hour for design and development work. We offer different packages to fit various project scopes and budgets. Our team will work with you to create a custom quote that fits your specific needs and goals. Logo design includes 2-3 initial concepts with 2 rounds of revisions. Timeline varies based on project scope and complexity.",
    followUp: "What specific deliverables are you looking for - logo, website, brand guidelines, or a combination?"
  },
  // ESCALATION FOR REPEATED REQUESTS
  {
    triggers: [
      "i've asked",
      "ive asked",
      "asked multiple times",
      "asked several times",
      "asked again",
      "still waiting",
      "haven't answered",
      "havent answered",
      "ignoring my question",
      "not answering",
      "repeatedly asked",
      "asked five times",
      "asked four times",
      "asked three times",
      "asked twice",
      "standard business practice",
      "cannot move forward",
      "need this information",
      "essential for my budget",
      "cannot evaluate",
      "look elsewhere"
    ],
    response: "You're absolutely right - I should have provided that information earlier. Thanks for your patience. We offer different packages to fit various project scopes and budgets. Our team will work with you to create a custom quote that fits your specific needs and goals. How can I help you move forward with your project?",
    followUp: "Would you like to discuss your specific project scope?"
  },
  // READY TO MOVE FORWARD
  {
    triggers: [
      "that sounds good",
      "sounds good",
      "that works",
      "perfect",
      "great",
      "awesome",
      "what do you need to get started",
      "what do you need from me",
      "how do we start",
      "let's do it",
      "lets do it",
      "i'm interested",
      "im interested",
      "ready to move forward",
      "ready to start",
      "what's next",
      "whats next",
      "next steps"
    ],
    response: function(userMessage: string, sessionId?: string) {
      const state = conversationStates.get(sessionId || 'default');
      const context = state?.providedContext;
      
      // For first exchanges, be more conversational and less formal
      const isFirstExchange = !context || (!context.hasSignificantIntent && !context.hasGoals && !context.hasTimeline);
      
      if (isFirstExchange) {
        return "Perfect! Let's start by understanding your project better. What's the main goal you're trying to achieve?";
      } else {
        return "Great! I can help walk you through building out your project details. Let me recap what we've covered so far and then we can fill in the remaining details to give our team everything they need for a comprehensive proposal.";
      }
    },
    followUp: function(userMessage: string, sessionId?: string) {
      const state = conversationStates.get(sessionId || 'default');
      const context = state?.providedContext;
      
      // For first exchanges, ask about goals instead of budget
      const isFirstExchange = !context || (!context.hasSignificantIntent && !context.hasGoals && !context.hasTimeline);
      
      if (isFirstExchange) {
        return "What's your biggest challenge right now?";
      } else {
        return "What's your budget range for this project? That helps us tailor the right approach and service recommendations.";
      }
    }
  },
  // CONTACT INFO REQUESTS
  {
    triggers: [
      "contact info",
      "email address",
      "how do i reach you",
      "how can i contact you",
      "phone number",
      "get in touch",
      "reach out"
    ],
    response: "Absolutely! You can reach out to me directly or connect with our team anytime at support@clubhausagency.com. We're happy to keep the momentum going and answer any questions that come up.",
    followUp: "Is there anything else I can help clarify about your project?"
  },
  // AVOID GIVING DESIGN DIRECTION
  {
    triggers: [
      "what colors should i use",
      "what fonts work best",
      "design ideas",
      "visual suggestions",
      "color palette ideas",
      "font recommendations",
      "style suggestions",
      "design inspiration",
      "what would look good",
      "design direction",
      "visual direction",
      "creative ideas"
    ],
    response: "That's exactly the kind of creative exploration our design team loves to dive into during the discovery and strategy phases. They'll work with you to understand your brand personality, audience, and goals, then develop visual directions that feel authentic to your business. The creative direction comes from that collaborative process rather than assumptions upfront.",
    followUp: "What's most important to you - getting the brand strategy right first, or do you have specific business goals driving this rebrand?"
  },
  // BRAND PERSONALITY WITHOUT VISUAL DIRECTION
  {
    triggers: [
      "cozy but modern",
      "warm and inviting",
      "rustic and homemade",
      "modern and sleek",
      "sophisticated",
      "approachable",
      "professional but friendly",
      "fun and playful",
      "elegant",
      "minimalist"
    ],
    response: "That's great insight into the personality you're looking for. Our creative team will use that direction during the discovery phase to explore visual concepts that authentically represent that feeling. The specific colors, fonts, and visual elements come from understanding your audience and business goals, not from assumptions upfront.",
    followUp: "Who is your target audience, and what's the main goal for this rebrand?"
  },
  // SMART CONTEXT-AWARE RESPONSES
  {
    triggers: [
      "startup",
      "founder",
      "launching",
      "early stage",
      "building",
      "developing",
      "creating a platform",
      "new company",
      "just started"
    ],
    response: function(userMessage: string, sessionId?: string) {
      const state = conversationStates.get(sessionId || 'default');
      const context = state?.providedContext;
      
      // For first exchanges, be more conversational and less formal
      const isFirstExchange = !context || (!context.hasSignificantIntent && !context.hasGoals && !context.hasTimeline);
      
      if (isFirstExchange) {
        return "Absolutely — brand strategy and design are right in our wheelhouse. Sounds like a powerful niche! Can you tell me a bit about your vision? Are you starting from scratch, or do you have anything already in place (like a name, logo, or rough idea of your audience)?";
      } else if (context?.hasSignificantIntent && (context.hasGoals || context.hasTimeline)) {
        return "Sounds great — I can help walk you through building out your RFP based on what you've shared. Let me recap the key details we have so far and then we can fill in any gaps.";
      } else {
        return "Exciting! Early-stage startups are where we love to make an impact. What's the main goal you're trying to achieve with this launch?";
      }
    },
    followUp: function(userMessage: string, sessionId?: string) {
      const state = conversationStates.get(sessionId || 'default');
      const context = state?.providedContext;
      
      // For first exchanges, ask about their vision instead of challenges
      const isFirstExchange = !context || (!context.hasSignificantIntent && !context.hasGoals && !context.hasTimeline);
      
      if (isFirstExchange) {
        return "What's your biggest challenge right now?";
      } else if (context?.hasSignificantIntent) {
        return "What's the biggest challenge you're facing right now?";
      } else {
        return "Are you looking for brand identity, website, or both?";
      }
    }
  },
  // CONVERSATION END RESPONSES
  {
    triggers: [
      "I think I have what I need",
      "I have what I need",
      "that's all I need",
      "I'm good",
      "I'm done",
      "that's it",
      "thanks that's all",
      "thank you that's all",
      "I think I'm good",
      "I think that's it",
      "I think that's all",
      "that should be it",
      "that should be all",
      "I think that should be it",
      "I think that should be all"
    ],
    response: "Got it — your info's saved. We'll follow up soon. Appreciate you!",
    followUp: undefined
  }
];

export function findStrategicResponse(userMessage: string, sessionId?: string): StrategicResponse | null {
  const messageLower = userMessage.toLowerCase();
  
  // Get or create conversation state for this session
  const state = conversationStates.get(sessionId || 'default') || {
    lastStrategicResponse: undefined,
    lastStrategicTrigger: undefined,
    strategicResponseCount: 0,
    lastResponseTime: 0,
    userResponses: [],
    hasIntroducedAI: false,
    repeatedRequests: new Map<string, number>(),
    lastUserRequest: undefined,
    providedContext: {
      hasCompanyName: false,
      hasGoals: false,
      hasTimeline: false,
      hasBudget: false,
      hasSignificantIntent: false
    }
  };
  
  // Check if this is a non-business question that shouldn't trigger strategic responses
  const nonBusinessQuestions = [
    'why is the sky blue',
    'what is the meaning of life',
    'how do you make coffee',
    'what time is it',
    'what is the weather',
    'tell me a joke',
    'what is your favorite color',
    'how are you',
    'what is 2+2',
    'who is the president',
    'what is the capital of',
    'how do you cook',
    'what is the best',
    'can you help me with homework',
    'what is the definition of',
    'how do you spell',
    'what is the difference between',
    'how do you say',
    'what is the population of',
    'how do you calculate',
    'what is the formula for',
    'how do you solve',
    'what is the answer to',
    'can you explain',
    'what does this mean',
    'how do you pronounce',
    'what is the origin of',
    'how do you measure',
    'what is the history of',
    'how do you make',
    'what is the process for',
    'how do you build',
    'what is the purpose of',
    'how do you create',
    'what is the function of',
    'how do you design',
    'what is the structure of',
    'how do you organize',
    'what is the method for',
    'how do you approach',
    'what is the technique for',
    'how do you handle',
    'what is the strategy for',
    'how do you manage',
    'what is the system for',
    'how do you plan',
    'what is the approach to',
    'how do you structure',
    'what is the framework for',
    'how do you develop',
    'what is the methodology for'
  ];
  
  const isNonBusinessQuestion = nonBusinessQuestions.some(question => 
    messageLower.includes(question) || 
    (messageLower.includes('why') && !messageLower.includes('business') && !messageLower.includes('marketing') && !messageLower.includes('website') && !messageLower.includes('brand')) ||
    (messageLower.includes('what is') && !messageLower.includes('your') && !messageLower.includes('clubhaus') && !messageLower.includes('service')) ||
    (messageLower.includes('how do you') && !messageLower.includes('design') && !messageLower.includes('build') && !messageLower.includes('create') && !messageLower.includes('help'))
  );
  
  if (isNonBusinessQuestion) {
    console.log('🚫 Non-business question detected, skipping strategic responses:', messageLower);
    return null;
  }
  
  // Track repeated requests for escalation
  const currentRequest = messageLower;
  if (state.lastUserRequest && state.lastUserRequest === currentRequest) {
    const count = state.repeatedRequests.get(currentRequest) || 0;
    state.repeatedRequests.set(currentRequest, count + 1);
  } else {
    state.repeatedRequests.set(currentRequest, 1);
  }
  state.lastUserRequest = currentRequest;
  
  // Track provided context to avoid re-asking
  if (!state.providedContext) {
    state.providedContext = {
      hasCompanyName: false,
      hasGoals: false,
      hasTimeline: false,
      hasBudget: false,
      hasSignificantIntent: false
    };
  }
  
  // Detect company name
  if (messageLower.includes('company') || messageLower.includes('business') || messageLower.includes('startup') || 
      messageLower.includes('we are') || messageLower.includes('we\'re') || messageLower.includes('our') ||
      messageLower.match(/\b[A-Z][a-zA-Z]+ [A-Z][a-zA-Z]+\b/) || // Proper noun patterns like "LaunchLink"
      messageLower.includes('called') || messageLower.includes('named')) {
    state.providedContext.hasCompanyName = true;
  }
  
  // Detect goals
  if (messageLower.includes('goal') || messageLower.includes('want to') || messageLower.includes('looking to') ||
      messageLower.includes('need to') || messageLower.includes('hoping to') || messageLower.includes('trying to') ||
      messageLower.includes('launch') || messageLower.includes('grow') || messageLower.includes('increase') ||
      messageLower.includes('improve') || messageLower.includes('build') || messageLower.includes('create')) {
    state.providedContext.hasGoals = true;
  }
  
  // Detect timeline
  if (messageLower.includes('timeline') || messageLower.includes('deadline') || messageLower.includes('launch') ||
      messageLower.includes('weeks') || messageLower.includes('months') || messageLower.includes('soon') ||
      messageLower.includes('asap') || messageLower.includes('by') || messageLower.includes('before') ||
      messageLower.includes('after') || messageLower.includes('when')) {
    state.providedContext.hasTimeline = true;
  }
  
  // Detect budget context
  if (messageLower.includes('budget') || messageLower.includes('cost') || messageLower.includes('price') ||
      messageLower.includes('afford') || messageLower.includes('spend') || messageLower.includes('investment') ||
      messageLower.includes('$') || messageLower.includes('dollar') || messageLower.includes('tight') ||
      messageLower.includes('limited')) {
    state.providedContext.hasBudget = true;
  }
  
  // Detect significant intent (meaningful business context)
  if (userMessage.length > 50 && (
      state.providedContext.hasCompanyName || state.providedContext.hasGoals || 
      state.providedContext.hasTimeline || state.providedContext.hasBudget ||
      messageLower.includes('startup') || messageLower.includes('founder') ||
      messageLower.includes('launching') || messageLower.includes('building') ||
      messageLower.includes('developing') || messageLower.includes('creating'))) {
    state.providedContext.hasSignificantIntent = true;
  }
  
  // Check if user has asked for the same thing multiple times (escalation needed)
  const repeatCount = state.repeatedRequests.get(currentRequest) || 0;
  const needsEscalation = repeatCount >= 3 || 
    messageLower.includes('i\'ve asked') || 
    messageLower.includes('ive asked') ||
    messageLower.includes('asked multiple times') ||
    messageLower.includes('still waiting') ||
    messageLower.includes('haven\'t answered') ||
    messageLower.includes('ignoring my question');
  
  // Check for escalation responses first (highest priority when user is frustrated)
  if (needsEscalation) {
    for (const response of STRATEGIC_RESPONSES) {
      // Look for escalation response
      if (response.triggers.some(trigger => 
        trigger.includes('i\'ve asked') || 
        trigger.includes('ive asked') ||
        trigger.includes('asked multiple times') ||
        trigger.includes('still waiting') ||
        trigger.includes('haven\'t answered') ||
        trigger.includes('ignoring my question')
      )) {
        console.log('🚨 Escalation needed - user has asked multiple times for the same thing');
        
        // Update conversation state
        const escalationResponseText = typeof response.response === 'function' 
          ? response.response(userMessage, sessionId) 
          : response.response;
        state.lastStrategicResponse = escalationResponseText;
        state.lastStrategicTrigger = 'escalation';
        state.strategicResponseCount++;
        state.lastResponseTime = Date.now();
        state.userResponses.push(userMessage);
        
        conversationStates.set(sessionId || 'default', state);
        return response;
      }
    }
  }
  
  // Check for exact matches first (higher priority)
  for (const response of STRATEGIC_RESPONSES) {
    for (const trigger of response.triggers) {
      if (messageLower.includes(trigger.toLowerCase())) {
        // Check if this is a repetitive response (same trigger or same response text)
        const isRepetitiveTrigger = state.lastStrategicTrigger === trigger && 
                                  state.lastResponseTime > Date.now() - 30000; // 30 seconds
        const isRepetitiveResponse = state.lastStrategicResponse === response.response &&
                                   state.lastResponseTime > Date.now() - 60000; // 1 minute for exact response text
        
        // Check if user is responding to a previous question (not asking a new one)
        const isUserResponse = state.userResponses.length > 0 && 
                             (messageLower.includes('yes') || messageLower.includes('no') || 
                              messageLower.includes('thanks') || messageLower.includes('thank you') ||
                              messageLower.includes('ok') || messageLower.includes('okay') ||
                              messageLower.includes('sure') || messageLower.includes('yeah') ||
                              messageLower.includes('maybe') || messageLower.includes('not sure') ||
                              messageLower.includes('i dont know') || messageLower.includes('idk'));
        
        // Get response text for checks
        const responseText = typeof response.response === 'function' 
          ? response.response(userMessage, sessionId) 
          : response.response;
          
        // Check if this is an AI identity response and we've already introduced ourselves
        const isAIIdentityResponse = responseText.toLowerCase().includes('clubhaus ai assistant') || 
                                   responseText.toLowerCase().includes('i\'m the clubhaus');
        const hasAlreadyIntroduced = state.hasIntroducedAI && isAIIdentityResponse;
        
        // Additional check: if user is providing contact info, don't trigger AI identity
        const isProvidingContactInfo = messageLower.includes('@') || 
                                     messageLower.includes('email') ||
                                     messageLower.includes('phone') ||
                                     messageLower.includes('contact') ||
                                     (messageLower.includes('my') && (messageLower.includes('name') || messageLower.includes('email')));
        
        // Check if conversation has already started (user has asked questions)
        const conversationHasStarted = state.userResponses.length > 1 || state.strategicResponseCount > 0;
        const shouldSkipAIIdentity = conversationHasStarted && isAIIdentityResponse;
        
        // If this is repetitive or user is responding, skip this strategic response
        if (isRepetitiveTrigger || isRepetitiveResponse || isUserResponse || hasAlreadyIntroduced || isProvidingContactInfo || shouldSkipAIIdentity) {
          console.log('🔄 Skipping repetitive strategic response:', trigger, { isRepetitiveTrigger, isRepetitiveResponse, isUserResponse, hasAlreadyIntroduced, isProvidingContactInfo, shouldSkipAIIdentity });
          return null;
        }
        
        // Update conversation state
        state.lastStrategicResponse = responseText;
        state.lastStrategicTrigger = trigger;
        state.strategicResponseCount++;
        state.lastResponseTime = Date.now();
        state.userResponses.push(userMessage);
        
        // Mark if we've introduced AI identity
        if (isAIIdentityResponse) {
          state.hasIntroducedAI = true;
        }
        
        // Limit user responses history to prevent memory issues
        if (state.userResponses.length > 10) {
          state.userResponses = state.userResponses.slice(-5);
        }
        
        conversationStates.set(sessionId || 'default', state);
        return response;
      }
    }
  }
  
  // Check for pricing-related keywords that should trigger strategic responses
  const pricingKeywords = ['cost', 'price', 'pricing', 'rate', 'rates', 'how much', 'budget'];
  const hasPricingKeyword = pricingKeywords.some(keyword => messageLower.includes(keyword));
  
  if (hasPricingKeyword) {
    // Find the most relevant strategic response for pricing questions
    const pricingResponses = STRATEGIC_RESPONSES.filter(response => 
      response.triggers.some(trigger => 
        trigger.includes('cost') || trigger.includes('price') || trigger.includes('rate')
      )
    );
    
    if (pricingResponses.length > 0) {
      const response = pricingResponses[0];
      
      // Check if this is repetitive
      const isRepetitive = state.lastStrategicTrigger && 
                          state.lastStrategicTrigger.includes('cost') && 
                          state.lastResponseTime > Date.now() - 30000;
      
      if (isRepetitive) {
        console.log('🔄 Skipping repetitive pricing response');
        return null;
      }
      
      // Update conversation state
      const responseText = typeof response.response === 'function' 
        ? response.response(userMessage, sessionId) 
        : response.response;
      state.lastStrategicResponse = responseText;
      state.lastStrategicTrigger = 'pricing';
      state.strategicResponseCount++;
      state.lastResponseTime = Date.now();
      state.userResponses.push(userMessage);
      
      conversationStates.set(sessionId || 'default', state);
      return response;
    }
  }
  
  // Update conversation state even when no strategic response is found
  state.userResponses.push(userMessage);
  if (state.userResponses.length > 10) {
    state.userResponses = state.userResponses.slice(-5);
  }
  conversationStates.set(sessionId || 'default', state);
  
  return null;
}

export function formatStrategicResponse(response: StrategicResponse, userMessage?: string, sessionId?: string): string {
  let formattedResponse: string;
  
  if (typeof response.response === 'function') {
    formattedResponse = response.response(userMessage || '', sessionId);
  } else {
    formattedResponse = response.response;
  }
  
  if (response.followUp) {
    let followUpText: string;
    if (typeof response.followUp === 'function') {
      followUpText = response.followUp(userMessage || '', sessionId);
    } else {
      followUpText = response.followUp;
    }
    formattedResponse += `\n\n${followUpText}`;
  }
  
  // Optionally enhance with personality phrase (only for certain response types)
  if (userMessage) {
    // Simple tone detection for strategic responses
    const messageLower = userMessage.toLowerCase();
    const isSerious = ['error', 'bug', 'problem', 'issue', 'complaint', 'refund'].some(keyword => messageLower.includes(keyword));
    const isFun = ['haha', 'lol', 'jk', '😊', '😄', '😂'].some(keyword => messageLower.includes(keyword));
    
    const conversationTone: 'casual' | 'formal' | 'serious' | 'fun' = isSerious ? 'serious' : isFun ? 'fun' : 'casual';
    const responseType: 'intro' | 'confirmation' | 'follow-up' | 'sign-off' | 'general' = 'general';
    
    formattedResponse = enhanceResponseWithPersonality(formattedResponse, userMessage, responseType, conversationTone);
  }
  
  return formattedResponse;
}

// Add function to clear conversation state (useful for new conversations)
export function clearConversationState(sessionId: string): void {
  conversationStates.delete(sessionId);
}

// Add function to get conversation state for debugging
export function getConversationState(sessionId: string): ConversationState | undefined {
  return conversationStates.get(sessionId);
}

// Helper function to enhance strategic responses with personality phrases
export function enhanceResponseWithPersonality(
  response: string,
  userMessage: string,
  responseType: 'intro' | 'confirmation' | 'follow-up' | 'sign-off' | 'general',
  conversationTone: 'casual' | 'formal' | 'serious' | 'fun'
): string {
  const personalityPhrase = getContextualPersonalityPhrase(userMessage, responseType, conversationTone);
  
  if (!personalityPhrase) {
    return response;
  }
  
  // Check if response already contains personality phrases
  if (response.includes('jackpot') || response.includes('ace') || response.includes('card') || response.includes('deal')) {
    return response;
  }
  
  // Add the phrase at the end, before any follow-up questions
  const hasFollowUpQuestion = response.includes('?');
  
  if (hasFollowUpQuestion) {
    const lastQuestionIndex = response.lastIndexOf('?');
    const beforeQuestion = response.substring(0, lastQuestionIndex);
    const afterQuestion = response.substring(lastQuestionIndex);
    
    // Clean up any trailing punctuation and add the phrase naturally
    const cleanedBefore = beforeQuestion.trim().replace(/[.!]+$/, '');
    return `${cleanedBefore}. ${personalityPhrase}${afterQuestion}`;
  } else {
    return `${response} ${personalityPhrase}.`;
  }
} 