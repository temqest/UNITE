"use client"

import { useEffect, useState } from "react"
import { Eye, EyeSlash as EyeOff } from "@gravity-ui/icons"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"
import { Select, SelectItem } from "@heroui/select"
import { useStakeholderManagement } from "@/hooks/useStakeholderManagement"
import { updateStakeholder, getStakeholder } from "@/services/stakeholderService"

interface EditStakeholderModalProps {
  isOpen: boolean
  onClose: () => void
  stakeholder: any | null
  onSaved?: () => void
}

export default function EditStakeholderModal({
  isOpen,
  onClose,
  stakeholder,
  onSaved,
}: EditStakeholderModalProps) {
  const {
    municipalityOptions,
    organizationOptions,
    canChooseMunicipality,
    canChooseOrganization,
    isSystemAdmin,
    loading: hookLoading,
    // Legacy compatibility
    creatorCoverageAreas,
    allowedOrganizations,
  } = useStakeholderManagement()

  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [organization, setOrganization] = useState("")
  const [organizationId, setOrganizationId] = useState<string>("")
  const [coverageAreaId, setCoverageAreaId] = useState<string>("")
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [stakeholderData, setStakeholderData] = useState<any>(null)
  // Fetch stakeholder data when modal opens
  useEffect(() => {
    if (isOpen && stakeholder) {
      const fetchStakeholderData = async () => {
        try {
          const stakeholderId = stakeholder._id || stakeholder.id || stakeholder.Stakeholder_ID || stakeholder.StakeholderId
          if (stakeholderId) {
            const data = await getStakeholder(String(stakeholderId))
            setStakeholderData(data)
            
            // Populate form fields
            setFirstName(data.firstName || data.First_Name || "")
            setMiddleName(data.middleName || data.Middle_Name || "")
            setLastName(data.lastName || data.Last_Name || "")
            setEmail(data.email || data.Email || "")
            setPhoneNumber(data.phoneNumber || data.Phone_Number || "")
            setOrganization(data.organizationInstitution || data.Organization_Institution || "")
            
            // Set organization ID if available
            if (data.organizationId) {
              const orgId = typeof data.organizationId === 'object' ? data.organizationId._id : data.organizationId
              setOrganizationId(String(orgId))
            } else if (data.organization) {
              // Fallback: try to get org ID from organization object
              const orgId = typeof data.organization === 'object' ? data.organization._id : data.organization
              if (orgId) {
                setOrganizationId(String(orgId))
              }
            }
            
            // Ensure organizationId is set even if not in data (for coordinators viewing their own org)
            // This will be used to display the organization name
            if (!organizationId && !canChooseOrganization && organizationOptions.length > 0) {
              const orgId = organizationOptions[0]._id
              if (orgId) {
                setOrganizationId(String(orgId))
              }
            }
            
            // Set coverage area ID if available
            if (data.coverageAreas && data.coverageAreas.length > 0) {
              const ca = data.coverageAreas[0]
              const caId = typeof ca === 'object' && ca.coverageAreaId
                ? (typeof ca.coverageAreaId === 'object' ? ca.coverageAreaId._id : ca.coverageAreaId)
                : (typeof ca === 'object' ? ca._id : ca)
              if (caId) {
                setCoverageAreaId(String(caId))
              }
            }
            
            // Set role if available (should always be stakeholder)
            if (data.roles && data.roles.length > 0) {
              const role = data.roles[0]
              const roleCode = typeof role === 'object' ? role.code : role
              if (roleCode) {
                setSelectedRole(String(roleCode))
              } else {
                // Default to stakeholder if no role found
                setSelectedRole('stakeholder')
              }
            } else {
              // Default to stakeholder
              setSelectedRole('stakeholder')
            }
          } else {
            // Fallback: use stakeholder prop directly
            setStakeholderData(stakeholder)
            setFirstName(stakeholder.firstName || stakeholder.First_Name || "")
            setMiddleName(stakeholder.middleName || stakeholder.Middle_Name || "")
            setLastName(stakeholder.lastName || stakeholder.Last_Name || "")
            setEmail(stakeholder.email || stakeholder.Email || "")
            setPhoneNumber(stakeholder.phoneNumber || stakeholder.Phone_Number || "")
            setOrganization(stakeholder.organizationInstitution || stakeholder.Organization_Institution || "")
          }
        } catch (error) {
          console.error('Failed to fetch stakeholder data:', error)
          // Fallback: use stakeholder prop directly
          setStakeholderData(stakeholder)
        }
      }
      
      fetchStakeholderData()
    }
  }, [isOpen, stakeholder])


  const handleSave = async () => {
    if (!stakeholder && !stakeholderData) return

    setIsSubmitting(true)
    setValidationErrors([])

    try {
      const stakeholderId = stakeholder?._id || stakeholder?.id || stakeholder?.Stakeholder_ID || stakeholder?.StakeholderId
        || stakeholderData?._id || stakeholderData?.id
      if (!stakeholderId) throw new Error("Stakeholder id not available")

      const payload: any = {
        firstName: firstName || undefined,
        middleName: middleName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
        organizationInstitution: organization || undefined,
      }

      // Only system admin can change organization and location
      if (canChooseOrganization && organizationId) {
        payload.organizationId = organizationId
      }
      // Note: For stakeholders, location changes should use municipalityId/barangayId
      // This coverageAreaId is kept for backward compatibility with existing data
      if (canChooseMunicipality && coverageAreaId) {
        payload.coverageAreaId = coverageAreaId
      }

      // Role is always stakeholder for stakeholder management page
      // Don't send roleCode - backend will maintain it as stakeholder

      // Password is optional
      if (newPassword && String(newPassword).trim().length > 0) {
        payload.password = newPassword
      }

      const response = await updateStakeholder(String(stakeholderId), payload)

      if (!response.success) {
        throw new Error(response.message || "Failed to update stakeholder")
      }

      if (onSaved) {
        try {
          await onSaved()
        } catch (e) {
          // ignore onSaved errors but continue to close
        }
      }

      onClose()
    } catch (err: any) {
      setValidationErrors([err?.message || "Failed to save changes"])
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!stakeholder && !stakeholderData) return null

  // Diagnostic logging for field states
  useEffect(() => {
    if (isOpen) {
      console.log('[DIAG] Edit Modal Field States:', {
        canChooseMunicipality,
        canChooseOrganization,
        isSystemAdmin,
        municipalityOptionsCount: municipalityOptions.length,
        organizationOptionsCount: organizationOptions.length,
        stakeholderOrganizationId: organizationId,
        stakeholderCoverageAreaId: coverageAreaId,
        stakeholderData: stakeholderData ? {
          hasOrganization: !!(stakeholderData.organization || stakeholderData.organizationId),
          organization: stakeholderData.organization,
          organizationId: stakeholderData.organizationId
        } : null
      });
    }
  }, [isOpen, hookLoading, canChooseMunicipality, canChooseOrganization, isSystemAdmin, municipalityOptions.length, organizationOptions.length, organizationId, coverageAreaId, stakeholderData]);

  return (
    <Modal isOpen={isOpen} placement="center" scrollBehavior="inside" size="xl" onClose={onClose}>
      <ModalContent className="max-w-2xl rounded-lg">
        <ModalHeader className="flex flex-col gap-0 pb-4">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg fill="none" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"
                  stroke="#333"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
                <path
                  d="M4 20c0-2.21 3.58-4 8-4s8 1.79 8 4"
                  stroke="#333"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">Edit Stakeholder</h2>
              <p className="text-sm text-gray-600 mt-1">
                Please review and update the stakeholder's information below.
              </p>
            </div>
          </div>
        </ModalHeader>
        <ModalBody className="py-0 pb-6">
          <div className="space-y-6">
            {/* Stakeholder Name Section */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-3 block">
                Stakeholder Name <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="First name"
                  classNames={{ inputWrapper: "h-10" }}
                  type="text"
                  value={firstName}
                  variant="bordered"
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  placeholder="Middle name"
                  classNames={{ inputWrapper: "h-10" }}
                  type="text"
                  value={middleName}
                  variant="bordered"
                  onChange={(e) => setMiddleName(e.target.value)}
                />
                <Input
                  placeholder="Last name"
                  classNames={{ inputWrapper: "h-10" }}
                  type="text"
                  value={lastName}
                  variant="bordered"
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            {/* Stakeholder Email */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Stakeholder Email <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter stakeholder email"
                classNames={{ inputWrapper: "h-10" }}
                type="email"
                value={email}
                variant="bordered"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Contact Number */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter contact number"
                classNames={{ inputWrapper: "h-10" }}
                type="tel"
                value={phoneNumber}
                variant="bordered"
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            {/* Password Fields */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Password <span className="text-gray-500 text-xs">(leave blank to keep current)</span>
              </label>
              <Input
                placeholder="Leave blank to keep current password"
                classNames={{ inputWrapper: "h-10" }}
                endContent={
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="focus:outline-none"
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? (
                      <Eye className="text-gray-600 pointer-events-none w-5 h-5" />
                    ) : (
                      <EyeOff className="text-gray-600 pointer-events-none w-5 h-5" />
                    )}
                  </button>
                }
                type={showPassword ? "text" : "password"}
                value={newPassword}
                variant="bordered"
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            {/* Role Selection - Disabled, always stakeholder */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Role
              </label>
              <Input
                disabled
                classNames={{ inputWrapper: "h-10 bg-gray-100" }}
                type="text"
                value="Stakeholder"
                variant="bordered"
                description="Role is fixed to Stakeholder"
              />
            </div>

            {/* Location (Municipality/Barangay) - Display only for edit */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Location
              </label>
              <Input
                disabled
                classNames={{ inputWrapper: "h-10 bg-gray-100" }}
                type="text"
                value={(() => {
                  if (!coverageAreaId && !stakeholderData?.locations) return "Not set"
                  // Try to find in municipalityOptions first
                  if (municipalityOptions.length > 0) {
                    const location = municipalityOptions.find((loc: { _id: string; id?: string; name?: string }) => 
                      String(loc._id || loc.id) === String(coverageAreaId)
                    )
                    if (location) return location.name || String(coverageAreaId)
                  }
                  // Fallback to creatorCoverageAreas for legacy compatibility
                  if (creatorCoverageAreas.length > 0) {
                    const caLegacy = creatorCoverageAreas.find((loc: { _id: string; id?: string; name?: string }) => 
                      String(loc._id || loc.id) === String(coverageAreaId)
                    )
                    if (caLegacy) return caLegacy.name || String(coverageAreaId)
                  }
                  return coverageAreaId ? String(coverageAreaId) : "Not set"
                })()}
                variant="bordered"
                description="Location cannot be changed in edit mode"
              />
            </div>

            {/* Organization */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Organization
              </label>
              {canChooseOrganization ? (
                <Select
                  placeholder="Select Organization"
                  selectedKeys={organizationId ? new Set([organizationId]) : new Set()}
                  isDisabled={hookLoading}
                  onSelectionChange={(keys: any) => {
                    const orgId = Array.from(keys)[0] as string
                    setOrganizationId(orgId)
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
                <Input
                  disabled
                  classNames={{ inputWrapper: "h-10 bg-gray-100" }}
                  type="text"
                  value={(() => {
                    // First try to get from stakeholder data (the stakeholder's own organization)
                    if (stakeholderData?.organization) {
                      const org = stakeholderData.organization
                      if (typeof org === 'object' && org.name) {
                        return org.name
                      }
                      if (typeof org === 'string') {
                        return org
                      }
                    }
                    if (stakeholderData?.organizationId) {
                      const org = stakeholderData.organizationId
                      if (typeof org === 'object' && org.name) {
                        return org.name
                      }
                      // If it's just an ID, try to find it in organizationOptions
                      const orgId = typeof org === 'object' ? org._id : org
                      if (orgId) {
                        const foundOrg = organizationOptions.find(o => String(o._id) === String(orgId))
                        if (foundOrg) return foundOrg.name
                      }
                    }
                    // If we have organizationId set, try to find it in organizationOptions
                    if (organizationId) {
                      const foundOrg = organizationOptions.find(o => String(o._id) === String(organizationId))
                      if (foundOrg) return foundOrg.name
                      // If not found, might be a different org - try stakeholder data
                      if (stakeholderData) {
                        // Check if stakeholder has organization in a different field
                        const org = (stakeholderData as any).organization || (stakeholderData as any).Organization
                        if (org) {
                          return typeof org === 'object' ? org.name : String(org)
                        }
                      }
                    }
                    // Last resort: if coordinator and no stakeholder org found, show coordinator's org as fallback
                    // (This should rarely happen - stakeholder should always have an org)
                    if (!canChooseOrganization && organizationOptions.length > 0) {
                      return organizationOptions[0].name || String(organizationOptions[0]._id)
                    }
                    return ""
                  })()}
                  variant="bordered"
                  description="Only system administrators can change organization"
                />
              )}
              <div className="mt-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Organization / Institution Details
                </label>
                <Input
                  placeholder="Enter Organization / Institution"
                  classNames={{ inputWrapper: "h-10" }}
                  type="text"
                  value={organization}
                  variant="bordered"
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>
            </div>

            

            {/* Validation Errors */}
            {validationErrors && validationErrors.length > 0 && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="text-sm font-semibold text-red-900">Validation error</h4>
                <ul className="text-xs mt-2 list-disc list-inside text-red-800">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter className="gap-3">
          <Button variant="bordered" onPress={onClose}>
            Cancel
          </Button>
          <Button className="bg-black text-white" disabled={isSubmitting} onPress={handleSave}>
            {isSubmitting ? "Saving..." : "Edit Stakeholder"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
