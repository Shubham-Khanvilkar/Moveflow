'use client';
import { useState, useEffect } from 'react';
import { API_URL } from '../../lib/config';

export default function CompaniesPage({ token, onNavigate }: { token: string; onNavigate?: (id: string) => void }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', code: '', contactEmail: '', contactPhone: '', city: '', country: 'India' });

  const fetchCompanies = () => {
    fetch(`${API_URL}/api/platform/companies`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const raw = d?.data;
        setCompanies(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCompanies(); }, [token]);

  const handleCreate = async () => {
    const res = await fetch(`${API_URL}/api/platform/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setToast('Company created successfully');
      setShowCreate(false);
      setForm({ name: '', code: '', contactEmail: '', contactPhone: '', city: '', country: 'India' });
      fetchCompanies();
    } else {
      setToast('Failed to create company');
    }
    setTimeout(() => setToast(''), 3000);
  };

  const handleUpdate = async () => {
    if (!editCompany?.id) return;
    const res = await fetch(`${API_URL}/api/platform/companies/${editCompany.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setToast('Company updated successfully');
      setEditCompany(null);
      fetchCompanies();
    } else {
      setToast('Failed to update company');
    }
    setTimeout(() => setToast(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;
    const res = await fetch(`${API_URL}/api/platform/companies/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setToast('Company deleted');
      fetchCompanies();
    } else {
      setToast('Failed to delete company');
    }
    setTimeout(() => setToast(''), 3000);
  };

  const openEdit = (c: any) => {
    setEditCompany(c);
    setForm({ name: c.name || '', code: c.code || '', contactEmail: c.contactEmail || '', contactPhone: c.contactPhone || '', city: c.city || '', country: c.country || 'India' });
  };

  const CompanyForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {[
        { key: 'name', label: 'Company Name', required: true },
        { key: 'code', label: 'Company Code', required: true },
        { key: 'contactEmail', label: 'Contact Email' },
        { key: 'contactPhone', label: 'Contact Phone' },
        { key: 'city', label: 'City' },
        { key: 'country', label: 'Country' },
      ].map(f => (
        <div key={f.key}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}{f.required && ' *'}</label>
          <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
        </div>
      ))}
      <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onSubmit} style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{submitLabel}</button>
        <button onClick={() => { setShowCreate(false); setEditCompany(null); }} style={{ padding: '10px 24px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Company Management</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{companies.length} companies</p>
        </div>
        <button onClick={() => { setShowCreate(true); setForm({ name: '', code: '', contactEmail: '', contactPhone: '', city: '', country: 'India' }); }}
          style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ New Company</button>
      </div>

      {toast && <div style={{ padding: '10px 16px', background: '#dcfce7', color: '#16a34a', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{toast}</div>}
      {error && <div style={{ padding: '10px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {(showCreate || editCompany) && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>{editCompany ? 'Edit Company' : 'Create Company'}</h3>
          <CompanyForm onSubmit={editCompany ? handleUpdate : handleCreate} submitLabel={editCompany ? 'Update' : 'Create'} />
        </div>
      )}

      {loading ? <p style={{ color: '#6b7280' }}>Loading...</p> : companies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>🏢</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No companies yet</h3>
          <p style={{ color: '#6b7280' }}>Click "New Company" to onboard your first company.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Company</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Code</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Contact</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Location</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{c.code}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{c.contactEmail || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{c.city || '-'}{c.country ? `, ${c.country}` : ''}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: c.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7', color: c.status === 'ACTIVE' ? '#16a34a' : '#d97706' }}>
                      {c.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => openEdit(c)} style={{ padding: '5px 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', marginRight: 4 }}>Edit</button>
                    <button onClick={() => handleDelete(c.id)} style={{ padding: '5px 12px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
