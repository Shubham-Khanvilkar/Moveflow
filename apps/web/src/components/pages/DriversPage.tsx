'use client';
import React, { useState, useEffect, useCallback } from 'react';

import { API_URL } from '../../lib/config';

interface Driver {
  id: string;
  firstName?: string;
  lastName?: string;
  driverId?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  status: string;
  isAvailable?: boolean;
  rating?: number;
  totalTrips?: number;
  vendor?: { id: string; name: string } | null;
  onboardedAt?: string;
}

interface Onboarding {
  id: string;
  driverId: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string;
  status: string;
  complianceScore: string;
  createdAt: string;
}

export default function DriversPage({ token }: { token: string }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'drivers' | 'onboardings'>('drivers');

  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', licenseNumber: '' });
  const [inviteForm, setInviteForm] = useState({ firstName: '', lastName: '', mobileNumber: '', email: '', vendorId: '', licenseNo: '', joiningDate: '' });
  const [saving, setSaving] = useState(false);
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [showDocUpload, setShowDocUpload] = useState<string | null>(null);
  const [docForm, setDocForm] = useState({ documentType: 'DRIVING_LICENSE', documentNumber: '', issuingAuthority: '', expiryDate: '', fileUrl: '' });
  const [docSaving, setDocSaving] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/dashboard/drivers?search=${search}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDrivers(data.data || []);
    } catch {
      setError('Unable to load drivers');
    }
    setLoading(false);
  }, [token, search]);

  const fetchOnboardings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/drivers/onboarding/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOnboardings(Array.isArray(data) ? data : []);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => { fetchDrivers(); fetchOnboardings(); }, [fetchDrivers, fetchOnboardings]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/dashboard/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowCreate(false); setForm({ firstName: '', lastName: '', phone: '', email: '', licenseNumber: '' }); fetchDrivers(); }
      else { const d = await res.json(); setError(d.message || 'Failed'); }
    } catch { setError('Failed to create driver'); }
    setSaving(false);
  };

  const handleInvite = async () => {
    setSaving(true);
    setError('');
    setInviteResult(null);
    try {
      const res = await fetch(`${API_URL}/api/drivers/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteResult(data);
        setSuccess(`Invite sent to ${inviteForm.firstName} ${inviteForm.lastName}. Share this link: ${data.inviteLink}`);
        fetchOnboardings();
      } else {
        setError(data.message || 'Failed to send invite');
      }
    } catch { setError('Failed to send invite'); }
    setSaving(false);
  };

  const handleVerifyOnboarding = async (driverId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/drivers/${driverId}/onboarding/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccess('Driver onboarding verified successfully');
        fetchOnboardings();
        fetchDrivers();
      } else {
        const d = await res.json();
        setError(d.message || 'Failed to verify');
      }
    } catch { setError('Failed to verify onboarding'); }
  };

  const handleRejectOnboarding = async (driverId: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      const res = await fetch(`${API_URL}/api/drivers/${driverId}/onboarding/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setSuccess('Driver onboarding rejected');
        fetchOnboardings();
      }
    } catch { setError('Failed to reject onboarding'); }
  };

  const handleDocUpload = async () => {
    if (!showDocUpload) return;
    setDocSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/fleet/drivers/${showDocUpload}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...docForm, fileName: docForm.fileUrl || 'document.pdf', fileSize: 0, mimeType: 'application/pdf' }),
      });
      if (res.ok) {
        setSuccess('Document uploaded successfully');
        setShowDocUpload(null);
        setDocForm({ documentType: 'DRIVING_LICENSE', documentNumber: '', issuingAuthority: '', expiryDate: '', fileUrl: '' });
      } else {
        const d = await res.json();
        setError(d.message || 'Failed to upload document');
      }
    } catch { setError('Failed to upload document'); }
    setDocSaving(false);
  };

  const btnPrimary = { padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' as const };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Driver Management</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{drivers.length} drivers, {onboardings.length} pending onboarding</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCreate(true)} style={btnPrimary}>+ Add Driver</button>
          <button onClick={() => { setShowInvite(true); setInviteResult(null); }} style={{ ...btnPrimary, background: '#7c3aed' }}>Invite Driver</button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>x</button>
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {(['drivers', 'onboardings'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', color: activeTab === tab ? '#2563eb' : '#6b7280', borderBottom: `2px solid ${activeTab === tab ? '#2563eb' : 'transparent'}`, marginBottom: -2 }}>
            {tab === 'drivers' ? `Active Drivers (${drivers.length})` : `Pending Onboarding (${onboardings.length})`}
          </button>
        ))}
      </div>

      <input type="text" placeholder="Search drivers..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 16 }} />

      {activeTab === 'drivers' ? (
        loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {drivers.map(d => (
              <div key={d.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: d.isAvailable ? '#d1fae5' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚗</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{d.firstName} {d.lastName}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{d.driverId || d.id}</div>
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: d.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2', color: d.status === 'ACTIVE' ? '#065f46' : '#991b1b' }}>{d.status}</span>
                </div>
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                  <div><span style={{ color: '#9ca3af' }}>Phone:</span> {d.phone || '-'}</div>
                  <div><span style={{ color: '#9ca3af' }}>License:</span> {d.licenseNumber || '-'}</div>
                  <div><span style={{ color: '#9ca3af' }}>Rating:</span> ⭐ {d.rating?.toFixed(1) || '-'}</div>
                  <div><span style={{ color: '#9ca3af' }}>Trips:</span> {d.totalTrips || 0}</div>
                  <div><span style={{ color: '#9ca3af' }}>Vendor:</span> {d.vendor?.name || '-'}</div>
                  <div><span style={{ color: '#9ca3af' }}>Available:</span> {d.isAvailable ? 'Yes' : 'No'}</div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowDocUpload(d.id); setDocForm({ documentType: 'DRIVING_LICENSE', documentNumber: '', issuingAuthority: '', expiryDate: '', fileUrl: '' }); }}
                    style={{ padding: '6px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Upload Doc</button>
                </div>
              </div>
            ))}
            {drivers.length === 0 && <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: '#6b7280', background: 'white', borderRadius: 12 }}>No drivers found</div>}
          </div>
        )
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {onboardings.map(o => (
            <div key={o.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{o.firstName} {o.lastName}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{o.driverId}</div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: o.status === 'UNDER_REVIEW' ? '#fef3c7' : '#dbeafe', color: o.status === 'UNDER_REVIEW' ? '#92400e' : '#1e40af' }}>{o.status.replace(/_/g, ' ')}</span>
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
                <div>Mobile: {o.mobileNumber}</div>
                {o.email && <div>Email: {o.email}</div>}
                <div>Compliance: {o.complianceScore.replace(/_/g, ' ')}</div>
              </div>
              {o.status === 'UNDER_REVIEW' && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button onClick={() => handleVerifyOnboarding(o.driverId)} style={{ padding: '6px 14px', background: '#059669', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                  <button onClick={() => handleRejectOnboarding(o.driverId)} style={{ padding: '6px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                </div>
              )}
            </div>
          ))}
          {onboardings.length === 0 && <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: '#6b7280', background: 'white', borderRadius: 12 }}>No pending onboarding requests</div>}
        </div>
      )}

      {/* Create Driver Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>Add Driver</h3>
            {[{ label: 'First Name', key: 'firstName' }, { label: 'Last Name', key: 'lastName' }, { label: 'Phone', key: 'phone' }, { label: 'Email', key: 'email' }, { label: 'License Number', key: 'licenseNumber' }].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '10px 0', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{ flex: 1, padding: '10px 0', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Driver Modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Invite Driver</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Send an onboarding invite. The driver will have 15 days to upload documents and start working.</p>

            {[{ label: 'First Name', key: 'firstName', required: true }, { label: 'Last Name', key: 'lastName', required: true }, { label: 'Mobile Number', key: 'mobileNumber', required: true }, { label: 'Email', key: 'email' }, { label: 'License Number', key: 'licenseNo' }, { label: 'Joining Date', key: 'joiningDate', type: 'date' }].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label} {f.required && <span style={{ color: '#dc2626' }}>*</span>}</label>
                <input type={(f as any).type || 'text'} value={(inviteForm as any)[f.key]} onChange={e => setInviteForm({ ...inviteForm, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}

            {inviteResult && (
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 13 }}>
                <p style={{ fontWeight: 600, margin: '0 0 8px', color: '#065f46' }}>Invite Sent!</p>
                <p style={{ margin: '2px 0' }}>Driver ID: {inviteResult.driverId}</p>
                <p style={{ margin: '2px 0' }}>Expires: {new Date(inviteResult.expiresAt).toLocaleDateString()}</p>
                <p style={{ margin: '8px 0 0', fontWeight: 600 }}>Invite Link: <span style={{ color: '#2563eb' }}>{inviteResult.inviteLink}</span></p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowInvite(false); setInviteResult(null); setInviteForm({ firstName: '', lastName: '', mobileNumber: '', email: '', vendorId: '', licenseNo: '', joiningDate: '' }); }} style={{ flex: 1, padding: '10px 0', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Close</button>
              {!inviteResult && (
                <button onClick={handleInvite} disabled={saving || !inviteForm.firstName || !inviteForm.lastName || !inviteForm.mobileNumber} style={{ flex: 1, padding: '10px 0', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
                  {saving ? 'Sending...' : 'Send Invite'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Document Upload Modal */}
      {showDocUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>Upload Driver Document</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Document Type *</label>
              <select value={docForm.documentType} onChange={e => setDocForm({ ...docForm, documentType: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
                <option value="DRIVING_LICENSE">Driving License</option>
                <option value="RC_BOOK">RC Book</option>
                <option value="INSURANCE">Insurance</option>
                <option value="PUC">PUC Certificate</option>
                <option value="AADHAR">Aadhar Card</option>
                <option value="PAN">PAN Card</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Document Number</label>
              <input value={docForm.documentNumber} onChange={e => setDocForm({ ...docForm, documentNumber: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Issuing Authority</label>
              <input value={docForm.issuingAuthority} onChange={e => setDocForm({ ...docForm, issuingAuthority: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Expiry Date</label>
              <input type="date" value={docForm.expiryDate} onChange={e => setDocForm({ ...docForm, expiryDate: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>File URL (or upload path)</label>
              <input value={docForm.fileUrl} onChange={e => setDocForm({ ...docForm, fileUrl: e.target.value })}
                placeholder="https://..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowDocUpload(null)} style={{ flex: 1, padding: '10px 0', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDocUpload} disabled={docSaving} style={{ flex: 1, padding: '10px 0', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: docSaving ? 'wait' : 'pointer' }}>
                {docSaving ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
