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

interface ScheduleSlot {
  id: string;
  shiftTimingId: string;
  slotTime: string;
  transportType: string;
  vehicleType: string;
  capacity: number;
  departureMode: string;
  waitTimeoutMinutes: number;
  earlyPickupOffsetMinutes: number;
  earlyPickupBufferMinutes: number;
  sequenceOrder: number;
  availableFrom: string;
  availableUntil: string;
  isActive: boolean;
  generatedFromPattern: boolean;
}

interface ShiftTiming {
  id: string;
  shiftName: string;
  shiftCode: string;
  pickupStartTime: string;
  pickupEndTime: string;
  slotIntervalMinutes: number;
  transportTypes: string;
}

const DAYS = ["0", "1", "2", "3", "4", "5", "6"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ScheduleSlotsPage() {
  const [tab, setTab] = useState<"generated" | "manual">("generated");
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [shiftTimings, setShiftTimings] = useState<ShiftTiming[]>([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showAddManual, setShowAddManual] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [genForm, setGenForm] = useState({
    shiftTimingId: "",
    startDate: "",
    endDate: "",
    daysOfWeek: [1, 2, 3, 4, 5],
    transportType: "CAB",
    siteId: "",
    capacity: 4,
  });

  const [manualForm, setManualForm] = useState({
    slotTime: "10:00",
    transportType: "CAB",
    vehicleType: "",
    capacity: 4,
    departureMode: "FIXED",
    waitTimeoutMinutes: 15,
    earlyPickupOffsetMinutes: 0,
    earlyPickupBufferMinutes: 0,
    availableFrom: "",
    availableUntil: "",
    siteId: "",
    shiftTimingId: "",
  });

  const loadSlots = useCallback(() => {
    let url = "/transport-config/slots?";
    if (filterType) url += `transportType=${filterType}&`;
    if (filterDate) url += `date=${filterDate}&`;
    api(url).then((d) => setSlots(d || []));
  }, [filterType, filterDate]);

  const loadShiftTimings = useCallback(() => {
    api("/transport-config/shift-timings").then((d) => setShiftTimings(d || []));
  }, []);

  useEffect(() => {
    loadSlots();
    loadShiftTimings();
  }, [loadSlots, loadShiftTimings]);

  const handleGenerate = async () => {
    const result = await api("/transport-config/slots/generate", {
      method: "POST",
      body: JSON.stringify(genForm),
    });
    if (result) {
      alert(`Generated ${result.generated} slots`);
      setShowGenerate(false);
      loadSlots();
    }
  };

  const handleAddManual = async () => {
    await api("/transport-config/slots", {
      method: "POST",
      body: JSON.stringify(manualForm),
    });
    setShowAddManual(false);
    loadSlots();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this slot?")) return;
    await api(`/transport-config/slots/${id}`, { method: "DELETE" });
    loadSlots();
  };

  const toggleGenDay = (day: number) => {
    setGenForm({
      ...genForm,
      daysOfWeek: genForm.daysOfWeek.includes(day)
        ? genForm.daysOfWeek.filter((d) => d !== day)
        : [...genForm.daysOfWeek, day],
    });
  };

  const generatedSlots = slots.filter((s) => s.generatedFromPattern);
  const manualSlots = slots.filter((s) => !s.generatedFromPattern);
  const displaySlots = tab === "generated" ? generatedSlots : manualSlots;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Schedule Slots</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setGenForm({
                shiftTimingId: "",
                startDate: "",
                endDate: "",
                daysOfWeek: [1, 2, 3, 4, 5],
                transportType: "CAB",
                siteId: "",
                capacity: 4,
              });
              setShowGenerate(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            Generate from Pattern
          </button>
          <button
            onClick={() => {
              setManualForm({
                slotTime: "10:00",
                transportType: "CAB",
                vehicleType: "",
                capacity: 4,
                departureMode: "FIXED",
                waitTimeoutMinutes: 15,
                earlyPickupOffsetMinutes: 0,
                earlyPickupBufferMinutes: 0,
                availableFrom: "",
                availableUntil: "",
                siteId: "",
                shiftTimingId: "",
              });
              setShowAddManual(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Add Slot
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("generated")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            tab === "generated"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Auto-Generated ({generatedSlots.length})
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            tab === "manual"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Manual ({manualSlots.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="CAB">CAB</option>
          <option value="SHUTTLE">SHUTTLE</option>
          <option value="BUS">BUS</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Filter by date"
        />
      </div>

      {/* Slots Table */}
      <div className="bg-white rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Time</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Capacity</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Departure</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Early Pickup</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Period</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displaySlots.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  No {tab === "generated" ? "generated" : "manual"} slots found
                </td>
              </tr>
            ) : (
              displaySlots.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{s.slotTime}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        s.transportType === "CAB"
                          ? "bg-blue-100 text-blue-700"
                          : s.transportType === "SHUTTLE"
                          ? "bg-green-100 text-green-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {s.transportType}
                    </span>
                  </td>
                  <td className="py-3 px-4">{s.capacity}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        s.departureMode === "WAIT_ALL"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.departureMode}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {s.earlyPickupOffsetMinutes > 0 ? (
                      <span className="text-xs text-green-600">
                        -{s.earlyPickupOffsetMinutes}m / {s.earlyPickupBufferMinutes}m
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500">
                    {new Date(s.availableFrom).toLocaleDateString()} -{" "}
                    {new Date(s.availableUntil).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(s.id)}
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

      {/* Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Generate Slots from Pattern</h3>
              <button
                onClick={() => setShowGenerate(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Shift Timing *</label>
                <select
                  value={genForm.shiftTimingId}
                  onChange={(e) =>
                    setGenForm({ ...genForm, shiftTimingId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select shift timing...</option>
                  {shiftTimings.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.shiftName} ({st.pickupStartTime} - {st.pickupEndTime})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Start Date *</label>
                  <input
                    type="date"
                    value={genForm.startDate}
                    onChange={(e) =>
                      setGenForm({ ...genForm, startDate: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">End Date *</label>
                  <input
                    type="date"
                    value={genForm.endDate}
                    onChange={(e) =>
                      setGenForm({ ...genForm, endDate: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Transport Type *</label>
                <select
                  value={genForm.transportType}
                  onChange={(e) =>
                    setGenForm({ ...genForm, transportType: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="CAB">CAB</option>
                  <option value="SHUTTLE">SHUTTLE</option>
                  <option value="BUS">BUS</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Days of Week</label>
                <div className="flex gap-2">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => toggleGenDay(Number(d))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        genForm.daysOfWeek.includes(Number(d))
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-white border-gray-200 text-gray-500"
                      }`}
                    >
                      {DAY_LABELS[i]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Capacity</label>
                <input
                  type="number"
                  value={genForm.capacity}
                  onChange={(e) =>
                    setGenForm({ ...genForm, capacity: Number(e.target.value) })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowGenerate(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!genForm.shiftTimingId || !genForm.startDate || !genForm.endDate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Modal */}
      {showAddManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Add Schedule Slot</h3>
              <button
                onClick={() => setShowAddManual(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Slot Time *</label>
                  <input
                    type="time"
                    value={manualForm.slotTime}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, slotTime: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Transport Type *</label>
                  <select
                    value={manualForm.transportType}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, transportType: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="CAB">CAB</option>
                    <option value="SHUTTLE">SHUTTLE</option>
                    <option value="BUS">BUS</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Capacity</label>
                  <input
                    type="number"
                    value={manualForm.capacity}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, capacity: Number(e.target.value) })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Departure Mode</label>
                  <select
                    value={manualForm.departureMode}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, departureMode: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="FIXED">FIXED</option>
                    <option value="WAIT_ALL">WAIT_ALL</option>
                  </select>
                </div>
              </div>
              {manualForm.departureMode === "WAIT_ALL" && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Wait Timeout (min)</label>
                  <input
                    type="number"
                    value={manualForm.waitTimeoutMinutes}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        waitTimeoutMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Early Pickup Offset (min)</label>
                  <input
                    type="number"
                    value={manualForm.earlyPickupOffsetMinutes}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        earlyPickupOffsetMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Early Pickup Buffer (min)</label>
                  <input
                    type="number"
                    value={manualForm.earlyPickupBufferMinutes}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        earlyPickupBufferMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Available From</label>
                  <input
                    type="date"
                    value={manualForm.availableFrom}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, availableFrom: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Available Until</label>
                  <input
                    type="date"
                    value={manualForm.availableUntil}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, availableUntil: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Link to Shift Timing</label>
                <select
                  value={manualForm.shiftTimingId}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, shiftTimingId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {shiftTimings.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.shiftName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowAddManual(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddManual}
                  disabled={!manualForm.slotTime || !manualForm.availableFrom || !manualForm.availableUntil}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
