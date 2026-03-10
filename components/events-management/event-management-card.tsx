"use client";

import React from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Calendar, GeoPin, Clock } from "@gravity-ui/icons";

interface EventManagementCardProps {
  title: string;
  category: string;
  location: string;
  startDate: Date | null;
  endDate: Date | null;
  status: "upcoming" | "ongoing" | "completed";
}

const STATUS_STYLES = {
  upcoming: {
    label: "Upcoming",
    chip: "bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
  ongoing: {
    label: "Ongoing",
    chip: "bg-green-50 text-green-700",
    dot: "bg-green-500",
  },
  completed: {
    label: "Completed",
    chip: "bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
  },
};

const formatDateTime = (value: Date | null) => {
  if (!value) return "—";
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function EventManagementCard({
  title,
  category,
  location,
  startDate,
  endDate,
  status,
}: EventManagementCardProps) {
  const styles = STATUS_STYLES[status];

  return (
    <Card className="rounded-2xl border border-gray-200 shadow-sm">
      <CardHeader className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">Approved Event</p>
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {title}
          </h3>
        </div>
        <Chip className={`h-6 px-2 text-xs font-medium ${styles.chip}`}>
          <span className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
            {styles.label}
          </span>
        </Chip>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-gray-600">
            {category}
          </span>
          <span className="inline-flex items-center gap-1">
            <GeoPin className="h-3.5 w-3.5" />
            {location || "Location to be determined"}
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-1 text-sm text-gray-700">
          <div className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{formatDateTime(startDate)}</span>
          </div>
          {endDate && (
            <div className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{formatDateTime(endDate)}</span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
