/**
 * TypeScript interfaces for Coordinator Management
 * Aligned with new architecture: Users, Roles, Coverage Areas
 */

export interface StaffListItem {
  id: string; // User._id
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string; // Computed
  phoneNumber?: string;
  organizationType?: 'LGU' | 'NGO' | 'Hospital' | 'RedCross' | 'Non-LGU' | 'Other';
  organizationName?: string;
  organizationId?: string;
  organizations?: Array<{
    id: string;
    name: string;
    type: 'LGU' | 'NGO' | 'Hospital' | 'BloodBank' | 'RedCross' | 'Non-LGU' | 'Other';
    isPrimary: boolean;
  }>;
  roles: Array<{
    id: string;
    code: string;
    name: string;
    description?: string;
  }>;
  coverageAreas: Array<{
    id: string;
    name: string;
    geographicUnits: Array<{
      id: string;
      name: string;
      type: string;
    }>;
    isPrimary: boolean;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  _id: string;
  userId?: string; // Legacy ID
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  organizationType?: 'LGU' | 'NGO' | 'Hospital' | 'RedCross' | 'Non-LGU' | 'Other';
  organizationInstitution?: string;
  organizationId?: string;
  field?: string;
  isSystemAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Role {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissions: Array<{
    resource: string;
    actions: string[];
    metadata?: Record<string, any>;
  }>;
}

export interface CoverageArea {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  geographicUnits: Array<{
    _id: string;
    name: string;
    type: string;
  }>;
  organizationId?: string;
  isActive: boolean;
  metadata?: {
    isDefault?: boolean;
    tags?: string[];
    custom?: Record<string, any>;
  };
}

export interface UserCoverageAssignment {
  _id: string;
  userId: string;
  coverageAreaId: string | CoverageArea;
  isPrimary: boolean;
  assignedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface Location {
  _id: string;
  name: string;
  type: 'province' | 'district' | 'city' | 'municipality' | 'barangay' | 'custom';
  code?: string;
  parent?: string;
  isActive: boolean;
}

export interface StaffFilters {
  role?: string[];
  coverageAreaId?: string[];
  organizationType?: string[];
  search?: string;
}

export interface CreateStaffData {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  organizationType?: 'LGU' | 'NGO' | 'Hospital' | 'RedCross' | 'Non-LGU' | 'Other';
  organizationInstitution?: string;
  organizationIds?: string[]; // Organization IDs (multiple organizations supported)
  organizationId?: string; // Single organization ID (backward compatibility)
  roles: string[]; // Role IDs or role codes
  coverageAreaIds?: string[]; // Coverage Area IDs (will be created if needed)
  locationIds?: string[]; // Location IDs for creating new coverage areas
  municipalityIds?: string[]; // Municipality IDs (for coordinator creation)
  pageContext?: string; // Page context: 'coordinator-management' or 'stakeholder-management'
}

export interface UpdateStaffData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phoneNumber?: string;
  organizationType?: 'LGU' | 'NGO' | 'Hospital' | 'RedCross' | 'Non-LGU' | 'Other';
  organizationInstitution?: string;
  organizationIds?: string[];
  password?: string;
  isActive?: boolean;
}

