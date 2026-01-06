"use client";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Avatar } from "@heroui/avatar";
import { Persons, Xmark } from "@gravity-ui/icons";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { fetchWithRetry } from "@/utils/fetchWithRetry";
import { invalidateCache } from "@/utils/requestCache";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requestId?: string | null;
  eventId?: string | null;
  request?: any;
  onSaved?: () => void;
}

const API_BASE =
  typeof process !== "undefined" &&
  process.env &&
  process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "http://localhost:3000";

export default function ManageStaffModal({
  isOpen,
  onClose,
  requestId: propRequestId,
  eventId,
  request,
  onSaved,
}: Props) {
  const [staffMembers, setStaffMembers] = useState<
    Array<{ FullName: string; Role: string }>
  >([]);
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get requestId
  const getRequestId = (): string | null => {
    return (
      propRequestId ||
      (request &&
        (request.Request_ID ||
          request.RequestId ||
          request.requestId ||
          request._id ||
          (request.request &&
            (request.request.Request_ID ||
              request.request.RequestId ||
              request.request.requestId ||
              request.request._id)))) ||
      null
    );
  };

  // Get eventId
  const getEventId = (): string | null => {
    // Accept multiple common shapes sent by different components
    if (eventId) return String(eventId);
    if (!request) return null;

    const candidates = [
      request.Event_ID,
      request.EventId,
      request.eventId,
      request.event && request.event.Event_ID,
      request.event && request.event.EventId,
      request.event && request.event._id,
      request._id,
      request.event && request.event.id,
      request.id,
      // nested legacy shapes
      request.request && request.request.Event_ID,
      request.request && request.request._id,
    ];

    for (const c of candidates) {
      if (c !== undefined && c !== null && String(c).trim() !== '') {
        return String(c);
      }
    }

    // no event id found
    console.warn('[ManageStaffModal] getEventId: no event id found on request object', { request });
    return null;
  };

  // Simple function to fetch staff list with timeout and retry
  const fetchStaff = async () => {
    const rid = getRequestId();
    if (!rid) return;

    try {
      setLoading(true);
      setError(null);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token")
          : null;
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Use fetchWithRetry for timeout and retry handling
      const res = await fetchWithRetry(
        `${API_BASE}/api/event-requests/${encodeURIComponent(rid)}`,
        {
          headers,
          method: "GET",
        },
        {
          maxRetries: 2,
          timeout: 30000, // 30 second timeout
        }
      );

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.message || "Failed to fetch staff");
      }

      const reqData = body.data?.request || body.data || body.request || body;
      const staff = body.data?.staff || reqData?.staff || [];

      setStaffMembers(
        Array.isArray(staff)
          ? staff.map((s: any) => ({
              FullName: s.FullName || s.Staff_FullName || s.Staff_Fullname || "",
              Role: s.Role || "",
            }))
          : []
      );
    } catch (e: any) {
      const errorMessage = e?.message || "Failed to load staff";
      // Provide user-friendly error messages
      if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
        setError("Request timed out. Please check your connection and try again.");
      } else if (errorMessage.includes("Failed to fetch") || errorMessage.includes("network")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load staff when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchStaff();
    } else {
      // Reset when modal closes
      setStaffMembers([]);
      setNewFullName("");
      setNewRole("");
      setError(null);
    }
  }, [isOpen, propRequestId, eventId]);

  const addStaff = () => {
    if (!newFullName.trim() || !newRole.trim()) {
      setError("Name and role are required");
      return;
    }
    setError(null);
    setStaffMembers((prev) => [
      ...prev,
      { FullName: newFullName.trim(), Role: newRole.trim() },
    ]);
    setNewFullName("");
    setNewRole("");
  };

  const removeStaff = (idx: number) => {
    setStaffMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    const rid = getRequestId();
    const evtId = getEventId();

    if (!rid) {
      setError("Request ID not found");
      return;
    }

    if (!evtId) {
      setError("Event ID not found");
      return;
    }

    if (staffMembers.length === 0) {
      setError("Please add at least one staff member");
      return;
    }

    // Validate staff members before sending
    for (const staff of staffMembers) {
      if (!staff.FullName?.trim() || !staff.Role?.trim()) {
        setError("All staff members must have both name and role");
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      // Store current staff for rollback if needed
      const previousStaff = [...staffMembers];
      // Optimistically update UI - clear list to show loading state
      setStaffMembers([]);
      setIsRefreshing(true);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token")
          : null;
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body = {
        eventId: evtId,
        staffMembers: previousStaff.map(s => ({
          FullName: s.FullName.trim(),
          Role: s.Role.trim(),
        })),
      };

      const url = `${API_BASE}/api/event-requests/${encodeURIComponent(rid)}/staff`;

      // Use fetchWithRetry for timeout and retry handling
      const res = await fetchWithRetry(
        url,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          credentials: "include",
        },
        {
          maxRetries: 2,
          timeout: 30000, // 30 second timeout
        }
      );

      const resp = await res.json();

      if (!res.ok) {
        // Rollback on error
        setStaffMembers(previousStaff);
        throw new Error(resp.message || "Failed to save staff");
      }

      // Invalidate cache for this request
      invalidateCache(new RegExp(`event-requests/${encodeURIComponent(rid)}`));
      invalidateCache(/event-requests\?/);

      // Dispatch custom event to notify other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("unite:staff-updated", {
            detail: {
              requestId: rid,
              eventId: evtId,
              staffCount: previousStaff.length,
            },
          })
        );
      }

      // After successful save, fetch fresh data
      await fetchStaff();
      setIsRefreshing(false);

      // Clear input fields
      setNewFullName("");
      setNewRole("");

      // Call onSaved callback with updated data
      if (onSaved) {
        onSaved();
      }
    } catch (e: any) {
      setIsRefreshing(false);
      const errorMessage = e?.message || "Failed to save staff";
      // Provide user-friendly error messages
      if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
        setError("Request timed out. Please check your connection and try again.");
      } else if (errorMessage.includes("Failed to fetch") || errorMessage.includes("network")) {
        setError("Network error. Please check your connection and try again.");
      } else if (errorMessage.includes("validation") || errorMessage.includes("Invalid")) {
        setError(`Validation error: ${errorMessage}`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} placement="center" size="2xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Avatar
              className="bg-default-100 border-1 border-default"
              icon={<Persons />}
            />
          </div>
          <h3 className="text-sm font-semibold py-2">Add Staff</h3>
          <p className="text-xs font-normal">
            Start providing your information by selecting your blood type. Add
            details below to proceed.
          </p>
        </ModalHeader>

        <ModalBody className="py-4">
          <div className="mb-6">
            <div className="grid grid-cols-12 gap-4 mb-6 items-end">
              <div className="col-span-5 space-y-1">
                <label className="text-xs font-medium">
                  Name of Staff <span className="text-danger">*</span>
                </label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="Enter name of staff"
                  radius="md"
                  size="sm"
                  value={newFullName}
                  variant="bordered"
                  onChange={(e) =>
                    setNewFullName((e.target as HTMLInputElement).value)
                  }
                />
              </div>

              <div className="col-span-4 space-y-1">
                <label className="text-xs font-medium">Staff Role</label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="Role"
                  radius="md"
                  size="sm"
                  value={newRole}
                  variant="bordered"
                  onChange={(e) =>
                    setNewRole((e.target as HTMLInputElement).value)
                  }
                />
              </div>

              <div className="col-span-3">
                <Button
                  className="w-full font-medium border-default-200"
                  radius="md"
                  size="sm"
                  variant="bordered"
                  onPress={addStaff}
                >
                  Add Staff
                </Button>
              </div>
            </div>

            <div className="border border-default-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-default-50">
                <div className="col-span-1 flex items-center">
                  <input
                    aria-label="select all"
                    className="w-4 h-4 rounded border-default-300"
                    type="checkbox"
                  />
                </div>
                <div className="col-span-6 text-xs font-semibold text-default-600 uppercase tracking-wide">
                  Name
                </div>
                <div className="col-span-3 text-xs font-semibold text-default-600 uppercase tracking-wide">
                  Role
                </div>
                <div className="col-span-2 text-xs font-semibold text-default-600 uppercase tracking-wide text-center">
                  Action
                </div>
              </div>

              <div className="bg-white">
                {(loading || isRefreshing) && (
                  <div className="px-4 py-6 text-center text-sm text-default-600 border-t border-default-100">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner size="sm" />
                      <span>{loading ? "Loading staff..." : "Saving changes..."}</span>
                    </div>
                  </div>
                )}

                {!loading && !isRefreshing && staffMembers.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-default-500">
                    No staff assigned yet.
                  </div>
                )}

                {!loading && !isRefreshing && staffMembers.map((s, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-default-100 hover:bg-default-50 transition-colors"
                  >
                    <div className="col-span-1 flex items-center">
                      <input
                        aria-label={`select-${idx}`}
                        className="w-4 h-4 rounded border-default-300"
                        type="checkbox"
                      />
                    </div>
                    <div className="col-span-6 text-sm text-default-900">
                      {s.FullName}
                    </div>
                    <div className="col-span-3 text-sm text-default-700">
                      {s.Role}
                    </div>
                    <div className="col-span-2 flex items-center justify-end pr-3">
                      <button
                        aria-label="remove"
                        className="text-danger hover:bg-danger-50 p-1.5 rounded-lg transition-colors"
                        onClick={() => removeStaff(idx)}
                      >
                        <Xmark className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          {saving && (
            <div className="text-sm text-default-600">Saving...</div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            className="w-full font-medium"
            variant="bordered"
            onPress={onClose}
          >
            Close
          </Button>
          <Button
            className="w-full font-medium"
            color="primary"
            isDisabled={saving}
            onPress={save}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
