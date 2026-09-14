'use client';

import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const PRICING_MODELS = [
  { value: 'PER_EMPLOYEE', label: 'Per Employee', desc: 'Flat rate × active headcount per cycle' },
  { value: 'PER_KM', label: 'Per KM', desc: 'Rate × total kilometers traveled' },
  { value: 'PER_TRIP', label: 'Per Trip', desc: 'Flat rate × completed trips' },
  { value: 'PER_EMPLOYEE_PER_TRIP', label: 'Per Employee Per Trip', desc: 'Rate × employees × trips' },
  { value: 'COMMISSION_PERCENT', label: 'Commission %', desc: 'Percentage of transport spend' },
  { value: 'HYBRID', label: 'Hybrid', desc: 'Base fee + metered overage' },
];

const CURRENCIES = ['INR', 'USD', 'AED', 'EUR', 'GBP', 'SGD'];

export default function PricingRulesAdmin() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    pricingModel: 'PER_EMPLOYEE',
    currency: 'INR',
    rateValue: '',
    billingCycle: 'MONTHLY',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/billing/pricing-rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRules(await res.json());
    } catch (err) {
      console.error('Fetch rules error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    if (!formData.rateValue) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/billing/pricing-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          rateValue: Math.round(parseFloat(formData.rateValue) * 100), // Convert to minor units
          effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormData({ pricingModel: 'PER_EMPLOYEE', currency: 'INR', rateValue: '', billingCycle: 'MONTHLY', effectiveFrom: new Date().toISOString().split('T')[0] });
        fetchRules();
      }
    } catch (err) {
      console.error('Create rule error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Rules Engine</h1>
          <p className="text-sm text-gray-500">Section 40 — Configure per-company or platform-wide pricing</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showCreate ? 'Cancel' : '+ New Pricing Rule'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">Create Pricing Rule</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Model</label>
              <select
                value={formData.pricingModel}
                onChange={(e) => setFormData({ ...formData, pricingModel: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                {PRICING_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label} — {m.desc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency (ISO 4217)</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate (in minor units — paise/cents)</label>
              <input
                type="number"
                value={formData.rateValue}
                onChange={(e) => setFormData({ ...formData, rateValue: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. 500 = ₹5.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
              <select
                value={formData.billingCycle}
                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="ANNUAL">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
              <input
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <button
            onClick={createRule}
            disabled={submitting || !formData.rateValue}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Creating...' : 'Create Rule'}
          </button>
        </div>
      )}

      {/* Rules Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading pricing rules...</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <div className="text-4xl mb-2">💰</div>
          <div className="text-gray-500">No pricing rules configured yet</div>
          <div className="text-sm text-gray-400 mt-1">Create a rule to enable platform billing</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-gray-500">
                <th className="p-3">Model</th>
                <th className="p-3">Currency</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3">Cycle</th>
                <th className="p-3">Effective From</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule: any) => (
                <tr key={rule.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {rule.pricingModel}
                    </span>
                  </td>
                  <td className="p-3 font-mono">{rule.currency}</td>
                  <td className="p-3 text-right font-mono">{(rule.rateValue / 100).toFixed(2)}</td>
                  <td className="p-3">{rule.billingCycle}</td>
                  <td className="p-3">{new Date(rule.effectiveFrom).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
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
