"use client";
import React, { useState } from "react";

// ============================================================
// ENTERPRISE — SMART BOOKING ENGINE
// ============================================================

export function EnterpriseInline() {
  const [tab, setTab] = useState<'booking' | 'shifts' | 'recurring' | 'forecast' | 'holidays' | 'offices' | 'locations' | 'geofence'>('booking');

  const tabs = [
    { id: 'booking', label: '📦 Smart Booking', desc: 'Cab, Shuttle, Bus, Special' },
    { id: 'shifts', label: '⏰ Shifts', desc: 'Shift management & auto-planning' },
    { id: 'recurring', label: '🔄 Recurring', desc: 'Recurring transport bookings' },
    { id: 'forecast', label: '📈 Forecast', desc: 'Demand forecasting' },
    { id: 'holidays', label: '🗓️ Holidays', desc: 'Office calendar' },
    { id: 'offices', label: '🏢 Offices', desc: 'Office locations' },
    { id: 'locations', label: '📍 Locations', desc: 'Nodal & pickup points' },
    { id: 'geofence', label: '⭕ Geofences', desc: 'Geofencing engine' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">🏢 Enterprise Transport Engine</h2>
        <p className="text-indigo-100 mt-1">Smart Booking • Shift Management • Recurring • Demand Forecasting • Geofencing</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'booking' && <SmartBookingTab />}
      {tab === 'shifts' && <ShiftsTab />}
      {tab === 'recurring' && <RecurringTab />}
      {tab === 'forecast' && <ForecastTab />}
      {tab === 'holidays' && <HolidaysTab />}
      {tab === 'offices' && <OfficesTab />}
      {tab === 'locations' && <LocationsTab />}
      {tab === 'geofence' && <GeofenceTab />}
    </div>
  );
}

function SmartBookingTab() {
  const services = [
    { id: 'cab', name: 'Cab', icon: '🚗', modes: ['One-Way', 'Round Trip', 'Recurring', 'Multi-Stop', 'Nodal', 'Emergency'], color: 'blue' },
    { id: 'shuttle', name: 'Shuttle', icon: '🚐', modes: ['One-Way', 'Round Trip', 'Recurring', 'Nodal'], color: 'green' },
    { id: 'bus', name: 'Bus', icon: '🚌', modes: ['One-Way', 'Round Trip', 'Recurring', 'Nodal'], color: 'orange' },
    { id: 'special', name: 'Special', icon: '♿', modes: ['One-Way', 'Round Trip'], color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map(s => (
          <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer">
            <div className="text-3xl mb-3">{s.icon}</div>
            <h3 className="font-bold text-gray-900">{s.name}</h3>
            <div className="mt-2 space-y-1">
              {s.modes.map(m => (
                <span key={m} className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mr-1 mb-1">{m}</span>
              ))}
            </div>
            <button className={`mt-3 w-full bg-${s.color}-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-${s.color}-700`}>Book {s.name}</button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4">Booking Modes</h3>
        <div className="grid grid-cols-3 gap-3">
          {[{ id: 'ONE_WAY', name: 'One-Way', icon: '➡️', desc: 'Single direction' }, { id: 'ROUND_TRIP', name: 'Round Trip', icon: '↔️', desc: 'Out + Return' }, { id: 'RECURRING', name: 'Recurring', icon: '🔄', desc: 'Schedule repeat' }, { id: 'MULTI_STOP', name: 'Multi-Stop', icon: '📍', desc: 'Multiple pickups' }, { id: 'NODAL', name: 'Nodal', icon: '⭕', desc: 'Smart nodal' }, { id: 'EMERGENCY', name: 'Emergency', icon: '🚨', desc: 'Immediate' }].map(m => (
            <div key={m.id} className="p-4 bg-gray-50 rounded-xl text-center hover:bg-indigo-50 cursor-pointer transition-all">
              <div className="text-2xl mb-2">{m.icon}</div>
              <div className="font-medium text-sm">{m.name}</div>
              <div className="text-xs text-gray-500">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShiftsTab() {
  const shifts = [
    { name: 'Morning', time: '09:00 - 18:00', grace: 15, transport: 60, employees: 420, vehicles: 38, utilization: 92 },
    { name: 'Afternoon', time: '14:00 - 23:00', grace: 15, transport: 60, employees: 180, vehicles: 16, utilization: 88 },
    { name: 'Night', time: '22:00 - 07:00', grace: 15, transport: 60, employees: 85, vehicles: 8, utilization: 85 },
    { name: 'General', time: '10:00 - 19:00', grace: 30, transport: 90, employees: 310, vehicles: 28, utilization: 90 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4">Shift Configuration & Auto-Planning</h3>
        <div className="space-y-4">
          {shifts.map(s => (
            <div key={s.name} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-16 text-center">
                <div className="text-lg font-bold text-indigo-600">{s.employees}</div>
                <div className="text-xs text-gray-500">Employees</div>
              </div>
              <div className="flex-1">
                <div className="font-medium">{s.name} Shift</div>
                <div className="text-sm text-gray-500">{s.time} • Grace: {s.grace}min • Transport Window: {s.transport}min</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{s.vehicles}</div>
                <div className="text-xs text-gray-500">Vehicles Needed</div>
              </div>
              <div className="w-24">
                <div className="text-sm text-right mb-1">{s.utilization}%</div>
                <div className="h-2 bg-gray-200 rounded-full"><div className="h-2 bg-indigo-500 rounded-full" style={{ width: `${s.utilization}%` }}></div></div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-indigo-50 rounded-xl">
          <div className="text-sm text-indigo-800"><span className="font-bold">Auto-Planning:</span> Estimated requirement for tomorrow: <strong>90 vehicles</strong> for <strong>995 employees</strong> across all shifts.</div>
        </div>
      </div>
    </div>
  );
}

function RecurringTab() {
  const bookings = [
    { emp: 'Rahul Sharma', type: 'WEEKDAYS', days: 'Mon-Fri', pickup: '08:30', drop: '18:30', route: 'Powai → BKC', status: 'ACTIVE', trips: 48 },
    { emp: 'Priya Patel', type: 'SELECTED', days: 'Mon, Wed, Fri', pickup: '09:00', drop: '18:00', route: 'Vikhroli → BKC', status: 'ACTIVE', trips: 30 },
    { emp: 'Amit Desai', type: 'DAILY', days: 'All Days', pickup: '07:30', drop: '19:30', route: 'Ghatkopar → BKC', status: 'PAUSED', trips: 62 },
    { emp: 'Sneha Kulkarni', type: 'WEEKDAYS', days: 'Mon-Fri', pickup: '08:00', drop: '17:00', route: 'Andheri → Lower Parel', status: 'ACTIVE', trips: 44 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900">Recurring Bookings</h3>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium">+ New Recurring</button>
        </div>
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.emp} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">👤</div>
              <div className="flex-1">
                <div className="font-medium">{b.emp}</div>
                <div className="text-sm text-gray-500">{b.route} • {b.days} • {b.pickup} - {b.drop}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">{b.type}</div>
                <div className="text-xs text-gray-500">{b.trips} trips generated</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${b.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{b.status}</span>
              <div className="flex gap-1">
                <button className="text-xs bg-white border px-2 py-1 rounded-lg">⏸ Pause</button>
                <button className="text-xs bg-white border px-2 py-1 rounded-lg">✏️ Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ForecastTab() {
  const forecast = [
    { date: 'Tomorrow', day: 'Mon', employees: 895, vehicles: 78, trips: 420, confidence: 94, peak: '08:30-09:30', nodal: 180 },
    { date: 'Sep 3', day: 'Tue', employees: 910, vehicles: 80, trips: 435, confidence: 91, peak: '08:30-09:30', nodal: 185 },
    { date: 'Sep 4', day: 'Wed', employees: 920, vehicles: 82, trips: 440, confidence: 89, peak: '08:00-09:00', nodal: 190 },
    { date: 'Sep 5', day: 'Thu', employees: 930, vehicles: 83, trips: 445, confidence: 88, peak: '08:30-09:30', nodal: 195 },
    { date: 'Sep 6', day: 'Fri', employees: 850, vehicles: 75, trips: 400, confidence: 85, peak: '08:30-09:30', nodal: 170 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[{ label: 'Avg Daily Employees', value: '901', trend: '+3.2%' }, { label: 'Avg Vehicles Needed', value: '80', trend: '+2.1%' }, { label: 'Avg Daily Trips', value: '428', trend: '+4.5%' }, { label: 'Next Holiday', value: 'Sep 7', trend: 'Ganesh Chaturthi' }].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{k.value}</div>
            <div className="text-xs text-gray-500 mt-1">{k.label}</div>
            <div className="text-xs text-green-600 mt-1">{k.trend}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-4">5-Day Demand Forecast</h3>
        <div className="space-y-3">
          {forecast.map(f => (
            <div key={f.date} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-20 text-center"><div className="font-medium">{f.date}</div><div className="text-xs text-gray-500">{f.day}</div></div>
              <div className="flex-1 grid grid-cols-4 gap-4 text-center">
                <div><div className="font-bold text-blue-600">{f.employees}</div><div className="text-xs text-gray-500">Employees</div></div>
                <div><div className="font-bold text-green-600">{f.vehicles}</div><div className="text-xs text-gray-500">Vehicles</div></div>
                <div><div className="font-bold text-purple-600">{f.trips}</div><div className="text-xs text-gray-500">Trips</div></div>
                <div><div className="font-bold text-orange-600">{f.nodal}</div><div className="text-xs text-gray-500">Nodal</div></div>
              </div>
              <div className="text-center"><div className="text-lg font-bold text-indigo-600">{f.confidence}%</div><div className="text-xs text-gray-500">Confidence</div></div>
              <div className="text-xs text-gray-500">Peak: {f.peak}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HolidaysTab() {
  return (
    <div className="bg-white rounded-2xl border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900">Office Calendar</h3>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium">+ Add Holiday</button>
      </div>
      <div className="space-y-3">
        {[{ name: 'Independence Day', date: 'Aug 15', type: 'PUBLIC', cancelled: true }, { name: 'Ganesh Chaturthi', date: 'Sep 7', type: 'COMPANY', cancelled: true }, { name: 'Company Annual Day', date: 'Oct 15', type: 'COMPANY', cancelled: false, note: 'Modified schedule' }, { name: 'Diwali', date: 'Nov 1', type: 'PUBLIC', cancelled: true }].map(h => (
          <div key={h.name} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl">{h.cancelled ? '🔴' : '🟡'}</div>
            <div className="flex-1"><div className="font-medium">{h.name}</div><div className="text-sm text-gray-500">{h.date} • {h.type}{h.note && ` • ${h.note}`}</div></div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${h.cancelled ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{h.cancelled ? 'Transport Cancelled' : 'Modified'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OfficesTab() {
  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="font-bold text-gray-900 mb-4">Office Locations</h3>
      <div className="grid grid-cols-3 gap-4">
        {[{ name: 'Mumbai HQ', addr: 'BKC', emp: 1200, parking: 150, zones: 4 }, { name: 'Pune Office', addr: 'Hinjewadi', emp: 400, parking: 60, zones: 2 }, { name: 'Bangalore Office', addr: 'Whitefield', emp: 600, parking: 80, zones: 3 }].map(o => (
          <div key={o.name} className="p-5 bg-gray-50 rounded-xl">
            <div className="text-2xl mb-2">🏢</div>
            <div className="font-bold">{o.name}</div>
            <div className="text-sm text-gray-500">{o.addr}</div>
            <div className="mt-3 space-y-1 text-sm"><div>👥 {o.emp} capacity</div><div>🅿️ {o.parking} parking</div><div>📍 {o.zones} pickup zones</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LocationsTab() {
  const nodal = [
    { name: 'Powai Central', users: 85, savings: '₹4,200/day', radius: 150 },
    { name: 'Vikhroli Junction', users: 62, savings: '₹3,100/day', radius: 120 },
    { name: 'Ghatkopar Station', users: 78, savings: '₹3,900/day', radius: 130 },
    { name: 'Andheri East Metro', users: 55, savings: '₹2,750/day', radius: 140 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-6 gap-3">
        {[{ t: 'OFFICE', c: 3 }, { t: 'PICKUP', c: 24 }, { t: 'DROP', c: 18 }, { t: 'NODAL', c: 12 }, { t: 'PARKING', c: 6 }, { t: 'STAGING', c: 4 }].map(l => (
          <div key={l.t} className="bg-white rounded-xl border p-4 text-center"><div className="text-xl font-bold text-indigo-600">{l.c}</div><div className="text-xs text-gray-500">{l.t}</div></div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-4">Nodal Points — Active Optimization</h3>
        <div className="space-y-3">
          {nodal.map(n => (
            <div key={n.name} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">⭕</div>
              <div className="flex-1"><div className="font-medium">{n.name}</div><div className="text-sm text-gray-500">Radius: {n.radius}m • {n.users} daily users</div></div>
              <div className="text-right"><div className="font-bold text-green-600">{n.savings}</div><div className="text-xs text-gray-500">daily savings</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GeofenceTab() {
  const geofences = [
    { name: 'BKC Office', type: 'OFFICE', radius: 200, events: 1420, active: true },
    { name: 'Powai Nodal', type: 'NODAL', radius: 150, events: 890, active: true },
    { name: 'Vikhroli Pickup', type: 'PICKUP', radius: 100, events: 650, active: true },
    { name: 'Andheri Depot', type: 'STAGING', radius: 300, events: 340, active: true },
    { name: 'Mumbai HQ Parking', type: 'PARKING', radius: 150, events: 210, active: true },
    { name: 'Restricted Zone', type: 'RESTRICTED', radius: 500, events: 12, active: false },
  ];

  const events = [
    { vehicle: 'MH-01-AB-1234', event: 'ARRIVED', geofence: 'Powai Nodal', time: '08:12 AM' },
    { vehicle: 'MH-01-AB-1234', event: 'DEPARTED', geofence: 'Powai Nodal', time: '08:18 AM' },
    { vehicle: 'MH-02-CD-5678', event: 'ARRIVED', geofence: 'BKC Office', time: '09:05 AM' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900">Geofences</h3>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium">+ Create Geofence</button>
        </div>
        <div className="space-y-3">
          {geofences.map(g => (
            <div key={g.name} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl">{g.type === 'OFFICE' ? '🏢' : g.type === 'NODAL' ? '⭕' : g.type === 'PICKUP' ? '📍' : g.type === 'PARKING' ? '🅿️' : g.type === 'STAGING' ? '🚐' : '🚫'}</div>
              <div className="flex-1"><div className="font-medium">{g.name}</div><div className="text-sm text-gray-500">{g.type} • Radius: {g.radius}m • {g.events} events</div></div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${g.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{g.active ? 'ACTIVE' : 'INACTIVE'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-4">Recent Geofence Events</h3>
        <div className="space-y-2">
          {events.map((e, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.event === 'ARRIVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{e.event}</span>
              <span className="font-medium">{e.vehicle}</span>
              <span className="text-gray-500">→ {e.geofence}</span>
              <span className="text-gray-400 ml-auto">{e.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOARDING MANAGEMENT
// ============================================================

export function BoardingInline() {
  const passengers = [
    { id: 'EMP-1001', name: 'Rahul Sharma', pickup: 'Powai Nodal', status: 'BOARDING', method: 'OTP', otp: '4829', time: '08:22 AM' },
    { id: 'EMP-1002', name: 'Priya Patel', pickup: 'Vikhroli', status: 'BOARDED', method: 'QR', time: '08:35 AM' },
    { id: 'EMP-1003', name: 'Amit Desai', pickup: 'Ghatkopar Nodal', status: 'PENDING', method: null, time: null },
  ];

  const statusColor = (s: string) => s === 'BOARDED' ? 'bg-green-100 text-green-700' : s === 'BOARDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500';

  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="font-bold text-gray-900 mb-4">Boarding Management — TRIP-0892</h3>
      <div className="space-y-3">
        {passengers.map(p => (
          <div key={p.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">👤</div>
            <div className="flex-1">
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-gray-500">{p.id} • {p.pickup}</div>
            </div>
            <div className="text-center">
              {p.method && <div className="text-xs text-gray-500">via {p.method}</div>}
              {p.otp && <div className="font-mono font-bold text-lg">{p.otp}</div>}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>{p.status}</span>
            <div className="flex gap-1">
              {p.status === 'PENDING' && <><button className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs">✓ Board</button><button className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs">✗ No Show</button></>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// INCIDENTS
// ============================================================

export function IncidentsInline() {
  const [tab, setTab] = useState<'incidents' | 'replacement' | 'sla'>('incidents');

  const incidents = [
    { id: 'INC-001', type: 'SOS', status: 'ACKNOWLEDGED', vehicle: 'MH-01-AB-1234', driver: 'Ramesh', location: 'BKC', time: '08:45 AM', sla: '2 min' },
    { id: 'INC-002', type: 'BREAKDOWN', status: 'IN_PROGRESS', vehicle: 'MH-02-CD-5678', driver: 'Suresh', location: 'Andheri', time: '09:10 AM', sla: '5 min', replacement: 'MH-04-EF-3456' },
    { id: 'INC-003', type: 'DEVIATION', status: 'RESOLVED', vehicle: 'MH-03-GH-9012', driver: 'Kumar', location: 'Goregaon', time: '07:30 AM', sla: '2 min', deviation: '2.3 KM' },
    { id: 'INC-004', type: 'PASSENGER', status: 'OPEN', vehicle: 'MH-01-AB-1234', driver: 'Ramesh', location: 'BKC Office', time: '09:22 AM', sla: '10 min' },
  ];

  const replacements = [
    { rank: 1, vehicle: 'MH-04-EF-3456', driver: 'Anil Singh', dist: '1.8 KM', cap: 4, ac: 'AC', compliance: 'COMPLIANT', vendor: 'Mumbai Cabs', eta: '5 min' },
    { rank: 2, vehicle: 'MH-05-IJ-7890', driver: 'Vikram Joshi', dist: '3.2 KM', cap: 4, ac: 'AC', compliance: 'COMPLIANT', vendor: 'QuickRide', eta: '8 min' },
    { rank: 3, vehicle: 'MH-06-KL-2345', driver: 'Deepak Nair', dist: '5.1 KM', cap: 6, ac: 'NON_AC', compliance: 'PARTIAL', vendor: 'City Transport', eta: '12 min' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">🚨 Incident Management & SLA</h2>
        <p className="text-red-100 mt-1">SOS • Breakdowns • Route Deviation • Replacement Engine • SLA Enforcement</p>
        <div className="flex gap-4 mt-3">
          {[{ l: 'Open', v: '1', c: 'bg-white/20' }, { l: 'Acknowledged', v: '1', c: 'bg-white/20' }, { l: 'In Progress', v: '1', c: 'bg-white/20' }, { l: 'Resolved', v: '1', c: 'bg-white/20' }, { l: 'Avg Response', v: '4 min', c: 'bg-white/30' }].map(k => (
            <div key={k.l} className={`${k.c} rounded-xl px-4 py-2 text-center`}><div className="text-lg font-bold">{k.v}</div><div className="text-xs text-red-100">{k.l}</div></div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {(['incidents', 'replacement', 'sla'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === t ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {t === 'incidents' ? '🚨 Incidents' : t === 'replacement' ? '🔄 Replacement' : '⏱️ SLA'}
          </button>
        ))}
      </div>

      {tab === 'incidents' && (
        <div className="bg-white rounded-2xl border p-6 space-y-3">
          {incidents.map(inc => (
            <div key={inc.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${inc.type === 'SOS' ? 'bg-red-100 text-red-700' : inc.type === 'BREAKDOWN' ? 'bg-orange-100 text-orange-700' : inc.type === 'DEVIATION' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{inc.type}</span>
              <div className="flex-1"><div className="font-medium">{inc.vehicle} • {inc.driver}</div><div className="text-sm text-gray-500">{inc.location} • {inc.time}</div></div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${inc.status === 'OPEN' ? 'bg-red-100 text-red-700' : inc.status === 'ACKNOWLEDGED' ? 'bg-yellow-100 text-yellow-700' : inc.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{inc.status}</span>
              {inc.replacement && <span className="text-xs text-green-600">→ {inc.replacement}</span>}
              {inc.deviation && <span className="text-xs text-orange-600">Deviation: {inc.deviation}</span>}
            </div>
          ))}
        </div>
      )}

      {tab === 'replacement' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-bold text-gray-900 mb-4">Replacement Candidates for INC-002</h3>
          <div className="space-y-3">
            {replacements.map(r => (
              <div key={r.vehicle} className={`flex items-center gap-4 p-4 rounded-xl ${r.rank === 1 ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50'}`}>
                <div className="text-2xl font-bold text-gray-400">#{r.rank}</div>
                <div className="flex-1"><div className="font-medium">{r.vehicle} • {r.driver}</div><div className="text-sm text-gray-500">{r.dist} away • {r.cap} seats • {r.ac} • {r.vendor}</div></div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${r.compliance === 'COMPLIANT' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.compliance}</span>
                <div className="text-center"><div className="font-bold text-blue-600">{r.eta}</div><div className="text-xs text-gray-500">ETA</div></div>
                <button className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium">Assign</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'sla' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-bold text-gray-900 mb-4">SLA Configuration</h3>
          <div className="space-y-4">
            {[{ type: 'SOS', response: '2 min', escalation: '5 min', resolution: '30 min' }, { type: 'BREAKDOWN', response: '5 min', escalation: '10 min', resolution: '60 min' }, { type: 'DEVIATION', response: '2 min', escalation: '5 min', resolution: '15 min' }, { type: 'PASSENGER_ISSUE', response: '10 min', escalation: '30 min', resolution: '24 hours' }].map(s => (
              <div key={s.type} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <span className="font-bold w-32">{s.type}</span>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div className="text-center"><div className="text-sm font-medium">Response</div><div className="text-lg font-bold text-green-600">{s.response}</div></div>
                  <div className="text-center"><div className="text-sm font-medium">Escalation</div><div className="text-lg font-bold text-yellow-600">{s.escalation}</div></div>
                  <div className="text-center"><div className="text-sm font-medium">Resolution</div><div className="text-lg font-bold text-blue-600">{s.resolution}</div></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-red-50 rounded-xl text-sm text-red-800"><span className="font-bold">Auto-Escalation:</span> If SOS is not acknowledged within 2 minutes, it automatically escalates to Transport Admin and Company Admin.</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// VENDORS
// ============================================================

export function VendorsInline() {
  const vendors = [
    { name: 'Mumbai Cabs Pvt Ltd', drivers: 45, vehicles: 42, trips: 1240, onTime: 94, completion: 98, cancellation: 1.2, complaints: 3, compliance: 96, spend: '₹8,45,000' },
    { name: 'QuickRide Solutions', drivers: 28, vehicles: 26, trips: 890, onTime: 91, completion: 97, cancellation: 1.8, complaints: 5, compliance: 93, spend: '₹5,12,000' },
    { name: 'City Transport Services', drivers: 18, vehicles: 15, trips: 450, onTime: 88, completion: 95, cancellation: 2.5, complaints: 8, compliance: 89, spend: '₹2,78,000' },
  ];

  const invoices = [
    { vendor: 'Mumbai Cabs', month: 'Aug 2024', trips: 1240, systemCost: '₹8,45,000', vendorCost: '₹8,62,000', variance: '₹17,000', status: 'UNDER_REVIEW', flag: 'AMOUNT_MISMATCH' },
    { vendor: 'QuickRide', month: 'Aug 2024', trips: 890, systemCost: '₹5,12,000', vendorCost: '₹5,12,000', variance: '₹0', status: 'MATCHED', flag: null },
    { vendor: 'City Transport', month: 'Aug 2024', trips: 450, systemCost: '₹2,78,000', vendorCost: '₹2,95,000', variance: '₹17,000', status: 'DISPUTED', flag: 'DISTANCE_MISMATCH' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-500 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">🤝 Vendor Management & Invoice Reconciliation</h2>
        <p className="text-teal-100 mt-1">Performance • Contracts • Invoices • Reconciliation • Payments</p>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-4">Vendor Performance</h3>
        <div className="space-y-4">
          {vendors.map(v => (
            <div key={v.name} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-xl">🤝</div>
                <div className="flex-1"><div className="font-bold">{v.name}</div><div className="text-sm text-gray-500">{v.drivers} drivers • {v.vehicles} vehicles • {v.trips} trips</div></div>
                <div className="text-right"><div className="font-bold text-lg">{v.spend}</div><div className="text-xs text-gray-500">Monthly Spend</div></div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {[{ l: 'On-Time', v: `${v.onTime}%`, c: v.onTime >= 90 ? 'text-green-600' : 'text-red-600' }, { l: 'Completion', v: `${v.completion}%`, c: 'text-green-600' }, { l: 'Cancellation', v: `${v.cancellation}%`, c: v.cancellation <= 2 ? 'text-green-600' : 'text-red-600' }, { l: 'Complaints', v: v.complaints.toString(), c: v.complaints <= 5 ? 'text-green-600' : 'text-red-600' }, { l: 'Compliance', v: `${v.compliance}%`, c: v.compliance >= 90 ? 'text-green-600' : 'text-yellow-600' }].map(k => (
                  <div key={k.l} className="text-center p-2 bg-white rounded-lg"><div className={`text-lg font-bold ${k.c}`}>{k.v}</div><div className="text-xs text-gray-500">{k.l}</div></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-4">Invoice Reconciliation — August 2024</h3>
        <div className="space-y-3">
          {invoices.map(inv => (
            <div key={inv.vendor} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex-1"><div className="font-medium">{inv.vendor}</div><div className="text-sm text-gray-500">{inv.month} • {inv.trips} trips</div></div>
              <div className="text-center"><div className="text-xs text-gray-500">System</div><div className="font-medium">{inv.systemCost}</div></div>
              <div className="text-center"><div className="text-xs text-gray-500">Vendor</div><div className="font-medium">{inv.vendorCost}</div></div>
              <div className="text-center"><div className="text-xs text-gray-500">Variance</div><div className={`font-bold ${inv.variance === '₹0' ? 'text-green-600' : 'text-red-600'}`}>{inv.variance}</div></div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${inv.status === 'MATCHED' ? 'bg-green-100 text-green-700' : inv.status === 'UNDER_REVIEW' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{inv.status}</span>
              {inv.flag && <span className="text-xs text-red-600 font-medium">{inv.flag}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COST ALLOCATION & BUDGET
// ============================================================

export function EnterpriseCostInline() {
  const depts = [
    { name: 'Engineering', trips: 450, cost: '₹2,85,000', perTrip: '₹633', budget: '₹3,00,000', util: 95 },
    { name: 'Sales', trips: 320, cost: '₹2,10,000', perTrip: '₹656', budget: '₹2,50,000', util: 84 },
    { name: 'Marketing', trips: 180, cost: '₹1,25,000', perTrip: '₹694', budget: '₹1,50,000', util: 83 },
    { name: 'HR', trips: 120, cost: '₹78,000', perTrip: '₹650', budget: '₹1,00,000', util: 78 },
    { name: 'FINANCE_ADMIN', trips: 95, cost: '₹62,000', perTrip: '₹652', budget: '₹80,000', util: 77 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">💹 Cost Allocation, Budget & Forecast</h2>
        <p className="text-green-100 mt-1">Department Cost • Budget Control • Cost Forecast • Smart Optimization</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[{ l: 'Monthly Budget', v: '₹8,80,000' }, { l: 'Spent', v: '₹7,60,000' }, { l: 'Remaining', v: '₹1,20,000' }, { l: 'Next Month Forecast', v: '₹8,20,000' }].map(k => (
          <div key={k.l} className="bg-white rounded-2xl border p-4 text-center"><div className="text-xl font-bold text-green-600">{k.v}</div><div className="text-xs text-gray-500 mt-1">{k.l}</div></div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-4">Department Cost Allocation</h3>
        <div className="space-y-3">
          {depts.map(d => (
            <div key={d.name} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-32 font-medium">{d.name}</div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1"><span>{d.cost} of {d.budget}</span><span className={`font-medium ${d.util >= 90 ? 'text-red-600' : d.util >= 80 ? 'text-yellow-600' : 'text-green-600'}`}>{d.util}%</span></div>
                <div className="h-3 bg-gray-200 rounded-full"><div className={`h-3 rounded-full ${d.util >= 90 ? 'bg-red-500' : d.util >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${d.util}%` }}></div></div>
              </div>
              <div className="text-center w-20"><div className="font-medium">{d.trips}</div><div className="text-xs text-gray-500">trips</div></div>
              <div className="text-center w-20"><div className="font-medium">{d.perTrip}</div><div className="text-xs text-gray-500">per trip</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AI COPILOT
// ============================================================

export function AICopilotInline() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuery = () => {
    if (!query) return;
    setLoading(true);
    setTimeout(() => {
      const responses: Record<string, string> = {
        'Why did transportation cost increase this month?': 'Based on retrieved system data, transportation cost increased 5.2% this month due to: (1) 38 additional trips (+8.7%), (2) 2.1% increase in average trip distance, (3) Vendor A rate adjustment from ₹22/km to ₹25/km effective Aug 15. The rate change accounts for approximately 60% of the cost increase. Nodal utilization decreased from 42% to 38%, contributing ₹8,500 in additional individual cab costs.',
        'Find cost reduction opportunities for tomorrow': 'Analyzing 435 planned trips for tomorrow, I identified 4 optimization opportunities:\n\n1. CONSOLIDATE 24 individual Powai→BKC trips into 8 shared cabs — saves ₹18,000\n2. Route 15 Vikhroli employees through Powai nodal — saves ₹12,500\n3. Replace 3 sedans with vans on Goregaon route — saves ₹8,500\n4. Shift 8 flexible employees to off-peak — saves ₹8,000\n\nTotal potential savings: ₹47,000 (19.2%). Each recommendation requires admin approval.',
        'Which vendor has the best performance?': 'Based on retrieved vendor data:\n\n1. Mumbai Cabs — On-Time: 94%, Completion: 98%, Complaints: 3, Spend: ₹8,45,000\n2. QuickRide — On-Time: 91%, Completion: 97%, Complaints: 5, Spend: ₹5,12,000\n3. City Transport — On-Time: 88%, Completion: 95%, Complaints: 8, Spend: ₹2,78,000\n\nMumbai Cabs has the best overall performance. However, QuickRide offers the best cost-per-trip (₹575 vs ₹681 for Mumbai Cabs). Consider negotiating rates with City Transport due to lower performance metrics.',
      };
      setResponse(responses[query] || `I've analyzed your query about "${query}". Based on the current system data, I found relevant insights across ${Math.floor(Math.random() * 5) + 2} data sources. Would you like me to drill down into specific areas?`);
      setLoading(false);
    }, 1500);
  };

  const suggestedQueries = [
    'Why did transportation cost increase this month?',
    'Find cost reduction opportunities for tomorrow',
    'Which vendor has the best performance?',
    'Show me nodal utilization trends',
    'Which routes are most delayed?',
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-violet-600 to-purple-500 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">🤖 AI Transport Operations Copilot</h2>
        <p className="text-purple-100 mt-1">Ask questions about your transport operations • Data-driven insights • Tool-powered</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ l: 'Queries Today', v: '24' }, { l: 'Tools Available', v: '12' }, { l: 'Avg Latency', v: '1.8s' }].map(k => (
          <div key={k.l} className="bg-white rounded-2xl border p-4 text-center"><div className="text-xl font-bold text-violet-600">{k.v}</div><div className="text-xs text-gray-500">{k.l}</div></div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-4">Ask the AI Copilot</h3>
        <div className="flex gap-2 mb-4">
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuery()} placeholder="Ask about transport operations..." className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm" />
          <button onClick={handleQuery} disabled={loading} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50">{loading ? '⏳ Analyzing...' : '🚀 Ask'}</button>
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {suggestedQueries.map(sq => (
            <button key={sq} onClick={() => { setQuery(sq); }} className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-full hover:bg-violet-100">{sq}</button>
          ))}
        </div>
        {response && (
          <div className="p-4 bg-violet-50 rounded-xl">
            <div className="text-sm text-violet-800 whitespace-pre-line">{response}</div>
            <div className="mt-3 flex gap-2 text-xs text-gray-500">
              <span>🔧 Tools: getCosts, getTrips, getVendors</span>
              <span>•</span>
              <span>📊 1,250 tokens</span>
              <span>•</span>
              <span>⏱️ 1.8s</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-3">AI Guardrails</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 rounded-xl text-sm text-green-800">✅ READ tools: analytics, bookings, fleet, routes, costs</div>
          <div className="p-3 bg-yellow-50 rounded-xl text-sm text-yellow-800">⚠️ WRITE tools: cancel booking, assign driver (requires confirmation)</div>
          <div className="p-3 bg-red-50 rounded-xl text-sm text-red-800">🚫 Cannot: fabricate data, modify records without auth, cross-tenant access</div>
          <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-800">🔒 Provider: OpenAI (GPT-4) with fallback to OpenRouter</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// POLICIES, AUDIT, FEATURE FLAGS
// ============================================================

export function EnterpriseSettingsInline() {
  const [tab, setTab] = useState<'policies' | 'audit' | 'flags' | 'dashboard'>('policies');

  const policies = [
    { cat: 'BOOKING', rules: [{ n: 'Min Advance', v: '2 hours' }, { n: 'Max Advance', v: '7 days' }, { n: 'Cancellation Window', v: '1 hour' }] },
    { cat: 'ELIGIBILITY', rules: [{ n: 'Eligible Shifts', v: 'Morning, General, Evening' }, { n: 'AC Eligibility', v: 'Manager+ level' }, { n: 'Max Distance', v: '50 KM' }] },
    { cat: 'APPROVAL', rules: [{ n: 'Cab < ₹500', v: 'Auto Approval' }, { n: 'Cab ≥ ₹500', v: 'Manager Approval' }, { n: 'Special Transport', v: 'Transport Admin' }] },
  ];

  const audit = [
    { action: 'BOOKING_CREATED', user: 'Rahul Sharma', role: 'EMPLOYEE', time: '08:15 AM', detail: 'Cab Powai → BKC' },
    { action: 'BOOKING_APPROVED', user: 'Manager Priya', role: 'MANAGER', time: '08:20 AM', detail: 'Approved BK-1001' },
    { action: 'DRIVER_ASSIGNED', user: 'Dispatcher', role: 'DISPATCHER', time: '08:25 AM', detail: 'Ramesh → TRIP-0892' },
    { action: 'RATE_CHANGED', user: 'Transport Admin', role: 'ADMIN', time: '09:00 AM', detail: 'AC ₹22→₹25/km' },
    { action: 'SOS_TRIGGERED', user: 'Driver Ramesh', role: 'DRIVER', time: '08:45 AM', detail: 'MH-01-AB-1234' },
  ];

  const flags = [
    { name: 'ENABLE_NODAL_OPTIMIZATION', on: true, desc: 'Smart nodal pickup/drop' },
    { name: 'ENABLE_AI_COPILOT', on: true, desc: 'AI Operations Copilot' },
    { name: 'ENABLE_RECURRING_BOOKING', on: true, desc: 'Recurring transport' },
    { name: 'ENABLE_QR_BOARDING', on: true, desc: 'QR code boarding' },
    { name: 'ENABLE_WHATSAPP', on: false, desc: 'WhatsApp notifications' },
    { name: 'ENABLE_MFA', on: false, desc: 'Multi-factor auth' },
    { name: 'ENABLE_VENDOR_PORTAL', on: false, desc: 'Vendor self-service' },
    { name: 'ENABLE_RAG_KNOWLEDGE', on: true, desc: 'AI knowledge base' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-gray-700 to-gray-900 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">⚙️ Enterprise Settings</h2>
        <p className="text-gray-300 mt-1">Policies • Audit Log • Feature Flags • Dashboard Builder</p>
      </div>
      <div className="flex gap-2">
        {(['policies', 'audit', 'flags', 'dashboard'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === t ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border'}`}>
            {t === 'policies' ? '📜 Policies' : t === 'audit' ? '📋 Audit' : t === 'flags' ? '🏁 Flags' : '📊 Dashboard'}
          </button>
        ))}
      </div>

      {tab === 'policies' && (
        <div className="space-y-4">
          {policies.map(p => (
            <div key={p.cat} className="bg-white rounded-2xl border p-6">
              <h3 className="font-bold text-gray-900 mb-3">{p.cat} Rules</h3>
              <div className="space-y-2">
                {p.rules.map(r => (
                  <div key={r.n} className="flex justify-between p-3 bg-gray-50 rounded-xl text-sm"><span>{r.n}</span><span className="font-medium">{r.v}</span></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-bold text-gray-900 mb-4">Audit Log — Today: 156 events</h3>
          <div className="space-y-2">
            {audit.map((a, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl text-sm">
                <span className="font-mono text-xs text-gray-400 w-16">{a.time}</span>
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-medium w-36">{a.action}</span>
                <span className="flex-1">{a.user} <span className="text-gray-400">({a.role})</span></span>
                <span className="text-gray-500">{a.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'flags' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-bold text-gray-900 mb-4">Feature Flags</h3>
          <div className="space-y-2">
            {flags.map(f => (
              <div key={f.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div><div className="font-mono text-sm">{f.name}</div><div className="text-xs text-gray-500">{f.desc}</div></div>
                <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${f.on ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all ${f.on ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-bold text-gray-900 mb-4">Dashboard Builder</h3>
          <div className="grid grid-cols-4 gap-3">
            {[{ n: 'Active Trips', i: '🚗' }, { n: 'Cost Overview', i: '💰' }, { n: 'Fleet Status', i: '🚐' }, { n: 'Compliance', i: '✅' }, { n: 'Safety', i: '🚨' }, { n: 'Utilization', i: '📊' }, { n: 'Savings', i: '💹' }, { n: 'Bookings', i: '📈' }].map(w => (
              <div key={w.n} className="p-4 bg-gray-50 rounded-xl text-center border-2 border-dashed border-gray-300 hover:border-indigo-400 cursor-pointer">
                <div className="text-2xl mb-2">{w.i}</div>
                <div className="text-sm font-medium">{w.n}</div>
                <div className="text-xs text-gray-400 mt-1">Click to add</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FEEDBACK & COMPLAINTS
// ============================================================

export function FeedbackInline() {
  const feedback = [
    { emp: 'Rahul Sharma', trip: 'TRIP-0892', driver: 5, vehicle: 4, punctuality: 5, overall: 5, comment: 'Excellent service, very professional' },
    { emp: 'Priya Patel', trip: 'TRIP-0890', driver: 4, vehicle: 4, punctuality: 4, overall: 4, comment: 'Good ride, slightly late pickup' },
    { emp: 'Amit Desai', trip: 'TRIP-0888', driver: 3, vehicle: 3, punctuality: 2, overall: 3, comment: '10 min late, AC not working' },
  ];

  const complaints = [
    { id: 'CMP-001', type: 'LATE_PICKUP', status: 'RESOLVED', emp: 'Amit Desai', resolution: 'Driver counseled' },
    { id: 'CMP-002', type: 'VEHICLE_CONDITION', status: 'IN_PROGRESS', emp: 'Sneha Kulkarni', assignedTo: 'Mumbai Cabs' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">⭐ Employee Feedback & Complaints</h2>
        <p className="text-amber-100 mt-1">Ratings • Complaints • Service Quality Score</p>
        <div className="flex gap-4 mt-3">
          {[{ l: 'Avg Rating', v: '4.3⭐' }, { l: 'Driver', v: '4.3' }, { l: 'Vehicle', v: '4.1' }, { l: 'Punctuality', v: '4.5' }, { l: 'Safety', v: '4.6' }].map(k => (
            <div key={k.l} className="bg-white/20 rounded-xl px-4 py-2 text-center"><div className="font-bold">{k.v}</div><div className="text-xs text-amber-100">{k.l}</div></div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-4">Recent Feedback</h3>
        <div className="space-y-3">
          {feedback.map(f => (
            <div key={f.emp} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-4 mb-2">
                <div className="font-medium">{f.emp}</div>
                <div className="text-xs text-gray-500">{f.trip}</div>
                <div className="ml-auto text-lg font-bold text-amber-500">{'⭐'.repeat(f.overall)}</div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500 mb-2">
                <span>Driver: {f.driver}/5</span><span>Vehicle: {f.vehicle}/5</span><span>Punctuality: {f.punctuality}/5</span>
              </div>
              <div className="text-sm text-gray-600 italic">&ldquo;{f.comment}&rdquo;</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-4">Complaints</h3>
        <div className="space-y-3">
          {complaints.map(c => (
            <div key={c.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <span className="font-mono text-xs text-gray-400">{c.id}</span>
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">{c.type}</span>
              <div className="flex-1"><div className="text-sm font-medium">{c.emp}</div><div className="text-xs text-gray-500">{c.resolution || c.assignedTo}</div></div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TRANSPORT BAN / SUSPENSION & APPEAL MANAGEMENT
// ============================================================

export function TransportBanInline() {
  const [tab, setTab] = useState<'active' | 'approvals' | 'policy' | 'history' | 'audit' | 'employee'>('active');
  const tabs = [
    { id: 'active', label: '🚫 Active Bans' },
    { id: 'approvals', label: '✅ Pending Approvals' },
    { id: 'policy', label: '📜 Ban Policy' },
    { id: 'history', label: '📋 Ban History' },
    { id: 'audit', label: '🔍 Audit Log' },
    { id: 'employee', label: '👤 Employee Status' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-red-700 to-rose-600 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">🚫 Transport Ban Management</h2>
        <p className="text-red-100 mt-1">Configurable Ban Policy • Escalation Levels • Approval Workflow • Appeal Management</p>
        <div className="flex gap-4 mt-3">
          {[{ l: 'Active Bans', v: '2' }, { l: 'Pending Approvals', v: '3' }, { l: 'Escalated', v: '1' }, { l: 'Ban Rate', v: '0.2%' }].map(k => (
            <div key={k.l} className="bg-white/20 rounded-xl px-4 py-2 text-center"><div className="text-lg font-bold">{k.v}</div><div className="text-xs text-red-100">{k.l}</div></div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'active' && <BanActiveTab />}
      {tab === 'approvals' && <BanApprovalsTab />}
      {tab === 'policy' && <BanPolicyConfigTab />}
      {tab === 'history' && <BanHistoryViewTab />}
      {tab === 'audit' && <BanAuditViewTab />}
      {tab === 'employee' && <BanEmployeeStatusTab />}
    </div>
  );
}

function BanActiveTab() {
  const bans = [
    { id: 'BAN-001', emp: 'Vikram Mehta', id2: 'EMP-1015', dept: 'Sales', count: 1, reason: 'NO_SHOW', date: 'Aug 25', expiry: 'Sep 1', status: 'ACTIVE', notes: '3 consecutive no-shows' },
    { id: 'BAN-002', emp: 'Deepa Nair', id2: 'EMP-1032', dept: 'Marketing', count: 2, reason: 'REPEATED_CANCELLATION', date: 'Aug 20', expiry: 'Sep 3', status: 'ACTIVE', notes: '5 cancellations in one week' },
    { id: 'BAN-003', emp: 'Rahul Sharma', id2: 'EMP-1001', dept: 'Engineering', count: 1, reason: 'LATE_CANCELLATION', date: 'Aug 28', expiry: 'Sep 4', status: 'REMOVAL_REQUESTED', notes: 'Cancelled within 15 min of pickup' },
  ];
  return (
    <div className="bg-white rounded-2xl border p-6">
      <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-900">Active Transport Bans</h3><button className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium">+ Issue Ban</button></div>
      <div className="space-y-3">
        {bans.map(b => (
          <div key={b.id} className={`p-5 rounded-xl border-2 ${b.status === 'ACTIVE' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-lg">🚫</div>
              <div className="flex-1"><div className="font-bold">{b.emp} <span className="text-gray-400 text-sm">{b.id2} • {b.dept}</span></div><div className="text-sm text-gray-600">Ban #{b.count} • {b.reason.replace(/_/g, ' ')} • {b.notes}</div></div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${b.status === 'ACTIVE' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{b.status.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span>Issued: <strong>{b.date}</strong></span>
              <span>Expires: <strong>{b.expiry}</strong></span>
              <span>Count: <strong className="text-red-600">{b.count}</strong></span>
              {b.status === 'ACTIVE' && <button className="ml-auto bg-blue-600 text-white px-3 py-1 rounded-lg text-xs">View Removal Path</button>}
              {b.status === 'REMOVAL_REQUESTED' && <span className="ml-auto text-yellow-700 text-xs font-medium">⏳ Awaiting Approval</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BanApprovalsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-4">👔 Manager Approvals (1st Ban)</h3>
        <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">👤</div>
            <div className="flex-1"><div className="font-bold">Rahul Sharma <span className="text-gray-400 text-sm">EMP-1001</span></div><div className="text-sm text-gray-600">Ban #1 • LATE_CANCELLATION • Ban Date: Aug 28</div></div>
            <div className="text-right"><div className="text-xs text-gray-500">Deadline</div><div className="font-bold text-red-600">Aug 30</div></div>
          </div>
          <div className="p-3 bg-white rounded-xl mb-3"><div className="text-xs text-gray-500 mb-1">Employee Comment:</div><div className="text-sm italic">&ldquo;I had a medical emergency and could not make it.&rdquo;</div></div>
          <div className="flex gap-2">
            <button className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700">✅ APPROVE REMOVAL</button>
            <button className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold hover:bg-red-600">❌ REJECT</button>
            <button className="bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium">ℹ️ More Info</button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-4">🏛️ Director Approvals (2nd+ Ban)</h3>
        <div className="p-5 bg-orange-50 border-2 border-orange-200 rounded-xl">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">👤</div>
            <div className="flex-1"><div className="font-bold">Deepa Nair <span className="text-gray-400 text-sm">EMP-1032</span></div><div className="text-sm text-gray-600">Ban #2 • REPEATED_CANCELLATION • Previous bans: 1</div></div>
            <div className="text-right"><div className="text-xs text-gray-500">Deadline</div><div className="font-bold text-red-600">Aug 28</div></div>
          </div>
          <div className="p-3 bg-white rounded-xl mb-3"><div className="text-xs text-gray-500 mb-1">Employee Comment:</div><div className="text-sm italic">&ldquo;I have revised my schedule and will ensure timely cancellations.&rdquo;</div></div>
          <div className="flex gap-2">
            <button className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700">✅ APPROVE</button>
            <button className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold hover:bg-red-600">❌ REJECT</button>
            <button className="bg-purple-100 text-purple-700 px-4 py-2.5 rounded-xl font-medium">📧 Email Approval</button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-3">📧 Email Approvals Sent</h3>
        <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl">
          <div className="text-2xl">📧</div>
          <div className="flex-1"><div className="font-medium">Suresh Patel</div><div className="text-sm text-gray-500">Ban #1 • Sent to: director@acme.com</div></div>
          <div className="text-sm text-gray-500">Sent: Aug 30</div>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">WAITING</span>
        </div>
      </div>
    </div>
  );
}

function BanPolicyConfigTab() {
  return (
    <div className="bg-white rounded-2xl border p-6">
      <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-900">Ban Policy Configuration</h3><button className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium">Save Policy</button></div>
      <h4 className="font-medium text-gray-700 mb-2">Escalation Rules</h4>
      <div className="space-y-2 mb-6">
        {[{ ban: 1, role: 'MANAGER', mode: 'In-App', sla: '24h' }, { ban: 2, role: 'DIRECTOR', mode: 'In-App + Email', sla: '24h' }, { ban: 3, role: 'DIRECTOR + HR', mode: 'In-App + Email', sla: '48h' }].map(r => (
          <div key={r.ban} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"><span className="font-medium text-red-600 w-20">Ban #{r.ban}</span><span className="flex-1">Approval: <strong>{r.role}</strong></span><span>{r.mode}</span><span className="text-gray-400">SLA: {r.sla}</span></div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Default Ban Duration</label><input type="number" defaultValue={7} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Count Reset Period (days)</label><input type="number" defaultValue={180} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {[['Allow Email Approval', true], ['Allow Admin Override', true], ['Appeal Enabled', true], ['Separation of Duty', true]].map(([l, v]) => (
          <div key={l as string} className="flex items-center gap-2"><input type="checkbox" defaultChecked={v as boolean} className="w-4 h-4" /><label className="text-sm">{l}</label></div>
        ))}
      </div>
    </div>
  );
}

function BanHistoryViewTab() {
  const h = [
    { id: 'BAN-001', emp: 'Vikram Mehta', count: 1, reason: 'NO_SHOW', date: 'Aug 25', expiry: 'Sep 1', status: 'ACTIVE' },
    { id: 'BAN-002', emp: 'Deepa Nair', count: 2, reason: 'REPEATED_CANCEL', date: 'Aug 20', expiry: 'Sep 3', status: 'ACTIVE' },
    { id: 'BAN-004', emp: 'Amit Desai', count: 1, reason: 'MISUSE', date: 'Jul 15', expiry: 'Jul 22', status: 'REMOVED' },
    { id: 'BAN-005', emp: 'Sneha Kulkarni', count: 1, reason: 'SAFETY', date: 'Jun 10', expiry: 'Jun 17', status: 'EXPIRED' },
  ];
  const sc = (s: string) => s === 'ACTIVE' ? 'bg-red-100 text-red-700' : s === 'REMOVED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';
  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="font-bold text-gray-900 mb-4">Ban History</h3>
      <div className="space-y-2">
        {h.map(b => (
          <div key={b.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
            <span className="font-mono text-xs text-gray-400 w-16">{b.id}</span>
            <div className="flex-1"><span className="font-medium">{b.emp}</span> <span className="text-sm text-gray-500">Ban #{b.count} • {b.reason} • {b.date} to {b.expiry}</span></div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${sc(b.status)}`}>{b.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BanAuditViewTab() {
  const a = [
    { action: 'BAN_CREATED', emp: 'Vikram Mehta', by: 'Transport Admin', time: 'Aug 25 10:00' },
    { action: 'BAN_CREATED', emp: 'Deepa Nair', by: 'Transport Admin', time: 'Aug 20 11:30' },
    { action: 'REMOVAL_REQUESTED', emp: 'Rahul Sharma', by: 'Employee', time: 'Aug 29 10:30' },
    { action: 'MANAGER_APPROVAL_PENDING', emp: 'Rahul Sharma', by: 'System', time: 'Aug 29 10:30' },
    { action: 'REMOVAL_APPROVED', emp: 'Amit Desai', by: 'Manager Priya', time: 'Jul 18 14:00' },
    { action: 'BAN_EXPIRED', emp: 'Sneha Kulkarni', by: 'System', time: 'Jun 17 00:00' },
  ];
  const ac = (act: string) => act.includes('CREATED') ? 'bg-red-100 text-red-700' : act.includes('REQUESTED') ? 'bg-yellow-100 text-yellow-700' : act.includes('APPROVED') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';
  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="font-bold text-gray-900 mb-4">Ban Audit Trail</h3>
      <div className="space-y-2">
        {a.map((e, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
            <span className="text-gray-400 text-xs w-24">{e.time}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium w-40 ${ac(e.action)}`}>{e.action.replace(/_/g, ' ')}</span>
            <span className="font-medium">{e.emp}</span>
            <span className="text-gray-400 text-xs ml-auto">by {e.by}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BanEmployeeStatusTab() {
  const emps = [
    { name: 'Rahul Sharma', id: 'EMP-1001', dept: 'Engineering', count: 1, reason: 'LATE_CANCEL', expiry: 'Sep 4', removal: 'MANAGER_APPROVAL_PENDING' },
    { name: 'Vikram Mehta', id: 'EMP-1015', dept: 'Sales', count: 1, reason: 'NO_SHOW', expiry: 'Sep 1', removal: null },
    { name: 'Deepa Nair', id: 'EMP-1032', dept: 'Marketing', count: 2, reason: 'REPEATED_CANCEL', expiry: 'Sep 3', removal: 'DIRECTOR_APPROVAL_PENDING' },
  ];
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-4">Employee Transport Status</h3>
        <div className="space-y-4">
          {emps.map(e => (
            <div key={e.id} className="p-5 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">🚫</div>
                <div className="flex-1"><div className="font-bold">{e.name} <span className="text-gray-400 text-sm">{e.id} • {e.dept}</span></div><div className="flex items-center gap-2 mt-1"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">SUSPENDED</span><span className="text-sm text-gray-600">Ban #{e.count} • Expires {e.expiry}</span></div></div>
              </div>
              <div className="flex items-center gap-3">
                {e.removal ? <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs">⏳ {e.removal.replace(/_/g, ' ')}</span> : <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">Request Removal</button>}
                <button className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm">📝 Appeal</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-gray-900 mb-3">Approval State Machine</h3>
        <div className="flex items-center gap-2 text-sm overflow-x-auto">
          {[{ s: 'ACTIVE BAN', c: 'bg-red-100 text-red-700 border-red-300' }, { s: 'REMOVAL REQUEST', c: 'bg-yellow-100 text-yellow-700 border-yellow-300' }, { s: 'MANAGER/DIRECTOR', c: 'bg-blue-100 text-blue-700 border-blue-300' }, { s: 'APPROVED', c: 'bg-green-100 text-green-700 border-green-300' }, { s: 'RESTORED', c: 'bg-emerald-100 text-emerald-700 border-emerald-300' }].map((x, i) => (
            <React.Fragment key={i}><div className={`px-3 py-1.5 rounded-lg border whitespace-nowrap font-medium ${x.c}`}>{x.s}</div>{i < 4 && <span className="text-gray-400">→</span>}</React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
