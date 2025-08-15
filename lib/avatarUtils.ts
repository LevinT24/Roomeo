// lib/avatarUtils.ts - Utility functions for handling avatar URLs

/**
 * Ensures avatar URLs are properly encoded for production use
 * Handles both old paths with spaces and new encoded paths
 */
export function normalizeAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) {
    return "/placeholder.svg";
  }

  // If it's already a placeholder or external URL, return as is
  if (avatarUrl.includes('placeholder.svg') || avatarUrl.startsWith('http')) {
    return avatarUrl;
  }

  // If it's an avatar path with spaces, encode it
  if (avatarUrl.includes('/avatars/Avatar ') && !avatarUrl.includes('%20')) {
    return avatarUrl.replace(/Avatar (\d+)\.PNG/g, 'Avatar%20$1.PNG');
  }

  // Return as is if already encoded or different format
  return avatarUrl;
}

/**
 * Generates the list of available avatar URLs with proper encoding
 */
export function getAvailableAvatars(): string[] {
  return Array.from({ length: 16 }, (_, i) => `/avatars/Avatar%20${i + 1}.PNG`);
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