"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Gear,
  Persons,
  Ticket,
  Bell,
  Comments,
  PersonPlanetEarth,
} from "@gravity-ui/icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { getUserInfo } from "@/utils/getUserInfo";
import { fetchJsonWithAuth } from "@/utils/fetchWithAuth";
import { useSidebarNavigation } from "@/hooks/useSidebarNavigation";

import { debug } from "@/utils/devLogger";
import NotificationModal from "@/components/modals/notification-modal";
import SettingsModal from "@/components/modals/settings-modal";

interface SidebarProps {
  role?: string;
  userInfo?: {
    name?: string;
    email?: string;
  };
}

/**
 * Sidebar UI Component
 * Pure presentation component - receives menuItems from useSidebarNavigation hook
 * All permission logic is handled by useSidebarNavigation hook
 */
export default function Sidebar({
  role,
  userInfo,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { menuItems, loading: navigationLoading } = useSidebarNavigation();

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Prefer the `userInfo` prop when provided (it may be passed from the layout/server)
  // so both server and client render the same initial HTML and avoid hydration mismatches.
  const serverInfo =
    userInfo && Object.keys(userInfo).length ? (userInfo as any) : null;

  // client-only info loaded after hydration
  const [info, setInfo] = useState<any>(serverInfo);

  useEffect(() => {
    // Listen for in-window auth-change events (dispatched after login)
    const onAuthChanged = (ev?: any) => {
      try {
        debug("[sidebar] auth-change event received", ev?.detail || null);
        const loaded = getUserInfo();
        if (loaded) setInfo(loaded as any);
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener(
      "unite:auth-changed",
      onAuthChanged as EventListener,
    );
    // storage event fires in other windows/tabs; listen to update from those
    const onStorage = (e: StorageEvent) => {
      try {
        debug("[sidebar] storage event", { key: e.key, newValue: e.newValue });
        onAuthChanged({ detail: null });
      } catch (err) {}
    };

    window.addEventListener("storage", onStorage);
    // Load client-only user info only when we don't have serverInfo.
    if (!serverInfo) {
      try {
        const loaded = getUserInfo();
        if (loaded) setInfo(loaded as any);
      } catch (e) {
        // ignore client-only read errors
      }
    }

    return () => {
      try {
        window.removeEventListener(
          "unite:auth-changed",
          onAuthChanged as EventListener,
        );
      } catch (e) {}
      try {
        window.removeEventListener("storage", onStorage);
      } catch (e) {}
    };
  }, [serverInfo]);

  // Map menu items to sidebar links with icons
  // Permission-based visibility is already determined by useSidebarNavigation
  const links = [
    {
      href: "/dashboard/campaign",
      icon: Ticket,
      key: "campaign",
      visible: menuItems.some(item => item.id === 'campaign' && item.visible),
    },
    {
      href: "/dashboard/calendar",
      icon: Calendar,
      key: "calendar",
      visible: menuItems.some(item => item.id === 'calendar' && item.visible),
    },
    {
      href: "/dashboard/chat",
      icon: Comments,
      key: "chat",
      visible: menuItems.some(item => item.id === 'chat' && item.visible),
    },
    {
      href: "/dashboard/stakeholder-management",
      icon: PersonPlanetEarth,
      key: "stakeholder",
      visible: menuItems.some(item => item.id === 'stakeholder-management' && item.visible),
    },
    {
      href: "/dashboard/coordinator-management",
      icon: Persons,
      key: "coordinator",
      visible: menuItems.some(item => item.id === 'coordinator-management' && item.visible),
    },
  ];

  const bottomLinks = [
    { href: "/dashboard/notification", icon: Bell },
    { href: "/dashboard/settings", icon: Gear },
  ];
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const loadUnreadCount = useCallback(async () => {
    try {
      const stored = getUserInfo();
      const parsed = stored.raw || null;
      // Try many common shapes for recipient id (coordinator, stakeholder, generic id)
      let recipientId: string | null = null;

      if (parsed) {
        recipientId =
          parsed?.Coordinator_ID ||
          parsed?.CoordinatorId ||
          parsed?.coordinator_id ||
          parsed?.coordinatorId ||
          parsed?.Stakeholder_ID ||
          parsed?.StakeholderId ||
          parsed?.stakeholder_id ||
          parsed?.stakeholderId ||
          parsed?.id ||
          parsed?.ID ||
          parsed?.user_id ||
          parsed?.user?.id ||
          null;
      }

      // Determine recipient type: Admin, Coordinator, or Stakeholder
      let recipientType = "Coordinator";

      if (stored.isAdmin) {
        recipientType = "Admin";
      } else if (parsed) {
        const roleLower = (stored.role || "").toLowerCase();
        const hasStakeholderId = !!(
          parsed?.Stakeholder_ID ||
          parsed?.StakeholderId ||
          parsed?.stakeholder_id ||
          parsed?.stakeholderId
        );
        const hasCoordinatorId = !!(
          parsed?.Coordinator_ID ||
          parsed?.CoordinatorId ||
          parsed?.coordinator_id ||
          parsed?.coordinatorId
        );

        if (hasStakeholderId || roleLower.includes("stakeholder"))
          recipientType = "Stakeholder";
        else if (hasCoordinatorId || roleLower.includes("coordinator"))
          recipientType = "Coordinator";
      }

      if (!recipientId) return;
      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      const params = new URLSearchParams({
        recipientId: String(recipientId),
        recipientType,
      });
      const url = base
        ? `${base}/api/notifications/unread-count?${params.toString()}`
        : `/api/notifications/unread-count?${params.toString()}`;
      const body: any = await fetchJsonWithAuth(url);
      const count =
        (body?.data && body.data.unread_count) || body?.unread_count || 0;

      setUnreadCount(Number(count));
    } catch (e) {
      // ignore failures silently
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    // optional: refresh count every 30s
    const id = setInterval(() => loadUnreadCount(), 30000);

    const onRefresh = () => loadUnreadCount();
    const onRead = (e: any) => {
      if (e.detail && typeof e.detail.unread === "number") {
        setUnreadCount(e.detail.unread);
      } else {
        loadUnreadCount();
      }
    };

    window.addEventListener("unite:request-refresh-notifications", onRefresh);
    window.addEventListener("unite:notifications-read", onRead);

    return () => {
      clearInterval(id);
      window.removeEventListener(
        "unite:request-refresh-notifications",
        onRefresh,
      );
      window.removeEventListener("unite:notifications-read", onRead);
    };
  }, [loadUnreadCount]);

  const renderButton = (
    href: string,
    Icon: any,
    key: string,
    visible = true,
  ) => {
    const isActive = pathname === href;

    // When `visible` is false, render the same DOM structure but hide it
    // visually and make it non-interactive. This preserves element order
    // and attributes across SSR and the initial client render.
    const hiddenClasses = !visible ? "invisible pointer-events-none" : "";

    // Render a Next <Link> with attributes applied directly to the anchor
    // so we control attribute presence on both server and client. Avoid
    // depending on the HeroUI Button internals which may add attributes
    // during client hydration and produce diffs.
    return (
      <Link
        key={key}
        aria-hidden={visible ? "false" : "true"}
        className={`w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors duration-200 ${hiddenClasses} ${
          isActive
            ? "bg-danger text-white"
            : "text-black border border-gray-300 hover:bg-gray-100"
        }`}
        href={href}
        tabIndex={visible ? 0 : -1}
      >
        <Icon className="-translate-y-[0.5px] w-4 h-4" strokeWidth={2} />
      </Link>
    );
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      localStorage.removeItem("hospitalId");
      localStorage.removeItem("unite_token");
      localStorage.removeItem("unite_user");
      try {
        sessionStorage.removeItem("unite_token");
        sessionStorage.removeItem("unite_user");
      } catch {}
      try {
        // remove the non-HttpOnly cookie if present (development/compatibility)
        if (typeof document !== "undefined") {
          document.cookie = "unite_user=; Max-Age=0; path=/";
        }
      } catch {}
    } catch {}
    router.push("/auth/signin");
  };

  // Show loading state while navigation permissions are being fetched
  if (navigationLoading) {
    return (
      <div className="hidden md:flex w-16 h-screen bg-white flex-col items-center justify-center py-6 border-r border-default-300">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-danger"></div>
      </div>
    );
  }

  return (
    <div className="hidden md:flex w-16 h-screen bg-white flex-col items-center justify-between py-6 border-r border-default-300">
      {/* Top section */}
      <div className="flex flex-col items-center space-y-4">
        {links.map(({ href, icon, key, visible }) =>
          renderButton(href, icon, `link-${key}`, visible),
        )}
      </div>

      {/* Bottom section */}
      <div className="flex flex-col items-center space-y-4">
        {bottomLinks.map(({ href, icon }) => {
          // render unread badge for notifications link
          if (href === "/dashboard/notification") {
            // render custom button so we can show badge
            const isActive = pathname === href || isNotificationOpen;
            const hiddenClasses = "";

            return (
              <button
                key={`bottom-${href}`}
                aria-label="Notifications"
                className={`relative w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? "bg-danger text-white"
                    : "text-black border border-gray-300 hover:bg-gray-100"
                }`}
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              >
                {(() => {
                  const Icon = icon as any;

                  return (
                    <Icon className="-translate-y-[0.5px] w-4 h-4" strokeWidth={2} />
                  );
                })()}
                {(() => {
                  // No badge when explicitly zero: show just a faint outline circle
                  if (!unreadCount || unreadCount === 0) {
                    return (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 -right-1 inline-block w-3 h-3 rounded-full border border-default-300 bg-transparent"
                      />
                    );
                  }

                  // When active, invert colors: bell container becomes red (handled by link classes)
                  // Show white badge with red text when active, otherwise red badge with white text
                  const display =
                    unreadCount > 99 ? "99+" : String(unreadCount);

                  if (isActive) {
                    return (
                      <span
                        aria-label={`${unreadCount} unread notifications`}
                        className="absolute -top-1 -right-1 inline-flex items-center justify-center w-6 h-6 text-[11px] font-semibold leading-none text-red-500 bg-white rounded-full border-2 border-red-500 shadow"
                        title={`${unreadCount} unread`}
                      >
                        {display}
                      </span>
                    );
                  }

                  return (
                    <span
                      aria-label={`${unreadCount} unread notifications`}
                      className="absolute -top-1 -right-1 inline-flex items-center justify-center w-6 h-6 text-[11px] font-semibold leading-none text-white bg-danger rounded-full border-2 border-white shadow"
                      title={`${unreadCount} unread`}
                    >
                      {display}
                    </span>
                  );
                })()}
              </button>
            );
          }

          if (href === "/dashboard/settings") {
            const isActive = pathname === href || isSettingsOpen;

            return (
              <button
                key={`bottom-${href}`}
                aria-label="Settings"
                className={`relative w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? "bg-danger text-white"
                    : "text-black border border-gray-300 hover:bg-gray-100"
                }`}
                onClick={() => setIsSettingsOpen(true)}
              >
                {(() => {
                  const Icon = icon as any;

                  return (
                    <Icon className="-translate-y-[0.5px] w-4 h-4" strokeWidth={2} />
                  );
                })()}
              </button>
            );
          }

          return renderButton(href, icon, `bottom-${href}`);
        })}
      </div>
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
