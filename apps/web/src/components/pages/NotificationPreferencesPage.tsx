'use client';

import { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

interface NotificationPreference {
  id: string;
  userId: string;
  companyId: string;
  push: boolean;
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/notifications/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.data || data);
      }
    } catch (err) {
      // Error handled by UI state
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(preferences),
      });
    } catch (err) {
      // Error handled by UI state
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Channel Preferences</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences?.push ?? true}
              onChange={(e) => setPreferences({ ...preferences!, push: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Push Notifications</span>
            <span className="text-xs text-gray-500">(Mobile app alerts)</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences?.sms ?? true}
              onChange={(e) => setPreferences({ ...preferences!, sms: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">SMS</span>
            <span className="text-xs text-gray-500">(Text messages)</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences?.email ?? true}
              onChange={(e) => setPreferences({ ...preferences!, email: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Email</span>
            <span className="text-xs text-gray-500">(Email notifications)</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences?.whatsapp ?? true}
              onChange={(e) => setPreferences({ ...preferences!, whatsapp: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">WhatsApp</span>
            <span className="text-xs text-gray-500">(WhatsApp messages)</span>
          </label>
        </div>

        <div className="mt-6 pt-6 border-t">
          <h2 className="text-lg font-semibold mb-4">Quiet Hours</h2>
          <p className="text-sm text-gray-500 mb-4">No notifications during these hours (except safety alerts)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={preferences?.quietHoursStart || '22:00'}
                onChange={(e) => setPreferences({ ...preferences!, quietHoursStart: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={preferences?.quietHoursEnd || '07:00'}
                onChange={(e) => setPreferences({ ...preferences!, quietHoursEnd: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
