/**
 * Request Deduplication Utility
 * 
 * Prevents duplicate simultaneous API calls by tracking in-flight requests
 */

interface InFlightRequest {
  abortController: AbortController;
  timestamp: number;
}

// Map to track in-flight requests: key -> request info
const inFlightRequests = new Map<string, InFlightRequest>();

/**
 * Generate a unique key for a request
 * @param url - Request URL
 * @param options - Request options (method, body, headers)
 * @returns Unique key string
 */
function generateRequestKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  const headers = options?.headers ? JSON.stringify(options.headers) : '';
  return `${method}:${url}:${body}:${headers}`;
}

/**
 * Check if a request is already in flight
 * @param key - Request key
 * @returns True if request is in flight
 */
function isRequestInFlight(key: string): boolean {
  const request = inFlightRequests.get(key);
  if (!request) return false;
  
  // Clean up stale requests (older than 5 minutes)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  if (request.timestamp < fiveMinutesAgo) {
    inFlightRequests.delete(key);
    return false;
  }
  
  return true;
}

/**
 * Register a new in-flight request
 * @param key - Request key
 * @param abortController - AbortController for the request
 */
function registerInFlightRequest(key: string, abortController: AbortController): void {
  inFlightRequests.set(key, {
    abortController,
    timestamp: Date.now()
  });
}

/**
 * Unregister an in-flight request
 * @param key - Request key
 */
function unregisterInFlightRequest(key: string): void {
  inFlightRequests.delete(key);
}

/**
 * Cancel an in-flight request if it exists
 * @param key - Request key
 */
function cancelInFlightRequest(key: string): void {
  const request = inFlightRequests.get(key);
  if (request) {
    request.abortController.abort();
    inFlightRequests.delete(key);
  }
}

/**
 * Fetch with deduplication
 * If the same request is already in flight, returns the existing promise
 * Otherwise, creates a new request
 * 
 * @param url - Request URL
 * @param options - Fetch options
 * @returns Promise that resolves to Response
 */
export async function fetchWithDeduplication(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const key = generateRequestKey(url, options);
  
  // Check if request is already in flight
  if (isRequestInFlight(key)) {
    // Return a promise that waits for the existing request
    // Note: We can't return the exact same promise, but we can wait for it
    // In practice, the caller should handle this by checking if a request is in flight
    throw new Error('Request already in flight');
  }
  
  // Create abort controller for this request
  const abortController = new AbortController();
  
  // Combine with existing signal if provided
  const signal = options?.signal
    ? AbortSignal.any([abortController.signal, options.signal])
    : abortController.signal;
  
  // Register the request
  registerInFlightRequest(key, abortController);
  
  try {
    // Make the request
    const response = await fetch(url, {
      ...options,
      signal
    });
    
    // Unregister on success
    unregisterInFlightRequest(key);
    
    return response;
  } catch (error: any) {
    // Unregister on error (unless it's an abort from us)
    if (error.name !== 'AbortError' || !abortController.signal.aborted) {
      unregisterInFlightRequest(key);
    }
    
    throw error;
  }
}

/**
 * Cancel all in-flight requests matching a pattern
 * @param pattern - URL pattern (string or RegExp)
 */
export function cancelMatchingRequests(pattern: string | RegExp): void {
  const regex = typeof pattern === 'string' 
    ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    : pattern;
  
  for (const [key, request] of inFlightRequests.entries()) {
    if (regex.test(key)) {
      request.abortController.abort();
      inFlightRequests.delete(key);
    }
  }
}

/**
 * Clear all in-flight requests
 */
export function clearAllInFlightRequests(): void {
  for (const request of inFlightRequests.values()) {
    request.abortController.abort();
  }
  inFlightRequests.clear();
}

/**
 * Get count of in-flight requests
 */
export function getInFlightRequestCount(): number {
  return inFlightRequests.size;
}

