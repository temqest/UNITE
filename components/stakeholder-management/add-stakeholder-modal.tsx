"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { Persons as Users, Eye, EyeSlash as EyeOff } from "@gravity-ui/icons"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"
import { Select, SelectItem } from "@heroui/select"
import { useStakeholderManagement } from "@/hooks/useStakeholderManagement"
import { createStakeholder } from "@/services/stakeholderService"

interface AddStakeholderModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  isSubmitting?: boolean
  modalError?: string | null
  onClearError?: () => void
}

export default function AddStakeholderModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  modalError = null,
  onClearError = undefined,
}: AddStakeholderModalProps) {
  const {
    municipalityOptions,
    barangayOptions,
    organizationOptions,
    canChooseMunicipality,
    canChooseOrganization,
    isSystemAdmin,
    canSelectOrganization,
    loading: hookLoading,
    fetchBarangays,
  } = useStakeholderManagement()

  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("")
  const [selectedBarangay, setSelectedBarangay] = useState<string>("")
  const [selectedOrganization, setSelectedOrganization] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)
  const [showRetypePassword, setShowRetypePassword] = useState(false)
  const [organizationInput, setOrganizationInput] = useState<string>("")

  // Set default organization for non-system-admins
  useEffect(() => {
    if (!canChooseOrganization && organizationOptions.length > 0 && !selectedOrganization) {
      const org = organizationOptions[0]
      const orgId = org._id
      if (orgId) {
        setSelectedOrganization(String(orgId))
        console.log('[DIAG] Add Modal - Auto-selected organization:', {
          orgId: String(orgId),
          orgName: org.name
        })
      }
    }
  }, [canChooseOrganization, organizationOptions, selectedOrganization])

  // Fetch barangays when municipality is selected
  useEffect(() => {
    if (selectedMunicipality) {
      fetchBarangays(selectedMunicipality)
      // Reset barangay selection when municipality changes
      setSelectedBarangay("")
    } else {
      setSelectedBarangay("")
    }
  }, [selectedMunicipality, fetchBarangays])

  // Diagnostic logging for field states
  useEffect(() => {
    if (isOpen) {
      console.log('[DIAG] Add Stakeholder Modal - Field States:', {
        canChooseMunicipality,
        canChooseOrganization,
        isSystemAdmin,
        municipalityOptionsCount: municipalityOptions.length,
        barangayOptionsCount: barangayOptions.length,
        organizationOptionsCount: organizationOptions.length,
        selectedMunicipality: selectedMunicipality || 'none',
        selectedBarangay: selectedBarangay || 'none',
        selectedOrganization: selectedOrganization || 'none',
        role: 'stakeholder (forced)'
      });
    }
  }, [isOpen, hookLoading, canChooseMunicipality, canChooseOrganization, isSystemAdmin, municipalityOptions.length, barangayOptions.length, organizationOptions.length, selectedMunicipality, selectedBarangay, selectedOrganization]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const firstName = (formData.get("firstName") || "").toString()
    const middleName = (formData.get("middleName") || "").toString()
    const lastName = (formData.get("lastName") || "").toString()
    const email = (formData.get("coordinatorEmail") || "").toString()
    const phoneNumber = (formData.get("contactNumber") || "").toString()
    const password = (formData.get("password") || "").toString()
    const retypePassword = (formData.get("retypePassword") || "").toString()
    const organizationInstitution = (formData.get("organization") as string) || organizationInput || ""

    // Validation
    if (password !== retypePassword) {
      alert("Passwords do not match!")
      return
    }

    if (!selectedMunicipality) {
      alert("Please select a municipality.")
      return
    }

    // For coordinators, ensure organization is set
    if (!canChooseOrganization && organizationOptions.length > 0 && !selectedOrganization) {
      const org = organizationOptions[0]
      const orgId = org._id
      if (orgId) {
        setSelectedOrganization(String(orgId))
        // Wait a moment for state to update, then continue
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    // Validate organization if provided
    if (selectedOrganization && !canSelectOrganization(selectedOrganization)) {
      alert("Selected organization is outside your jurisdiction.")
      return
    }

    // For coordinators, organizationId is required
    const finalOrganizationId = selectedOrganization || (organizationOptions.length > 0 ? String(organizationOptions[0]._id) : undefined)

    // Prepare data for API - role is always 'stakeholder' for this page
    const data = {
      firstName,
      middleName: middleName || undefined,
      lastName,
      email,
      phoneNumber: phoneNumber || undefined,
      password,
      roles: ['stakeholder'], // Always stakeholder for stakeholder-management page
      municipalityId: selectedMunicipality,
      barangayId: selectedBarangay || undefined, // Optional
      organizationId: finalOrganizationId,
      organizationInstitution: organizationInstitution || undefined,
      pageContext: 'stakeholder-management', // Important: tells backend this is stakeholder creation
    }

    console.log('[DIAG] Add Modal - Submitting data:', {
      hasOrganizationId: !!data.organizationId,
      organizationId: data.organizationId,
      canChooseOrganization,
      organizationOptionsCount: organizationOptions.length
    })

    try {
      const response = await createStakeholder(data)
      if (response.success) {
        onSubmit(response.data || data)
        onClose()
      } else {
        alert(response.message || "Failed to create stakeholder")
      }
    } catch (error: any) {
      alert(error.message || "Failed to create stakeholder")
    }
  }


  return (
    <Modal
      classNames={{
        base: "max-h-[95vh] w-full max-w-2xl",
        body: "py-6",
      }}
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="lg"
      onClose={onClose}
    >
      <ModalContent>
        {(onClose) => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-2 pb-3 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded bg-gray-100">
                  <Users className="w-4 h-4 text-gray-700" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Add Stakeholder</h2>
              </div>
              <p className="text-sm font-normal text-gray-500">
                Please enter the stakeholder's information below to add them to the system.
              </p>
            </ModalHeader>
            <ModalBody className="gap-4 px-6 py-6 max-h-[70vh] overflow-y-auto">
              {modalError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <span>{modalError}</span>
                    <button
                      className="ml-3 text-xs font-medium text-red-600 hover:text-red-800 whitespace-nowrap"
                      type="button"
                      onClick={() => {
                        if (onClearError) onClearError()
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Stakeholder Name <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    isRequired
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    placeholder="First name"
                    name="firstName"
                    radius="md"
                    size="md"
                    type="text"
                    variant="bordered"
                  />
                  <Input
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    placeholder="Middle name"
                    name="middleName"
                    radius="md"
                    size="md"
                    type="text"
                    variant="bordered"
                  />
                  <Input
                    isRequired
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    placeholder="Last name"
                    name="lastName"
                    radius="md"
                    size="md"
                    type="text"
                    variant="bordered"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Stakeholder Email <span className="text-red-500">*</span>
                </label>
                <Input
                  isRequired
                  classNames={{
                    inputWrapper: "border-gray-300",
                  }}
                  placeholder="Enter stakeholder email"
                  name="coordinatorEmail"
                  radius="md"
                  size="md"
                  type="email"
                  variant="bordered"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <Input
                  isRequired
                  classNames={{
                    inputWrapper: "border-gray-300",
                  }}
                  placeholder="Enter contact number"
                  name="contactNumber"
                  radius="md"
                  size="md"
                  type="tel"
                  variant="bordered"
                />
              </div>

              {/* Set Password and Retype Password - 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">
                    Set Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    isRequired
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    endContent={
                      <button className="focus:outline-none" type="button" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    }
                    placeholder="Set password"
                    name="password"
                    radius="md"
                    size="md"
                    type={showPassword ? "text" : "password"}
                    variant="bordered"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">
                    Retype Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    isRequired
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    endContent={
                      <button
                        className="focus:outline-none"
                        type="button"
                        onClick={() => setShowRetypePassword(!showRetypePassword)}
                      >
                        {showRetypePassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    }
                    placeholder="Retype password"
                    name="retypePassword"
                    radius="md"
                    size="md"
                    type={showRetypePassword ? "text" : "password"}
                    variant="bordered"
                  />
                </div>
              </div>

              {/* Municipality Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Municipality <span className="text-red-500">*</span>
                </label>
                <Select
                  isRequired
                  classNames={{
                    trigger: "border-gray-300",
                  }}
                  placeholder={hookLoading ? "Loading..." : canChooseMunicipality ? "Select a municipality" : "Select a municipality within your jurisdiction"}
                  name="municipality"
                  radius="md"
                  selectedKeys={selectedMunicipality ? new Set([selectedMunicipality]) : new Set()}
                  size="md"
                  variant="bordered"
                  isDisabled={hookLoading || (!canChooseMunicipality && municipalityOptions.length === 0)}
                  description={!canChooseMunicipality ? "You can only select municipalities within your jurisdiction" : undefined}
                  onSelectionChange={(keys: any) => {
                    const muniId = Array.from(keys)[0] as string
                    setSelectedMunicipality(muniId)
                  }}
                >
                  {municipalityOptions.map((muni) => {
                    const muniId = muni._id || muni.id
                    const muniName = muni.name || String(muniId)
                    return (
                      <SelectItem key={String(muniId)} textValue={muniName}>
                        {muniName}
                      </SelectItem>
                    )
                  })}
                </Select>
                {municipalityOptions.length === 0 && !hookLoading && (
                  <p className="text-xs text-gray-500">
                    No municipalities available. Contact an administrator to assign coverage areas to your account.
                  </p>
                )}
              </div>

              {/* Barangay Selection (Optional) */}
              {selectedMunicipality && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">
                    Barangay <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <Select
                    classNames={{
                      trigger: "border-gray-300",
                    }}
                    placeholder={hookLoading ? "Loading barangays..." : barangayOptions.length === 0 ? "No barangays available" : "Select a barangay (Optional)"}
                    name="barangay"
                    radius="md"
                    selectedKeys={selectedBarangay ? new Set([selectedBarangay]) : new Set()}
                    size="md"
                    variant="bordered"
                    isDisabled={hookLoading || barangayOptions.length === 0}
                    description="Barangay selection is optional"
                    onSelectionChange={(keys: any) => {
                      const barangayId = Array.from(keys)[0] as string
                      setSelectedBarangay(barangayId)
                    }}
                  >
                    {barangayOptions.map((barangay) => {
                      const barangayId = barangay._id || barangay.id
                      const barangayName = barangay.name || String(barangayId)
                      return (
                        <SelectItem key={String(barangayId)} textValue={barangayName}>
                          {barangayName}
                        </SelectItem>
                      )
                    })}
                  </Select>
                  {barangayOptions.length === 0 && selectedMunicipality && !hookLoading && (
                    <p className="text-xs text-gray-500">
                      No barangays available for this municipality.
                    </p>
                  )}
                </div>
              )}

              {/* Organization Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Organization
                </label>
                {canChooseOrganization ? (
                  <Select
                    classNames={{
                      trigger: "border-gray-300",
                    }}
                    placeholder={hookLoading ? "Loading organizations..." : "Select Organization (Optional)"}
                    name="organization"
                    radius="md"
                    selectedKeys={selectedOrganization ? new Set([selectedOrganization]) : new Set()}
                    size="md"
                    variant="bordered"
                    isDisabled={hookLoading}
                    onSelectionChange={(keys: any) => {
                      const orgId = Array.from(keys)[0] as string
                      setSelectedOrganization(orgId)
                    }}
                  >
                    {organizationOptions.map((org) => {
                      const orgId = org._id
                      const orgName = org.name || String(orgId)
                      return (
                        <SelectItem key={String(orgId)} textValue={orgName}>
                          {orgName}
                        </SelectItem>
                      )
                    })}
                  </Select>
                ) : (
                  <>
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-gray-300 bg-gray-50",
                      }}
                      name="organization_display"
                      placeholder="Organization"
                      radius="md"
                      size="md"
                      type="text"
                      value={organizationOptions.length > 0 
                        ? (organizationOptions[0].name || String(organizationOptions[0]._id))
                        : (hookLoading ? "Loading..." : "No organization assigned")}
                      variant="bordered"
                      description={organizationOptions.length > 0 
                        ? "Organization is set to your organization" 
                        : "Please wait for organization to load"}
                    />
                    <input name="organization" type="hidden" value={selectedOrganization || ""} />
                  </>
                )}
                {!canChooseOrganization && organizationOptions.length > 0 && (
                  <Input
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    placeholder="Organization / Institution (Optional)"
                    name="organization"
                    radius="md"
                    size="md"
                    type="text"
                    variant="bordered"
                    value={organizationInput}
                    onChange={(e) => setOrganizationInput(e.target.value)}
                    description="Additional organization details"
                  />
                )}
              </div>
            </ModalBody>

            <ModalFooter className="gap-3 px-6 py-6 border-t border-gray-200">
              <Button className="flex-1 font-medium" radius="md" size="md" variant="bordered" onPress={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-black text-white font-medium hover:bg-gray-900"
                color="default"
                isDisabled={isSubmitting}
                radius="md"
                size="md"
                type="submit"
              >
                {isSubmitting ? "Adding..." : "Add Stakeholder"}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
