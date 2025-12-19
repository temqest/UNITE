/**
 * Permission Mapping Configuration
 * Maps page routes to required permissions for access control
 * 
 * This is the single source of truth for page access rules.
 * When adding new pages, update this mapping.
 * 
 * Permission Logic:
 * - Empty array []: Accessible to all authenticated users
 * - Array with single permission: User must have that permission
 * - Array with multiple permissions: 
 *   - OR logic: User needs at least one permission (use with checkPageAccess)
 *   - AND logic: User needs all permissions (handled in useSidebarNavigation)
 */

export interface PagePermissionConfig {
  /** Page route identifier */
  route: string;
  /** Required permissions (empty = all authenticated users) */
  requiredPermissions: string[];
  /** Whether all permissions are required (AND logic) or any permission (OR logic) */
  requireAll?: boolean;
  /** Additional check function for complex logic (e.g., staff type restrictions) */
  additionalCheck?: (userPermissions: UserPermissions) => Promise<boolean>;
}

export interface UserPermissions {
  /** Array of permission objects from backend */
  permissions: Array<{
    resource: string;
    actions: string[];
    metadata?: Record<string, any>;
  }>;
  /** Accessible pages from /api/pages/accessible */
  accessiblePages?: string[];
}

/**
 * Page Permission Mapping
 * Defines which permissions are required for each page
 */
export const PAGE_PERMISSION_MAP: Record<string, PagePermissionConfig> = {
  campaign: {
    route: 'campaign',
    // OR logic: User needs at least one of these permissions
    requiredPermissions: ['request.create', 'request.review', 'event.create', 'event.read', 'event.update'],
    requireAll: false,
  },
  calendar: {
    route: 'calendar',
    requiredPermissions: ['event.read'],
    requireAll: false,
  },
  chat: {
    route: 'chat',
    // Chat permissions - to be determined from backend
    // Using generic chat permission check
    requiredPermissions: ['chat.read', 'chat.send'],
    requireAll: false,
  },
  'stakeholder-management': {
    route: 'stakeholder-management',
    // AND logic: User needs all staff CRUD permissions
    // Additional check needed for staff type restrictions
    requiredPermissions: ['staff.read', 'staff.create', 'staff.update', 'staff.delete'],
    requireAll: true,
    additionalCheck: async (userPermissions) => {
      // Check if user can manage stakeholder type
      // This should call /api/rbac/permissions/user/:userId/staff-types/create
      // For now, we'll check if staff permissions exist
      // The backend will handle staff type restrictions
      return true; // Backend handles this via page access check
    },
  },
  'coordinator-management': {
    route: 'coordinator-management',
    // AND logic: User needs all staff CRUD permissions
    // Additional check needed for staff type restrictions
    requiredPermissions: ['staff.read', 'staff.create', 'staff.update', 'staff.delete'],
    requireAll: true,
    additionalCheck: async (userPermissions) => {
      // Check if user can manage staff type
      // This should call /api/rbac/permissions/user/:userId/staff-types/create
      // For now, we'll check if staff permissions exist
      // The backend will handle staff type restrictions
      return true; // Backend handles this via page access check
    },
  },
  notification: {
    route: 'notification',
    requiredPermissions: [], // All authenticated users
    requireAll: false,
  },
  settings: {
    route: 'settings',
    requiredPermissions: [], // All authenticated users
    requireAll: false,
  },
};

/**
 * Check if user has a specific permission
 * Supports wildcard permissions (e.g., 'event.*' matches 'event.create', 'event.read', etc.)
 */
export function hasPermission(
  userPermissions: UserPermissions,
  resource: string,
  action: string
): boolean {
  return userPermissions.permissions.some((perm) => {
    // Check wildcard resource
    if (perm.resource === '*' && (perm.actions.includes('*') || perm.actions.includes(action))) {
      return true;
    }
    // Check exact resource match
    if (perm.resource === resource) {
      // Check wildcard action
      if (perm.actions.includes('*')) {
        return true;
      }
      // Check exact action
      if (perm.actions.includes(action)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Check if user has any of the required permissions (OR logic)
 */
export function hasAnyPermission(
  userPermissions: UserPermissions,
  permissions: string[]
): boolean {
  if (permissions.length === 0) {
    return true; // No permissions required = accessible to all
  }

  return permissions.some((perm) => {
    const [resource, action] = perm.split('.');
    return hasPermission(userPermissions, resource, action);
  });
}

/**
 * Check if user has all required permissions (AND logic)
 */
export function hasAllPermissions(
  userPermissions: UserPermissions,
  permissions: string[]
): boolean {
  if (permissions.length === 0) {
    return true; // No permissions required = accessible to all
  }

  return permissions.every((perm) => {
    const [resource, action] = perm.split('.');
    return hasPermission(userPermissions, resource, action);
  });
}

/**
 * Get all page routes from the mapping
 */
export function getAllPageRoutes(): string[] {
  return Object.keys(PAGE_PERMISSION_MAP);
}

/**
 * Get permission config for a specific page route
 */
export function getPageConfig(route: string): PagePermissionConfig | undefined {
  return PAGE_PERMISSION_MAP[route];
}
