"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { getUserInfo } from "@/utils/getUserInfo";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function SysAdminDashboardLayout({ children }: DashboardLayoutProps) {
  const [userInfoProp, setUserInfoProp] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const info = getUserInfo();
      const parsed = info?.raw || null;

      if (parsed) {
        const derived = {
          raw: parsed,
          role:
            parsed.role || parsed.StaffType || parsed.staff_type || parsed.staffType || null,
          isAdmin: !!parsed.isAdmin,
          displayName: parsed.displayName || parsed.First_Name || parsed.name || null,
          email: parsed.email || parsed.Email || null,
        };

        setUserInfoProp(derived);
      } else {
        setUserInfoProp(null);
      }
    } catch (e) {
      setUserInfoProp(null);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  const roleLower = String(userInfoProp?.role || "").toLowerCase();
  const staffType =
    userInfoProp?.raw?.StaffType || userInfoProp?.raw?.staff_type || userInfoProp?.raw?.staffType || null;
  const staffTypeLower = staffType ? String(staffType).toLowerCase() : "";

  const serverIsSystemAdmin = Boolean(
    userInfoProp?.isAdmin || staffTypeLower === "admin" || roleLower === "admin" || (roleLower.includes("sys") && roleLower.includes("admin")),
  );
  const serverIsCoordinator = Boolean(
    (staffType && String(staffType).toLowerCase() === "coordinator") || roleLower.includes("coordinator"),
  );

  const initialShowCoordinator = serverIsSystemAdmin;
  const initialShowStakeholder = serverIsSystemAdmin || serverIsCoordinator;

  return (
    <ProtectedRoute>
      <div className="h-screen flex">
        <Sidebar
          initialShowCoordinator={initialShowCoordinator}
          initialShowStakeholder={initialShowStakeholder}
          role={userInfoProp?.role}
          userInfo={userInfoProp}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
