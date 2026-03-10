"use client";

import React, { useMemo, useState, useEffect } from "react";
import Topbar from "@/components/layout/topbar";
import MobileNav from "@/components/tools/mobile-nav";
import InventoryToolbar from "@/components/inventory/inventory-toolbar";
import InventoryCard from "@/components/inventory/inventory-card";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const INVENTORY_ITEMS = [
  {
    bloodType: "A+",
    status: "out-of-range",
    quantity: 205,
    inventoryId: "Inventory 1234",
    updatedAt: "October 25, 2028",
  },
  {
    bloodType: "A-",
    status: "out-of-range",
    quantity: 205,
    inventoryId: "Inventory 1234",
    updatedAt: "October 25, 2028",
  },
  {
    bloodType: "B+",
    status: "out-of-range",
    quantity: 205,
    inventoryId: "Inventory 1234",
    updatedAt: "October 25, 2028",
  },
  {
    bloodType: "B-",
    status: "out-of-range",
    quantity: 205,
    inventoryId: "Inventory 1234",
    updatedAt: "October 25, 2028",
  },
  {
    bloodType: "AB+",
    status: "in-range",
    quantity: 205,
    inventoryId: "Inventory 1234",
    updatedAt: "October 25, 2028",
  },
  {
    bloodType: "AB-",
    status: "in-range",
    quantity: 205,
    inventoryId: "Inventory 1234",
    updatedAt: "October 25, 2028",
  },
  {
    bloodType: "O+",
    status: "in-range",
    quantity: 205,
    inventoryId: "Inventory 1234",
    updatedAt: "October 25, 2028",
  },
  {
    bloodType: "O-",
    status: "in-range",
    quantity: 205,
    inventoryId: "Inventory 1234",
    updatedAt: "October 25, 2028",
  },
] as const;

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [displayName, setDisplayName] = useState("unite user");
  const [displayEmail, setDisplayEmail] = useState("unite@health.tech");
  const { user: currentUser } = useCurrentUser();

  useEffect(() => {
    if (currentUser) {
      if (currentUser.fullName) {
        setDisplayName(currentUser.fullName);
      } else if (currentUser.firstName || currentUser.lastName) {
        const nameParts = [
          currentUser.firstName,
          currentUser.middleName,
          currentUser.lastName,
        ].filter(Boolean);
        setDisplayName(nameParts.join(" ") || "unite user");
      }
      if (currentUser.email) {
        setDisplayEmail(currentUser.email);
      }
    }
  }, [currentUser]);

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return INVENTORY_ITEMS;
    return INVENTORY_ITEMS.filter((item) => item.status === activeTab);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-white relative">
      <div className="absolute top-4 right-4 md:hidden z-[9999]">
        <MobileNav />
      </div>

      <div className="px-4 sm:px-6 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory</h1>
      </div>

      <Topbar
        userEmail={displayEmail}
        userName={displayName}
        onUserClick={() => {
          // User profile clicked
        }}
      />

      <InventoryToolbar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="px-4 sm:px-6 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <InventoryCard
              key={item.bloodType}
              bloodType={item.bloodType}
              status={item.status}
              quantity={item.quantity}
              inventoryId={item.inventoryId}
              updatedAt={item.updatedAt}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
