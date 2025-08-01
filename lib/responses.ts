export interface StrategicResponse {
  triggers: string[];
  response: string;
  followUp?: string;
}

export const STRATEGIC_RESPONSES: StrategicResponse[] = [
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