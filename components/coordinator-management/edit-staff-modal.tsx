"use client";

import { useState, useEffect } from "react";
import { Eye, EyeSlash as EyeOff, Xmark, TrashBin as Trash } from "@gravity-ui/icons";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Chip } from "@heroui/chip";
import { useRoles } from "@/hooks/useRoles";
import CoverageAssignmentModal from "./coverage-assignment-modal";
import type { StaffListItem, UpdateStaffData, Role, CoverageArea } from "@/types/coordinator.types";
import { getUserRoles, getUserCoverageAreas, assignRole, revokeRole, getAssignableRoles } from "@/services/coordinatorService";
import { fetchJsonWithAuth } from "@/utils/fetchWithAuth";

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffListItem | null;
  onSaved: () => Promise<void>;
  onUpdateStaff: (id: string, data: UpdateStaffData) => Promise<void>;
  onAssignRole: (userId: string, roleId: string) => Promise<void>;
  onRevokeRole: (userId: string, roleId: string) => Promise<void>;
  onAssignCoverageArea: (userId: string, coverageAreaId: string, isPrimary?: boolean) => Promise<void>;
  onRevokeCoverageArea: (userId: string, coverageAreaId: string) => Promise<void>;
}

export default function EditStaffModal({
  isOpen,
  onClose,
  staff,
  onSaved,
  onUpdateStaff,
  onAssignRole,
  onRevokeRole,
  onAssignCoverageArea,
  onRevokeCoverageArea,
}: EditStaffModalProps) {
  const { roles: allRoles, loading: allRolesLoading } = useRoles(isOpen);
  const [assignableRoles, setAssignableRoles] = useState<Role[]>([]);
  const [loadingAssignable, setLoadingAssignable] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [availableOrganizations, setAvailableOrganizations] = useState<Array<{
    _id: string;
    name: string;
    type: string;
  }>>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Roles management
  const [currentRoles, setCurrentRoles] = useState<Role[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<string>("");

  // Load assignable roles (authority-filtered) when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadAssignable = async () => {
        try {
          setLoadingAssignable(true);
          const response = await getAssignableRoles();
          if (response.success && response.data) {
            setAssignableRoles(response.data);
          }
        } catch (err) {
          console.error('Failed to load assignable roles:', err);
          setAssignableRoles([]);
        } finally {
          setLoadingAssignable(false);
        }
      };
      loadAssignable();
    }
  }, [isOpen]);

  // Coverage areas management
  const [currentCoverageAreas, setCurrentCoverageAreas] = useState<Array<{
    id: string;
    name: string;
    isPrimary: boolean;
  }>>([]);
  const [isCoverageModalOpen, setIsCoverageModalOpen] = useState(false);

  // Load available organizations when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAvailableOrganizations();
    }
  }, [isOpen]);

  // Load staff data when modal opens
  useEffect(() => {
    if (isOpen && staff) {
      setFirstName(staff.firstName);
      setMiddleName(staff.middleName || "");
      setLastName(staff.lastName);
      setEmail(staff.email);
      setPhoneNumber(staff.phoneNumber || "");
      setNewPassword("");
      setValidationErrors([]);
      setCurrentRoles(staff.roles || []);
      setCurrentCoverageAreas(staff.coverageAreas || []);

      // Load coordinator's current organizations
      if (staff.organizations && staff.organizations.length > 0) {
        setSelectedOrganizations(staff.organizations.map(org => org.id));
      } else {
        setSelectedOrganizations([]);
      }

      // Load full role and coverage data
      loadStaffDetails();
    }
  }, [isOpen, staff]);

  // Update available roles (assignable roles not yet assigned)
  useEffect(() => {
    // Use assignable roles (authority-filtered) instead of all roles
    const rolesToUse = assignableRoles.length > 0 ? assignableRoles : allRoles;
    
    if (rolesToUse.length > 0 && currentRoles.length > 0) {
      const assignedRoleIds = new Set(currentRoles.map((r) => r.id));
      setAvailableRoles(rolesToUse.filter((r) => !assignedRoleIds.has(r._id)));
    } else if (rolesToUse.length > 0) {
      setAvailableRoles(rolesToUse);
    }
  }, [assignableRoles, allRoles, currentRoles]);

  const loadAvailableOrganizations = async () => {
    try {
      setLoadingOrganizations(true);
      const response = await fetchJsonWithAuth('/api/organizations?isActive=true&limit=1000');
      
      if (response.success && response.data) {
        setAvailableOrganizations(response.data);
      }
    } catch (err) {
      console.error("Failed to load organizations:", err);
    } finally {
      setLoadingOrganizations(false);
    }
  };

  const loadStaffDetails = async () => {
    if (!staff) return;

    try {
      const [rolesResponse, coverageResponse] = await Promise.all([
        getUserRoles(staff.id).catch(() => ({ success: false, data: [] })),
        getUserCoverageAreas(staff.id).catch(() => ({ success: false, data: [] })),
      ]);

      if (rolesResponse.success) {
        setCurrentRoles(rolesResponse.data);
      }

      if (coverageResponse.success) {
        // Transform coverage assignments to display format
        const coverageAreas = coverageResponse.data.map((assignment: any) => {
          const ca = typeof assignment.coverageAreaId === "object"
            ? assignment.coverageAreaId
            : null;
          return {
            id: typeof assignment.coverageAreaId === "string"
              ? assignment.coverageAreaId
              : ca?._id || "",
            name: ca?.name || "Unknown Coverage Area",
            isPrimary: assignment.isPrimary,
          };
        });
        setCurrentCoverageAreas(coverageAreas);
      }
    } catch (err) {
      console.error("Failed to load staff details:", err);
    }
  };

  const handleSave = async () => {
    if (!staff) return;

    setIsSubmitting(true);
    setValidationErrors([]);

    // Validate organizations
    if (selectedOrganizations.length === 0) {
      setValidationErrors(["At least one organization must be selected"]);
      setIsSubmitting(false);
      return;
    }

    try {
      const updateData: UpdateStaffData = {
        firstName,
        middleName: middleName || undefined,
        lastName,
        phoneNumber: phoneNumber || undefined,
        organizationIds: selectedOrganizations,
      };

      // Include password if provided
      if (newPassword) {
        if (newPassword.length < 6) {
          setValidationErrors(["Password must be at least 6 characters long"]);
          setIsSubmitting(false);
          return;
        }
        updateData.password = newPassword;
      }

      await onUpdateStaff(staff.id, updateData);
      await onSaved();
      onClose();
    } catch (err: any) {
      setValidationErrors([err.message || "Failed to save changes"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleOrganization = (orgId: string) => {
    setSelectedOrganizations(prev => {
      if (prev.includes(orgId)) {
        return prev.filter(id => id !== orgId);
      } else {
        return [...prev, orgId];
      }
    });
  };

  const handleAddRole = async () => {
    if (!staff || !selectedRoleToAdd) return;

    try {
      await onAssignRole(staff.id, selectedRoleToAdd);
      await loadStaffDetails();
      setIsAddingRole(false);
      setSelectedRoleToAdd("");
    } catch (err: any) {
      alert(err.message || "Failed to assign role");
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!staff) return;

    if (!confirm("Are you sure you want to remove this role?")) {
      return;
    }

    try {
      await onRevokeRole(staff.id, roleId);
      await loadStaffDetails();
    } catch (err: any) {
      alert(err.message || "Failed to revoke role");
    }
  };

  const handleRemoveCoverageArea = async (coverageAreaId: string) => {
    if (!staff) return;

    if (!confirm("Are you sure you want to remove this coverage area assignment?")) {
      return;
    }

    try {
      await onRevokeCoverageArea(staff.id, coverageAreaId);
      await loadStaffDetails();
    } catch (err: any) {
      alert(err.message || "Failed to revoke coverage area");
    }
  };

  const handleCoverageConfirm = async (
    coverageAreaIds: string[],
    locationIds: string[]
  ) => {
    if (!staff) return;

    try {
      // Assign each coverage area
      for (let i = 0; i < coverageAreaIds.length; i++) {
        await onAssignCoverageArea(staff.id, coverageAreaIds[i], i === 0);
      }

      // If locationIds provided, they should have been converted to coverage areas
      // in the modal, so we just refresh
      await loadStaffDetails();
      setIsCoverageModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to assign coverage areas");
    }
  };

  const organizationTypes: Array<{ key: string; label: string }> = [
    { key: "LGU", label: "LGU" },
    { key: "NGO", label: "NGO" },
    { key: "Hospital", label: "Hospital" },
    { key: "RedCross", label: "Red Cross" },
    { key: "Non-LGU", label: "Non-LGU" },
    { key: "Other", label: "Other" },
  ];

  if (!staff) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        placement="center"
        scrollBehavior="inside"
        size="xl"
        onClose={onClose}
        classNames={{
          base: "max-h-[90vh] max-w-4xl",
        }}
        hideCloseButton
      >
        <ModalContent>
          {(onClose) => (
            <div>
              {/* Custom Header */}
              <div className="flex items-start justify-between px-6 pt-4 pb-2 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Edit Staff</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Update staff information, roles, and coverage assignments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                >
                  <Xmark className="w-4 h-4" />
                </button>
              </div>

              <ModalBody className="px-6 py-4 gap-4 max-h-[70vh] overflow-y-auto">
                {/* Section 1: Personal Information */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">First name</label>
                      <Input
                        classNames={{ inputWrapper: "h-10" }}
                        type="text"
                        value={firstName}
                        variant="bordered"
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Middle name</label>
                      <Input
                        classNames={{ inputWrapper: "h-10" }}
                        type="text"
                        value={middleName}
                        variant="bordered"
                        onChange={(e) => setMiddleName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Last name</label>
                      <Input
                        classNames={{ inputWrapper: "h-10" }}
                        type="text"
                        value={lastName}
                        variant="bordered"
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <Input
                        classNames={{ inputWrapper: "h-10" }}
                        type="email"
                        value={email}
                        variant="bordered"
                        disabled
                        description="Email cannot be changed"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Contact Number</label>
                      <Input
                        classNames={{ inputWrapper: "h-10" }}
                        type="tel"
                        value={phoneNumber}
                        variant="bordered"
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Organizations
                    </label>
                    {loadingOrganizations ? (
                      <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded border border-gray-200">
                        Loading organizations...
                      </div>
                    ) : availableOrganizations.length === 0 ? (
                      <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded border border-gray-200">
                        No organizations available
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded border border-gray-200">
                        {availableOrganizations.map((org) => {
                          const isSelected = selectedOrganizations.includes(org._id);
                          return (
                            <div
                              key={org._id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => handleToggleOrganization(org._id)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleOrganization(org._id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{org.name}</div>
                                <div className="text-xs text-gray-500">{org.type}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {selectedOrganizations.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        At least one organization must be selected
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Change Password</label>
                    <Input
                      classNames={{ inputWrapper: "h-10" }}
                      endContent={
                        <button
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="focus:outline-none"
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                        >
                          {showPassword ? (
                            <Eye className="text-default-800 pointer-events-none w-5 h-5" />
                          ) : (
                            <EyeOff className="text-default-800 pointer-events-none w-5 h-5" />
                          )}
                        </button>
                      }
                      placeholder="Leave blank to keep current password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      variant="bordered"
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                {/* Section 2: Role Management */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h3 className="text-sm font-semibold text-gray-900">Role Management</h3>
                    {!isAddingRole && availableRoles.length > 0 && (
                      <Button
                        size="sm"
                        variant="bordered"
                        onPress={() => setIsAddingRole(true)}
                        className="text-xs"
                      >
                        Add Role
                      </Button>
                    )}
                  </div>

                  {isAddingRole && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
                      <Select
                        placeholder="Select role to add"
                        selectedKeys={selectedRoleToAdd ? [selectedRoleToAdd] : []}
                        onSelectionChange={(keys: any) => {
                          const roleId = Array.from(keys)[0] as string;
                          setSelectedRoleToAdd(roleId || "");
                        }}
                        size="sm"
                        classNames={{ trigger: "h-9" }}
                      >
                        {availableRoles.map((role) => (
                          <SelectItem key={role._id} textValue={role.name}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </Select>
                      <Button
                        size="sm"
                        onPress={handleAddRole}
                        isDisabled={!selectedRoleToAdd}
                        className="text-xs"
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => {
                          setIsAddingRole(false);
                          setSelectedRoleToAdd("");
                        }}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {currentRoles.length === 0 ? (
                    <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded border border-gray-200">
                      No roles assigned
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentRoles.map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900">{role.name}</div>
                            {role.description && (
                              <div className="text-xs text-gray-500">{role.description}</div>
                            )}
                            <div className="text-xs text-gray-400">Code: {role.code}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            isIconOnly
                            onPress={() => handleRemoveRole(role.id)}
                            className="text-xs"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3: Coverage Area Management */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h3 className="text-sm font-semibold text-gray-900">Coverage Area Management</h3>
                    <Button
                      size="sm"
                      variant="bordered"
                      onPress={() => setIsCoverageModalOpen(true)}
                      className="text-xs"
                    >
                      Add Coverage Area
                    </Button>
                  </div>

                  {currentCoverageAreas.length === 0 ? (
                    <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded border border-gray-200">
                      No coverage areas assigned
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentCoverageAreas.map((ca) => (
                        <div
                          key={ca.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{ca.name}</span>
                            {ca.isPrimary && (
                              <Chip size="sm" variant="flat" color="primary">
                                Primary
                              </Chip>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            isIconOnly
                            onPress={() => handleRemoveCoverageArea(ca.id)}
                            className="text-xs"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {validationErrors && validationErrors.length > 0 && (
                  <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded">
                    <h4 className="text-sm font-semibold">Validation error</h4>
                    <ul className="text-xs mt-2 list-disc list-inside">
                      {validationErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </ModalBody>

              <ModalFooter className="gap-3 px-6 pb-5 pt-3 border-t border-gray-100">
                <Button className="px-6" variant="bordered" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  className="bg-black text-white px-6"
                  color="default"
                  disabled={isSubmitting}
                  onPress={handleSave}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </ModalFooter>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Coverage Assignment Modal */}
      <CoverageAssignmentModal
        isOpen={isCoverageModalOpen}
        onClose={() => setIsCoverageModalOpen(false)}
        onConfirm={handleCoverageConfirm}
        initialLocationIds={[]}
        initialCoverageAreaIds={[]}
      />
    </>
  );
}

