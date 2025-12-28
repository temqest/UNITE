"use client";
import {
  Ellipsis as MoreHorizontal,
  Pencil as Edit3,
  TrashBin as Trash2,
} from "@gravity-ui/icons";
import { Checkbox } from "@heroui/checkbox";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";
import { getCapabilityBadges } from "@/utils/permissionUtils";
import type { StaffListItem } from "@/types/coordinator.types";

interface CoordinatorTableProps {
  coordinators: StaffListItem[];
  selectedCoordinators: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectCoordinator: (id: string, checked: boolean) => void;
  onActionClick: (id: string) => void;
  onUpdateCoordinator?: (id: string) => void;
  onDeleteCoordinator?: (id: string, name?: string) => void;
  searchQuery: string;
  isAdmin?: boolean;
  loading?: boolean;
}

export default function CoordinatorTable({
  coordinators,
  selectedCoordinators,
  onSelectAll,
  onSelectCoordinator,
  onActionClick,
  onUpdateCoordinator,
  onDeleteCoordinator,
  searchQuery,
  isAdmin,
  loading,
}: CoordinatorTableProps) {
  // Filter is already handled by the hook, but we can do additional client-side filtering if needed
  const filteredCoordinators = coordinators;

  const isAllSelected =
    filteredCoordinators.length > 0 &&
    filteredCoordinators.every((c) => selectedCoordinators.includes(c.id));

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-6 py-3.5 text-left w-12">
                  <div className="h-4 bg-gray-200 rounded"></div>
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coordinator
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coverage Areas
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-4"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="bg-gray-200 rounded w-8 h-8"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table Header */}
          <thead>
            <tr className="bg-gray-50/80">
              <th className="px-6 py-3.5 text-left w-12">
                <Checkbox
                  aria-label="Select all coordinators"
                  checked={isAllSelected}
                  size="sm"
                  onValueChange={onSelectAll}
                />
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coordinator
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone Number
              </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coverage Areas
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredCoordinators.map((coordinator) => (
              <tr
                key={coordinator.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-6 py-4 w-12">
                  <Checkbox
                    aria-label={`Select ${coordinator.name}`}
                    checked={selectedCoordinators.includes(coordinator.id)}
                    size="sm"
                    onValueChange={(checked) =>
                      onSelectCoordinator(coordinator.id, checked)
                    }
                  />
                </td>
                <td className="px-6 py-4 text-sm font-normal text-gray-900">
                  <div className="flex flex-col gap-1">
                    <span>{coordinator.fullName}</span>
                    <div className="flex flex-wrap gap-1">
                      {getCapabilityBadges(coordinator).map((badge, idx) => (
                        <Chip
                          key={idx}
                          size="sm"
                          variant="flat"
                          color={badge === 'Hybrid' ? 'secondary' : badge === 'Reviewer' ? 'warning' : 'primary'}
                        >
                          {badge}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {coordinator.email}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {coordinator.phoneNumber || "—"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {coordinator.roles && coordinator.roles.length > 0 ? (
                    coordinator.roles.map((role, index) => (
                      <span key={role.id}>
                        {role.name}
                        {index < coordinator.roles.length - 1 && ", "}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {coordinator.coverageAreas && coordinator.coverageAreas.length > 0 ? (
                    coordinator.coverageAreas.map((ca, index) => (
                      <span key={ca.id}>
                        {ca.name}
                        {ca.isPrimary && " (Primary)"}
                        {index < coordinator.coverageAreas.length - 1 && ", "}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {coordinator.organizations && coordinator.organizations.length > 0 ? (
                    coordinator.organizations.length === 1 ? (
                      <div>
                        <div className="font-medium">{coordinator.organizations[0].type}</div>
                        <div className="text-xs text-gray-500">{coordinator.organizations[0].name}</div>
                      </div>
                    ) : (
                      <Dropdown>
                        <DropdownTrigger>
                          <Button
                            variant="flat"
                            size="sm"
                            className="text-gray-700 hover:text-gray-900 h-auto py-1"
                          >
                            <div className="text-left">
                              <div className="font-medium">{coordinator.organizations[0].type}</div>
                              <div className="text-xs text-gray-500">
                                {coordinator.organizations[0].name}
                                <span className="ml-1 text-gray-400">
                                  (+{coordinator.organizations.length - 1} more)
                                </span>
                              </div>
                            </div>
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Organizations" variant="faded">
                          <DropdownSection title={`${coordinator.organizations.length} Organizations`}>
                            {coordinator.organizations.map((org) => (
                              <DropdownItem
                                key={org.id}
                                description={org.isPrimary ? "Primary organization" : undefined}
                                textValue={`${org.type} - ${org.name}`}
                              >
                                <div>
                                  <div className="font-medium">{org.type}</div>
                                  <div className="text-xs text-gray-500">{org.name}</div>
                                </div>
                              </DropdownItem>
                            ))}
                          </DropdownSection>
                        </DropdownMenu>
                      </Dropdown>
                    )
                  ) : coordinator.organizationType ? (
                    <div>
                      <div className="font-medium">{coordinator.organizationType}</div>
                      {coordinator.organizationName && (
                        <div className="text-xs text-gray-500">{coordinator.organizationName}</div>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-6 py-4">
                  {/** Only show actions to admins. Non-admins get no action menu. */}
                  {isAdmin ? (
                    <Dropdown>
                      <DropdownTrigger>
                        <Button
                          isIconOnly
                          aria-label={`Actions for ${coordinator.name}`}
                          className="text-gray-400 hover:text-gray-600"
                          size="sm"
                          variant="light"
                        >
                          <MoreHorizontal width={18} height={18} />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label="Coordinator actions"
                        variant="faded"
                      >
                        <DropdownSection title="Actions">
                          <DropdownItem
                            key="update"
                            description="Edit the coordinator's details"
                            startContent={<Edit3 />}
                            onPress={() => {
                              if (onUpdateCoordinator)
                                onUpdateCoordinator(coordinator.id);
                            }}
                          >
                            Update coordinator
                          </DropdownItem>
                        </DropdownSection>
                        <DropdownSection title="Danger zone">
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            description="Permanently remove this coordinator"
                            startContent={
                              <Trash2 className="text-xl text-danger pointer-events-none shrink-0" />
                            }
                            onPress={() => {
                              if (onDeleteCoordinator)
                                onDeleteCoordinator(
                                  coordinator.id,
                                  coordinator.fullName,
                                );
                            }}
                          >
                            Delete coordinator
                          </DropdownItem>
                        </DropdownSection>
                      </DropdownMenu>
                    </Dropdown>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredCoordinators.length === 0 && !loading && (
        <div className="px-6 py-12 text-center bg-white">
          <div className="max-w-md mx-auto">
            <p className="text-gray-900 font-medium text-sm mb-2">No staff found</p>
            <p className="text-gray-500 text-sm mb-4">
              No staff members with operational permissions were found.
            </p>
            {searchQuery ? (
              <p className="text-gray-400 text-xs">
                Try adjusting your search query or filters
              </p>
            ) : (
              <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-blue-900 text-xs font-medium mb-2">Troubleshooting:</p>
                <ul className="text-blue-800 text-xs space-y-1 list-disc list-inside">
                  <li>Staff must have roles with operational permissions (request.create, event.create/update, staff.create/update)</li>
                  <li>Check that roles have been properly assigned to users</li>
                  <li>Verify role permissions include the required capabilities</li>
                </ul>
                {isAdmin && (
                  <p className="text-blue-700 text-xs mt-3">
                    Use the diagnostic endpoint <code className="bg-blue-100 px-1 rounded">GET /api/users/:userId/capabilities</code> to inspect user permissions
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

//[FCM-003] Feature: Added coordinator management table component