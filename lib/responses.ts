export interface StrategicResponse {
  triggers: string[];
  response: string;
  followUp?: string;
  nextStep?: string; // For multi-step flows
  requiresContactInfo?: boolean; // Flag for RFP flows that need contact info first
}

export const STRATEGIC_RESPONSES: StrategicResponse[] = [
  // RFP/PROPOSAL ASSISTANCE FLOW
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
    response: "Happy to help you walk through your RFP! Let's start with a few questions to get clarity on your project.",
    followUp: "First, I'll need your contact information to get started. What's your name, email, and phone number?",
    requiresContactInfo: true,
    nextStep: "contact_info_collected"
  },
  {
    triggers: [
      "branding",
      "web design", 
      "development",
      "marketing",
      "event",
      "website",
      "brand identity",
      "social media",
      "print design",
      "digital marketing",
      "content creation",
      "graphic design",
      "logo design",
      "brand design",
      "visual identity",
      "UI/UX",
      "user experience",
      "user interface",
      "app design",
      "mobile design",
      "e-commerce",
      "online store",
      "digital presence",
      "online marketing",
      "content marketing",
      "email marketing",
      "SEO",
      "search engine optimization",
      "PPC",
      "pay per click",
      "advertising",
      "campaign design",
      "promotional materials",
      "brochures",
      "flyers",
      "business cards",
      "packaging design",
      "product design",
      "illustration",
      "animation",
      "video production",
      "photography",
      "copywriting",
      "content strategy",
      "brand strategy",
      "marketing strategy",
      "creative direction",
      "art direction",
      "project management",
      "consulting",
      "strategy consulting"
    ],
    response: "Got it. What's your ideal timeline or deadline for this project?",
    nextStep: "timeline_established"
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
    response: "Brand identity is more than just a logo — it's your story, your voice, your visual language. We start with research and strategy, then build out everything from your core messaging to color palettes, typography, and visual guidelines. It's an investment in how your audience sees you.",
    followUp: "What's your brand story?"
  },
  {
    triggers: [
      "social media",
      "social media design",
      "instagram",
      "facebook",
      "social content"
    ],
    response: "Social media is where your brand lives day-to-day. We create content that feels native to each platform while staying true to your voice. Think less generic posts, more strategic storytelling that builds your audience and drives action.",
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
    response: "Print isn't dead — it's selective. We design materials that work harder, whether that's a business card that gets kept or a brochure that actually gets read. Every piece should have a clear job to do.",
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
  }
];

export function findStrategicResponse(userMessage: string): StrategicResponse | null {
  const messageLower = userMessage.toLowerCase();
  
  // Check for exact matches first (higher priority)
  for (const response of STRATEGIC_RESPONSES) {
    for (const trigger of response.triggers) {
      if (messageLower.includes(trigger.toLowerCase())) {
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
      return pricingResponses[0]; // Return the first pricing-related response
    }
  }
  
  return null;
}

export function formatStrategicResponse(response: StrategicResponse): string {
  let formattedResponse = response.response;
  
  if (response.followUp) {
    formattedResponse += `\n\n${response.followUp}`;
  }
  
  return formattedResponse;
} 