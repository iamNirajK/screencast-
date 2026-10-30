/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generate a cryptographically secure random alphanumeric room ID
 */
export function generateRoomId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(8);
  window.crypto.getRandomValues(array);
  let id = '';
  for (let i = 0; i < array.length; i++) {
    id += chars[array[i] % chars.length];
  }
  return `mrn-${id.slice(0, 4)}-${id.slice(4)}`;
}

/**
 * Generate a high-entropy access token
 */
export function generateAccessToken(): string {
  const array = new Uint8Array(24);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique participant ID
 */
export function generateParticipantId(role: 'host' | 'viewer'): string {
  const array = new Uint8Array(6);
  window.crypto.getRandomValues(array);
  const suffix = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${role}_${suffix}`;
}

/**
 * Compute SHA-256 hex digest of a string
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
