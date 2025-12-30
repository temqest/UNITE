/**
 * Secure fetch wrapper that prevents exposing API endpoints in console errors
 * Catches and handles errors silently without logging URLs
 */

interface SecureFetchOptions extends RequestInit {
  suppressErrors?: boolean; // If true, errors won't be logged to console
}

/**
 * Note: Browser will still log network requests in Network tab and console
 * This is expected browser behavior and cannot be completely prevented.
 * This wrapper ensures our code doesn't add additional error logging that exposes URLs.
 */

/**
 * Secure fetch that doesn't expose API endpoints in error messages
 * Note: Browser will still log network requests in Network tab - this is expected behavior
 */
export async function secureFetch(
  url: string,
  options: SecureFetchOptions = {}
): Promise<Response> {
  const { suppressErrors = true, ...fetchOptions } = options;

  try {
    const response = await fetch(url, fetchOptions);
    return response;
  } catch (error) {
    // Create a mock response for network errors
    // This prevents our code from throwing errors that expose URLs
    const mockResponse = {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      json: async () => ({ success: false, message: 'Connection error' }),
      text: async () => 'Connection error',
      headers: new Headers(),
    } as Response;

    // Don't log errors that expose URLs
    if (process.env.NODE_ENV === 'development' && !suppressErrors) {
      console.error('Network request failed');
    }

    return mockResponse;
  }
}

/**
 * Secure fetch with JSON parsing that doesn't expose API endpoints
 */
export async function secureFetchJson(
  url: string,
  options: SecureFetchOptions = {}
): Promise<any> {
  const response = await secureFetch(url, options);
  
  try {
    const body = await response.json();
    return { response, body };
  } catch {
    // If JSON parsing fails, return empty body
    return { response, body: {} };
  }
}

