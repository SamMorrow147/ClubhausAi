// Test script to verify the bot's improved response
const testCases = [
  {
    input: "Hi, I need help launching a personal finance coaching brand. Can you help with strategy and design?",
    expectedKeywords: ["Absolutely", "brand strategy", "design", "powerful niche", "vision"],
    expectedAvoid: ["RFP", "recap", "details", "proposal", "formal"]
  },
  {
    input: "I'm launching a startup and need branding help",
    expectedKeywords: ["Absolutely", "brand strategy", "design", "powerful niche", "vision"],
    expectedAvoid: ["RFP", "recap", "details", "proposal", "formal"]
  }
];

console.log("Testing bot responses for first exchanges...");
console.log("Expected improvements:");
console.log("✅ Warm and conversational tone");
console.log("✅ No premature RFP talk");
console.log("✅ No formal business language");
console.log("✅ Focus on understanding vision");
console.log("✅ Under 80 words");

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}:`);
  console.log(`Input: "${testCase.input}"`);
  console.log(`Expected to include: ${testCase.expectedKeywords.join(', ')}`);
  console.log(`Expected to avoid: ${testCase.expectedAvoid.join(', ')}`);
});

console.log("\nTo test these changes:");
console.log("1. Send the test messages to the bot");
console.log("2. Verify responses are warm and conversational");
console.log("3. Check that no RFP or formal language is used");
console.log("4. Confirm responses are under 80 words"); 