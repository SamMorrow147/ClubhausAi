// Test script to verify the bot handles the meal kit example better
const testExchange = [
  {
    user: "Hello! I want to launch a meal kit service for busy families—can you help with branding and website setup?",
    expectedGood: ["Yes", "branding", "website", "help", "sounds"],
    expectedAvoid: ["budget", "pricing", "comprehensive", "package", "RFP"]
  },
  {
    user: "What's your name?",
    expectedGood: ["name", "contact"],
    expectedAvoid: ["budget", "pricing", "comprehensive"]
  },
  {
    user: "The business is called QuickChef Kits. We want a family-friendly, reliable, and fun brand vibe.",
    expectedGood: ["QuickChef", "family-friendly", "fun", "brand", "vibe"],
    expectedAvoid: ["budget", "pricing", "comprehensive", "package"]
  },
  {
    user: "I'm Taylor. Our users are busy parents who want fast, healthy meals. Main goal: make dinner less stressful.",
    expectedGood: ["Taylor", "busy parents", "fast", "healthy", "dinner", "stressful"],
    expectedAvoid: ["budget", "pricing", "comprehensive", "package", "RFP"]
  },
  {
    user: "Nope, we're starting from scratch. Can you help with naming, logo, website, and launch plan?",
    expectedGood: ["starting from scratch", "naming", "logo", "website", "launch", "help"],
    expectedAvoid: ["budget", "pricing", "comprehensive", "package", "RFP", "discovery phase"]
  }
];

console.log("Testing bot responses for meal kit example...");
console.log("Expected improvements:");
console.log("✅ No premature budget/pricing questions");
console.log("✅ No sales pitch language");
console.log("✅ No information dumps");
console.log("✅ Conversational tone");
console.log("✅ Focus on understanding their needs");

testExchange.forEach((exchange, index) => {
  console.log(`\nExchange ${index + 1}:`);
  console.log(`User: "${exchange.user}"`);
  console.log(`Should include: ${exchange.expectedGood.join(', ')}`);
  console.log(`Should avoid: ${exchange.expectedAvoid.join(', ')}`);
});

console.log("\nKey issues to avoid:");
console.log("❌ 'Do you already have a budget range?'");
console.log("❌ 'We'd love to create a comprehensive package'");
console.log("❌ Long explanations about discovery phases");
console.log("❌ Specific pricing estimates");
console.log("❌ Sales pitch language");

console.log("\nBetter responses should be:");
console.log("✅ 'Absolutely, we can help with all of that'");
console.log("✅ 'Let's start by understanding your project better'");
console.log("✅ 'Want me to jot this down for our team?'");
console.log("✅ Short, conversational responses"); 