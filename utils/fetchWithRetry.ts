/**
 * Fetch with Retry and Exponential Backoff
 * 
 * Implements resilient fetching with:
 * - Exponential backoff retry logic
 * - Proper error classification
 * - Request deduplication
 * - Timeout handling
 */

import { cancelMatchingRequests } from './requestDeduplication';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
  retryableStatusCodes?: number[];
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 16000, // 16 seconds
  timeout: 30000, // 30 seconds
  retryableStatusCodes: [500, 502, 503, 504, 0], // 0 for network errors
  retryableErrors: ['timeout', 'aborted', 'network', 'fetch', 'Failed to fetch']
};

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, options: Required<RetryOptions>): boolean {
  // Check if it's a network error
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  
  // Check if it's an abort/timeout error
  if (error.name === 'AbortError' || error.message?.includes('aborted')) {
    return true;
  }
  
  // Check error message for retryable patterns
  const errorMessage = String(error?.message || error || '').toLowerCase();
  for (const pattern of options.retryableErrors) {
    if (errorMessage.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  
  // Check status code
  if (error.status && options.retryableStatusCodes.includes(error.status)) {
    return true;
  }
  
  return false;
}

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(retryCount: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(2, retryCount);
  return Math.min(delay, options.maxDelay);
}

/**
 * Fetch with retry and exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...retryOptions };
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, opts.timeout);
      
      // Combine with existing signal if provided
      const signal = options?.signal
        ? AbortSignal.any([abortController.signal, options.signal])
        : abortController.signal;
      
      try {
        // Make the request
        const response = await fetch(url, {
          ...options,
          signal
        });
        
        clearTimeout(timeoutId);
        
        // Check if response is retryable (5xx errors)
        if (!response.ok && opts.retryableStatusCodes.includes(response.status)) {
          if (attempt < opts.maxRetries) {
            const delay = calculateDelay(attempt, opts);
            console.warn(
              `[fetchWithRetry] Request failed with ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${opts.maxRetries})`
            );
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Success or non-retryable error
        return response;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      if (isRetryableError(error, opts) && attempt < opts.maxRetries) {
        const delay = calculateDelay(attempt, opts);
        console.warn(
          `[fetchWithRetry] Request failed: ${error.message || error}, retrying in ${delay}ms (attempt ${attempt + 1}/${opts.maxRetries})`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Not retryable or max retries reached
      throw error;
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Failed to fetch after retries');
}

/**
 * Cancel all requests matching a URL pattern
 */
export function cancelRequests(pattern: string | RegExp): void {
  cancelMatchingRequests(pattern);
}

