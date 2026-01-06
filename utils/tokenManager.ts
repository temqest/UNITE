/**
 * Token Manager - Handles token validation, expiry checking, and automatic logout
 */

import { decodeJwt } from './decodeJwt';

export interface TokenInfo {
  token: string;
  decoded: any;
  isExpired: boolean;
  expiresAt: number | null;
  timeUntilExpiry: number | null;
}

/**
 * Get token from storage (localStorage or sessionStorage)
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  return localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token');
}

/**
 * Check if a JWT token is expired
 * @param token - JWT token string
 * @returns true if expired or invalid, false if still valid
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  
  try {
    const decoded = decodeJwt(token);
    if (!decoded || !decoded.exp) {
      // If no expiry in token, consider it invalid
      return true;
    }
    
    // JWT exp is in seconds, Date.now() is in milliseconds
    const expiryTime = decoded.exp * 1000;
    const currentTime = Date.now();
    
    // Add a 30-second buffer to prevent edge case timing issues
    const buffer = 30 * 1000;
    return currentTime >= (expiryTime - buffer);
  } catch (error) {
    console.error('[TokenManager] Error checking token expiry:', error);
    return true;
  }
}

/**
 * Get detailed token information
 */
export function getTokenInfo(token: string | null): TokenInfo | null {
  if (!token) return null;
  
  try {
    const decoded = decodeJwt(token);
    if (!decoded) return null;
    
    const expiresAt = decoded.exp ? decoded.exp * 1000 : null;
    const timeUntilExpiry = expiresAt ? expiresAt - Date.now() : null;
    const isExpired = decoded.exp ? isTokenExpired(token) : false;
    
    return {
      token,
      decoded,
      isExpired,
      expiresAt,
      timeUntilExpiry,
    };
  } catch (error) {
    console.error('[TokenManager] Error getting token info:', error);
    return null;
  }
}

/**
 * Clear all authentication tokens and user data
 */
export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('unite_token');
    localStorage.removeItem('unite_user');
  } catch (e) {
    console.error('[TokenManager] Error clearing localStorage:', e);
  }
  
  try {
    sessionStorage.removeItem('unite_token');
    sessionStorage.removeItem('unite_user');
  } catch (e) {
    console.error('[TokenManager] Error clearing sessionStorage:', e);
  }
}

/**
 * Validate current token and return if it's valid
 * If token is expired, automatically clears it
 */
export function validateCurrentToken(): boolean {
  const token = getStoredToken();
  
  if (!token) {
    return false;
  }
  
  if (isTokenExpired(token)) {
    console.warn('[TokenManager] Token expired, clearing auth data');
    clearAuthTokens();
    return false;
  }
  
  return true;
}

/**
 * Setup automatic token expiry checking
 * Returns a cleanup function to stop the interval
 */
export function setupTokenExpiryCheck(
  onTokenExpired: () => void,
  checkInterval: number = 60000 // Check every 60 seconds
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  
  const intervalId = setInterval(() => {
    const token = getStoredToken();
    
    if (token && isTokenExpired(token)) {
      console.warn('[TokenManager] Token expired during periodic check');
      clearAuthTokens();
      onTokenExpired();
    }
  }, checkInterval);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}
