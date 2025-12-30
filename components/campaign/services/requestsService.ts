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

  console.log(`[performRequestAction] Sending ${action} action:`, {
    requestId,
    action,
    hasNote: !!note,
    hasProposedDate: !!body.proposedDate,
    proposedDate: body.proposedDate,
  });

  const url = `${API_BASE}/api/event-requests/${encodeURIComponent(requestId)}/actions`;
  const maxRetries = 2;
  const retryDelay = 500; // ms
  let lastError: Error | null = null;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[performRequestAction] Retry attempt ${attempt}/${maxRetries} for ${action} action`);
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
        const errorMsg = resp.message || resp.errors?.join(", ") || `Failed to perform action: ${action}`;
        const error = new Error(errorMsg);
        
        // Log full error details
        console.error(`[performRequestAction] ${action} failed (attempt ${attempt + 1}/${maxRetries + 1}):`, {
          status: res?.status,
          statusText: res?.statusText,
          response: resp,
          error: errorMsg,
        });

        // Don't retry on 4xx errors (client errors)
        if (res?.status && res.status >= 400 && res.status < 500) {
          throw error;
        }

        lastError = error;
        continue; // Retry on 5xx errors or network errors
      }

      const resp = await res.json();
      console.log(`[performRequestAction] ${action} succeeded:`, resp);

      // Dispatch event reliably - must happen synchronously after response
      try {
        if (typeof window !== "undefined") {
          const event = new CustomEvent("unite:requests-changed", { 
            detail: { requestId, action, timestamp: Date.now() },
            bubbles: true,
            cancelable: true
          });
          const dispatched = window.dispatchEvent(event);
          console.log(`[performRequestAction] Dispatched unite:requests-changed event for request ${requestId}, action: ${action}, dispatched: ${dispatched}`);
          
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
              detail: { requestId, action }
            }));
            console.log(`[performRequestAction] Fallback event dispatch succeeded`);
          }
        } catch (e2) {
          console.error(`[performRequestAction] Fallback event dispatch also failed:`, e2);
        }
      }

      return resp;
    } catch (error: any) {
      lastError = error;
      
      // Log full error details
      console.error(`[performRequestAction] Error on attempt ${attempt + 1}/${maxRetries + 1}:`, {
        error: error.message,
        stack: error.stack,
        name: error.name,
      });

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

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[performConfirmAction] Retry attempt ${attempt}/${maxRetries}`);
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

      if (!res || !res.ok) {
        const resp = await res.json().catch(() => ({}));
        const errorMsg = resp.message || "Failed to confirm decision";
        
        console.error(`[performConfirmAction] Failed (attempt ${attempt + 1}/${maxRetries + 1}):`, {
          status: res?.status,
          statusText: res?.statusText,
          response: resp,
        });

        // Don't retry on 4xx errors
        if (res?.status && res.status >= 400 && res.status < 500) {
          throw new Error(errorMsg);
        }

        lastError = new Error(errorMsg);
        continue;
      }

      const resp = await res.json();

      // Dispatch event reliably - must happen synchronously after response
      try {
        if (typeof window !== "undefined") {
          const event = new CustomEvent("unite:requests-changed", { 
            detail: { requestId, action: "confirm", timestamp: Date.now() },
            bubbles: true,
            cancelable: true
          });
          const dispatched = window.dispatchEvent(event);
          console.log(`[performConfirmAction] Dispatched unite:requests-changed event for request ${requestId}, dispatched: ${dispatched}`);
          
          // Verify event was actually dispatched
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
              detail: { requestId, action: "confirm" }
            }));
            console.log(`[performConfirmAction] Fallback event dispatch succeeded`);
          }
        } catch (e2) {
          console.error(`[performConfirmAction] Fallback event dispatch also failed:`, e2);
        }
      }

      return resp;
    } catch (error: any) {
      lastError = error;
      
      console.error(`[performConfirmAction] Error on attempt ${attempt + 1}/${maxRetries + 1}:`, {
        error: error.message,
        stack: error.stack,
      });

      // Don't retry on certain errors
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
export const fetchRequestDetails = async (requestId: string) => {
  const token = getToken();
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${API_BASE}/api/event-requests/${encodeURIComponent(requestId)}`;

  let res;
  if (token) {
    try {
      res = await fetchWithAuth(url, { method: "GET" });
    } catch (e) {
      res = await fetch(url, { headers });
    }
  } else {
    res = await fetch(url, { headers, credentials: "include" });
  }

  const body = await res.json().catch(() => ({}));
  // Handle new response format: { success, data: { request } }
  const data = body?.data?.request || body?.data || body?.request || body;
  return data;
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
