"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function api(path: string, options?: RequestInit) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface TransportConfig {
  id: string;
  allowMultipleAdditional: boolean;
  maxAdditionalMovementsPerDay: number;
  allowAdHocShifts: boolean;
  adHocShiftApprovalRequired: boolean;
  allowOvernightShifts: boolean;
  bookingCutoffMinutes: number;
  defaultSlotIntervalMinutes: number;
  defaultEarlyPickupOffsetMinutes: number;
  defaultEarlyPickupBufferMinutes: number;
  defaultDropDepartureMode: string;
  defaultDropWaitTimeoutMinutes: number;
}

const INTERVALS = [30, 45, 60, 90, 120];

export default function TransportConfigPage() {
  const [config, setConfig] = useState<TransportConfig | null>(null);
  const [form, setForm] = useState({
    allowMultipleAdditional: false,
    maxAdditionalMovementsPerDay: 2,
    allowAdHocShifts: true,
    adHocShiftApprovalRequired: false,
    allowOvernightShifts: true,
    bookingCutoffMinutes: 60,
    defaultSlotIntervalMinutes: 60,
    defaultEarlyPickupOffsetMinutes: 0,
    defaultEarlyPickupBufferMinutes: 30,
    defaultDropDepartureMode: "FIXED",
    defaultDropWaitTimeoutMinutes: 15,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    api("/transport-config/settings").then((d) => {
      if (d) {
        setConfig(d);
        setForm({
          allowMultipleAdditional: d.allowMultipleAdditional,
          maxAdditionalMovementsPerDay: d.maxAdditionalMovementsPerDay,
          allowAdHocShifts: d.allowAdHocShifts,
          adHocShiftApprovalRequired: d.adHocShiftApprovalRequired,
          allowOvernightShifts: d.allowOvernightShifts,
          bookingCutoffMinutes: d.bookingCutoffMinutes,
          defaultSlotIntervalMinutes: d.defaultSlotIntervalMinutes,
          defaultEarlyPickupOffsetMinutes: d.defaultEarlyPickupOffsetMinutes,
          defaultEarlyPickupBufferMinutes: d.defaultEarlyPickupBufferMinutes,
          defaultDropDepartureMode: d.defaultDropDepartureMode,
          defaultDropWaitTimeoutMinutes: d.defaultDropWaitTimeoutMinutes,
        });
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    await api("/transport-config/settings", {
      method: "PUT",
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  };

  const Toggle = ({
    label,
    description,
    checked,
    onChange,
  }: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Transport Schedule Config</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
            saved
              ? "bg-green-600"
              : "bg-blue-600 hover:bg-blue-700"
          } disabled:opacity-50`}
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Booking Rules */}
      <div className="bg-white rounded-xl border p-6 space-y-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Rules</h3>
        <Toggle
          label="Allow Multiple Additional Movements"
          description="Allow employees to have multiple pickup/drop movements per day"
          checked={form.allowMultipleAdditional}
          onChange={(v) => setForm({ ...form, allowMultipleAdditional: v })}
        />
        <div className="py-3 border-b border-gray-100">
          <label className="text-sm font-medium text-gray-700">
            Max Additional Movements Per Day
          </label>
          <input
            type="number"
            value={form.maxAdditionalMovementsPerDay}
            onChange={(e) =>
              setForm({
                ...form,
                maxAdditionalMovementsPerDay: Number(e.target.value),
              })
            }
            className="mt-1 w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="py-3 border-b border-gray-100">
          <label className="text-sm font-medium text-gray-700">
            Booking Cutoff (minutes before slot)
          </label>
          <input
            type="number"
            value={form.bookingCutoffMinutes}
            onChange={(e) =>
              setForm({ ...form, bookingCutoffMinutes: Number(e.target.value) })
            }
            className="mt-1 w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Shift Rules */}
      <div className="bg-white rounded-xl border p-6 space-y-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Shift Rules</h3>
        <Toggle
          label="Allow Ad-Hoc Shifts"
          description="Allow employees to request ad-hoc shift changes"
          checked={form.allowAdHocShifts}
          onChange={(v) => setForm({ ...form, allowAdHocShifts: v })}
        />
        {form.allowAdHocShifts && (
          <Toggle
            label="Ad-Hoc Shift Approval Required"
            description="Require admin approval for ad-hoc shift requests"
            checked={form.adHocShiftApprovalRequired}
            onChange={(v) => setForm({ ...form, adHocShiftApprovalRequired: v })}
          />
        )}
        <Toggle
          label="Allow Overnight Shifts"
          description="Allow shifts that cross midnight"
          checked={form.allowOvernightShifts}
          onChange={(v) => setForm({ ...form, allowOvernightShifts: v })}
        />
      </div>

      {/* Default Slot Configuration */}
      <div className="bg-white rounded-xl border p-6 space-y-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Default Slot Configuration</h3>
        <p className="text-xs text-gray-400 mb-3">
          These defaults apply when creating new shift timings or generating slots.
        </p>
        <div className="py-3 border-b border-gray-100">
          <label className="text-sm font-medium text-gray-700">Default Slot Interval</label>
          <select
            value={form.defaultSlotIntervalMinutes}
            onChange={(e) =>
              setForm({
                ...form,
                defaultSlotIntervalMinutes: Number(e.target.value),
              })
            }
            className="mt-1 w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {INTERVALS.map((i) => (
              <option key={i} value={i}>
                {i} minutes
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Default Early Pickup */}
      <div className="bg-white rounded-xl border p-6 space-y-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Default Early Pickup</h3>
        <p className="text-xs text-gray-400 mb-3">
          Configure how early cabs pick up employees before their shift starts.
        </p>
        <div className="py-3 border-b border-gray-100">
          <label className="text-sm font-medium text-gray-700">
            Default Pickup Offset (minutes before shift)
          </label>
          <p className="text-xs text-gray-400 mt-0.5">
            E.g., 120 = cab picks employee 2 hours before shift start
          </p>
          <input
            type="number"
            value={form.defaultEarlyPickupOffsetMinutes}
            onChange={(e) =>
              setForm({
                ...form,
                defaultEarlyPickupOffsetMinutes: Number(e.target.value),
              })
            }
            className="mt-1 w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="py-3 border-b border-gray-100">
          <label className="text-sm font-medium text-gray-700">
            Default Arrival Buffer (minutes)
          </label>
          <p className="text-xs text-gray-400 mt-0.5">
            E.g., 30 = employee should be ready at pickup 30min before shift
          </p>
          <input
            type="number"
            value={form.defaultEarlyPickupBufferMinutes}
            onChange={(e) =>
              setForm({
                ...form,
                defaultEarlyPickupBufferMinutes: Number(e.target.value),
              })
            }
            className="mt-1 w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Default Drop Departure */}
      <div className="bg-white rounded-xl border p-6 space-y-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Default Drop Departure</h3>
        <p className="text-xs text-gray-400 mb-3">
          Configure how vehicles depart for drop trips.
        </p>
        <div className="py-3 border-b border-gray-100">
          <label className="text-sm font-medium text-gray-700">Default Departure Mode</label>
          <div className="flex gap-4 mt-2">
            {["FIXED", "WAIT_ALL"].map((mode) => (
              <label key={mode} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="defaultDepartureMode"
                  value={mode}
                  checked={form.defaultDropDepartureMode === mode}
                  onChange={(e) =>
                    setForm({ ...form, defaultDropDepartureMode: e.target.value })
                  }
                />
                <span className="text-sm text-gray-600">
                  {mode === "FIXED"
                    ? "Fixed departure time"
                    : "Wait for all passengers"}
                </span>
              </label>
            ))}
          </div>
        </div>
        {form.defaultDropDepartureMode === "WAIT_ALL" && (
          <div className="py-3">
            <label className="text-sm font-medium text-gray-700">
              Default Wait Timeout (minutes)
            </label>
            <p className="text-xs text-gray-400 mt-0.5">
              Max minutes to wait for late passengers before departing
            </p>
            <input
              type="number"
              value={form.defaultDropWaitTimeoutMinutes}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultDropWaitTimeoutMinutes: Number(e.target.value),
                })
              }
              className="mt-1 w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
