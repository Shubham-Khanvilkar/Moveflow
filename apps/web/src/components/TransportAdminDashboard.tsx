"use client";

import { useState, useEffect, useCallback } from "react";
import ShiftTimingsPage from "./pages/ShiftTimingsPage";
import ScheduleSlotsPage from "./pages/ScheduleSlotsPage";
import TransportConfigPage from "./pages/TransportConfigPage";

// ============================================================
// TYPES
// ============================================================

type DashboardPage =
  | "overview"
  | "vendors"
  | "drivers"
  | "vehicles"
  | "routes"
  | "nodals"
  | "shuttles"
  | "locations"
  | "import"
  | "no-show"
  | "bans"
  | "approvals"
  | "compliance"
  | "super-compliance"
  | "emergency"
  | "settings"
  | "analytics"
  | "shift-timings"
  | "schedule-slots"
  | "transport-config";

interface DashboardProps {
  onBack?: () => void;
}

// ============================================================
// API HELPER
// ============================================================

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

// ============================================================
// STAT CARD
// ============================================================

function StatCard({ label, value, icon, color = "blue", sub }: { label: string; value: string | number; icon: string; color?: string; sub?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DATA TABLE
// ============================================================

function DataTable({ columns, data, actions }: { columns: { key: string; label: string; render?: (v: any, row: any) => React.ReactNode }[]; data: any[]; actions?: (row: any) => React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-3 px-4 font-medium text-gray-500">{col.label}</th>
            ))}
            {actions && <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="py-12 text-center text-gray-400">No data found</td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4">
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? "-"}
                </td>
              ))}
              {actions && <td className="py-3 px-4 text-right">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// BADGE
// ============================================================

function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    INACTIVE: "bg-gray-100 text-gray-600",
    SUSPENDED: "bg-red-100 text-red-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-gray-100 text-gray-600",
    EXPIRED: "bg-red-100 text-red-700",
    BANNED: "bg-red-100 text-red-700",
    LIFTED: "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100 text-red-700",
    CRITICAL: "bg-red-100 text-red-700",
    HIGH: "bg-orange-100 text-orange-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    LOW: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ============================================================
// MODAL
// ============================================================

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

// ============================================================
// FORM INPUT
// ============================================================

function FormInput({ label, value, onChange, type = "text", placeholder, required, options }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; options?: { label: string; value: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}{required && " *"}</label>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <option value="">Select...</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
      )}
    </div>
  );
}

// ============================================================
// OVERVIEW PAGE
// ============================================================

function OverviewPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api("/dashboard/analytics/summary").then(setStats);
  }, []);

  const s = stats || {};
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Active Vendors" value={s.vendors?.total ?? "-"} icon="🤝" color="blue" />
        <StatCard label="Drivers" value={s.drivers?.total ?? "-"} icon="🚗" color="green" sub={`${s.drivers?.available ?? 0} available`} />
        <StatCard label="Vehicles" value={s.vehicles?.total ?? "-"} icon="🚐" color="purple" sub={`${s.vehicles?.available ?? 0} available`} />
        <StatCard label="Active Routes" value={s.routes?.total ?? "-"} icon="🛤️" color="indigo" />
        <StatCard label="Active Bookings" value={s.bookings?.active ?? "-"} icon="📅" color="yellow" />
        <StatCard label="Live Trips" value={s.trips?.active ?? "-"} icon="🗺️" color="green" />
        <StatCard label="Pending Approvals" value={s.approvals?.pending ?? "-"} icon="📋" color="yellow" />
        <StatCard label="Active Bans" value={s.bans?.active ?? "-"} icon="🚫" color="red" />
        <StatCard label="Emergencies" value={s.emergencies?.active ?? "-"} icon="🚨" color="red" />
        <StatCard label="Nodal Points" value={s.nodalPoints?.total ?? "-"} icon="📍" color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Fleet Utilization</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1"><span>Drivers Available</span><span>{s.drivers?.available ?? 0}/{s.drivers?.total ?? 0}</span></div>
              <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-green-500 rounded-full" style={{ width: `${s.drivers?.total ? ((s.drivers?.available / s.drivers?.total) * 100) : 0}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span>Vehicles Available</span><span>{s.vehicles?.available ?? 0}/{s.vehicles?.total ?? 0}</span></div>
              <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-blue-500 rounded-full" style={{ width: `${s.vehicles?.total ? ((s.vehicles?.available / s.vehicles?.total) * 100) : 0}%` }} /></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Add Vendor", icon: "🤝", color: "bg-blue-50 text-blue-700" },
              { label: "Add Driver", icon: "🚗", color: "bg-green-50 text-green-700" },
              { label: "Add Vehicle", icon: "🚐", color: "bg-purple-50 text-purple-700" },
              { label: "Import Employees", icon: "📥", color: "bg-indigo-50 text-indigo-700" },
              { label: "Create Route", icon: "🛤️", color: "bg-yellow-50 text-yellow-700" },
              { label: "Emergency Alert", icon: "🚨", color: "bg-red-50 text-red-700" },
            ].map((a) => (
              <button key={a.label} className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${a.color} hover:opacity-80`}>
                <span>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VENDOR MANAGEMENT PAGE
// ============================================================

function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ vendorName: "", contactPerson: "", contactPhone: "", contactEmail: "", gstNumber: "", city: "", paymentTerms: "NET30" });
  const [search, setSearch] = useState("");

  const load = useCallback(() => { api(`/dashboard/vendors?search=${search}`).then((d) => setVendors(d?.data || [])); }, [search]);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    await api("/dashboard/vendors", { method: "POST", body: JSON.stringify(form) });
    setShowAdd(false);
    setForm({ vendorName: "", contactPerson: "", contactPhone: "", contactEmail: "", gstNumber: "", city: "", paymentTerms: "NET30" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Vendor Management</h2>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Add Vendor</button>
      </div>

      <div className="flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors..." className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm" />
      </div>

      <div className="bg-white rounded-xl border">
        <DataTable
          columns={[
            { key: "vendorName", label: "Vendor Name" },
            { key: "contactPerson", label: "Contact" },
            { key: "contactPhone", label: "Phone" },
            { key: "city", label: "City" },
            { key: "paymentTerms", label: "Payment" },
            { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
            { key: "complianceStatus", label: "Compliance", render: (v) => <Badge status={v} /> },
          ]}
          data={vendors}
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button className="text-xs text-blue-600 hover:underline">Edit</button>
              <button className="text-xs text-red-600 hover:underline">Suspend</button>
            </div>
          )}
        />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Vendor">
        <div className="space-y-4">
          <FormInput label="Vendor Name" value={form.vendorName} onChange={(v) => setForm({ ...form, vendorName: v })} required />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Contact Person" value={form.contactPerson} onChange={(v) => setForm({ ...form, contactPerson: v })} />
            <FormInput label="Phone" value={form.contactPhone} onChange={(v) => setForm({ ...form, contactPhone: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Email" value={form.contactEmail} onChange={(v) => setForm({ ...form, contactEmail: v })} type="email" />
            <FormInput label="GST Number" value={form.gstNumber} onChange={(v) => setForm({ ...form, gstNumber: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <FormInput label="Payment Terms" value={form.paymentTerms} onChange={(v) => setForm({ ...form, paymentTerms: v })} options={[{ label: "NET 30", value: "NET30" }, { label: "NET 60", value: "NET60" }, { label: "Prepaid", value: "PREPAID" }]} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-600 text-sm">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Add Vendor</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// DRIVER MANAGEMENT PAGE
// ============================================================

function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", licenseNumber: "", vendorId: "", skills: "" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams({ search, ...(filter ? { status: filter } : {}) });
    api(`/dashboard/drivers?${params}`).then((d) => setDrivers(d?.data || []));
  }, [search, filter]);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    await api("/dashboard/drivers", { method: "POST", body: JSON.stringify(form) });
    setShowAdd(false);
    setForm({ firstName: "", lastName: "", phone: "", email: "", licenseNumber: "", vendorId: "", skills: "" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Driver Management</h2>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Add Driver</button>
      </div>

      <div className="flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers..." className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border">
        <DataTable
          columns={[
            { key: "firstName", label: "Name", render: (v, r) => `${v} ${r.lastName || ""}` },
            { key: "phone", label: "Phone" },
            { key: "licenseNumber", label: "License" },
            { key: "isAvailable", label: "Available", render: (v) => v ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span> },
            { key: "totalTrips", label: "Trips" },
            { key: "rating", label: "Rating", render: (v) => v ? `⭐ ${v.toFixed(1)}` : "-" },
            { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
          ]}
          data={drivers}
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button className="text-xs text-blue-600 hover:underline">Edit</button>
              <button className="text-xs text-yellow-600 hover:underline">Suspend</button>
            </div>
          )}
        />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Driver">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="First Name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
            <FormInput label="Last Name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
            <FormInput label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="License Number" value={form.licenseNumber} onChange={(v) => setForm({ ...form, licenseNumber: v })} />
            <FormInput label="Skills" value={form.skills} onChange={(v) => setForm({ ...form, skills: v })} placeholder="cbac, luxury, evacuation" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-600 text-sm">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Add Driver</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// VEHICLE MANAGEMENT PAGE
// ============================================================

function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ registrationNumber: "", vehicleType: "SEDAN", seatingCapacity: "4", fuelType: "PETROL", vehicleMake: "", vehicleModel: "", vendorId: "" });
  const [search, setSearch] = useState("");

  const load = useCallback(() => { api(`/dashboard/vehicles?search=${search}`).then((d) => setVehicles(d?.data || [])); }, [search]);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    await api("/dashboard/vehicles", { method: "POST", body: JSON.stringify({ ...form, seatingCapacity: parseInt(form.seatingCapacity) }) });
    setShowAdd(false);
    setForm({ registrationNumber: "", vehicleType: "SEDAN", seatingCapacity: "4", fuelType: "PETROL", vehicleMake: "", vehicleModel: "", vendorId: "" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Vehicle Management</h2>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Add Vehicle</button>
      </div>

      <div className="flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vehicles..." className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm" />
      </div>

      <div className="bg-white rounded-xl border">
        <DataTable
          columns={[
            { key: "registrationNumber", label: "Registration" },
            { key: "vehicleType", label: "Type" },
            { key: "seatingCapacity", label: "Seats" },
            { key: "fuelType", label: "Fuel" },
            { key: "isAvailable", label: "Available", render: (v) => v ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span> },
            { key: "totalTrips", label: "Trips" },
            { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
          ]}
          data={vehicles}
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button className="text-xs text-blue-600 hover:underline">Edit</button>
              <button className="text-xs text-yellow-600 hover:underline">Maintenance</button>
            </div>
          )}
        />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Vehicle">
        <div className="space-y-4">
          <FormInput label="Registration Number" value={form.registrationNumber} onChange={(v) => setForm({ ...form, registrationNumber: v })} required />
          <div className="grid grid-cols-3 gap-4">
            <FormInput label="Type" value={form.vehicleType} onChange={(v) => setForm({ ...form, vehicleType: v })} options={[{ label: "Sedan", value: "SEDAN" }, { label: "SUV", value: "SUV" }, { label: "Hatchback", value: "HATCHBACK" }, { label: "Luxury", value: "LUXURY" }, { label: "Tempo", value: "TEMPO" }, { label: "Bus", value: "BUS" }]} />
            <FormInput label="Seats" value={form.seatingCapacity} onChange={(v) => setForm({ ...form, seatingCapacity: v })} options={[{ label: "4", value: "4" }, { label: "6", value: "6" }, { label: "7", value: "7" }, { label: "12", value: "12" }, { label: "20", value: "20" }, { label: "40", value: "40" }]} />
            <FormInput label="Fuel" value={form.fuelType} onChange={(v) => setForm({ ...form, fuelType: v })} options={[{ label: "Petrol", value: "PETROL" }, { label: "Diesel", value: "DIESEL" }, { label: "CNG", value: "CNG" }, { label: "EV", value: "EV" }]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Make" value={form.vehicleMake} onChange={(v) => setForm({ ...form, vehicleMake: v })} placeholder="Toyota, Honda..." />
            <FormInput label="Model" value={form.vehicleModel} onChange={(v) => setForm({ ...form, vehicleModel: v })} placeholder="Innova, City..." />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-600 text-sm">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Add Vehicle</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// ROUTES / NODALS / SHUTTLES PAGE
// ============================================================

function RoutesPage() {
  const [tab, setTab] = useState<"routes" | "nodals" | "shuttles" | "locations">("routes");
  const [routes, setRoutes] = useState<any[]>([]);
  const [nodals, setNodals] = useState<any[]>([]);
  const [shuttles, setShuttles] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    api("/dashboard/routes").then((d) => setRoutes(d?.data || []));
    api("/dashboard/routes/nodal").then((d) => setNodals(d?.data || []));
    api("/dashboard/routes/shuttle").then((d) => setShuttles(d?.data || []));
    api("/dashboard/routes/location").then((d) => setLocations(Array.isArray(d) ? d : d?.data || []));
  }, []);

  const tabs = [
    { id: "routes" as const, label: "Routes" },
    { id: "nodals" as const, label: "Nodal Points" },
    { id: "shuttles" as const, label: "Shuttle Routes" },
    { id: "locations" as const, label: "Office Locations" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Route & Location Management</h2>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "routes" && (
        <div className="bg-white rounded-xl border">
          <DataTable
            columns={[
              { key: "routeCode", label: "Code" },
              { key: "routeName", label: "Name" },
              { key: "routeType", label: "Type", render: (v) => <Badge status={v} /> },
              { key: "distanceKm", label: "Distance" },
              { key: "estimatedMinutes", label: "Est. Time" },
              { key: "stopCount", label: "Stops" },
              { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
            ]}
            data={routes}
          />
        </div>
      )}

      {tab === "nodals" && (
        <div className="bg-white rounded-xl border">
          <DataTable
            columns={[
              { key: "nodalCode", label: "Code" },
              { key: "nodalName", label: "Name" },
              { key: "city", label: "City" },
              { key: "capacity", label: "Capacity" },
              { key: "currentOccupancy", label: "Occupied" },
              { key: "isActive", label: "Active", render: (v) => v ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span> },
            ]}
            data={nodals}
          />
        </div>
      )}

      {tab === "shuttles" && (
        <div className="bg-white rounded-xl border">
          <DataTable
            columns={[
              { key: "shuttleCode", label: "Code" },
              { key: "shuttleName", label: "Name" },
              { key: "originName", label: "From" },
              { key: "destName", label: "To" },
              { key: "frequencyMinutes", label: "Frequency" },
              { key: "maxCapacity", label: "Capacity" },
              { key: "isActive", label: "Active", render: (v) => v ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span> },
            ]}
            data={shuttles}
          />
        </div>
      )}

      {tab === "locations" && (
        <div className="bg-white rounded-xl border">
          <DataTable
            columns={[
              { key: "locationCode", label: "Code" },
              { key: "locationName", label: "Name" },
              { key: "city", label: "City" },
              { key: "radiusKm", label: "Radius" },
              { key: "isHeadquarters", label: "HQ", render: (v) => v ? "⭐" : "" },
              { key: "shuttleEnabled", label: "Shuttle", render: (v) => v ? "✅" : "" },
            ]}
            data={locations}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// EMPLOYEE IMPORT PAGE
// ============================================================

function ImportPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { api("/dashboard/import/jobs").then((d) => setJobs(d?.data || [])); }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Employee CSV Import</h2>

      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
      >
        <div className="text-4xl mb-3">📤</div>
        <p className="text-gray-600 font-medium">Drop CSV file here or click to browse</p>
        <p className="text-sm text-gray-400 mt-1">Supports .csv files with employee data</p>
        <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Select File</button>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="px-5 py-4 border-b"><h3 className="font-semibold text-gray-900">Import History</h3></div>
        <DataTable
          columns={[
            { key: "importJobName", label: "Job Name" },
            { key: "fileName", label: "File" },
            { key: "totalRows", label: "Total" },
            { key: "successRows", label: "Success", render: (v) => <span className="text-green-600">{v}</span> },
            { key: "failedRows", label: "Failed", render: (v) => <span className="text-red-600">{v}</span> },
            { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
            { key: "importedAt", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
          ]}
          data={jobs}
        />
      </div>
    </div>
  );
}

// ============================================================
// NO-SHOW & BAN PAGE
// ============================================================

function NoShowBanPage() {
  const [tab, setTab] = useState<"policies" | "records" | "bans">("policies");
  const [policies, setPolicies] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [bans, setBans] = useState<any[]>([]);

  useEffect(() => {
    api("/dashboard/no-show/policies").then((d) => setPolicies(Array.isArray(d) ? d : []));
    api("/dashboard/no-show/records").then((d) => setRecords(d?.data || []));
    api("/dashboard/bans").then((d) => setBans(d?.data || []));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">No-Show Policy & Bans</h2>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ id: "policies" as const, label: "Policies" }, { id: "records" as const, label: "No-Show Records" }, { id: "bans" as const, label: "Transport Bans" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "policies" && (
        <div className="bg-white rounded-xl border">
          <DataTable
            columns={[
              { key: "policyName", label: "Policy Name" },
              { key: "policyType", label: "Type" },
              { key: "maxNoShowsBeforeWarning", label: "Warning At" },
              { key: "maxNoShowsBeforeBan", label: "Ban At" },
              { key: "banDurationDays", label: "Ban Duration" },
              { key: "autoBanEnabled", label: "Auto Ban", render: (v) => v ? "✅" : "❌" },
            ]}
            data={policies}
          />
        </div>
      )}

      {tab === "records" && (
        <div className="bg-white rounded-xl border">
          <DataTable
            columns={[
              { key: "userId", label: "Employee" },
              { key: "tripDate", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
              { key: "actionTaken", label: "Action", render: (v) => v ? <Badge status={v === "BAN" ? "BANNED" : v} /> : <span className="text-gray-400">None</span> },
              { key: "appealStatus", label: "Appeal", render: (v) => v && v !== "NONE" ? <Badge status={v} /> : "-" },
            ]}
            data={records}
          />
        </div>
      )}

      {tab === "bans" && (
        <div className="bg-white rounded-xl border">
          <DataTable
            columns={[
              { key: "userId", label: "Employee" },
              { key: "banType", label: "Type" },
              { key: "reason", label: "Reason" },
              { key: "banCount", label: "Count" },
              { key: "banEndDate", label: "Expiry", render: (v) => v ? new Date(v).toLocaleDateString() : "Permanent" },
              { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
              { key: "liftRequestStatus", label: "Lift Request", render: (v) => v && v !== "NONE" ? <Badge status={v} /> : "-" },
            ]}
            data={bans}
            actions={(row) => row.status === "ACTIVE" ? (
              <button className="text-xs text-blue-600 hover:underline">Request Removal</button>
            ) : null}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// APPROVALS PAGE
// ============================================================

function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api("/dashboard/approvals/pending").then((d) => setApprovals(Array.isArray(d) ? d : []));
    api("/dashboard/approvals/stats").then(setStats);
  }, []);

  const handleDecision = async (id: string, decision: string) => {
    await api(`/dashboard/approvals/${id}/decide`, { method: "POST", body: JSON.stringify({ decision }) });
    setApprovals(approvals.filter((a) => a.id !== id));
    setStats((s: any) => ({ ...s, pending: (s?.pending || 1) - 1, [decision === "APPROVE" ? "approved" : "rejected"]: (s?.[decision === "APPROVE" ? "approved" : "rejected"] || 0) + 1 }));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Approval Workflows</h2>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Pending" value={stats?.pending ?? "-"} icon="📋" color="yellow" />
        <StatCard label="Approved" value={stats?.approved ?? "-"} icon="✅" color="green" />
        <StatCard label="Rejected" value={stats?.rejected ?? "-"} icon="❌" color="red" />
      </div>

      <div className="bg-white rounded-xl border">
        <DataTable
          columns={[
            { key: "workflowType", label: "Type", render: (v) => <Badge status={v} /> },
            { key: "entityType", label: "Entity" },
            { key: "requestedBy", label: "Requested By" },
            { key: "requestReason", label: "Reason" },
            { key: "priority", label: "Priority", render: (v) => <Badge status={v} /> },
            { key: "currentApproverRole", label: "Awaiting" },
            { key: "createdAt", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
          ]}
          data={approvals}
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button onClick={() => handleDecision(row.id, "APPROVE")} className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700">Approve</button>
              <button onClick={() => handleDecision(row.id, "REJECT")} className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700">Reject</button>
            </div>
          )}
        />
      </div>
    </div>
  );
}

// ============================================================
// COMPLIANCE PAGE
// ============================================================

function CompliancePage() {
  const [tab, setTab] = useState<"documents" | "audits" | "tasks" | "policies" | "standing">("documents");
  const [docs, setDocs] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [standing, setStanding] = useState<any>(null);

  useEffect(() => {
    api("/dashboard/compliance/documents").then((d) => setDocs(d?.data || []));
    api("/dashboard/compliance/audits").then((d) => setAudits(d?.data || []));
    api("/dashboard/compliance/tasks").then((d) => setTasks(d?.data || []));
    api("/dashboard/compliance/policies").then((d) => setPolicies(Array.isArray(d) ? d : []));
    api("/dashboard/compliance/standing").then(setStanding);
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Compliance Management</h2>

      {standing && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{standing.overallScore ?? 100}</div>
              <div className="text-sm text-gray-500">Overall Score</div>
              <Badge status={standing.overallGrade || "A"} />
            </div>
            <div className="flex-1 grid grid-cols-4 gap-4">
              <div className="text-center"><div className="text-lg font-semibold">{standing.totalDocuments ?? 0}</div><div className="text-xs text-gray-500">Total Docs</div></div>
              <div className="text-center"><div className="text-lg font-semibold text-green-600">{standing.validDocuments ?? 0}</div><div className="text-xs text-gray-500">Valid</div></div>
              <div className="text-center"><div className="text-lg font-semibold text-yellow-600">{standing.expiringDocuments ?? 0}</div><div className="text-xs text-gray-500">Expiring</div></div>
              <div className="text-center"><div className="text-lg font-semibold text-red-600">{standing.expiredDocuments ?? 0}</div><div className="text-xs text-gray-500">Expired</div></div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ id: "documents" as const, label: "Documents" }, { id: "audits" as const, label: "Audits" }, { id: "tasks" as const, label: "Tasks" }, { id: "policies" as const, label: "Policies" }, { id: "standing" as const, label: "Standing" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "documents" && (
        <div className="bg-white rounded-xl border">
          <DataTable
            columns={[
              { key: "entityType", label: "Entity Type" },
              { key: "entityId", label: "Entity ID" },
              { key: "documentType", label: "Document" },
              { key: "fileName", label: "File" },
              { key: "expiryDate", label: "Expiry", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
              { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
            ]}
            data={docs}
            actions={(row) => row.status === "PENDING" ? (
              <div className="flex gap-2 justify-end">
                <button className="text-xs text-green-600 hover:underline">Approve</button>
                <button className="text-xs text-red-600 hover:underline">Reject</button>
              </div>
            ) : null}
          />
        </div>
      )}

      {tab === "audits" && (
        <div className="bg-white rounded-xl border">
          <DataTable
            columns={[
              { key: "auditType", label: "Type" },
              { key: "entityType", label: "Entity" },
              { key: "auditorId", label: "Auditor" },
              { key: "complianceScore", label: "Score" },
              { key: "issuesFound", label: "Issues" },
              { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
            ]}
            data={audits}
          />
        </div>
      )}

      {tab === "tasks" && (
        <div className="bg-white rounded-xl border">
          <DataTable
            columns={[
              { key: "taskType", label: "Type" },
              { key: "title", label: "Title" },
              { key: "assignedTo", label: "Assigned To" },
              { key: "priority", label: "Priority", render: (v) => <Badge status={v} /> },
              { key: "dueDate", label: "Due", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
              { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
            ]}
            data={tasks}
            actions={(row) => row.status !== "COMPLETED" ? (
              <button className="text-xs text-blue-600 hover:underline">Complete</button>
            ) : null}
          />
        </div>
      )}

      {tab === "policies" && (
        <div className="bg-white rounded-xl border">
          <DataTable
            columns={[
              { key: "policyCode", label: "Code" },
              { key: "policyName", label: "Name" },
              { key: "category", label: "Category" },
              { key: "enforcementLevel", label: "Enforcement" },
              { key: "applicableTo", label: "Applies To" },
            ]}
            data={policies}
          />
        </div>
      )}

      {tab === "standing" && standing && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Compliance Standing Breakdown</h3>
          {[
            { label: "Document Compliance", value: standing.documentCompliance },
            { label: "Vehicle Compliance", value: standing.vehicleCompliance },
            { label: "Driver Compliance", value: standing.driverCompliance },
            { label: "Vendor Compliance", value: standing.vendorCompliance },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1"><span>{item.label}</span><span>{(item.value ?? 100).toFixed(1)}%</span></div>
              <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-blue-500 rounded-full" style={{ width: `${item.value ?? 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// EMERGENCY PAGE
// ============================================================

function EmergencyPage() {
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [activeEmergencies, setActiveEmergencies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    api("/dashboard/emergency").then((d) => setEmergencies(d?.data || []));
    api("/dashboard/emergency/active").then((d) => setActiveEmergencies(Array.isArray(d) ? d : []));
    api("/dashboard/emergency/contacts").then((d) => setContacts(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Emergency Operations</h2>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">🚨 Trigger Emergency</button>
      </div>

      {activeEmergencies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 mb-2">Active Emergencies ({activeEmergencies.length})</h3>
          {activeEmergencies.map((e) => (
            <div key={e.id} className="bg-white rounded-lg p-3 mt-2 flex items-center justify-between">
              <div><p className="font-medium">{e.triggerType}</p><p className="text-sm text-gray-500">{e.address || "Unknown location"}</p></div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Acknowledge</button>
                <button className="px-3 py-1 bg-green-600 text-white rounded text-xs">Resolve</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-4 border-b"><h3 className="font-semibold text-gray-900">Emergency History</h3></div>
          <DataTable
            columns={[
              { key: "triggerType", label: "Type" },
              { key: "address", label: "Location" },
              { key: "status", label: "Status", render: (v) => <Badge status={v} /> },
              { key: "createdAt", label: "Time", render: (v) => v ? new Date(v).toLocaleString() : "-" },
            ]}
            data={emergencies}
          />
        </div>

        <div className="bg-white rounded-xl border">
          <div className="px-5 py-4 border-b"><h3 className="font-semibold text-gray-900">Emergency Contacts</h3></div>
          <div className="p-4 space-y-3">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div><p className="font-medium text-sm">{c.contactName}</p><p className="text-xs text-gray-500">{c.role}</p></div>
                <a href={`tel:${c.contactPhone}`} className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium">📞 Call</a>
              </div>
            ))}
            {contacts.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No contacts configured</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS / ACCESS CONTROL PAGE
// ============================================================

function SettingsPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [tab, setTab] = useState<"roles" | "team" | "config">("roles");

  useEffect(() => { api("/dashboard/access/roles").then((d) => setRoles(Array.isArray(d) ? d : [])); }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Settings & Access Control</h2>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ id: "roles" as const, label: "Roles" }, { id: "team" as const, label: "Compliance Team" }, { id: "config" as const, label: "Configuration" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "roles" && (
        <div className="bg-white rounded-xl border">
          <DataTable
            columns={[
              { key: "roleName", label: "Role" },
              { key: "displayName", label: "Display Name" },
              { key: "hierarchyLevel", label: "Level" },
              { key: "canManageVendors", label: "Vendors", render: (v) => v ? "✅" : "❌" },
              { key: "canManageDrivers", label: "Drivers", render: (v) => v ? "✅" : "❌" },
              { key: "canManageVehicles", label: "Vehicles", render: (v) => v ? "✅" : "❌" },
              { key: "canApproveBanRemoval", label: "Ban Approve", render: (v) => v ? "✅" : "❌" },
              { key: "canManageEmergency", label: "Emergency", render: (v) => v ? "✅" : "❌" },
            ]}
            data={roles}
          />
        </div>
      )}

      {tab === "team" && (
        <div className="bg-white rounded-xl border p-6">
          <p className="text-sm text-gray-500">Compliance team members who can review documents and approve cabs.</p>
          <div className="mt-4 space-y-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">+ Add Team Member</button>
          </div>
        </div>
      )}

      {tab === "config" && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Platform Configuration</h3>
          {[
            { label: "Max Devices Per User", value: "3" },
            { label: "No-Show Ban Threshold", value: "3 occurrences" },
            { label: "Emergency Response Timeout", value: "5 minutes" },
            { label: "Default Ban Duration", value: "7 days" },
          ].map((c) => (
            <div key={c.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">{c.label}</span>
              <span className="text-sm text-gray-500">{c.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ANALYTICS PAGE
// ============================================================

function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: "Fleet Utilization", desc: "Vehicle and driver utilization rates", icon: "📊" },
          { title: "Cost Analysis", desc: "Transport cost breakdown by vendor", icon: "💹" },
          { title: "SLA Performance", desc: "Vendor SLA compliance metrics", icon: "📈" },
          { title: "Compliance Report", desc: "Document and audit compliance", icon: "✅" },
          { title: "No-Show Trends", desc: "No-show patterns and analytics", icon: "📉" },
          { title: "Route Efficiency", desc: "Route optimization metrics", icon: "🛤️" },
        ].map((r) => (
          <div key={r.title} className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">{r.icon}</div>
            <h3 className="font-semibold text-gray-900">{r.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export default function TransportAdminDashboard({ onBack }: DashboardProps) {
  const [page, setPage] = useState<DashboardPage>("overview");

  const navGroups = [
    {
      label: "Overview",
      items: [{ id: "overview" as DashboardPage, icon: "📊", label: "Dashboard" }],
    },
    {
      label: "Fleet Management",
      items: [
        { id: "vendors" as DashboardPage, icon: "🤝", label: "Vendors" },
        { id: "drivers" as DashboardPage, icon: "🚗", label: "Drivers" },
        { id: "vehicles" as DashboardPage, icon: "🚐", label: "Vehicles" },
      ],
    },
    {
      label: "Routes & Locations",
      items: [
        { id: "routes" as DashboardPage, icon: "🛤️", label: "Routes & Nodes" },
      ],
    },
    {
      label: "Schedule Configuration",
      items: [
        { id: "shift-timings" as DashboardPage, icon: "🕐", label: "Shift Timings" },
        { id: "schedule-slots" as DashboardPage, icon: "📅", label: "Schedule Slots" },
        { id: "transport-config" as DashboardPage, icon: "⚙️", label: "Transport Config" },
      ],
    },
    {
      label: "Employees",
      items: [
        { id: "import" as DashboardPage, icon: "📥", label: "Import CSV" },
      ],
    },
    {
      label: "Policies & Compliance",
      items: [
        { id: "no-show" as DashboardPage, icon: "📋", label: "No-Show & Bans" },
        { id: "approvals" as DashboardPage, icon: "✅", label: "Approvals" },
        { id: "compliance" as DashboardPage, icon: "📑", label: "Compliance" },
        { id: "super-compliance" as DashboardPage, icon: "🏢", label: "Super Compliance" },
      ],
    },
    {
      label: "Operations",
      items: [
        { id: "emergency" as DashboardPage, icon: "🚨", label: "Emergency" },
        { id: "analytics" as DashboardPage, icon: "📈", label: "Analytics" },
      ],
    },
    {
      label: "Admin",
      items: [
        { id: "settings" as DashboardPage, icon: "⚙️", label: "Settings" },
      ],
    },
  ];

  const renderPage = () => {
    switch (page) {
      case "overview": return <OverviewPage />;
      case "vendors": return <VendorsPage />;
      case "drivers": return <DriversPage />;
      case "vehicles": return <VehiclesPage />;
      case "routes": return <RoutesPage />;
      case "import": return <ImportPage />;
      case "no-show": return <NoShowBanPage />;
      case "approvals": return <ApprovalsPage />;
      case "compliance": return <CompliancePage />;
      case "super-compliance": return <CompliancePage />;
      case "emergency": return <EmergencyPage />;
      case "settings": return <SettingsPage />;
      case "analytics": return <AnalyticsPage />;
      case "shift-timings": return <ShiftTimingsPage />;
      case "schedule-slots": return <ScheduleSlotsPage />;
      case "transport-config": return <TransportConfigPage />;
      default: return <OverviewPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">NAVIRA</h1>
              <p className="text-[10px] text-gray-400">Transport Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">{group.label}</p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    page === item.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button onClick={onBack} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg">
            ← Back to Main
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}
