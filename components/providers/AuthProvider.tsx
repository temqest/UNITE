"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { decodeJwt } from "@/utils/decodeJwt";
import { 
  getStoredToken, 
  isTokenExpired, 
  clearAuthTokens,
  validateCurrentToken,
  setupTokenExpiryCheck 
} from "@/utils/tokenManager";

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
  const hasShownExpiryWarning = useRef(false);

  // Handle token expiry
  const handleTokenExpired = useCallback(() => {
    if (!hasShownExpiryWarning.current) {
      hasShownExpiryWarning.current = true;
      console.warn('[Auth] Session expired. Please log in again.');
      
      // Show user-friendly message (optional - you can add a toast notification here)
      if (typeof window !== 'undefined') {
        // You can add a toast/notification library here
        alert('Your session has expired. Please log in again.');
      }
    }
    
    setUser(null);
    clearAuthTokens();
    
    // Only redirect to auth if not already on auth page
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
      router.push('/auth/signin');
    }
  }, [router]);

  // Initialize auth state and setup token monitoring
  useEffect(() => {
    try {
      const token = getStoredToken();
      
      if (token) {
        // Check if token is expired
        if (isTokenExpired(token)) {
          console.warn('[Auth] Token is expired on initial load');
          handleTokenExpired();
          setLoading(false);
          return;
        }
        
        const payload = decodeJwt(token);
        setUser(payload ? { raw: payload, role: payload.role || payload.roles || null } : null);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('[Auth] Error initializing auth:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }

    // Setup periodic token expiry checking (every 60 seconds)
    const cleanup = setupTokenExpiryCheck(handleTokenExpired, 60000);
    
    return cleanup;
  }, [handleTokenExpired]);

  function setToken(token: string | null) {
    if (token) {
      // Validate token before setting it
      if (isTokenExpired(token)) {
        console.warn('[Auth] Attempted to set an expired token');
        handleTokenExpired();
        return;
      }
      
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
      hasShownExpiryWarning.current = false; // Reset warning flag on new login
    } else {
      clearAuthTokens();
      setUser(null);
      router.push("/");
    }
  }

  function signOut() {
    hasShownExpiryWarning.current = false;
    clearAuthTokens();
    setUser(null);
    router.push("/");
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
