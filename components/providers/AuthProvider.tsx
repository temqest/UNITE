"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeJwt } from "@/utils/decodeJwt";

type User = any | null;

interface AuthContextValue {
  user: User;
  loading: boolean;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAuthenticated: false,
  setToken: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const token = typeof window !== "undefined" ? (localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")) : null;
      if (token) {
        const payload = decodeJwt(token);
        setUser(payload ? { raw: payload, role: payload.role || payload.roles || null } : null);
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  function setToken(token: string | null) {
    if (token) {
      try {
        localStorage.setItem("unite_token", token);
      } catch (e) {
        try {
          sessionStorage.setItem("unite_token", token);
        } catch (err) {
          // ignore
        }
      }
      const payload = decodeJwt(token);
      setUser(payload ? { raw: payload, role: payload.role || payload.roles || null } : null);
    } else {
      try {
        localStorage.removeItem("unite_token");
      } catch (e) {}
      try {
        sessionStorage.removeItem("unite_token");
      } catch (e) {}
      setUser(null);
      router.push("/");
    }
  }

  function signOut() {
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, setToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
