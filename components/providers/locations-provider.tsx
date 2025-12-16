"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

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

  const isFresh = (ts: number) => Date.now() - ts < TTL;

  const fetchAllLocations = useCallback(async (force = false) => {
    try {
      const stored = readStorage();
      if (!force && stored && isFresh(stored.ts)) {
        setLocations(stored.data);
        return stored.data;
      }

      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || "";

      // Fetch all provinces
      const provincesRes = await fetch((base ? `${base}` : "") + "/api/locations/provinces");
      if (!provincesRes.ok) throw new Error("Failed to fetch provinces");
      const provincesData = await provincesRes.json();
      const provinces = Array.isArray(provincesData) ? provincesData : provincesData.data || provincesData.provinces || [];
      const provincesMap: Record<string, Province> = {};
      provinces.forEach((p: any) => {
        const id = p._id || p.id;
        if (id) provincesMap[id] = p;
      });

      // Fetch all districts (assume API supports fetching all, e.g., with high limit)
      const districtsRes = await fetch((base ? `${base}` : "") + "/api/districts?limit=10000");
      if (!districtsRes.ok) throw new Error("Failed to fetch districts");
      const districtsData = await districtsRes.json();
      const districts = Array.isArray(districtsData) ? districtsData : districtsData.data || districtsData.districts || [];
      const districtsMap: Record<string, District> = {};
      districts.forEach((d: any) => {
        const id = d._id || d.id;
        if (id) districtsMap[id] = d;
      });

      // Fetch all municipalities
      const municipalitiesRes = await fetch((base ? `${base}` : "") + "/api/locations/municipalities?limit=10000");
      if (!municipalitiesRes.ok) throw new Error("Failed to fetch municipalities");
      const municipalitiesData = await municipalitiesRes.json();
      const municipalities = Array.isArray(municipalitiesData) ? municipalitiesData : municipalitiesData.data || municipalitiesData.municipalities || [];
      const municipalitiesMap: Record<string, Municipality> = {};
      municipalities.forEach((m: any) => {
        const id = m._id || m.id;
        if (id) municipalitiesMap[id] = m;
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
    } catch (e) {
      console.error("Error fetching locations:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await fetchAllLocations(true);
  }, [fetchAllLocations]);

  useEffect(() => {
    const stored = readStorage();
    if (stored && isFresh(stored.ts)) {
      setLocations(stored.data);
    } else {
      fetchAllLocations();
    }

    // Periodic refresh
    const id = setInterval(() => {
      fetchAllLocations(true);
    }, TTL);

    return () => clearInterval(id);
  }, [fetchAllLocations]);

  const getProvinceName = useCallback((id: string) => {
    return locations.provinces[id]?.name || "Unknown Province";
  }, [locations]);

  const getDistrictName = useCallback((id: string) => {
    return locations.districts[id]?.name || "Unknown District";
  }, [locations]);

  const getMunicipalityName = useCallback((id: string) => {
    return locations.municipalities[id]?.name || "Unknown Municipality";
  }, [locations]);

  const getFullLocation = useCallback((provinceId?: string, districtId?: string, municipalityId?: string) => {
    const parts = [];
    if (provinceId) parts.push(getProvinceName(provinceId));
    if (districtId) parts.push(getDistrictName(districtId));
    if (municipalityId) parts.push(getMunicipalityName(municipalityId));
    return parts.join(", ");
  }, [getProvinceName, getDistrictName, getMunicipalityName]);

  const getDistrictsForProvince = useCallback((provinceId: string): District[] => {
    if (!provinceId) return [];
    return Object.values(locations.districts).filter(d => d.province === provinceId);
  }, [locations.districts]);

  const getMunicipalitiesForDistrict = useCallback((districtId: string): Municipality[] => {
    if (!districtId) return [];
    return Object.values(locations.municipalities).filter(m => m.district === districtId);
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
