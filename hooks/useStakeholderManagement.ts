/**
 * useStakeholderManagement Hook
 * Business logic hook for stakeholder management page
 * Uses dedicated stakeholder creation context endpoint
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchJsonWithAuth } from '@/utils/fetchWithAuth';
import type { Organization } from './useCoverageAreas';
import type { Location } from './useLocations';

export interface CreationContext {
  allowedRole: string;
  canChooseMunicipality: boolean;
  canChooseOrganization: boolean;
  municipalityOptions: Location[];
  barangayOptions: Location[];
  organizationOptions: Organization[];
  isSystemAdmin: boolean;
}

export interface UseStakeholderManagementReturn {
  // State (from backend)
  allowedRole: string;
  canChooseMunicipality: boolean;
  canChooseOrganization: boolean;
  municipalityOptions: Location[];
  barangayOptions: Location[];
  organizationOptions: Organization[];
  isSystemAdmin: boolean;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchCreationContext: () => Promise<void>;
  fetchBarangays: (municipalityId: string) => Promise<void>;
  
  // Legacy compatibility (for existing components)
  assignableRoles: never[]; // Always empty - role is forced to stakeholder
  creatorCoverageAreas: Location[]; // Alias for municipalityOptions (for backward compatibility)
  allowedOrganizations: Organization[]; // Alias for organizationOptions
  canAssignRole: (roleId: string) => boolean; // Always returns false (no role selection)
  canSelectCoverageArea: (coverageAreaId: string) => boolean; // Deprecated - use municipality
  canSelectOrganization: (organizationId: string) => boolean;
}

export function useStakeholderManagement(): UseStakeholderManagementReturn {
  const [allowedRole, setAllowedRole] = useState<string>('stakeholder');
  const [canChooseMunicipality, setCanChooseMunicipality] = useState<boolean>(false);
  const [canChooseOrganization, setCanChooseOrganization] = useState<boolean>(false);
  const [municipalityOptions, setMunicipalityOptions] = useState<Location[]>([]);
  const [barangayOptions, setBarangayOptions] = useState<Location[]>([]);
  const [organizationOptions, setOrganizationOptions] = useState<Organization[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch creation context from dedicated stakeholder endpoint
   */
  const fetchCreationContext = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchJsonWithAuth('/api/stakeholders/creation-context');
      
      if (response.success && response.data) {
        const context: CreationContext = response.data;
        setAllowedRole(context.allowedRole);
        setCanChooseMunicipality(context.canChooseMunicipality);
        setCanChooseOrganization(context.canChooseOrganization);
        setMunicipalityOptions(context.municipalityOptions || []);
        setBarangayOptions(context.barangayOptions || []);
        setOrganizationOptions(context.organizationOptions || []);
        setIsSystemAdmin(context.isSystemAdmin);
        
        // Diagnostic logging
        console.log('[DIAG] Stakeholder Creation Context:', {
          allowedRole: context.allowedRole,
          canChooseMunicipality: context.canChooseMunicipality,
          canChooseOrganization: context.canChooseOrganization,
          municipalityOptionsCount: context.municipalityOptions?.length || 0,
          barangayOptionsCount: context.barangayOptions?.length || 0,
          organizationOptionsCount: context.organizationOptions?.length || 0,
          isSystemAdmin: context.isSystemAdmin
        });
      } else {
        throw new Error(response.message || 'Failed to fetch creation context');
      }
    } catch (err: any) {
      console.error('Failed to fetch creation context:', err);
      setError(err.message || 'Failed to fetch creation context');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if a role can be assigned (always false - role is forced to stakeholder)
   */
  const canAssignRole = useCallback((roleId: string): boolean => {
    return false; // Role selection is disabled - always stakeholder
  }, []);

  /**
   * Fetch barangays for a municipality
   */
  const fetchBarangays = useCallback(async (municipalityId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchJsonWithAuth(`/api/stakeholders/barangays/${municipalityId}`);
      
      if (response.success && response.data) {
        setBarangayOptions(response.data || []);
        console.log('[DIAG] Fetched barangays:', {
          municipalityId,
          barangayCount: response.data?.length || 0
        });
      } else {
        throw new Error(response.message || 'Failed to fetch barangays');
      }
    } catch (err: any) {
      console.error('Failed to fetch barangays:', err);
      setError(err.message || 'Failed to fetch barangays');
      setBarangayOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if a coverage area can be selected (deprecated - use municipality)
   */
  const canSelectCoverageArea = useCallback((coverageAreaId: string): boolean => {
    // Legacy compatibility - always return true for municipality-based selection
    return true;
  }, []);

  /**
   * Check if an organization can be selected
   */
  const canSelectOrganization = useCallback((organizationId: string): boolean => {
    if (canChooseOrganization) {
      return true; // System admin can choose any
    }
    return organizationOptions.some(org => {
      const id = org._id || org.id;
      return String(id) === String(organizationId);
    });
  }, [canChooseOrganization, organizationOptions]);

  // Fetch data on mount
  useEffect(() => {
    fetchCreationContext();
  }, [fetchCreationContext]);

  return {
    // New API (from backend)
    allowedRole,
    canChooseMunicipality,
    canChooseOrganization,
    municipalityOptions,
    barangayOptions,
    organizationOptions,
    isSystemAdmin,
    loading,
    error,
    fetchCreationContext,
    fetchBarangays,
    
    // Legacy compatibility
    assignableRoles: [], // Always empty - role is forced to stakeholder
    creatorCoverageAreas: municipalityOptions, // Alias for municipalityOptions (for backward compatibility)
    allowedOrganizations: organizationOptions, // Alias for organizationOptions
    canAssignRole,
    canSelectCoverageArea,
    canSelectOrganization,
  };
}

