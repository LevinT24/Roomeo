// lib/avatarUtils.ts - Utility functions for handling avatar URLs

/**
 * Ensures avatar URLs are properly formatted for production use
 * Handles both old paths with spaces and new paths without spaces
 */
export function normalizeAvatarUrl(avatarUrl: string | null | undefined): string {
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

/**
 * Generates the list of available avatar URLs (no spaces, no encoding needed)
 */
export function getAvailableAvatars(): string[] {
  return Array.from({ length: 16 }, (_, i) => `/avatars/Avatar${i + 1}.PNG`);
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