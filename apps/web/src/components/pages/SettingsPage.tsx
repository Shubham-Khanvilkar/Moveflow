'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';

const DEFAULT_NOTIFICATIONS = [true, true, true, true, false, false, false];
const DEFAULT_SECURITY = [true, true, true];

export default function SettingsPage({ token, user }: { token: string; user?: any }) {
  const [activeTab, setActiveTab] = useState('general');
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [notifToggles, setNotifToggles] = useState<boolean[]>(DEFAULT_NOTIFICATIONS);
  const [securityToggles, setSecurityToggles] = useState<boolean[]>(DEFAULT_SECURITY);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', contactEmail: '', contactPhone: '', timezone: 'Asia/Kolkata', currency: 'INR',
  });

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3000);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };

    setLoading(true);
    fetch(`${API_URL}/api/platform/companies`, { headers })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        if (cancelled) return;
        const raw = d?.data;
        const companies = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        const c = companies[0] || null;
        setCompany(c);
        if (c) {
          setForm({
            name: c.name || '',
            contactEmail: c.contactEmail || '',
            contactPhone: c.contactPhone || '',
            timezone: c.timezone || 'Asia/Kolkata',
            currency: c.currency || 'INR',
          });
          const s = (typeof c.settings === 'object' && c.settings !== null) ? c.settings : {};
          setNotifToggles(Array.isArray(s.notifications) ? s.notifications : DEFAULT_NOTIFICATIONS);
          setSecurityToggles(Array.isArray(s.security) ? s.security : DEFAULT_SECURITY);
        }
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message === 'Failed to fetch' ? 'Network error — please check your connection' : 'Failed to load settings');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  const patchCompany = async (updates: Record<string, any>) => {
    if (!company?.id) return;
    const res = await fetch(`${API_URL}/api/platform/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Save failed (HTTP ${res.status})`);
    }
    const result = await res.json();
    return result.data || result;
  };

  const handleSaveGeneral = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      const updated = await patchCompany(form);
      setCompany(updated);
      showToast('General settings saved');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    }
    setSaving(false);
  };

  const handleSaveNotifications = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      const merged = { ...(typeof company.settings === 'object' ? company.settings : {}), notifications: notifToggles };
      const updated = await patchCompany({ settings: merged });
      setCompany(updated);
      showToast('Notification preferences saved');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    }
    setSaving(false);
  };

  const handleSaveSecurity = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      const merged = { ...(typeof company.settings === 'object' ? company.settings : {}), security: securityToggles };
      const updated = await patchCompany({ settings: merged });
      setCompany(updated);
      showToast('Security settings saved');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    }
    setSaving(false);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Settings</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Company settings and configuration</p>

      {toast && <div style={{ padding: '10px 16px', background: toastType === 'success' ? '#dcfce7' : '#fef2f2', color: toastType === 'success' ? '#16a34a' : '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{toast}</span><span onClick={() => setToast('')} style={{ cursor: 'pointer', fontWeight: 700 }}>×</span></div>}
      {error && <div style={{ padding: '10px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{error}</span><span onClick={() => setError('')} style={{ cursor: 'pointer', fontWeight: 700 }}>×</span></div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
          <div style={{ width: 24, height: 24, border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ marginLeft: 12, fontSize: 14, color: '#6b7280' }}>Loading settings...</span>
        </div>
      ) : !company ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No Company Found</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>No company is associated with this account. Contact an administrator.</div>
        </div>
      ) : (
      <>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: activeTab === t.id ? '#2563eb' : '#f3f4f6',
            color: activeTab === t.id ? 'white' : '#374151',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {activeTab === 'general' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Company Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Company Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Company Code</label>
                <input value={company?.code || ''} disabled
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: '#f9fafb' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Primary Email</label>
                <input value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Phone</label>
                <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Timezone</label>
                <select value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Default Currency</label>
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                  <option value="INR">INR (₹)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <button onClick={handleSaveGeneral} disabled={saving}
                style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
        {activeTab === 'notifications' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Notification Settings</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Choose how you want to be notified about transport activities</p>
            {['Email Notifications', 'SMS Notifications', 'Push Notifications', 'Booking Confirmation', 'Trip Updates', 'Approval Reminders', 'No-Show Alerts'].map((n, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{n}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    {['Receive email for all alerts', 'Receive SMS for critical alerts', 'Browser push notifications', 'Notify when a booking is confirmed', 'Real-time trip status updates', 'Reminders for pending approvals', 'Alert when a booked employee no-shows'][i]}
                  </div>
                </div>
                <div onClick={() => setNotifToggles(prev => { const next = [...prev]; next[i] = !next[i]; return next; })} style={{ width: 40, height: 22, borderRadius: 11, background: notifToggles[i] ? '#2563eb' : '#d1d5db', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: notifToggles[i] ? 20 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s ease' }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <button onClick={handleSaveNotifications} disabled={saving}
                style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}
        {activeTab === 'security' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Security Settings</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Configure organization-wide security policies</p>
            {[
              { label: 'Two-Factor Authentication', desc: 'Require MFA for all admin users' },
              { label: 'Session Timeout', desc: 'Auto-logout after 30 minutes of inactivity' },
              { label: 'Password Policy', desc: 'Min 8 chars with special characters required' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{s.desc}</div>
                </div>
                <div onClick={() => setSecurityToggles(prev => { const next = [...prev]; next[i] = !next[i]; return next; })} style={{ width: 40, height: 22, borderRadius: 11, background: securityToggles[i] ? '#2563eb' : '#d1d5db', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: securityToggles[i] ? 20 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s ease' }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <button onClick={handleSaveSecurity} disabled={saving}
                style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save Policies'}
              </button>
            </div>
          </div>
        )}
        {activeTab === 'billing' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Billing & Subscription</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Manage your transport billing, rate cards, and vendor invoices</div>
          </div>
        )}
        {activeTab === 'integrations' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Integrations</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Connect with Google Maps, Twilio, payment gateways, and more</div>
          </div>
        )}
      </div>
      </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
