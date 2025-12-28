/**
 * Coordinator Service
 * API client for coordinator/staff management operations
 * Handles all backend communication for the coordinator management page
 */

import { fetchJsonWithAuth } from "@/utils/fetchWithAuth";
import type {
  StaffListItem,
  User,
  Role,
  CoverageArea,
  UserCoverageAssignment,
  Location,
  StaffFilters,
  CreateStaffData,
  UpdateStaffData,
} from "@/types/coordinator.types";

export interface ListUsersResponse {
  success: boolean;
  data: User[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface GetUserResponse {
  success: boolean;
  data: User & {
    roles?: Role[];
    permissions?: Array<{
      resource: string;
      actions: string[];
      metadata?: Record<string, any>;
    }>;
    locations?: Array<{
      locationId: string;
      scope: string;
      isPrimary: boolean;
    }>;
  };
}

export interface ListRolesResponse {
  success: boolean;
  data: Role[];
}

export interface ListCoverageAreasResponse {
  success: boolean;
  data: CoverageArea[];
  pagination?: {
    total: number;
    limit: number;
    skip: number;
  };
}

export interface ListLocationsResponse {
  success: boolean;
  data: Location[];
}

export interface UserRolesResponse {
  success: boolean;
  data: Role[];
}

export interface UserCoverageAreasResponse {
  success: boolean;
  data: UserCoverageAssignment[];
}

export interface AllowedStaffTypesResponse {
  success: boolean;
  data: string[]; // Array of role codes or ["*"] for all
}

export interface PageAccessResponse {
  success: boolean;
  canAccess: boolean;
  page: string;
}

/**
 * List staff/users with optional filters
 */
export async function listStaff(filters?: StaffFilters & {
  page?: number;
  limit?: number;
}): Promise<ListUsersResponse> {
  const params = new URLSearchParams();
  
  if (filters?.role && filters.role.length > 0) {
    filters.role.forEach(r => params.append('role', r));
  }
  if (filters?.organizationType && filters.organizationType.length > 0) {
    filters.organizationType.forEach(ot => params.append('organizationType', ot));
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }
  if (filters?.page) {
    params.append('page', String(filters.page));
  }
  if (filters?.limit) {
    params.append('limit', String(filters.limit));
  }

  const queryString = params.toString();
  const url = `/api/users${queryString ? `?${queryString}` : ''}`;
  
  return await fetchJsonWithAuth(url);
}

/**
 * List staff/users filtered by permission capabilities
 * @param capabilities - Array of capability strings (e.g., ['request.review', 'request.create'])
 * @param filters - Optional additional filters
 * @returns List of users with specified capabilities
 */
export async function listStaffByCapability(
  capabilities: string[],
  filters?: StaffFilters & {
    page?: number;
    limit?: number;
  }
): Promise<ListUsersResponse> {
  const params = new URLSearchParams();
  
  // Add capability filters
  capabilities.forEach(cap => params.append('capability', cap));
  
  // Add additional filters
  if (filters?.organizationType && filters.organizationType.length > 0) {
    filters.organizationType.forEach(ot => params.append('organizationType', ot));
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }
  if (filters?.page) {
    params.append('page', String(filters.page));
  }
  if (filters?.limit) {
    params.append('limit', String(filters.limit));
  }

  const queryString = params.toString();
  const url = `/api/users/by-capability${queryString ? `?${queryString}` : ''}`;
  
  return await fetchJsonWithAuth(url);
}

/**
 * Get roles filtered by permission capability
 * @param capability - Capability string (e.g., 'request.review', 'request.create')
 * @returns List of roles with the specified capability
 */
export async function getRolesByCapability(capability: string): Promise<ListRolesResponse> {
  // For now, fetch all roles and filter client-side
  // TODO: Add backend endpoint for this if needed
  const allRoles = await listRoles();
  
  if (!allRoles.success || !allRoles.data) {
    return { success: false, data: [] };
  }

  const [resource, action] = capability.split('.');
  
  const filteredRoles = allRoles.data.filter(role => {
    if (!role.permissions) return false;
    
    return role.permissions.some(perm => {
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
  });

  return {
    success: true,
    data: filteredRoles,
  };
}

/**
 * Check if a role has a specific capability
 * @param role - Role object
 * @param capability - Capability string (e.g., 'request.review')
 * @returns True if role has the capability
 */
export function roleHasCapability(role: Role, capability: string): boolean {
  if (!capability || !capability.includes('.')) {
    return false;
  }

  const [resource, action] = capability.split('.');

  if (!role.permissions) {
    return false;
  }

  return role.permissions.some(perm => {
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

/**
 * Get a single user by ID
 */
export async function getUser(userId: string): Promise<GetUserResponse> {
  return await fetchJsonWithAuth(`/api/users/${encodeURIComponent(userId)}`);
}

/**
 * Create a new staff/user
 * @param data - Staff creation data
 * @param pageContext - Optional page context ('coordinator-management' or 'stakeholder-management')
 */
export async function createStaff(
  data: CreateStaffData,
  pageContext?: 'coordinator-management' | 'stakeholder-management'
): Promise<{ success: boolean; data: User; message?: string }> {
  const { roles, coverageAreaIds, locationIds, ...userData } = data;
  
  // Prepare headers with page context if provided
  const headers: Record<string, string> = {};
  if (pageContext) {
    headers['x-page-context'] = pageContext;
  }
  
  // Create the user with roles and coverage areas in initial request (atomic)
  let userResponse;
  try {
    console.log('[createStaff] Sending user creation request:', {
      email: userData.email,
      roles: roles || [],
      coverageAreaIds: coverageAreaIds || [],
      pageContext
    });
    
    userResponse = await fetchJsonWithAuth('/api/users', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...userData,
        roles: roles || [], // Include roles in initial request for atomic creation
        coverageAreaIds: coverageAreaIds || [], // Include coverage areas in initial request
        pageContext, // Also include in body for compatibility
      }),
    });

    console.log('[createStaff] User creation response:', {
      success: userResponse.success,
      hasUserId: !!userResponse.data?._id,
      message: userResponse.message
    });
  } catch (error: any) {
    // Log error details for debugging
    console.error('[createStaff] User creation failed:', {
      error: error.message,
      response: error.response,
      body: error.body,
      status: error.response?.status
    });
    
    // Re-throw with more context
    const errorMessage = error.body?.message || 
                        error.body?.errors?.join(', ') || 
                        error.message || 
                        'Failed to create user';
    throw new Error(errorMessage);
  }

  if (!userResponse.success || !userResponse.data?._id) {
    const errorMessage = userResponse.message || 'Failed to create user';
    console.error('[createStaff] User creation returned unsuccessful response:', {
      success: userResponse.success,
      message: errorMessage,
      data: userResponse.data
    });
    throw new Error(errorMessage);
  }

  const userId = userResponse.data._id;

  // Roles are now assigned atomically during user creation, so we don't need separate calls
  // However, we still assign coverage areas separately if they weren't handled in the initial request
  // (for backward compatibility and to handle cases where backend doesn't process coverageAreaIds)

  // Then assign coverage areas
  if (coverageAreaIds && coverageAreaIds.length > 0) {
    for (let i = 0; i < coverageAreaIds.length; i++) {
      const coverageAreaId = coverageAreaIds[i];
      try {
        await fetchJsonWithAuth(`/api/users/${userId}/coverage-areas`, {
          method: 'POST',
          body: JSON.stringify({
            coverageAreaId,
            isPrimary: i === 0, // First one is primary
          }),
        });
      } catch (error) {
        console.error(`Failed to assign coverage area ${coverageAreaId}:`, error);
        // Continue with other coverage areas even if one fails
      }
    }
  }

  // If locationIds provided but no coverageAreaIds, create coverage areas
  if (locationIds && locationIds.length > 0 && (!coverageAreaIds || coverageAreaIds.length === 0)) {
    // This will be handled by the coverage assignment modal
    // For now, we'll create a coverage area with all selected locations
    try {
      const coverageAreaResponse = await fetchJsonWithAuth('/api/coverage-areas', {
        method: 'POST',
        body: JSON.stringify({
          name: `Coverage for ${userResponse.data.firstName} ${userResponse.data.lastName}`,
          geographicUnits: locationIds,
        }),
      });

      if (coverageAreaResponse.success && coverageAreaResponse.data?._id) {
        await fetchJsonWithAuth(`/api/users/${userId}/coverage-areas`, {
          method: 'POST',
          body: JSON.stringify({
            coverageAreaId: coverageAreaResponse.data._id,
            isPrimary: true,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to create coverage area:', error);
      // Don't fail the entire operation
    }
  }

  return userResponse;
}

/**
 * Update a staff/user
 */
export async function updateStaff(
  userId: string,
  data: UpdateStaffData
): Promise<{ success: boolean; data: User; message?: string }> {
  return await fetchJsonWithAuth(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a staff/user (soft delete)
 */
export async function deleteStaff(userId: string): Promise<{ success: boolean; message?: string }> {
  return await fetchJsonWithAuth(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

/**
 * List all roles
 */
export async function listRoles(): Promise<ListRolesResponse> {
  return await fetchJsonWithAuth('/api/roles');
}

/**
 * Get user's roles
 */
export async function getUserRoles(userId: string): Promise<UserRolesResponse> {
  return await fetchJsonWithAuth(`/api/users/${encodeURIComponent(userId)}/roles`);
}

/**
 * Assign role to user
 */
export async function assignRole(
  userId: string,
  roleId: string
): Promise<{ success: boolean; data: any; message?: string }> {
  return await fetchJsonWithAuth(`/api/users/${encodeURIComponent(userId)}/roles`, {
    method: 'POST',
    body: JSON.stringify({ roleId }),
  });
}

/**
 * Revoke role from user
 */
export async function revokeRole(
  userId: string,
  roleId: string
): Promise<{ success: boolean; message?: string }> {
  return await fetchJsonWithAuth(
    `/api/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Get allowed staff types for current user
 */
export async function getAllowedStaffTypes(userId: string): Promise<AllowedStaffTypesResponse> {
  return await fetchJsonWithAuth(`/api/rbac/permissions/user/${encodeURIComponent(userId)}/staff-types/create`);
}

/**
 * Get assignable roles for current user (filtered by authority)
 * @param context - Optional context ('coordinator-management' or 'stakeholder-management')
 */
export async function getAssignableRoles(context?: 'coordinator-management' | 'stakeholder-management'): Promise<ListRolesResponse> {
  const params = new URLSearchParams();
  if (context) {
    params.append('context', context);
  }
  const queryString = params.toString();
  return await fetchJsonWithAuth(`/api/rbac/authority/assignable-roles${queryString ? `?${queryString}` : ''}`);
}

/**
 * List coverage areas
 */
export async function listCoverageAreas(filters?: {
  organizationId?: string;
  geographicUnitId?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  skip?: number;
}): Promise<ListCoverageAreasResponse> {
  const params = new URLSearchParams();
  
  if (filters?.organizationId) params.append('organizationId', filters.organizationId);
  if (filters?.geographicUnitId) params.append('geographicUnitId', filters.geographicUnitId);
  if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
  if (filters?.search) params.append('search', filters.search);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.skip) params.append('skip', String(filters.skip));

  const queryString = params.toString();
  const url = `/api/coverage-areas${queryString ? `?${queryString}` : ''}`;
  
  return await fetchJsonWithAuth(url);
}

/**
 * Get coverage area by ID
 */
export async function getCoverageArea(coverageAreaId: string): Promise<{ success: boolean; data: CoverageArea }> {
  return await fetchJsonWithAuth(`/api/coverage-areas/${encodeURIComponent(coverageAreaId)}`);
}

/**
 * Create a coverage area
 */
export async function createCoverageArea(data: {
  name: string;
  geographicUnits: string[];
  description?: string;
  organizationId?: string;
}): Promise<{ success: boolean; data: CoverageArea; message?: string }> {
  return await fetchJsonWithAuth('/api/coverage-areas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get user's coverage areas
 */
export async function getUserCoverageAreas(userId: string): Promise<UserCoverageAreasResponse> {
  return await fetchJsonWithAuth(`/api/users/${encodeURIComponent(userId)}/coverage-areas`);
}

/**
 * Assign coverage area to user
 */
export async function assignCoverageArea(
  userId: string,
  coverageAreaId: string,
  options?: { isPrimary?: boolean; expiresAt?: string }
): Promise<{ success: boolean; data: UserCoverageAssignment; message?: string }> {
  return await fetchJsonWithAuth(`/api/users/${encodeURIComponent(userId)}/coverage-areas`, {
    method: 'POST',
    body: JSON.stringify({
      coverageAreaId,
      isPrimary: options?.isPrimary || false,
      expiresAt: options?.expiresAt,
    }),
  });
}

/**
 * Revoke coverage area from user
 */
export async function revokeCoverageArea(
  userId: string,
  coverageAreaId: string
): Promise<{ success: boolean; message?: string }> {
  return await fetchJsonWithAuth(
    `/api/users/${encodeURIComponent(userId)}/coverage-areas/${encodeURIComponent(coverageAreaId)}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * List locations by type
 */
export async function listLocationsByType(
  type: 'province' | 'district' | 'city' | 'municipality' | 'barangay' | 'custom'
): Promise<ListLocationsResponse> {
  return await fetchJsonWithAuth(`/api/locations/type/${type}`);
}

/**
 * List all locations
 */
export async function listLocations(filters?: {
  type?: string;
  parentId?: string;
  isActive?: boolean;
}): Promise<ListLocationsResponse> {
  const params = new URLSearchParams();
  
  if (filters?.type) params.append('type', filters.type);
  if (filters?.parentId) params.append('parentId', filters.parentId);
  if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));

  const queryString = params.toString();
  const url = `/api/locations${queryString ? `?${queryString}` : ''}`;
  
  return await fetchJsonWithAuth(url);
}

/**
 * Check page access
 */
export async function checkPageAccess(pageRoute: string): Promise<PageAccessResponse> {
  return await fetchJsonWithAuth(`/api/pages/check/${encodeURIComponent(pageRoute)}`);
}

/**
 * Transform backend user data to StaffListItem format
 */
export function transformUserToStaffListItem(
  user: User & {
    roles?: Role[];
    coverageAssignments?: Array<UserCoverageAssignment & {
      coverageAreaId?: CoverageArea | string;
    }>;
  }
): StaffListItem | null {
  // Validate authority: only transform users with authority >= 60 and authority !== 100
  // This ensures stakeholders and super admins are excluded
  const authority = (user as any).authority || 20;
  if (authority < 60 || authority === 100) {
    console.warn(`[transformUserToStaffListItem] Skipping user ${user.email} - invalid authority: ${authority}`);
    return null;
  }

  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');

  // Transform roles
  const transformedRoles = (user.roles || []).map(r => ({
    id: r._id,
    code: r.code,
    name: r.name,
    description: r.description,
  }));

  // Transform coverage areas
  const transformedCoverageAreas = (user.coverageAssignments || []).map((assignment) => {
    // Handle both populated and unpopulated coverageAreaId
    let coverageArea: CoverageArea | null = null;
    
    if (typeof assignment.coverageAreaId === 'object' && assignment.coverageAreaId !== null) {
      coverageArea = assignment.coverageAreaId as CoverageArea;
    } else if (typeof assignment.coverageAreaId === 'string') {
      // If it's just an ID, we'll need to fetch it separately or return minimal data
      // For now, return what we can
      return {
        id: assignment.coverageAreaId,
        name: 'Loading...', // Will be populated when coverage area is fetched
        geographicUnits: [],
        isPrimary: assignment.isPrimary || false,
      };
    }
    
    if (!coverageArea) {
      return null;
    }

    // Transform geographic units
    const geographicUnits = (coverageArea.geographicUnits || []).map((unit: any) => {
      if (typeof unit === 'string') {
        return {
          id: unit,
          name: '',
          type: '',
        };
      }
      return {
        id: unit._id || unit.id || '',
        name: unit.name || '',
        type: unit.type || '',
      };
    });

    return {
      id: coverageArea._id,
      name: coverageArea.name,
      geographicUnits,
      isPrimary: assignment.isPrimary || false,
    };
  }).filter((ca): ca is NonNullable<typeof ca> => ca !== null);

  // Transform organizations array (coordinators can have multiple)
  const transformedOrganizations = ((user as any).organizations || []).map((org: any) => {
    // Handle both ObjectId references and embedded objects
    const orgId = org.organizationId?._id || org.organizationId?._id?.toString() || 
                  (typeof org.organizationId === 'string' ? org.organizationId : org.organizationId?.toString()) ||
                  org._id?.toString() || '';
    
    return {
      id: orgId,
      name: org.organizationName || org.name || '',
      type: (org.organizationType || org.type || 'Other') as 'LGU' | 'NGO' | 'Hospital' | 'BloodBank' | 'RedCross' | 'Non-LGU' | 'Other',
      isPrimary: org.isPrimary || false,
    };
  }).filter(org => org.id && org.name); // Filter out invalid organizations

  // Get primary organization for backward compatibility
  const primaryOrg = transformedOrganizations.find(org => org.isPrimary) || transformedOrganizations[0] || null;

  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    fullName,
    phoneNumber: user.phoneNumber,
    organizationType: primaryOrg?.type || user.organizationType,
    organizationName: primaryOrg?.name || user.organizationInstitution,
    organizationId: primaryOrg?.id || user.organizationId,
    organizations: transformedOrganizations.length > 0 ? transformedOrganizations : undefined,
    roles: transformedRoles,
    coverageAreas: transformedCoverageAreas,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

