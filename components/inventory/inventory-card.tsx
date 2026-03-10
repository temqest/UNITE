"use client";

import React from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";

interface InventoryCardProps {
  bloodType: string;
  status: "in-range" | "out-of-range";
  quantity: number;
  inventoryId: string;
  updatedAt: string;
}

const STATUS_STYLES = {
  "in-range": {
    label: "In Range",
    chip: "bg-green-50 text-green-700",
    dot: "bg-green-500",
    value: "text-green-600",
  },
  "out-of-range": {
    label: "Out of Range",
    chip: "bg-red-50 text-red-600",
    dot: "bg-red-500",
    value: "text-red-500",
  },
};

export default function InventoryCard({
  bloodType,
  status,
  quantity,
  inventoryId,
  updatedAt,
}: InventoryCardProps) {
  const styles = STATUS_STYLES[status];

  return (
    <Card className="rounded-2xl border border-gray-200 shadow-sm">
      <CardHeader className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{bloodType}</h3>
        <Chip className={`h-6 px-2 text-xs font-medium ${styles.chip}`}>
          <span className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
            {styles.label}
          </span>
        </Chip>
      </CardHeader>
      <CardBody className="pt-2">
        <p className="text-xs text-gray-500">Quantity</p>
        <div className="mt-2 flex items-end justify-between">
          <span className={`text-2xl font-semibold ${styles.value}`}>
            {quantity}
          </span>
          <span className="text-xs text-gray-400">u.</span>
        </div>
      </CardBody>
      <CardFooter className="flex flex-col items-start gap-2 text-xs text-gray-500">
        <div className="flex w-full items-center justify-between">
          <span>Inventory ID</span>
          <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
            {inventoryId}
          </span>
        </div>
        <div className="flex w-full items-center justify-between">
          <span>Last Updated</span>
          <span className="text-gray-700">{updatedAt}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
