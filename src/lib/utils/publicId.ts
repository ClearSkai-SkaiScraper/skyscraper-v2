/**
 * 🔥 PHASE 27.2a: PUBLIC ID GENERATOR
 * 
 * Generates short, URL-safe public IDs for shareable video links
 */

export function generatePublicId(): string {
  // Generate short, URL-safe ID like "X7k9Qa" (8 characters)
  const part1 = Math.random().toString(36).slice(2, 8);
  const part2 = Math.random().toString(36).slice(2, 4);
  return part1 + part2;
}

export function generateShareUrl(publicId: string): string {
  // eslint-disable-next-line no-restricted-syntax
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com";
  return `${baseUrl}/watch/${publicId}`;
}
