"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { fetchJsonWithAuth } from "@/utils/fetchWithAuth";

type Province = {
  _id: string;
  name: string;
  // other fields
};

type District = {
  _id: string;
  name: string;
  province: string; // province _id
  // other fields
};

type Municipality = {
  _id: string;
  name: string;
  district: string; // district _id
  province: string; // province _id
  // other fields
};

type LocationData = {
  provinces: Record<string, Province>;
  districts: Record<string, District>;
  municipalities: Record<string, Municipality>;
};

type CachedLocations = { ts: number; data: LocationData };

const STORAGE_KEY = "unite_locations_v2";
const TTL = 30 * 60 * 1000; // 30 minutes

const defaultState = {
  locations: { provinces: {}, districts: {}, municipalities: {} } as LocationData,
  loading: false,
  getProvinceName: (id: string) => "",
  getDistrictName: (id: string) => "",
  getMunicipalityName: (id: string) => "",
  getFullLocation: (provinceId?: string, districtId?: string, municipalityId?: string) => "",
  getDistrictsForProvince: (provinceId: string) => [] as District[],
  getMunicipalitiesForDistrict: (districtId: string) => [] as Municipality[],
  getAllProvinces: () => [] as Province[],
  getAllDistricts: () => [] as District[],
  getAllMunicipalities: () => [] as Municipality[],
  refreshAll: async () => {},
};

const LocationsContext = createContext(defaultState);

function readStorage(): CachedLocations | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedLocations;
  } catch (e) {
    return null;
  }
}

function writeStorage(cache: CachedLocations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    // ignore
  }
}

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<LocationData>({ provinces: {}, districts: {}, municipalities: {} });
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 1000; // Minimum 1 second between fetches
  const pathname = usePathname();
  
  // Public routes that don't need locations data (landing page, auth pages, about page)
  const isPublicRoute = pathname === '/' || 
                       pathname?.startsWith('/auth/') || 
                       pathname === '/about';
  
  // Dashboard routes that need locations data
  const isDashboardRoute = pathname?.startsWith('/dashboard');

  const isFresh = (ts: number) => Date.now() - ts < TTL;

  const fetchAllLocations = useCallback(async (force = false) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      console.log("[LocationsProvider] Fetch already in progress, skipping");
      return null;
    }

    // Prevent too frequent fetches (debounce)
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL) {
      console.log("[LocationsProvider] Fetch too soon after last fetch, skipping");
      return null;
    }

    // Check if user is authenticated before attempting to fetch
    const token = typeof window !== "undefined"
      ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
      : null;
    
    if (!token) {
      // No token - user not authenticated, use cached data if available
      const stored = readStorage();
      if (stored) {
        setLocations(stored.data);
        return stored.data;
      }
      // No cache and no token - silently return, don't attempt fetch
      return null;
    }

    try {
      const stored = readStorage();
      if (!force && stored && isFresh(stored.ts)) {
        setLocations(stored.data);
        return stored.data;
      }

      fetchingRef.current = true;
      lastFetchTimeRef.current = now;
      setLoading(true);

      // Fetch all provinces
      let provinces: any[] = [];
      try {
        const provincesData = await fetchJsonWithAuth("/api/locations/provinces");
        provinces = Array.isArray(provincesData) ? provincesData : provincesData.data || provincesData.provinces || [];
        console.log(`[LocationsProvider] Fetched ${provinces.length} provinces`);
        if (provinces.length === 0) {
          console.warn("[LocationsProvider] No provinces returned from API, trying fallback endpoint");
          // Try fallback endpoint
          try {
            const fallbackData = await fetchJsonWithAuth("/api/utility/provinces");
            provinces = Array.isArray(fallbackData) ? fallbackData : fallbackData.data || fallbackData.provinces || [];
            console.log(`[LocationsProvider] Fallback fetched ${provinces.length} provinces`);
          } catch (e2) {
            console.error("[LocationsProvider] Fallback provinces fetch also failed:", e2);
          }
        }
      } catch (e: any) {
        // Check if it's an authentication error - if so, silently handle it
        const isAuthError = e?.isAuthError ||
                           e?.response?.status === 401 || 
                           e?.response?.status === 403 ||
                           e?.status === 401 ||
                           e?.status === 403 ||
                           e?.message?.toLowerCase().includes('invalid or expired token') ||
                           e?.message?.toLowerCase().includes('authentication required');
        
        if (isAuthError) {
          // User not authenticated - use cached data if available, otherwise return empty
          const stored = readStorage();
          if (stored) {
            setLocations(stored.data);
            return stored.data;
          }
          return null;
        }
        
        console.error("[LocationsProvider] Error fetching provinces:", e?.message || e);
        // Try fallback endpoint
        try {
          const fallbackData = await fetchJsonWithAuth("/api/utility/provinces");
          provinces = Array.isArray(fallbackData) ? fallbackData : fallbackData.data || fallbackData.provinces || [];
          console.log(`[LocationsProvider] Fallback fetched ${provinces.length} provinces`);
        } catch (e2: any) {
          const isAuthError2 = e2?.isAuthError ||
                              e2?.response?.status === 401 || 
                              e2?.response?.status === 403 ||
                              e2?.status === 401 ||
                              e2?.status === 403 ||
                              e2?.message?.toLowerCase().includes('invalid or expired token') ||
                              e2?.message?.toLowerCase().includes('authentication required');
          if (!isAuthError2) {
            console.error("[LocationsProvider] Fallback provinces fetch also failed:", e2?.message || e2);
          }
        }
      }
      const provincesMap: Record<string, Province> = {};
      provinces.forEach((p: any) => {
        // Normalize ID to string for consistent matching
        const id = String(p._id || p.id || '');
        if (id && id !== 'undefined' && id !== 'null' && id !== '') {
          provincesMap[id] = { ...p, _id: id };
        }
      });

      // Fetch all districts using the newer unified location system endpoint
      let districts: any[] = [];
      try {
        const districtsData = await fetchJsonWithAuth("/api/locations/type/district?limit=10000");
        districts = Array.isArray(districtsData) ? districtsData : districtsData.data || districtsData.districts || [];
      } catch (e: any) {
        const isAuthError = e?.isAuthError || 
                           e?.response?.status === 401 || 
                           e?.response?.status === 403 ||
                           e?.status === 401 ||
                           e?.status === 403 ||
                           e?.message?.toLowerCase().includes('invalid or expired token') ||
                           e?.message?.toLowerCase().includes('authentication required');
        if (isAuthError) {
          // User not authenticated - use cached data if available
          const stored = readStorage();
          if (stored) {
            setLocations(stored.data);
            return stored.data;
          }
          return null;
        }
        // If not auth error, try legacy endpoint as fallback (for backward compatibility)
        try {
          const legacyData = await fetchJsonWithAuth("/api/districts?limit=10000");
          districts = Array.isArray(legacyData) ? legacyData : legacyData.data || legacyData.districts || [];
        } catch (e2: any) {
          const isAuthError2 = e2?.isAuthError ||
                              e2?.response?.status === 401 || 
                              e2?.response?.status === 403 ||
                              e2?.status === 401 ||
                              e2?.status === 403 ||
                              e2?.message?.toLowerCase().includes('invalid or expired token') ||
                              e2?.message?.toLowerCase().includes('authentication required');
          if (isAuthError2) {
            const stored = readStorage();
            if (stored) {
              setLocations(stored.data);
              return stored.data;
            }
            return null;
          }
          throw e2; // Re-throw if it's not an auth error
        }
      }
      const districtsMap: Record<string, District> = {};
      districts.forEach((d: any) => {
        // Normalize ID to string for consistent matching
        const id = String(d._id || d.id || '');
        if (id && id !== 'undefined' && id !== 'null' && id !== '') {
          // Normalize province reference to string (can be ObjectId or string)
          const provinceId = d.province ? String(d.province._id || d.province) : (d.parent ? String(d.parent._id || d.parent) : null);
          districtsMap[id] = { 
            ...d, 
            _id: id,
            province: provinceId || ''
          };
        }
      });

      // Fetch all municipalities
      let municipalities: any[] = [];
      try {
        const municipalitiesData = await fetchJsonWithAuth("/api/locations/municipalities?limit=10000");
        municipalities = Array.isArray(municipalitiesData) ? municipalitiesData : municipalitiesData.data || municipalitiesData.municipalities || [];
      } catch (e: any) {
        const isAuthError = e?.isAuthError ||
                           e?.response?.status === 401 || 
                           e?.response?.status === 403 ||
                           e?.status === 401 ||
                           e?.status === 403 ||
                           e?.message?.toLowerCase().includes('invalid or expired token') ||
                           e?.message?.toLowerCase().includes('authentication required');
        if (isAuthError) {
          // User not authenticated - use cached data if available
          const stored = readStorage();
          if (stored) {
            setLocations(stored.data);
            return stored.data;
          }
          return null;
        }
        throw e; // Re-throw if it's not an auth error
      }
      const municipalitiesMap: Record<string, Municipality> = {};
      municipalities.forEach((m: any) => {
        // Normalize ID to string for consistent matching
        const id = String(m._id || m.id || '');
        if (id && id !== 'undefined' && id !== 'null' && id !== '') {
          // Normalize district and province references to strings (can be ObjectId or string)
          const districtId = m.district ? String(m.district._id || m.district) : (m.parent ? String(m.parent._id || m.parent) : null);
          const provinceId = m.province ? String(m.province._id || m.province) : null;
          municipalitiesMap[id] = { 
            ...m, 
            _id: id,
            district: districtId || '',
            province: provinceId || ''
          };
        }
      });

      const newData: LocationData = {
        provinces: provincesMap,
        districts: districtsMap,
        municipalities: municipalitiesMap,
      };

      const cache: CachedLocations = { ts: Date.now(), data: newData };
      writeStorage(cache);
      setLocations(newData);
      return newData;
    } catch (e: any) {
      // Check if it's an authentication error - if so, silently handle it
      const isAuthError = e?.isAuthError ||
                         e?.response?.status === 401 || 
                         e?.response?.status === 403 ||
                         e?.status === 401 ||
                         e?.status === 403 ||
                         e?.message?.toLowerCase().includes('invalid or expired token') ||
                         e?.message?.toLowerCase().includes('authentication required');
      
      if (isAuthError) {
        // User not authenticated - use cached data if available
        const stored = readStorage();
        if (stored) {
          setLocations(stored.data);
          return stored.data;
        }
        return null;
      }
      
      // Only log non-authentication errors
      console.error("Error fetching locations:", e);
      return null;
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await fetchAllLocations(true);
  }, [fetchAllLocations]);

  useEffect(() => {
    // Don't initialize on public routes (landing page, auth pages, etc.)
    // Only initialize on dashboard routes or if user is authenticated
    if (isPublicRoute) {
      // Only use cached data if available, don't fetch
      const stored = readStorage();
      if (stored) {
        setLocations(stored.data);
      }
      // Reset initialized flag when on public route so we can initialize when navigating to dashboard
      initializedRef.current = false;
      return;
    }
    
    // For non-dashboard routes, check if authenticated before initializing
    if (!isDashboardRoute) {
      const token = typeof window !== "undefined"
        ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
        : null;
      if (!token) {
        // Not authenticated and not on dashboard - don't initialize
        const stored = readStorage();
        if (stored) {
          setLocations(stored.data);
        }
        initializedRef.current = false;
        return;
      }
    }

    // Only initialize once per route change
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    const initializeLocations = async () => {
      // Check if user is authenticated before initializing
      const token = typeof window !== "undefined"
        ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
        : null;
      
      // If no token, only use cached data if available, don't attempt to fetch
      if (!token) {
        const stored = readStorage();
        if (stored) {
          setLocations(stored.data);
        }
        return;
      }

      const stored = readStorage();
      if (stored && isFresh(stored.ts)) {
        setLocations(stored.data);
      } else {
        await fetchAllLocations();
      }

      // Set up periodic refresh (every 30 minutes) only if authenticated and on dashboard
      intervalRef.current = setInterval(() => {
        // Check token and route before refreshing
        const currentToken = typeof window !== "undefined"
          ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
          : null;
        const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
        const isCurrentlyDashboard = currentPath?.startsWith('/dashboard');
        if (currentToken && isCurrentlyDashboard) {
          fetchAllLocations(true);
        }
      }, TTL);
    };

    initializeLocations();

    // Listen for auth changes to initialize when user logs in
    const handleAuthChange = () => {
      // Don't fetch on public routes
      const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
      const isCurrentlyPublic = currentPath === '/' || 
                               currentPath?.startsWith('/auth/') || 
                               currentPath === '/about';
      if (isCurrentlyPublic) return;
      
      const token = typeof window !== "undefined"
        ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
        : null;
      if (token && !fetchingRef.current) {
        fetchAllLocations(true);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("unite:auth-changed", handleAuthChange);
      // Also listen for storage changes (token being set)
      window.addEventListener("storage", (e) => {
        if (e.key === "unite_token" && e.newValue && !isPublicRoute) {
          handleAuthChange();
        }
      });
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("unite:auth-changed", handleAuthChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isPublicRoute]); // Re-run when pathname changes

  const getProvinceName = useCallback((id: string) => {
    return locations.provinces[id]?.name || "Unknown Province";
  }, [locations.provinces]);

  const getDistrictName = useCallback((id: string) => {
    return locations.districts[id]?.name || "Unknown District";
  }, [locations.districts]);

  const getMunicipalityName = useCallback((id: string) => {
    return locations.municipalities[id]?.name || "Unknown Municipality";
  }, [locations.municipalities]);

  const getFullLocation = useCallback((provinceId?: string, districtId?: string, municipalityId?: string) => {
    const parts = [];
    if (provinceId) parts.push(getProvinceName(provinceId));
    if (districtId) parts.push(getDistrictName(districtId));
    if (municipalityId) parts.push(getMunicipalityName(municipalityId));
    return parts.join(", ");
  }, [getProvinceName, getDistrictName, getMunicipalityName]);

  const getDistrictsForProvince = useCallback((provinceId: string): District[] => {
    if (!provinceId) return [];
    const provinceIdStr = String(provinceId);
    return Object.values(locations.districts).filter(d => {
      // Normalize both IDs to strings for comparison
      const dProvince = d.province || d.parent;
      return dProvince && String(dProvince) === provinceIdStr;
    });
  }, [locations.districts]);

  const getMunicipalitiesForDistrict = useCallback((districtId: string): Municipality[] => {
    if (!districtId) return [];
    const districtIdStr = String(districtId);
    return Object.values(locations.municipalities).filter(m => {
      // Normalize both IDs to strings for comparison
      const mDistrict = m.district || m.parent;
      return mDistrict && String(mDistrict) === districtIdStr;
    });
  }, [locations.municipalities]);

  const getAllProvinces = useCallback((): Province[] => {
    return Object.values(locations.provinces);
  }, [locations.provinces]);

  const getAllDistricts = useCallback((): District[] => {
    return Object.values(locations.districts);
  }, [locations.districts]);

  const getAllMunicipalities = useCallback((): Municipality[] => {
    return Object.values(locations.municipalities);
  }, [locations.municipalities]);

  const value = {
    locations,
    loading,
    getProvinceName,
    getDistrictName,
    getMunicipalityName,
    getFullLocation,
    getDistrictsForProvince,
    getMunicipalitiesForDistrict,
    getAllProvinces,
    getAllDistricts,
    getAllMunicipalities,
    refreshAll,
  };

  return <LocationsContext.Provider value={value}>{children}</LocationsContext.Provider>;
}

export function useLocations() {
  return useContext(LocationsContext);
}

export default LocationsProvider;
