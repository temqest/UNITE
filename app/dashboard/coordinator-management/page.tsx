"use client";

import { useState, useEffect } from "react";
import { getUserInfo } from "../../../utils/getUserInfo";
import { useCoordinatorManagement } from "@/hooks/useCoordinatorManagement";
import Topbar from "@/components/layout/topbar";
import MobileNav from "@/components/tools/mobile-nav";
import CoordinatorToolbar from "@/components/coordinator-management/coordinator-management-toolbar";
import CoordinatorTable from "@/components/coordinator-management/coordinator-management-table";
import AddStaffModal from "@/components/coordinator-management/add-staff-modal";
import EditStaffModal from "@/components/coordinator-management/edit-staff-modal";
import DeleteCoordinatorModal from "@/components/coordinator-management/delete-coordinator-modal";
import QuickFilterModal from "@/components/coordinator-management/quick-filter-modal";
import type { CreateStaffData, UpdateStaffData, StaffListItem } from "@/types/coordinator.types";

export default function CoordinatorManagement() {
  const [isMobile, setIsMobile] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isQuickFilterOpen, setIsQuickFilterOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffListItem | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [displayName, setDisplayName] = useState("Bicol Medical Center");
  const [displayEmail, setDisplayEmail] = useState("bmc@gmail.com");

  // Use the coordinator management hook
  const {
    staff,
    loading,
    error,
    canManageStaff,
    checkingAccess,
    filters,
    searchQuery,
    selectedStaff,
    handleSearch,
    handleFilter,
    handleSelectStaff,
    handleSelectAll,
    handleClearFilters,
    fetchStaff,
    createStaffMember,
    updateStaffMember,
    deleteStaffMember,
    assignRoleToStaff,
    revokeRoleFromStaff,
    assignCoverageAreaToStaff,
    revokeCoverageAreaFromStaff,
    getAllowedStaffTypesForCurrentUser,
  } = useCoordinatorManagement();

  // Get user info for display
  useEffect(() => {
    const info = getUserInfo();
    setUserInfo(info);
    setDisplayName(info?.displayName || info?.raw?.First_Name || "Bicol Medical Center");
    setDisplayEmail(info?.email || info?.raw?.Email || "bmc@gmail.com");
  }, []);

  // Detect mobile viewport
  useEffect(() => {
    const checkViewport = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    if (typeof window !== 'undefined') {
      checkViewport();
      window.addEventListener('resize', checkViewport);
      return () => window.removeEventListener('resize', checkViewport);
    }
  }, []);

  const handleAddStaff = () => {
    setIsAddModalOpen(true);
  };

  const handleEditStaff = (id: string) => {
    const staffMember = staff.find((s) => s.id === id);
    if (staffMember) {
      setEditingStaff(staffMember);
      setIsEditModalOpen(true);
    }
  };

  const handleDeleteStaff = (id: string, name?: string) => {
    setDeletingStaff({ id, name: name || "" });
    setIsDeleteModalOpen(true);
  };

  const handleCreateStaff = async (data: CreateStaffData) => {
    setIsCreating(true);
    try {
      await createStaffMember(data, 'coordinator-management');
      setIsAddModalOpen(false);
    } catch (err: any) {
      throw err; // Error will be handled by the modal
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStaff = async (id: string, data: UpdateStaffData) => {
    await updateStaffMember(id, data);
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      await deleteStaffMember(id);
      setIsDeleteModalOpen(false);
      setDeletingStaff(null);
    } catch (err: any) {
      throw err; // Error will be handled by the modal
    }
  };

  const handleApplyFilters = (newFilters: { role?: string[]; coverageAreaId?: string[]; organizationType?: string[] }) => {
    handleFilter(newFilters);
    setIsQuickFilterOpen(false);
  };

  // Show loading state while checking access
  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-danger mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  // If access denied, don't render (redirect will happen)
  if (!canManageStaff) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white relative">
      <div className="absolute top-4 right-4 md:hidden z-[9999]">
        <MobileNav />
      </div>

      {/* Page Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          Staff <span className="hidden md:inline">(Operations)</span>
        </h1>
      </div>

      {/* Topbar Component */}
      <Topbar
        userEmail={displayEmail}
        userName={displayName}
        onUserClick={() => {
          // User profile clicked
        }}
      />

      {/* Toolbar with Search and Actions */}
      <CoordinatorToolbar
        onAddCoordinator={handleAddStaff}
        onAdvancedFilter={() => {
          // Opening advanced filter...
        }}
        onExport={() => {
          // Exporting data...
        }}
        onQuickFilter={() => setIsQuickFilterOpen(true)}
        onSearch={handleSearch}
        isMobile={isMobile}
      />

      {/* Active Filters Display */}
      {(filters.role && filters.role.length > 0) ||
      (filters.coverageAreaId && filters.coverageAreaId.length > 0) ||
      (filters.organizationType && filters.organizationType.length > 0) ? (
        <div className="px-6 py-2 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="font-medium text-blue-900">Active Filters:</span>

            {filters.role && filters.role.length > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                Roles: {filters.role.join(", ")}
              </span>
            )}

            {filters.coverageAreaId && filters.coverageAreaId.length > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                Coverage Areas: {filters.coverageAreaId.length} selected
              </span>
            )}

            {filters.organizationType && filters.organizationType.length > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                Organization Types: {filters.organizationType.join(", ")}
              </span>
            )}

            <button
              onClick={handleClearFilters}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Clear all
            </button>
          </div>
        </div>
      ) : null}

      {/* Error Display */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-100">
          <div className="text-sm text-red-800">
            Error: {error}
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="px-6 py-4 bg-gray-50">
        <CoordinatorTable
          coordinators={staff}
          selectedCoordinators={selectedStaff}
          onActionClick={() => {
            // action handler
          }}
          onDeleteCoordinator={handleDeleteStaff}
          onSelectAll={handleSelectAll}
          onSelectCoordinator={handleSelectStaff}
          onUpdateCoordinator={handleEditStaff}
          searchQuery={searchQuery}
          isAdmin={canManageStaff}
          loading={loading}
        />
      </div>

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateStaff}
        isSubmitting={isCreating}
        getAllowedStaffTypes={getAllowedStaffTypesForCurrentUser}
      />

      {/* Edit Staff Modal */}
      <EditStaffModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingStaff(null);
        }}
        staff={editingStaff}
        onSaved={async () => {
          await fetchStaff();
          setIsEditModalOpen(false);
          setEditingStaff(null);
        }}
        onUpdateStaff={handleUpdateStaff}
        onAssignRole={assignRoleToStaff}
        onRevokeRole={revokeRoleFromStaff}
        onAssignCoverageArea={assignCoverageAreaToStaff}
        onRevokeCoverageArea={revokeCoverageAreaFromStaff}
      />

      {/* Delete Staff Modal */}
      <DeleteCoordinatorModal
        coordinatorId={deletingStaff?.id || null}
        coordinatorName={deletingStaff?.name || null}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingStaff(null);
        }}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Quick Filter Modal */}
      <QuickFilterModal
        isOpen={isQuickFilterOpen}
        onApply={handleApplyFilters}
        onClose={() => setIsQuickFilterOpen(false)}
      />
    </div>
  );
}
