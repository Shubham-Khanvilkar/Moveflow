'use client';
import React, { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

export default function PoliciesPage({ token }: { token: string }) {
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/policy`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { const raw = d?.data; setPolicy(raw?.data !== undefined ? raw.data : raw ?? d); })
      .finally(() => setLoading(false));
  }, [token]);

  const policySections = [
    { title: 'Booking Rules', icon: '📅', items: [
      { label: 'Advance Booking Window', value: policy?.advanceBookingHours ? `${policy.advanceBookingHours} hours` : '24 hours' },
      { label: 'Cancellation Window', value: policy?.cancellationHours ? `${policy.cancellationHours} hours` : '4 hours' },
      { label: 'Max Round Trip Distance', value: policy?.maxRoundTripKm ? `${policy.maxRoundTripKm} km` : '100 km' },
    ]},
    { title: 'No-Show Policy', icon: '🚫', items: [
      { label: 'Required Call Attempts', value: policy?.requiredCallAttemptsBeforeNoShow || '3' },
      { label: 'Call Gap Requirement', value: `${policy?.minimumMinutesBetweenCallAttempts || 2} minutes` },
      { label: 'Grace Period', value: `${policy?.pickupGracePeriodMinutes || 10} minutes` },
      { label: 'Supervisor Response Window', value: `${policy?.supervisorResponseWindowMinutes || 5} minutes` },
    ]},
    { title: 'Transport Eligibility', icon: '🚐', items: [
      { label: 'Max Distance from Office', value: policy?.maxDistanceKm ? `${policy.maxDistanceKm} km` : '30 km' },
      { label: 'Allow Late Night', value: policy?.allowLateNight !== false ? 'Yes' : 'No' },
      { label: 'Guard Required', value: policy?.guardRequiredForFemaleLastDrop ? 'Yes (Female Last Drop)' : 'No' },
      { label: 'Emergency Booking', value: 'Allowed' },
    ]},
    { title: 'Cost & Billing', icon: '💰', items: [
      { label: 'Rate Card Version', value: policy?.rateCardVersion || 'v1.0' },
      { label: 'Billing Cycle', value: policy?.billingCycle || 'Monthly' },
      { label: 'GST Rate', value: policy?.gstRate ? `${policy.gstRate}%` : '18%' },
      { label: 'Approval Threshold', value: policy?.costApprovalThreshold ? `₹${policy.costApprovalThreshold}` : '₹500' },
    ]},
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>📄 Transport Policies</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Configure transport rules, approval chains, and operational policies</p>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading policies...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {policySections.map((section, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{section.icon}</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{section.title}</h3>
              </div>
              <div style={{ padding: 16 }}>
                {section.items.map((item, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: j < section.items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <span style={{ fontSize: 13, color: '#374151' }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
