// Quick test for avatar URL normalization
const { normalizeAvatarUrl, getAvailableAvatars, getFallbackAvatarUrl } = require('./lib/avatarUtils.ts');

console.log('🧪 Testing Avatar URL Normalization');
console.log('=====================================');

// Test cases
const testCases = [
  '/avatars/Avatar 1.PNG',           // Should be encoded
  '/avatars/Avatar%201.PNG',         // Already encoded
  '',                                // Empty string
  null,                              // Null
  undefined,                         // Undefined
  '/placeholder.svg',                // Placeholder
  'https://example.com/image.jpg'    // External URL
];

testCases.forEach(testCase => {
  const normalized = normalizeAvatarUrl(testCase);
  console.log(`Input: "${testCase}" → Output: "${normalized}"`);
});

console.log('\n📋 Available Avatars:');
console.log(getAvailableAvatars().slice(0, 3), '... (showing first 3)');

console.log('\n🔄 Fallback URL:');
console.log(getFallbackAvatarUrl());