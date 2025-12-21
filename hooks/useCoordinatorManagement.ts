/**
 * useCoordinatorManagement Hook
 * Main business logic hook for coordinator/staff management page
 * Handles all state, API calls, filtering, and data transformation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  listStaff,
  listStaffByCapability,
  getUser,
  createStaff,
  updateStaff,
  deleteStaff,
  getUserRoles,
  getUserCoverageAreas,
  assignRole,
  revokeRole,
  assignCoverageArea,
  revokeCoverageArea,
  checkPageAccess,
  transformUserToStaffListItem,
  getAllowedStaffTypes,
  getCoverageArea,
} from '@/services/coordinatorService';
import type {
  StaffListItem,
  StaffFilters,
  CreateStaffData,
  UpdateStaffData,
} from '@/types/coordinator.types';

export interface UseCoordinatorManagementReturn {
  // State
  staff: StaffListItem[];
  loading: boolean;
  error: string | null;
  canManageStaff: boolean;
  checkingAccess: boolean;
  filters: StaffFilters;
  searchQuery: string;
  selectedStaff: string[];
  
  // Actions
  handleAddStaff: () => void;
  handleEditStaff: (id: string) => void;
  handleDeleteStaff: (id: string, name?: string) => void;
  handleSearch: (query: string) => void;
  handleFilter: (filters: StaffFilters) => void;
  handleSelectStaff: (id: string, checked: boolean) => void;
  handleSelectAll: (checked: boolean) => void;
  handleClearFilters: () => void;
  
  // Data operations
  fetchStaff: () => Promise<void>;
  createStaffMember: (data: CreateStaffData, pageContext?: 'coordinator-management' | 'stakeholder-management') => Promise<StaffListItem>;
  updateStaffMember: (id: string, data: UpdateStaffData) => Promise<void>;
  deleteStaffMember: (id: string) => Promise<void>;
  
  // Role operations
  assignRoleToStaff: (userId: string, roleId: string) => Promise<void>;
  revokeRoleFromStaff: (userId: string, roleId: string) => Promise<void>;
  
  // Coverage operations
  assignCoverageAreaToStaff: (userId: string, coverageAreaId: string, isPrimary?: boolean) => Promise<void>;
  revokeCoverageAreaFromStaff: (userId: string, coverageAreaId: string) => Promise<void>;
  
  // Permissions
  getAllowedStaffTypesForCurrentUser: () => Promise<string[]>;
}

export function useCoordinatorManagement(): UseCoordinatorManagementReturn {
  const router = useRouter();
  
  // State
  const [staff, setStaff] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManageStaff, setCanManageStaff] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [filters, setFilters] = useState<StaffFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);

  /**
   * Check page access permission
   */
  const checkAccess = useCallback(async () => {
    try {
      setCheckingAccess(true);
      const response = await checkPageAccess('coordinator-management');
      
      if (response.success && response.canAccess) {
        setCanManageStaff(true);
      } else {
        setCanManageStaff(false);
        router.replace('/error');
      }
    } catch (err: any) {
      console.error('Error checking page access:', err);
      setCanManageStaff(false);
      router.replace('/error');
    } finally {
      setCheckingAccess(false);
    }
  }, [router]);

  /**
   * Fetch staff list (filtered by operational capabilities)
   */
  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build filters for API call
      const apiFilters: StaffFilters & { limit?: number } = {
        limit: 1000, // Get all for now, can paginate later
      };

      // Add organization type filter if specified
      if (filters.organizationType && filters.organizationType.length > 0) {
        apiFilters.organizationType = filters.organizationType;
      }

      // Add search query if specified
      if (searchQuery) {
        apiFilters.search = searchQuery;
      }

      // Use capability-based filtering for operational staff
      // Operational capabilities: request.create, event.create/update, staff.create/update
      // Note: Using actual permission strings that exist in the database
      const operationalCapabilities = [
        'request.create',
        'event.create',
        'event.update',
        'staff.create',
        'staff.update'
      ];

      const response = await listStaffByCapability(operationalCapabilities, apiFilters);

      if (response.success && response.data) {
        // Transform each user to StaffListItem
        // We need to fetch roles and coverage areas for each user
        const staffList: StaffListItem[] = [];
        
        for (const user of response.data) {
          try {
            // Fetch roles and coverage areas
            const [rolesResponse, coverageResponse] = await Promise.all([
              getUserRoles(user._id).catch(() => ({ success: false, data: [] })),
              getUserCoverageAreas(user._id).catch(() => ({ success: false, data: [] })),
            ]);

            const roles = rolesResponse.success ? rolesResponse.data : [];
            let coverageAssignments = coverageResponse.success ? coverageResponse.data : [];

            // If coverage assignments have unpopulated coverageAreaId, fetch coverage area details
            if (coverageAssignments.length > 0) {
              const populatedAssignments = await Promise.all(
                coverageAssignments.map(async (assignment: any) => {
                  if (typeof assignment.coverageAreaId === 'string') {
                    // Fetch coverage area details
                    try {
                      const caResponse = await getCoverageArea(assignment.coverageAreaId);
                      if (caResponse.success && caResponse.data) {
                        return {
                          ...assignment,
                          coverageAreaId: caResponse.data,
                        };
                      }
                    } catch (err) {
                      console.error(`Failed to fetch coverage area ${assignment.coverageAreaId}:`, err);
                    }
                  }
                  return assignment;
                })
              );
              coverageAssignments = populatedAssignments;
            }

            const staffItem = transformUserToStaffListItem({
              ...user,
              roles,
              coverageAssignments,
            });

            staffList.push(staffItem);
          } catch (err) {
            console.error(`Failed to fetch details for user ${user._id}:`, err);
            // Still add the user with empty roles/coverage
            staffList.push(transformUserToStaffListItem(user));
          }
        }

        // Apply client-side filtering for coverage areas (if needed)
        // Note: Backend already filters by operational capabilities, so we don't need to filter again
        let filteredList = staffList;

        if (filters.coverageAreaId && filters.coverageAreaId.length > 0) {
          filteredList = filteredList.filter(staffMember =>
            staffMember.coverageAreas.some(ca =>
              filters.coverageAreaId!.includes(ca.id)
            )
          );
        }

        // No need to filter by capabilities here - backend already did that via listStaffByCapability()
        setStaff(filteredList);
      } else {
        throw new Error(response.message || 'Failed to fetch staff');
      }
    } catch (err: any) {
      console.error('Failed to fetch staff:', err);
      setError(err.message || 'Failed to fetch staff');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery]);

  /**
   * Create staff member
   */
  const createStaffMember = useCallback(async (data: CreateStaffData, pageContext?: 'coordinator-management' | 'stakeholder-management'): Promise<StaffListItem> => {
    try {
      setError(null);
      const response = await createStaff(data, pageContext);
      
      if (response.success && response.data) {
        // Fetch full details including roles and coverage
        const [rolesResponse, coverageResponse] = await Promise.all([
          getUserRoles(response.data._id).catch(() => ({ success: false, data: [] })),
          getUserCoverageAreas(response.data._id).catch(() => ({ success: false, data: [] })),
        ]);

        const roles = rolesResponse.success ? rolesResponse.data : [];
        const coverageAssignments = coverageResponse.success ? coverageResponse.data : [];

        const staffItem = transformUserToStaffListItem({
          ...response.data,
          roles,
          coverageAssignments,
        });

        // Add to list
        setStaff(prev => [...prev, staffItem]);
        
        return staffItem;
      }
      throw new Error(response.message || 'Failed to create staff');
    } catch (err: any) {
      console.error('Failed to create staff:', err);
      setError(err.message || 'Failed to create staff');
      throw err;
    }
  }, []);

  /**
   * Update staff member
   */
  const updateStaffMember = useCallback(async (id: string, data: UpdateStaffData): Promise<void> => {
    try {
      setError(null);
      const response = await updateStaff(id, data);
      
      if (response.success) {
        // Refresh the staff list
        await fetchStaff();
      } else {
        throw new Error(response.message || 'Failed to update staff');
      }
    } catch (err: any) {
      console.error('Failed to update staff:', err);
      setError(err.message || 'Failed to update staff');
      throw err;
    }
  }, [fetchStaff]);

  /**
   * Delete staff member
   */
  const deleteStaffMember = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      const response = await deleteStaff(id);
      
      if (response.success) {
        // Remove from list
        setStaff(prev => prev.filter(s => s.id !== id));
        setSelectedStaff(prev => prev.filter(s => s !== id));
      } else {
        throw new Error(response.message || 'Failed to delete staff');
      }
    } catch (err: any) {
      console.error('Failed to delete staff:', err);
      setError(err.message || 'Failed to delete staff');
      throw err;
    }
  }, []);

  /**
   * Assign role to staff
   */
  const assignRoleToStaff = useCallback(async (userId: string, roleId: string): Promise<void> => {
    try {
      await assignRole(userId, roleId);
      // Refresh staff list
      await fetchStaff();
    } catch (err: any) {
      console.error('Failed to assign role:', err);
      throw err;
    }
  }, [fetchStaff]);

  /**
   * Revoke role from staff
   */
  const revokeRoleFromStaff = useCallback(async (userId: string, roleId: string): Promise<void> => {
    try {
      await revokeRole(userId, roleId);
      // Refresh staff list
      await fetchStaff();
    } catch (err: any) {
      console.error('Failed to revoke role:', err);
      throw err;
    }
  }, [fetchStaff]);

  /**
   * Assign coverage area to staff
   */
  const assignCoverageAreaToStaff = useCallback(async (
    userId: string,
    coverageAreaId: string,
    isPrimary = false
  ): Promise<void> => {
    try {
      await assignCoverageArea(userId, coverageAreaId, { isPrimary });
      // Refresh staff list
      await fetchStaff();
    } catch (err: any) {
      console.error('Failed to assign coverage area:', err);
      throw err;
    }
  }, [fetchStaff]);

  /**
   * Revoke coverage area from staff
   */
  const revokeCoverageAreaFromStaff = useCallback(async (
    userId: string,
    coverageAreaId: string
  ): Promise<void> => {
    try {
      await revokeCoverageArea(userId, coverageAreaId);
      // Refresh staff list
      await fetchStaff();
    } catch (err: any) {
      console.error('Failed to revoke coverage area:', err);
      throw err;
    }
  }, [fetchStaff]);

  /**
   * Get allowed staff types for current user
   */
  const getAllowedStaffTypesForCurrentUser = useCallback(async (): Promise<string[]> => {
    try {
      // Get current user ID from localStorage
      const rawUser = typeof window !== 'undefined' ? localStorage.getItem('unite_user') : null;
      if (!rawUser) return [];

      const user = JSON.parse(rawUser);
      const userId = user?.id || user?._id || user?.ID;
      if (!userId) return [];

      const response = await getAllowedStaffTypes(userId);
      if (response.success) {
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Failed to get allowed staff types:', err);
      return [];
    }
  }, []);

  // Handlers
  const handleAddStaff = useCallback(() => {
    // This will be handled by the parent component
  }, []);

  const handleEditStaff = useCallback((id: string) => {
    // This will be handled by the parent component
  }, []);

  const handleDeleteStaff = useCallback((id: string, name?: string) => {
    // This will be handled by the parent component
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFilter = useCallback((newFilters: StaffFilters) => {
    setFilters(newFilters);
  }, []);

  const handleSelectStaff = useCallback((id: string, checked: boolean) => {
    if (checked) {
      setSelectedStaff(prev => [...prev, id]);
    } else {
      setSelectedStaff(prev => prev.filter(s => s !== id));
    }
  }, []);


  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  // Effects
  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  useEffect(() => {
    if (canManageStaff && !checkingAccess) {
      fetchStaff();
    }
  }, [canManageStaff, checkingAccess, fetchStaff]);

  // Apply search filter to staff list (client-side for instant feedback)
  const filteredStaff = useMemo(() => {
    return staff.filter((staffMember) => {
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        staffMember.fullName.toLowerCase().includes(query) ||
        staffMember.email.toLowerCase().includes(query) ||
        staffMember.phoneNumber?.toLowerCase().includes(query) ||
        staffMember.roles.some(r => r.name.toLowerCase().includes(query) || r.code.toLowerCase().includes(query)) ||
        staffMember.coverageAreas.some(ca => ca.name.toLowerCase().includes(query))
      );
    });
  }, [staff, searchQuery]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedStaff(filteredStaff.map(s => s.id));
    } else {
      setSelectedStaff([]);
    }
  }, [filteredStaff]);

  return {
    // State
    staff: filteredStaff, // Return filtered staff
    loading,
    error,
    canManageStaff,
    checkingAccess,
    filters,
    searchQuery,
    selectedStaff,
    
    // Actions
    handleAddStaff,
    handleEditStaff,
    handleDeleteStaff,
    handleSearch,
    handleFilter,
    handleSelectStaff,
    handleSelectAll,
    handleClearFilters,
    
    // Data operations
    fetchStaff,
    createStaffMember,
    updateStaffMember,
    deleteStaffMember,
    
    // Role operations
    assignRoleToStaff,
    revokeRoleFromStaff,
    
    // Coverage operations
    assignCoverageAreaToStaff,
    revokeCoverageAreaFromStaff,
    
    // Permissions
    getAllowedStaffTypesForCurrentUser,
  };
}

