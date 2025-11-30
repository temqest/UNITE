"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type Province = any;
type District = any;
type Municipality = any;

type CachedDistricts = { ts: number; items: District[] };
type CachedMunicipalities = { ts: number; items: Municipality[] };

type LocationsCache = {
  ts: number;
  provinces?: Province[];
  districts?: Record<string, CachedDistricts>;
  municipalities?: Record<string, CachedMunicipalities>;
};

const STORAGE_KEY = "unite_locations_v1";
const TTL = 30 * 60 * 1000; // 30 minutes

const defaultState = {
  provinces: [] as Province[],
  loadingProvinces: false,
  getDistricts: async (provinceId: string) => [] as District[],
  getMunicipalities: async (districtId: string) => [] as Municipality[],
  refreshAll: async () => {},
};

const LocationsContext = createContext(defaultState as any);

function readStorage(): LocationsCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocationsCache;
  } catch (e) {
    return null;
  }
}

function writeStorage(cache: LocationsCache) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    // ignore
  }
}

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);

  // in-memory cache for quick access
  const cacheRef = React.useRef<LocationsCache>({ ts: 0, provinces: [], districts: {}, municipalities: {} });

  const isFresh = (ts: number) => Date.now() - ts < TTL;

  const fetchProvinces = useCallback(async (force = false) => {
    try {
      const stored = readStorage();
      if (!force && stored && stored.provinces && isFresh(stored.ts)) {
        cacheRef.current = { ...cacheRef.current, ...stored };
        setProvinces(stored.provinces || []);
        return stored.provinces || [];
      }

      setLoadingProvinces(true);
      const base = process.env.API_URL || "";
      const res = await fetch((base ? `${base}` : "") + "/api/locations/provinces");
      if (!res.ok) {
        throw new Error("Failed to fetch provinces");
      }
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.data || data.provinces || [];
      const newCache: LocationsCache = {
        ...(readStorage() || {}),
        ts: Date.now(),
        provinces: items,
      };
      cacheRef.current = { ...cacheRef.current, ...newCache };
      writeStorage(cacheRef.current);
      setProvinces(items);
      return items;
    } catch (e) {
      return provinces;
    } finally {
      setLoadingProvinces(false);
    }
  }, [provinces]);

  const fetchDistricts = useCallback(async (provinceId: string, force = false) => {
    try {
      const stored = readStorage();
      const districtsMap = stored?.districts || cacheRef.current.districts || {};
      const hit = districtsMap[provinceId];
      if (!force && hit && isFresh(hit.ts)) return hit.items;

      const base = process.env.API_URL || "";
      const url = (base ? `${base}` : "") + `/api/locations/provinces/${encodeURIComponent(provinceId)}/districts?limit=1000`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch districts");
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.data || data.districts || [];

      cacheRef.current.districts = { ...(cacheRef.current.districts || {}), [provinceId]: { ts: Date.now(), items } };
      cacheRef.current.ts = Date.now();
      writeStorage(cacheRef.current);
      return items;
    } catch (e) {
      return [];
    }
  }, []);

  const fetchMunicipalities = useCallback(async (districtId: string, force = false) => {
    try {
      const stored = readStorage();
      const muniMap = stored?.municipalities || cacheRef.current.municipalities || {};
      const hit = muniMap[districtId];
      if (!force && hit && isFresh(hit.ts)) return hit.items;

      const base = process.env.API_URL || "";
      const url = (base ? `${base}` : "") + `/api/locations/districts/${encodeURIComponent(districtId)}/municipalities`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch municipalities");
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.data || data.municipalities || [];

      cacheRef.current.municipalities = { ...(cacheRef.current.municipalities || {}), [districtId]: { ts: Date.now(), items } };
      cacheRef.current.ts = Date.now();
      writeStorage(cacheRef.current);
      return items;
    } catch (e) {
      return [];
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await fetchProvinces(true);
    // we don't eagerly fetch all districts/municipalities to keep startup light
  }, [fetchProvinces]);

  // Eager-load all districts and municipalities in a background job (one-shot)
  const eagerLoadAll = useCallback(async () => {
    try {
      // avoid running more than once per provider instance
      if ((cacheRef.current as any)._eagerLoaded) return;
      (cacheRef.current as any)._eagerLoaded = true;

      const provs = cacheRef.current.provinces || (await fetchProvinces());
      if (!Array.isArray(provs) || provs.length === 0) return;
      // Controlled parallelism: limit concurrency when fetching districts and municipalities.
      const concurrency = 5;

      // small helper: run promise-producing tasks with concurrency limit
      const promisePool = async <T, R>(items: T[], worker: (item: T) => Promise<R>, limit: number) => {
        const results: R[] = [];
        let idx = 0;
        const workers: Promise<void>[] = [];

        const runner = async () => {
          while (true) {
            const i = idx++;
            if (i >= items.length) return;
            try {
              const r = await worker(items[i]);
              results[i] = r;
            } catch (e) {
              results[i] = undefined as unknown as R;
            }
          }
        };

        for (let i = 0; i < Math.min(limit, items.length); i++) {
          workers.push(runner());
        }
        await Promise.all(workers);
        return results;
      };

      // worker to fetch districts for a province
      const provWorker = async (p: any) => {
        const provinceId = p.id ?? p._id ?? p.Province_Id ?? p.code ?? p.key ?? p.name;
        const idStr = String(provinceId || "");
        if (!idStr) return [] as any[];
        return await fetchDistricts(idStr, false);
      };

      const districtsByProvince = await promisePool(provs, provWorker, concurrency);

      // flatten districts with their IDs
      const allDistricts: any[] = [];
      for (const ds of districtsByProvince) {
        if (Array.isArray(ds)) allDistricts.push(...ds);
      }

      // worker to fetch municipalities for a district
      const distWorker = async (d: any) => {
        const districtId = d.id ?? d._id ?? d.District_Id ?? d.code ?? d.key ?? d.name;
        const dIdStr = String(districtId || "");
        if (!dIdStr) return [] as any[];
        return await fetchMunicipalities(dIdStr, false);
      };

      await promisePool(allDistricts, distWorker, concurrency);

      // write final cache to storage
      cacheRef.current.ts = Date.now();
      try { writeStorage(cacheRef.current); } catch (e) {}
    } catch (e) {
      // swallow errors from background job
    }
  }, [fetchProvinces, fetchDistricts, fetchMunicipalities]);

  useEffect(() => {
    // load on mount
    const stored = readStorage();
    if (stored && stored.provinces && isFresh(stored.ts)) {
      cacheRef.current = { ...cacheRef.current, ...stored };
      setProvinces(stored.provinces || []);
    } else {
      fetchProvinces();
    }

    // periodic refresh every TTL (30 minutes)
    const id = setInterval(() => {
      fetchProvinces(true);
    }, TTL);
    // kick off eager load in background (do not block UI)
    // Note: run after a short delay to let initial UI settle
    const eagerId = setTimeout(() => { void eagerLoadAll(); }, 1000);

    return () => {
      clearInterval(id);
      clearTimeout(eagerId);
    };
  }, [fetchProvinces]);

  const value = {
    provinces,
    loadingProvinces,
    getDistricts: fetchDistricts,
    getMunicipalities: fetchMunicipalities,
    refreshAll,
  };

  return <LocationsContext.Provider value={value}>{children}</LocationsContext.Provider>;
}

export function useLocations() {
  return useContext(LocationsContext);
}

export default LocationsProvider;
