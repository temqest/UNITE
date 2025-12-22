"use client";

import { useState, useEffect } from "react";
import { Persons as Users, Eye, EyeSlash as EyeOff } from "@gravity-ui/icons";
import { X } from "lucide-react";
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
import { Checkbox } from "@heroui/checkbox";
import RoleAssignmentSection from "./role-assignment-section";
import CoverageAssignmentModal from "./coverage-assignment-modal";
import type { CreateStaffData } from "@/types/coordinator.types";

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStaffData) => Promise<void>;
  isSubmitting?: boolean;
  getAllowedStaffTypes?: () => Promise<string[]>;
}

export default function AddStaffModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  getAllowedStaffTypes,
}: AddStaffModalProps) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  
  // Organization
  const [organizationTypes, setOrganizationTypes] = useState<Set<string>>(new Set());
  const [organizationInstitution, setOrganizationInstitution] = useState("");
  
  // Roles
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [roleError, setRoleError] = useState("");
  const [allowedStaffTypes, setAllowedStaffTypes] = useState<string[]>([]);
  
  // Coverage
  const [isCoverageModalOpen, setIsCoverageModalOpen] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedCoverageAreaIds, setSelectedCoverageAreaIds] = useState<string[]>([]);
  const [coverageError, setCoverageError] = useState("");
  
  // Submission state (local to prevent double submissions)
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load allowed staff types on mount
  useEffect(() => {
    if (isOpen && getAllowedStaffTypes) {
      getAllowedStaffTypes().then((types) => {
        setAllowedStaffTypes(types);
      });
    }
  }, [isOpen, getAllowedStaffTypes]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setEmail("");
      setPhoneNumber("");
      setPassword("");
      setRetypePassword("");
      setOrganizationTypes(new Set());
      setOrganizationInstitution("");
      setSelectedRoleId("");
      setSelectedLocationIds([]);
      setSelectedCoverageAreaIds([]);
      setRoleError("");
      setCoverageError("");
      setShowPassword(false);
      setShowRetypePassword(false);
      setIsSubmittingLocal(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmittingLocal || isSubmitting) {
      console.warn('[AddStaffModal] Submission already in progress, ignoring duplicate submit');
      return;
    }
    
    // Clear previous errors
    setSubmitError(null);
    setRoleError("");
    setCoverageError("");
    
    // Validation
    if (password !== retypePassword) {
      setSubmitError("Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters long");
      return;
    }

    if (!selectedRoleId) {
      setRoleError("A role must be selected");
      setSubmitError("Please select a role");
      return;
    }

    if (selectedCoverageAreaIds.length === 0 && selectedLocationIds.length === 0) {
      setCoverageError("Please assign at least one coverage area");
      setSubmitError("Please assign at least one coverage area");
      return;
    }

    const data: CreateStaffData = {
      email,
      password,
      firstName,
      middleName: middleName || undefined,
      lastName,
      phoneNumber: phoneNumber || undefined,
      organizationType: organizationTypes.size > 0
        ? (Array.from(organizationTypes)[0] as CreateStaffData["organizationType"]) // Backend may need single type, but we store multiple
        : undefined,
      organizationInstitution: organizationInstitution || undefined,
      roles: selectedRoleId ? [selectedRoleId] : [],
      coverageAreaIds: selectedCoverageAreaIds,
      locationIds: selectedLocationIds.length > 0 && selectedCoverageAreaIds.length === 0
        ? selectedLocationIds
        : undefined,
    };

    // Set submitting state immediately to prevent duplicate submissions
    setIsSubmittingLocal(true);
    
    try {
      console.log('[AddStaffModal] Starting staff creation:', { email, roles: data.roles, coverageAreaIds: data.coverageAreaIds });
      await onSubmit(data);
      console.log('[AddStaffModal] Staff creation successful');
      onClose();
    } catch (err: any) {
      // Log error for debugging
      console.error('[AddStaffModal] Staff creation failed:', {
        error: err,
        message: err?.message,
        response: err?.response,
        body: err?.body
      });
      
      // Extract error message
      const errorMessage = err?.body?.message || 
                          err?.body?.errors?.join(', ') || 
                          err?.message || 
                          "Failed to create staff member";
      
      setSubmitError(errorMessage);
      
      // Don't rethrow - error is handled and displayed
      // This prevents the parent from trying to handle it again
    } finally {
      // Always reset submitting state, even on error
      setIsSubmittingLocal(false);
    }
  };

  const handleCoverageConfirm = (coverageAreaIds: string[], locationIds: string[]) => {
    setSelectedCoverageAreaIds(coverageAreaIds);
    setSelectedLocationIds(locationIds);
    setCoverageError("");
    setIsCoverageModalOpen(false);
  };

  const organizationTypeOptions: Array<{ key: string; label: string }> = [
    { key: "LGU", label: "LGU" },
    { key: "NGO", label: "NGO" },
    { key: "Hospital", label: "Hospital" },
    { key: "RedCross", label: "Red Cross" },
    { key: "Non-LGU", label: "Non-LGU" },
    { key: "Other", label: "Other" },
  ];

  return (
    <>
      <Modal
        classNames={{
          base: "max-h-[95vh] max-w-[680px]",
          backdrop: "bg-black/50",
        }}
        isOpen={isOpen}
        placement="center"
        scrollBehavior="inside"
        hideCloseButton
        onClose={onClose}
      >
        <ModalContent>
          {(onClose) => (
            <form 
              onSubmit={handleSubmit} 
              className="flex flex-col h-full"
              onKeyDown={(e) => {
                // Prevent form submission on Enter if already submitting
                if ((isSubmitting || isSubmittingLocal) && e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
            >
              {/* Custom Header */}
              <div className="flex items-start justify-between px-6 pt-4 pb-2 border-b border-gray-200">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Users className="w-4 h-4 text-gray-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Add Staff</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Create a new staff member with roles and coverage assignments.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting || isSubmittingLocal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ModalBody className="gap-3.5 px-6 py-4 max-h-[70vh] overflow-y-auto flex-1">
                {/* Error Display */}
                {submitError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-red-800 font-medium">Error</div>
                    <div className="text-sm text-red-600 mt-1">{submitError}</div>
                  </div>
                )}
                {/* Section 1: Personal Information */}
                <div className="space-y-3.5">
                  <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Personal Information
                  </h3>

                  {/* Name - 3 columns */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        isRequired
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        isDisabled={isSubmitting || isSubmittingLocal}
                        classNames={{
                          inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                          input: "text-sm placeholder:text-gray-400",
                        }}
                        placeholder="First name"
                        radius="lg"
                        variant="bordered"
                      />
                      <Input
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        isDisabled={isSubmitting || isSubmittingLocal}
                        classNames={{
                          inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                          input: "text-sm placeholder:text-gray-400",
                        }}
                        placeholder="Middle name"
                        radius="lg"
                        variant="bordered"
                      />
                      <Input
                        isRequired
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        isDisabled={isSubmitting || isSubmittingLocal}
                        classNames={{
                          inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                          input: "text-sm placeholder:text-gray-400",
                        }}
                        placeholder="Last name"
                        radius="lg"
                        variant="bordered"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      isRequired
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      isDisabled={isSubmitting || isSubmittingLocal}
                      classNames={{
                        inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                        input: "text-sm placeholder:text-gray-400",
                      }}
                      placeholder="Enter email address"
                      radius="lg"
                      variant="bordered"
                    />
                  </div>

                  {/* Contact Number */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Contact Number
                    </label>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      isDisabled={isSubmitting || isSubmittingLocal}
                      classNames={{
                        inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                        input: "text-sm placeholder:text-gray-400",
                      }}
                      placeholder="Enter contact number"
                      radius="lg"
                      variant="bordered"
                    />
                  </div>

                  {/* Password - 2 columns */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <Input
                        isRequired
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        isDisabled={isSubmitting || isSubmittingLocal}
                        classNames={{
                          inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                          input: "text-sm placeholder:text-gray-400",
                        }}
                        endContent={
                          <button
                            className="focus:outline-none"
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isSubmitting || isSubmittingLocal}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        }
                        placeholder="Set password"
                        radius="lg"
                        variant="bordered"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <Input
                        isRequired
                        type={showRetypePassword ? "text" : "password"}
                        value={retypePassword}
                        onChange={(e) => setRetypePassword(e.target.value)}
                        isDisabled={isSubmitting || isSubmittingLocal}
                        classNames={{
                          inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                          input: "text-sm placeholder:text-gray-400",
                        }}
                        endContent={
                          <button
                            className="focus:outline-none"
                            type="button"
                            onClick={() => setShowRetypePassword(!showRetypePassword)}
                            disabled={isSubmitting || isSubmittingLocal}
                          >
                            {showRetypePassword ? (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        }
                        placeholder="Retype password"
                        radius="lg"
                        variant="bordered"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Organization */}
                <div className="space-y-3.5">
                  <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Organization
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Organization Type
                      </label>
                      <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                        {organizationTypeOptions.map((type) => (
                          <Checkbox
                            key={type.key}
                            isSelected={organizationTypes.has(type.key)}
                            isDisabled={isSubmitting || isSubmittingLocal}
                            onValueChange={(checked) => {
                              setOrganizationTypes((prev) => {
                                const next = new Set(prev);
                                if (checked) {
                                  next.add(type.key);
                                } else {
                                  next.delete(type.key);
                                }
                                return next;
                              });
                            }}
                            size="sm"
                          >
                            <span className="text-sm text-gray-700">{type.label}</span>
                          </Checkbox>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Organization Name
                      </label>
                      <Input
                        value={organizationInstitution}
                        onChange={(e) => setOrganizationInstitution(e.target.value)}
                        isDisabled={isSubmitting || isSubmittingLocal}
                        classNames={{
                          inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                          input: "text-sm placeholder:text-gray-400",
                        }}
                        placeholder="Enter organization name"
                        radius="lg"
                        variant="bordered"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Role Assignment */}
                <div className="space-y-3.5">
                  <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Role Assignment
                  </h3>
                  <RoleAssignmentSection
                    selectedRoleId={selectedRoleId}
                    onSelectionChange={(id) => {
                      setSelectedRoleId(id);
                      setRoleError("");
                    }}
                    allowedStaffTypes={allowedStaffTypes.length > 0 ? allowedStaffTypes : undefined}
                    requiredCapabilities={undefined}
                    isRequired
                    error={roleError}
                  />
                </div>

                {/* Section 4: Coverage Assignment */}
                <div className="space-y-3.5">
                  <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Coverage Assignment
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Coverage Areas <span className="text-red-500">*</span>
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="bordered"
                        isDisabled={isSubmitting || isSubmittingLocal}
                        onPress={() => setIsCoverageModalOpen(true)}
                        className="text-xs"
                      >
                        {selectedCoverageAreaIds.length > 0 || selectedLocationIds.length > 0
                          ? "Change Assignment"
                          : "Assign Coverage Areas"}
                      </Button>
                    </div>

                    {coverageError && (
                      <div className="text-xs text-red-600">{coverageError}</div>
                    )}

                    {selectedCoverageAreaIds.length > 0 && (
                      <div className="text-sm text-gray-600">
                        {selectedCoverageAreaIds.length} coverage area
                        {selectedCoverageAreaIds.length !== 1 ? "s" : ""} assigned
                      </div>
                    )}

                    {selectedLocationIds.length > 0 && (
                      <div className="text-sm text-gray-600">
                        {selectedLocationIds.length} location
                        {selectedLocationIds.length !== 1 ? "s" : ""} selected (will create new coverage area)
                      </div>
                    )}

                    {selectedCoverageAreaIds.length === 0 && selectedLocationIds.length === 0 && (
                      <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded border border-gray-200">
                        No coverage areas assigned. Click "Assign Coverage Areas" to select locations.
                      </div>
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="px-6 pb-5 pt-3 gap-3 border-t border-gray-100 flex-shrink-0">
                <Button
                  className="flex-1 h-11 border-gray-300 font-medium text-sm bg-white hover:bg-gray-50"
                  radius="lg"
                  type="button"
                  variant="bordered"
                  onPress={onClose}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-11 bg-black text-white font-medium text-sm hover:bg-gray-800"
                  radius="lg"
                  isDisabled={isSubmitting || isSubmittingLocal}
                  type="submit"
                >
                  {(isSubmitting || isSubmittingLocal) ? "Creating..." : "Create Staff"}
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* Coverage Assignment Modal */}
      <CoverageAssignmentModal
        isOpen={isCoverageModalOpen}
        onClose={() => setIsCoverageModalOpen(false)}
        onConfirm={handleCoverageConfirm}
        initialLocationIds={selectedLocationIds}
        initialCoverageAreaIds={selectedCoverageAreaIds}
        hideBarangays={true}
      />
    </>
  );
}

