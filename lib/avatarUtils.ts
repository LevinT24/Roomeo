// lib/avatarUtils.ts - Utility functions for handling avatar URLs

/**
 * Ensures avatar URLs are properly formatted for production use
 * Handles both old paths with spaces and new paths without spaces
 * Converts uppercase PNG to lowercase png for web compatibility
 */
export function normalizeAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) {
    return "/placeholder.svg";
  }

  // If it's already a placeholder or external URL, return as is
  if (avatarUrl.includes('placeholder.svg') || avatarUrl.startsWith('http')) {
    // Remove query parameters from placeholder.svg URLs
    if (avatarUrl.includes('placeholder.svg?')) {
      return '/placeholder.svg';
    }
    return avatarUrl;
  }

  // Convert old paths with spaces to new paths without spaces
  if (avatarUrl.includes('/avatars/Avatar ')) {
    avatarUrl = avatarUrl.replace(/Avatar (\d+)\.PNG/g, 'Avatar$1.png');
  }

  // Convert old encoded paths to new paths without spaces
  if (avatarUrl.includes('/avatars/Avatar%20')) {
    avatarUrl = avatarUrl.replace(/Avatar%20(\d+)\.PNG/g, 'Avatar$1.png');
  }

  // Convert uppercase PNG to lowercase png
  if (avatarUrl.includes('.PNG')) {
    avatarUrl = avatarUrl.replace(/\.PNG/g, '.png');
  }

  // Ensure path starts with /Avatars/ (capital A)
  if (avatarUrl.includes('/avatars/')) {
    avatarUrl = avatarUrl.replace('/avatars/', '/Avatars/');
  }

  return avatarUrl;
}

/**
 * Generates the list of available avatar URLs (lowercase png for web compatibility)
 */
export function getAvailableAvatars(): string[] {
  return Array.from({ length: 16 }, (_, i) => `/Avatars/Avatar${i + 1}.png`);
}

/**
 * Validates if an avatar URL is one of our predefined avatars
 */
export function isValidAvatarUrl(url: string): boolean {
  const availableAvatars = getAvailableAvatars();
  const normalizedUrl = normalizeAvatarUrl(url);
  return availableAvatars.includes(normalizedUrl) || url.includes('placeholder.svg');
}

/**
 * Gets a fallback avatar URL
 */
export function getFallbackAvatarUrl(): string {
  return "/placeholder.svg";
}