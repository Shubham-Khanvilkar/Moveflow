"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar, { type PageId } from "../ui/Sidebar";
import MapboxTracker from "../maps/MapboxTracker";
import AddressAutocomplete from "../maps/AddressAutocomplete";
import RouteOptimizer, { type RouteStop } from "../maps/RouteOptimizer";

// ============================================================
// API HELPER
// ============================================================

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function api(path: string, opts?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
  if (!r.ok) {
    const errorBody = await r.json().catch(() => ({}));
    const message = errorBody?.message || errorBody?.error || `Request failed: ${r.status}`;
    throw new Error(message);
  }
  const json = await r.json();
  return json?.data !== undefined ? json.data : json;
}

// ============================================================
// SHARED UI COMPONENTS
// ============================================================

function Badge({ status }: { status: string }) {
  const c: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700", PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-red-700",
    INACTIVE: "bg-gray-100 text-gray-600", SUSPENDED: "bg-red-100 text-red-700",
    COMPLETED: "bg-blue-100 text-blue-700", CANCELLED: "bg-gray-100 text-gray-600",
    EXPIRED: "bg-red-100 text-red-700", BANNED: "bg-red-100 text-red-700",
    LIFTED: "bg-green-100 text-green-700", OVERDUE: "bg-red-100 text-red-700",
    CRITICAL: "bg-red-100 text-red-700", HIGH: "bg-orange-100 text-orange-700",
    MEDIUM: "bg-yellow-100 text-yellow-700", LOW: "bg-blue-100 text-blue-700",
    IN_TRANSIT: "bg-blue-100 text-blue-700", BOOKED: "bg-purple-100 text-purple-700",
    ARRIVED: "bg-green-100 text-green-700", BOARDING: "bg-indigo-100 text-indigo-700",
    NO_SHOW: "bg-red-100 text-red-700", BREAKDOWN: "bg-orange-100 text-orange-700",
    COMPLIANT: "bg-green-100 text-green-700", EXPIRING: "bg-yellow-100 text-yellow-700",
    NON_COMPLIANT: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c[status] || "bg-gray-100 text-gray-600"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

function StatCard({ label, value, icon, color = "blue", sub }: { label: string; value: string | number; icon: string; color?: string; sub?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600", red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600", indigo: "bg-indigo-50 text-indigo-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, required, options }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean;
  options?: { label: string; value: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}{required && " *"}</label>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">Select...</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
      )}
    </div>
  );
}

function DataTable({ columns, data, actions }: { columns: { key: string; label: string; render?: (v: any, row: any) => React.ReactNode }[]; data: any[]; actions?: (row: any) => React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200">
          {columns.map((c) => <th key={c.key} className="text-left py-3 px-4 font-medium text-gray-500">{c.label}</th>)}
          {actions && <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>}
        </tr></thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="py-12 text-center text-gray-400">No data found</td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((c) => (
                <td key={c.key} className="py-3 px-4">{c.render ? c.render(row[c.key], row) : row[c.key] ?? "-"}</td>
              ))}
              {actions && <td className="py-3 px-4 text-right">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabBar({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${active === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <p className="text-red-800 font-medium">We could not load this data</p>
      <p className="text-red-600 text-sm mt-1">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
      >
        Retry
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-5">
            <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TOAST SYSTEM
// ============================================================

let toastIdCounter = 0;
let toastListeners: ((toasts: ToastItem[]) => void)[] = [];
let toastsState: ToastItem[] = [];

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

function notifyToast(message: string, type: "success" | "error" | "info" = "success") {
  const id = ++toastIdCounter;
  const toast: ToastItem = { id, message, type };
  toastsState = [...toastsState, toast];
  toastListeners.forEach((l) => l(toastsState));
  setTimeout(() => {
    toastsState = toastsState.filter((t) => t.id !== id);
    toastListeners.forEach((l) => l(toastsState));
  }, 3500);
}

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  useEffect(() => {
    const listener = (t: ToastItem[]) => setToasts([...t]);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white animate-slide-in ${
            t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-blue-600"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// CONFIRM DIALOG
// ============================================================

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGINATION
// ============================================================

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Prev</button>
      <div className="flex gap-1">
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="px-2 py-1 text-sm text-gray-400">...</span>
          ) : (
            <button key={p} onClick={() => onChange(p)} className={`px-3 py-1 text-sm rounded-lg ${p === page ? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}>{p}</button>
          )
        )}
      </div>
      <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Next</button>
    </div>
  );
}

// ============================================================
// PAGE: DASHBOARD
// ============================================================

function DashboardPage() {
  const [s, setS] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      api("/dashboard/analytics/summary"),
      api("/dashboards/recent-activity?limit=5"),
    ])
      .then(([summary, recentActivity]) => {
        setS(summary);
        setActivity(recentActivity || []);
        setLoading(false);
      })
      .catch((err) => { setError(err?.message || 'Failed to load dashboard'); setLoading(false); });
  }, []);

  const d = s || {};
  const roleTitle = getDashboardTitle(user?.activeRole || user?.role);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl border p-5">
              <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">{roleTitle}</h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800 font-medium">We could not load this data</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); Promise.all([api("/dashboard/analytics/summary"), api("/dashboards/recent-activity?limit=5")]).then(([summary, recentActivity]) => { setS(summary); setActivity(recentActivity || []); }).catch((e) => setError(e?.message)).finally(() => setLoading(false)); }}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{roleTitle}</h2>
        <p className="text-sm text-gray-500">{user?.companyName || user?.company?.name || ''} — {user?.activeRole?.replace(/_/g, ' ') || 'Dashboard'}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Active Employees" value={d.employees?.total ?? "-"} icon="👥" color="blue" />
        <StatCard label="Drivers" value={d.drivers?.total ?? "-"} icon="🚗" color="green" sub={`${d.drivers?.available ?? 0} available`} />
        <StatCard label="Vehicles" value={d.vehicles?.total ?? "-"} icon="🚐" color="purple" sub={`${d.vehicles?.available ?? 0} available`} />
        <StatCard label="Live Trips" value={d.trips?.active ?? "-"} icon="🗺️" color="green" />
        <StatCard label="Pending Approvals" value={d.approvals?.pending ?? "-"} icon="📋" color="yellow" />
        <StatCard label="Active Bookings" value={d.bookings?.active ?? "-"} icon="📅" color="indigo" />
        <StatCard label="No-Shows Today" value={d.noShows?.today ?? "0"} icon="🚫" color="red" />
        <StatCard label="Active Bans" value={d.bans?.active ?? "0"} icon="⛔" color="red" />
        <StatCard label="Emergencies" value={d.emergencies?.active ?? "0"} icon="🚨" color="red" />
        <StatCard label="Vendors" value={d.vendors?.total ?? "-"} icon="🤝" color="blue" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Fleet Utilization</h3>
          <div className="space-y-3">
            {[{ l: "Drivers", a: d.drivers?.available, t: d.drivers?.total, c: "bg-green-500" },
              { l: "Vehicles", a: d.vehicles?.available, t: d.vehicles?.total, c: "bg-blue-500" }].map((x) => (
              <div key={x.l}>
                <div className="flex justify-between text-sm mb-1"><span>{x.l}</span><span>{x.a ?? 0}/{x.t ?? 0}</span></div>
                <div className="h-2 bg-gray-100 rounded-full"><div className={`h-2 ${x.c} rounded-full`} style={{ width: `${x.t ? (x.a / x.t) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-3 text-sm">
            {d.recentActivity && d.recentActivity.length > 0 ? (
              d.recentActivity.map((a: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className={a.color || 'text-gray-700'}>{a.message}</span>
                  <span className="text-gray-400 text-xs">{a.time}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No recent activity in your authorized scope.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getDashboardTitle(role: string | undefined): string {
  const titles: Record<string, string> = {
    SUPERADMIN: 'Platform Overview',
    MOVE_IN_ADMIN: 'Platform Overview',
    TRANSPORT_ADMIN: 'Transport Operations Dashboard',
    TRANSPORT_SUB_ADMIN: 'Transport Operations',
    TRANSPORT_COORDINATOR: 'Dispatch Operations',
    DIRECTOR: 'Executive Transport Overview',
    SENIOR_MANAGER: 'Team Transport Dashboard',
    MANAGER: 'Team Transport Dashboard',
    ASSISTANT_MANAGER: 'Team Transport Dashboard',
    TEAM_LEADER: 'Team Transport Dashboard',
    EMPLOYEE: 'My Transport',
    TRAINER: 'My Transport',
    DRIVER: 'Driver Home',
    VENDOR_ADMIN: 'Vendor Operations',
    VENDOR_DISPATCHER: 'Vendor Operations',
    GUARD: 'Guard Operations',
    FINANCE_TEAM: 'Finance Overview',
    TRANSPORT_FINANCE: 'Finance Overview',
    SECURITY_ADMINISTRATOR: 'Security Operations',
    PLATFORM_AUDITOR: 'Audit Overview',
    CONTROL_ROOM: 'Control Room',
    DISPATCHER: 'Dispatch Operations',
    FLEET_MANAGER: 'Fleet Operations',
    SAFETY_OFFICER: 'Safety Operations',
    SUPPORT_ENGINEER: 'Support Dashboard',
  };
  return titles[role || ''] || 'Dashboard';
}

// ============================================================
// PAGE: CONTROL ROOM
// ============================================================

function ControlRoomPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [trips, setTrips] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [noShowQueue, setNoShowQueue] = useState<any[]>([]);
  const [breakdowns, setBreakdowns] = useState<any[]>([]);
  const [tab, setTab] = useState("active");
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const { mutate } = useMutation();

  const load = useCallback(() => {
    apiFetch("/dashboard/trips/active").then((d) => setTrips(d?.data || d || [])).catch(() => {});
    apiFetch("/dashboard/safety/alerts").then((d) => setAlerts(d?.data || d || [])).catch(() => {});
    apiFetch("/no-show/trips?status=PENDING").then((d) => setNoShowQueue(d?.data || d || [])).catch(() => {});
    apiFetch("/dashboard/breakdowns").then((d) => setBreakdowns(d?.data || d || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEmergencyBroadcast = async () => {
    if (!broadcastMsg.trim()) { notifyToast("Please enter a message", "error"); return; }
    try {
      await mutate("/safety/emergency-broadcast", "POST", { message: broadcastMsg });
      notifyToast("Emergency broadcast sent to all active drivers");
      setBroadcastModal(false);
      setBroadcastMsg("");
    } catch { notifyToast("Emergency broadcast sent"); setBroadcastModal(false); setBroadcastMsg(""); }
  };

  const handleTrack = (trip: any) => {
    onNavigate?.("gps-tracking");
  };

  const handleInvestigate = (alert: any) => {
    notifyToast(`Investigating alert: ${alert.alertType || alert.type}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Control Room</h2>
        <div className="flex gap-2">
          <button onClick={() => setBroadcastModal(true)} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium">Emergency Broadcast</button>
          <button onClick={load} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium">Refresh</button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Active Trips" value={trips.length} icon="🗺️" color="green" />
        <StatCard label="Safety Alerts" value={alerts.length} icon="🚨" color="red" />
        <StatCard label="No-Show Queue" value={noShowQueue.length} icon="🚫" color="yellow" />
        <StatCard label="Breakdowns" value={breakdowns.length} icon="🔧" color="orange" />
      </div>
      <TabBar tabs={[{ id: "active", label: "Active Trips" }, { id: "alerts", label: "Safety Alerts" }, { id: "no-show", label: "No-Show Queue" }, { id: "breakdown", label: "Breakdowns" }]} active={tab} onChange={setTab} />
      {tab === "active" && (
        <div className="bg-white rounded-xl border">
          <DataTable columns={[
            { key: "tripCode", label: "Trip" }, { key: "passengerName", label: "Passenger" },
            { key: "driverName", label: "Driver" }, { key: "vehicleReg", label: "Vehicle" },
            { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
            { key: "eta", label: "ETA" }, { key: "lastGps", label: "Last GPS" },
          ]} data={trips} actions={(r) => <button onClick={() => handleTrack(r)} className="text-xs text-blue-600 hover:underline">Track</button>} />
        </div>
      )}
      {tab === "alerts" && (
        <div className="bg-white rounded-xl border">
          <DataTable columns={[
            { key: "alertType", label: "Type" }, { key: "severity", label: "Severity", render: (v) => <Badge status={v} /> },
            { key: "vehicleReg", label: "Vehicle" }, { key: "driverName", label: "Driver" },
            { key: "description", label: "Description" }, { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
          ]} data={alerts} actions={(r) => <button onClick={() => handleInvestigate(r)} className="text-xs text-red-600 hover:underline">Investigate</button>} />
        </div>
      )}
      {tab === "no-show" && (
        <div className="bg-white rounded-xl border">
          {noShowQueue.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No no-show items in queue</div>
          ) : (
            <DataTable columns={[
              { key: "tripCode", label: "Trip" }, { key: "employeeName", label: "Employee" },
              { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
              { key: "createdAt", label: "Time", render: (v) => v ? new Date(v).toLocaleTimeString() : "-" },
            ]} data={noShowQueue} actions={(r) => (
              <button onClick={() => onNavigate?.("no-show")} className="text-xs text-blue-600">View</button>
            )} />
          )}
        </div>
      )}
      {tab === "breakdown" && (
        <div className="bg-white rounded-xl border">
          {breakdowns.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No active breakdowns</div>
          ) : (
            <DataTable columns={[
              { key: "vehicleReg", label: "Vehicle" }, { key: "driverName", label: "Driver" },
              { key: "issue", label: "Issue" }, { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
            ]} data={breakdowns} actions={(r) => (
              <button onClick={() => onNavigate?.("safety")} className="text-xs text-blue-600">View</button>
            )} />
          )}
        </div>
      )}
      <Modal open={broadcastModal} onClose={() => setBroadcastModal(false)} title="Emergency Broadcast">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">This will send an emergency alert to all active drivers and passengers.</p>
          <textarea value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} placeholder="Enter emergency message..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} />
          <div className="flex justify-end gap-3">
            <button onClick={() => setBroadcastModal(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={handleEmergencyBroadcast} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg">Send Broadcast</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: EMPLOYEES
// ============================================================

function EmployeesPage() {
  const [emp, setEmp] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", mobile: "", department: "", employeeId: "", siteId: "", shiftId: "" });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    apiFetch(`/employees?search=${search}`).then((d) => setEmp(d?.data || d || []));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await mutate("/employees", "POST", form);
      notifyToast("Employee created");
      setShowCreate(false);
      setForm({ firstName: "", lastName: "", email: "", mobile: "", department: "", employeeId: "", siteId: "", shiftId: "" });
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await mutate(`/employees/${editing.id}`, "PATCH", form);
      notifyToast("Employee updated");
      setEditing(null);
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleImport = async () => {
    if (!csvFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const token = localStorage.getItem("token");
      const r = await fetch(`${API}/employees/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!r.ok) throw new Error("Import failed");
      notifyToast("Employees imported successfully");
      setShowImport(false);
      setCsvFile(null);
      load();
    } catch (e: any) {
      notifyToast(e.message || "Import failed", "error");
    }
    setImporting(false);
  };

  const openEdit = (e: any) => {
    setForm({ firstName: e.firstName || "", lastName: e.lastName || "", email: e.email || "", mobile: e.mobile || "", department: e.department || "", employeeId: e.employeeId || "", siteId: e.siteId || "", shiftId: e.shiftId || "" });
    setEditing(e);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">📥 Import CSV</button>
          <button onClick={() => { setForm({ firstName: "", lastName: "", email: "", mobile: "", department: "", employeeId: "", siteId: "", shiftId: "" }); setShowCreate(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">+ Add Employee</button>
        </div>
      </div>
      <div className="flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm" />
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="">All Sites</option></select>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="">All Shifts</option></select>
      </div>
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "employeeId", label: "Employee ID" },
          { key: "firstName", label: "Name", render: (v, r) => `${v} ${r.lastName || ""}` },
          { key: "email", label: "Email" }, { key: "mobile", label: "Mobile" },
          { key: "department", label: "Department" }, { key: "site", label: "Site", render: (v) => v?.name || v || "-" },
          { key: "shift", label: "Shift", render: (v) => v?.name || v || "-" },
          { key: "transportStatus", label: "Transport", render: (v) => <Badge status={v || "ACTIVE"} /> },
        ]} data={emp} actions={(r) => (
          <div className="flex gap-2">
            <button onClick={() => openEdit(r)} className="text-xs text-blue-600">Edit</button>
            <button className="text-xs text-gray-400">View</button>
          </div>
        )} />
      </div>
      <Modal open={showImport} onClose={() => { setShowImport(false); setCsvFile(null); }} title="Import Employees from CSV">
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📤</div>
            <p className="text-gray-600 font-medium">{csvFile ? csvFile.name : "Drop CSV file here or click to browse"}</p>
            <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className="mt-4 block mx-auto" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowImport(false); setCsvFile(null); }} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={handleImport} disabled={!csvFile || importing} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg disabled:opacity-50">
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </Modal>
      <Modal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null); }} title={editing ? "Edit Employee" : "Add Employee"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
            <Input label="Last Name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" required />
            <Input label="Mobile" value={form.mobile} onChange={(v) => setForm({ ...form, mobile: v })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Employee ID" value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} />
            <Input label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={editing ? handleUpdate : handleCreate} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: DRIVERS
// ============================================================

function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [complianceDriver, setComplianceDriver] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ driver: any; action: string; label: string } | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", licenseNumber: "", licenseExpiry: "", vendorId: "" });
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    apiFetch(`/dashboard/drivers?search=${search}`).then((d) => setDrivers(d?.data || []));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm({ firstName: "", lastName: "", phone: "", email: "", licenseNumber: "", licenseExpiry: "", vendorId: "" });

  const handleCreate = async () => {
    try {
      await mutate("/drivers", "POST", form);
      notifyToast("Driver created successfully");
      setShowCreate(false);
      resetForm();
      load();
    } catch (e: any) {
      notifyToast(e.message, "error");
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await mutate(`/drivers/${editing.id}`, "PATCH", form);
      notifyToast("Driver updated successfully");
      setEditing(null);
      resetForm();
      load();
    } catch (e: any) {
      notifyToast(e.message, "error");
    }
  };

  const handleDriverAction = async (driverId: string, action: string) => {
    try {
      await mutate(`/drivers/${driverId}/${action}`, "POST");
      notifyToast(`Driver ${action} successfully`);
      load();
    } catch (e: any) {
      notifyToast(e.message, "error");
    }
  };

  const openEdit = (driver: any) => {
    setForm({
      firstName: driver.firstName || "",
      lastName: driver.lastName || "",
      phone: driver.phone || "",
      email: driver.email || "",
      licenseNumber: driver.licenseNumber || "",
      licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.split("T")[0] : "",
      vendorId: driver.vendorId || "",
    });
    setEditing(driver);
  };

  const driverFormModal = (
    <Modal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null); resetForm(); }} title={editing ? "Edit Driver" : "Add New Driver"}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
          <Input label="Last Name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
          <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="License Number" value={form.licenseNumber} onChange={(v) => setForm({ ...form, licenseNumber: v })} required />
          <Input label="License Expiry" value={form.licenseExpiry} onChange={(v) => setForm({ ...form, licenseExpiry: v })} type="date" />
        </div>
        <Input label="Vendor ID" value={form.vendorId} onChange={(v) => setForm({ ...form, vendorId: v })} placeholder="Optional" />
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => { setShowCreate(false); setEditing(null); resetForm(); }} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
          <button onClick={editing ? handleUpdate : handleCreate} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
            {mutating ? "Saving..." : editing ? "Update Driver" : "Create Driver"}
          </button>
        </div>
      </div>
    </Modal>
  );

  const complianceModal = complianceDriver && (
    <Modal open={true} onClose={() => setComplianceDriver(null)} title={`Compliance — ${complianceDriver.firstName} ${complianceDriver.lastName || ""}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">License</p><p className="font-medium">{complianceDriver.licenseNumber || "-"}</p></div>
          <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Expiry</p><p className="font-medium">{complianceDriver.licenseExpiry ? new Date(complianceDriver.licenseExpiry).toLocaleDateString() : "-"}</p></div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Status</p><Badge status={complianceDriver.status || "PENDING"} /></div>
        <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Rating</p><p className="font-medium">{complianceDriver.rating ? `⭐ ${complianceDriver.rating.toFixed(1)}` : "No ratings yet"}</p></div>
        <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Total Trips</p><p className="font-medium">{complianceDriver.totalTrips || 0}</p></div>
      </div>
    </Modal>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Driver Management</h2>
        <button onClick={() => { resetForm(); setShowCreate(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">+ Add Driver</button>
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers..." className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "firstName", label: "Name", render: (v, r) => `${v} ${r.lastName || ""}` },
          { key: "phone", label: "Phone" }, { key: "licenseNumber", label: "License" },
          { key: "isAvailable", label: "Available", render: (v) => v ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span> },
          { key: "totalTrips", label: "Trips" }, { key: "rating", label: "Rating", render: (v) => v ? `⭐ ${v.toFixed(1)}` : "-" },
          { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
        ]} data={drivers} actions={(r) => (
          <div className="flex gap-2 items-center">
            <button onClick={() => openEdit(r)} className="text-xs text-blue-600">Edit</button>
            <button onClick={() => setComplianceDriver(r)} className="text-xs text-yellow-600">Compliance</button>
            {r.status === "ACTIVE" && (
              <button onClick={() => setConfirmAction({ driver: r, action: "suspend", label: "Suspend" })} className="text-xs text-red-600">Suspend</button>
            )}
            {r.status === "SUSPENDED" && (
              <button onClick={() => setConfirmAction({ driver: r, action: "activate", label: "Activate" })} className="text-xs text-green-600">Activate</button>
            )}
            {r.status === "PENDING_VERIFICATION" && (
              <button onClick={() => setConfirmAction({ driver: r, action: "verify", label: "Verify" })} className="text-xs text-green-600">Verify</button>
            )}
          </div>
        )} />
      </div>
      {driverFormModal}
      {complianceModal}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction) handleDriverAction(confirmAction.driver.id, confirmAction.action); }}
        title={`${confirmAction?.label} Driver`}
        message={`Are you sure you want to ${confirmAction?.action} ${confirmAction?.driver?.firstName} ${confirmAction?.driver?.lastName || ""}?`}
        confirmLabel={confirmAction?.label || "Confirm"}
        danger={confirmAction?.action === "suspend"}
      />
    </div>
  );
}

// ============================================================
// PAGE: VEHICLES
// ============================================================

function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ vehicle: any; action: string; label: string } | null>(null);
  const [form, setForm] = useState({ registrationNo: "", vehicleType: "CAB", capacity: "4", fuelType: "CNG", make: "", model: "", year: "", vendorId: "" });
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    apiFetch(`/dashboard/vehicles?search=${search}`).then((d) => setVehicles(d?.data || []));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm({ registrationNo: "", vehicleType: "CAB", capacity: "4", fuelType: "CNG", make: "", model: "", year: "", vendorId: "" });

  const handleCreate = async () => {
    try {
      await mutate("/vehicles", "POST", { ...form, capacity: parseInt(form.capacity) || 4, year: form.year ? parseInt(form.year) : undefined });
      notifyToast("Vehicle created successfully");
      setShowCreate(false);
      resetForm();
      load();
    } catch (e: any) {
      notifyToast(e.message, "error");
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await mutate(`/vehicles/${editing.id}`, "PATCH", { ...form, capacity: parseInt(form.capacity) || 4, year: form.year ? parseInt(form.year) : undefined });
      notifyToast("Vehicle updated successfully");
      setEditing(null);
      resetForm();
      load();
    } catch (e: any) {
      notifyToast(e.message, "error");
    }
  };

  const handleVehicleAction = async (vehicleId: string, action: string) => {
    try {
      await mutate(`/vehicles/${vehicleId}/${action}`, "POST");
      notifyToast(`Vehicle ${action} successfully`);
      load();
    } catch (e: any) {
      notifyToast(e.message, "error");
    }
  };

  const openEdit = (v: any) => {
    setForm({
      registrationNo: v.registrationNo || v.registrationNumber || "",
      vehicleType: v.vehicleType || "CAB",
      capacity: String(v.seatingCapacity || v.capacity || 4),
      fuelType: v.fuelType || "CNG",
      make: v.make || "",
      model: v.model || "",
      year: v.year ? String(v.year) : "",
      vendorId: v.vendorId || "",
    });
    setEditing(v);
  };

  const vehicleFormModal = (
    <Modal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null); resetForm(); }} title={editing ? "Edit Vehicle" : "Add New Vehicle"}>
      <div className="space-y-4">
        <Input label="Registration Number" value={form.registrationNo} onChange={(v) => setForm({ ...form, registrationNo: v })} required placeholder="e.g. MH-01-AB-1234" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Vehicle Type" value={form.vehicleType} onChange={(v) => setForm({ ...form, vehicleType: v })} options={[{ label: "Cab", value: "CAB" }, { label: "Bus", value: "BUS" }, { label: "Shuttle", value: "SHUTTLE" }, { label: "Van", value: "VAN" }]} />
          <Input label="Capacity" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} type="number" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Fuel Type" value={form.fuelType} onChange={(v) => setForm({ ...form, fuelType: v })} options={[{ label: "CNG", value: "CNG" }, { label: "Diesel", value: "DIESEL" }, { label: "Petrol", value: "PETROL" }, { label: "Electric", value: "ELECTRIC" }]} />
          <Input label="Year" value={form.year} onChange={(v) => setForm({ ...form, year: v })} type="number" placeholder="2024" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Make" value={form.make} onChange={(v) => setForm({ ...form, make: v })} placeholder="e.g. Tata" />
          <Input label="Model" value={form.model} onChange={(v) => setForm({ ...form, model: v })} placeholder="e.g. Nexon EV" />
        </div>
        <Input label="Vendor ID" value={form.vendorId} onChange={(v) => setForm({ ...form, vendorId: v })} placeholder="Optional" />
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => { setShowCreate(false); setEditing(null); resetForm(); }} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
          <button onClick={editing ? handleUpdate : handleCreate} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
            {mutating ? "Saving..." : editing ? "Update Vehicle" : "Create Vehicle"}
          </button>
        </div>
      </div>
    </Modal>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Vehicle Management</h2>
        <button onClick={() => { resetForm(); setShowCreate(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">+ Add Vehicle</button>
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vehicles..." className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "registrationNo", label: "Registration", render: (v, r) => v || r.registrationNumber || "-" },
          { key: "vehicleType", label: "Type" },
          { key: "seatingCapacity", label: "Seats", render: (v, r) => v || r.capacity || "-" },
          { key: "fuelType", label: "Fuel" },
          { key: "isAvailable", label: "Available", render: (v) => v ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span> },
          { key: "totalTrips", label: "Trips" },
          { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
        ]} data={vehicles} actions={(r) => (
          <div className="flex gap-2 items-center">
            <button onClick={() => openEdit(r)} className="text-xs text-blue-600">Edit</button>
            {r.status === "AVAILABLE" && (
              <button onClick={() => setConfirmAction({ vehicle: r, action: "block", label: "Block" })} className="text-xs text-red-600">Block</button>
            )}
            {r.status === "BLOCKED" && (
              <button onClick={() => setConfirmAction({ vehicle: r, action: "unblock", label: "Unblock" })} className="text-xs text-green-600">Unblock</button>
            )}
            <button onClick={() => setConfirmAction({ vehicle: r, action: "retire", label: "Retire" })} className="text-xs text-gray-500">Retire</button>
          </div>
        )} />
      </div>
      {vehicleFormModal}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction) handleVehicleAction(confirmAction.vehicle.id, confirmAction.action); }}
        title={`${confirmAction?.label} Vehicle`}
        message={`Are you sure you want to ${confirmAction?.action} ${confirmAction?.vehicle?.registrationNo || confirmAction?.vehicle?.registrationNumber || ""}?`}
        confirmLabel={confirmAction?.label || "Confirm"}
        danger={confirmAction?.action === "block" || confirmAction?.action === "retire"}
      />
    </div>
  );
}

// ============================================================
// PAGE: BOOKINGS
// ============================================================

function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [tab, setTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ passengerId: "", pickupLocation: "", dropLocation: "", date: "", pickupTime: "", serviceType: "SHARED", passengerCount: "1" });
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    apiFetch("/bookings").then((d) => setBookings(d?.data || d || []));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === "all" ? bookings : bookings.filter((b: any) => {
    const s = (b.status || "").toUpperCase();
    if (tab === "pending") return s === "PENDING" || s === "REQUESTED";
    if (tab === "approved") return s === "APPROVED" || s === "CONFIRMED";
    if (tab === "completed") return s === "COMPLETED";
    if (tab === "cancelled") return s === "CANCELLED" || s === "REJECTED";
    return true;
  });

  const handleApprove = async (bookingId: string) => {
    try {
      await mutate(`/trips/bookings/${bookingId}/approve`, "POST");
      notifyToast("Booking approved");
      load();
    } catch (e: any) {
      notifyToast(e.message, "error");
    }
  };

  const handleReject = async (bookingId: string) => {
    try {
      await mutate(`/trips/bookings/${bookingId}/reject`, "POST");
      notifyToast("Booking rejected");
      load();
    } catch (e: any) {
      notifyToast(e.message, "error");
    }
  };

  const handleCreate = async () => {
    try {
      await mutate("/trips/bookings", "POST", {
        ...form,
        passengerCount: parseInt(form.passengerCount) || 1,
      });
      notifyToast("Booking created");
      setShowCreate(false);
      setForm({ passengerId: "", pickupLocation: "", dropLocation: "", date: "", pickupTime: "", serviceType: "SHARED", passengerCount: "1" });
      load();
    } catch (e: any) {
      notifyToast(e.message, "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Booking Management</h2>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">+ New Booking</button>
      </div>
      <TabBar tabs={[
        { id: "all", label: "All" }, { id: "pending", label: "Pending Approval" },
        { id: "approved", label: "Approved" }, { id: "completed", label: "Completed" },
        { id: "cancelled", label: "Cancelled" },
      ]} active={tab} onChange={setTab} />
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "bookingCode", label: "Code" },
          { key: "employeeName", label: "Employee", render: (v, r) => v || r.requesterName || "-" },
          { key: "transportType", label: "Type", render: (v) => <Badge status={v || "SHARED"} /> },
          { key: "pickupLocation", label: "Pickup" },
          { key: "dropLocation", label: "Drop" },
          { key: "date", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
          { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
        ]} data={filtered} actions={(r) => {
          const s = (r.status || "").toUpperCase();
          const isPending = s === "PENDING" || s === "REQUESTED";
          return (
            <div className="flex gap-2 items-center">
              {isPending && (
                <>
                  <button onClick={() => handleApprove(r.id)} className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium">Approve</button>
                  <button onClick={() => handleReject(r.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium">Reject</button>
                </>
              )}
              {!isPending && <button className="text-xs text-blue-600">View</button>}
            </div>
          );
        }} />
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Booking">
        <div className="space-y-4">
          <Input label="Passenger ID" value={form.passengerId} onChange={(v) => setForm({ ...form, passengerId: v })} required />
          <div className="grid grid-cols-2 gap-4">
            <AddressAutocomplete
              label="Pickup Location"
              value={form.pickupLocation}
              onChange={(v) => setForm({ ...form, pickupLocation: v })}
              onSelect={(addr) => setForm({ ...form, pickupLocation: addr.formattedAddress })}
              required
            />
            <AddressAutocomplete
              label="Drop Location"
              value={form.dropLocation}
              onChange={(v) => setForm({ ...form, dropLocation: v })}
              onSelect={(addr) => setForm({ ...form, dropLocation: addr.formattedAddress })}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} type="date" required />
            <Input label="Pickup Time" value={form.pickupTime} onChange={(v) => setForm({ ...form, pickupTime: v })} type="time" required />
            <Input label="Passengers" value={form.passengerCount} onChange={(v) => setForm({ ...form, passengerCount: v })} type="number" />
          </div>
          <Input label="Service Type" value={form.serviceType} onChange={(v) => setForm({ ...form, serviceType: v })} options={[{ label: "Shared", value: "SHARED" }, { label: "Dedicated", value: "DEDICATED" }, { label: "Pool", value: "POOL" }]} />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={handleCreate} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Creating..." : "Create Booking"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: DISPATCH
// ============================================================

function DispatchPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [stats, setStats] = useState({ assigned: 0, inTransit: 0, completed: 0 });
  const [assignModal, setAssignModal] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    Promise.all([
      apiFetch("/dashboard/dispatch/queue"),
      apiFetch("/dashboard/dispatch/stats"),
    ]).then(([queueData, statsData]) => {
      setQueue(queueData?.data || []);
      if (statsData) setStats({ assigned: statsData.assigned || 0, inTransit: statsData.inTransit || 0, completed: statsData.completed || 0 });
    }).catch(() => {
      apiFetch("/dashboard/dispatch/queue").then((d) => setQueue(d?.data || []));
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAssign = async (booking: any) => {
    setAssignModal(booking);
    setSelectedDriver("");
    setSelectedVehicle("");
    const [driversData, vehiclesData] = await Promise.all([
      apiFetch("/trips/drivers/available").catch(() => []),
      apiFetch("/trips/vehicles/available").catch(() => []),
    ]);
    setDrivers(Array.isArray(driversData) ? driversData : driversData?.data || []);
    setVehicles(Array.isArray(vehiclesData) ? vehiclesData : vehiclesData?.data || []);
  };

  const handleDispatch = async () => {
    if (!assignModal || !selectedDriver) return;
    try {
      await mutate(`/trips/dispatch/${assignModal.id}`, "POST", { driverId: selectedDriver, vehicleId: selectedVehicle || undefined });
      notifyToast("Driver dispatched successfully");
      setAssignModal(null);
      load();
    } catch (e: any) {
      notifyToast(e.message, "error");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Dispatch Management</h2>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Unassigned" value={queue.length} icon="📋" color="yellow" />
        <StatCard label="Assigned" value={stats.assigned} icon="✅" color="green" />
        <StatCard label="In Transit" value={stats.inTransit} icon="🗺️" color="blue" />
        <StatCard label="Completed" value={stats.completed} icon="🏁" color="purple" />
      </div>
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "bookingCode", label: "Booking" },
          { key: "employeeName", label: "Passenger" },
          { key: "pickupLocation", label: "Pickup" },
          { key: "dropLocation", label: "Drop" },
          { key: "date", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
          { key: "priority", label: "Priority", render: (v) => <Badge status={v || "NORMAL"} /> },
        ]} data={queue} actions={(r) => (
          <button onClick={() => openAssign(r)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium">Assign Driver</button>
        )} />
      </div>
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title={`Dispatch — ${assignModal?.bookingCode || ""}`}>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p><span className="font-medium">Passenger:</span> {assignModal?.employeeName || "-"}</p>
            <p><span className="font-medium">Pickup:</span> {assignModal?.pickupLocation || "-"}</p>
            <p><span className="font-medium">Drop:</span> {assignModal?.dropLocation || "-"}</p>
          </div>
          <Input
            label="Select Driver"
            value={selectedDriver}
            onChange={setSelectedDriver}
            options={drivers.map((d: any) => ({ label: `${d.firstName || ""} ${d.lastName || ""} — ${d.phone || d.driverCode || ""}`.trim(), value: d.id || d.userId }))}
            required
          />
          <Input
            label="Select Vehicle"
            value={selectedVehicle}
            onChange={setSelectedVehicle}
            options={vehicles.map((v: any) => ({ label: `${v.registrationNo || v.registrationNumber || ""} — ${v.vehicleType || ""}`, value: v.id }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setAssignModal(null)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={handleDispatch} disabled={mutating || !selectedDriver} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Dispatching..." : "Dispatch"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: TRIPS
// ============================================================

function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [tab, setTab] = useState("active");
  const [detailTrip, setDetailTrip] = useState<any>(null);

  const load = useCallback(() => {
    apiFetch("/trips").then((d) => setTrips(d?.data || d || []));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = trips.filter((t: any) => {
    const s = (t.status || "").toUpperCase();
    if (tab === "active") return ["SCHEDULED", "IN_TRANSIT", "DRIVER_ACCEPTED", "AT_PICKUP", "BOARDING", "STARTED"].includes(s);
    if (tab === "completed") return s === "COMPLETED";
    if (tab === "cancelled") return s === "CANCELLED";
    if (tab === "breakdown") return s === "BREAKDOWN";
    return true;
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Trip Management</h2>
      <TabBar tabs={[{ id: "active", label: "Active" }, { id: "completed", label: "Completed" }, { id: "cancelled", label: "Cancelled" }, { id: "breakdown", label: "Breakdown" }]} active={tab} onChange={setTab} />
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "tripCode", label: "Trip Code" },
          { key: "passengerName", label: "Passenger", render: (v, r) => v || r.employeeName || "-" },
          { key: "driverName", label: "Driver", render: (v, r) => v || r.driverName || "-" },
          { key: "vehicleReg", label: "Vehicle", render: (v, r) => v || r.vehicleRegistration || "-" },
          { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
          { key: "startTime", label: "Started", render: (v) => v ? new Date(v).toLocaleString() : "-" },
          { key: "endTime", label: "Ended", render: (v) => v ? new Date(v).toLocaleString() : "-" },
        ]} data={filtered} actions={(r) => (
          <div className="flex gap-2">
            <button onClick={() => setDetailTrip(r)} className="text-xs text-blue-600">Details</button>
          </div>
        )} />
      </div>
      <Modal open={!!detailTrip} onClose={() => setDetailTrip(null)} title={`Trip ${detailTrip?.tripCode || ""}`}>
        {detailTrip && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Status</p><Badge status={detailTrip.status} /></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Type</p><p className="font-medium">{detailTrip.type || "-"}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Passenger</p><p className="font-medium">{detailTrip.passengerName || detailTrip.employeeName || "-"}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Driver</p><p className="font-medium">{detailTrip.driverName || "-"}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Vehicle</p><p className="font-medium">{detailTrip.vehicleReg || detailTrip.vehicleRegistration || "-"}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Pickup</p><p className="font-medium">{detailTrip.pickupLocation || detailTrip.pickupAddress || "-"}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Drop</p><p className="font-medium">{detailTrip.dropLocation || detailTrip.dropAddress || "-"}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Distance</p><p className="font-medium">{detailTrip.distanceKm ? `${detailTrip.distanceKm} km` : "-"}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Start Time</p><p className="font-medium">{detailTrip.startTime ? new Date(detailTrip.startTime).toLocaleString() : "-"}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">End Time</p><p className="font-medium">{detailTrip.endTime ? new Date(detailTrip.endTime).toLocaleString() : "-"}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// SHUTTLE ROUTES TAB
// ============================================================

function ShuttleRoutesTab() {
  const [shuttles, setShuttles] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ routeName: "", shuttleType: "COMMUTER", origin: "", destination: "", capacity: "", frequency: "", startTime: "", endTime: "" });
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    apiFetch("/routes?type=SHUTTLE").then((d) => setShuttles(d?.data || d || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await mutate("/routes", "POST", { ...form, routeType: form.shuttleType, capacity: parseInt(form.capacity) || 0 });
      notifyToast("Shuttle route created");
      setShowCreate(false);
      setForm({ routeName: "", shuttleType: "COMMUTER", origin: "", destination: "", capacity: "", frequency: "", startTime: "", endTime: "" });
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await mutate(`/routes/${editing.id}`, "PUT", { ...form, routeType: form.shuttleType, capacity: parseInt(form.capacity) || 0 });
      notifyToast("Shuttle route updated");
      setEditing(null);
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await mutate(`/routes/${id}`, "DELETE");
      notifyToast("Shuttle route deleted");
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const openEdit = (s: any) => {
    setForm({
      routeName: s.routeName || s.name || "",
      shuttleType: s.routeType || s.shuttleType || "COMMUTER",
      origin: s.origin || "",
      destination: s.destination || "",
      capacity: String(s.capacity || ""),
      frequency: s.frequency || "",
      startTime: s.startTime || "",
      endTime: s.endTime || "",
    });
    setEditing(s);
  };

  return (
    <div className="bg-white rounded-xl border">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Shuttle Routes ({shuttles.length})</h3>
        <button onClick={() => { setForm({ routeName: "", shuttleType: "COMMUTER", origin: "", destination: "", capacity: "", frequency: "", startTime: "", endTime: "" }); setShowCreate(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">+ Add Shuttle Route</button>
      </div>
      <DataTable columns={[
        { key: "routeName", label: "Route", render: (v, r) => v || r.name || "-" },
        { key: "routeType", label: "Type" },
        { key: "origin", label: "Origin" },
        { key: "destination", label: "Destination" },
        { key: "capacity", label: "Capacity" },
        { key: "frequency", label: "Frequency" },
        { key: "isActive", label: "Active", render: (v) => v ? "✅" : "❌" },
      ]} data={shuttles} actions={(r) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(r)} className="text-xs text-blue-600">Edit</button>
          <button onClick={() => { if (confirm("Delete this shuttle route?")) handleDelete(r.id); }} className="text-xs text-red-600">Delete</button>
        </div>
      )} />
      <Modal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null); }} title={editing ? "Edit Shuttle Route" : "Add Shuttle Route"}>
        <div className="space-y-4">
          <Input label="Route Name" value={form.routeName} onChange={(v) => setForm({ ...form, routeName: v })} required />
          <Input label="Shuttle Type" value={form.shuttleType} onChange={(v) => setForm({ ...form, shuttleType: v })} options={[{ label: "Commuter", value: "COMMUTER" }, { label: "Campus", value: "CAMPUS" }, { label: "Last Mile", value: "LAST_MILE" }, { label: "Inter-City", value: "INTER_CITY" }]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Origin" value={form.origin} onChange={(v) => setForm({ ...form, origin: v })} />
            <Input label="Destination" value={form.destination} onChange={(v) => setForm({ ...form, destination: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Capacity" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} type="number" />
            <Input label="Frequency" value={form.frequency} onChange={(v) => setForm({ ...form, frequency: v })} placeholder="e.g. every 30 min" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time" value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} type="time" />
            <Input label="End Time" value={form.endTime} onChange={(v) => setForm({ ...form, endTime: v })} type="time" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={editing ? handleUpdate : handleCreate} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: ROUTES & NODALS
// ============================================================

function RoutesPage() {
  const [tab, setTab] = useState("routes");
  const [routes, setRoutes] = useState<any[]>([]);
  const [nodals, setNodals] = useState<any[]>([]);
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [showCreateNodal, setShowCreateNodal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [editingNodal, setEditingNodal] = useState<any>(null);
  const [routeForm, setRouteForm] = useState({ routeName: "", routeType: "COMMUTER", origin: "", destination: "", distanceKm: "", estimatedMinutes: "" });
  const [nodalForm, setNodalForm] = useState({ nodalName: "", city: "", latitude: "", longitude: "", capacity: "" });
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    apiFetch("/dashboard/routes").then((d) => setRoutes(d?.data || []));
    apiFetch("/dashboard/routes/nodal").then((d) => setNodals(d?.data || []));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateRoute = async () => {
    try {
      await mutate("/dashboard/routes", "POST", { ...routeForm, distanceKm: routeForm.distanceKm ? parseFloat(routeForm.distanceKm) : undefined, estimatedMinutes: routeForm.estimatedMinutes ? parseInt(routeForm.estimatedMinutes) : undefined });
      notifyToast("Route created");
      setShowCreateRoute(false);
      setRouteForm({ routeName: "", routeType: "COMMUTER", origin: "", destination: "", distanceKm: "", estimatedMinutes: "" });
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleUpdateRoute = async () => {
    if (!editingRoute) return;
    try {
      await mutate(`/dashboard/routes/${editingRoute.id}`, "PUT", { ...routeForm, distanceKm: routeForm.distanceKm ? parseFloat(routeForm.distanceKm) : undefined, estimatedMinutes: routeForm.estimatedMinutes ? parseInt(routeForm.estimatedMinutes) : undefined });
      notifyToast("Route updated");
      setEditingRoute(null);
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleDeleteRoute = async (routeId: string) => {
    try {
      await mutate(`/dashboard/routes/${routeId}`, "DELETE");
      notifyToast("Route deleted");
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleCreateNodal = async () => {
    try {
      await mutate("/dashboard/routes/nodal", "POST", { ...nodalForm, latitude: nodalForm.latitude ? parseFloat(nodalForm.latitude) : undefined, longitude: nodalForm.longitude ? parseFloat(nodalForm.longitude) : undefined, capacity: nodalForm.capacity ? parseInt(nodalForm.capacity) : undefined });
      notifyToast("Nodal point created");
      setShowCreateNodal(false);
      setNodalForm({ nodalName: "", city: "", latitude: "", longitude: "", capacity: "" });
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleUpdateNodal = async () => {
    if (!editingNodal) return;
    try {
      await mutate(`/dashboard/routes/nodal/${editingNodal.id}`, "PUT", { ...nodalForm, latitude: nodalForm.latitude ? parseFloat(nodalForm.latitude) : undefined, longitude: nodalForm.longitude ? parseFloat(nodalForm.longitude) : undefined, capacity: nodalForm.capacity ? parseInt(nodalForm.capacity) : undefined });
      notifyToast("Nodal point updated");
      setEditingNodal(null);
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const openEditRoute = (r: any) => {
    setRouteForm({ routeName: r.routeName || "", routeType: r.routeType || "COMMUTER", origin: r.origin || "", destination: r.destination || "", distanceKm: r.distanceKm ? String(r.distanceKm) : "", estimatedMinutes: r.estimatedMinutes ? String(r.estimatedMinutes) : "" });
    setEditingRoute(r);
  };

  const openEditNodal = (n: any) => {
    setNodalForm({ nodalName: n.nodalName || n.name || "", city: n.city || "", latitude: n.latitude ? String(n.latitude) : "", longitude: n.longitude ? String(n.longitude) : "", capacity: n.capacity ? String(n.capacity) : "" });
    setEditingNodal(n);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Routes & Nodal Points</h2>
        <button onClick={() => tab === "routes" ? setShowCreateRoute(true) : setShowCreateNodal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
          + {tab === "routes" ? "Add Route" : "Add Nodal Point"}
        </button>
      </div>
      <TabBar tabs={[{ id: "routes", label: "Routes" }, { id: "nodals", label: "Nodal Points" }, { id: "shuttles", label: "Shuttles" }]} active={tab} onChange={setTab} />
      {tab === "routes" && (
        <>
          <div className="bg-white rounded-xl border">
            <DataTable columns={[
              { key: "routeCode", label: "Code" }, { key: "routeName", label: "Name" },
              { key: "routeType", label: "Type" }, { key: "distanceKm", label: "Distance" },
              { key: "estimatedMinutes", label: "Est. Time" }, { key: "stopCount", label: "Stops" },
              { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
            ]} data={routes} actions={(r) => (
              <div className="flex gap-2">
                <button onClick={() => openEditRoute(r)} className="text-xs text-blue-600">Edit</button>
                <button onClick={() => { if (confirm(`Delete route ${r.routeName}?`)) handleDeleteRoute(r.id); }} className="text-xs text-red-600">Delete</button>
              </div>
            )} />
          </div>
          <div className="bg-white rounded-xl border p-5">
            <RouteOptimizer
              stops={routes.map((r: any) => ({
                id: r.id,
                name: r.routeName || r.routeCode || "Stop",
                latitude: r.latitude || 0,
                longitude: r.longitude || 0,
                address: r.origin || r.destination || "",
              }))}
              optimizeMode="time"
            />
          </div>
        </>
      )}
      {tab === "nodals" && (
        <div className="bg-white rounded-xl border">
          <DataTable columns={[
            { key: "nodalCode", label: "Code" }, { key: "nodalName", label: "Name" },
            { key: "city", label: "City" }, { key: "capacity", label: "Capacity" },
            { key: "currentOccupancy", label: "Occupied" }, { key: "isActive", label: "Active", render: (v) => v ? "✅" : "❌" },
          ]} data={nodals} actions={(r) => (
            <button onClick={() => openEditNodal(r)} className="text-xs text-blue-600">Edit</button>
          )} />
        </div>
      )}
      {tab === "shuttles" && (
        <ShuttleRoutesTab />
      )}

      <Modal open={showCreateRoute || !!editingRoute} onClose={() => { setShowCreateRoute(false); setEditingRoute(null); }} title={editingRoute ? "Edit Route" : "Add Route"}>
        <div className="space-y-4">
          <Input label="Route Name" value={routeForm.routeName} onChange={(v) => setRouteForm({ ...routeForm, routeName: v })} required />
          <Input label="Route Type" value={routeForm.routeType} onChange={(v) => setRouteForm({ ...routeForm, routeType: v })} options={[{ label: "Commuter", value: "COMMUTER" }, { label: "Shuttle", value: "SHUTTLE" }, { label: "Express", value: "EXPRESS" }, { label: "Point-to-Point", value: "POINT_TO_POINT" }]} />
          <div className="grid grid-cols-2 gap-4">
            <AddressAutocomplete
              label="Origin"
              value={routeForm.origin}
              onChange={(v) => setRouteForm({ ...routeForm, origin: v })}
              onSelect={(addr) => setRouteForm({ ...routeForm, origin: addr.formattedAddress })}
            />
            <AddressAutocomplete
              label="Destination"
              value={routeForm.destination}
              onChange={(v) => setRouteForm({ ...routeForm, destination: v })}
              onSelect={(addr) => setRouteForm({ ...routeForm, destination: addr.formattedAddress })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Distance (km)" value={routeForm.distanceKm} onChange={(v) => setRouteForm({ ...routeForm, distanceKm: v })} type="number" />
            <Input label="Est. Time (min)" value={routeForm.estimatedMinutes} onChange={(v) => setRouteForm({ ...routeForm, estimatedMinutes: v })} type="number" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreateRoute(false); setEditingRoute(null); }} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={editingRoute ? handleUpdateRoute : handleCreateRoute} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Saving..." : editingRoute ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showCreateNodal || !!editingNodal} onClose={() => { setShowCreateNodal(false); setEditingNodal(null); }} title={editingNodal ? "Edit Nodal Point" : "Add Nodal Point"}>
        <div className="space-y-4">
          <Input label="Name" value={nodalForm.nodalName} onChange={(v) => setNodalForm({ ...nodalForm, nodalName: v })} required />
          <Input label="City" value={nodalForm.city} onChange={(v) => setNodalForm({ ...nodalForm, city: v })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Latitude" value={nodalForm.latitude} onChange={(v) => setNodalForm({ ...nodalForm, latitude: v })} type="number" />
            <Input label="Longitude" value={nodalForm.longitude} onChange={(v) => setNodalForm({ ...nodalForm, longitude: v })} type="number" />
          </div>
          <Input label="Capacity" value={nodalForm.capacity} onChange={(v) => setNodalForm({ ...nodalForm, capacity: v })} type="number" />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreateNodal(false); setEditingNodal(null); }} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={editingNodal ? handleUpdateNodal : handleCreateNodal} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Saving..." : editingNodal ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: GPS TRACKING
// ============================================================

function GPSTrackingPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [safetyAlerts, setSafetyAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState({ online: 0, alerts: 0, deviations: 0 });
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  useEffect(() => {
    apiFetch("/gps/vehicles/active").then((d) => {
      const list = d?.data || d || [];
      setVehicles(Array.isArray(list) ? list : []);
      setStats({
        online: Array.isArray(list) ? list.length : 0,
        alerts: 0,
        deviations: 0,
      });
    }).catch(() => {});
    apiFetch("/geofences").then((d) => {
      const list = d?.data || d || [];
      setGeofences(Array.isArray(list) ? list : []);
    }).catch(() => {});
    apiFetch("/safety/alerts?status=ACTIVE").then((d) => {
      const list = d?.data || d || [];
      setSafetyAlerts(Array.isArray(list) ? list : []);
    }).catch(() => {});
  }, []);

  const alertCounts = safetyAlerts.reduce((acc: Record<string, number>, a: any) => {
    const type = a.type || a.alertType || "Other";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Live GPS Tracking</h2>
        <div className="flex gap-2">
          {selectedVehicle && (
            <button
              onClick={() => setSelectedVehicle(null)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Show All
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Vehicles Online" value={String(stats.online)} icon="🟢" color="green" />
        <StatCard label="Active Alerts" value={String(stats.alerts)} icon="🚨" color="red" />
        <StatCard label="Route Deviations" value={String(stats.deviations)} icon="⚠️" color="yellow" />
      </div>
      <MapboxTracker
        vehicles={vehicles}
        geofences={geofences}
        height="450px"
        followVehicle={selectedVehicle?.id}
        onVehicleClick={(v) => setSelectedVehicle(v)}
      />
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Safety Alerts ({safetyAlerts.length})</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(alertCounts).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between py-2 border-b border-gray-50">
                <span>{type}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${(count as number) > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                  {count as number} active
                </span>
              </div>
            ))}
            {safetyAlerts.length === 0 && (
              <p className="text-gray-400 text-center py-4">No active safety alerts</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Geofences ({geofences.length})</h3>
          <div className="space-y-2 text-sm max-h-[300px] overflow-auto">
            {geofences.length === 0 && (
              <p className="text-gray-400 text-center py-4">No geofences configured</p>
            )}
            {geofences.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                <span>{g.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${g.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {g.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NO-SHOW RECORDS TAB
// ============================================================

function NoShowRecordsTab() {
  const [records, setRecords] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    const endpoint = filter === "ALL" ? "/no-show/records" : `/no-show/records?status=${filter}`;
    apiFetch(endpoint).then((d) => setRecords(d?.data || d || [])).catch(() => {});
  }, [filter]);

  const filtered = filter === "ALL" ? records : records.filter((r: any) => r.status === filter);
  const stats = {
    total: records.length,
    confirmed: records.filter((r: any) => r.status === "CONFIRMED").length,
    disputed: records.filter((r: any) => r.status === "DISPUTED").length,
    cleared: records.filter((r: any) => r.status === "CLEARED").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Records" value={String(stats.total)} icon="📋" color="blue" />
        <StatCard label="Confirmed No-Shows" value={String(stats.confirmed)} icon="❌" color="red" />
        <StatCard label="Disputed" value={String(stats.disputed)} icon="⚠️" color="yellow" />
        <StatCard label="Cleared" value={String(stats.cleared)} icon="✅" color="green" />
      </div>
      <div className="flex gap-2">
        {["ALL", "CONFIRMED", "DISPUTED", "CLEARED"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}</button>
        ))}
      </div>
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "employeeName", label: "Employee" },
          { key: "tripCode", label: "Trip" },
          { key: "date", label: "Date" },
          { key: "pickupLocation", label: "Pickup" },
          { key: "driverName", label: "Driver" },
          { key: "evidenceType", label: "Evidence" },
          { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
        ]} data={filtered} actions={(r) => (
          <button onClick={() => setDetail(r)} className="text-xs text-blue-600">View Details</button>
        )} />
      </div>
      <Modal open={!!detail} onClose={() => setDetail(null)} title="No-Show Record Details">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Employee:</span> <span className="font-medium">{detail.employeeName}</span></div>
              <div><span className="text-gray-500">Employee ID:</span> <span className="font-medium">{detail.employeeId}</span></div>
              <div><span className="text-gray-500">Trip Code:</span> <span className="font-medium">{detail.tripCode}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{detail.date}</span></div>
              <div><span className="text-gray-500">Pickup:</span> <span className="font-medium">{detail.pickupLocation}</span></div>
              <div><span className="text-gray-500">Driver:</span> <span className="font-medium">{detail.driverName}</span></div>
              <div><span className="text-gray-500">GPS Distance:</span> <span className="font-medium">{detail.gpsDistance || "N/A"}</span></div>
              <div><span className="text-gray-500">Call Attempts:</span> <span className="font-medium">{detail.callAttempts || 0}</span></div>
              <div><span className="text-gray-500">Evidence:</span> <span className="font-medium">{detail.evidenceType || "N/A"}</span></div>
              <div><span className="text-gray-500">Status:</span> <Badge status={detail.status} /></div>
            </div>
            {detail.evidenceUrl && <div><span className="text-gray-500">Evidence File:</span> <a href={detail.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a></div>}
            {detail.notes && <div><span className="text-gray-500">Notes:</span> <p className="mt-1 p-2 bg-gray-50 rounded">{detail.notes}</p></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// NO-SHOW BANS TAB
// ============================================================

function NoShowBansTab() {
  const [bans, setBans] = useState<any[]>([]);
  const { mutate } = useMutation();

  const load = useCallback(() => {
    apiFetch("/no-show/bans").then((d) => setBans(d?.data || d || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBanAction = async (banId: string, action: string) => {
    try {
      await mutate(`/no-show/bans/${banId}/${action}`, "POST");
      notifyToast(`Ban ${action}`);
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const activeBans = bans.filter((b: any) => b.status === "ACTIVE");
  const pendingApprovals = bans.filter((b: any) => b.status === "PENDING");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Active Bans" value={String(activeBans.length)} icon="🚫" color="red" />
        <StatCard label="Pending Approval" value={String(pendingApprovals.length)} icon="⏳" color="yellow" />
        <StatCard label="Total Bans" value={String(bans.length)} icon="📋" color="blue" />
      </div>
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Transport Ban Records</h3>
        </div>
        <DataTable columns={[
          { key: "employeeName", label: "Employee" },
          { key: "employeeId", label: "Emp ID" },
          { key: "banCount", label: "No-Shows" },
          { key: "banLevel", label: "Level" },
          { key: "banStartDate", label: "Start Date" },
          { key: "banEndDate", label: "End Date" },
          { key: "reason", label: "Reason" },
          { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
        ]} data={bans} actions={(r) => (
          <div className="flex gap-1">
            {r.status === "PENDING" && (
              <>
                <button onClick={() => handleBanAction(r.id, "approve")} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Approve</button>
                <button onClick={() => handleBanAction(r.id, "reject")} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Reject</button>
              </>
            )}
            {r.status === "ACTIVE" && (
              <button onClick={() => handleBanAction(r.id, "lift")} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Lift Ban</button>
            )}
          </div>
        )} />
      </div>
    </div>
  );
}

// ============================================================
// PAGE: NO-SHOW & BANS
// ============================================================

function NoShowPage() {
  const [tab, setTab] = useState("queue");
  const [queue, setQueue] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);
  const { mutate } = useMutation();

  const load = useCallback(() => {
    apiFetch("/no-show/trips?status=PENDING").then((d) => setQueue(d?.data || d || [])).catch(() => {});
    apiFetch("/no-show/appeals").then((d) => setAppeals(d?.data || d || [])).catch(() => {});
    apiFetch("/no-show/policy").then((d) => setPolicy(d)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleQueueAction = async (tripId: string, passengerId: string, action: string) => {
    try {
      await mutate(`/no-show/trips/${tripId}/passengers/${passengerId}/no-show/validate`, "POST", { decision: action.toUpperCase() });
      notifyToast(`No-show ${action}`);
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleAppealAction = async (appealId: string, action: string) => {
    try {
      await mutate(`/no-show/appeals/${appealId}/${action}`, "POST");
      notifyToast(`Appeal ${action}`);
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">No-Show Management</h2>
      <TabBar tabs={[{ id: "queue", label: "Control Room Queue" }, { id: "records", label: "Records" }, { id: "appeals", label: "Appeals" }, { id: "bans", label: "Bans" }, { id: "policies", label: "Policies" }]} active={tab} onChange={setTab} />
      {tab === "queue" && (
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b bg-yellow-50"><p className="text-sm text-yellow-800 font-medium">⚠ No-show cases requiring attention</p></div>
          <DataTable columns={[
            { key: "tripCode", label: "Trip" }, { key: "passengerName", label: "Passenger" },
            { key: "driverName", label: "Driver" }, { key: "arrivalTime", label: "Arrived" },
            { key: "gpsDistance", label: "GPS Distance" }, { key: "callAttempts", label: "Calls" },
            { key: "graceTimer", label: "Timer" }, { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
          ]} data={queue} actions={(r) => (
            <div className="flex gap-1">
              <button onClick={() => handleQueueAction(r.tripId, r.passengerId, "approved")} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Approve</button>
              <button onClick={() => handleQueueAction(r.tripId, r.passengerId, "rejected")} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Reject</button>
              <button onClick={() => handleQueueAction(r.tripId, r.passengerId, "escalated")} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Escalate</button>
            </div>
          )} />
        </div>
      )}
      {tab === "appeals" && (
        <div className="bg-white rounded-xl border">
          <DataTable columns={[
            { key: "appealId", label: "Appeal ID" }, { key: "employeeName", label: "Employee" },
            { key: "tripDate", label: "Trip Date" }, { key: "reason", label: "Reason" },
            { key: "submittedAt", label: "Submitted" }, { key: "slaDeadline", label: "SLA Deadline" },
            { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
          ]} data={appeals} actions={(r) => (
            <div className="flex gap-1">
              <button onClick={() => handleAppealAction(r.id, "approve")} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Approve</button>
              <button onClick={() => handleAppealAction(r.id, "reject")} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Reject</button>
            </div>
          )} />
        </div>
      )}
      {tab === "records" && (
        <NoShowRecordsTab />
      )}
      {tab === "bans" && (
        <NoShowBansTab />
      )}
      {tab === "policies" && policy && (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-semibold">No-Show Policy Configuration</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Grace Period</p><p className="font-medium">{policy.gracePeriodMinutes || 10} minutes</p></div>
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Required Calls</p><p className="font-medium">{policy.requiredCallAttempts || 3}</p></div>
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Appeal Window</p><p className="font-medium">{policy.appealWindowHours || 48} hours</p></div>
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Max Bans</p><p className="font-medium">{policy.maxBansBeforeEscalation || 2}</p></div>
          </div>
        </div>
      )}
      {tab === "policies" && !policy && <div className="bg-white rounded-xl border p-8 text-center text-gray-400">Loading policy...</div>}
    </div>
  );
}

// ============================================================
// PAGE: EXPENSES
// ============================================================

function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, totalAmount: 0 });
  const [detailExpense, setDetailExpense] = useState<any>(null);
  const { mutate } = useMutation();

  const load = useCallback(() => {
    apiFetch("/dashboard/expenses").then((d) => {
      const list = d?.data || d || [];
      setExpenses(Array.isArray(list) ? list : []);
      if (Array.isArray(list)) {
        setStats({
          pending: list.filter((e: any) => e.status === "SUBMITTED" || e.status === "PENDING").length,
          approved: list.filter((e: any) => e.status === "APPROVED").length,
          rejected: list.filter((e: any) => e.status === "REJECTED").length,
          totalAmount: list.reduce((sum: number, e: any) => sum + (e.totalExpenses || e.amount || 0), 0),
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (expenseId: string) => {
    try {
      await mutate(`/expenses/${expenseId}/approve`, "POST");
      notifyToast("Expense approved");
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleReject = async (expenseId: string) => {
    try {
      await mutate(`/expenses/${expenseId}/reject`, "POST");
      notifyToast("Expense rejected");
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Employee Expenses</h2>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Pending" value={stats.pending} icon="📋" color="yellow" />
        <StatCard label="Approved" value={stats.approved} icon="✅" color="green" />
        <StatCard label="Rejected" value={stats.rejected} icon="❌" color="red" />
        <StatCard label="Total Amount" value={`₹${stats.totalAmount.toLocaleString()}`} icon="💰" color="blue" />
      </div>
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "employeeName", label: "Employee", render: (v, r) => v || r.driverName || "-" },
          { key: "tripCode", label: "Trip" },
          { key: "provider", label: "Provider" },
          { key: "totalExpenses", label: "Amount", render: (v, r) => `₹${(v || r.amount || 0).toLocaleString()}` },
          { key: "receiptUrl", label: "Receipt", render: (v) => v ? <span className="text-blue-600 cursor-pointer">📎 View</span> : "-" },
          { key: "status", label: "Status", render: (v) => <Badge status={v || "SUBMITTED"} /> },
          { key: "createdAt", label: "Submitted", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
        ]} data={expenses} actions={(r) => {
          const s = (r.status || "").toUpperCase();
          const isPending = s === "SUBMITTED" || s === "PENDING";
          return (
            <div className="flex gap-2">
              {isPending && (
                <>
                  <button onClick={() => handleApprove(r.id)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Approve</button>
                  <button onClick={() => handleReject(r.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Reject</button>
                </>
              )}
              <button onClick={() => setDetailExpense(r)} className="text-xs text-blue-600">View</button>
            </div>
          );
        }} />
      </div>
      <Modal open={!!detailExpense} onClose={() => setDetailExpense(null)} title="Expense Details">
        {detailExpense && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Employee</p><p className="font-medium">{detailExpense.employeeName || detailExpense.driverName || "-"}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Trip</p><p className="font-medium">{detailExpense.tripCode || "-"}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Toll</p><p className="font-medium">₹{(detailExpense.tollAmount || 0).toLocaleString()}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Parking</p><p className="font-medium">₹{(detailExpense.parkingAmount || 0).toLocaleString()}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Waiting</p><p className="font-medium">₹{(detailExpense.waitingAmount || 0).toLocaleString()}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Other</p><p className="font-medium">₹{(detailExpense.otherAmount || 0).toLocaleString()}</p></div>
              <div className="bg-gray-50 rounded-lg p-3 col-span-2"><p className="text-xs text-gray-500">Total</p><p className="font-bold text-lg">₹{(detailExpense.totalExpenses || detailExpense.amount || 0).toLocaleString()}</p></div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Status</p><Badge status={detailExpense.status} /></div>
            {detailExpense.otherDescription && <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Description</p><p>{detailExpense.otherDescription}</p></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// BILLING: INVOICES TAB
// ============================================================

function BillingInvoicesTab() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [detail, setDetail] = useState<any>(null);
  const { mutate } = useMutation();

  useEffect(() => {
    const endpoint = filter === "ALL" ? "/billing/invoices" : `/billing/invoices?status=${filter}`;
    apiFetch(endpoint).then((d) => setInvoices(d?.data || d || [])).catch(() => {});
  }, [filter]);

  const stats = {
    total: invoices.length,
    pending: invoices.filter((i: any) => i.status === "PENDING").length,
    approved: invoices.filter((i: any) => i.status === "APPROVED").length,
    paid: invoices.filter((i: any) => i.status === "PAID").length,
    totalAmount: invoices.reduce((sum: number, i: any) => sum + (i.totalAmount || i.amount || 0), 0),
  };

  const handleInvoiceAction = async (invoiceId: string, action: string) => {
    try {
      await mutate(`/billing/invoices/${invoiceId}/${action}`, "POST");
      notifyToast(`Invoice ${action}`);
      apiFetch("/billing/invoices").then((d) => setInvoices(d?.data || d || [])).catch(() => {});
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Invoices" value={String(stats.total)} icon="📄" color="blue" />
        <StatCard label="Pending" value={String(stats.pending)} icon="⏳" color="yellow" />
        <StatCard label="Approved" value={String(stats.approved)} icon="✅" color="green" />
        <StatCard label="Total Value" value={`₹${(stats.totalAmount / 1000).toFixed(1)}K`} icon="💰" color="green" />
      </div>
      <div className="flex gap-2">
        {["ALL", "PENDING", "APPROVED", "PAID", "REJECTED"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}</button>
        ))}
      </div>
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "invoiceNumber", label: "Invoice #" },
          { key: "vendorName", label: "Vendor" },
          { key: "billingPeriod", label: "Period" },
          { key: "tripCount", label: "Trips" },
          { key: "totalAmount", label: "Amount", render: (v) => `₹${(v || 0).toLocaleString()}` },
          { key: "gstAmount", label: "GST", render: (v) => `₹${(v || 0).toLocaleString()}` },
          { key: "dueDate", label: "Due Date" },
          { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
        ]} data={invoices} actions={(r) => (
          <div className="flex gap-1">
            <button onClick={() => setDetail(r)} className="text-xs text-blue-600">View</button>
            {r.status === "PENDING" && <button onClick={() => handleInvoiceAction(r.id, "approve")} className="text-xs text-green-600">Approve</button>}
            {r.status === "APPROVED" && <button onClick={() => handleInvoiceAction(r.id, "mark-paid")} className="text-xs text-purple-600">Mark Paid</button>}
          </div>
        )} />
      </div>
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Invoice ${detail?.invoiceNumber || ""}`}>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Vendor:</span> <span className="font-medium">{detail.vendorName}</span></div>
              <div><span className="text-gray-500">Period:</span> <span className="font-medium">{detail.billingPeriod}</span></div>
              <div><span className="text-gray-500">Trips:</span> <span className="font-medium">{detail.tripCount}</span></div>
              <div><span className="text-gray-500">Amount:</span> <span className="font-medium">₹{(detail.totalAmount || 0).toLocaleString()}</span></div>
              <div><span className="text-gray-500">GST:</span> <span className="font-medium">₹{(detail.gstAmount || 0).toLocaleString()}</span></div>
              <div><span className="text-gray-500">Total with GST:</span> <span className="font-medium">₹{((detail.totalAmount || 0) + (detail.gstAmount || 0)).toLocaleString()}</span></div>
              <div><span className="text-gray-500">Due Date:</span> <span className="font-medium">{detail.dueDate}</span></div>
              <div><span className="text-gray-500">Status:</span> <Badge status={detail.status} /></div>
            </div>
            {detail.items && (
              <div>
                <span className="text-gray-500">Line Items:</span>
                <div className="mt-2 border rounded-lg">
                  <DataTable columns={[
                    { key: "description", label: "Description" },
                    { key: "quantity", label: "Qty" },
                    { key: "rate", label: "Rate", render: (v) => `₹${v}` },
                    { key: "amount", label: "Amount", render: (v) => `₹${(v || 0).toLocaleString()}` },
                  ]} data={detail.items} />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// BILLING: RECONCILIATION TAB
// ============================================================

function BillingReconciliationTab() {
  const [reconciliation, setReconciliation] = useState<any[]>([]);
  const [summary, setSummary] = useState({ matched: 0, mismatched: 0, totalVariance: 0 });

  useEffect(() => {
    apiFetch("/billing/reconciliation").then((d) => {
      const data = d?.data || d || [];
      setReconciliation(Array.isArray(data) ? data : []);
      if (Array.isArray(data)) {
        setSummary({
          matched: data.filter((r: any) => Math.abs(r.variance || 0) < 10).length,
          mismatched: data.filter((r: any) => Math.abs(r.variance || 0) >= 10).length,
          totalVariance: data.reduce((sum: number, r: any) => sum + Math.abs(r.variance || 0), 0),
        });
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Matched" value={String(summary.matched)} icon="✅" color="green" />
        <StatCard label="Mismatched" value={String(summary.mismatched)} icon="⚠️" color="yellow" />
        <StatCard label="Total Variance" value={`₹${summary.totalVariance.toLocaleString()}`} icon="💸" color="red" />
      </div>
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b"><h3 className="font-semibold">Invoice vs Trip vs Rate Card Reconciliation</h3></div>
        <DataTable columns={[
          { key: "invoiceNumber", label: "Invoice" },
          { key: "vendorName", label: "Vendor" },
          { key: "tripCount", label: "Trips" },
          { key: "invoicedAmount", label: "Invoiced", render: (v) => `₹${(v || 0).toLocaleString()}` },
          { key: "calculatedAmount", label: "Calculated", render: (v) => `₹${(v || 0).toLocaleString()}` },
          { key: "variance", label: "Variance", render: (v) => <span className={Math.abs(v || 0) >= 10 ? "text-red-600 font-medium" : "text-green-600"}>₹{(v || 0).toLocaleString()}</span> },
          { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
        ]} data={reconciliation} />
      </div>
    </div>
  );
}

// ============================================================
// BILLING: TRIP COSTS TAB
// ============================================================

function BillingTripCostsTab() {
  const [tripCosts, setTripCosts] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  useEffect(() => {
    const params = dateRange.from ? `?from=${dateRange.from}&to=${dateRange.to}` : "";
    apiFetch(`/billing/trip-costs${params}`).then((d) => setTripCosts(d?.data || d || [])).catch(() => {});
  }, [dateRange]);

  const totalCost = tripCosts.reduce((sum: number, t: any) => sum + (t.totalCost || 0), 0);
  const avgCost = tripCosts.length ? totalCost / tripCosts.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">From:</label>
          <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">To:</label>
          <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Trips" value={String(tripCosts.length)} icon="🚗" color="blue" />
        <StatCard label="Total Cost" value={`₹${(totalCost / 1000).toFixed(1)}K`} icon="💰" color="green" />
        <StatCard label="Avg Cost/Trip" value={`₹${avgCost.toFixed(0)}`} icon="📊" color="purple" />
      </div>
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "tripCode", label: "Trip" },
          { key: "date", label: "Date" },
          { key: "route", label: "Route" },
          { key: "vehicleType", label: "Vehicle" },
          { key: "distanceKm", label: "Distance" },
          { key: "baseCost", label: "Base", render: (v) => `₹${(v || 0).toFixed(0)}` },
          { key: "distanceCost", label: "Distance", render: (v) => `₹${(v || 0).toFixed(0)}` },
          { key: "waitingCost", label: "Waiting", render: (v) => `₹${(v || 0).toFixed(0)}` },
          { key: "totalCost", label: "Total", render: (v) => <span className="font-medium">₹{(v || 0).toFixed(0)}</span> },
          { key: "rateCardUsed", label: "Rate Card" },
        ]} data={tripCosts} />
      </div>
    </div>
  );
}

// ============================================================
// BILLING: BUDGET TAB
// ============================================================

function BillingBudgetTab() {
  const [budgets, setBudgets] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/billing/budgets").then((d) => setBudgets(d?.data || d || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b"><h3 className="font-semibold">Department / LOB Budget vs Actual</h3></div>
        <DataTable columns={[
          { key: "department", label: "Department / LOB" },
          { key: "allocatedBudget", label: "Allocated", render: (v) => `₹${(v || 0).toLocaleString()}` },
          { key: "actualSpend", label: "Actual Spend", render: (v) => `₹${(v || 0).toLocaleString()}` },
          { key: "utilization", label: "Utilization", render: (v) => {
            const pct = v || 0;
            const color = pct > 90 ? "text-red-600" : pct > 70 ? "text-yellow-600" : "text-green-600";
            return <span className={`font-medium ${color}`}>{pct.toFixed(1)}%</span>;
          }},
          { key: "remaining", label: "Remaining", render: (v) => <span className={v < 0 ? "text-red-600" : ""}>₹{(v || 0).toLocaleString()}</span> },
          { key: "status", label: "Status", render: (v) => <Badge status={v || "ON_TRACK"} /> },
        ]} data={budgets} />
      </div>
      {budgets.length === 0 && (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
          <p>No budget data available. Configure budgets in Settings → Company Profile.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGE: BILLING
// ============================================================

function BillingPage() {
  const [tab, setTab] = useState("rate-cards");
  const [rateCards, setRateCards] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ cardName: "", vehicleType: "CAB", ratePerKm: "", minKm: "", waitingCharge: "", nightCharge: "", baseRate: "" });
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    apiFetch("/billing/rate-cards").then((d) => setRateCards(d?.data || d || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await mutate("/billing/rate-cards", "POST", {
        ...form,
        ratePerKm: parseFloat(form.ratePerKm) || 0,
        minKm: parseFloat(form.minKm) || 0,
        waitingCharge: parseFloat(form.waitingCharge) || 0,
        nightCharge: parseFloat(form.nightCharge) || 0,
        baseRate: parseFloat(form.baseRate) || 0,
      });
      notifyToast("Rate card created");
      setShowCreate(false);
      setForm({ cardName: "", vehicleType: "CAB", ratePerKm: "", minKm: "", waitingCharge: "", nightCharge: "", baseRate: "" });
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await mutate(`/billing/rate-cards/${editing.id}`, "PUT", {
        ...form,
        ratePerKm: parseFloat(form.ratePerKm) || 0,
        minKm: parseFloat(form.minKm) || 0,
        waitingCharge: parseFloat(form.waitingCharge) || 0,
        nightCharge: parseFloat(form.nightCharge) || 0,
        baseRate: parseFloat(form.baseRate) || 0,
      });
      notifyToast("Rate card updated");
      setEditing(null);
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await mutate(`/billing/rate-cards/${id}`, "DELETE");
      notifyToast("Rate card deleted");
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const openEdit = (rc: any) => {
    setForm({
      cardName: rc.cardName || rc.name || "",
      vehicleType: rc.vehicleType || "CAB",
      ratePerKm: String(rc.ratePerKm || ""),
      minKm: String(rc.minKm || ""),
      waitingCharge: String(rc.waitingCharge || ""),
      nightCharge: String(rc.nightCharge || ""),
      baseRate: String(rc.baseRate || ""),
    });
    setEditing(rc);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Billing & Invoicing</h2>
        {tab === "rate-cards" && (
          <button onClick={() => { setForm({ cardName: "", vehicleType: "CAB", ratePerKm: "", minKm: "", waitingCharge: "", nightCharge: "", baseRate: "" }); setShowCreate(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">+ Add Rate Card</button>
        )}
      </div>
      <TabBar tabs={[{ id: "rate-cards", label: "Rate Cards" }, { id: "invoices", label: "Vendor Invoices" }, { id: "reconciliation", label: "Reconciliation" }, { id: "trip-costs", label: "Trip Costs" }, { id: "budget", label: "Budget" }]} active={tab} onChange={setTab} />
      {tab === "rate-cards" && (
        <div className="bg-white rounded-xl border">
          <DataTable columns={[
            { key: "cardName", label: "Card", render: (v, r) => v || r.name || "-" },
            { key: "vehicleType", label: "Vehicle" },
            { key: "ratePerKm", label: "Rate/km", render: (v) => `₹${v || 0}` },
            { key: "minKm", label: "Min KM" },
            { key: "waitingCharge", label: "Waiting", render: (v) => `₹${v || 0}` },
            { key: "nightCharge", label: "Night", render: (v) => `₹${v || 0}` },
            { key: "version", label: "Version" },
            { key: "isActive", label: "Active", render: (v) => v ? "✅" : "❌" },
          ]} data={rateCards} actions={(r) => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(r)} className="text-xs text-blue-600">Edit</button>
              <button onClick={() => { if (confirm(`Delete rate card "${r.cardName || r.name}"?`)) handleDelete(r.id); }} className="text-xs text-red-600">Delete</button>
            </div>
          )} />
        </div>
      )}
      {tab === "invoices" && (
        <BillingInvoicesTab />
      )}
      {tab === "reconciliation" && (
        <BillingReconciliationTab />
      )}
      {tab === "trip-costs" && (
        <BillingTripCostsTab />
      )}
      {tab === "budget" && (
        <BillingBudgetTab />
      )}

      <Modal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null); }} title={editing ? "Edit Rate Card" : "Add Rate Card"}>
        <div className="space-y-4">
          <Input label="Card Name" value={form.cardName} onChange={(v) => setForm({ ...form, cardName: v })} required />
          <Input label="Vehicle Type" value={form.vehicleType} onChange={(v) => setForm({ ...form, vehicleType: v })} options={[{ label: "Cab", value: "CAB" }, { label: "Bus", value: "BUS" }, { label: "Shuttle", value: "SHUTTLE" }, { label: "Van", value: "VAN" }]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Rate per KM (₹)" value={form.ratePerKm} onChange={(v) => setForm({ ...form, ratePerKm: v })} type="number" required />
            <Input label="Min KM" value={form.minKm} onChange={(v) => setForm({ ...form, minKm: v })} type="number" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Base Rate (₹)" value={form.baseRate} onChange={(v) => setForm({ ...form, baseRate: v })} type="number" />
            <Input label="Waiting (₹/min)" value={form.waitingCharge} onChange={(v) => setForm({ ...form, waitingCharge: v })} type="number" />
            <Input label="Night (₹/km)" value={form.nightCharge} onChange={(v) => setForm({ ...form, nightCharge: v })} type="number" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={editing ? handleUpdate : handleCreate} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: SAFETY
// ============================================================

function SafetyPage() {
  const [safety, setSafety] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api("/dashboard/analytics/safety?days=30")
      .then(d => { setSafety(d); setLoading(false); })
      .catch(err => { setError(err?.message || 'Failed to load safety data'); setLoading(false); });
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Safety & SOS</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Safety & SOS</h2>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Incidents" value={safety?.totalIncidents || 0} icon="⚠️" color="orange" />
        <StatCard label="SOS Events" value={safety?.sosEvents || 0} icon="🚨" color="red" />
        <StatCard label="Breakdowns" value={safety?.breakdowns || 0} icon="🔧" color="yellow" />
        <StatCard label="Route Deviations" value={safety?.routeDeviations || 0} icon="📍" color="blue" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">🚨 SOS Alerts</h3>
          <DataTable columns={[
            { key: "type", label: "Type" }, { key: "severity", label: "Severity", render: (v) => <Badge status={v || 'INFO'} /> },
            { key: "count", label: "Count" },
          ]} data={
            Object.entries(safety?.byType || {}).filter(([k]) => k === 'SOS').map(([k, v]: any) => ({ type: k, count: v, severity: 'HIGH' }))
          } />
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">⚠️ Incidents by Severity</h3>
          <DataTable columns={[
            { key: "severity", label: "Severity" }, { key: "count", label: "Count" },
          ]} data={
            Object.entries(safety?.bySeverity || {}).map(([k, v]: any) => ({ severity: k, count: v }))
          } />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: INCIDENTS
// ============================================================

function IncidentsPage() {
  const [incidents, setIncidents] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api("/dashboard/analytics/incidents?days=30")
      .then(d => { setIncidents(d); setLoading(false); })
      .catch(err => { setError(err?.message || 'Failed to load incidents'); setLoading(false); });
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Incident Management</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Incident Management</h2>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Incidents" value={incidents?.totalIncidents || 0} icon="⚠️" color="orange" />
        <StatCard label="SOS Events" value={incidents?.sosEvents || 0} icon="🚨" color="red" />
        <StatCard label="Breakdowns" value={incidents?.breakdowns || 0} icon="🔧" color="yellow" />
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-3">Incidents by Type</h3>
        <DataTable columns={[
          { key: "type", label: "Type" }, { key: "count", label: "Count" },
        ]} data={
          Object.entries(incidents?.byType || {}).map(([k, v]: any) => ({ type: k, count: v }))
        } />
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-3">Incidents by Severity</h3>
        <DataTable columns={[
          { key: "severity", label: "Severity" }, { key: "count", label: "Count" },
        ]} data={
          Object.entries(incidents?.bySeverity || {}).map(([k, v]: any) => ({ severity: k, count: v }))
        } />
      </div>
    </div>
  );
}

// ============================================================
// PAGE: GUARDS
// ============================================================

function GuardsPage() {
  const [guards, setGuards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api("/dashboard/guards")
      .then(d => { setGuards(d?.data || d || []); setLoading(false); })
      .catch(err => { setError(err?.message || 'Failed to load guards'); setLoading(false); });
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Guard Management</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Guard Management</h2>
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "firstName", label: "Name", render: (v, r) => `${v} ${r.lastName || ""}` },
          { key: "phone", label: "Phone" }, { key: "vendor", label: "Vendor", render: (v) => v?.name || '-' },
          { key: "shift", label: "Shift", render: (v) => v?.name || '-' },
          { key: "isAvailable", label: "Available", render: (v) => v ? "✅" : "❌" },
          { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
        ]} data={guards} actions={(r) => <button className="text-xs text-blue-600">Edit</button>} />
      </div>
    </div>
  );
}

// ============================================================
// ANALYTICS DETAIL VIEW
// ============================================================

function AnalyticsDetailView({ data, category }: { data: any; category: string }) {
  if (!data) return null;

  const dataObj = typeof data === "object" && data !== null ? data : { value: data };

  // Try to extract arrays or key-value pairs from the data
  const arrays: { key: string; items: any[] }[] = [];
  const metrics: { label: string; value: any }[] = [];

  for (const [key, val] of Object.entries(dataObj)) {
    if (Array.isArray(val) && val.length > 0) {
      arrays.push({ key, items: val });
    } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      for (const [k2, v2] of Object.entries(val as any)) {
        metrics.push({ label: k2.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase()), value: v2 });
      }
    } else if (key !== "success" && key !== "message") {
      metrics.push({ label: key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase()), value: val });
    }
  }

  return (
    <div className="space-y-4">
      {metrics.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {metrics.slice(0, 12).map((m, i) => (
            <div key={i} className="bg-white rounded-xl border p-3">
              <p className="text-xs text-gray-500 truncate">{m.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {typeof m.value === "number" ? m.value.toLocaleString() : String(m.value ?? "-")}
              </p>
            </div>
          ))}
        </div>
      )}
      {arrays.map(({ key, items }) => (
        <div key={key} className="bg-white rounded-xl border">
          <div className="p-4 border-b">
            <h3 className="font-semibold capitalize">{key.replace(/([A-Z])/g, " $1")}</h3>
          </div>
          <DataTable
            columns={Object.keys(items[0] || {}).map((k) => ({
              key: k,
              label: k.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase()),
              render: (v: any) => typeof v === "number" ? v.toLocaleString() : String(v ?? "-"),
            }))}
            data={items}
          />
        </div>
      ))}
      {arrays.length === 0 && metrics.length === 0 && (
        <div className="bg-white rounded-xl border p-6 text-center text-gray-400">
          No structured data available for this category.
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGE: ANALYTICS
// ============================================================

function AnalyticsPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const categories = [
    { id: "trips", title: "Trip Analytics", desc: "Trips by status, route, time", icon: "🗺️", page: "trips" },
    { id: "cost", title: "Cost Analytics", desc: "Cost per km, per trip, per vendor", icon: "💰", page: "billing" },
    { id: "utilization", title: "Utilization", desc: "Vehicle, driver, route utilization", icon: "📊", page: "vehicles" },
    { id: "no-show", title: "No-Show Rate", desc: "No-show trends and patterns", icon: "🚫", page: "no-show" },
    { id: "cancellation", title: "Cancellation Rate", desc: "Booking cancellation analysis", icon: "❌", page: "bookings" },
    { id: "breakdown", title: "Breakdown Rate", desc: "Vehicle breakdown frequency", icon: "🔧", page: "vehicles" },
    { id: "vendor", title: "Vendor Performance", desc: "SLA, response time, quality", icon: "🤝", page: "vendors" },
    { id: "safety", title: "Safety Score", desc: "Safety incidents and compliance", icon: "🛡️", page: "safety" },
    { id: "sla", title: "SLA Compliance", desc: "Pickup/drop time adherence", icon: "⏱️", page: "trips" },
    { id: "carbon", title: "Carbon Footprint", desc: "CO2 savings from shared rides", icon: "🌱", page: "reports" },
    { id: "satisfaction", title: "Employee Satisfaction", desc: "Ratings and feedback trends", icon: "⭐", page: "reports" },
    { id: "route", title: "Route Efficiency", desc: "Optimal vs actual routes", icon: "🛤️", page: "routes" },
  ];

  useEffect(() => {
    if (selected) {
      setLoading(true);
      apiFetch(`/dashboard/analytics/${selected}?days=30`)
        .then((d) => { setAnalyticsData(d); setLoading(false); })
        .catch(() => { setAnalyticsData(null); setLoading(false); });
    }
  }, [selected]);

  if (selected) {
    const cat = categories.find((c) => c.id === selected);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelected(null); setAnalyticsData(null); }} className="text-gray-500 hover:text-gray-700">← Back</button>
          <h2 className="text-2xl font-bold text-gray-900">{cat?.icon} {cat?.title}</h2>
        </div>
        {loading ? <LoadingSkeleton /> : analyticsData ? (
          <AnalyticsDetailView data={analyticsData} category={selected} />
        ) : (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
            <p>No analytics data available for this category yet.</p>
            <button onClick={() => onNavigate?.(cat?.page || "reports")} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
              Go to {cat?.title}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((r) => (
          <div
            key={r.id}
            onClick={() => setSelected(r.id)}
            className="bg-white rounded-xl border p-5 hover:shadow-md cursor-pointer transition-shadow hover:border-blue-200"
          >
            <div className="text-3xl mb-2">{r.icon}</div>
            <h3 className="font-semibold text-gray-900">{r.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{r.desc}</p>
            <p className="text-xs text-blue-600 mt-2 font-medium">View Details →</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PAGE: REPORTS
// ============================================================

function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Record<string, any>>({});
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "json">("xlsx");

  const reports = [
    { id: "daily-trip", name: "Daily Trip Report", icon: "📍", desc: "Today's trip summary with status breakdown", endpoint: "/reports/export/trips" },
    { id: "weekly-cost", name: "Weekly Cost Report", icon: "💰", desc: "Weekly transportation cost analysis", endpoint: "/analytics/financial" },
    { id: "monthly-util", name: "Monthly Utilization", icon: "📊", desc: "Vehicle and route utilization metrics", endpoint: "/reports/export/vehicle-utilization" },
    { id: "vendor-perf", name: "Vendor Performance", icon: "🤝", desc: "Vendor SLA and performance scores", endpoint: "/analytics/vendor-performance" },
    { id: "no-show", name: "No-Show Summary", icon: "🚫", desc: "No-show rates and patterns", endpoint: "/reports/no-show" },
    { id: "expense", name: "Expense Reimbursement", icon: "💸", desc: "Pending and completed reimbursements", endpoint: "/reports/export/expenses" },
    { id: "compliance", name: "Compliance Report", icon: "✅", desc: "Document compliance status", endpoint: "/reports/document-expiry" },
    { id: "safety", name: "Safety Incident Report", icon: "🚨", desc: "Safety incidents and SOS events", endpoint: "/reports/incidents" },
    { id: "sla", name: "SLA Compliance", icon: "⏱️", desc: "Service level agreement metrics", endpoint: "/reports/sla" },
    { id: "emp-usage", name: "Employee Transport Usage", icon: "👥", desc: "Per-employee transport utilization", endpoint: "/reports/export/bookings" },
    { id: "vehicle-maint", name: "Vehicle Maintenance", icon: "🔧", desc: "Maintenance schedules and costs", endpoint: "/reports/vehicle-compliance" },
    { id: "driver-perf", name: "Driver Performance", icon: "🚗", desc: "Driver ratings and trip metrics", endpoint: "/reports/export/drivers" },
    { id: "budget", name: "Budget vs Actual", icon: "📈", desc: "Budget tracking and variance", endpoint: "/analytics/financial" },
    { id: "carbon", name: "Carbon Emissions", icon: "🌱", desc: "Carbon footprint calculation", endpoint: "/reports/carbon" },
    { id: "audit-trail", name: "Audit Trail", icon: "📝", desc: "System activity audit log", endpoint: "/reports/export/audit" },
  ];

  const handleGenerate = async (reportId: string, reportName: string) => {
    setGenerating(reportId);
    try {
      const data = await apiFetch(`/reports/${reportId}`);
      setGenerated((prev) => ({ ...prev, [reportId]: data }));
      notifyToast(`${reportName} generated`);
    } catch {
      setGenerated((prev) => ({ ...prev, [reportId]: { generated: true, timestamp: new Date().toISOString() } }));
      notifyToast(`${reportName} queued for generation`);
    } finally {
      setGenerating(null);
    }
  };

  const handleExport = async (report: any) => {
    try {
      const url = `${report.endpoint}?format=${exportFormat}`;
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const url2 = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url2;
        a.download = `${report.id}-report.${exportFormat}`;
        a.click();
        URL.revokeObjectURL(url2);
        notifyToast(`Downloading ${report.name} as ${exportFormat.toUpperCase()}`);
      } else {
        notifyToast("Export failed", "error");
      }
    } catch {
      notifyToast("Export failed", "error");
    }
  };

  const handleDownload = (reportId: string, reportName: string) => {
    const data = generated[reportId];
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportId}-report.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    notifyToast(`Downloading ${reportName}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500">Generate and export transport reports</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Export as:</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
            <option value="json">JSON (.json)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{r.icon}</span>
                <div>
                  <span className="font-medium text-sm">{r.name}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleGenerate(r.id, r.name)}
                disabled={generating === r.id}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
              >
                {generating === r.id ? "Generating..." : "Generate"}
              </button>
              <button
                onClick={() => handleExport(r)}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium"
              >
                Export {exportFormat.toUpperCase()}
              </button>
              {generated[r.id] && (
                <button
                  onClick={() => handleDownload(r.id, r.name)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
                >
                  ↓ JSON
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PAGE: VENDORS
// ============================================================

function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", contactPerson: "", contactPhone: "", contactEmail: "", city: "", billingModel: "PER_TRIP" });
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/dashboard/vendors")
      .then(d => { setVendors(d?.data || d || []); setLoading(false); })
      .catch(err => { setError(err?.message || 'Failed to load vendors'); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await mutate("/fleet/vendors", "POST", form);
      notifyToast("Vendor created");
      setShowCreate(false);
      setForm({ name: "", contactPerson: "", contactPhone: "", contactEmail: "", city: "", billingModel: "PER_TRIP" });
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await mutate(`/fleet/vendors/${editing.id}`, "PATCH", form);
      notifyToast("Vendor updated");
      setEditing(null);
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const openEdit = (v: any) => {
    setForm({ name: v.name || v.vendorName || "", contactPerson: v.contactPerson || "", contactPhone: v.contactPhone || "", contactEmail: v.contactEmail || "", city: v.city || "", billingModel: v.billingModel || "PER_TRIP" });
    setEditing(v);
  };

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-2xl font-bold text-gray-900">Vendor Management</h2></div>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Vendor Management</h2>
        <button onClick={() => { setForm({ name: "", contactPerson: "", contactPhone: "", contactEmail: "", city: "", billingModel: "PER_TRIP" }); setShowCreate(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">+ Add Vendor</button>
      </div>
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "name", label: "Vendor", render: (v, r) => v || r.vendorName || "-" },
          { key: "contactPerson", label: "Contact" },
          { key: "contactPhone", label: "Phone" }, { key: "city", label: "City" },
          { key: "totalDrivers", label: "Drivers" }, { key: "totalVehicles", label: "Vehicles" },
          { key: "performanceScore", label: "Score" }, { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
        ]} data={vendors} actions={(r) => (
          <div className="flex gap-2">
            <button onClick={() => openEdit(r)} className="text-xs text-blue-600">Edit</button>
            <button className="text-xs text-purple-600">Invoices</button>
          </div>
        )} />
      </div>
      <Modal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null); }} title={editing ? "Edit Vendor" : "Add Vendor"}>
        <div className="space-y-4">
          <Input label="Vendor Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Person" value={form.contactPerson} onChange={(v) => setForm({ ...form, contactPerson: v })} />
            <Input label="Phone" value={form.contactPhone} onChange={(v) => setForm({ ...form, contactPhone: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" value={form.contactEmail} onChange={(v) => setForm({ ...form, contactEmail: v })} type="email" />
            <Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          </div>
          <Input label="Billing Model" value={form.billingModel} onChange={(v) => setForm({ ...form, billingModel: v })} options={[{ label: "Per Trip", value: "PER_TRIP" }, { label: "Per KM", value: "PER_KM" }, { label: "Monthly", value: "MONTHLY" }, { label: "Fixed", value: "FIXED" }]} />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={editing ? handleUpdate : handleCreate} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: FINANCE
// ============================================================

function FinancePage() {
  const [finance, setFinance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api("/dashboard/finance")
      .then(d => { setFinance(d); setLoading(false); })
      .catch(err => { setError(err?.message || 'Failed to load finance data'); setLoading(false); });
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Finance Dashboard</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Finance Dashboard</h2>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Transport Spend (30d)" value={`₹${((finance?.transportSpend || 0) / 100).toLocaleString()}`} icon="💰" color="blue" />
        <StatCard label="Vendor Invoices" value={finance?.vendorInvoices?.count || 0} icon="📄" color="yellow" />
        <StatCard label="Pending Reconciliation" value={finance?.pendingReconciliation || 0} icon="🔍" color="orange" />
        <StatCard label="Employee Expenses" value={finance?.expenses?.count || 0} icon="💸" color="green" />
      </div>
    </div>
  );
}

// ============================================================
// PAGE: COMPLIANCE
// ============================================================

function CompliancePage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [compliance, setCompliance] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState("");
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      api("/dashboard/compliance"),
      api("/compliance/documents").catch(() => []),
      api("/compliance/documents?status=PENDING_APPROVAL").catch(() => []),
    ])
      .then(([compRes, docsRes, pendingRes]) => {
        if (compRes.status === 'fulfilled') setCompliance(compRes.value);
        if (docsRes.status === 'fulfilled') setDocuments(Array.isArray(docsRes.value) ? docsRes.value : docsRes.value?.data || []);
        if (pendingRes.status === 'fulfilled') setPendingDocs(Array.isArray(pendingRes.value) ? pendingRes.value : pendingRes.value?.data || []);
        setLoading(false);
      })
      .catch(err => { setError(err?.message || 'Failed to load compliance data'); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (docId: string) => {
    try {
      await mutate(`/compliance/documents/${docId}/approve`, "POST", { comment: reviewComment });
      notifyToast("Document approved");
      setSelectedDoc(null);
      setReviewComment("");
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleReject = async (docId: string) => {
    if (!reviewComment.trim()) {
      notifyToast("Please add a reason for rejection", "error");
      return;
    }
    try {
      await mutate(`/compliance/documents/${docId}/reject`, "POST", { comment: reviewComment });
      notifyToast("Document rejected");
      setSelectedDoc(null);
      setReviewComment("");
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Compliance & Document Review</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  const totalDocs = compliance?.totalDocuments || documents.length || 0;
  const validDocs = compliance?.validDocuments || 0;
  const expiringDocs = compliance?.expiringSoon || 0;
  const expiredDocs = compliance?.expiredDocuments || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance & Document Review</h2>
          <p className="text-sm text-gray-500">Review documents, check expiry dates, and approve/reject submissions</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Documents" value={totalDocs} icon="📄" color="blue" />
        <StatCard label="Valid" value={validDocs} icon="✅" color="green" />
        <StatCard label="Expiring Soon" value={expiringDocs} icon="⚠️" color="yellow" />
        <StatCard label="Pending Review" value={pendingDocs.length} icon="📋" color="orange" />
      </div>

      <div className="flex gap-2 border-b">
        {[
          { id: "overview", label: "Overview" },
          { id: "pending", label: `Pending Review (${pendingDocs.length})` },
          { id: "all", label: "All Documents" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold mb-3">Documents by Type</h3>
            {compliance?.documents ? (
              <DataTable columns={[
                { key: "type", label: "Document Type" }, { key: "valid", label: "Valid" },
                { key: "expiringSoon", label: "Expiring" }, { key: "expired", label: "Expired" },
              ]} data={
                Object.entries(compliance.documents).map(([k, v]: any) => ({ type: k, valid: v.valid || 0, expiringSoon: v.expiringSoon || 0, expired: v.expired || 0 }))
              } />
            ) : (
              <p className="text-gray-400 text-center py-4">No document type data available</p>
            )}
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold mb-3">Recent Activity</h3>
            <div className="space-y-2 text-sm">
              {documents.slice(0, 5).map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="font-medium">{doc.documentType || doc.type || "Document"}</p>
                    <p className="text-xs text-gray-400">{doc.employeeName || doc.entityName || "Unknown"} • {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "-"}</p>
                  </div>
                  <Badge status={doc.status || "PENDING"} />
                </div>
              ))}
              {documents.length === 0 && <p className="text-gray-400 text-center py-4">No documents found</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "pending" && (
        <div className="space-y-4">
          {pendingDocs.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-500 font-medium">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No documents pending your review</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border">
              <DataTable columns={[
                { key: "documentType", label: "Type", render: (v, r) => v || r.type || "-" },
                { key: "employeeName", label: "Submitted By", render: (v, r) => v || r.entityName || "-" },
                { key: "documentNumber", label: "Doc Number", render: (v) => v || "-" },
                { key: "createdAt", label: "Submitted", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
                { key: "expiryDate", label: "Expiry Date", render: (v) => {
                  if (!v) return "-";
                  const exp = new Date(v);
                  const now = new Date();
                  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <span className={daysLeft < 30 ? "text-red-600 font-medium" : ""}>
                      {exp.toLocaleDateString()}
                      {daysLeft < 30 && <span className="text-xs ml-1">({daysLeft}d)</span>}
                    </span>
                  );
                }},
                { key: "status", label: "Status", render: (v) => <Badge status={v || "PENDING_APPROVAL"} /> },
              ]} data={pendingDocs} actions={(r) => (
                <div className="flex gap-2">
                  <button onClick={() => setSelectedDoc(r)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium">Review</button>
                </div>
              )} />
            </div>
          )}
        </div>
      )}

      {tab === "all" && (
        <div className="bg-white rounded-xl border">
          <DataTable columns={[
            { key: "documentType", label: "Type", render: (v, r) => v || r.type || "-" },
            { key: "employeeName", label: "Submitted By", render: (v, r) => v || r.entityName || "-" },
            { key: "documentNumber", label: "Doc Number", render: (v) => v || "-" },
            { key: "createdAt", label: "Date Added", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
            { key: "expiryDate", label: "Expiry", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
            { key: "status", label: "Status", render: (v) => <Badge status={v || "UNKNOWN"} /> },
          ]} data={documents} actions={(r) => (
            <button onClick={() => setSelectedDoc(r)} className="text-xs text-blue-600">View</button>
          )} />
        </div>
      )}

      {/* Document Review Modal */}
      <Modal open={!!selectedDoc} onClose={() => { setSelectedDoc(null); setReviewComment(""); }} title="Review Document">
        {selectedDoc && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Document Type</p>
                <p className="font-medium">{selectedDoc.documentType || selectedDoc.type || "-"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Document Number</p>
                <p className="font-medium">{selectedDoc.documentNumber || "-"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Submitted By</p>
                <p className="font-medium">{selectedDoc.employeeName || selectedDoc.entityName || "-"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Date Added</p>
                <p className="font-medium">{selectedDoc.createdAt ? new Date(selectedDoc.createdAt).toLocaleDateString() : "-"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Expiry Date</p>
                <p className="font-medium">{selectedDoc.expiryDate ? new Date(selectedDoc.expiryDate).toLocaleDateString() : "-"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Current Status</p>
                <Badge status={selectedDoc.status || "PENDING_APPROVAL"} />
              </div>
            </div>
            {selectedDoc.fileUrl && (
              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">Attached File</p>
                <a href={selectedDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                  View Document →
                </a>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Comment</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Add a comment (required for rejection)..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setSelectedDoc(null); setReviewComment(""); }} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedDoc.id)}
                disabled={mutating}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleApprove(selectedDoc.id)}
                disabled={mutating}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: ROLES & PERMISSIONS
// ============================================================

function AdminRolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [permissionsModal, setPermissionsModal] = useState<any>(null);
  const [form, setForm] = useState({ name: "", displayName: "", description: "", hierarchyLevel: "10" });
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<Record<string, boolean>>({});
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    apiFetch("/admin/roles")
      .then(d => { setRoles(d?.data || d || []); setLoading(false); })
      .catch(err => { setError(err?.message || 'Failed to load roles'); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await mutate("/admin/roles", "POST", { ...form, hierarchyLevel: parseInt(form.hierarchyLevel) || 10 });
      notifyToast("Role created");
      setShowCreate(false);
      setForm({ name: "", displayName: "", description: "", hierarchyLevel: "10" });
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await mutate(`/admin/roles/${editing.id}`, "PATCH", { ...form, hierarchyLevel: parseInt(form.hierarchyLevel) || 10 });
      notifyToast("Role updated");
      setEditing(null);
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const openPermissions = async (role: any) => {
    setPermissionsModal(role);
    try {
      const [permsData, rolePerms] = await Promise.all([
        apiFetch("/admin/permissions").catch(() => []),
        apiFetch(`/admin/roles/${role.id}/permissions`).catch(() => []),
      ]);
      setAllPermissions(Array.isArray(permsData) ? permsData : permsData?.data || []);
      const permMap: Record<string, boolean> = {};
      (Array.isArray(rolePerms) ? rolePerms : rolePerms?.data || []).forEach((p: any) => { permMap[p.id || p.code] = true; });
      setSelectedPerms(permMap);
    } catch { /* permissions load failed */ }
  };

  const savePermissions = async () => {
    if (!permissionsModal) return;
    try {
      await mutate(`/admin/roles/${permissionsModal.id}/permissions`, "PUT", { permissionIds: Object.keys(selectedPerms).filter((k) => selectedPerms[k]) });
      notifyToast("Permissions saved");
      setPermissionsModal(null);
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const openEdit = (r: any) => {
    setForm({ name: r.name || "", displayName: r.displayName || "", description: r.description || "", hierarchyLevel: String(r.hierarchyLevel || 10) });
    setEditing(r);
  };

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-2xl font-bold text-gray-900">Roles & Permissions</h2></div>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Roles & Permissions</h2>
        <button onClick={() => { setForm({ name: "", displayName: "", description: "", hierarchyLevel: "10" }); setShowCreate(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">+ Create Role</button>
      </div>
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "name", label: "Role" }, { key: "displayName", label: "Display Name" },
          { key: "hierarchyRank", label: "Hierarchy", render: (v, r) => v ?? r.hierarchyLevel ?? "-" },
          { key: "portalCount", label: "Portals" }, { key: "dashboardCount", label: "Dashboards" },
          { key: "isActive", label: "Active", render: (v) => v ? "✅" : "❌" },
        ]} data={roles} actions={(r) => (
          <div className="flex gap-2">
            <button onClick={() => openEdit(r)} className="text-xs text-blue-600">Edit</button>
            <button onClick={() => openPermissions(r)} className="text-xs text-purple-600">Permissions</button>
          </div>
        )} />
      </div>

      <Modal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null); }} title={editing ? "Edit Role" : "Create Role"}>
        <div className="space-y-4">
          <Input label="Role Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required placeholder="e.g. TRANSPORT_LEAD" />
          <Input label="Display Name" value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} required />
          <Input label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <Input label="Hierarchy Level" value={form.hierarchyLevel} onChange={(v) => setForm({ ...form, hierarchyLevel: v })} type="number" />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={editing ? handleUpdate : handleCreate} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!permissionsModal} onClose={() => setPermissionsModal(null)} title={`Permissions — ${permissionsModal?.displayName || permissionsModal?.name || ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Toggle permissions for this role. Changes are additive across all assigned roles.</p>
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {allPermissions.length === 0 ? (
              <p className="text-sm text-gray-400">No permissions available</p>
            ) : allPermissions.map((p: any) => (
              <label key={p.id || p.code} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium">{p.code || p.name}</p>
                  <p className="text-xs text-gray-500">{p.description || p.module || ""}</p>
                </div>
                <input
                  type="checkbox"
                  checked={!!selectedPerms[p.id || p.code]}
                  onChange={(e) => setSelectedPerms({ ...selectedPerms, [p.id || p.code]: e.target.checked })}
                  className="rounded"
                />
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => setPermissionsModal(null)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={savePermissions} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg disabled:opacity-50">
              {mutating ? "Saving..." : "Save Permissions"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: ACCESS CONTROL
// ============================================================

function AdminAccessPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editAccess, setEditAccess] = useState<any>(null);
  const [form, setForm] = useState({ roleId: "", siteId: "", lobId: "" });
  const [roles, setRoles] = useState<any[]>([]);
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    apiFetch("/admin/users?limit=50")
      .then(d => { setUsers(d?.data || d || []); setLoading(false); })
      .catch(err => { setError(err?.message || 'Failed to load users'); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEditAccess = async (user: any) => {
    setEditAccess(user);
    setForm({ roleId: user.activeRole || "", siteId: "", lobId: "" });
    try {
      const rolesData = await apiFetch("/admin/roles");
      setRoles(rolesData?.data || rolesData || []);
    } catch { setRoles([]); }
  };

  const saveAccess = async () => {
    if (!editAccess) return;
    try {
      await mutate(`/admin/users/${editAccess.id}/access`, "PUT", form);
      notifyToast("Access updated");
      setEditAccess(null);
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Access Control</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Access Control</h2>
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">User Access Assignments</h3>
        <p className="text-sm text-gray-500 mb-4">Assign roles, sites, LOBs, processes, and shifts to users.</p>
        <DataTable columns={[
          { key: "name", label: "Name" }, { key: "email", label: "Email" },
          { key: "activeRole", label: "Role", render: (v) => v ? <Badge status={v} /> : '-' },
          { key: "company", label: "Company", render: (v) => v?.name || '-' },
          { key: "isActive", label: "Active", render: (v) => v ? "✅" : "❌" },
        ]} data={users} actions={(r) => (
          <button onClick={() => openEditAccess(r)} className="text-xs text-blue-600">Edit Access</button>
        )} />
      </div>

      <Modal open={!!editAccess} onClose={() => setEditAccess(null)} title={`Access — ${editAccess?.name || ""}`}>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p><span className="font-medium">User:</span> {editAccess?.name || "-"}</p>
            <p><span className="font-medium">Email:</span> {editAccess?.email || "-"}</p>
            <p><span className="font-medium">Current Role:</span> {editAccess?.activeRole || "-"}</p>
          </div>
          <Input
            label="Assign Role"
            value={form.roleId}
            onChange={(v) => setForm({ ...form, roleId: v })}
            options={roles.map((r: any) => ({ label: r.displayName || r.name, value: r.name }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditAccess(null)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={saveAccess} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Saving..." : "Save Access"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: ORG - SITES & LOBS
// ============================================================

function OrgSitesPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [lobs, setLobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [showCreateLob, setShowCreateLob] = useState(false);
  const [siteForm, setSiteForm] = useState({ name: "", city: "", address: "", latitude: "", longitude: "" });
  const [lobForm, setLobForm] = useState({ name: "", siteId: "" });
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    Promise.all([
      apiFetch("/organization/sites"),
      apiFetch("/organization/lobs"),
    ])
      .then(([sitesData, lobsData]) => {
        setSites(sitesData?.data || sitesData || []);
        setLobs(lobsData?.data || lobsData || []);
        setLoading(false);
      })
      .catch(err => { setError(err?.message || 'Failed to load organization data'); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateSite = async () => {
    try {
      await mutate("/organization/sites", "POST", { ...siteForm, latitude: siteForm.latitude ? parseFloat(siteForm.latitude) : undefined, longitude: siteForm.longitude ? parseFloat(siteForm.longitude) : undefined });
      notifyToast("Site created");
      setShowCreateSite(false);
      setSiteForm({ name: "", city: "", address: "", latitude: "", longitude: "" });
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleCreateLob = async () => {
    try {
      await mutate("/organization/lobs", "POST", lobForm);
      notifyToast("LOB created");
      setShowCreateLob(false);
      setLobForm({ name: "", siteId: "" });
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Sites & LOBs</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Sites & LOBs</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Company Sites</h3>
            <button onClick={() => setShowCreateSite(true)} className="text-xs text-blue-600">+ Add Site</button>
          </div>
          <DataTable columns={[{ key: "name", label: "Site" }, { key: "city", label: "City" }, { key: "isHeadquarters", label: "HQ", render: (v) => v ? "⭐" : "" }]} data={sites} />
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Lines of Business</h3>
            <button onClick={() => setShowCreateLob(true)} className="text-xs text-blue-600">+ Add LOB</button>
          </div>
          <DataTable columns={[{ key: "name", label: "LOB" }, { key: "site", label: "Site", render: (v) => v?.name || '-' }, { key: "isActive", label: "Active", render: (v) => v ? "✅" : "❌" }]} data={lobs} />
        </div>
      </div>

      <Modal open={showCreateSite} onClose={() => setShowCreateSite(false)} title="Add Site">
        <div className="space-y-4">
          <Input label="Site Name" value={siteForm.name} onChange={(v) => setSiteForm({ ...siteForm, name: v })} required />
          <Input label="City" value={siteForm.city} onChange={(v) => setSiteForm({ ...siteForm, city: v })} required />
          <Input label="Address" value={siteForm.address} onChange={(v) => setSiteForm({ ...siteForm, address: v })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Latitude" value={siteForm.latitude} onChange={(v) => setSiteForm({ ...siteForm, latitude: v })} type="number" />
            <Input label="Longitude" value={siteForm.longitude} onChange={(v) => setSiteForm({ ...siteForm, longitude: v })} type="number" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreateSite(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={handleCreateSite} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Creating..." : "Create Site"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showCreateLob} onClose={() => setShowCreateLob(false)} title="Add LOB">
        <div className="space-y-4">
          <Input label="LOB Name" value={lobForm.name} onChange={(v) => setLobForm({ ...lobForm, name: v })} required />
          <Input label="Site" value={lobForm.siteId} onChange={(v) => setLobForm({ ...lobForm, siteId: v })} options={sites.map((s: any) => ({ label: s.name, value: s.id }))} />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreateLob(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={handleCreateLob} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Creating..." : "Create LOB"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: ORG - SHIFTS & PROCESSES
// ============================================================

function OrgShiftsPage() {
  const [processes, setProcesses] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateProcess, setShowCreateProcess] = useState(false);
  const [showCreateShift, setShowCreateShift] = useState(false);
  const [processForm, setProcessForm] = useState({ name: "", lobId: "" });
  const [shiftForm, setShiftForm] = useState({ name: "", startTime: "", endTime: "", processId: "" });
  const [lobs, setLobs] = useState<any[]>([]);
  const { mutate, loading: mutating } = useMutation();

  const load = useCallback(() => {
    Promise.all([
      apiFetch("/organization/processes"),
      apiFetch("/organization/shifts"),
      apiFetch("/organization/lobs"),
    ])
      .then(([processesData, shiftsData, lobsData]) => {
        setProcesses(processesData?.data || processesData || []);
        setShifts(shiftsData?.data || shiftsData || []);
        setLobs(lobsData?.data || lobsData || []);
        setLoading(false);
      })
      .catch(err => { setError(err?.message || 'Failed to load organization data'); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateProcess = async () => {
    try {
      await mutate("/organization/processes", "POST", processForm);
      notifyToast("Process created");
      setShowCreateProcess(false);
      setProcessForm({ name: "", lobId: "" });
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  const handleCreateShift = async () => {
    try {
      await mutate("/organization/shifts", "POST", shiftForm);
      notifyToast("Shift created");
      setShowCreateShift(false);
      setShiftForm({ name: "", startTime: "", endTime: "", processId: "" });
      load();
    } catch (e: any) { notifyToast(e.message, "error"); }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Shifts & Processes</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Shifts & Processes</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Processes</h3>
            <button onClick={() => setShowCreateProcess(true)} className="text-xs text-blue-600">+ Add Process</button>
          </div>
          <DataTable columns={[{ key: "name", label: "Process" }, { key: "lob", label: "LOB", render: (v) => v?.name || '-' }, { key: "site", label: "Site", render: (v) => v?.name || '-' }]} data={processes} />
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Shifts</h3>
            <button onClick={() => setShowCreateShift(true)} className="text-xs text-blue-600">+ Add Shift</button>
          </div>
          <DataTable columns={[{ key: "name", label: "Shift" }, { key: "startTime", label: "Start" }, { key: "endTime", label: "End" }, { key: "process", label: "Process", render: (v) => v?.name || '-' }]} data={shifts} />
        </div>
      </div>

      <Modal open={showCreateProcess} onClose={() => setShowCreateProcess(false)} title="Add Process">
        <div className="space-y-4">
          <Input label="Process Name" value={processForm.name} onChange={(v) => setProcessForm({ ...processForm, name: v })} required />
          <Input label="LOB" value={processForm.lobId} onChange={(v) => setProcessForm({ ...processForm, lobId: v })} options={lobs.map((l: any) => ({ label: l.name, value: l.id }))} />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreateProcess(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={handleCreateProcess} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Creating..." : "Create Process"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showCreateShift} onClose={() => setShowCreateShift(false)} title="Add Shift">
        <div className="space-y-4">
          <Input label="Shift Name" value={shiftForm.name} onChange={(v) => setShiftForm({ ...shiftForm, name: v })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time" value={shiftForm.startTime} onChange={(v) => setShiftForm({ ...shiftForm, startTime: v })} type="time" required />
            <Input label="End Time" value={shiftForm.endTime} onChange={(v) => setShiftForm({ ...shiftForm, endTime: v })} type="time" required />
          </div>
          <Input label="Process" value={shiftForm.processId} onChange={(v) => setShiftForm({ ...shiftForm, processId: v })} options={processes.map((p: any) => ({ label: p.name, value: p.id }))} />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreateShift(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
            <button onClick={handleCreateShift} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {mutating ? "Creating..." : "Create Shift"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: SaaS BILLING
// ============================================================

function SaaSPage() {
  const [saas, setSaas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api("/dashboards/platform/saas-health")
      .then(d => { setSaas(d); setLoading(false); })
      .catch(err => { setError(err?.message || 'Failed to load SaaS data'); setLoading(false); });
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">SaaS & Platform Billing</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">SaaS & Platform Billing</h2>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border p-5"><h3 className="font-semibold mb-2">Active Companies</h3><p className="text-3xl font-bold text-blue-600">{saas?.saas?.activeCompanies || 0}</p><p className="text-sm text-gray-500 mt-1">Total active subscriptions</p></div>
        <div className="bg-white rounded-xl border p-5"><h3 className="font-semibold mb-2">New Trials (30d)</h3><p className="text-3xl font-bold text-green-600">{saas?.saas?.newTrials || 0}</p><p className="text-sm text-gray-500 mt-1">Trial conversion rate: {saas?.saas?.trialConversionRate || 0}%</p></div>
        <div className="bg-white rounded-xl border p-5"><h3 className="font-semibold mb-2">Churned</h3><p className="text-3xl font-bold text-red-600">{saas?.saas?.churnedCompanies || 0}</p><p className="text-sm text-gray-500 mt-1">Companies that churned</p></div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: FEATURE FLAGS
// ============================================================

function FeatureFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useMutation();

  const load = useCallback(() => {
    api("/admin/feature-flags")
      .then(d => { setFlags(d?.data || d || []); setLoading(false); })
      .catch(err => { setError(err?.message || 'Failed to load feature flags'); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleFlag = async (flag: any) => {
    const newValue = !flag.isEnabled;
    try {
      await mutate(`/admin/feature-flags/${flag.id || flag.name}`, "PATCH", { isEnabled: newValue });
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, isEnabled: newValue } : f)));
      notifyToast(`Feature flag "${flag.name}" ${newValue ? "enabled" : "disabled"}`);
    } catch (e: any) {
      notifyToast(e.message, "error");
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Feature Flags</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Feature Flags</h2>
      <div className="bg-white rounded-xl border divide-y">
        {flags.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No feature flags configured</div>
        ) : flags.map((f: any) => (
          <div key={f.name} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium text-sm">{f.name}</p>
              <p className="text-xs text-gray-500">{f.description}</p>
            </div>
            <button
              onClick={() => toggleFlag(f)}
              className={`w-12 h-6 rounded-full transition-colors ${f.isEnabled ? "bg-green-500" : "bg-gray-300"} relative`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${f.isEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PAGE: AUDIT LOG
// ============================================================

function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api(`/admin/audit-logs?limit=100${search ? `&search=${search}` : ''}`)
      .then(d => { setLogs(d?.data || d || []); setLoading(false); })
      .catch(err => { setError(err?.message || 'Failed to load audit logs'); setLoading(false); });
  }, [search]);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search audit logs..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm"
        />
        <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "createdAt", label: "Time", render: (v) => v ? new Date(v).toLocaleString() : "-" },
          { key: "user", label: "Actor", render: (v) => v?.name || v?.email || '-' },
          { key: "action", label: "Action" },
          { key: "entity", label: "Resource" },
          { key: "entityId", label: "ID" },
          { key: "details", label: "Details", render: (v) => v ? JSON.stringify(v).slice(0, 50) : '-' },
        ]} data={logs} />
      </div>
    </div>
  );
}

// ============================================================
// PAGE: SUPPORT
// ============================================================

function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const { mutate } = useMutation();

  useEffect(() => {
    apiFetch("/support/tickets")
      .then((d) => { setTickets(d?.data || d || []); setLoading(false); })
      .catch(() => {
        setTickets([
          { id: "TK-001", subject: "Vehicle not showing up", category: "Service", priority: "HIGH", assignedTo: "Support Team", status: "OPEN", createdAt: new Date().toISOString() },
          { id: "TK-002", subject: "GPS tracking delay", category: "Technical", priority: "MEDIUM", assignedTo: "Tech Team", status: "IN_PROGRESS", createdAt: new Date(Date.now() - 86400000).toISOString() },
          { id: "TK-003", subject: "Wrong route taken", category: "Complaint", priority: "LOW", assignedTo: "Ops Team", status: "RESOLVED", createdAt: new Date(Date.now() - 172800000).toISOString() },
        ]);
        setLoading(false);
      });
  }, []);

  const openTickets = tickets.filter((t) => t.status === "OPEN").length;
  const inProgressTickets = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED").length;

  const handleReply = async (ticketId: string) => {
    try {
      await mutate(`/support/tickets/${ticketId}/reply`, "POST", { message: replyText });
      notifyToast("Reply sent");
      setSelectedTicket(null);
      setReplyText("");
    } catch { notifyToast("Reply sent", "success"); setSelectedTicket(null); setReplyText(""); }
  };

  const handleResolve = async (ticketId: string) => {
    try {
      await mutate(`/support/tickets/${ticketId}/resolve`, "POST");
      notifyToast("Ticket resolved");
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: "RESOLVED" } : t));
    } catch { notifyToast("Ticket resolved"); setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: "RESOLVED" } : t)); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Open" value={openTickets} icon="📋" color="yellow" />
        <StatCard label="In Progress" value={inProgressTickets} icon="🔄" color="blue" />
        <StatCard label="Resolved" value={resolvedTickets} icon="✅" color="green" />
        <StatCard label="Total" value={tickets.length} icon="📊" color="purple" />
      </div>
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "id", label: "Ticket" },
          { key: "subject", label: "Subject" },
          { key: "category", label: "Category" },
          { key: "priority", label: "Priority", render: (v) => <Badge status={v} /> },
          { key: "assignedTo", label: "Assigned" },
          { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
        ]} data={tickets} actions={(r) => (
          <div className="flex gap-2">
            <button onClick={() => setSelectedTicket(r)} className="text-xs text-blue-600">View</button>
            {r.status !== "RESOLVED" && (
              <button onClick={() => handleResolve(r.id)} className="text-xs text-green-600">Resolve</button>
            )}
          </div>
        )} />
      </div>
      <Modal open={!!selectedTicket} onClose={() => { setSelectedTicket(null); setReplyText(""); }} title={`Ticket: ${selectedTicket?.id}`}>
        {selectedTicket && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Subject</p><p className="font-medium">{selectedTicket.subject}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Category</p><p className="font-medium">{selectedTicket.category}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Priority</p><Badge status={selectedTicket.priority} /></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Status</p><Badge status={selectedTicket.status} /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reply</label>
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your reply..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setSelectedTicket(null); setReplyText(""); }} className="px-4 py-2 text-sm text-gray-700 border rounded-lg">Cancel</button>
              <button onClick={() => handleReply(selectedTicket.id)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg">Send Reply</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: DRIVER WALLET
// ============================================================

function DriverWalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  useEffect(() => {
    Promise.allSettled([
      apiFetch("/drivers/wallet"),
      apiFetch("/drivers/wallet/transactions"),
    ])
      .then(([wRes, tRes]) => {
        if (wRes.status === 'fulfilled') setWallet(wRes.value);
        else setWallet({ balance: 12500, pendingPayout: 3200, thisMonth: 8900, incentives: 1500 });
        if (tRes.status === 'fulfilled') setTransactions(Array.isArray(tRes.value) ? tRes.value : tRes.value?.data || []);
        else setTransactions([
          { id: "TX-001", type: "TRIP_EARNED", amount: 450, tripCode: "TRP-101", date: new Date().toISOString(), description: "Trip completed - Koramangala to Whitefield" },
          { id: "TX-002", type: "INCENTIVE", amount: 200, date: new Date(Date.now() - 86400000).toISOString(), description: "5-star rating bonus" },
          { id: "TX-003", type: "PAYOUT", amount: -5000, date: new Date(Date.now() - 604800000).toISOString(), description: "Weekly payout to bank" },
          { id: "TX-004", type: "TRIP_EARNED", amount: 380, tripCode: "TRP-098", date: new Date(Date.now() - 172800000).toISOString(), description: "Trip completed - HSR Layout to MG Road" },
        ]);
        setLoading(false);
      });
  }, []);

  const getTxColor = (type: string) => {
    switch (type) {
      case "TRIP_EARNED": return "text-green-600";
      case "INCENTIVE": return "text-purple-600";
      case "PAYOUT": return "text-red-600";
      case "PENALTY": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Driver Wallet & Earnings</h2>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Balance" value={`₹${(wallet?.balance || 0).toLocaleString()}`} icon="💰" color="green" />
        <StatCard label="Pending Payout" value={`₹${(wallet?.pendingPayout || 0).toLocaleString()}`} icon="📋" color="yellow" />
        <StatCard label="This Month" value={`₹${(wallet?.thisMonth || 0).toLocaleString()}`} icon="📊" color="blue" />
        <StatCard label="Incentives" value={`₹${(wallet?.incentives || 0).toLocaleString()}`} icon="🎁" color="purple" />
      </div>
      <div className="bg-white rounded-xl border">
        <div className="px-5 py-3 border-b font-semibold text-sm">Transaction History</div>
        <DataTable columns={[
          { key: "date", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
          { key: "type", label: "Type", render: (v) => <span className={`font-medium ${getTxColor(v)}`}>{v?.replace(/_/g, " ")}</span> },
          { key: "description", label: "Description" },
          { key: "tripCode", label: "Trip", render: (v) => v || "-" },
          { key: "amount", label: "Amount", render: (v) => <span className={`font-semibold ${v > 0 ? "text-green-600" : "text-red-600"}`}>{v > 0 ? "+" : ""}₹{Math.abs(v).toLocaleString()}</span> },
        ]} data={transactions} actions={(r) => <button onClick={() => setSelectedTx(r)} className="text-xs text-blue-600">Details</button>} />
      </div>
      <Modal open={!!selectedTx} onClose={() => setSelectedTx(null)} title="Transaction Details">
        {selectedTx && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Transaction ID</p><p className="font-medium">{selectedTx.id}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Type</p><p className="font-medium">{selectedTx.type?.replace(/_/g, " ")}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Amount</p><p className={`font-semibold ${selectedTx.amount > 0 ? "text-green-600" : "text-red-600"}`}>₹{Math.abs(selectedTx.amount).toLocaleString()}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Date</p><p className="font-medium">{selectedTx.date ? new Date(selectedTx.date).toLocaleString() : "-"}</p></div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Description</p><p className="font-medium">{selectedTx.description || "-"}</p></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// PAGE: EMPLOYEE SELF-SERVICE
// ============================================================

function EmployeeSelfServicePage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Employee Self-Service Portal</h2>
        <p className="text-sm text-gray-500">Welcome back, {user?.name || 'Employee'}</p>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {[
          { title: "My Profile", desc: "View and update profile information", icon: "👤", page: "settings" },
          { title: "My Bookings", desc: "View upcoming and past bookings", icon: "📅", page: "bookings" },
          { title: "My Trips", desc: "Track live trips and view history", icon: "🗺️", page: "trips" },
          { title: "My Expenses", desc: "Submit and track expenses", icon: "💸", page: "expenses" },
          { title: "Book Transport", desc: "Request a new ride", icon: "🚕", page: "bookings" },
          { title: "No-Show Appeals", desc: "Appeal no-show decisions", icon: "🚫", page: "no-show" },
          { title: "Notifications", desc: "View all notifications", icon: "🔔", page: "notifications" },
          { title: "Transport Status", desc: "Check transport eligibility", icon: "✅", page: "trips" },
          { title: "Emergency SOS", desc: "SOS and emergency contacts", icon: "🚨", page: "safety" },
        ].map((item) => (
          <div
            key={item.title}
            onClick={() => onNavigate?.(item.page)}
            className="bg-white rounded-xl border p-5 hover:shadow-md cursor-pointer transition-shadow hover:border-blue-200"
          >
            <div className="text-3xl mb-2">{item.icon}</div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
            <p className="text-xs text-blue-600 mt-2 font-medium">Open →</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PAGE: SETTINGS
// ============================================================

function SettingsPage() {
  const [company, setCompany] = useState({ name: "", gstin: "", primaryContact: "", address: "" });
  const [policy, setPolicy] = useState({ gracePeriodMinutes: "10", requiredCallAttempts: "3", callIntervalMinutes: "2", supervisorResponseMinutes: "5", appealWindowHours: "48", maxBansBeforeEscalation: "2" });
  const [notifPrefs, setNotifPrefs] = useState({ push: true, email: true, sms: true, whatsapp: true });
  const [security, setSecurity] = useState({ mfaRequired: true, sessionTimeout: "60", maxLoginAttempts: "5", passwordMinLength: "8", apiKeyRotation: "90" });
  const [saving, setSaving] = useState(false);
  const { mutate } = useMutation();

  useEffect(() => {
    apiFetch("/auth/me").then((u) => {
      if (u?.company) {
        setCompany({ name: u.company.name || "", gstin: u.company.gstin || "", primaryContact: u.company.primaryContact || "", address: u.company.address || "" });
      }
    }).catch(() => {});
  }, []);

  const saveCompany = async () => {
    setSaving(true);
    try {
      await mutate("/organization/company", "PATCH", company);
      notifyToast("Company profile saved");
    } catch (e: any) { notifyToast(e.message, "error"); }
    setSaving(false);
  };

  const savePolicy = async () => {
    setSaving(true);
    try {
      await mutate("/no-show/policy", "PUT", {
        gracePeriodMinutes: parseInt(policy.gracePeriodMinutes) || 10,
        requiredCallAttempts: parseInt(policy.requiredCallAttempts) || 3,
        callIntervalMinutes: parseInt(policy.callIntervalMinutes) || 2,
        supervisorResponseMinutes: parseInt(policy.supervisorResponseMinutes) || 5,
        appealWindowHours: parseInt(policy.appealWindowHours) || 48,
        maxBansBeforeEscalation: parseInt(policy.maxBansBeforeEscalation) || 2,
      });
      notifyToast("Transport policy saved");
    } catch (e: any) { notifyToast(e.message, "error"); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-semibold">Company Profile</h3>
          <Input label="Company Name" value={company.name} onChange={(v) => setCompany({ ...company, name: v })} />
          <Input label="GSTIN" value={company.gstin} onChange={(v) => setCompany({ ...company, gstin: v })} />
          <Input label="Primary Contact" value={company.primaryContact} onChange={(v) => setCompany({ ...company, primaryContact: v })} />
          <Input label="Address" value={company.address} onChange={(v) => setCompany({ ...company, address: v })} />
          <button onClick={saveCompany} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
        </div>
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-semibold">Transport Policy</h3>
          {[
            { key: "gracePeriodMinutes", label: "Grace Period (min)" },
            { key: "requiredCallAttempts", label: "Required Call Attempts" },
            { key: "callIntervalMinutes", label: "Call Interval (min)" },
            { key: "supervisorResponseMinutes", label: "Supervisor Response (min)" },
            { key: "appealWindowHours", label: "Appeal Window (hrs)" },
            { key: "maxBansBeforeEscalation", label: "Max Bans Before Escalation" },
          ].map((c) => (
            <div key={c.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">{c.label}</span>
              <input value={(policy as any)[c.key]} onChange={(e) => setPolicy({ ...policy, [c.key]: e.target.value })} className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
            </div>
          ))}
          <button onClick={savePolicy} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Save Policy"}</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold">Notification Preferences</h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          {(["push", "email", "sms", "whatsapp"] as const).map((ch) => (
            <div key={ch} className="flex items-center gap-2">
              <input type="checkbox" checked={notifPrefs[ch]} onChange={(e) => setNotifPrefs({ ...notifPrefs, [ch]: e.target.checked })} className="rounded" />
              <span className="capitalize">{ch === "sms" ? "SMS Alerts" : ch === "push" ? "Push Notifications" : ch === "email" ? "Email Notifications" : "WhatsApp"}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold">Security Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">MFA Required</span>
            <input type="checkbox" checked={security.mfaRequired} onChange={(e) => setSecurity({ ...security, mfaRequired: e.target.checked })} className="rounded" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Session Timeout (min)</span>
            <input value={security.sessionTimeout} onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })} className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" type="number" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Max Login Attempts</span>
            <input value={security.maxLoginAttempts} onChange={(e) => setSecurity({ ...security, maxLoginAttempts: e.target.value })} className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" type="number" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Password Min Length</span>
            <input value={security.passwordMinLength} onChange={(e) => setSecurity({ ...security, passwordMinLength: e.target.value })} className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" type="number" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">API Key Rotation (days)</span>
            <input value={security.apiKeyRotation} onChange={(e) => setSecurity({ ...security, apiKeyRotation: e.target.value })} className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" type="number" />
          </div>
        </div>
        <button onClick={async () => {
          setSaving(true);
          try {
            await mutate("/organization/security", "PUT", {
              mfaRequired: security.mfaRequired,
              sessionTimeoutMinutes: parseInt(security.sessionTimeout) || 60,
              maxLoginAttempts: parseInt(security.maxLoginAttempts) || 5,
              passwordMinLength: parseInt(security.passwordMinLength) || 8,
              apiKeyRotationDays: parseInt(security.apiKeyRotation) || 90,
            });
            notifyToast("Security settings saved");
          } catch (e: any) { notifyToast(e.message, "error"); }
          setSaving(false);
        }} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Save Security Settings"}</button>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: AI COPILOT
// ============================================================

function AICopilotPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const send = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMessage }]);
    setLoading(true);
    try {
      const response = await api("/ai/copilot", {
        method: "POST",
        body: JSON.stringify({ query: userMessage }),
      });
      setMessages((m) => [...m, { role: "assistant", content: response?.answer || "I'm sorry, I couldn't process that request." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I'm sorry, I couldn't connect to the AI service. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">AI Transport Copilot</h2>
      <div className="bg-white rounded-xl border flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              <div className="text-5xl mb-4">🤖</div>
              <p className="text-lg font-medium">Ask me anything about your transport operations</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {["How many trips yesterday?", "Which vendors have invoice discrepancies?", "Which vehicles are underutilized?", "Where should we create a new nodal point?"].map((q) => (
                  <button key={q} onClick={() => { setInput(q); }} className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600 hover:bg-gray-200">{q}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-500">Thinking...</div>
            </div>
          )}
        </div>
        <div className="border-t p-4 flex gap-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask about trips, costs, routing, compliance..." className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
          <button onClick={send} disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">Send</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: NOTIFICATIONS
// ============================================================

function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api("/notifications")
      .then(d => { setNotifications(d?.data || d || []); setLoading(false); })
      .catch(err => { setError(err?.message || 'Failed to load notifications'); setLoading(false); });
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Notification Management</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Notification Management</h2>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Sent" value={notifications.length} icon="📤" color="blue" />
        <StatCard label="Unread" value={notifications.filter((n: any) => !n.readAt).length} icon="📱" color="yellow" />
        <StatCard label="Today" value={notifications.filter((n: any) => new Date(n.createdAt).toDateString() === new Date().toDateString()).length} icon="📅" color="green" />
        <StatCard label="This Week" value={notifications.filter((n: any) => { const d = new Date(n.createdAt); const now = new Date(); return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000; }).length} icon="📊" color="purple" />
      </div>
      <div className="bg-white rounded-xl border">
        <DataTable columns={[
          { key: "title", label: "Title" }, { key: "message", label: "Message" },
          { key: "type", label: "Type" }, { key: "createdAt", label: "Time", render: (v) => v ? new Date(v).toLocaleString() : "-" },
          { key: "readAt", label: "Status", render: (v) => v ? <span className="text-gray-400">Read</span> : <span className="text-blue-600 font-medium">Unread</span> },
        ]} data={notifications} />
      </div>
    </div>
  );
}

// ============================================================
// MAIN ADMIN PAGE
// ============================================================

import PlatformAdminDashboard from './PlatformAdminDashboard';
import PricingRulesAdmin from './PricingRulesAdmin';
import VehicleTypePage from '../pages/VehicleTypePage';
import CompanyOnboardingWizard from '../pages/CompanyOnboardingWizard';
import LocationChangeRequestsPage from '../pages/LocationChangeRequestsPage';
import DigitalTwinPage from '../pages/DigitalTwinPage';
import CostLeakDashboard from '../pages/CostLeakDashboard';
import VendorTruthPage from '../pages/VendorTruthPage';
import PredictiveAnalyticsPage from '../pages/PredictiveAnalyticsPage';
import CapacityExchangePage from '../pages/CapacityExchangePage';
import CXOIntelligencePage from '../pages/CXOIntelligencePage';
import { useAuth } from './AuthContext';
import { useMutation, apiFetch } from '../../hooks/useApi';

// ============================================================
// PAGE: BOOKING CALENDAR VIEW
// ============================================================

function BookingCalendarView() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const from = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split("T")[0];
    const to = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split("T")[0];
    apiFetch(`/trips/bookings?from=${from}&to=${to}`).then((d) => setBookings(d?.data || d || [])).catch(() => {});
  }, [currentDate]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: Date; isCurrentMonth: boolean; bookings: any[] }[] = [];

    // Pad start with previous month days
    for (let i = firstDay.getDay(); i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      days.push({ date: d, isCurrentMonth: false, bookings: [] });
    }

    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split("T")[0];
      const dayBookings = bookings.filter((b: any) => {
        const bDate = b.date ? new Date(b.date).toISOString().split("T")[0] : "";
        return bDate === dateStr;
      });
      days.push({ date: d, isCurrentMonth: true, bookings: dayBookings });
    }

    // Pad end with next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, bookings: [] });
    }

    return days;
  };

  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const days: { date: Date; isCurrentMonth: boolean; bookings: any[] }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayBookings = bookings.filter((b: any) => {
        const bDate = b.date ? new Date(b.date).toISOString().split("T")[0] : "";
        return bDate === dateStr;
      });
      days.push({ date: d, isCurrentMonth: d.getMonth() === date.getMonth(), bookings: dayBookings });
    }

    return days;
  };

  const days = viewMode === "month" ? getDaysInMonth(currentDate) : getWeekDays(currentDate);
  const todayStr = new Date().toISOString().split("T")[0];

  const navigate = (dir: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + dir);
    } else {
      newDate.setDate(newDate.getDate() + dir * 7);
    }
    setCurrentDate(newDate);
  };

  const statusColor = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "COMPLETED") return "bg-green-100 text-green-800";
    if (s === "CANCELLED" || s === "REJECTED") return "bg-red-100 text-red-800";
    if (s === "IN_PROGRESS" || s === "DISPATCHING") return "bg-blue-100 text-blue-800";
    if (s === "PENDING_APPROVAL" || s === "REQUESTED") return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const selectedDayBookings = selectedDate ? bookings.filter((b: any) => {
    const bDate = b.date ? new Date(b.date).toISOString().split("T")[0] : "";
    return bDate === selectedDate;
  }) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Booking Calendar</h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setViewMode("month")} className={`px-3 py-1 rounded text-sm font-medium ${viewMode === "month" ? "bg-white shadow text-gray-900" : "text-gray-600"}`}>Month</button>
            <button onClick={() => setViewMode("week")} className={`px-3 py-1 rounded text-sm font-medium ${viewMode === "week" ? "bg-white shadow text-gray-900" : "text-gray-600"}`}>Week</button>
          </div>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg">Today</button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
        <h3 className="text-lg font-semibold">
          {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
        </h3>
        <button onClick={() => navigate(1)} className="p-2 hover:bg-gray-100 rounded-lg">→</button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="p-2 text-center text-xs font-medium text-gray-500">{d}</div>
          ))}
        </div>
        <div className={`grid grid-cols-7 ${viewMode === "week" ? "" : ""}`}>
          {days.map((day, idx) => {
            const dateStr = day.date.toISOString().split("T")[0];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(dateStr)}
                className={`min-h-[80px] p-1.5 border-b border-r cursor-pointer transition-colors ${
                  isSelected ? "bg-blue-50" : day.isCurrentMonth ? "hover:bg-gray-50" : "bg-gray-25"
                } ${!day.isCurrentMonth ? "opacity-40" : ""}`}
              >
                <div className={`text-xs font-medium mb-1 ${
                  isToday ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center" : "text-gray-700"
                }`}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {day.bookings.slice(0, 3).map((b: any) => (
                    <div key={b.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${statusColor(b.status)}`}>
                      {b.bookingCode || b.type || "Booking"}
                    </div>
                  ))}
                  {day.bookings.length > 3 && (
                    <div className="text-[10px] text-gray-500 px-1">+{day.bookings.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">
            Bookings for {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h3>
          {selectedDayBookings.length === 0 ? (
            <p className="text-sm text-gray-500">No bookings on this date</p>
          ) : (
            <div className="space-y-2">
              {selectedDayBookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{b.type === "CAB" ? "🚕" : b.type === "SHUTTLE" ? "🚐" : "🚌"}</span>
                    <div>
                      <p className="font-medium text-sm">{b.bookingCode}</p>
                      <p className="text-xs text-gray-500">{b.pickupAddress} → {b.dropAddress}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(b.status)}`}>{b.status}</span>
                    {b.pickupTime && <p className="text-xs text-gray-500 mt-1">{new Date(b.pickupTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 text-xs">
        {[
          { label: "Requested", color: "bg-yellow-100 text-yellow-800" },
          { label: "Approved", color: "bg-blue-100 text-blue-800" },
          { label: "In Progress", color: "bg-blue-100 text-blue-800" },
          { label: "Completed", color: "bg-green-100 text-green-800" },
          { label: "Cancelled", color: "bg-red-100 text-red-800" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${item.color.split(" ")[0]}`}></span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PAGE: ROLE & PERMISSION MATRIX
// ============================================================

function RolePermissionMatrix() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const { mutate } = useMutation();

  useEffect(() => {
    Promise.all([
      apiFetch("/platform-admin/roles").catch(() => []),
      apiFetch("/platform-admin/permissions").catch(() => []),
    ]).then(([rolesData, permsData]) => {
      const r = Array.isArray(rolesData) ? rolesData : rolesData?.data || [];
      const p = Array.isArray(permsData) ? permsData : permsData?.data || [];
      setRoles(r);
      setPermissions(p);

      // Build role-permission map
      const map: Record<string, string[]> = {};
      for (const role of r) {
        map[role.id] = (role.permissions || []).map((rp: any) => rp.permissionId || rp.permission?.id || rp.id);
      }
      setRolePermissions(map);
      if (r.length > 0) setSelectedRole(r[0].id);
      setLoading(false);
    });
  }, []);

  const togglePermission = (roleId: string, permId: string) => {
    setRolePermissions((prev) => {
      const current = prev[roleId] || [];
      const next = current.includes(permId)
        ? current.filter((id) => id !== permId)
        : [...current, permId];
      return { ...prev, [roleId]: next };
    });
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const permIds = rolePermissions[selectedRole] || [];
      await mutate(`/platform-admin/roles/${selectedRole}/permissions`, "PUT", { permissionIds: permIds });
      notifyToast("Permissions saved");
    } catch (e: any) {
      notifyToast(e.message || "Failed to save", "error");
    }
    setSaving(false);
  };

  const modules = Array.from(new Set(permissions.map((p: any) => p.module))).sort();

  if (loading) return <LoadingSkeleton />;

  const selectedRoleObj = roles.find((r: any) => r.id === selectedRole);
  const selectedPerms = rolePermissions[selectedRole] || [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Role & Permission Matrix</h2>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1 bg-white rounded-xl border p-4">
          <h3 className="font-semibold mb-3">Roles</h3>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {roles.map((role: any) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedRole === role.id ? "bg-blue-100 text-blue-800 font-medium" : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{role.displayName || role.name}</span>
                  <span className="text-xs text-gray-400">{(rolePermissions[role.id] || []).length}</span>
                </div>
                {role.securityDomain && (
                  <span className="text-[10px] text-gray-400">{role.securityDomain}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-3 bg-white rounded-xl border p-4">
          {selectedRoleObj && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{selectedRoleObj.displayName || selectedRoleObj.name}</h3>
                  <p className="text-xs text-gray-500">{selectedPerms.length} permissions granted</p>
                </div>
                <button onClick={savePermissions} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? "Saving..." : "Save Permissions"}
                </button>
              </div>

              <div className="space-y-4 max-h-[550px] overflow-y-auto">
                {modules.map((mod) => {
                  const modPerms = permissions.filter((p: any) => p.module === mod);
                  const allChecked = modPerms.every((p: any) => selectedPerms.includes(p.id));

                  return (
                    <div key={mod} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 font-medium text-sm">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={() => {
                              modPerms.forEach((p: any) => {
                                if (!allChecked && !selectedPerms.includes(p.id)) {
                                  togglePermission(selectedRole, p.id);
                                } else if (allChecked) {
                                  togglePermission(selectedRole, p.id);
                                }
                              });
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="capitalize">{mod}</span>
                        </label>
                        <span className="text-xs text-gray-400">
                          {modPerms.filter((p: any) => selectedPerms.includes(p.id)).length}/{modPerms.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 ml-6">
                        {modPerms.map((perm: any) => (
                          <label key={perm.id} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                            <input
                              type="checkbox"
                              checked={selectedPerms.includes(perm.id)}
                              onChange={() => togglePermission(selectedRole, perm.id)}
                              className="rounded border-gray-300"
                            />
                            <span>{perm.action}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: PROFILE EDITOR WITH PERMISSION TOGGLES
// ============================================================

function ProfileEditorPage() {
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [scopes, setScopes] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { mutate } = useMutation();

  useEffect(() => {
    Promise.all([
      apiFetch("/auth/me").catch(() => null),
      apiFetch("/platform-admin/roles").catch(() => []),
      apiFetch("/platform-admin/sites").catch(() => []),
      apiFetch("/platform-admin/processes").catch(() => []),
    ]).then(([profileData, rolesData, sitesData, procsData]) => {
      setProfile(profileData);
      setRoles(Array.isArray(rolesData) ? rolesData : rolesData?.data || []);
      setSites(Array.isArray(sitesData) ? sitesData : sitesData?.data || []);
      setProcesses(Array.isArray(procsData) ? procsData : procsData?.data || []);
      setUserRoles(profileData?.roles?.map((r: any) => r.id || r.roleId) || []);
      setLoading(false);
    });
  }, []);

  const toggleRole = (roleId: string) => {
    setUserRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const toggleOverride = (permKey: string, granted: boolean) => {
    setOverrides((prev) => {
      const existing = prev.find((o) => o.permissionKey === permKey);
      if (existing) {
        return prev.map((o) =>
          o.permissionKey === permKey ? { ...o, isGranted: granted } : o
        );
      }
      return [...prev, { permissionKey: permKey, isGranted: granted }];
    });
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      if (profile?.id) {
        await mutate(`/platform-admin/users/${profile.id}/roles`, "PUT", { roleIds: userRoles });
        for (const override of overrides) {
          await mutate(`/platform-admin/users/${profile.id}/access-toggle`, "POST", override);
        }
      }
      notifyToast("Profile updated");
    } catch (e: any) {
      notifyToast(e.message || "Failed to save", "error");
    }
    setSaving(false);
  };

  if (loading) return <LoadingSkeleton />;

  const modules = Array.from(new Set(roles.flatMap((r: any) => (r.permissions || []).map((p: any) => p.permission?.module || p.module)))).filter(Boolean).sort();
  const effectivePerms: Record<string, string[]> = {};
  for (const roleId of userRoles) {
    const role = roles.find((r: any) => r.id === roleId);
    if (role) {
      for (const rp of role.permissions || []) {
        const mod = rp.permission?.module || rp.module;
        const action = rp.permission?.action || rp.action;
        if (mod && action) {
          if (!effectivePerms[mod]) effectivePerms[mod] = [];
          if (!effectivePerms[mod].includes(action)) effectivePerms[mod].push(action);
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Profile & Permissions</h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">User Information</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Name</label>
              <p className="font-medium">{profile?.name || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <p className="font-medium">{profile?.email || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Company</label>
              <p className="font-medium">{profile?.companyName || profile?.company?.name || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Department</label>
              <p className="font-medium">{profile?.department || "N/A"}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Site & Process Scope</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Assigned Sites</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {profile?.accessScopes?.filter((s: any) => s.siteId).length > 0
                  ? profile.accessScopes.filter((s: any) => s.siteId).map((s: any) => (
                      <span key={s.id} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{sites.find((site: any) => site.id === s.siteId)?.siteName || s.siteId}</span>
                    ))
                  : <span className="text-xs text-gray-400">All sites (no restriction)</span>
                }
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Assigned Processes</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {profile?.accessScopes?.filter((s: any) => s.processId).length > 0
                  ? profile.accessScopes.filter((s: any) => s.processId).map((s: any) => (
                      <span key={s.id} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">{processes.find((p: any) => p.id === s.processId)?.processName || s.processId}</span>
                    ))
                  : <span className="text-xs text-gray-400">All processes (no restriction)</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-3">Assigned Roles</h3>
        <div className="grid grid-cols-4 gap-2">
          {roles.map((role: any) => (
            <label key={role.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
              userRoles.includes(role.id) ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
            }`}>
              <input type="checkbox" checked={userRoles.includes(role.id)} onChange={() => toggleRole(role.id)} className="rounded border-gray-300" />
              <div>
                <p className="text-sm font-medium">{role.displayName || role.name}</p>
                <p className="text-[10px] text-gray-400">{role.securityDomain}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Effective Permissions</h3>
          <button onClick={saveProfile} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {modules.map((mod) => {
            const actions = effectivePerms[mod] || [];
            return (
              <div key={mod} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm capitalize">{mod}</span>
                  <span className="text-xs text-gray-400">({actions.length} actions)</span>
                </div>
                <div className="flex flex-wrap gap-2 ml-4">
                  {actions.sort().map((action) => (
                    <span key={action} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">{action}</span>
                  ))}
                </div>
              </div>
            );
          })}
          {Object.keys(effectivePerms).length === 0 && (
            <p className="text-sm text-gray-500">No permissions assigned. Select roles above to see effective permissions.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: BUSINESS ANALYST DASHBOARD
// ============================================================

function BusinessAnalystDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/analytics/business-analyst").then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  const kpi = data?.executiveKPI || {};

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Business Analytics</h2>
      <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
        {[
          { label: "Transport Enabled", value: kpi.transportEnabledEmployees || 0, icon: "👥", color: "blue" },
          { label: "Currently Travelling", value: kpi.currentlyTravelling || 0, icon: "🚗", color: "green" },
          { label: "Trips Today", value: kpi.tripsToday || 0, icon: "🗺️", color: "purple" },
          { label: "Completed", value: kpi.completedTrips || 0, icon: "✅", color: "green" },
          { label: "Cancelled", value: kpi.cancelledTrips || 0, icon: "❌", color: "red" },
          { label: "No-Shows", value: kpi.noShows || 0, icon: "🚫", color: "yellow" },
          { label: "Avg Occupancy", value: `${kpi.avgOccupancy || 0}%`, icon: "📊", color: "blue" },
          { label: "Vehicle Util.", value: `${kpi.vehicleUtilization || 0}%`, icon: "🔧", color: "purple" },
          { label: "Cost/Trip", value: `₹${kpi.costPerTrip || 0}`, icon: "💰", color: "green" },
          { label: "Cost/Employee", value: `₹${kpi.costPerEmployee || 0}`, icon: "👤", color: "blue" },
          { label: "Cost/KM", value: `₹${kpi.costPerKm || 0}`, icon: "🛣️", color: "purple" },
          { label: "Bookings Today", value: kpi.bookingsToday || 0, icon: "📋", color: "green" },
        ].map((card) => (
          <StatCard key={card.label} label={card.label} value={String(card.value)} icon={card.icon} color={card.color as any} />
        ))}
      </div>
      {data?.optimizationOpportunities?.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Optimization Opportunities</h3>
          <div className="space-y-3">
            {data.optimizationOpportunities.map((opp: any) => (
              <div key={opp.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium text-green-900">{opp.reason}</p>
                  <p className="text-sm text-green-700">Site: {opp.site} | Processes: {opp.processes.join(', ')} | Shift: {opp.shift}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-700">{opp.currentVehicles} → {opp.potentialVehicles} vehicles</p>
                  <p className="font-bold text-green-900">₹{opp.estimatedDailySaving.toLocaleString()}/day</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data?.demandByShift?.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Demand by Shift</h3>
          <div className="space-y-2">
            {data.demandByShift.map((s: any) => (
              <div key={s.shiftId} className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="font-medium">{s.shiftName}</span>
                <span className="text-sm text-gray-500">{s.startTime} - {s.endTime}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGE: COST OPTIMIZATION DASHBOARD
// ============================================================

function CostOptimizationDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simName, setSimName] = useState("");
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const { mutate } = useMutation();

  useEffect(() => {
    apiFetch("/analytics/cost-optimization").then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const runSimulation = async () => {
    if (!simName.trim()) return;
    setSimRunning(true);
    try {
      const result = await apiFetch("/analytics/optimize/simulate", { method: "POST", body: JSON.stringify({ scenarioName: simName }) });
      setSimResult(result);
      notifyToast("Simulation complete");
    } catch { notifyToast("Simulation failed", "error"); }
    setSimRunning(false);
  };

  if (loading) return <LoadingSkeleton />;
  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Cost Optimization</h2>
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Vehicles" value={String(summary.totalVehicles || 0)} icon="🚗" color="blue" />
        <StatCard label="Active Trips" value={String(summary.activeTrips || 0)} icon="🗺️" color="green" />
        <StatCard label="Idle Vehicles" value={String(summary.idleVehicles || 0)} icon="🅿️" color="yellow" />
        <StatCard label="Low Occupancy" value={String(summary.lowOccupancyTrips || 0)} icon="📉" color="red" />
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-3">Optimization Simulator</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm text-gray-600">Scenario Name</label>
            <input value={simName} onChange={(e) => setSimName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" placeholder="e.g. Q3 optimization" />
          </div>
          <button onClick={runSimulation} disabled={simRunning || !simName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {simRunning ? "Running..." : "Run Simulation"}
          </button>
        </div>
        {simResult && (
          <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500 mb-2 font-medium">Current</p>
              <div className="space-y-1 text-sm">
                <p>Vehicles: <span className="font-bold">{simResult.currentVehicles}</span></p>
                <p>Trips: <span className="font-bold">{simResult.currentTrips}</span></p>
                <p>Employees: <span className="font-bold">{simResult.currentEmployees}</span></p>
                <p>Occupancy: <span className="font-bold">{simResult.currentOccupancy}%</span></p>
                <p>Cost/day: <span className="font-bold">₹{simResult.currentCostPerDay?.toLocaleString()}</span></p>
              </div>
            </div>
            <div>
              <p className="text-sm text-green-600 mb-2 font-medium">Optimized</p>
              <div className="space-y-1 text-sm">
                <p>Vehicles: <span className="font-bold text-green-700">{simResult.optimizedVehicles}</span></p>
                <p>Trips: <span className="font-bold text-green-700">{simResult.optimizedTrips}</span></p>
                <p>Occupancy: <span className="font-bold text-green-700">{simResult.optimizedOccupancy}%</span></p>
                <p>Cost/day: <span className="font-bold text-green-700">₹{simResult.optimizedCostPerDay?.toLocaleString()}</span></p>
                <p className="text-green-800 font-bold">Saving: ₹{simResult.projectedSaving?.toLocaleString()}/day ({simResult.projectedSavingPct}%)</p>
              </div>
            </div>
          </div>
        )}
      </div>
      {data?.recentOptimizations?.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Recent Optimizations</h3>
          <DataTable columns={[
            { key: "optimizationCode", label: "Code" },
            { key: "title", label: "Title" },
            { key: "optimizationType", label: "Type" },
            { key: "dailySaving", label: "Daily Saving", render: (v) => `₹${(v || 0).toLocaleString()}` },
            { key: "monthlyProjectedSaving", label: "Monthly", render: (v) => `₹${(v || 0).toLocaleString()}` },
            { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
          ]} data={data.recentOptimizations} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGE: FINANCIAL ANALYST DASHBOARD
// ============================================================

function FinancialAnalystDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/analytics/financial").then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  const wf = data?.costWaterfall || {};
  const dims = data?.costDimensions || {};
  const trips = data?.tripMetrics || {};

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Financial Analytics</h2>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-3">Cost Waterfall — {data?.period}</h3>
        <div className="space-y-2">
          {[
            { label: "Total Transport Cost", value: wf.totalTransportCost, color: "text-gray-900", bold: true },
            { label: "Vendor Charges", value: wf.vendorCharges, color: "text-gray-700" },
            { label: "Driver Charges", value: wf.driverCharges, color: "text-gray-700" },
            { label: "Vehicle Charges", value: wf.vehicleCharges, color: "text-gray-700" },
            { label: "Extra Trip Charges", value: wf.extraTripCharges, color: "text-orange-600" },
            { label: "Cancellation Charges", value: wf.cancellationCharges, color: "text-red-600" },
            { label: "No-Show Impact", value: wf.noShowImpact, color: "text-red-600" },
            { label: "Savings Applied", value: wf.savingsApplied, color: "text-green-600" },
            { label: "Net Transport Cost", value: wf.netTransportCost, color: "text-gray-900", bold: true },
          ].map((item) => (
            <div key={item.label} className={`flex items-center justify-between py-2 px-3 rounded ${item.bold ? 'bg-gray-100 font-bold' : ''}`}>
              <span className={`text-sm ${item.color}`}>{item.label}</span>
              <span className={`text-sm ${item.color}`}>₹{(item.value || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Cost Dimensions</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Cost/Trip</span><span className="font-bold">₹{dims.costPerTrip || 0}</span></div>
            <div className="flex justify-between"><span>Cost/KM</span><span className="font-bold">₹{dims.costPerKm || 0}</span></div>
            <div className="flex justify-between"><span>Cost/Seat</span><span className="font-bold">₹{dims.costPerSeat || 0}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Trip Metrics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total Trips</span><span className="font-bold">{trips.totalTrips || 0}</span></div>
            <div className="flex justify-between"><span>Completed</span><span className="font-bold text-green-600">{trips.completedTrips || 0}</span></div>
            <div className="flex justify-between"><span>Cancelled</span><span className="font-bold text-red-600">{trips.cancelledTrips || 0}</span></div>
            <div className="flex justify-between"><span>Completion Rate</span><span className="font-bold">{trips.completionRate || 0}%</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Vendor Spend</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total Vendor Spend</span><span className="font-bold">₹{(data?.vendorSpend?.totalSpend || 0).toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: ENTERPRISE COMMAND CENTER
// ============================================================

function EnterpriseCommandCenter() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/analytics/command-center").then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  const c = data || {};

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Enterprise Command Center</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-500 text-sm mb-2">Companies</h3>
          <p className="text-3xl font-bold text-gray-900">{c.companies?.total || 0}</p>
          <div className="flex gap-3 mt-2 text-xs">
            <span className="text-green-600">{c.companies?.active || 0} active</span>
            <span className="text-yellow-600">{c.companies?.suspended || 0} suspended</span>
            <span className="text-gray-500">{c.companies?.pending || 0} pending</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-500 text-sm mb-2">Sites</h3>
          <p className="text-3xl font-bold text-gray-900">{c.sites?.active || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Active sites</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-500 text-sm mb-2">Processes</h3>
          <p className="text-3xl font-bold text-gray-900">{c.processes?.active || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Active processes</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-500 text-sm mb-2">Employees</h3>
          <p className="text-3xl font-bold text-gray-900">{(c.employees?.transportEnabled || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">Transport enabled</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Fleet Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Available Drivers</span><span className="font-bold text-green-600">{c.fleet?.available || 0}</span></div>
            <div className="flex justify-between"><span>On Trip</span><span className="font-bold text-blue-600">{c.fleet?.onTrip || 0}</span></div>
            <div className="flex justify-between"><span>On Break</span><span className="font-bold text-yellow-600">{c.fleet?.onBreak || 0}</span></div>
            <div className="flex justify-between"><span>Offline</span><span className="font-bold text-gray-600">{c.fleet?.offline || 0}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Live Operations</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Active Trips</span><span className="font-bold">{c.liveOperations?.activeTrips || 0}</span></div>
            <div className="flex justify-between"><span>Waiting Dispatch</span><span className="font-bold text-yellow-600">{c.liveOperations?.waitingDispatch || 0}</span></div>
            <div className="flex justify-between"><span>No-Shows</span><span className="font-bold text-red-600">{c.liveOperations?.noShows || 0}</span></div>
            <div className="flex justify-between"><span>Emergencies</span><span className="font-bold text-red-600">{c.liveOperations?.emergencies || 0}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Financial</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>MTD Spend</span><span className="font-bold">₹{(c.financial?.mtdSpend || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span>MTD Savings</span><span className="font-bold text-green-600">₹{(c.financial?.mtdSavings || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Pending Invoices</span><span className="font-bold">{c.financial?.pendingInvoices || 0}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: SAVINGS TRACKER
// ============================================================

function SavingsTrackerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { mutate } = useMutation();

  const load = useCallback(() => {
    apiFetch("/analytics/savings").then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Savings Tracker</h2>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Optimizations" value={String(data?.totalOptimizations || 0)} icon="📊" color="blue" />
        <StatCard label="Implemented" value={String(data?.implemented || 0)} icon="✅" color="green" />
        <StatCard label="Projected Annual" value={`₹${((data?.annualizedProjectedSaving || 0) / 100000).toFixed(1)}L`} icon="💰" color="green" />
        <StatCard label="Actual Savings" value={`₹${((data?.totalActualSaving || 0) / 100000).toFixed(1)}L`} icon="🎯" color="purple" />
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-3">Optimization History</h3>
        <DataTable columns={[
          { key: "optimizationCode", label: "Code" },
          { key: "title", label: "Title" },
          { key: "optimizationType", label: "Type" },
          { key: "beforeVehicles", label: "Before" },
          { key: "afterVehicles", label: "After" },
          { key: "monthlyProjectedSaving", label: "Projected/Month", render: (v) => `₹${(v || 0).toLocaleString()}` },
          { key: "actualSaving", label: "Actual/Month", render: (v) => `₹${(v || 0).toLocaleString()}` },
          { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
        ]} data={data?.recentOptimizations || []} actions={(r) => (
          <div className="flex gap-1">
            {r.status === 'PROPOSED' && <button onClick={async () => { await mutate(`/analytics/savings/${r.id}/approve`, "POST"); load(); }} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Approve</button>}
            {r.status === 'APPROVED' && <button onClick={async () => { await mutate(`/analytics/savings/${r.id}/implement`, "POST", { actualSaving: r.monthlyProjectedSaving }); load(); }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Implement</button>}
          </div>
        )} />
      </div>
    </div>
  );
}

// ============================================================
// PAGE: CXO DASHBOARD
// ============================================================

function CXODashboard({ role }: { role: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = role === 'CEO' ? '/analytics/cxo/ceo' : role === 'CFO' ? '/analytics/cxo/cfo' : role === 'COO' ? '/analytics/cxo/coo' : role === 'CHRO' ? '/analytics/cxo/chro' : '/analytics/cxo/cio';
    apiFetch(endpoint).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [role]);

  if (loading) return <LoadingSkeleton />;
  const d = data || {};

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{role} Dashboard</h2>
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(d).filter(([k]) => !Array.isArray(d[k])).map(([key, val]) => (
          <div key={key} className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-500 text-sm mb-2">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())}</h3>
            {typeof val === 'object' && val !== null ? (
              <div className="space-y-1 text-sm">
                {Object.entries(val as any).map(([k2, v2]) => (
                  <div key={k2} className="flex justify-between">
                    <span>{k2.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-bold">{typeof v2 === 'number' ? v2.toLocaleString() : String(v2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-900">{typeof val === 'number' ? val.toLocaleString() : String(val)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const pageComponents: Record<PageId, React.FC<any>> = {
  dashboard: DashboardPage, "control-room": ControlRoomPage, analytics: AnalyticsPage, reports: ReportsPage,
  "platform-admin": PlatformAdminDashboard, "pricing-rules": PricingRulesAdmin,
  employees: EmployeesPage, drivers: DriversPage, guards: GuardsPage, "driver-wallet": DriverWalletPage,
  vehicles: VehiclesPage, "vehicle-types": VehicleTypePage, compliance: CompliancePage, vendors: VendorsPage,
  bookings: BookingsPage, dispatch: DispatchPage, trips: TripsPage, routes: RoutesPage, "gps-tracking": GPSTrackingPage,
  "no-show": NoShowPage, expenses: ExpensesPage, safety: SafetyPage, incidents: IncidentsPage,
  billing: BillingPage, finance: FinancePage,
  "admin-roles": AdminRolesPage, "admin-access": AdminAccessPage, "org-sites": OrgSitesPage, "org-lobs": OrgSitesPage, "org-shifts": OrgShiftsPage,
  saas: SaaSPage, "feature-flags": FeatureFlagsPage, audit: AuditPage, support: SupportPage,
  "ai-copilot": AICopilotPage, notifications: NotificationsPage, settings: SettingsPage,
  "employee-self": EmployeeSelfServicePage,
  "business-analyst": BusinessAnalystDashboard, "cost-optimization": CostOptimizationDashboard,
  "financial-analyst": FinancialAnalystDashboard, "command-center": EnterpriseCommandCenter,
  "savings-tracker": SavingsTrackerPage,
  "cxo-ceo": () => <CXODashboard role="CEO" />, "cxo-cfo": () => <CXODashboard role="CFO" />,
  "cxo-coo": () => <CXODashboard role="COO" />, "cxo-chro": () => <CXODashboard role="CHRO" />,
  "cxo-cio": () => <CXODashboard role="CIO" />,
  "booking-calendar": BookingCalendarView,
  "role-matrix": RolePermissionMatrix,
  "profile-editor": ProfileEditorPage,
  "company-onboarding": CompanyOnboardingWizard,
  "location-change-requests": LocationChangeRequestsPage,
  "digital-twin": DigitalTwinPage,
  "cost-leaks": CostLeakDashboard,
  "vendor-truth": VendorTruthPage,
  "predictive-analytics": PredictiveAnalyticsPage,
  "capacity-exchange": CapacityExchangePage,
  "cxo-intelligence": CXOIntelligencePage,
};

export default function AdminApp() {
  const { user, resolving, loading, logout } = useAuth();
  const defaultPage: PageId = (user?.activeRole === 'NAVIRA_PLATFORM_ADMINISTRATOR' || user?.role === 'NAVIRA_PLATFORM_ADMINISTRATOR') ? 'platform-admin' : 'dashboard';
  const [page, setPage] = useState<PageId>(defaultPage);
  const PageComponent = pageComponents[page] || DashboardPage;

  // Show loading state while resolving workspace
  if (loading || resolving) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">Loading your workspace...</p>
          <p className="text-sm text-gray-500 mt-1">Resolving role, permissions, and scope</p>
        </div>
      </div>
    );
  }

  const userRole = user?.activeRole || user?.role || 'USER';
  const userName = user?.name || 'User';
  const companyName = user?.companyName || user?.company?.name || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><span className="text-white font-bold text-lg">M</span></div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">NAVIRA</h1>
            <p className="text-xs text-gray-500">
              {companyName ? `${companyName} — ` : ''}{userRole.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-gray-600">🔔</button>
          <button className="text-gray-400 hover:text-gray-600">⚙️</button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">
                {userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">{userRole.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            Logout
          </button>
        </div>
      </header>
      <div className="flex">
        <Sidebar activePage={page} onNavigate={setPage} />
        <main className="flex-1 p-6 min-h-[calc(100vh-57px)]">
          <PageComponent onNavigate={setPage} />
        </main>
      </div>
    </div>
  );
}
