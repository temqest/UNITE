"use client";
import React from "react";
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
import { MoreVertical, Eye, Edit, Clock, Trash2, Check, X } from "lucide-react";

interface EventCardProps {
  title: string;
  organization: string;
  organizationType: string;
  district: string;
  category: string;
  status: "Approved" | "Pending" | "Rejected";
  location: string;
  date: string;
  onViewEvent?: () => void;
  onEditEvent?: () => void;
  onRescheduleEvent?: () => void;
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
  const iconClasses = "text-xl text-default-500 pointer-events-none shrink-0";

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
          onPress={onRescheduleEvent}
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
          onPress={onCancelEvent}
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
          onPress={onAcceptEvent}
        >
          Accept Event
        </DropdownItem>
        <DropdownItem
          key="reject"
          description="Reject this event"
          startContent={<X />}
          onPress={onRejectEvent}
        >
          Reject Event
        </DropdownItem>
        <DropdownItem
          key="reschedule"
          description="Reschedule this event"
          startContent={<Clock />}
          onPress={onRescheduleEvent}
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
    <Card className="w-full max-w-md h-60 rounded-xl border border-gray-200 shadow-none bg-white">
      {/* Header Section */}
      <CardHeader className="flex justify-between items-center">
        {/* Avatar Section*/}
        <div className="flex items-center gap-3">
          <Avatar />
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-default-800">{organizationType}</p>
          </div>
        </div>
        {/* Dropdown Section */}
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
      {/* Body Section */}
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
      {/* Footer Section */}
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
  );
};

export default EventCard;
