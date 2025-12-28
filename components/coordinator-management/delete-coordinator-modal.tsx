"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

interface DeleteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinatorId: string | null; // Keep prop name for backward compatibility
  coordinatorName: string | null; // Keep prop name for backward compatibility
  onConfirmDelete: (id: string) => Promise<void>;
}

export default function DeleteCoordinatorModal({
  isOpen,
  onClose,
  coordinatorId,
  coordinatorName,
  onConfirmDelete,
}: DeleteStaffModalProps) {
  const [typedName, setTypedName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTypedName("");
      setIsDeleting(false);
      setError(null);
    }
  }, [isOpen]);

  const matches = () => {
    if (!coordinatorName) return false;
    if (!typedName || typedName.trim().length === 0) return false;

    // Case-insensitive, trimmed comparison - must match exactly
    const typed = typedName.trim().toLowerCase();
    const expected = coordinatorName.trim().toLowerCase();
    return typed === expected;
  };

  const handleDelete = async () => {
    if (!coordinatorId) return;
    if (!matches()) {
      setError("Typed name does not match");

      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirmDelete(coordinatorId);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to delete coordinator");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="md"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-3 pb-2">
          <div>
            <h2 className="text-lg font-semibold">Confirm Deactivation</h2>
            <p className="text-xs text-default-500">
              Type the full name of the staff member to confirm deactivation.
            </p>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Staff Member</p>
              <div className="text-sm font-semibold text-gray-900 p-2 bg-gray-50 rounded border border-gray-200">
                {coordinatorName || "—"}
              </div>
            </div>

            <div className="p-3 bg-warning-50 border border-warning-200 rounded">
              <p className="text-sm font-semibold text-warning-800">
                Deactivate Account
              </p>
              <p className="text-xs text-warning-700">
                This will deactivate the staff member's account. They will no longer be able to access the system, but their account data will be preserved. This action can be reversed by reactivating the account.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">
                Type "{coordinatorName || "full name"}" to confirm
              </label>
              <Input
                classNames={{ inputWrapper: "h-10" }}
                placeholder={coordinatorName || "Full name"}
                value={typedName}
                variant="bordered"
                onChange={(e) =>
                  setTypedName((e.target as HTMLInputElement).value)
                }
              />
            </div>

            {error && <div className="text-sm text-danger">{error}</div>}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>
            Cancel
          </Button>
            <Button
            className="bg-warning-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            color="warning"
            isDisabled={!matches() || isDeleting}
            onPress={handleDelete}
          >
            {isDeleting ? "Deactivating..." : "Deactivate"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
