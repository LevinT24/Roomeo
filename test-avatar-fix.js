// Quick test for avatar URL normalization (Updated for renamed files)
console.log('🧪 Testing Avatar URL Normalization (No Spaces)');
console.log('================================================');

// Test cases for the new filename format
const testCases = [
  '/avatars/Avatar 1.PNG',           // Old format with spaces -> should convert
  '/avatars/Avatar%201.PNG',         // Old encoded format -> should convert  
  '/avatars/Avatar1.PNG',            // New format (correct)
  '/avatars/Avatar11.PNG',           // New format double digits
  '',                                // Empty string
  null,                              // Null
  undefined,                         // Undefined
  '/placeholder.svg',                // Placeholder
  'https://example.com/image.jpg'    // External URL
];

// Simulate the normalizeAvatarUrl function logic
function normalizeAvatarUrl(avatarUrl) {
  if (!avatarUrl) {
    return "/placeholder.svg";
  }

  // If it's already a placeholder or external URL, return as is
  if (avatarUrl.includes('placeholder.svg') || avatarUrl.startsWith('http')) {
    return avatarUrl;
  }

  // Convert old paths with spaces to new paths without spaces
  if (avatarUrl.includes('/avatars/Avatar ')) {
    return avatarUrl.replace(/Avatar (\d+)\.PNG/g, 'Avatar$1.PNG');
  }

  // Convert old encoded paths to new paths without spaces
  if (avatarUrl.includes('/avatars/Avatar%20')) {
    return avatarUrl.replace(/Avatar%20(\d+)\.PNG/g, 'Avatar$1.PNG');
  }

  // Return as is if already in correct format
  return avatarUrl;
}

function getAvailableAvatars() {
  return Array.from({ length: 16 }, (_, i) => `/avatars/Avatar${i + 1}.PNG`);
}

testCases.forEach(testCase => {
  const normalized = normalizeAvatarUrl(testCase);
  console.log(`Input: "${testCase}" → Output: "${normalized}"`);
});

console.log('\n📋 Available Avatars (New Format):');
console.log(getAvailableAvatars().slice(0, 5), '... (showing first 5)');

console.log('\n🔄 Fallback URL:');
console.log('/placeholder.svg');