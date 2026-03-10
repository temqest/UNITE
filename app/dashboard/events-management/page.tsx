"use client";

import React, { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/topbar";
import MobileNav from "@/components/tools/mobile-nav";
import EventManagementCard from "@/components/events-management/event-management-card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { parseServerDate } from "@/components/calendar/calendar-event-utils";
import { formatEventSummary } from "@/utils/eventFormatting";
import { Tabs, Tab } from "@heroui/tabs";

const getCategoryLabel = (category?: string) => {
  if (!category) return "Event";
  const normalized = category.toString().toLowerCase();
  if (normalized.includes("blood")) return "Blood Drive";
  if (normalized.includes("training")) return "Training";
  if (normalized.includes("advocacy")) return "Advocacy";
  return category;
};

const getEventTitle = (event: any) => {
  return String(event.Event_Title || event.title || event.Title || "Event");
};

const resolveEventStatus = (startDate: Date | null, endDate: Date | null) => {
  const now = new Date();
  if (endDate && endDate.getTime() < now.getTime()) return "completed";
  if (startDate && startDate.getTime() <= now.getTime()) return "ongoing";
  return "upcoming";
};

const getDateRangeQuery = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 90);
  const end = new Date(now);
  end.setDate(end.getDate() + 180);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

export default function EventsManagementPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const { start, end } = getDateRangeQuery();
        const response = await fetchWithAuth(
          `/api/events/all?date_from=${encodeURIComponent(start)}&date_to=${encodeURIComponent(end)}`,
          { method: "GET" },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body?.success === false) {
          throw new Error(body?.message || "Failed to load events");
        }
        setEvents(Array.isArray(body?.data) ? body.data : []);
      } catch (err: any) {
        setError(err?.message || "Failed to load events");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const groupedEvents = useMemo(() => {
    const buckets = {
      upcoming: [] as any[],
      ongoing: [] as any[],
      completed: [] as any[],
    };

    events.forEach((event) => {
      const startDate = parseServerDate(event.Start_Date || event.startDate);
      const endDate = parseServerDate(event.End_Date || event.endDate);
      const status = resolveEventStatus(startDate, endDate);
      buckets[status].push({ event, startDate, endDate });
    });

    (Object.keys(buckets) as Array<keyof typeof buckets>).forEach((key) => {
      buckets[key].sort((a, b) => {
        const aTime = a.startDate ? a.startDate.getTime() : 0;
        const bTime = b.startDate ? b.startDate.getTime() : 0;
        return aTime - bTime;
      });
    });

    return buckets;
  }, [events]);

  const renderSection = (
    title: string,
    items: Array<{ event: any; startDate: Date | null; endDate: Date | null }>,
    status: "upcoming" | "ongoing" | "completed",
  ) => {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <span className="text-xs text-gray-500">{items.length} events</span>
        </div>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
            No events in this group yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map(({ event, startDate, endDate }) => {
              const summary = formatEventSummary(event, {
                showBloodCount: false,
              });
              return (
                <EventManagementCard
                  key={String(event.Event_ID || event.EventId || event.id || summary.title)}
                  title={getEventTitle(event)}
                  category={getCategoryLabel(summary.eventType || event.Category)}
                  location={summary.location || ""}
                  startDate={startDate}
                  endDate={endDate}
                  status={status}
                />
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-white relative">
      <div className="absolute top-4 right-4 md:hidden z-[9999]">
        <MobileNav />
      </div>

      <div className="px-4 sm:px-6 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          Events Management
        </h1>
      </div>

      <Topbar
        userEmail={displayEmail}
        userName={displayName}
        onUserClick={() => {
          // User profile clicked
        }}
      />

      <div className="px-4 sm:px-6 py-6 space-y-8">
        <Tabs
          aria-label="Event status tabs"
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(String(key))}
          className="w-fit"
          radius="full"
          size="sm"
        >
          <Tab key="all" title="All" />
          <Tab key="completed" title="Completed" />
          <Tab key="ongoing" title="Ongoing" />
          <Tab key="upcoming" title="Upcoming" />
        </Tabs>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 p-6 text-sm text-gray-500">
            Loading approved events...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
            {error}
          </div>
        ) : (
          <>
            {activeTab === "all" && (
              <>
                {renderSection("Upcoming", groupedEvents.upcoming, "upcoming")}
                {renderSection("Ongoing", groupedEvents.ongoing, "ongoing")}
                {renderSection(
                  "Completed",
                  groupedEvents.completed,
                  "completed",
                )}
              </>
            )}
            {activeTab === "upcoming" &&
              renderSection("Upcoming", groupedEvents.upcoming, "upcoming")}
            {activeTab === "ongoing" &&
              renderSection("Ongoing", groupedEvents.ongoing, "ongoing")}
            {activeTab === "completed" &&
              renderSection(
                "Completed",
                groupedEvents.completed,
                "completed",
              )}
          </>
        )}
      </div>
    </div>
  );
}
