// Test script to verify repetition fixes
const { findStrategicResponse, clearConversationState } = require('./lib/responses.ts');

// Test 1: Same message should not trigger same strategic response twice
console.log('🧪 Test 1: Repetitive strategic response prevention');
const testMessage = "I need a logo for my business";
const sessionId = 'test-session-1';

// First call should return a response
const response1 = findStrategicResponse(testMessage, sessionId);
console.log('First call result:', response1 ? 'Found response' : 'No response');

// Second call with same message should return null (prevent repetition)
const response2 = findStrategicResponse(testMessage, sessionId);
console.log('Second call result:', response2 ? 'Found response (BAD)' : 'No response (GOOD)');

// Clear state and test again
clearConversationState(sessionId);
const response3 = findStrategicResponse(testMessage, sessionId);
console.log('After clear, result:', response3 ? 'Found response (GOOD)' : 'No response (BAD)');

// Test 2: User response detection
console.log('\n🧪 Test 2: User response detection');
const userResponse = "Yes, that sounds good";
const response4 = findStrategicResponse(userResponse, sessionId);
console.log('User response result:', response4 ? 'Found response (BAD)' : 'No response (GOOD)');

console.log('\n✅ Repetition fix tests completed!'); 