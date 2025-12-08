"use client";
import React, { useCallback, useMemo, useState } from "react";
import { DatePicker } from "@heroui/date-picker";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Avatar } from "@heroui/avatar";
import {
  EllipsisVertical,
  Eye,
  Pencil,
  Clock,
  TrashBin,
  Check,
  Xmark,
  Persons,
  FileText,
} from "@gravity-ui/icons";

import ManageStaffModal from "../manage-staff-modal";
import EventActionMenu from "./event-action-menu";
import RescheduleModal from "./reschedule-modal";
import ConfirmModal from "./confirm-modal";
import {
  performRequestAction as svcPerformRequestAction,
  performStakeholderConfirm as svcPerformStakeholderConfirm,
  performCoordinatorConfirm,
  fetchRequestDetails as svcFetchRequestDetails,
  deleteRequest as svcDeleteRequest,
} from "./services/requestsService";

import { useLocations } from "../locations-provider";

import { fetchWithAuth } from "@/utils/fetchWithAuth";

import {
  useAllowedActionSet,
  hasAllowedActionFactory,
  getViewer,
  getViewerId,
  formatDate,
} from "./event-card.utils";

import {
  BOOLEAN_FLAG_TO_ACTION,
  ACTION_SYNONYMS,
  FALLBACK_ACTION_MAP,
  API_BASE,
} from "./event-card.constants";

interface EventCardProps {
  title: string;
  organization: string;
  organizationType: string;
  district: string;
  category: string;
  status: "Approved" | "Pending" | "Rejected" | "Cancelled" | "Completed";
  location: string;
  date: string;
  onViewEvent?: () => void;
  onEditEvent?: () => void;
  // currentDate: the existing event date (display only)
  // rescheduledDate: the new chosen date (ISO string or date-only)
  // note: reason for reschedule
  onRescheduleEvent?: (
    currentDate: string,
    rescheduledDate: string,
    note: string,
  ) => void;
  onManageStaff?: () => void;
  request?: any;
  onCancelEvent?: () => void;
  onAcceptEvent?: (note?: string) => void;
  onRejectEvent?: (note?: string) => void;
}

/**
 * EventCard Component
 * Displays summarized event details in a clean card layout with dropdown menu.
 */
const EventCard: React.FC<EventCardProps> = ({
  title,
  organization,
  organizationType,
  district,
  category,
  status,
  location,
  date,
  onViewEvent,
  onEditEvent,
  onRescheduleEvent,
  onManageStaff,
  request,
  onCancelEvent,
  onAcceptEvent,
  onRejectEvent,
}) => {
  // Dialog state management
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [manageStaffOpen, setManageStaffOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [fullRequest, setFullRequest] = useState<any>(null);

  const { getDistrictName, getProvinceName, locations } = useLocations();

  // Resolve district and province names using the centralized provider
  const resolvedGeo = useMemo(() => {
    const pickId =
      (request && (request as any).district) || district || null;

    if (!pickId) return { district: null, province: null };

    // If it's already a friendly name (not an ObjectId), use it
    const isObjectId = (s: any) =>
      typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);

    if (!isObjectId(pickId)) {
      return { district: pickId, province: null };
    }

    // Use provider lookups
    const districtName = getDistrictName(pickId);
    // For province, we need to find the district's province
    const districtObj = Object.values(locations.districts).find(d => d._id === pickId);
    const provinceName = districtObj ? getProvinceName(districtObj.province) : null;

    return {
      district: districtName !== "Unknown District" ? districtName : null,
      province: provinceName !== "Unknown Province" ? provinceName : null,
    };
  }, [request, district, getDistrictName, getProvinceName, locations.districts]);

  const resolvedRequest =
    fullRequest || request || (request && (request as any).event) || null;

  const resolvedRequestId =
    resolvedRequest?.Request_ID ||
    resolvedRequest?.RequestId ||
    resolvedRequest?._id ||
    resolvedRequest?.requestId ||
    null;

  const resolveActorEndpoint = () => {
    const viewer = getViewer();
    const roleString = String(viewer.role || "").toLowerCase();

    if (viewer.isAdmin) return "admin-action";
    if (roleString.includes("coordinator")) return "coordinator-action";
    if (roleString.includes("stakeholder")) return "stakeholder-action";

    return "admin-action";
  };

  const viewer = getViewer();
  const viewerId = getViewerId();
  const viewerRoleString = String(viewer.role || "").toLowerCase();

  const allowedActionSet = useAllowedActionSet({
    request,
    fullRequest,
    resolvedRequest,
  });
  // Debug: log allowed actions for the current viewer
  try {
    // Log more detailed payload for troubleshooting coordinator vs admin flows
    const dbg = {
      requestId: resolvedRequestId,
      viewerId,
      viewerRoleString,
      actions: Array.from(allowedActionSet || []),
      status: resolvedRequest?.Status || resolvedRequest?.status,
      reviewer: resolvedRequest?.reviewer,
      coordinator_id: resolvedRequest?.coordinator_id,
      resolvedAllowedActions: resolvedRequest?.allowedActions ?? resolvedRequest?.allowed_actions ?? null,
      rootAllowedActions: request?.allowedActions ?? request?.allowed_actions ?? null,
    };
    console.debug("[EventCard] allowedActionSet", dbg);
    // For coordinator/admin sessions, also print the whole request snapshot (trimmed)
    if (viewerRoleString.includes("coordinator") || viewerRoleString.includes("admin")) {
      try {
        console.debug("[EventCard] resolvedRequest (trimmed)", {
          Request_ID: resolvedRequest?.Request_ID || resolvedRequest?._id,
          Status: resolvedRequest?.Status || resolvedRequest?.status,
          reviewer: resolvedRequest?.reviewer,
          allowedActions: resolvedRequest?.allowedActions || resolvedRequest?.allowed_actions || null,
          event: resolvedRequest?.event ? { Event_ID: resolvedRequest.event.Event_ID || resolvedRequest.event._id, Status: resolvedRequest.event.Status || resolvedRequest.event.status } : null,
        });
      } catch (e) {}
    }
  } catch (e) {}
  const hasAllowedAction = React.useCallback(
    hasAllowedActionFactory(allowedActionSet),
    [allowedActionSet],
  );

  const isReviewAccepted = (() => {
    try {
      const r = resolvedRequest || request || {};
      const s = String(r?.Status || r?.status || "").toLowerCase();
      return s.includes("review") && s.includes("accepted");
    } catch (e) {
      return false;
    }
  })();

  const viewerIsAssignedCoordinator = (() => {
    try {
      if (!viewerId) return false;
      if (!viewerRoleString.includes("coordinator")) return false;
      const r = resolvedRequest || request || {};
      if (!r) return false;
      const coordId =
        r?.coordinator_id || r?.Coordinator_ID || r?.coordinatorId || null;
      const reviewerId = r?.reviewer?.id || r?.reviewerId || null;
      return (
        String(viewerId) === String(coordId) ||
        String(viewerId) === String(reviewerId)
      );
    } catch (e) {
      return false;
    }
  })();

  const hasAnyAllowedAction = (names: string[]) =>
    names.some((name) => hasAllowedAction(name));

  // Manage staff state
  // Manage staff modal is handled by the shared ManageStaffModal component

  // Reschedule handler used by RescheduleModal
  const handleRescheduleConfirm = async (
    currentDateStr: string,
    rescheduledISO: string,
    noteText: string,
  ) => {
    try {
      if (onRescheduleEvent) {
        onRescheduleEvent(currentDateStr, rescheduledISO, noteText);
      } else {
        if (resolvedRequestId) {
          await performRequestAction(
            resolvedRequestId,
            resolveActorEndpoint(),
            "Rescheduled",
            noteText,
            rescheduledISO,
          );
        }
      }
    } catch (e) {
      console.error("Reschedule error:", e);
    } finally {
      setRescheduleOpen(false);
    }

    if (viewOpen) {
      await openViewRequest();
    }
  };

  const handleCancel = () => {
    if (onCancelEvent) {
      onCancelEvent();
    }
    setCancelOpen(false);
  };

  const handleCancelWithNote = async (note?: string) => {
    try {
      const n = note ? note.trim() : "";
      if (!n) {
        throw new Error("Please provide a reason for cancelling this event");
      }

      if (resolvedRequestId) {
        await performRequestAction(
          resolvedRequestId,
          resolveActorEndpoint(),
          "Cancelled",
          n,
        );
      } else if (onCancelEvent) {
        onCancelEvent();
      }
    } catch (e) {
      console.error("Cancel error:", e);
      alert(
        "Failed to cancel event: " + ((e as Error).message || "Unknown error"),
      );
      return;
    }

    setCancelOpen(false);

    if (viewOpen) {
      await openViewRequest();
    }
  };

  const handleDelete = async () => {
    try {
      // Use the most up-to-date request data available
      let r = resolvedRequest || {};
      const requestId = r?.Request_ID || r?.RequestId || r?.requestId || null;

      if (!requestId) {
        alert("Request ID not found");

        return;
      }

      // If we don't have fresh data or the status isn't cancelled, fetch the latest
      if (
        !fullRequest ||
        (r.Status !== "Cancelled" && r.status !== "Cancelled")
      ) {
        try {
          const data = await svcFetchRequestDetails(requestId);
          r = data || r;
        } catch (fetchError) {
          console.warn("Failed to fetch latest request data:", fetchError);
        }
      }

      // perform deletion via service
      const resp = await svcDeleteRequest(requestId);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token")
          : null;
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Create deletion notification for coordinator
      try {
        const coordinatorId = r?.coordinator_id || r?.Coordinator_ID || null;
        const eventId = r?.Event_ID || r?.EventId || null;

        if (coordinatorId && eventId) {
          const notificationRes = await fetch(
            `${API_BASE}/api/notifications/request-deletion`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                coordinatorId,
                requestId,
                eventId,
              }),
              credentials: "include",
            },
          );

          if (!notificationRes.ok) {
            console.warn("Failed to create coordinator deletion notification");
          }
        }
      } catch (notificationError) {
        console.warn(
          "Error creating coordinator deletion notification:",
          notificationError,
        );
      }

      // Create deletion notification for stakeholder (owner)
      try {
        const stakeholderId =
          r?.stakeholder_id ||
          r?.Stakeholder_ID ||
          (r?.made_by_role === "Stakeholder" ? r?.made_by_id : null) ||
          null;
        const eventId = r?.Event_ID || r?.EventId || null;

        if (stakeholderId && eventId) {
          const stakeholderNotificationRes = await fetch(
            `${API_BASE}/api/notifications/stakeholder-deletion`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                stakeholderId,
                requestId,
                eventId,
              }),
              credentials: "include",
            },
          );

          if (!stakeholderNotificationRes.ok) {
            console.warn("Failed to create stakeholder deletion notification");
          }
        }
      } catch (stakeholderNotificationError) {
        console.warn(
          "Error creating stakeholder deletion notification:",
          stakeholderNotificationError,
        );
      }

      // Notify other parts of the app to refresh lists
      try {
        window.dispatchEvent(
          new CustomEvent("unite:requests-changed", { detail: { requestId } }),
        );
      } catch (e) {}

      setDeleteOpen(false);
      setSuccessModal(true);
    } catch (e) {
      console.error("Delete error:", e);
      alert(
        "Failed to delete request: " +
          ((e as Error).message || "Unknown error"),
      );
    } finally {
      setDeleteOpen(false);
    }
  };

  const handleReject = () => {
    // legacy: call without note
    if (onRejectEvent) {
      try {
        onRejectEvent();
      } catch (e) {}
    }
    setRejectOpen(false);
  };

  const handleAccept = (note?: string) => {
    (async () => {
      try {
        if (resolvedRequestId) {
          await performRequestAction(
            resolvedRequestId,
            resolveActorEndpoint(),
            "Accepted",
            note || "",
          );
        } else if (onAcceptEvent) {
          try {
            onAcceptEvent(note);
          } catch (e) {}
        }
      } catch (e) {
        console.error("Accept error:", e);
        alert(
          "Failed to accept request: " +
            ((e as Error).message || "Unknown error"),
        );
      } finally {
        setAcceptOpen(false);
      }
    })();
  };

  // New: handle reject with admin note
  const handleRejectWithNote = (note?: string) => {
    (async () => {
      try {
        if (resolvedRequestId) {
          await performRequestAction(
            resolvedRequestId,
            resolveActorEndpoint(),
            "Rejected",
            note || "",
          );
        } else if (onRejectEvent) {
          try {
            onRejectEvent(note);
          } catch (e) {}
        }
      } catch (e) {
        // ignore
      } finally {
        setRejectOpen(false);
      }
    })();
  };

  // Menu for Approved status
  // Helper to derive flags from request/event or fallback to allowedActions
  const flagFor = (
    flagName: string,
    actionName?: string | string[],
  ): boolean => {
    try {
      const r = resolvedRequest || request || {};
      const explicit = (r as any)?.[flagName] ?? (r as any)?.event?.[flagName];

      if (explicit !== undefined && explicit !== null) {
        return Boolean(explicit);
      }

      if (actionName && hasAllowedAction(actionName)) {
        return true;
      }

      const fallback = FALLBACK_ACTION_MAP[flagName];
      if (fallback && hasAllowedAction(fallback)) {
        return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  };

  // Menus are now rendered by EventActionMenu which uses the same flags and setters

  // Menu for Pending status
  // pendingMenu moved to EventActionMenu

  // Default menu for Rejected or other statuses
  // defaultMenu moved to EventActionMenu

  // API_BASE imported from event-card.constants

  // Network operations moved to services/requestsService
  const performRequestAction = svcPerformRequestAction;

  // Open local view modal, fetching full request details when necessary
  const openViewRequest = async () => {
    try {
      const r = request || (request && (request as any).event) || {};
      const requestId =
        r?.Request_ID || r?.RequestId || r?._id || r?.requestId || null;

      // If there's no id, just open with the provided object
      if (!requestId) {
        setFullRequest(r);
        setViewOpen(true);

        return;
      }

      // If the passed request already contains event category subdocuments (BloodDrive/Training/Advocacy)
      // then we can avoid fetching; do NOT treat admin/stakeholder action fields as "has nested".
      const hasNested = !!(
        r?.event?.categoryData ||
        r?.event?.BloodDrive ||
        r?.event?.bloodDrive ||
        r?.event?.Training ||
        r?.event?.training ||
        r?.event?.Advocacy ||
        r?.event?.advocacy ||
        r?.BloodDrive ||
        r?.bloodDrive ||
        r?.Training ||
        r?.training ||
        r?.Advocacy ||
        r?.advocacy
      );

      if (hasNested) {
        setFullRequest(r);
        setViewOpen(true);

        return;
      }

      // Otherwise fetch fresh details from API
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token")
          : null;
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;
      const url = `${API_BASE}/api/requests/${encodeURIComponent(requestId)}`;
      let res;

      if (token) {
        // try fetchWithAuth if available
        try {
          res = await fetchWithAuth(url, { method: "GET" });
        } catch (e) {
          res = await fetch(url, { headers });
        }
      } else {
        res = await fetch(url, { headers, credentials: "include" });
      }
      const body = await res.json().catch(() => ({}));

      const data = body?.data || body?.request || body;
      // If the returned request contains an event reference but not the full
      // event (with category subdocument like BloodDrive), fetch the event
      // and merge so the View modal can display specific details.
      let finalRequest = data || r;

      try {
        const eventRef = finalRequest?.event || finalRequest;
        const eventId =
          eventRef?.Event_ID ||
          eventRef?.EventId ||
          eventRef?.EventId ||
          eventRef?.Event_ID ||
          finalRequest?.Event_ID ||
          finalRequest?.EventId ||
          null;

        if (eventId) {
          // fetch full event details
          const evUrl = `${API_BASE}/api/events/${encodeURIComponent(eventId)}`;
          let evRes;

          try {
            if (token) {
              try {
                evRes = await fetchWithAuth(evUrl, { method: "GET" });
              } catch (e) {
                evRes = await fetch(evUrl, { headers });
              }
            } else {
              evRes = await fetch(evUrl, { headers, credentials: "include" });
            }
          } catch (fetchErr) {
            evRes = null;
          }

          const evBody = evRes ? await evRes.json().catch(() => ({})) : null;
          let evData = evBody?.data || evBody?.event || evBody;

          // If fetched event did not include categoryData, try the dedicated category endpoint
          if (evData && !evData.categoryData) {
            try {
              const catUrl = `${API_BASE}/api/events/${encodeURIComponent(eventId)}/category`;
              let catRes;

              if (token) {
                try {
                  catRes = await fetchWithAuth(catUrl, { method: "GET" });
                } catch (e) {
                  catRes = await fetch(catUrl, { headers });
                }
              } else {
                catRes = await fetch(catUrl, {
                  headers,
                  credentials: "include",
                });
              }
              const catBody = await catRes.json().catch(() => null);

              const catData = catBody?.data || catBody?.category || catBody;

              if (catData)
                evData = { ...(evData || {}), categoryData: catData };
            } catch (e) {}
          }

          // Merge strategy: prefer fetched evData, but keep any request-level event fallback fields
          const mergedEvent = {
            ...(evData || {}),
            ...(finalRequest?.event || {}),
          };

          finalRequest = { ...(finalRequest || {}), event: mergedEvent };

          // Preserve requester/request-level fallback fields from the original passed-in object `r`
          // if the freshly fetched request is missing them (keeps createdByName, email, dates, etc.)
          try {
            const fallbackKeys = [
              "createdByName",
              "RequesterName",
              "First_Name",
              "first_name",
              "Email",
              "email",
              "RequestedDate",
              "Date",
              "StartTime",
              "Start",
              "EndTime",
              "End",
            ];

            fallbackKeys.forEach((k) => {
              try {
                if (
                  (finalRequest[k] === undefined ||
                    finalRequest[k] === null ||
                    finalRequest[k] === "") &&
                  r &&
                  (r as any)[k]
                ) {
                  finalRequest[k] = (r as any)[k];
                }
              } catch (e) {}
            });
          } catch (e) {}
        }
      } catch (e) {
        // ignore event fetch failures and proceed with request data
      }

      setFullRequest(finalRequest || r);
      // Geo resolution is now handled by useMemo above

      setViewOpen(true);
    } catch (e) {
      // fallback to provided request
      setFullRequest(request || (request && (request as any).event) || null);
      setViewOpen(true);
    }
  };

  // Stakeholder confirm action moved to services
  const performStakeholderConfirm = svcPerformStakeholderConfirm;

  const runStakeholderDecision = async (decision: "Accepted" | "Rejected") => {
    try {
      if (!resolvedRequestId) {
        throw new Error("Unable to determine request id");
      }
      // If current viewer is a coordinator confirming an admin decision, use the coordinator-confirm endpoint
      if (
        viewerRoleString.includes("coordinator") &&
        viewerIsAssignedCoordinator
      ) {
        await performCoordinatorConfirm(resolvedRequestId, decision);
      } else {
        await performStakeholderConfirm(resolvedRequestId, decision);
      }
      setViewOpen(false);
    } catch (err: any) {
      console.error("Stakeholder decision error:", err);
      alert(
        `Failed to ${
          decision === "Accepted" ? "confirm" : "decline"
        } request: ${err?.message || "Unknown error"}`,
      );
    }
  };

  const buildActionMenu = () => {
    if (allowedActionSet.size === 0) return null;

    const actions: JSX.Element[] = [];
    const danger: JSX.Element[] = [];

    if (flagFor("canView", "view") && typeof onViewEvent === "function") {
      actions.push(
        <DropdownItem
          key="view-event"
          description="View event details"
          startContent={<Eye />}
          onPress={onViewEvent}
        >
          View Event
        </DropdownItem>,
      );
    }

    if (flagFor("canManageStaff", "manage-staff")) {
      actions.push(
        <DropdownItem
          key="manage-staff"
          description="Manage staff for this event"
          startContent={<Persons />}
          onPress={() => {
            setManageStaffOpen(true);
            if (typeof onManageStaff === "function") onManageStaff();
          }}
        >
          Manage Staff
        </DropdownItem>,
      );
    }

    if (flagFor("canAccept", ["accept", "approve"])) {
      actions.push(
        <DropdownItem
          key="accept"
          description="Accept this request"
          startContent={<Check />}
          onPress={() => setAcceptOpen(true)}
        >
          Accept Request
        </DropdownItem>,
      );
    }

    if (flagFor("canReject", "reject")) {
      // When waiting for coordinator confirmation after admin accepted, do not show a Reject option
      if (!(isReviewAccepted && viewerIsAssignedCoordinator)) {
        actions.push(
          <DropdownItem
            key="reject"
            description="Reject this request"
            startContent={<Xmark />}
            onPress={() => setRejectOpen(true)}
          >
            Reject Request
          </DropdownItem>,
        );
      }
    }

    if (flagFor("canReschedule", ["resched", "reschedule"])) {
      actions.push(
        <DropdownItem
          key="reschedule"
          description="Propose a new schedule"
          startContent={<Clock />}
          onPress={() => setRescheduleOpen(true)}
        >
          Reschedule
        </DropdownItem>,
      );
    }

    // Show Confirm action when allowed, or as a fallback when request is review-accepted
    // and the current viewer is the assigned coordinator (ensures quick-action availability).
    if (
      flagFor("canConfirm", "confirm") ||
      (isReviewAccepted && viewerIsAssignedCoordinator)
    ) {
      actions.push(
        <DropdownItem
          key="confirm"
          description="Confirm the reviewer decision"
          startContent={<Check />}
          onPress={async () => {
            try {
              if (
                viewerRoleString.includes("coordinator") &&
                viewerIsAssignedCoordinator
              ) {
                await performCoordinatorConfirm(resolvedRequestId, "Accepted");
                setViewOpen(false);
              } else {
                await runStakeholderDecision("Accepted");
              }
            } catch (e) {
              console.error("Confirm error:", e);
              alert(
                "Failed to confirm request: " + (e as any)?.message ||
                  "Unknown error",
              );
            }
          }}
        >
          Confirm
        </DropdownItem>,
      );
    }

    if (flagFor("canDecline", "decline")) {
      actions.push(
        <DropdownItem
          key="decline"
          description="Decline the reviewer decision"
          startContent={<Xmark />}
          onPress={async () => {
            await runStakeholderDecision("Rejected");
          }}
        >
          Decline
        </DropdownItem>,
      );
    }

    if (flagFor("canAdminAction", "cancel")) {
      danger.push(
        <DropdownItem
          key="cancel"
          className="text-danger"
          color="danger"
          description="Cancel this request"
          startContent={
            <TrashBin className="text-xl text-danger pointer-events-none shrink-0" />
          }
          onPress={() => setCancelOpen(true)}
        >
          Cancel Request
        </DropdownItem>,
      );
    }

    if (flagFor("canDelete", "delete")) {
      danger.push(
        <DropdownItem
          key="delete"
          className="text-danger"
          color="danger"
          description="Delete this request"
          startContent={
            <TrashBin className="text-xl text-danger pointer-events-none shrink-0" />
          }
          onPress={() => setDeleteOpen(true)}
        >
          Delete Request
        </DropdownItem>,
      );
    }

    if (actions.length === 0 && danger.length === 0) {
      return null;
    }

    return (
      <DropdownMenu aria-label="Event actions menu" variant="faded">
        {actions.length > 0 ? (
          <DropdownSection title="Actions">{actions}</DropdownSection>
        ) : null}
        {danger.length > 0 ? (
          <DropdownSection title="Danger zone">{danger}</DropdownSection>
        ) : null}
      </DropdownMenu>
    );
  };

  const renderFooterActionsFromAllowed = () => {
    if (allowedActionSet.size === 0) return null;

    const buttons: JSX.Element[] = [];
    // Only show the core action set: Accept, Reschedule, Reject
    // Reject is styled as a danger action to make it visually distinct.
    if (isReviewAccepted && viewerIsAssignedCoordinator) {
      buttons.push(
        <Button
          key="footer-confirm"
          className="bg-black text-white"
          color="default"
          onPress={async () => {
            setViewOpen(false);
            try {
              if (!resolvedRequestId) return alert("Request id not found");
              await performCoordinatorConfirm(resolvedRequestId, "Accepted");
              try {
                window.dispatchEvent(
                  new CustomEvent("unite:requests-changed", {
                    detail: { requestId: resolvedRequestId },
                  }),
                );
              } catch (e) {}
            } catch (e) {
              console.error("Footer confirm error:", e);
              alert(
                "Failed to confirm request: " +
                  ((e as any)?.message || "Unknown error"),
              );
            }
          }}
        >
          Confirm
        </Button>,
      );
    } else if (hasAllowedAction(["accept", "approve"])) {
      buttons.push(
        <Button
          key="footer-accept"
          className="bg-black text-white"
          color="default"
          onPress={() => {
            setViewOpen(false);
            setAcceptOpen(true);
          }}
        >
          Accept
        </Button>,
      );
    }

    if (hasAllowedAction(["resched", "reschedule"])) {
      buttons.push(
        <Button
          key="footer-resched"
          color="default"
          onPress={() => {
            setViewOpen(false);
            setRescheduleOpen(true);
          }}
        >
          Reschedule
        </Button>,
      );
    }

    // Only show Reject when not in review-accepted coordinator confirmation state
    if (
      !(isReviewAccepted && viewerIsAssignedCoordinator) &&
      hasAllowedAction("reject")
    ) {
      buttons.push(
        <Button
          key="footer-reject"
          color="danger"
          variant="bordered"
          onPress={() => {
            setViewOpen(false);
            setRejectOpen(true);
          }}
        >
          Reject
        </Button>,
      );
    }

    if (!buttons.length) return null;

    return [
      <Button
        key="footer-close"
        variant="bordered"
        onPress={() => setViewOpen(false)}
      >
        Close
      </Button>,
      ...buttons,
    ];
  };

  // Menu rendering moved to EventActionMenu component above

  // Determine a human-friendly pending-stage label for Pending requests
  const getPendingStageLabel = (): string | null => {
    const r =
      resolvedRequest || request || (request && (request as any).event) || {};

    // Prefer a human-friendly label returned by the backend when present
    const backendLabel =
      r?.statusLabel || r?.status_label || r?.StatusLabel || null;
    if (backendLabel) return backendLabel;

    // First check the request Status field for new workflow statuses
    const requestStatus = String(r?.Status || r?.status || "").toLowerCase();

    // Unified workflow statuses (case-insensitive)
    if (
      requestStatus.includes("pending") ||
      requestStatus.includes("pending_review") ||
      requestStatus.includes("pending_review")
    ) {
      if (
        r?.reviewer?.role &&
        String(r.reviewer.role).toLowerCase().includes("coordinator")
      )
        return "Waiting for Coordinator review";
      if (
        r?.reviewer?.role &&
        (String(r.reviewer.role).toLowerCase().includes("admin") ||
          String(r.reviewer.role).toLowerCase().includes("systemadmin"))
      )
        return "Waiting for Admin review";
      return "Waiting for Admin or Coordinator review";
    }

    if (requestStatus.includes("review")) {
      if (requestStatus.includes("accepted"))
        return "Waiting for Coordinator confirmation";
      if (
        requestStatus.includes("resched") ||
        requestStatus.includes("reschedule") ||
        requestStatus.includes("rescheduled")
      )
        return r?.reviewer?.role &&
          String(r.reviewer.role).toLowerCase().includes("coordinator")
          ? "Waiting for Coordinator review (reschedule)"
          : "Waiting for Admin review (reschedule)";
      return "Waiting for Admin or Coordinator review";
    }

    if (
      requestStatus.includes("rescheduled_by_admin") ||
      requestStatus.includes("rescheduled_by_admin") ||
      requestStatus.includes("rescheduled_by_admin")
    ) {
      return r?.reviewer?.role &&
        String(r.reviewer.role).toLowerCase().includes("coordinator")
        ? "Waiting for Coordinator review (reschedule)"
        : "Waiting for Admin review (reschedule)";
    }
    if (requestStatus.includes("rescheduled_by_coordinator")) {
      return "Rescheduled by coordinator";
    }
    if (requestStatus.includes("rescheduled_by_stakeholder")) {
      return "Rescheduled by stakeholder";
    }

    // Fallback to old logic for backward compatibility
    if (status !== "Pending") return null;
    const adminAction =
      (r as any).AdminAction ?? (r as any).adminAction ?? null;
    const stakeholderAction =
      (r as any).StakeholderFinalAction ??
      (r as any).stakeholderFinalAction ??
      null;
    const coordinatorAction =
      (r as any).CoordinatorFinalAction ??
      (r as any).coordinatorFinalAction ??
      null;

    // Check if there's a stakeholder involved in this request
    const hasStakeholder =
      r?.stakeholder_id ||
      r?.Stakeholder_ID ||
      r?.StakeholderId ||
      r?.MadeByStakeholderID ||
      r?.stakeholder?.Stakeholder_ID ||
      null;

    if (!adminAction) return "Waiting for admin review";
    if (hasStakeholder && !stakeholderAction)
      return "Waiting for stakeholder confirmation";
    if (!coordinatorAction) return "Waiting for coordinator confirmation";

    return null;
  };

  // Try to derive the current viewer id from legacy storage
  // getViewerId and formatDate are provided by utils

  const isViewerStakeholder = (() => {
    try {
      const r = request || (request && (request as any).event) || {};
      const madeByStakeholder =
        r?.stakeholder?.Stakeholder_ID ||
        r?.MadeByStakeholderID ||
        r?.Stakeholder_ID ||
        r?.stakeholder_id ||
        r?.StakeholderId ||
        null;

      if (!madeByStakeholder) return false;
      const viewerId = getViewerId();

      if (!viewerId) return false;

      return String(viewerId) === String(madeByStakeholder);
    } catch (e) {
      return false;
    }
  })();

  // Header status label: shows pending subtypes (unless the subtype is 'completed'),
  // or base statuses like Approved/Rejected/Cancelled as fallback.
  const headerStatusLabel = (() => {
    try {
      const pendingLabel = getPendingStageLabel();
      const r = resolvedRequest || request || {};
      const rawStatus = String(r?.Status || r?.status || status || "").toLowerCase();

      // If pending subtype indicates 'completed', don't show it
      if (rawStatus.includes("pending") && pendingLabel) {
        const low = String(pendingLabel).toLowerCase();
        if (low.includes("complete")) return null;
        return pendingLabel;
      }

      if (rawStatus.includes("approve") || rawStatus.includes("approved")) return "Approved";
      if (rawStatus.includes("reject") || rawStatus.includes("rejected")) return "Rejected";
      if (rawStatus.includes("cancel")) return "Cancelled";

      return (r?.statusLabel || r?.StatusLabel || r?.status || r?.Status || status) || null;
    } catch (e) {
      return null;
    }
  })();

  // Helper to safely extract numeric counts from various backend shapes
  const extractNumber = (v: any): number | null => {
    try {
      if (v === undefined || v === null) return null;
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      }
      if (typeof v === "object") {
        // Mongo Extended JSON shapes
        if (v.$numberInt !== undefined) return Number(v.$numberInt);
        if (v.$numberLong !== undefined) return Number(v.$numberLong);
        if (v.$numberDecimal !== undefined) return Number(v.$numberDecimal);
        // direct numeric-like keys
        for (const k of Object.keys(v)) {
          const maybe = (v as any)[k];
          if (typeof maybe === "number") return maybe;
          if (typeof maybe === "string" && /^[0-9]+(\.|$)/.test(maybe))
            return Number(maybe);
        }
      }
    } catch (e) {}
    return null;
  };

  // Derive goal count and label from the request/event object
  const goalInfo = useMemo(() => {
    const r = resolvedRequest || request || {};
    const ev = r.event || r || {};

    const categoryCandidate =
      (ev?.Category || ev?.category || r?.Category || r?.category || category || "")
        .toString()
        .toLowerCase();

    // Candidate fields for each type (try multiple casings)
    const bloodTargets = [
      ev?.BloodDrive?.Target_Donation,
      ev?.bloodDrive?.Target_Donation,
      ev?.BloodDrive?.TargetDonation,
      ev?.bloodDrive?.TargetDonation,
      ev?.Target_Donation,
      ev?.TargetDonation,
      r?.Target_Donation,
      r?.TargetDonation,
    ];

    const trainingTargets = [
      ev?.Training?.MaxParticipants,
      ev?.training?.MaxParticipants,
      ev?.Training?.Max_Participants,
      ev?.training?.Max_Participants,
      ev?.MaxParticipants,
      ev?.Max_Participants,
      r?.MaxParticipants,
      r?.Max_Participants,
    ];

    const advocacyTargets = [
      ev?.Advocacy?.ExpectedAudienceSize,
      ev?.advocacy?.ExpectedAudienceSize,
      ev?.Advocacy?.Expected_Audience_Size,
      ev?.advocacy?.Expected_Audience_Size,
      ev?.ExpectedAudienceSize,
      ev?.Expected_Audience_Size,
      r?.ExpectedAudienceSize,
      r?.Expected_Audience_Size,
    ];

    const pickNumberFrom = (arr: any[]) => {
      for (const a of arr) {
        const n = extractNumber(a);
        if (n !== null) return n;
      }
      return null;
    };

    if (categoryCandidate.includes("blood")) {
      let n = null;
      const txt =
        String(ev?.reviewSummary || ev?.reviewMessage || r?.reviewSummary || r?.reviewMessage || "");
      const m = txt.match(/target\s+donation\s+of\s+(\d+)/i) || txt.match(/target\s+donation[^\d]*(\d+)/i) || txt.match(/target\s+(?:donation|donations)[^\d]*(\d+)/i);
      if (m && m[1]) n = extractNumber(m[1]);
      if (n === null) {
        n = pickNumberFrom(bloodTargets);
      }
      if (n === null) {
        const m2 = txt.match(/(\d+)/g);
        if (m2) {
          const numbers = m2.map(extractNumber).filter((nn): nn is number => nn !== null);
          if (numbers.length > 0) {
            const last = numbers[numbers.length - 1];
            if (last > 0) n = last;
          }
        }
      }
      return { count: n, label: "u.", isBlood: true, mainLabel: "Goal Count" };
    }

    if (categoryCandidate.includes("training")) {
      let n = null;
      const txt = String(ev?.reviewSummary || r?.reviewSummary || "");
      const m = txt.match(/max(?:imum)?\s+participants?[^\d]*(\d+)/i) || txt.match(/participants?[^\d]*(\d+)/i);
      if (m && m[1]) n = extractNumber(m[1]);
      if (n === null) {
        n = pickNumberFrom(trainingTargets);
      }
      if (n === null) {
        const m2 = txt.match(/(\d+)/g);
        if (m2) {
          const numbers = m2.map(extractNumber).filter((nn): nn is number => nn !== null);
          if (numbers.length > 0) {
            const last = numbers[numbers.length - 1];
            if (last > 0) n = last;
          }
        }
      }
      return { count: n, label: "", isBlood: false, mainLabel: "Audience No." };
    }

    if (categoryCandidate.includes("advoc") || categoryCandidate.includes("advocacy")) {
      let n = null;
      const txt = String(ev?.reviewSummary || r?.reviewSummary || "");
      const m = txt.match(/expected\s+audience\s+size[^\d]*(\d+)/i) || txt.match(/audience[^\d]*(\d+)/i) || txt.match(/participants?[^\d]*(\d+)/i);
      if (m && m[1]) n = extractNumber(m[1]);
      if (n === null) {
        n = pickNumberFrom(advocacyTargets);
      }
      if (n === null) {
        const m2 = txt.match(/(\d+)/g);
        if (m2) {
          const numbers = m2.map(extractNumber).filter((nn): nn is number => nn !== null);
          if (numbers.length > 0) {
            const last = numbers[numbers.length - 1];
            if (last > 0) n = last;
          }
        }
      }
      return { count: n, label: "", isBlood: false, mainLabel: "Audience No." };
    }

    // Fallback: try any known fields
    const fallback = pickNumberFrom([
      ...bloodTargets,
      ...trainingTargets,
      ...advocacyTargets,
    ]);

    let n = fallback;
    if (n === null) {
      const txt = String(ev?.reviewSummary || ev?.reviewMessage || r?.reviewSummary || r?.reviewMessage || "");
      const m = txt.match(/(\d+)/g);
      if (m) {
        const numbers = m.map(extractNumber).filter((nn): nn is number => nn !== null);
        if (numbers.length > 0) {
          const last = numbers[numbers.length - 1];
          if (last > 0) n = last;
        }
      }
    }

    return { count: n, label: n !== null ? "" : "", isBlood: false, mainLabel: "Goal Count" };
  }, [resolvedRequest, request, fullRequest, category]);

  // Format the date/time for the card footer area (e.g. "Dec 1 8:00 AM - 4:00 PM")
  const cardDateRange = useMemo(() => {
    const r = resolvedRequest || request || {};

    const pick = (...cands: any[]) => {
      for (const c of cands) {
        if (c !== undefined && c !== null && c !== "") return c;
      }
      return null;
    };

    const startVal = pick(
      r?.Start_Date,
      r?.Start,
      r?.start,
      r?.StartTime,
      r?.event?.Start_Date,
      r?.event?.Start,
      r?.event?.StartTime,
    );

    const endVal = pick(
      r?.End_Date,
      r?.End,
      r?.end,
      r?.EndTime,
      r?.event?.End_Date,
      r?.event?.End,
      r?.event?.EndTime,
    );

    const formatDateShort = (d?: any) => {
      if (!d) return null;
      try {
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return String(d);
        return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } catch (e) {
        return String(d);
      }
    };

    const formatTimeShort = (t?: any) => {
      if (!t) return null;
      try {
        const dt = new Date(t);
        if (isNaN(dt.getTime())) return String(t);
        return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      } catch (e) {
        return String(t);
      }
    };

    const datePart = formatDateShort(startVal) || formatDateShort(endVal) || null;
    const startTime = formatTimeShort(startVal);
    const endTime = formatTimeShort(endVal);

    if (!datePart && !startTime && !endTime) return null;

    if (datePart && startTime) {
      return `${datePart} ${startTime}${endTime ? " - " + endTime : ""}`;
    }

    // Fallbacks
    if (startTime && endTime) return `${startTime} - ${endTime}`;
    if (startTime) return `${startTime}`;
    if (datePart) return datePart;

    return null;
  }, [resolvedRequest, request, fullRequest]);

  return (
    <>
      <Card className="w-full rounded-xl border border-gray-200 shadow-none bg-white">
        <CardHeader className="flex justify-between items-start">
          {/* Title and Organization */}
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="w-6 h-6" />
              <div className="flex flex-col">
                <p className="text-xs text-default-800">
                  {(request &&
                    (request.createdByName ||
                      (request.event && request.event.createdByName))) ||
                    organization ||
                    organizationType}
                </p>
                {headerStatusLabel ? (
                  <p className="text-xs text-default-400 mt-1">{headerStatusLabel}</p>
                ) : null}
              </div>
            </div>
          </div>
          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                aria-label="Event actions"
                className="hover:text-default-800"
                variant="light"
              >
                <EllipsisVertical className="w-5 h-5" />
              </Button>
            </DropdownTrigger>
            <EventActionMenu
              allowedActionSet={allowedActionSet}
              hasAllowedAction={hasAllowedAction}
              flagFor={flagFor}
              status={status}
              request={request}
              onViewEvent={onViewEvent}
              onEditEvent={onEditEvent}
              openViewRequest={openViewRequest}
              setManageStaffOpen={setManageStaffOpen}
              setRescheduleOpen={setRescheduleOpen}
              setAcceptOpen={setAcceptOpen}
              setRejectOpen={setRejectOpen}
              setCancelOpen={setCancelOpen}
              setDeleteOpen={setDeleteOpen}
              // Do NOT show confirm fallback for reviewers; rely solely on allowed actions
              showConfirmFallback={false}
              onConfirm={async () => {
                try {
                  if (!resolvedRequestId)
                    throw new Error("Request id not found");
                  if (
                    viewerRoleString.includes("coordinator") &&
                    viewerIsAssignedCoordinator
                  ) {
                    await performCoordinatorConfirm(
                      resolvedRequestId,
                      "Accepted",
                    );
                  } else {
                    await runStakeholderDecision("Accepted");
                  }
                  try {
                    window.dispatchEvent(
                      new CustomEvent("unite:requests-changed", {
                        detail: { requestId: resolvedRequestId },
                      }),
                    );
                  } catch (e) {}
                } catch (e) {
                  console.error("Dropdown confirm error:", e);
                  try {
                    alert(
                      "Failed to confirm request: " + (e as any)?.message ||
                        "Unknown error",
                    );
                  } catch (_) {}
                }
              }}
            />
          </Dropdown>
        </CardHeader>
        <CardBody className="py-4">
          <div className="flex items-center gap-2 mb-4">
            <Chip
              color={
                category === "Blood Drive"
                  ? "danger"
                  : category === "Training"
                    ? "success"
                    : "default" // Fallback to default when not Blood Drive or Training
              }
              className={
                category === "Advocacy" ? "bg-blue-100 text-blue-500" : ""
              }
              radius="sm"
              size="sm"
              variant="flat"
            >
              {category}
            </Chip>
            <Chip
              color={
                status === "Approved"
                  ? "success"
                  : status === "Pending"
                    ? "warning"
                    : "danger"
              }
              radius="sm"
              size="sm"
              variant="flat"
            >
              {status}
            </Chip>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs">Province</p>
              <p className="text-xs text-default-800 font-medium">
                {resolvedGeo?.province || "N/A"}
              </p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs">District</p>
              <p className="text-xs text-default-800 font-medium">
                {resolvedGeo?.district || district}
              </p>
            </div>
            <div className="flex justify-between items-start">
              <p className="text-xs mt-1">Location</p>
              <p className="text-xs text-default-800 font-medium text-right max-w-[70%]">
                {location}
              </p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs">Date</p>
              <p className="text-xs text-default-800 font-medium text-right">
                {cardDateRange || "—"}
              </p>
            </div>
          </div>
        </CardBody>
        <CardFooter className="pt-4 flex-col items-stretch gap-3">
          <div className="h-px w-full bg-default-200"></div>
          <div className="flex justify-between w-full items-center">
            <span className="text-xs">{goalInfo?.mainLabel || "Goal Count"}</span>
            <span
              className={`text-2xl font-bold ${
                goalInfo?.isBlood ? "text-danger" : "text-default-800"
              }`}
            >
              {goalInfo?.count !== null && goalInfo?.count !== undefined
                ? goalInfo.count
                : "N/A"}
              {goalInfo && goalInfo.count !== null ? (
                goalInfo.isBlood ? (
                  <span className="text-xs font-normal ml-2">{goalInfo.label}</span>
                ) : (
                  <span className="text-xs font-normal ml-2">{goalInfo.label}</span>
                )
              ) : null}
            </span>
          </div>
        </CardFooter>
      </Card>

      {/* View Request Modal (unified request details + role/stage-specific actions) */}
      <Modal
        isOpen={viewOpen}
        placement="center"
        size="lg"
        onClose={() => {
          setViewOpen(false);
          setFullRequest(null);
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Avatar
                className="bg-default-100 border-1 border-default"
                icon={<FileText />}
              />
            </div>
            <h3 className="text-sm font-semibold py-2">Request Details</h3>
            <p className="text-xs font-normal">
              Review the details of this request below.
            </p>
          </ModalHeader>
          <ModalBody className="py-4">
            {(() => {
              const r = resolvedRequest || {};
              const reviewSummary =
                r?.reviewSummary ||
                r?.ReviewSummary ||
                r?.reviewMessage ||
                r?.event?.reviewSummary ||
                r?.event?.reviewMessage ||
                null;

              // Admin/coordinator decisions and reschedule proposals are attached
              // to `decisionSummary` by the backend. Prefer showing either the
              // original review message or the decision summary (or both).
              const decisionSummary =
                r?.decisionSummary ||
                r?.DecisionSummary ||
                r?.event?.decisionSummary ||
                null;

              // Treat as rejected when the status contains 'reject' or 'rejected'
              const statusRaw = String(r?.Status || r?.status || "");
              const isRejected = /reject(ed)?/i.test(statusRaw);

              // Try to infer who performed the decision (actor) for display
              const actorNameOrRole =
                r?.decision?.actor?.name ||
                r?.Decision?.actor?.name ||
                r?.decision?.actor?.role ||
                r?.Decision?.actor?.role ||
                r?.reviewer?.name ||
                r?.reviewer?.role ||
                r?.reviewerName ||
                r?.ReviewerName ||
                null;

              const actorLabel = actorNameOrRole
                ? String(actorNameOrRole)
                : null;

              // Build a sensible fallback note when `decisionSummary` is absent
              const fallbackNoteCandidates = [
                r?.decisionSummary,
                r?.DecisionSummary,
                r?.AdminNote,
                r?.adminNote,
                r?.Admin_Notes,
                r?.ReviewerNotes,
                r?.reviewerNotes,
                r?.rescheduleProposal?.reviewerNotes,
                r?.rescheduleProposal?.proposedBy?.notes,
                r?.DecisionNote,
                r?.decisionNote,
              ];

              const composedFallbackNote = (() => {
                for (const c of fallbackNoteCandidates) {
                  if (c !== undefined && c !== null && String(c).trim() !== "")
                    return String(c);
                }
                return null;
              })();

              const noteText =
                decisionSummary ||
                composedFallbackNote ||
                reviewSummary ||
                null;

              if (!reviewSummary && !decisionSummary) return null;

              // helper to pick first available field from candidates
              const pick = (...cands: any[]) => {
                for (const c of cands) {
                  if (c !== undefined && c !== null && c !== "") return c;
                }
                return null;
              };

              const requestedDateRaw = pick(
                r?.RequestedDate,
                r?.Date,
                r?.requestedDate,
                r?.event?.Start_Date,
                r?.event?.Start,
                null,
              );

              let startRaw = pick(
                r?.StartTime,
                r?.Start,
                r?.start,
                r?.event?.Start,
                r?.event?.Start_Time,
                null,
              );
              let endRaw = pick(
                r?.EndTime,
                r?.End,
                r?.end,
                r?.event?.End,
                null,
              );

              // If time fields are missing, try to parse them from the message (e.g. "from 08:00–16:00")
              if (!startRaw) {
                const timeMatch = String(reviewSummary).match(
                  /from\s+(\d{1,2}:\d{2})(?:\s*[–-]\s*(\d{1,2}:\d{2}))?/i,
                );
                if (timeMatch) {
                  startRaw = timeMatch[1];
                  if (timeMatch[2]) endRaw = timeMatch[2];
                }
              }

              // If date missing, attempt to extract an ISO date like 2025-12-22 from the message
              let inferredDate = requestedDateRaw;
              if (!inferredDate) {
                const dateMatch =
                  String(reviewSummary).match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) inferredDate = dateMatch[1];
              }

              const formatTime = (t?: any) => {
                if (!t) return "";
                try {
                  let d = new Date(t);
                  if (isNaN(d.getTime()) && inferredDate) {
                    d = new Date(`${inferredDate}T${t}`);
                  }
                  if (isNaN(d.getTime())) return String(t);
                  return d.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                } catch (e) {
                  return String(t);
                }
              };

              const dateDisplay = formatDate(inferredDate as any);
              const timeDisplay = startRaw
                ? `${formatTime(startRaw)}${endRaw ? " - " + formatTime(endRaw) : ""}`
                : "";

              // Additional fields to display if present
              const requester =
                pick(
                  r?.createdByName,
                  r?.RequesterName,
                  r?.First_Name,
                  r?.first_name,
                  r?.Requester,
                  r?.requesterName,
                ) || "—";

              // Prefer resolved geo names fetched when opening the modal
              let districtVal = resolvedGeo?.district || null;
              let provinceVal = resolvedGeo?.province || null;
              let municipalityVal =
                pick(r?.municipality, r?.Municipality, r?.MunicipalityName) ||
                null;
              let locationVal =
                pick(r?.Location, r?.location, r?.Venue, r?.venue) || null;
              const eventType =
                pick(
                  r?.Event_Type,
                  r?.eventType,
                  r?.Category,
                  r?.category,
                  r?.event?.Category,
                ) || "—";

              // If location is still missing, try to parse it from the message (e.g. "Located at XYZ")
              if (!locationVal) {
                const locMatch = String(reviewSummary).match(
                  /Located at\s+([^\.\n,]+)/i,
                );
                if (locMatch && locMatch[1]) {
                  locationVal = locMatch[1].trim();
                }
              }

              // Fallback to dash when unresolved
              districtVal = districtVal || "—";
              provinceVal = provinceVal || "—";
              municipalityVal = municipalityVal || "—";
              locationVal = locationVal || "—";

                          // Helper to format date/time for the card: "Dec 1 8:00 AM - 4:00 PM"
                          const formatDateShort = (d?: any) => {
                            if (!d) return null;
                            try {
                              const dt = new Date(d);
                              if (isNaN(dt.getTime())) return String(d);
                              return dt.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              });
                            } catch (e) {
                              return String(d);
                            }
                          };

                          const formatTimeShort = (t?: any) => {
                            if (!t) return null;
                            try {
                              const dt = new Date(t);
                              if (isNaN(dt.getTime())) return String(t);
                              return dt.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              });
                            } catch (e) {
                              return String(t);
                            }
                          };

                          const startVal = pick(
                            r?.Start_Date,
                            r?.Start,
                            r?.start,
                            r?.StartTime,
                            r?.event?.Start_Date,
                            r?.event?.Start,
                            null,
                          );

                          const endVal = pick(
                            r?.End_Date,
                            r?.End,
                            r?.end,
                            r?.EndTime,
                            r?.event?.End_Date,
                            r?.event?.End,
                            null,
                          );

                          const startDateShort = formatDateShort(startVal);
                          const startTimeShort = formatTimeShort(startVal);
                          const endTimeShort = formatTimeShort(endVal);

              return (
                <div className="space-y-3 mb-4">
                  <div className="p-4 border border-default-200 rounded-lg bg-default-50">
                    {/* Prefer showing the backend decision summary (includes admin/coordinator note)
                        when present — replace the original request message for reschedule/reject flows. */}
                    {isRejected ? (
                      <>
                        <p className="text-xs font-semibold text-default-900 mb-2">
                          Rejected
                        </p>
                        <p className="text-xs text-default-800 whitespace-pre-line">
                          {decisionSummary || reviewSummary}
                        </p>
                      </>
                    ) : decisionSummary ? (
                      <>
                        <p className="text-xs font-semibold text-default-900 mb-2">
                          Decision Note
                        </p>
                        <p className="text-xs text-default-800 whitespace-pre-line">
                          {decisionSummary}
                        </p>
                      </>
                    ) : reviewSummary ? (
                      <>
                        <p className="text-xs font-semibold text-default-900 mb-2">
                          Request Message
                        </p>
                        <p className="text-xs text-default-800 whitespace-pre-line">
                          {reviewSummary}
                        </p>
                      </>
                    ) : null}

                    <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-default-700 font-semibold">
                          Requester
                        </p>
                        <p className="text-default-800 font-medium">
                          {requester}
                        </p>

                        <p className="mt-3 text-default-700 font-semibold">
                          Province
                        </p>
                        <p className="text-default-800">{provinceVal}</p>

                        <p className="mt-3 text-default-700 font-semibold">
                          District
                        </p>
                        <p className="text-default-800">{districtVal}</p>

                        <p className="mt-3 text-default-700 font-semibold">
                          Municipality
                        </p>
                        <p className="text-default-800">{municipalityVal}</p>
                      </div>

                      <div>
                        <p className="text-default-700 font-semibold">Date</p>
                        <p className="text-default-800 font-medium">
                          {dateDisplay}
                        </p>

                        <p className="mt-3 text-default-700 font-semibold">
                          Time
                        </p>
                        <p className="text-default-800">{timeDisplay || "—"}</p>

                        <p className="mt-3 text-default-700 font-semibold">
                          Location
                        </p>
                        <p className="text-default-800">{locationVal}</p>

                        <p className="mt-3 text-default-700 font-semibold">
                          Event Type
                        </p>
                        <p className="text-default-800">{eventType}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Reduced details: only request message is shown above. */}
          </ModalBody>
          <ModalFooter>
            {(() => {
              const dynamicFooter = renderFooterActionsFromAllowed();
              if (dynamicFooter) return dynamicFooter;

              return (
                <Button variant="bordered" onPress={() => setViewOpen(false)}>
                  Close
                </Button>
              );
            })()}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <RescheduleModal
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        currentDate={date}
        onConfirm={handleRescheduleConfirm}
      />

      {/* Manage Staff Dialog (shared component) */}
      <ManageStaffModal
        eventId={
          request?.Event_ID || (request?.event && request.event.Event_ID)
        }
        isOpen={manageStaffOpen}
        request={request}
        requestId={request?.Request_ID}
        onClose={() => setManageStaffOpen(false)}
        onSaved={async () => {
          // onSaved hook: you can refresh data here if needed
        }}
      />

      <ConfirmModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Event"
        message="Are you sure you want to cancel this event? This action cannot be undone. Please provide a reason for cancellation."
        confirmText="Cancel Event"
        onConfirm={async (note?: string) => await handleCancelWithNote(note)}
        requireNote={true}
        color="danger"
      />

      <ConfirmModal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Event"
        message="Provide a reason for rejecting this event. This will be shown to the requester."
        confirmText="Reject"
        onConfirm={async (note?: string) => await handleRejectWithNote(note)}
        requireNote={true}
      />

      <ConfirmModal
        isOpen={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        title="Accept Event"
        message="Are you sure you want to accept this event?"
        confirmText="Accept"
        onConfirm={async (note?: string) => await handleAccept(note)}
        requireNote={false}
      />

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Request"
        message="Are you sure you want to delete this request? This action cannot be undone."
        confirmText="Delete"
        onConfirm={async () => await handleDelete()}
        requireNote={false}
        color="danger"
      />

      {/* Success Modal */}
      <Modal
        isOpen={successModal}
        placement="center"
        size="sm"
        onClose={() => setSuccessModal(false)}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Avatar
                className="border-1"
                icon={<Check className="w-4 h-4" />}
              />
            </div>
            <h3 className="text-sm font-semibold py-2">Success</h3>
            <p className="text-xs font-normal">Request deleted successfully.</p>
          </ModalHeader>
          <ModalBody className="py-4"></ModalBody>
          <ModalFooter>
            <Button
              className="bg-black text-white font-medium"
              color="default"
              onPress={() => setSuccessModal(false)}
            >
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default EventCard;
