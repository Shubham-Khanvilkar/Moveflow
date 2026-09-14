'use client';
import React, { useState, useEffect, useCallback } from 'react';

import { API_URL } from '../../lib/config';

interface Employee {
  id: string;
  email: string;
  name: string;
  phone?: string;
  employeeId?: string;
  status: string;
  designation?: string;
  department?: { id: string; name: string } | null;
  businessUnit?: { id: string; name: string } | null;
  shift?: { id: string; name: string } | null;
}

export default function EmployeesPage({ token }: { token: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', designation: '', employeeId: '' });
  const [saving, setSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/employees?search=${search}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || []);
      } else {
        setError(data.message || 'Failed to load employees');
      }
    } catch {
      setError('Unable to connect to server');
    }
    setLoading(false);
  }, [token, search]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setForm({ name: '', email: '', phone: '', designation: '', employeeId: '' });
        fetchEmployees();
      } else {
        setError(data.message || 'Failed to create employee');
      }
    } catch {
      setError('Failed to create employee');
    }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/employees/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setEditing(null);
        setForm({ name: '', email: '', phone: '', designation: '', employeeId: '' });
        fetchEmployees();
      } else {
        setError(data.message || 'Failed to update employee');
      }
    } catch {
      setError('Failed to update employee');
    }
    setSaving(false);
  };

  const startEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({ name: emp.name, email: emp.email, phone: emp.phone || '', designation: emp.designation || '', employeeId: emp.employeeId || '' });
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Employee Management</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{employees.length} employees in your scope</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + Add Employee
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error} <button onClick={() => setError('')} style={{ marginLeft: 8, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input type="text" placeholder="Search by name, email, employee ID..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading employees...</div>
      ) : employees.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          No employees found. {search ? 'Try a different search.' : 'Click "Add Employee" to create one.'}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Phone</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Department</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>
                        {emp.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{emp.name}</div>
                        {emp.employeeId && <div style={{ fontSize: 11, color: '#9ca3af' }}>{emp.employeeId}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{emp.email}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{emp.phone || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{emp.department?.name || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: emp.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2', color: emp.status === 'ACTIVE' ? '#065f46' : '#991b1b' }}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => startEdit(emp)} style={{ padding: '4px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#374151' }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreate || editing) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>{editing ? 'Edit Employee' : 'Add Employee'}</h3>
            {[
              { label: 'Full Name', key: 'name', type: 'text' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'Phone', key: 'phone', type: 'tel' },
              { label: 'Employee ID', key: 'employeeId', type: 'text' },
              { label: 'Designation', key: 'designation', type: 'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowCreate(false); setEditing(null); }}
                style={{ flex: 1, padding: '10px 0', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={editing ? handleEdit : handleCreate} disabled={saving}
                style={{ flex: 1, padding: '10px 0', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
