// Test script to verify contact collection logic
const testCases = [
  {
    name: "Meeting intent - should ask for name",
    message: "I need help with a meeting",
    expectedResponse: "Great! I'd love to help get that set up. What's your name?"
  },
  {
    name: "Interest in working with us - should ask for name",
    message: "Yeah, I'd like to work with you guys",
    expectedResponse: "Great! I'd love to help get that set up. What's your name?"
  },
  {
    name: "Help request - should ask for name",
    message: "I need help with my website",
    expectedResponse: "Great! I'd love to help get that set up. What's your name?"
  },
  {
    name: "Name provided - should ask for email",
    message: "My name is John",
    expectedResponse: "Thanks! What's your email address?"
  },
  {
    name: "Email provided - should ask for phone",
    message: "john@example.com",
    expectedResponse: "Perfect! And what's your phone number?"
  },
  {
    name: "Complete contact info - should setup meeting",
    message: "555-123-4567",
    expectedResponse: "Perfect! I'll pass this along and someone from our team will reach out to schedule a time that works for you."
  }
];

console.log("🧪 Testing contact collection logic...\n");

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Input: "${testCase.message}"`);
  console.log(`Expected: "${testCase.expectedResponse}"`);
  console.log("---");
});

console.log("✅ Test cases defined. The bot should now:");
console.log("1. Prioritize contact collection when user expresses interest");
console.log("2. Ask for name first, then email, then phone systematically");
console.log("3. Not get sidetracked by other topics until contact info is complete");
console.log("4. Acknowledge provided information and continue naturally"); 