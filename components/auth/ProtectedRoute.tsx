"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers/AuthProvider";

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    if (allowedRoles && allowedRoles.length) {
      const role = (user?.role || user?.raw?.role || user?.raw?.StaffType || "").toString().toLowerCase();
      const normalizedAllowed = allowedRoles.map((r) => r.toString().toLowerCase());
      if (!normalizedAllowed.includes(role)) {
        router.replace("/error");
      }
    }
  }, [loading, isAuthenticated, user, allowedRoles, router]);

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Redirecting...</div>;

  if (allowedRoles && allowedRoles.length) {
    const role = (user?.role || user?.raw?.role || user?.raw?.StaffType || "").toString().toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toString().toLowerCase());
    if (!normalizedAllowed.includes(role)) return <div>Redirecting...</div>;
  }

  return <>{children}</>;
}
