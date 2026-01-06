"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  Ticket, 
  Calendar as CalIcon, 
  PersonPlanetEarth, 
  Persons, 
  Bell, 
  Comments,
  Gear, 
  ArrowRightFromSquare,
  Xmark 
} from "@gravity-ui/icons";
import NotificationModal from "@/components/modals/notification-modal";
import SettingsModal from "@/components/modals/settings-modal";
import { getUserInfo } from "@/utils/getUserInfo";
import { fetchJsonWithAuth } from "@/utils/fetchWithAuth";
import { useSidebarNavigation } from "@/hooks/useSidebarNavigation";
import { useRouter } from "next/navigation";

interface MobileNavProps {
  currentUserName?: string;
  currentUserEmail?: string;
}

export default function MobileNav({ currentUserName, currentUserEmail }: MobileNavProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  // --- Data Loading Logic (Kept as provided) ---
  const loadUnreadCount = useCallback(async () => {
    try {
      const stored = getUserInfo();
      const parsed = stored.raw || null;
      let recipientId: string | null = null;

      if (parsed) {
        recipientId =
          parsed?.Coordinator_ID || parsed?.CoordinatorId || parsed?.coordinator_id || parsed?.coordinatorId ||
          parsed?.Stakeholder_ID || parsed?.StakeholderId || parsed?.stakeholder_id || parsed?.stakeholderId ||
          parsed?.id || parsed?.ID || parsed?.user_id || parsed?.user?.id || null;
      }

      let recipientType = "Coordinator";
      if (stored.isAdmin) {
        recipientType = "Admin";
      } else if (parsed) {
        const roleLower = (stored.role || "").toLowerCase();
        const hasStakeholderId = !!(parsed?.Stakeholder_ID || parsed?.StakeholderId || parsed?.stakeholder_id || parsed?.stakeholderId);
        const hasCoordinatorId = !!(parsed?.Coordinator_ID || parsed?.CoordinatorId || parsed?.coordinator_id || parsed?.coordinatorId);

        if (hasStakeholderId || roleLower.includes("stakeholder")) recipientType = "Stakeholder";
        else if (hasCoordinatorId || roleLower.includes("coordinator")) recipientType = "Coordinator";
      }

      if (!recipientId) return;

      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      const params = new URLSearchParams({ recipientId: String(recipientId), recipientType });
      const url = base ? `${base}/api/notifications/unread-count?${params.toString()}` : `/api/notifications/unread-count?${params.toString()}`;

      const body: any = await fetchJsonWithAuth(url).catch(() => ({}));
      const count = (body?.data && body.data.unread_count) || body?.unread_count || 0;
      setUnreadCount(Number(count));
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const id = setInterval(() => loadUnreadCount(), 30000);
    const onRefresh = () => loadUnreadCount();
    const onRead = (e: any) => {
      if (e.detail && typeof e.detail.unread === "number") setUnreadCount(e.detail.unread);
      else loadUnreadCount();
    };

    window.addEventListener("unite:request-refresh-notifications", onRefresh);
    window.addEventListener("unite:notifications-read", onRead);
    return () => {
      clearInterval(id);
      window.removeEventListener("unite:request-refresh-notifications", onRefresh);
      window.removeEventListener("unite:notifications-read", onRead);
    };
  }, [loadUnreadCount]);

  const router = useRouter();

  const handleLogout = () => {
    try {
      localStorage.removeItem("unite_token");
      sessionStorage.removeItem("unite_token");
    } catch (e) {
      // ignore storage errors
    }

    // Close panels and navigate to landing
    setMobileNavOpen(false);
    setNotifOpen(false);
    setIsSettingsOpen(false);
    router.push("/");
  };

  // --- User Info Parsing ---
  const _info = getUserInfo();
  const _raw = (_info && (_info.raw || _info)) || {};
  
  const firstName = ((_raw.First_Name || _raw.FirstName || _raw.first_name || _raw.firstName || _raw.First || _raw.first) as string) || "";
  const lastName = ((_raw.Last_Name || _raw.LastName || _raw.last_name || _raw.lastName || _raw.Last || _raw.last) as string) || "";
  
  const derivedName = [firstName, lastName].filter(Boolean).join(" ");
  const fallbackName = ((_raw.name || _raw.Name || _raw.full_name || _raw.FullName) as string) || "";
  const userName = currentUserName || derivedName || fallbackName || "User";
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const userEmail = currentUserEmail || ((_raw.Email || _raw.email || _info?.email) as string) || "";

  // --- Permission-based visibility (use same hook as Sidebar) ---
  const { menuItems } = useSidebarNavigation();

  const showCoordinatorLink = Boolean(
    (menuItems || []).some(
      (item: any) => item.id === "coordinator-management" && item.visible,
    ),
  );

  const showStakeholderLink = Boolean(
    (menuItems || []).some(
      (item: any) => item.id === "stakeholder-management" && item.visible,
    ),
  );

  // --- Prevent scrolling when drawer is open ---
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  return (
    <>
      {/* Top Navbar Actions */}
      <div className="flex items-center gap-1 md:hidden">
        {/* Notification Bell */}
        <button
          aria-label="Open notifications"
          className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
          onClick={() => setNotifOpen(true)}
        >
          <Bell className="w-5 h-5 text-gray-700" />
          {unreadCount !== null && unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 99 ? "99" : unreadCount}
            </span>
          )}
        </button>

        {/* Hamburger Menu */}
        <button
          aria-label="Open navigation"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
          onClick={() => setMobileNavOpen(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Drawer Overlay Backdrop */}
      <div
        className={`fixed inset-0 z-[99990] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          mobileNavOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[99999] w-[85%] max-w-[320px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          mobileNavOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header: User Profile */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm shrink-0 shadow-sm">
              {userInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">{userName}</span>
              <span className="text-xs text-gray-500 truncate">{userEmail}</span>
            </div>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="p-2 text-gray-500 rounded-full hover:bg-gray-200 transition-colors shrink-0"
            aria-label="Close menu"
          >
            <Xmark className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          
          {/* Main Navigation */}
          <section>
            <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Menu
            </div>
            <div className="space-y-1">
              <NavItem href="/dashboard/campaign" icon={<Ticket />} label="Campaign" />
              <NavItem href="/dashboard/calendar" icon={<CalIcon />} label="Calendar" />
              <NavItem href="/dashboard/chat" icon={<Comments />} label="Chat" />
            </div>
          </section>

          {/* Management Section (Conditional) */}
          {(showStakeholderLink || showCoordinatorLink) && (
            <section>
              <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Management
              </div>
              <div className="space-y-1">
                {showStakeholderLink && (
                  <NavItem href="/dashboard/stakeholder-management" icon={<PersonPlanetEarth />} label="Stakeholders" />
                )}
                {showCoordinatorLink && (
                  <NavItem href="/dashboard/coordinator-management" icon={<Persons />} label="Coordinators" />
                )}
              </div>
            </section>
          )}
        </div>

        {/* Drawer Footer: System Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => {
              setMobileNavOpen(false);
              setIsSettingsOpen(true);
            }}
            className="flex w-full items-center gap-3 p-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Gear className="w-5 h-5" />
            Settings
          </button>
          
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 p-3 mt-1 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors text-left"
          >
            <ArrowRightFromSquare className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      <NotificationModal isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}

// --- Helper Components ---

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function NavItem({ href, icon, label, badge }: NavItemProps) {
  return (
    <a
      href={href}
      className="group flex items-center justify-between w-full p-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all"
    >
      <div className="flex items-center gap-3">
        <span className="text-gray-500 group-hover:text-gray-900 transition-colors">
          {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
        </span>
        {label}
      </div>
      {badge ? (
        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </a>
  );
}