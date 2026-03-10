"use client";

import React from "react";
import { Button } from "@heroui/button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Tabs, Tab } from "@heroui/tabs";
import { Input } from "@heroui/input";
import { ArrowDownToLine, Funnel, Plus } from "@gravity-ui/icons";

interface InventoryToolbarProps {
  activeTab: string;
  onTabChange: (key: string) => void;
}

export default function InventoryToolbar({
  activeTab,
  onTabChange,
}: InventoryToolbarProps) {
  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          aria-label="Inventory filters"
          selectedKey={activeTab}
          onSelectionChange={(key) => onTabChange(String(key))}
          className="w-fit"
          radius="full"
          size="sm"
        >
          <Tab key="all" title="All" />
          <Tab key="in-range" title="In Range" />
          <Tab key="out-of-range" title="Out of Range" />
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="bordered"
            size="sm"
            className="gap-2"
            startContent={<ArrowDownToLine className="h-4 w-4" />}
          >
            Export
          </Button>

          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="bordered"
                size="sm"
                className="gap-2"
                endContent={<Funnel className="h-4 w-4" />}
              >
                Quick Filter
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Quick filter">
              <DropdownItem key="all">All Locations</DropdownItem>
              <DropdownItem key="in-range">Only In Range</DropdownItem>
              <DropdownItem key="out-of-range">Only Out of Range</DropdownItem>
            </DropdownMenu>
          </Dropdown>

          <Input
            type="date"
            size="sm"
            className="w-[160px]"
            placeholder="Pick a date"
          />

          <Button
            color="danger"
            size="sm"
            className="gap-2"
            startContent={<Plus className="h-4 w-4" />}
          >
            Add new stock
          </Button>
        </div>
      </div>
    </div>
  );
}
