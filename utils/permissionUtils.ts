/**
 * Permission Utilities
 * Helper functions for checking user capabilities and classifying staff
 */

import type { User, StaffListItem, Role } from '@/types/coordinator.types';

export interface UserWithPermissions extends User {
  permissions?: Array<{
    resource: string;
    actions: string[];
    metadata?: Record<string, any>;
  }>;
  roles?: Role[];
}

/**
 * Check if a user has a specific capability
 * @param user - User object with roles/permissions
 * @param capability - Permission capability (e.g., 'request.review', 'request.create')
 * @returns True if user has the capability
 */
export function hasCapability(
  user: UserWithPermissions | StaffListItem,
  capability: string
): boolean {
  // Defensive: handle invalid input
  if (!capability || !capability.includes('.')) {
    return false;
  }

  // Defensive: handle missing user object
  if (!user) {
    return false;
  }

  const [resource, action] = capability.split('.');

  // Check if user has permissions array
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.some((perm) => {
      // Defensive: handle malformed permission objects
      if (!perm || !perm.resource || !Array.isArray(perm.actions)) {
        return false;
      }
      // Check wildcard permissions
      if (perm.resource === '*' && (perm.actions.includes('*') || perm.actions.includes(action))) {
        return true;
      }
      // Check specific resource permission
      if (perm.resource === resource && (perm.actions.includes('*') || perm.actions.includes(action))) {
        return true;
      }
      return false;
    });
  }

  // Fallback: check roles if permissions not available
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some((role) => {
      // Defensive: handle missing or malformed role
      if (!role || !role.permissions || !Array.isArray(role.permissions)) {
        return false;
      }
      return role.permissions.some((perm) => {
        // Defensive: handle malformed permission objects
        if (!perm || !perm.resource || !Array.isArray(perm.actions)) {
          return false;
        }
        if (perm.resource === '*' && (perm.actions.includes('*') || perm.actions.includes(action))) {
          return true;
        }
        if (perm.resource === resource && (perm.actions.includes('*') || perm.actions.includes(action))) {
          return true;
        }
        return false;
      });
    });
  }

  return false;
}

/**
 * Get all capabilities for a user
 * @param user - User object with roles/permissions
 * @returns Array of capability strings
 */
export function getUserCapabilities(
  user: UserWithPermissions | StaffListItem
): string[] {
  // Defensive: handle missing user
  if (!user) {
    return [];
  }

  const capabilities: string[] = [];

  // Check permissions array first
  if (user.permissions && Array.isArray(user.permissions)) {
    for (const perm of user.permissions) {
      // Defensive: handle malformed permission objects
      if (!perm || !perm.resource || !Array.isArray(perm.actions)) {
        continue;
      }
      if (perm.resource === '*') {
        // Wildcard resource - return special marker
        if (perm.actions.includes('*')) {
          return ['*']; // All capabilities
        }
        // Wildcard resource with specific actions
        for (const action of perm.actions) {
          if (action) {
            capabilities.push(`*.${action}`);
          }
        }
      } else {
        // Specific resource
        for (const action of perm.actions) {
          if (!action) continue;
          if (action === '*') {
            capabilities.push(`${perm.resource}.*`);
          } else {
            capabilities.push(`${perm.resource}.${action}`);
          }
        }
      }
    }
  }

  // Fallback: check roles if permissions not available
  if ((!user.permissions || capabilities.length === 0) && user.roles && Array.isArray(user.roles)) {
    for (const role of user.roles) {
      // Defensive: handle missing or malformed role
      if (!role || !role.permissions || !Array.isArray(role.permissions)) {
        continue;
      }
      for (const perm of role.permissions) {
        // Defensive: handle malformed permission objects
        if (!perm || !perm.resource || !Array.isArray(perm.actions)) {
          continue;
        }
        if (perm.resource === '*') {
          if (perm.actions.includes('*')) {
            return ['*']; // All capabilities
          }
          for (const action of perm.actions) {
            if (action) {
              capabilities.push(`*.${action}`);
            }
          }
        } else {
          for (const action of perm.actions) {
            if (!action) continue;
            if (action === '*') {
              capabilities.push(`${perm.resource}.*`);
            } else {
              capabilities.push(`${perm.resource}.${action}`);
            }
          }
        }
      }
    }
  }

  return [...new Set(capabilities)]; // Remove duplicates
}

/**
 * Check if user is a stakeholder (has request.review permission)
 * @param user - User object
 * @returns True if user has request.review capability
 */
export function isStakeholder(user: UserWithPermissions | StaffListItem): boolean {
  return hasCapability(user, 'request.review');
}

/**
 * Check if user is a coordinator/operator (has operational permissions)
 * @param user - User object
 * @returns True if user has at least one operational capability
 */
export function isCoordinator(user: UserWithPermissions | StaffListItem): boolean {
  // Check for any operational capability that actually exists in the database
  const operationalCapabilities = [
    'request.create',
    'event.create',
    'event.update',
    'staff.create',
    'staff.update'
  ];

  return operationalCapabilities.some((cap) => hasCapability(user, cap));
}

/**
 * Check if user is hybrid (has both review and operational permissions)
 * @param user - User object
 * @returns True if user has both review and operational capabilities
 */
export function isHybrid(user: UserWithPermissions | StaffListItem): boolean {
  return isStakeholder(user) && isCoordinator(user);
}

/**
 * Get user classification type
 * @param user - User object
 * @returns Classification type: 'stakeholder', 'coordinator', 'hybrid', or 'none'
 */
export function getUserClassification(
  user: UserWithPermissions | StaffListItem
): 'stakeholder' | 'coordinator' | 'hybrid' | 'none' {
  const hasReview = isStakeholder(user);
  const hasOperational = isCoordinator(user);

  if (hasReview && hasOperational) {
    return 'hybrid';
  }
  if (hasReview) {
    return 'stakeholder';
  }
  if (hasOperational) {
    return 'coordinator';
  }
  return 'none';
}

/**
 * Get capability badges for display
 * @param user - User object
 * @returns Array of badge labels
 */
export function getCapabilityBadges(
  user: UserWithPermissions | StaffListItem
): string[] {
  const badges: string[] = [];
  const classification = getUserClassification(user);

  switch (classification) {
    case 'hybrid':
      badges.push('Hybrid');
      badges.push('Reviewer');
      badges.push('Operator');
      break;
    case 'stakeholder':
      badges.push('Reviewer');
      break;
    case 'coordinator':
      badges.push('Operator');
      break;
    default:
      // No specific classification
      break;
  }

  return badges;
}

