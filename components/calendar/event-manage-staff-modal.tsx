"use client";
import React, { useEffect, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal';
import { Users } from 'lucide-react';
import { Button } from '@heroui/button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string | null;
  onSaved?: () => void;
}

const API_BASE = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:3000';

export default function EventManageStaffModal({ isOpen, onClose, eventId, onSaved }: Props) {
  const [staffMembers, setStaffMembers] = useState<Array<{ FullName: string; Role: string }>>([]);
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!eventId) return;
    let mounted = true;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        // Fetch full event details to locate request id
        const res = await fetch(`${API_BASE}/api/events/${encodeURIComponent(eventId)}`, { credentials: 'include' });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || 'Failed to fetch event details');
        const data = body.data || body.event || body;
        const rid = data?.request?.Request_ID || data?.Request_ID || data?.requestId || data?.request?.RequestId || null;
        setRequestId(rid || null);

        if (rid) {
          const r = await fetch(`${API_BASE}/api/requests/${encodeURIComponent(rid)}`, { credentials: 'include' });
          const rb = await r.json();
          if (!r.ok) throw new Error(rb.message || 'Failed to fetch request details');
          const reqData = rb.data || rb.request || rb;
          const staff = reqData?.staff || [];
          if (mounted) {
            setStaffMembers(Array.isArray(staff) ? staff.map((s: any) => ({ FullName: s.FullName || s.Staff_FullName || s.Staff_Fullname || '', Role: s.Role || '' })) : []);
          }
        } else {
          // no request id available — leave empty
          setStaffMembers([]);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load staff');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isOpen, eventId]);

  const addStaff = () => {
    if (!newFullName || !newRole) return setError('Name and role are required');
    setError(null);
    setStaffMembers([...staffMembers, { FullName: newFullName.trim(), Role: newRole.trim() }]);
    setNewFullName('');
    setNewRole('');
  };

  const removeStaff = (idx: number) => {
    setStaffMembers(staffMembers.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!requestId) return setError('Request info not available');
    try {
      setSaving(true);
      setError(null);
      const rawUser = typeof window !== 'undefined' ? localStorage.getItem('unite_user') : null;
      const user = rawUser ? JSON.parse(rawUser as string) : null;
      const token = typeof window !== 'undefined' ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null;
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body: any = {
        adminId: user?.id || user?.Admin_ID || null,
        eventId: eventId || null,
        staffMembers
      };

      const res = await fetch(`${API_BASE}/api/requests/${encodeURIComponent(requestId)}/staff`, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' });
      const resp = await res.json();
      if (!res.ok) throw new Error(resp.message || 'Failed to assign staff');

      // success
      if (onSaved) await onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" placement="center">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-default-100">
            <Users className="w-5 h-5 text-default-600" />
          </div>
          <span className="text-lg font-semibold">Manage Staff</span>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-600 mb-4">Add or remove staff assignments for this event.</p>

          {loading && <div className="text-sm text-default-600">Loading...</div>}

          <div className="space-y-2 mb-4">
            {(!loading && staffMembers.length === 0) && (
              <div className="text-sm text-default-600">No staff assigned yet.</div>
            )}
            {staffMembers.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1 text-sm">{s.FullName} <span className="text-default-500">({s.Role})</span></div>
                <button className="text-sm text-danger" onClick={() => removeStaff(idx)}>Remove</button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <input value={newFullName} onChange={(e) => setNewFullName((e.target as HTMLInputElement).value)} placeholder="Full name" className="col-span-2 px-3 py-2 border border-default-200 rounded" />
            <input value={newRole} onChange={(e) => setNewRole((e.target as HTMLInputElement).value)} placeholder="Role" className="px-3 py-2 border border-default-200 rounded" />
          </div>
          <div className="flex gap-2 mb-2">
            <button className="px-3 py-1 bg-default-100 rounded" onClick={addStaff}>Add</button>
            <button className="px-3 py-1 border rounded" onClick={() => { setNewFullName(''); setNewRole(''); setError(null); }}>Clear</button>
          </div>

          {error && <div className="text-sm text-danger mb-2">{error}</div>}

          {saving && <div className="text-sm text-default-600">Saving...</div>}
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose} className="font-medium">Close</Button>
          <Button color="default" className="bg-black text-white font-medium" onPress={save}>Save</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
