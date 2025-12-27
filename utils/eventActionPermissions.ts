/**
 * Event Action Permissions Utility
 * 
 * Provides permission evaluation for event actions in Calendar Week View.
 * Integrates with backend permission system and authority checks.
 */

import { getUserAuthority } from './getUserAuthority';
import { fetchWithAuth } from './fetchWithAuth';
import { decodeJwt } from './decodeJwt';

const API_BASE =
  typeof process !== 'undefined' &&
  process.env &&
  process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:3000';

/**
 * Authority threshold for admin access
 */
const ADMIN_AUTHORITY_THRESHOLD = 80;

/**
 * Permission cache per event (TTL: 2 minutes)
 */
interface PermissionCacheEntry {
  permissions: EventActionPermissions;
  timestamp: number;
}

const permissionCache = new Map<string, PermissionCacheEntry>();
const PERMISSION_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Available actions for events
 */
export type EventAction = 'view' | 'edit' | 'manage-staff' | 'reschedule' | 'cancel' | 'delete';

/**
 * Permission flags for each action
 */
export interface EventActionPermissions {
  canView: boolean;
  canEdit: boolean;
  canManageStaff: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  canDelete: boolean;
}

/**
 * Get user ID from localStorage/sessionStorage or JWT token
 */
function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const rawUser = localStorage.getItem('unite_user');
    console.log('[eventActionPermissions] getUserId - rawUser exists:', !!rawUser);
    
    if (rawUser) {
      const user = JSON.parse(rawUser);
      console.log('[eventActionPermissions] getUserId - user object:', {
        hasUser: !!user,
        userKeys: user ? Object.keys(user).slice(0, 30) : [],
        _id: user?._id,
        id: user?.id,
        User_ID: user?.User_ID,
        userId: user?.userId,
        ID: user?.ID,
        allIdFields: {
          _id: user?._id,
          id: user?.id,
          User_ID: user?.User_ID,
          userId: user?.userId,
          ID: user?.ID,
          Admin_ID: user?.Admin_ID,
          Coordinator_ID: user?.Coordinator_ID,
          Stakeholder_ID: user?.Stakeholder_ID,
        },
      });
      
      const userId = 
        user?._id || 
        user?.id || 
        user?.User_ID || 
        user?.userId || 
        user?.ID ||
        null;
      
      if (userId) {
        console.log('[eventActionPermissions] getUserId - found userId:', userId);
        return String(userId);
      }
    }
    
    // Fallback: try to get user ID from JWT token
    console.log('[eventActionPermissions] getUserId - trying JWT token fallback...');
    const token = localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token');
    if (token) {
      try {
        const decoded = decodeJwt(token);
        console.log('[eventActionPermissions] getUserId - JWT decoded:', {
          hasDecoded: !!decoded,
          decodedKeys: decoded ? Object.keys(decoded).slice(0, 10) : [],
          id: decoded?.id,
          userId: decoded?.userId,
          _id: decoded?._id,
        });
        const tokenUserId = decoded?.id || decoded?.userId || decoded?._id || null;
        if (tokenUserId) {
          console.log('[eventActionPermissions] getUserId - found userId from JWT:', tokenUserId);
          return String(tokenUserId);
        }
      } catch (e) {
        console.warn('[eventActionPermissions] getUserId - JWT decode failed:', e);
      }
    }
    
    console.warn('[eventActionPermissions] getUserId - no userId found');
    return null;
  } catch (e) {
    console.error('[eventActionPermissions] getUserId - error:', e);
    return null;
  }
}

/**
 * Extract location ID from event
 */
function extractLocationId(event: any): string | null {
  if (!event) return null;
  
  // Try district ID first
  const districtId = 
    event.district?._id ||
    event.district?.District_ID ||
    event.district?.id ||
    event.District_ID ||
    event.districtId ||
    null;
  
  if (districtId) return String(districtId);
  
  // Fallback to municipality
  const municipalityId =
    event.municipality?._id ||
    event.municipality?.Municipality_ID ||
    event.municipality?.id ||
    event.Municipality_ID ||
    event.municipalityId ||
    null;
  
  return municipalityId ? String(municipalityId) : null;
}

/**
 * Extract request ID from event
 */
function extractRequestId(event: any): string | null {
  if (!event) return null;
  
  console.log('[eventActionPermissions] extractRequestId - checking event:', {
    hasEvent: !!event,
    eventKeys: Object.keys(event || {}).slice(0, 30),
    hasRequest: !!event.request,
    requestKeys: event.request ? Object.keys(event.request).slice(0, 20) : [],
  });
  
  // Try multiple possible locations for request ID
  const requestId =
    event.request?.Request_ID ||
    event.request?.RequestId ||
    event.request?.id ||
    event.request?._id ||
    event.Request_ID ||
    event.RequestId ||
    event.requestId ||
    event.request_id ||
    // Also check if event has a linked request field
    event.linkedRequest?.Request_ID ||
    event.linkedRequest?.RequestId ||
    event.linkedRequest?.id ||
    // Check in event's raw data if it exists
    event.raw?.request?.Request_ID ||
    event.raw?.request?.RequestId ||
    event.raw?.Request_ID ||
    event.raw?.RequestId ||
    null;
  
  console.log('[eventActionPermissions] extractRequestId result:', {
    requestId,
    checkedFields: {
      'event.request.Request_ID': event.request?.Request_ID,
      'event.request.RequestId': event.request?.RequestId,
      'event.request.id': event.request?.id,
      'event.Request_ID': event.Request_ID,
      'event.RequestId': event.RequestId,
      'event.requestId': event.requestId,
      'event.request_id': event.request_id,
    },
  });
  
  return requestId ? String(requestId) : null;
}

/**
 * Fetch request ID by Event_ID from backend
 * Since events don't have request ID directly, we need to find the request by Event_ID
 */
async function fetchRequestIdByEventId(eventId: string): Promise<string | null> {
  try {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')
        : null;
    
    if (!token) {
      console.warn('[eventActionPermissions] No token for fetching request ID');
      return null;
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    
    // Try to get event details which includes request info
    console.log('[eventActionPermissions] Fetching event details to find request ID:', {
      url: `${API_BASE}/api/events/${encodeURIComponent(eventId)}`,
      eventId,
    });
    
    const response = await fetch(`${API_BASE}/api/events/${encodeURIComponent(eventId)}`, {
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.warn(`[eventActionPermissions] Failed to fetch event details: ${response.status}`);
      return null;
    }
    
    const body = await response.json();
    const eventData = body.data || body.event || body;
    
    // Extract request ID from event details
    const requestId = 
      eventData?.request?.Request_ID ||
      eventData?.request?.RequestId ||
      eventData?.request?.id ||
      eventData?.Request_ID ||
      eventData?.RequestId ||
      null;
    
    console.log('[eventActionPermissions] Request ID from event details:', {
      requestId,
      hasRequest: !!eventData?.request,
      requestKeys: eventData?.request ? Object.keys(eventData.request) : [],
    });
    
    return requestId ? String(requestId) : null;
  } catch (error) {
    console.error('[eventActionPermissions] Error fetching request ID:', error);
    return null;
  }
}

/**
 * Get user permissions from localStorage
 * Handles comma-separated string format: "event.create,read,update"
 * Also handles array format: [{ resource: 'event', actions: ['create', 'read', 'update'] }]
 */
function getUserPermissionsFromStorage(): Array<{ resource: string; actions: string[] }> {
  if (typeof window === 'undefined') return [];
  
  try {
    const rawUser = localStorage.getItem('unite_user');
    if (!rawUser) {
      console.log('[eventActionPermissions] getUserPermissionsFromStorage - no user in localStorage');
      return [];
    }
    
    const user = JSON.parse(rawUser);
    
    // Try to get permissions from various possible locations
    let permissionsRaw = 
      user.permissions ||
      user.Permissions ||
      user.user?.permissions ||
      user.data?.permissions ||
      null;
    
    if (!permissionsRaw) {
      console.log('[eventActionPermissions] getUserPermissionsFromStorage - no permissions found');
      return [];
    }
    
    console.log('[eventActionPermissions] getUserPermissionsFromStorage - raw permissions:', {
      type: typeof permissionsRaw,
      value: permissionsRaw,
    });
    
    // Handle string format: "event.create,read,update" or "event.create,read,update,request.reschedule"
    // Format: resource.action1,action2,action3 where actions without dots belong to the last resource
    if (typeof permissionsRaw === 'string') {
      console.log('[eventActionPermissions] getUserPermissionsFromStorage - parsing string format...');
      
      const permissionMap = new Map<string, Set<string>>();
      let currentResource: string | null = null;
      
      // Split by comma and process each permission
      const parts = permissionsRaw.split(',').map(p => p.trim()).filter(Boolean);
      
      for (const part of parts) {
        // Check if it's in format "resource.action"
        if (part.includes('.')) {
          const [resource, action] = part.split('.');
          if (resource && action) {
            currentResource = resource; // Track current resource
            if (!permissionMap.has(resource)) {
              permissionMap.set(resource, new Set());
            }
            permissionMap.get(resource)!.add(action);
          }
        } else {
          // If no dot, it's an action for the current resource (or 'event' if none set)
          const resource = currentResource || 'event';
          if (!permissionMap.has(resource)) {
            permissionMap.set(resource, new Set());
          }
          permissionMap.get(resource)!.add(part);
        }
      }
      
      // Convert to array format
      const permissionsArray = Array.from(permissionMap.entries()).map(([resource, actions]) => ({
        resource,
        actions: Array.from(actions),
      }));
      
      console.log('[eventActionPermissions] getUserPermissionsFromStorage - parsed from string:', permissionsArray);
      return permissionsArray;
    }
    
    // Handle array format: [{ resource: 'event', actions: ['create', 'read', 'update'] }]
    if (Array.isArray(permissionsRaw)) {
      console.log('[eventActionPermissions] getUserPermissionsFromStorage - permissions is array:', permissionsRaw);
      return permissionsRaw;
    }
    
    console.warn('[eventActionPermissions] getUserPermissionsFromStorage - unknown permissions format:', {
      type: typeof permissionsRaw,
      value: permissionsRaw,
    });
    
    return [];
  } catch (e) {
    console.error('[eventActionPermissions] Error getting user permissions from storage:', e);
    return [];
  }
}

/**
 * Map permissions to event actions based on event status
 * For approved/published events: use event permissions
 * For other states: use request permissions
 */
function mapPermissionsToActions(
  permissions: Array<{ resource: string; actions: string[] }>,
  eventStatus: string
): EventAction[] {
  const actions: EventAction[] = ['view']; // Always allow view
  
  const normalizedStatus = (eventStatus || 'Approved').toLowerCase();
  const isApproved = normalizedStatus.includes('approve');
  const isCancelled = normalizedStatus.includes('cancel');
  const isCompleted = normalizedStatus.includes('complete');
  
  console.log('[eventActionPermissions] mapPermissionsToActions:', {
    permissions,
    eventStatus,
    normalizedStatus,
    isApproved,
    isCancelled,
    isCompleted,
  });
  
  // Find event permissions
  const eventPerms = permissions.find(p => p.resource === 'event');
  const requestPerms = permissions.find(p => p.resource === 'request');
  
  // For approved/completed events, check event permissions
  if (isApproved || isCompleted) {
    if (eventPerms) {
      const eventActions = eventPerms.actions || [];
      
      // Map event.update to edit (backend checks event.update for approved events)
      if (eventActions.includes('update')) {
        actions.push('edit');
      }
      
      // Map event.manage-staff to manage-staff
      if (eventActions.includes('manage-staff') || eventActions.includes('managestaff')) {
        actions.push('manage-staff');
      }
    }
    
    // Reschedule and cancel use request permissions
    if (requestPerms) {
      const requestActions = requestPerms.actions || [];
      
      if (requestActions.includes('reschedule')) {
        actions.push('reschedule');
      }
      
      if (requestActions.includes('cancel')) {
        actions.push('cancel');
      }
    }
  } else if (isCancelled) {
    // Cancelled events: only view and delete (if has delete permission)
    if (requestPerms && requestPerms.actions.includes('delete')) {
      actions.push('delete');
    }
  } else {
    // Other states: use request permissions
    if (requestPerms) {
      const requestActions = requestPerms.actions || [];
      
      if (requestActions.includes('update')) {
        actions.push('edit');
      }
      
      if (requestActions.includes('reschedule')) {
        actions.push('reschedule');
      }
      
      if (requestActions.includes('cancel')) {
        actions.push('cancel');
      }
    }
    
    // Manage staff always uses event permission
    if (eventPerms) {
      const eventActions = eventPerms.actions || [];
      if (eventActions.includes('manage-staff') || eventActions.includes('managestaff')) {
        actions.push('manage-staff');
      }
    }
  }
  
  console.log('[eventActionPermissions] mapPermissionsToActions result:', actions);
  return actions;
}

/**
 * Fetch available actions from backend
 * Uses the event's linked request to get available actions
 * Falls back to parsing permissions from localStorage if backend fails
 */
async function fetchAvailableActionsFromBackend(
  event: any,
  userId: string
): Promise<EventAction[]> {
  try {
    const eventId = event?.Event_ID || event?.EventId || event?.id;
    const eventStatus = event?.Status || event?.status || 'Approved';
    
    console.log('[eventActionPermissions] fetchAvailableActionsFromBackend called:', {
      eventId,
      userId,
      eventStatus,
      eventKeys: Object.keys(event || {}).slice(0, 30),
      hasRequest: !!extractRequestId(event),
      requestId: extractRequestId(event),
    });
    
    let requestId = extractRequestId(event);
    
    // If no request ID found in event, try to fetch it by Event_ID
    if (!requestId && eventId) {
      console.log('[eventActionPermissions] No request ID in event, fetching by Event_ID...');
      requestId = await fetchRequestIdByEventId(eventId);
    }
    
    // Try to fetch from backend if we have a requestId
    if (requestId) {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')
          : null;
      
      if (token) {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };
        
        console.log('[eventActionPermissions] Fetching actions from backend:', {
          url: `${API_BASE}/api/event-requests/${encodeURIComponent(requestId)}/actions`,
          requestId,
        });
        
        try {
          const response = await fetch(`${API_BASE}/api/event-requests/${encodeURIComponent(requestId)}/actions`, {
            headers,
            credentials: 'include',
          });
          
          console.log('[eventActionPermissions] Backend response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
          });
          
          if (response.ok) {
            const body = await response.json();
            console.log('[eventActionPermissions] Backend response body:', JSON.stringify(body, null, 2));
            
            const actions = body.data?.actions || body.actions || [];
            console.log('[eventActionPermissions] Extracted actions from backend:', {
              rawActions: actions,
              actionsType: typeof actions,
              isArray: Array.isArray(actions),
              length: Array.isArray(actions) ? actions.length : 0,
            });
            
            // Normalize action names to match our EventAction type
            const normalizedActions: EventAction[] = actions
              .map((action: string) => {
                const lower = action.toLowerCase();
                if (lower === 'manage-staff' || lower === 'managestaff') return 'manage-staff';
                if (['view', 'edit', 'reschedule', 'cancel', 'delete'].includes(lower)) {
                  return lower as EventAction;
                }
                console.warn('[eventActionPermissions] Unknown action from backend:', action);
                return null;
              })
              .filter((action: EventAction | null): action is EventAction => action !== null);
            
            // Always include view
            if (!normalizedActions.includes('view')) {
              normalizedActions.unshift('view');
            }
            
            console.log('[eventActionPermissions] Final normalized actions from backend:', normalizedActions);
            
            // If backend returned more than just view, use it
            if (normalizedActions.length > 1) {
              return normalizedActions;
            }
            
            console.log('[eventActionPermissions] Backend returned only view, falling back to permission parsing');
          } else {
            const errorText = await response.text();
            console.warn(`[eventActionPermissions] Backend returned error: ${response.status}`, {
              errorText,
              requestId,
            });
          }
        } catch (fetchError) {
          console.error('[eventActionPermissions] Error calling backend:', fetchError);
        }
      }
    } else {
      console.warn('[eventActionPermissions] No request ID found for event:', {
        eventId,
        eventData: event,
        possibleRequestFields: {
          request: event?.request,
          Request_ID: event?.Request_ID,
          RequestId: event?.RequestId,
          requestId: event?.requestId,
        },
      });
    }
    
    // Fallback: Parse permissions from localStorage
    console.log('[eventActionPermissions] Falling back to permission parsing from localStorage...');
    const permissions = getUserPermissionsFromStorage();
    
    if (permissions.length > 0) {
      const actionsFromPermissions = mapPermissionsToActions(permissions, eventStatus);
      console.log('[eventActionPermissions] Actions from permissions:', actionsFromPermissions);
      return actionsFromPermissions;
    }
    
    console.warn('[eventActionPermissions] No permissions found, returning view only');
    return ['view'];
  } catch (error) {
    console.error('[eventActionPermissions] Error fetching available actions:', error);
    
    // Final fallback: try to parse permissions
    try {
      const permissions = getUserPermissionsFromStorage();
      if (permissions.length > 0) {
        const eventStatus = event?.Status || event?.status || 'Approved';
        return mapPermissionsToActions(permissions, eventStatus);
      }
    } catch (fallbackError) {
      console.error('[eventActionPermissions] Fallback permission parsing also failed:', fallbackError);
    }
    
    return ['view']; // Final fallback to view only
  }
}


/**
 * Get event action permissions
 * 
 * @param event - Event object
 * @param userId - User ID (optional, will be fetched if not provided)
 * @param forceRefresh - Force refresh from backend (ignore cache)
 * @returns Permission flags for each action
 */
export async function getEventActionPermissions(
  event: any,
  userId?: string | null,
  forceRefresh: boolean = false
): Promise<EventActionPermissions> {
  console.log('[eventActionPermissions] getEventActionPermissions called:', {
    eventId: event?.Event_ID || event?.EventId || event?.id,
    userId,
    forceRefresh,
    eventKeys: event ? Object.keys(event).slice(0, 20) : [],
  });
  
  // Get user ID
  const actualUserId = userId || getUserId();
  
  console.log('[eventActionPermissions] User ID resolved:', {
    provided: userId,
    resolved: actualUserId,
    hasUserId: !!actualUserId,
  });
  
  if (!actualUserId) {
    console.warn('[eventActionPermissions] No user ID, returning view-only');
    // Unauthenticated: view only
    return {
      canView: true,
      canEdit: false,
      canManageStaff: false,
      canReschedule: false,
      canCancel: false,
      canDelete: false,
    };
  }
  
  // Check cache
  const eventId = event?.Event_ID || event?.EventId || event?.id || 'unknown';
  const cacheKey = `${eventId}_${actualUserId}`;
  
  if (!forceRefresh && permissionCache.has(cacheKey)) {
    const cached = permissionCache.get(cacheKey)!;
    const now = Date.now();
    
    if (now - cached.timestamp < PERMISSION_CACHE_TTL) {
      console.log('[eventActionPermissions] Using cached permissions:', cached.permissions);
      return cached.permissions;
    } else {
      permissionCache.delete(cacheKey);
      console.log('[eventActionPermissions] Cache expired, fetching fresh');
    }
  }
  
  // Get user authority
  console.log('[eventActionPermissions] Fetching user authority...');
  const authority = await getUserAuthority(actualUserId, forceRefresh);
  const isAdminByAuthority = authority !== null && authority >= ADMIN_AUTHORITY_THRESHOLD;
  
  console.log('[eventActionPermissions] Authority check:', {
    eventId,
    userId: actualUserId,
    authority,
    isAdminByAuthority,
    threshold: ADMIN_AUTHORITY_THRESHOLD,
  });
  
  // If admin by authority, show all actions (backend will still validate)
  if (isAdminByAuthority) {
    console.log('[eventActionPermissions] User is admin by authority, granting all permissions');
    const permissions: EventActionPermissions = {
      canView: true,
      canEdit: true,
      canManageStaff: true,
      canReschedule: true,
      canCancel: true,
      canDelete: true, // Only for cancelled events, but we'll let backend handle that
    };
    
    // Cache the result
    permissionCache.set(cacheKey, {
      permissions,
      timestamp: Date.now(),
    });
    
    return permissions;
  }
  
  // For non-admin users, fetch available actions from backend
  console.log('[eventActionPermissions] Fetching available actions from backend...');
  const availableActions = await fetchAvailableActionsFromBackend(event, actualUserId);
  
  console.log('[eventActionPermissions] Available actions from backend:', availableActions);
  
  // Convert available actions array to permission flags
  const permissions: EventActionPermissions = {
    canView: availableActions.includes('view'),
    canEdit: availableActions.includes('edit'),
    canManageStaff: availableActions.includes('manage-staff'),
    canReschedule: availableActions.includes('reschedule'),
    canCancel: availableActions.includes('cancel'),
    canDelete: availableActions.includes('delete'),
  };
  
  console.log('[eventActionPermissions] Final permissions:', permissions);
  
  // Cache the result
  permissionCache.set(cacheKey, {
    permissions,
    timestamp: Date.now(),
  });
  
  return permissions;
}

/**
 * Get available actions array for an event
 * 
 * @param event - Event object
 * @param userId - User ID (optional)
 * @param forceRefresh - Force refresh from backend
 * @returns Array of available action names
 */
export async function getAvailableActions(
  event: any,
  userId?: string | null,
  forceRefresh: boolean = false
): Promise<EventAction[]> {
  const permissions = await getEventActionPermissions(event, userId, forceRefresh);
  
  const actions: EventAction[] = [];
  
  if (permissions.canView) actions.push('view');
  if (permissions.canEdit) actions.push('edit');
  if (permissions.canManageStaff) actions.push('manage-staff');
  if (permissions.canReschedule) actions.push('reschedule');
  if (permissions.canCancel) actions.push('cancel');
  if (permissions.canDelete) actions.push('delete');
  
  return actions;
}

/**
 * Clear permission cache for a specific event or all events
 * 
 * @param eventId - Event ID to clear, or undefined to clear all
 */
export function clearPermissionCache(eventId?: string): void {
  if (eventId) {
    // Clear all entries for this event
    const keysToDelete: string[] = [];
    permissionCache.forEach((value, key) => {
      if (key.startsWith(`${eventId}_`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => permissionCache.delete(key));
  } else {
    permissionCache.clear();
  }
}

/**
 * Check if user is admin by authority
 * 
 * @param userId - User ID (optional)
 * @returns True if user has authority >= 80
 */
export async function isAdminByAuthority(userId?: string | null): Promise<boolean> {
  const actualUserId = userId || getUserId();
  if (!actualUserId) return false;
  
  const authority = await getUserAuthority(actualUserId);
  return authority !== null && authority >= ADMIN_AUTHORITY_THRESHOLD;
}

