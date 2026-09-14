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

interface ShiftTiming {
  id: string;
  shiftName: string;
  shiftCode: string;
  pickupStartTime: string;
  pickupEndTime: string;
  dropStartTime: string;
  dropEndTime: string;
  lastBookingCutoffMinutes: number;
  earlyBookingWindowHours: number;
  isFlexible: boolean;
  flexWindowMinutes: number;
  applicableDays: string;
  transportTypes: string;
  slotIntervalMinutes: number;
  earlyPickupEnabled: boolean;
  earlyPickupOffsetMinutes: number;
  earlyPickupBufferMinutes: number;
  dropDepartureMode: string;
  dropWaitTimeoutMinutes: number;
  dropDepartureOffsetMinutes: number;
  patternEnabled: boolean;
  isActive: boolean;
}

const defaultForm = {
  shiftName: "",
  shiftCode: "",
  pickupStartTime: "22:00",
  pickupEndTime: "06:00",
  dropStartTime: "21:30",
  dropEndTime: "06:30",
  lastBookingCutoffMinutes: 30,
  earlyBookingWindowHours: 24,
  isFlexible: false,
  flexWindowMinutes: 30,
  applicableDays: "MON,TUE,WED,THU,FRI",
  transportTypes: "CAB,SHUTTLE,BUS",
  slotIntervalMinutes: 60,
  earlyPickupEnabled: false,
  earlyPickupOffsetMinutes: 0,
  earlyPickupBufferMinutes: 30,
  dropDepartureMode: "FIXED",
  dropWaitTimeoutMinutes: 15,
  dropDepartureOffsetMinutes: 0,
  patternEnabled: false,
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const VEHICLE_TYPES = ["CAB", "SHUTTLE", "BUS"];
const INTERVALS = [30, 45, 60, 90, 120];

export default function ShiftTimingsPage() {
  const [timings, setTimings] = useState<ShiftTiming[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [previewSlots, setPreviewSlots] = useState<string[]>([]);

  const load = useCallback(() => {
    api(`/transport-config/shift-timings?search=${search}`).then((d) =>
      setTimings(d || [])
    );
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const generatePreview = () => {
    const slots: string[] = [];
    const [startH, startM] = form.pickupStartTime.split(":").map(Number);
    const [endH, endM] = form.pickupEndTime.split(":").map(Number);
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;
    const effectiveEnd = end <= current ? end + 24 * 60 : end;

    while (current < effectiveEnd) {
      const h = Math.floor((current % (24 * 60)) / 60);
      const m = current % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      current += form.slotIntervalMinutes;
    }
    setPreviewSlots(slots);
  };

  const handleSubmit = async () => {
    if (editingId) {
      await api(`/transport-config/shift-timings/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
    } else {
      await api("/transport-config/shift-timings", {
        method: "POST",
        body: JSON.stringify(form),
      });
    }
    setShowAdd(false);
    setEditingId(null);
    setForm(defaultForm);
    setPreviewSlots([]);
    load();
  };

  const handleEdit = (t: ShiftTiming) => {
    setForm({
      shiftName: t.shiftName,
      shiftCode: t.shiftCode,
      pickupStartTime: t.pickupStartTime,
      pickupEndTime: t.pickupEndTime,
      dropStartTime: t.dropStartTime,
      dropEndTime: t.dropEndTime,
      lastBookingCutoffMinutes: t.lastBookingCutoffMinutes,
      earlyBookingWindowHours: t.earlyBookingWindowHours,
      isFlexible: t.isFlexible,
      flexWindowMinutes: t.flexWindowMinutes,
      applicableDays: t.applicableDays,
      transportTypes: t.transportTypes,
      slotIntervalMinutes: t.slotIntervalMinutes,
      earlyPickupEnabled: t.earlyPickupEnabled,
      earlyPickupOffsetMinutes: t.earlyPickupOffsetMinutes,
      earlyPickupBufferMinutes: t.earlyPickupBufferMinutes,
      dropDepartureMode: t.dropDepartureMode,
      dropWaitTimeoutMinutes: t.dropWaitTimeoutMinutes,
      dropDepartureOffsetMinutes: t.dropDepartureOffsetMinutes,
      patternEnabled: t.patternEnabled,
    });
    setEditingId(t.id);
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this shift timing?")) return;
    await api(`/transport-config/shift-timings/${id}`, { method: "DELETE" });
    load();
  };

  const toggleDay = (day: string) => {
    const days = form.applicableDays.split(",").filter(Boolean);
    if (days.includes(day)) {
      setForm({ ...form, applicableDays: days.filter((d) => d !== day).join(",") });
    } else {
      setForm({ ...form, applicableDays: [...days, day].join(",") });
    }
  };

  const toggleVehicleType = (type: string) => {
    const types = form.transportTypes.split(",").filter(Boolean);
    if (types.includes(type)) {
      setForm({ ...form, transportTypes: types.filter((t) => t !== type).join(",") });
    } else {
      setForm({ ...form, transportTypes: [...types, type].join(",") });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Shift Timings</h2>
        <button
          onClick={() => {
            setForm(defaultForm);
            setEditingId(null);
            setPreviewSlots([]);
            setShowAdd(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Add Shift Timing
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search shift timings..."
        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
      />

      <div className="bg-white rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Shift</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Pickup Window</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Drop Window</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Interval</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Transport</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Departure</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Early Pickup</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {timings.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  No shift timings configured
                </td>
              </tr>
            ) : (
              timings.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium">{t.shiftName}</div>
                    <div className="text-xs text-gray-400">{t.shiftCode}</div>
                  </td>
                  <td className="py-3 px-4">
                    {t.pickupStartTime} - {t.pickupEndTime}
                  </td>
                  <td className="py-3 px-4">
                    {t.dropStartTime} - {t.dropEndTime}
                  </td>
                  <td className="py-3 px-4">{t.slotIntervalMinutes} min</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      {t.transportTypes.split(",").map((type) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 bg-gray-100 rounded text-xs"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        t.dropDepartureMode === "WAIT_ALL"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {t.dropDepartureMode}
                      {t.dropDepartureMode === "WAIT_ALL" &&
                        ` (${t.dropWaitTimeoutMinutes}m)`}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {t.earlyPickupEnabled ? (
                      <span className="text-xs text-green-600">
                        {t.earlyPickupOffsetMinutes}m offset, {t.earlyPickupBufferMinutes}m buffer
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Off</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleEdit(t)}
                      className="text-xs text-blue-600 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingId ? "Edit Shift Timing" : "Add Shift Timing"}
              </h3>
              <button
                onClick={() => {
                  setShowAdd(false);
                  setEditingId(null);
                  setPreviewSlots([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Shift Name *</label>
                  <input
                    value={form.shiftName}
                    onChange={(e) => setForm({ ...form, shiftName: e.target.value })}
                    placeholder="Night Shift"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Shift Code *</label>
                  <input
                    value={form.shiftCode}
                    onChange={(e) => setForm({ ...form, shiftCode: e.target.value })}
                    placeholder="NSHIFT"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Time Windows */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Time Windows</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Pickup Start</label>
                    <input
                      type="time"
                      value={form.pickupStartTime}
                      onChange={(e) => setForm({ ...form, pickupStartTime: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Pickup End</label>
                    <input
                      type="time"
                      value={form.pickupEndTime}
                      onChange={(e) => setForm({ ...form, pickupEndTime: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Drop Start</label>
                    <input
                      type="time"
                      value={form.dropStartTime}
                      onChange={(e) => setForm({ ...form, dropStartTime: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Drop End</label>
                    <input
                      type="time"
                      value={form.dropEndTime}
                      onChange={(e) => setForm({ ...form, dropEndTime: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Transport & Interval */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Transport & Interval</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Transport Types</label>
                    <div className="flex gap-2">
                      {VEHICLE_TYPES.map((type) => (
                        <button
                          key={type}
                          onClick={() => toggleVehicleType(type)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                            form.transportTypes.includes(type)
                              ? "bg-blue-100 border-blue-300 text-blue-700"
                              : "bg-white border-gray-200 text-gray-500"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Slot Interval</label>
                    <select
                      value={form.slotIntervalMinutes}
                      onChange={(e) =>
                        setForm({ ...form, slotIntervalMinutes: Number(e.target.value) })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      {INTERVALS.map((i) => (
                        <option key={i} value={i}>
                          {i} minutes
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Early Pickup */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Early Pickup Configuration</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.earlyPickupEnabled}
                      onChange={(e) =>
                        setForm({ ...form, earlyPickupEnabled: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">Enable early pickup</span>
                  </label>
                  {form.earlyPickupEnabled && (
                    <div className="grid grid-cols-2 gap-4 ml-6">
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">
                          Pickup Offset (minutes before shift)
                        </label>
                        <input
                          type="number"
                          value={form.earlyPickupOffsetMinutes}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              earlyPickupOffsetMinutes: Number(e.target.value),
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <p className="text-xs text-gray-400">
                          E.g., 120 = pick employee 2 hours before shift start
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">
                          Arrival Buffer (minutes)
                        </label>
                        <input
                          type="number"
                          value={form.earlyPickupBufferMinutes}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              earlyPickupBufferMinutes: Number(e.target.value),
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <p className="text-xs text-gray-400">
                          E.g., 30 = employee should be ready 30min before shift
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Drop Departure */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Drop Departure Policy</h4>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    {["FIXED", "WAIT_ALL"].map((mode) => (
                      <label key={mode} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="departureMode"
                          value={mode}
                          checked={form.dropDepartureMode === mode}
                          onChange={(e) =>
                            setForm({ ...form, dropDepartureMode: e.target.value })
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
                  {form.dropDepartureMode === "WAIT_ALL" && (
                    <div className="grid grid-cols-2 gap-4 ml-6">
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">
                          Wait Timeout (minutes)
                        </label>
                        <input
                          type="number"
                          value={form.dropWaitTimeoutMinutes}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              dropWaitTimeoutMinutes: Number(e.target.value),
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">
                          Departure Offset (minutes after drop time)
                        </label>
                        <input
                          type="number"
                          value={form.dropDepartureOffsetMinutes}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              dropDepartureOffsetMinutes: Number(e.target.value),
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Applicable Days */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Applicable Days</h4>
                <div className="flex gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        form.applicableDays.includes(day)
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-white border-gray-200 text-gray-500"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pattern */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Pattern Generation</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.patternEnabled}
                      onChange={(e) =>
                        setForm({ ...form, patternEnabled: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">
                      Enable pattern-based slot generation
                    </span>
                  </label>
                  {form.patternEnabled && (
                    <button
                      onClick={generatePreview}
                      className="ml-6 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200"
                    >
                      Preview Generated Slots
                    </button>
                  )}
                  {previewSlots.length > 0 && (
                    <div className="ml-6 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-2">
                        Generated slots ({previewSlots.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {previewSlots.map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cutoff Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-600">Last Booking Cutoff (min)</label>
                  <input
                    type="number"
                    value={form.lastBookingCutoffMinutes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lastBookingCutoffMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-600">Early Booking Window (hrs)</label>
                  <input
                    type="number"
                    value={form.earlyBookingWindowHours}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        earlyBookingWindowHours: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowAdd(false);
                    setEditingId(null);
                    setPreviewSlots([]);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.shiftName || !form.shiftCode}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
