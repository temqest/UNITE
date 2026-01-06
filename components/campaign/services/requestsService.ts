import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { API_BASE } from "../event-card.constants";

const getToken = () =>
  typeof window !== "undefined"
    ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
    : null;

/**
 * Perform an action on a request (accept, reject, reschedule, cancel)
 * Uses the unified /api/event-requests/:id/actions endpoint
 * Includes retry logic and timeout handling for reliability
 */
export const performRequestAction = async (
  requestId: string,
  action: "accept" | "reject" | "reschedule" | "cancel" | "decline",
  note?: string,
  proposedDate?: string | null,
) => {
  const token = getToken();
  const headers: any = { "Content-Type": "application/json" };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const body: any = { action };
  
  // Only include note for reject and reschedule actions
  // Backend validator only allows note for reject/reschedule, not for accept/cancel
  if ((action === "reject" || action === "reschedule") && note) {
    body.note = note;
  }
  
  // For reschedule action, proposedDate is required by backend
  if (action === "reschedule") {
    if (!proposedDate) {
      throw new Error("proposedDate is required for reschedule action");
    }
    body.proposedDate = proposedDate;
  } else if (proposedDate) {
    // For other actions, include proposedDate if provided (optional)
    body.proposedDate = proposedDate;
  }


  const url = `${API_BASE}/api/event-requests/${encodeURIComponent(requestId)}/actions`;
  const maxRetries = 2;
  const retryDelay = 500; // ms
  let lastError: Error | null = null;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }

      // Create timeout promise (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout after 30 seconds")), 30000);
      });

      // Create fetch promise
      const fetchPromise = token
        ? fetchWithAuth(url, { method: "POST", body: JSON.stringify(body) })
        : fetch(url, { method: "POST", headers, body: JSON.stringify(body), credentials: "include" });

      // Race between fetch and timeout
      const res = await Promise.race([fetchPromise, timeoutPromise]);

      // Check if response is ok
      if (!res || !res.ok) {
        let resp: any = {};
        let errorMsg = `Failed to perform action: ${action}`;
        
        // Only try to parse JSON if res exists
        if (res) {
          try {
            resp = await res.json();
            errorMsg = resp.message || resp.errors?.join(", ") || errorMsg;
          } catch (parseError) {
            // If JSON parse fails, use default error message
            errorMsg = `Failed to perform action: ${action} (${res.status || 'unknown status'})`;
          }
        } else {
          // res is null/undefined (timeout or network error)
          errorMsg = `Network error or timeout while performing action: ${action}`;
        }
        
        const error = new Error(errorMsg) as any;

        // Attach status for downstream handling
        if (res?.status) error.status = res.status;

        // Log full error details (only if res exists)
        // Demote client (4xx) responses and transient timeouts to warnings to avoid noisy logs
        if (res?.status && res.status >= 400 && res.status < 500) {
          console.warn(`[performRequestAction] ${action} failed (client ${res.status}) (attempt ${attempt + 1}/${maxRetries + 1}):`, {
            status: res?.status || 'N/A',
            statusText: res?.statusText || 'N/A',
            response: resp,
            error: errorMsg,
            hasResponse: !!res,
          });
        } else {
          console.error(`[performRequestAction] ${action} failed (attempt ${attempt + 1}/${maxRetries + 1}):`, {
            status: res?.status || 'N/A',
            statusText: res?.statusText || 'N/A',
            response: resp,
            error: errorMsg,
            hasResponse: !!res,
          });
        }

        // If this is a client error (4xx) then decide whether to treat as final
        if (res?.status && res.status >= 400 && res.status < 500) {
          const msg = String(errorMsg || '').toLowerCase();

          // If backend indicates the action is invalid because state already changed
          // treat it as a successful outcome for UI reconciliation: invalidate cache
          // and dispatch refresh events so the UI can reconcile with the server state.
          if (
            msg.includes('not valid for request') ||
            msg.includes('already approved') ||
            msg.includes('already in state') ||
            msg.includes('invalid action') ||
            // Handle validation race where decisionHistory enum rejects duplicate confirm
            (msg.includes('decisionhistory') && msg.includes('not a valid enum value')) ||
            (msg.includes('not a valid enum value') && msg.includes('confirm'))
          ) {
            console.info(`[performRequestAction] Action appears already applied (${res.status}): ${errorMsg}. Triggering refresh.`);

            // Invalidate cache and dispatch refresh just like success path
            try {
              const { invalidateCache } = await import("@/utils/requestCache");
              invalidateCache(/event-requests/);
            } catch (cacheError) {
              console.error(`[performRequestAction] Error invalidating cache (fallback):`, cacheError);
            }

            try {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("unite:requests-changed", {
                  detail: { requestId, action, timestamp: Date.now(), shouldRefresh: true, forceRefresh: true }
                }));
                window.dispatchEvent(new CustomEvent("unite:force-refresh-requests", {
                  detail: { requestId, reason: `${action}-action` }
                }));
              }
            } catch (e) {
              console.error(`[performRequestAction] Error dispatching fallback refresh event:`, e);
            }

            // Return the parsed response so callers can reconcile if needed
            return resp;
          }

          // Other 4xx errors should be thrown and not retried
          throw error;
        }

        lastError = error;
        continue; // Retry on 5xx errors or network errors
      }

      const resp = await res.json();

      // Check backend response for UI refresh flags
      const uiFlags = resp?.data?.ui;
      const shouldRefresh = uiFlags?.shouldRefresh || res.headers.get('X-Should-Refresh') === 'true';
      const shouldCloseModal = uiFlags?.shouldCloseModal || res.headers.get('X-Should-Close-Modal') === 'true';
      const cacheKeysToInvalidate = uiFlags?.cacheKeysToInvalidate || [];

      // Immediately invalidate cache if backend says to refresh
      if (shouldRefresh && typeof window !== "undefined") {
        try {
          // Import invalidateCache dynamically to avoid circular dependencies
          const { invalidateCache } = await import("@/utils/requestCache");
          
          // Invalidate specific cache keys from backend response
          if (cacheKeysToInvalidate && cacheKeysToInvalidate.length > 0) {
            cacheKeysToInvalidate.forEach((key: string) => {
              // Convert API path to cache key pattern
              const cachePattern = new RegExp(key.replace(/^\/api\//, '').replace(/\//g, '.*'));
              invalidateCache(cachePattern);
            });
          } else {
            // Fallback: invalidate all event-requests cache
            invalidateCache(/event-requests/);
          }
        } catch (cacheError) {
          console.error(`[performRequestAction] Error invalidating cache:`, cacheError);
        }
      }

      // Dispatch event reliably - must happen synchronously after response
      // Include UI flags in event detail so listeners can act on them
      try {
        if (typeof window !== "undefined") {
          const event = new CustomEvent("unite:requests-changed", { 
            detail: { 
              requestId, 
              action, 
              timestamp: Date.now(),
              shouldRefresh,
              shouldCloseModal,
              cacheKeysToInvalidate,
              forceRefresh: shouldRefresh // Force immediate refresh
            },
            bubbles: true,
            cancelable: true
          });
          const dispatched = window.dispatchEvent(event);
          // If backend says to refresh, also trigger immediate refresh via custom event
          if (shouldRefresh) {
            // Dispatch a force-refresh event that bypasses debounce
            window.dispatchEvent(new CustomEvent("unite:force-refresh-requests", {
              detail: { requestId, reason: `${action}-action`, cacheKeysToInvalidate },
              bubbles: true
            }));
          }
          
          // Verify event was actually dispatched by checking if listeners exist
          if (!dispatched) {
            console.warn(`[performRequestAction] Event was not dispatched (preventDefault called?)`);
          }
        } else {
          console.warn(`[performRequestAction] Window object not available, cannot dispatch event`);
        }
      } catch (e) {
        console.error(`[performRequestAction] Failed to dispatch event:`, e);
        // Fallback: try dispatching with minimal options
        try {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("unite:requests-changed", { 
              detail: { requestId, action, shouldRefresh, forceRefresh: shouldRefresh }
            }));
            if (shouldRefresh) {
              window.dispatchEvent(new CustomEvent("unite:force-refresh-requests", {
                detail: { requestId, reason: `${action}-action` }
              }));
            }
          }
        } catch (e2) {
          console.error(`[performRequestAction] Fallback event dispatch also failed:`, e2);
        }
      }

      return resp;
    } catch (error: any) {
      lastError = error;
      
      // Log full error details
      // Use warn for intermediate retry attempts to avoid noisy error logs; only use error on final failure
      if (attempt === maxRetries) {
        console.error(`[performRequestAction] Error on attempt ${attempt + 1}/${maxRetries + 1}:`, {
          error: error.message,
          stack: error.stack,
          name: error.name,
        });
      } else {
        console.warn(`[performRequestAction] Error on attempt ${attempt + 1}/${maxRetries + 1}:`, {
          error: error.message,
          name: error.name,
        });
      }

      // If this error is a client-side HTTP error (4xx), don't retry
      if (error?.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Don't retry on certain errors (validation errors, etc.)
      if (error.message?.includes("required") || 
          error.message?.includes("invalid") || 
          error.message?.includes("permission") ||
          error.message?.includes("not found")) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to perform action '${action}' after ${maxRetries + 1} attempts: ${error.message || "Unknown error"}`
        );
      }
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError || new Error(`Failed to perform action: ${action}`);
};

/**
 * Confirm a reviewer's decision (unified for all roles)
 * Uses the unified /api/event-requests/:id/actions endpoint with action: 'confirm'
 * Includes retry logic and timeout handling for reliability
 */
export const performConfirmAction = async (requestId: string, note?: string) => {
  const token = getToken();
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Don't include note for confirm actions - backend validator doesn't allow it
  const body: any = { action: "confirm" };

  const url = `${API_BASE}/api/event-requests/${encodeURIComponent(requestId)}/actions`;
  const maxRetries = 2;
  const retryDelay = 500; // ms
  let lastError: Error | null = null;

  // Retry logic with exponential backoff (matching performRequestAction)
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }

      // Create timeout promise (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout after 30 seconds")), 30000);
      });

      // Create fetch promise
      const fetchPromise = token
        ? fetchWithAuth(url, { method: "POST", body: JSON.stringify(body) })
        : fetch(url, { method: "POST", headers, body: JSON.stringify(body), credentials: "include" });

      // Race between fetch and timeout
      const res = await Promise.race([fetchPromise, timeoutPromise]);

      // Check if response is ok
      if (!res || !res.ok) {
        const resp = await res.json().catch(() => ({}));
        const errorMsg = resp.message || "Failed to confirm decision";
        const error = new Error(errorMsg) as any;

        if (res?.status) error.status = res.status;
        
        // Log full error details; demote client errors to warnings to avoid noisy logs
        if (res?.status && res.status >= 400 && res.status < 500) {
          console.warn(`[performConfirmAction] Failed (client ${res.status}) (attempt ${attempt + 1}/${maxRetries + 1}):`, {
            status: res?.status,
            statusText: res?.statusText,
            response: resp,
            error: errorMsg,
          });
        } else {
          console.error(`[performConfirmAction] Failed (attempt ${attempt + 1}/${maxRetries + 1}):`, {
            status: res?.status,
            statusText: res?.statusText,
            response: resp,
            error: errorMsg,
          });
        }

        // If 4xx, decide whether action was already applied; if so, trigger refresh and return
        if (res?.status && res.status >= 400 && res.status < 500) {
          const msg = String(errorMsg || '').toLowerCase();
          if (
            msg.includes('not valid for request') ||
            msg.includes('already approved') ||
            msg.includes('already in state') ||
            msg.includes('invalid action') ||
            // Handle validation race where decisionHistory enum rejects duplicate confirm
            (msg.includes('decisionhistory') && msg.includes('not a valid enum value')) ||
            (msg.includes('not a valid enum value') && msg.includes('confirm'))
          ) {
            console.info(`[performConfirmAction] Action appears already applied (${res.status}): ${errorMsg}. Triggering refresh.`);
            try {
              const { invalidateCache } = await import("@/utils/requestCache");
              invalidateCache(/event-requests/);
            } catch (cacheError) {
              console.error(`[performConfirmAction] Error invalidating cache (fallback):`, cacheError);
            }

            try {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("unite:requests-changed", {
                  detail: { requestId, action: "confirm", timestamp: Date.now(), shouldRefresh: true, forceRefresh: true }
                }));
                window.dispatchEvent(new CustomEvent("unite:force-refresh-requests", {
                  detail: { requestId, reason: "confirm-action" }
                }));
              }
            } catch (e) {
              console.error(`[performConfirmAction] Error dispatching fallback refresh event:`, e);
            }

            return resp;
          }

          throw error;
        }

        lastError = error;
        continue; // Retry on 5xx errors or network errors
      }

      const resp = await res.json();

      // Check backend response for UI refresh flags
      const uiFlags = resp?.data?.ui;
      const shouldRefresh = uiFlags?.shouldRefresh || res.headers.get('X-Should-Refresh') === 'true';
      const shouldCloseModal = uiFlags?.shouldCloseModal || res.headers.get('X-Should-Close-Modal') === 'true';
      const cacheKeysToInvalidate = uiFlags?.cacheKeysToInvalidate || [];

      // Immediately invalidate cache if backend says to refresh
      if (shouldRefresh && typeof window !== "undefined") {
        try {
          // Import invalidateCache dynamically to avoid circular dependencies
          const { invalidateCache } = await import("@/utils/requestCache");
          
          // Invalidate specific cache keys from backend response
          if (cacheKeysToInvalidate && cacheKeysToInvalidate.length > 0) {
            cacheKeysToInvalidate.forEach((key: string) => {
              // Convert API path to cache key pattern
              const cachePattern = new RegExp(key.replace(/^\/api\//, '').replace(/\//g, '.*'));
              invalidateCache(cachePattern);
            });
          } else {
            // Fallback: invalidate all event-requests cache
            invalidateCache(/event-requests/);
          }
        } catch (cacheError) {
          console.error(`[performConfirmAction] Error invalidating cache:`, cacheError);
        }
      }

      // Dispatch event reliably - must happen synchronously after response
      // Include UI flags in event detail so listeners can act on them
      try {
        if (typeof window !== "undefined") {
          const event = new CustomEvent("unite:requests-changed", { 
            detail: { 
              requestId, 
              action: "confirm", 
              timestamp: Date.now(),
              shouldRefresh,
              shouldCloseModal,
              cacheKeysToInvalidate,
              forceRefresh: shouldRefresh // Force immediate refresh
            },
            bubbles: true,
            cancelable: true
          });
          const dispatched = window.dispatchEvent(event);
          // If backend says to refresh, also trigger immediate refresh via custom event
          if (shouldRefresh) {
            // Dispatch a force-refresh event that bypasses debounce
            window.dispatchEvent(new CustomEvent("unite:force-refresh-requests", {
              detail: { requestId, reason: "confirm-action", cacheKeysToInvalidate },
              bubbles: true
            }));
          }
          
          // Verify event was actually dispatched by checking if listeners exist
          if (!dispatched) {
            console.warn(`[performConfirmAction] Event was not dispatched (preventDefault called?)`);
          }
        } else {
          console.warn(`[performConfirmAction] Window object not available, cannot dispatch event`);
        }
      } catch (e) {
        console.error(`[performConfirmAction] Failed to dispatch event:`, e);
        // Fallback: try dispatching with minimal options
        try {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("unite:requests-changed", { 
              detail: { requestId, action: "confirm", shouldRefresh, forceRefresh: shouldRefresh }
            }));
            if (shouldRefresh) {
              window.dispatchEvent(new CustomEvent("unite:force-refresh-requests", {
                detail: { requestId, reason: "confirm-action" }
              }));
            }
          }
        } catch (e2) {
          console.error(`[performConfirmAction] Fallback event dispatch also failed:`, e2);
        }
      }

      return resp;
    } catch (error: any) {
      lastError = error;
      
      // Log full error details
      // Use warn for intermediate retry attempts; only error on final attempt
      if (attempt === maxRetries) {
        console.error(`[performConfirmAction] Error on attempt ${attempt + 1}/${maxRetries + 1}:`, {
          error: error.message,
          stack: error.stack,
          name: error.name,
        });
      } else {
        console.warn(`[performConfirmAction] Error on attempt ${attempt + 1}/${maxRetries + 1}:`, {
          error: error.message,
          name: error.name,
        });
      }

      // If this error is a client-side HTTP error (4xx), don't retry
      if (error?.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Don't retry on certain errors (validation errors, etc.)
      if (error.message?.includes("required") || 
          error.message?.includes("invalid") || 
          error.message?.includes("permission") ||
          error.message?.includes("not found")) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to confirm decision after ${maxRetries + 1} attempts: ${error.message || "Unknown error"}`
        );
      }
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError || new Error("Failed to confirm decision");
};

/**
 * Legacy function for backward compatibility - maps to performConfirmAction
 * @deprecated Use performConfirmAction instead
 */
export const performStakeholderConfirm = async (requestId: string, action: "Accepted" | "Rejected") => {
  return performConfirmAction(requestId);
};

/**
 * Legacy function for backward compatibility - maps to performConfirmAction
 * @deprecated Use performConfirmAction instead
 */
export const performCoordinatorConfirm = async (requestId: string, action: "Accepted" | "Rejected") => {
  return performConfirmAction(requestId);
};

/**
 * Fetch request details by ID
 * Uses the new /api/event-requests/:id endpoint
 */
export const fetchRequestDetails = async (requestId: string, cacheBust: boolean = false) => {
  const token = getToken();
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  // Add cache busting if requested
  const cacheBuster = cacheBust ? `?t=${Date.now()}` : '';
  const url = `${API_BASE}/api/event-requests/${encodeURIComponent(requestId)}${cacheBuster}`;
  
  // Add cache control headers to prevent caching
  if (cacheBust) {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
  }

  let res;
  try {
    if (token) {
      try {
        res = await fetchWithAuth(url, { 
          method: "GET",
          headers: cacheBust ? headers : undefined
        });
      } catch (e) {
        // Fallback to regular fetch if fetchWithAuth fails
        console.warn(`[fetchRequestDetails] fetchWithAuth failed, falling back to regular fetch:`, e);
        res = await fetch(url, { headers, credentials: "include" });
      }
    } else {
      res = await fetch(url, { headers, credentials: "include" });
    }

    if (!res || !res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const errorMsg = errorBody.message || `Failed to fetch request details: ${res?.status || 'Unknown error'}`;
      throw new Error(errorMsg);
    }

    const body = await res.json().catch(() => ({}));
    // Handle new response format: { success, data: { request } }
    const data = body?.data?.request || body?.data || body?.request || body;
    return data;
  } catch (error: any) {
    console.error(`[fetchRequestDetails] Error fetching request ${requestId}:`, error);
    throw error;
  }
};

/**
 * Delete a request (hard delete, for cancelled/rejected requests only)
 * Uses the new /api/event-requests/:id/delete endpoint
 */
export const deleteRequest = async (requestId: string) => {
  const token = getToken();
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  if (token) {
    res = await fetchWithAuth(`${API_BASE}/api/event-requests/${encodeURIComponent(requestId)}/delete`, { method: "DELETE" });
  } else {
    res = await fetch(`${API_BASE}/api/event-requests/${encodeURIComponent(requestId)}/delete`, { method: "DELETE", headers, credentials: "include" });
  }

  const resp = await res.json();
  if (!res.ok) throw new Error(resp.message || "Failed to delete request");

  try {
    window.dispatchEvent(new CustomEvent("unite:requests-changed", { detail: { requestId } }));
  } catch (e) {}

  return resp;
};

export default {};
