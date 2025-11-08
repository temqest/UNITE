"use client";

import React, { useState } from "react";
import Topbar from "@/components/topbar";
import CampaignToolbar from "@/components/campaign/campaign-toolbar";
import CampaignCalendar from "@/components/campaign/campaign-calendar";
import EventCard from "@/components/campaign/event-card";

/**
 * Campaign Page Component
 * Main campaign management page with topbar, toolbar, and content area.
 */

export default function CampaignPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    console.log('Selected date:', date.toLocaleDateString());
  };
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  
  // Sample event data
  const events = [
    {
      title: "Lifesavers Blood Drive",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Blood Drive",
      status: "Rejected" as const,
      location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Camarines Sur, Philippines",
      date: "Nov 12, 2025 08:00 - 05:00 AM"
    },
    {
      title: "Lifesavers Training",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Training",
      status: "Pending" as const,
      location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Camarines Sur, Philippines",
      date: "Nov 12, 2025 08:00 AM"
    },
    {
      title: "Lifesavers Advocacy",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Advocacy",
      status: "Approved" as const,
      location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Sur, Philippines",
      date: "Nov 12, 2025 08:00 AM"
    },
    {
      title: "Lifesavers Advocacy",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Advocacy",
      status: "Approved" as const,
      location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Sur, Philippines",
      date: "Nov 12, 2025 08:00 AM"
    },
    {
      title: "Lifesavers Advocacy",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Advocacy",
      status: "Approved" as const,
      location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Sur, Philippines",
      date: "Nov 12, 2025 08:00 AM"
    },
  ];
  
  // Handler for search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    console.log("Searching for:", query);
  };
  
  // Handler for user profile click
  const handleUserClick = () => {
    console.log("User profile clicked");
  };
  
  // Handler for tab changes
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    console.log("Tab changed to:", tab);
  };
  
  // Handler for export action
  const handleExport = () => {
    console.log("Exporting data...");
  };
  
  // Handler for quick filter
  const handleQuickFilter = () => {
    console.log("Opening quick filter...");
  };
  
  // Handler for advanced filter
  const handleAdvancedFilter = () => {
    console.log("Opening advanced filter...");
  };
  
  // Handler for create event
  const handleCreateEvent = () => {
    console.log("Creating new event...");
  };
  
  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Campaign</h1>
      </div>
  
      {/* Topbar Component */}
      <Topbar
        userName="Bicol Medical Center"
        userEmail="bmc@gmail.com"
        onSearch={handleSearch}
        onUserClick={handleUserClick}
      />
  
      {/* Campaign Toolbar Component */}
      <CampaignToolbar
        onExport={handleExport}
        onQuickFilter={handleQuickFilter}
        onAdvancedFilter={handleAdvancedFilter}
        onCreateEvent={handleCreateEvent}
        onTabChange={handleTabChange}
        defaultTab={selectedTab}
      />
  
      {/* Main Content Area */}
      <div className="px-6 py-6 flex gap-4">
        {/* Calendar Section */}
          <CampaignCalendar />
        
        {/* Event Cards Section - Scrollable */}
        <div className="flex-1 h-[calc(106vh-300px)] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4 h-full">
            {events.map((event, index) => (
                <EventCard
                key={index}
                title={event.title}
                organization={event.organization}
                organizationType={event.organizationType}
                district={event.district}
                category={event.category}
                status={event.status}
                location={event.location}
                date={event.date}
                />
            ))}
            </div>
        </div>
      </div>
    </div>
  );
}