"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { MoreVertical, Eye, Edit, Clock, Trash2, Check, X } from "lucide-react";

interface EventCardProps {
  title: string;
  organization: string;
  organizationType: string;
  district: string;
  category: string;
  status: "Approved" | "Pending" | "Rejected" | "Cancelled";
  location: string;
  date: string;
  onViewEvent?: () => void;
  onEditEvent?: () => void;
  onRescheduleEvent?: (startDate: string, endDate: string) => void;
  onCancelEvent?: () => void;
  onAcceptEvent?: () => void;
  onRejectEvent?: () => void;
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
  onCancelEvent,
  onAcceptEvent,
  onRejectEvent,
}) => {
  // Dialog state management
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);

  // Reschedule dialog state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleReschedule = () => {
    if (startDate && endDate && onRescheduleEvent) {
      onRescheduleEvent(startDate, endDate);
      setRescheduleOpen(false);
      setStartDate("");
      setEndDate("");
    }
  };

  const handleCancel = () => {
    if (onCancelEvent) {
      onCancelEvent();
    }
    setCancelOpen(false);
  };

  const handleReject = () => {
    if (onRejectEvent) {
      onRejectEvent();
    }
    setRejectOpen(false);
  };

  const handleAccept = () => {
    if (onAcceptEvent) {
      onAcceptEvent();
    }
    setAcceptOpen(false);
  };

  // Menu for Approved status
  const approvedMenu = (
    <DropdownMenu aria-label="Event actions menu" variant="faded">
      <DropdownSection showDivider title="Actions">
        <DropdownItem
          key="view"
          description="View this event"
          startContent={<Eye />}
          onPress={onViewEvent}
        >
          View Event
        </DropdownItem>
        <DropdownItem
          key="edit"
          description="Edit an event"
          startContent={<Edit />}
          onPress={onEditEvent}
        >
          Edit Event
        </DropdownItem>
        <DropdownItem
          key="reschedule"
          description="Reschedule this event"
          startContent={<Clock />}
          onPress={() => setRescheduleOpen(true)}
        >
          Reschedule Event
        </DropdownItem>
      </DropdownSection>
      <DropdownSection title="Danger zone">
        <DropdownItem
          key="cancel"
          className="text-danger"
          color="danger"
          description="Cancel an event"
          shortcut="⌘ D"
          startContent={<Trash2 className="text-xl text-danger pointer-events-none shrink-0" />}
          onPress={() => setCancelOpen(true)}
        >
          Cancel
        </DropdownItem>
      </DropdownSection>
    </DropdownMenu>
  );

  // Menu for Pending status
  const pendingMenu = (
    <DropdownMenu aria-label="Event actions menu" variant="faded">
      <DropdownSection title="Actions">
        <DropdownItem
          key="view"
          description="View this event"
          startContent={<Eye />}
          onPress={onViewEvent}
        >
          View Event
        </DropdownItem>
        <DropdownItem
          key="accept"
          description="Accept this event"
          startContent={<Check />}
          onPress={() => setAcceptOpen(true)}
        >
          Accept Event
        </DropdownItem>
        <DropdownItem
          key="reject"
          description="Reject this event"
          startContent={<X />}
          onPress={() => setRejectOpen(true)}
        >
          Reject Event
        </DropdownItem>
        <DropdownItem
          key="reschedule"
          description="Reschedule this event"
          startContent={<Clock />}
          onPress={() => setRescheduleOpen(true)}
        >
          Reschedule Event
        </DropdownItem>
      </DropdownSection>
    </DropdownMenu>
  );

  // Default menu for Rejected or other statuses
  const defaultMenu = (
    <DropdownMenu aria-label="Event actions menu" variant="faded">
      <DropdownSection title="Actions">
        <DropdownItem
          key="view"
          description="View this event"
          startContent={<Eye />}
          onPress={onViewEvent}
        >
          View Event
        </DropdownItem>
      </DropdownSection>
    </DropdownMenu>
  );

  // Determine which menu to show based on status
  const getMenuByStatus = () => {
    if (status === "Approved") {
      return approvedMenu;
    } else if (status === "Pending") {
      return pendingMenu;
    }
    return defaultMenu;
  };

  return (
    <>
      <Card className="w-full max-w-md h-60 rounded-xl border border-gray-200 shadow-none bg-white">
        <CardHeader className="flex justify-between items-center">
          {/* Avatar Section*/}
          <div className="flex items-center gap-3">
            <Avatar />
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="text-xs text-default-800">{organizationType}</p>
            </div>
          </div>
          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                className="hover:text-default-800"
                aria-label="Event actions"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownTrigger>
            {getMenuByStatus()}
          </Dropdown>
        </CardHeader>
        <CardBody>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs">District</p>
            <p className="text-xs text-default-800 font-medium">{district}</p>
          </div>
          <div className="flex items-center gap-3">
            <Chip color="primary" variant="faded" size="sm" radius="sm">
              {category}
            </Chip>
            <Chip
              size="sm"
              variant="flat"
              radius="sm"
              color={
                status === "Approved"
                  ? "success"
                  : status === "Pending"
                  ? "warning"
                  : "danger"
              }
            >
              {status}
            </Chip>
          </div>
        </CardBody>
        <CardFooter className="flex flex-col items-start gap-2 text-xs">
          <div className="flex justify-between w-full">
            <span className="">Location</span>
            <span className="text-default-800 text-right">{location}</span>
          </div>
          <div className="flex justify-between w-full">
            <span className="">Date</span>
            <span className="text-default-800">{date}</span>
          </div>
        </CardFooter>
      </Card>

      {/* Reschedule Dialog */}
      <Modal isOpen={rescheduleOpen} onClose={() => setRescheduleOpen(false)} size="md" placement="center">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-default-100">
              <Clock className="w-5 h-5 text-default-600" />
            </div>
            <span className="text-lg font-semibold">Reschedule Event</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600 mb-4">
              Select new dates for this event.
            </p>
            
            {/* Start Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-default-900">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-default-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* End Date Picker */}
            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium text-default-900">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-default-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              onPress={() => setRescheduleOpen(false)}
              className="font-medium"
            >
              Cancel
            </Button>
            <Button
              color="default"
              onPress={handleReschedule}
              className="bg-black text-white font-medium"
              isDisabled={!startDate || !endDate}
            >
              Reschedule
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Cancel Dialog */}
      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} size="md" placement="center">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-danger-50">
              <Trash2 className="w-5 h-5 text-danger-500" />
            </div>
            <span className="text-lg font-semibold">Cancel Event</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Are you sure you want to cancel this event? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              onPress={() => setCancelOpen(false)}
              className="font-medium"
            >
              Go Back
            </Button>
            <Button
              color="danger"
              onPress={handleCancel}
              className="font-medium"
            >
              Cancel Event
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reject Dialog */}
      <Modal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} size="md" placement="center">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-default-100">
              <X className="w-5 h-5 text-default-600" />
            </div>
            <span className="text-lg font-semibold">Reject Event</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Are you sure you want to reject this event? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              onPress={() => setRejectOpen(false)}
              className="font-medium"
            >
              Cancel
            </Button>
            <Button
              color="default"
              onPress={handleReject}
              className="bg-black text-white font-medium"
            >
              Reject
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Accept Dialog */}
      <Modal isOpen={acceptOpen} onClose={() => setAcceptOpen(false)} size="md" placement="center">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success-50">
              <Check className="w-5 h-5 text-success-500" />
            </div>
            <span className="text-lg font-semibold">Accept Event</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Are you sure you want to accept this event?
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              onPress={() => setAcceptOpen(false)}
              className="font-medium"
            >
              Cancel
            </Button>
            <Button
              color="default"
              onPress={handleAccept}
              className="bg-black text-white font-medium"
            >
              Accept
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default EventCard;