"use client";
import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";

interface EditStakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinator: any | null; // stakeholder object returned from backend
  isSysAdmin?: boolean;
  userDistrictId?: string | null;
  onSaved?: () => void;
}

export default function EditStakeholderModal({
  isOpen,
  onClose,
  coordinator,
  isSysAdmin = false,
  userDistrictId = null,
  onSaved,
}: EditStakeholderModalProps) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [organization, setOrganization] = useState("");
  const [cityMunicipality, setCityMunicipality] = useState("");

  const [districts, setDistricts] = useState<any[]>([]);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [province, setProvince] = useState<string>("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [municipalities, setMunicipalities] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    if (!coordinator) return;
    // stakeholder may have nested fields
    const staff =
      coordinator.Staff || coordinator.staff || coordinator.staffData || {};

    // Prefer top-level values then fallback to staff object
    setFirstName(
      coordinator.First_Name ||
        coordinator.FirstName ||
        coordinator.firstName ||
        staff.First_Name ||
        staff.FirstName ||
        staff.firstName ||
        "",
    );
    setMiddleName(
      coordinator.Middle_Name ||
        coordinator.MiddleName ||
        coordinator.middleName ||
        staff.Middle_Name ||
        staff.MiddleName ||
        staff.middleName ||
        "",
    );
    setLastName(
      coordinator.Last_Name ||
        coordinator.LastName ||
        coordinator.lastName ||
        staff.Last_Name ||
        staff.LastName ||
        staff.lastName ||
        "",
    );
    setEmail(
      coordinator.Email ||
        coordinator.email ||
        staff.Email ||
        staff.email ||
        "",
    );
    setPhoneNumber(
      coordinator.Phone_Number ||
        coordinator.PhoneNumber ||
        coordinator.phoneNumber ||
        staff.Phone_Number ||
        staff.Phone_Number ||
        staff.phoneNumber ||
        staff.phone ||
        "",
    );

    const dist =
      coordinator.District ||
      coordinator.District_ID ||
      coordinator.DistrictId ||
      coordinator.District ||
      coordinator.district ||
      null;
    const dId =
      coordinator.District_ID ||
      coordinator.DistrictId ||
      coordinator.District?.District_ID ||
      dist;

    setDistrictId(dId || null);

    const prov =
      (coordinator.District &&
        (coordinator.District.Province_Name ||
          coordinator.District.Province)) ||
      coordinator.Province_Name ||
      coordinator.province ||
      "";

    setProvince(prov || "");
    setSelectedProvince(prov || "");

    // organization and city
    setOrganization(
      coordinator.Organization_Institution ||
        coordinator.Organization ||
        coordinator.organization ||
        coordinator.OrganizationName ||
        coordinator.Organization_Name ||
        "",
    );
    setCityMunicipality(
      coordinator.City_Municipality ||
        coordinator.City ||
        coordinator.city ||
        coordinator.city_municipality ||
        "",
    );
  }, [coordinator]);

  useEffect(() => {
    (async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/api/districts?limit=1000`, {
          headers,
        });
        const text = await res.text();
        let body: any = null;

        try {
          body = JSON.parse(text);
        } catch (e) {
          body = { data: [] };
        }
        const data = body?.data || body || [];

        if (Array.isArray(data)) setDistricts(data);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // If the passed `coordinator` is minimal (only id), attempt to fetch full details
  useEffect(() => {
    (async () => {
      try {
        if (!coordinator) return;
        const hasLocation =
          coordinator.District || coordinator.District_ID || coordinator.Province_Name || coordinator.City_Municipality;

        if (hasLocation) return;

        const coordId =
          coordinator.Stakeholder_ID || coordinator.StakeholderId || coordinator.id || coordinator._id;

        if (!coordId) return;

        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
            : null;
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/api/stakeholders/${encodeURIComponent(coordId)}`, { headers });
        if (!res.ok) return;
        const text = await res.text();
        let body: any = null;

        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = null;
        }

        const data = body?.data || body?.stakeholder || body || null;
        if (!data) return;

        // Populate any missing location fields
        if (!districtId) {
          const dId = data.District_ID || data.DistrictId || (data.District && data.District.District_ID) || null;

          if (dId) setDistrictId(dId);
        }
        if (!province) {
          const prov = data.Province_Name || data.province || (data.District && (data.District.Province_Name || data.District.Province)) || "";

          if (prov) {
            setProvince(prov);
            setSelectedProvince(prov);
          }
        }
        if (!cityMunicipality) {
          const city = data.City_Municipality || data.City || data.city || "";

          if (city) setCityMunicipality(city);
        }
      } catch (e) {
        // ignore fetch errors
      }
    })();
  }, [coordinator]);

  useEffect(() => {
    if (!districtId) return;
    const pick = districts.find(
      (d) =>
        d.District_ID ||
        d.id ||
        d._id ||
        String(d.District_ID) === String(districtId),
    );

    if (pick) {
      const provName = pick.Province_Name || pick.Province || pick.province || "";

      setProvince(provName);
      // keep selectedProvince in sync when district is chosen programmatically
      setSelectedProvince(provName);
    }

    // load municipalities for this district
    (async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/locations/districts/${encodeURIComponent(String(districtId))}/municipalities`
          : `/api/locations/districts/${encodeURIComponent(String(districtId))}/municipalities`;
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
            : null;
        const headers: any = {};

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          setMunicipalities([]);
          return;
        }
        const txt = await res.text();
        let body: any = null;

        try {
          body = txt ? JSON.parse(txt) : null;
        } catch {
          body = null;
        }
        const items = (body && (body.data || body)) || [];
        setMunicipalities(Array.isArray(items) ? items : []);
      } catch (e) {
        setMunicipalities([]);
      }
    })();
  }, [districtId, districts]);

  if (!coordinator) return null;

  const handleSave = async () => {
    if (!coordinator) return;
    setIsSubmitting(true);
    setValidationErrors([]);
    try {
      const coordId =
        coordinator.Stakeholder_ID ||
        coordinator.StakeholderId ||
        coordinator.id ||
        coordinator._id;

      if (!coordId) throw new Error("Stakeholder id not available");

      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload: any = {};

      if (firstName) payload.First_Name = firstName;
      if (middleName !== undefined) payload.Middle_Name = middleName;
      if (lastName) payload.Last_Name = lastName;
      if (email) payload.Email = email;
      if (phoneNumber) payload.Phone_Number = phoneNumber;
      // Only include District_ID when the actor is a system admin. Coordinators cannot change district here.
      if (isSysAdmin && districtId) payload.District_ID = districtId;
      // send the province name (either selected by admin or computed for non-admins)
      payload.Province_Name = (selectedProvince || province) as any;
      // include organization and city/municipality
      if (organization !== undefined)
        payload.Organization_Institution = organization || null;
      if (cityMunicipality !== undefined)
        payload.City_Municipality = cityMunicipality || null;

      const res = await fetch(`${API_URL}/api/stakeholders/${coordId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let resp: any = null;

      try {
        resp = JSON.parse(text);
      } catch (e) {
        resp = { message: text };
      }
      if (!res.ok) {
        if (resp && resp.errors && Array.isArray(resp.errors)) {
          setValidationErrors(resp.errors);

          return;
        }
        throw new Error(resp.message || "Failed to update stakeholder");
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error("EditStakeholderModal save error", err);
      setValidationErrors([err?.message || "Failed to save changes"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="xl"
      onClose={onClose}
    >
      <ModalContent className="max-w-3xl rounded-xl">
        <ModalHeader className="flex items-start gap-4 pb-2">
          <div className="w-12 h-12 rounded-full bg-default-100 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" stroke="#333" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 20c0-2.21 3.58-4 8-4s8 1.79 8 4" stroke="#333" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">Edit Stakeholder</h2>
            <p className="text-sm text-default-500">Update stakeholder profile and location details.</p>
          </div>
        </ModalHeader>
        <ModalBody className="py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">First name</label>
                <Input
                  classNames={{ inputWrapper: "h-12" }}
                  type="text"
                  value={firstName}
                  variant="bordered"
                  onChange={(e) =>
                    setFirstName((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Middle name</label>
                <Input
                  classNames={{ inputWrapper: "h-12" }}
                  type="text"
                  value={middleName}
                  variant="bordered"
                  onChange={(e) =>
                    setMiddleName((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last name</label>
                <Input
                  classNames={{ inputWrapper: "h-12" }}
                  type="text"
                  value={lastName}
                  variant="bordered"
                  onChange={(e) =>
                    setLastName((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">City / Municipality</label>
                <Select
                  placeholder={municipalities.length === 0 ? (cityMunicipality || "Select municipality") : "Select municipality"}
                  selectedKeys={cityMunicipality ? [String(cityMunicipality)] : []}
                  onSelectionChange={(keys: any) => {
                    const v = Array.from(keys)[0] as string;

                    setCityMunicipality(v || "");
                  }}
                >
                  {municipalities && municipalities.length > 0
                    ? municipalities.map((m: any, idx: number) => {
                        const label = m.name || m.Name || m.City_Municipality || String(m);
                        const key = String(m._id || m.id || label || idx);

                        return (
                          <SelectItem key={key} textValue={String(label)}>
                            {String(label)}
                          </SelectItem>
                        );
                      })
                    : cityMunicipality
                    ? (
                      <SelectItem key={String(cityMunicipality)} textValue={String(cityMunicipality)}>
                        {String(cityMunicipality)}
                      </SelectItem>
                    )
                    : null}
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Organization / Institution</label>
                <Input
                  classNames={{ inputWrapper: "h-12" }}
                  type="text"
                  value={organization}
                  variant="bordered"
                  onChange={(e) =>
                    setOrganization((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Contact Email</label>
                <Input
                  classNames={{ inputWrapper: "h-12" }}
                  type="email"
                  value={email}
                  variant="bordered"
                  onChange={(e) =>
                    setEmail((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contact Number</label>
                <Input
                  classNames={{ inputWrapper: "h-12" }}
                  type="tel"
                  value={phoneNumber}
                  variant="bordered"
                  onChange={(e) =>
                    setPhoneNumber((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Province</label>
                {isSysAdmin ? (
                  <Select
                    placeholder={districts.length === 0 ? "Loading provinces..." : "Select province"}
                    selectedKeys={selectedProvince ? [String(selectedProvince)] : []}
                    onSelectionChange={(keys: any) => {
                      const p = Array.from(keys)[0] as string;

                      setSelectedProvince(p);
                      // reset district when province changes
                      setDistrictId(null);
                    }}
                  >
                    {Array.from(new Set((districts || []).map((d) => d.Province_Name).filter(Boolean))).map((p: any, idx: number) => (
                        <SelectItem key={String(p || idx)} textValue={String(p)}>
                          {String(p)}
                        </SelectItem>
                      ))}
                  </Select>
                ) : (
                  <Input
                    disabled
                    classNames={{ inputWrapper: "h-12 bg-default-100" }}
                    type="text"
                    value={province}
                    variant="bordered"
                  />
                )}
              </div>

              <div>
                <label className="text-sm font-medium">District</label>
                <Select
                  disabled={!isSysAdmin}
                  placeholder="Select district"
                  selectedKeys={districtId ? [String(districtId)] : []}
                  onSelectionChange={(keys: any) => {
                    const id = Array.from(keys)[0] as string;

                    setDistrictId(id);
                    const pick = districts.find(
                      (d) =>
                        String(d.District_ID) === String(id) ||
                        String(d.id) === String(id) ||
                        String(d._id) === String(id),
                    );

                    if (pick) {
                      setProvince(pick.Province_Name || pick.Province || pick.province || "");
                      setSelectedProvince(pick.Province_Name || pick.Province || pick.province || "");
                    }
                  }}
                >
                  {(districts || [])
                    .filter((d) =>
                      selectedProvince ? d.Province_Name === selectedProvince : true,
                    )
                    .map((d, idx) => {
                      const label = d.District_Name || d.District_Number || d.District_ID || String(idx);
                      const key = String(d.District_ID || d._id || d.id || idx);

                      return (
                        <SelectItem key={key} textValue={String(label)}>
                          {String(label)}
                        </SelectItem>
                      );
                    })}
                </Select>
              </div>
            </div>

            {validationErrors && validationErrors.length > 0 && (
              <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded">
                <h4 className="text-sm font-semibold">Validation error</h4>
                <ul className="text-xs mt-2 list-disc list-inside">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-black text-white"
            color="default"
            disabled={isSubmitting}
            onPress={handleSave}
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
