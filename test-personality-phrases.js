// Simple test for personality phrases
const { getContextualPersonalityPhrase, shouldIncludePersonalityPhrase } = require('./lib/personalityPhrases.ts');

console.log('Testing personality phrases...\n');

// Test 1: Fun conversation
console.log('Test 1: Fun conversation');
const funMessage = "Haha, that sounds great! 😊";
const funTone = 'fun';
const funResponseType = 'confirmation';
console.log('Message:', funMessage);
console.log('Should include phrase:', shouldIncludePersonalityPhrase(funMessage, funResponseType, funTone));
console.log('Phrase:', getContextualPersonalityPhrase(funMessage, funResponseType, funTone));
console.log('');

// Test 2: Serious conversation
console.log('Test 2: Serious conversation');
const seriousMessage = "I have a problem with my website";
const seriousTone = 'serious';
const seriousResponseType = 'general';
console.log('Message:', seriousMessage);
console.log('Should include phrase:', shouldIncludePersonalityPhrase(seriousMessage, seriousResponseType, seriousTone));
console.log('Phrase:', getContextualPersonalityPhrase(seriousMessage, seriousResponseType, seriousTone));
console.log('');

// Test 3: Casual conversation
console.log('Test 3: Casual conversation');
const casualMessage = "Hey, do you do logo design?";
const casualTone = 'casual';
const casualResponseType = 'follow-up';
console.log('Message:', casualMessage);
console.log('Should include phrase:', shouldIncludePersonalityPhrase(casualMessage, casualResponseType, casualTone));
console.log('Phrase:', getContextualPersonalityPhrase(casualMessage, casualResponseType, casualTone));
console.log('');

// Test 4: Sign-off
console.log('Test 4: Sign-off');
const signOffMessage = "Thanks, that's all I need!";
const signOffTone = 'casual';
const signOffResponseType = 'sign-off';
console.log('Message:', signOffMessage);
console.log('Should include phrase:', shouldIncludePersonalityPhrase(signOffMessage, signOffResponseType, signOffTone));
console.log('Phrase:', getContextualPersonalityPhrase(signOffMessage, signOffResponseType, signOffTone));
console.log('');

console.log('Test completed!'); 