'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { API_URL } from '../../lib/config';

// ============================================================
// TYPES (inline for client-side)
// ============================================================

type ServiceType = 'CAB' | 'SHUTTLE' | 'BUS';
type VehicleType = 'CAB' | 'SEDAN' | 'SUV' | 'VAN' | 'SHUTTLE' | 'BUS';
type AcType = 'AC' | 'NON_AC';
type NightChargeType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'PER_KM';
type RoundingMode = 'ROUND_TO_NEAREST_1' | 'ROUND_TO_NEAREST_5' | 'ROUND_TO_NEAREST_10' | 'NO_ROUNDING';
type TollPolicy = 'NOT_INCLUDED' | 'INCLUDED' | 'VENDOR_REPORTED' | 'MANUALLY_ENTERED';
type ParkingPolicy = 'NOT_INCLUDED' | 'INCLUDED' | 'VENDOR_REPORTED' | 'MANUALLY_ENTERED';

interface RateCard {
  id: string;
  name: string;
  code: string;
  serviceType: ServiceType;
  vehicleType?: VehicleType;
  acType: AcType;
  vendorId?: string;
  vendorName?: string;
  city?: string;
  baseFare: number;
  perKmRate: number;
  perHourRate: number;
  minimumKm: number;
  minimumFare: number;
  waitingChargePerMin: number;
  freeWaitingMinutes: number;
  nightChargeType: NightChargeType;
  nightChargeValue: number;
  airportCharge: number;
  additionalPassengerCharge: number;
  tollPolicy: TollPolicy;
  tollAmount: number;
  parkingPolicy: ParkingPolicy;
  parkingAmount: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  priority: number;
  version: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CostBreakdown {
  plannedDistanceKm: number;
  billableDistanceKm: number;
  ratePerKm: number;
  baseFare: number;
  baseFareAmount: number;
  distanceCost: number;
  waitingCost: number;
  waitingMinutes: number;
  freeWaitingMinutes: number;
  nightChargeAmount: number;
  tollCost: number;
  parkingCost: number;
  airportCharge: number;
  subtotalBeforeMinimum: number;
  finalAmount: number;
  meetsMinimumFare: boolean;
  minimumFare: number;
  roundedAmount: number;
}

// ============================================================
// DEMO DATA (fallback when API unavailable)
// ============================================================

const DEMO_RATE_CARDS: RateCard[] = [
  { id: 'rc-1', name: 'Cab — AC', code: 'CAB-AC', serviceType: 'CAB', acType: 'AC', baseFare: 100, perKmRate: 25, perHourRate: 150, minimumKm: 10, minimumFare: 300, waitingChargePerMin: 5, freeWaitingMinutes: 15, nightChargeType: 'PERCENTAGE', nightChargeValue: 25, airportCharge: 200, additionalPassengerCharge: 50, tollPolicy: 'MANUALLY_ENTERED', tollAmount: 0, parkingPolicy: 'MANUALLY_ENTERED', parkingAmount: 0, effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', isActive: true, priority: 0, version: 1, notes: 'Standard AC cab' },
  { id: 'rc-2', name: 'Cab — NON AC', code: 'CAB-NONAC', serviceType: 'CAB', acType: 'NON_AC', baseFare: 80, perKmRate: 18, perHourRate: 120, minimumKm: 10, minimumFare: 200, waitingChargePerMin: 4, freeWaitingMinutes: 15, nightChargeType: 'PERCENTAGE', nightChargeValue: 25, airportCharge: 150, additionalPassengerCharge: 40, tollPolicy: 'MANUALLY_ENTERED', tollAmount: 0, parkingPolicy: 'MANUALLY_ENTERED', parkingAmount: 0, effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', isActive: true, priority: 0, version: 1 },
  { id: 'rc-3', name: 'Sedan — AC', code: 'SEDAN-AC', serviceType: 'CAB', vehicleType: 'SEDAN', acType: 'AC', baseFare: 120, perKmRate: 30, perHourRate: 200, minimumKm: 10, minimumFare: 400, waitingChargePerMin: 6, freeWaitingMinutes: 15, nightChargeType: 'PERCENTAGE', nightChargeValue: 25, airportCharge: 250, additionalPassengerCharge: 60, tollPolicy: 'MANUALLY_ENTERED', tollAmount: 0, parkingPolicy: 'MANUALLY_ENTERED', parkingAmount: 0, effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', isActive: true, priority: 1, version: 1 },
  { id: 'rc-4', name: 'SUV — AC', code: 'SUV-AC', serviceType: 'CAB', vehicleType: 'SUV', acType: 'AC', baseFare: 150, perKmRate: 35, perHourRate: 250, minimumKm: 10, minimumFare: 500, waitingChargePerMin: 8, freeWaitingMinutes: 15, nightChargeType: 'PERCENTAGE', nightChargeValue: 25, airportCharge: 300, additionalPassengerCharge: 75, tollPolicy: 'MANUALLY_ENTERED', tollAmount: 0, parkingPolicy: 'MANUALLY_ENTERED', parkingAmount: 0, effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', isActive: true, priority: 2, version: 1 },
];

// ============================================================
// CLIENT-SIDE COST CALCULATOR (mirrors server logic exactly)
// ============================================================

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateClientCost(
  rateCard: RateCard,
  distanceKm: number,
  waitingMinutes: number = 0,
  isNightTrip: boolean = false,
  isAirportTrip: boolean = false
): CostBreakdown {
  const billableKm = Math.max(distanceKm, rateCard.minimumKm);
  const distanceCost = billableKm * rateCard.perKmRate;
  const effectiveWaiting = Math.max(0, waitingMinutes - rateCard.freeWaitingMinutes);
  const waitingCost = effectiveWaiting * rateCard.waitingChargePerMin;

  let nightCharge = 0;
  if (isNightTrip) {
    const sub = rateCard.baseFare + distanceCost + waitingCost;
    if (rateCard.nightChargeType === 'PERCENTAGE') nightCharge = (sub * rateCard.nightChargeValue) / 100;
    else if (rateCard.nightChargeType === 'FIXED_AMOUNT') nightCharge = rateCard.nightChargeValue;
    else nightCharge = billableKm * rateCard.nightChargeValue;
  }

  const airportCharge = isAirportTrip ? rateCard.airportCharge : 0;
  const toll = rateCard.tollPolicy === 'INCLUDED' ? rateCard.tollAmount : 0;
  const parking = rateCard.parkingPolicy === 'INCLUDED' ? rateCard.parkingAmount : 0;

  const subtotal = rateCard.baseFare + distanceCost + waitingCost + nightCharge + toll + parking + airportCharge;
  const meetsMin = subtotal < rateCard.minimumFare;
  const finalAmt = meetsMin ? rateCard.minimumFare : subtotal;

  return {
    plannedDistanceKm: parseFloat(distanceKm.toFixed(2)),
    billableDistanceKm: parseFloat(billableKm.toFixed(2)),
    ratePerKm: rateCard.perKmRate,
    baseFare: rateCard.baseFare,
    baseFareAmount: rateCard.baseFare,
    distanceCost: parseFloat(distanceCost.toFixed(2)),
    waitingCost: parseFloat(waitingCost.toFixed(2)),
    waitingMinutes,
    freeWaitingMinutes: rateCard.freeWaitingMinutes,
    nightChargeAmount: parseFloat(nightCharge.toFixed(2)),
    tollCost: toll,
    parkingCost: parking,
    airportCharge,
    subtotalBeforeMinimum: parseFloat(subtotal.toFixed(2)),
    finalAmount: parseFloat(finalAmt.toFixed(2)),
    meetsMinimumFare: meetsMin,
    minimumFare: rateCard.minimumFare,
    roundedAmount: Math.round(finalAmt),
  };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<'rate-cards' | 'calculator' | 'analytics' | 'settings'>('rate-cards');
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterService, setFilterService] = useState<ServiceType | 'ALL'>('ALL');
  const [filterAc, setFilterAc] = useState<AcType | 'ALL'>('ALL');
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<RateCard | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  // Fetch rate cards from API
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/billing/rate-cards`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load rate cards: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        const cards = d.data?.rateCards || d.data || d.rateCards || d || [];
        setRateCards(Array.isArray(cards) ? cards : []);
      })
      .catch((e) => {
        console.error('Failed to load rate cards:', e);
        setError('Failed to load rate cards from server. Showing demo data.');
        // Fallback to demo data if API fails
        setRateCards(DEMO_RATE_CARDS);
      })
      .finally(() => setLoading(false));
  }, []);

  // ========================================================
  // FILTERED RATE CARDS
  // ========================================================

  const filteredCards = useMemo(() => {
    return rateCards.filter((rc) => {
      if (filterService !== 'ALL' && rc.serviceType !== filterService) return false;
      if (filterAc !== 'ALL' && rc.acType !== filterAc) return false;
      if (filterActive === 'ACTIVE' && !rc.isActive) return false;
      if (filterActive === 'INACTIVE' && rc.isActive) return false;
      return true;
    });
  }, [rateCards, filterService, filterAc, filterActive]);

  // ========================================================
  // TAB NAVIGATION
  // ========================================================

  const tabs = [
    { key: 'rate-cards', label: 'Rate Cards', icon: '💰' },
    { key: 'calculator', label: 'Cost Calculator', icon: '🧮' },
    { key: 'analytics', label: 'Cost Analytics', icon: '📊' },
    { key: 'settings', label: 'Pricing Settings', icon: '⚙️' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pricing Engine</h1>
            <p className="text-sm text-gray-500 mt-1">Configure rates, calculate fares, and manage transportation costs</p>
          </div>
          <div className="flex items-center gap-3">
            {loading && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Loading rate cards...
              </span>
            )}
            {!loading && error && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                ⚠️ {error}
              </span>
            )}
            {!loading && !error && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                ✅ {rateCards.length} rate cards loaded from API
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'rate-cards' && (
          <RateCardsTab
            rateCards={filteredCards}
            filterService={filterService}
            filterAc={filterAc}
            filterActive={filterActive}
            onFilterService={setFilterService}
            onFilterAc={setFilterAc}
            onFilterActive={setFilterActive}
            onEdit={(rc) => { setEditingCard(rc); setShowForm(true); }}
            onToggleActive={(id) => {
              setRateCards((prev) =>
                prev.map((rc) =>
                  rc.id === id ? { ...rc, isActive: !rc.isActive } : rc
                )
              );
            }}
            onDuplicate={(rc) => {
              const dup: RateCard = {
                ...rc,
                id: `rc-${Date.now()}`,
                name: `${rc.name} (Copy)`,
                code: `${rc.code}-COPY`,
                isActive: false,
                version: 1,
              };
              setRateCards((prev) => [...prev, dup]);
            }}
            onCreateNew={() => { setEditingCard(null); setShowForm(true); }}
          />
        )}

        {activeTab === 'calculator' && (
          <CalculatorTab rateCards={rateCards} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}

        {activeTab === 'settings' && (
          <PricingSettingsTab />
        )}
      </div>

      {/* Rate Card Form Modal */}
      {showForm && (
        <RateCardFormModal
          rateCard={editingCard}
          onClose={() => { setShowForm(false); setEditingCard(null); }}
          onSave={(rc) => {
            if (editingCard) {
              setRateCards((prev) => prev.map((r) => (r.id === rc.id ? rc : r)));
            } else {
              setRateCards((prev) => [...prev, { ...rc, id: `rc-${Date.now()}` }]);
            }
            setShowForm(false);
            setEditingCard(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// RATE CARDS TAB
// ============================================================

function RateCardsTab({
  rateCards,
  filterService,
  filterAc,
  filterActive,
  onFilterService,
  onFilterAc,
  onFilterActive,
  onEdit,
  onToggleActive,
  onDuplicate,
  onCreateNew,
}: {
  rateCards: RateCard[];
  filterService: ServiceType | 'ALL';
  filterAc: AcType | 'ALL';
  filterActive: 'ALL' | 'ACTIVE' | 'INACTIVE';
  onFilterService: (v: ServiceType | 'ALL') => void;
  onFilterAc: (v: AcType | 'ALL') => void;
  onFilterActive: (v: 'ALL' | 'ACTIVE' | 'INACTIVE') => void;
  onEdit: (rc: RateCard) => void;
  onToggleActive: (id: string) => void;
  onDuplicate: (rc: RateCard) => void;
  onCreateNew: () => void;
}) {
  return (
    <div>
      {/* Filters & Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <select
              value={filterService}
              onChange={(e) => onFilterService(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">All Services</option>
              <option value="CAB">Cab</option>
              <option value="SHUTTLE">Shuttle</option>
              <option value="BUS">Bus</option>
            </select>
            <select
              value={filterAc}
              onChange={(e) => onFilterAc(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">All Types</option>
              <option value="AC">AC</option>
              <option value="NON_AC">NON AC</option>
            </select>
            <select
              value={filterActive}
              onChange={(e) => onFilterActive(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <span className="text-sm text-gray-500">{rateCards.length} rate cards</span>
          </div>
          <button
            onClick={onCreateNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Create Rate Card
          </button>
        </div>
      </div>

      {/* Rate Cards Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Service</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">AC Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">₹/KM</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Base Fare</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Min KM</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Min Fare</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Valid From</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Valid To</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Priority</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rateCards.map((rc) => (
                <tr key={rc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{rc.name}</div>
                    <div className="text-xs text-gray-500">{rc.code}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{rc.vehicleType || 'Any'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        rc.acType === 'AC'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {rc.acType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                    ₹{rc.perKmRate}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">₹{rc.baseFare}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{rc.minimumKm} KM</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">₹{rc.minimumFare}</td>
                  <td className="px-4 py-3 text-gray-600">{rc.effectiveFrom}</td>
                  <td className="px-4 py-3 text-gray-600">{rc.effectiveTo || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        rc.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {rc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{rc.priority}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(rc)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDuplicate(rc)}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => onToggleActive(rc.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          rc.isActive
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={rc.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {rc.isActive ? '⏸️' : '▶️'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COST CALCULATOR TAB
// ============================================================

function CalculatorTab({ rateCards }: { rateCards: RateCard[] }) {
  // Mumbai demo locations
  const locations = [
    { name: 'Powai', lat: 19.1197, lng: 72.9066 },
    { name: 'BKC', lat: 19.0596, lng: 72.8656 },
    { name: 'Andheri', lat: 19.1136, lng: 72.8697 },
    { name: 'Bandra', lat: 19.0596, lng: 72.8295 },
    { name: 'Goregaon', lat: 19.1663, lng: 72.8526 },
    { name: 'Vikhroli', lat: 19.1076, lng: 72.9274 },
    { name: 'Thane', lat: 19.1966, lng: 72.9636 },
    { name: 'Lower Parel', lat: 19.0071, lng: 72.8387 },
  ];

  const [pickupIdx, setPickupIdx] = useState(0);
  const [dropIdx, setDropIdx] = useState(1);
  const [selectedRcId, setSelectedRcId] = useState(rateCards[0]?.id || '');
  const [waitingMin, setWaitingMin] = useState(0);
  const [isNight, setIsNight] = useState(false);
  const [isAirport, setIsAirport] = useState(false);
  const [toll, setToll] = useState(0);
  const [parking, setParking] = useState(0);

  const selectedRc = rateCards.find((r) => r.id === selectedRcId);

  const distance = useMemo(
    () =>
      haversineDistanceKm(
        locations[pickupIdx].lat,
        locations[pickupIdx].lng,
        locations[dropIdx].lat,
        locations[dropIdx].lng
      ),
    [pickupIdx, dropIdx]
  );

  const breakdown = useMemo(() => {
    if (!selectedRc) return null;
    return calculateClientCost(selectedRc, distance, waitingMin, isNight, isAirport);
  }, [selectedRc, distance, waitingMin, isNight, isAirport]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Route & Settings</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rate Card</label>
            <select
              value={selectedRcId}
              onChange={(e) => setSelectedRcId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {rateCards
                .filter((r) => r.isActive)
                .map((rc) => (
                  <option key={rc.id} value={rc.id}>
                    {rc.name} — ₹{rc.perKmRate}/KM
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
              <select
                value={pickupIdx}
                onChange={(e) => setPickupIdx(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {locations.map((loc, i) => (
                  <option key={i} value={i}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Drop Location</label>
              <select
                value={dropIdx}
                onChange={(e) => setDropIdx(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {locations.map((loc, i) => (
                  <option key={i} value={i}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Distance Display */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm text-blue-600 font-medium">Calculated Distance</div>
            <div className="text-2xl font-bold text-blue-700">{distance.toFixed(2)} KM</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Waiting (min)</label>
              <input
                type="number"
                value={waitingMin}
                onChange={(e) => setWaitingMin(Number(e.target.value))}
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Toll (₹)</label>
              <input
                type="number"
                value={toll}
                onChange={(e) => setToll(Number(e.target.value))}
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parking (₹)</label>
              <input
                type="number"
                value={parking}
                onChange={(e) => setParking(Number(e.target.value))}
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div></div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isNight}
                onChange={(e) => setIsNight(e.target.checked)}
                className="rounded border-gray-300"
              />
              Night Trip (22:00–06:00)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAirport}
                onChange={(e) => setIsAirport(e.target.checked)}
                className="rounded border-gray-300"
              />
              Airport Trip
            </label>
          </div>
        </div>
      </div>

      {/* Cost Breakdown Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fare Breakdown</h3>

        {breakdown ? (
          <div>
            {/* Route info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{locations[pickupIdx].name} → {locations[dropIdx].name}</span>
                <span className="font-medium">{breakdown.plannedDistanceKm} KM</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Rate Card</span>
                <span className="font-medium">{selectedRc?.name}</span>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-3">
              <BreakdownLine label="Base Fare" amount={breakdown.baseFareAmount} />
              <BreakdownLine
                label={`Distance: ${breakdown.billableDistanceKm} KM${breakdown.meetsMinimumFare ? ' (min applied)' : ''}`}
                amount={breakdown.distanceCost}
                detail={`@ ₹${breakdown.ratePerKm}/KM`}
              />

              {breakdown.waitingMinutes > 0 && (
                <BreakdownLine
                  label={`Waiting: ${breakdown.waitingMinutes} min`}
                  amount={breakdown.waitingCost}
                  detail={`${breakdown.freeWaitingMinutes} min free, ₹${selectedRc?.waitingChargePerMin}/min after`}
                />
              )}

              {breakdown.nightChargeAmount > 0 && (
                <BreakdownLine
                  label="Night Charge"
                  amount={breakdown.nightChargeAmount}
                  detail={`${selectedRc?.nightChargeValue}${selectedRc?.nightChargeType === 'PERCENTAGE' ? '%' : ''}`}
                />
              )}

              {breakdown.tollCost > 0 && <BreakdownLine label="Toll" amount={breakdown.tollCost} />}
              {breakdown.parkingCost > 0 && <BreakdownLine label="Parking" amount={breakdown.parkingCost} />}
              {breakdown.airportCharge > 0 && <BreakdownLine label="Airport Charge" amount={breakdown.airportCharge} />}

              {breakdown.meetsMinimumFare && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Minimum fare applied: ₹{breakdown.minimumFare} (calculated: ₹{breakdown.subtotalBeforeMinimum})
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t border-gray-200 mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Estimated Total</span>
                <span className="text-2xl font-bold text-blue-600">₹{breakdown.roundedAmount}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Select a rate card to calculate fare
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownLine({ label, amount, detail }: { label: string; amount: number; detail?: string }) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <span className="text-sm text-gray-700">{label}</span>
        {detail && <span className="text-xs text-gray-400 ml-2">{detail}</span>}
      </div>
      <span className="text-sm font-mono font-medium text-gray-900">₹{amount.toFixed(2)}</span>
    </div>
  );
}

// ============================================================
// ANALYTICS TAB
// ============================================================

function AnalyticsTab() {
  const [dateRange, setDateRange] = useState('this-month');

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Transport Cost', value: '₹4,85,200', change: '+8.3%', color: 'blue' },
          { label: 'Avg Cost / Trip', value: '₹612', change: '-2.1%', color: 'green' },
          { label: 'Avg Cost / KM', value: '₹24.5', change: '+1.5%', color: 'amber' },
          { label: 'AC vs NON-AC Savings', value: '₹42,300', change: '15% saved', color: 'emerald' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">{kpi.label}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</div>
            <div className={`text-sm mt-1 ${
              kpi.change.includes('-') || kpi.change.includes('saved')
                ? 'text-emerald-600'
                : 'text-red-500'
            }`}>
              {kpi.change}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Cost by Department */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Department</h3>
          <div className="space-y-3">
            {[
              { dept: 'Engineering', cost: 185000, trips: 320 },
              { dept: 'Product', cost: 98000, trips: 180 },
              { dept: 'Marketing', cost: 76000, trips: 145 },
              { dept: 'Sales', cost: 65000, trips: 110 },
              { dept: 'HR', cost: 32000, trips: 55 },
            ].map((d) => (
              <div key={d.dept} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{d.dept}</span>
                    <span className="text-gray-500">{d.trips} trips</span>
                  </div>
                  <div className="mt-1 h-2 bg-gray-100 rounded-full">
                    <div
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${(d.cost / 185000) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-mono font-semibold text-gray-900 w-20 text-right">
                  ₹{d.cost.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AC vs NON-AC Comparison */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AC vs NON-AC Cost</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-2">AC</div>
              <div className="text-3xl font-bold text-blue-600">₹3,21,500</div>
              <div className="text-sm text-gray-500 mt-1">312 trips · ₹24.5/KM avg</div>
              <div className="mt-3 h-3 bg-blue-100 rounded-full">
                <div className="h-3 bg-blue-500 rounded-full" style={{ width: '66%' }} />
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-2">NON AC</div>
              <div className="text-3xl font-bold text-green-600">₹1,63,700</div>
              <div className="text-sm text-gray-500 mt-1">492 trips · ₹16.8/KM avg</div>
              <div className="mt-3 h-3 bg-green-100 rounded-full">
                <div className="h-3 bg-green-500 rounded-full" style={{ width: '34%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Cost Comparison */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Cost Comparison</h3>
          <div className="space-y-3">
            {[
              { vendor: 'Vendor A (Mumbai Cabs)', avgRate: 24, trips: 420, total: 285000 },
              { vendor: 'Vendor B (QuickRide)', avgRate: 22, trips: 280, total: 198000 },
              { vendor: 'Vendor C (Premium)', avgRate: 35, trips: 120, total: 165000 },
            ].map((v) => (
              <div key={v.vendor} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900 text-sm">{v.vendor}</span>
                  <span className="font-mono font-semibold text-gray-900">₹{v.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{v.trips} trips</span>
                  <span>Avg ₹{v.avgRate}/KM</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Cost Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Cost Trend</h3>
          <div className="flex items-end gap-2 h-40">
            {[
              { month: 'Jan', cost: 380000 },
              { month: 'Feb', cost: 410000 },
              { month: 'Mar', cost: 395000 },
              { month: 'Apr', cost: 420000 },
              { month: 'May', cost: 455000 },
              { month: 'Jun', cost: 440000 },
              { month: 'Jul', cost: 465000 },
              { month: 'Aug', cost: 485200 },
            ].map((m) => {
              const maxCost = 500000;
              const height = (m.cost / maxCost) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t-md transition-all hover:bg-blue-600"
                    style={{ height: `${height}%` }}
                    title={`₹${m.cost.toLocaleString()}`}
                  />
                  <span className="text-xs text-gray-500 mt-1">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PRICING SETTINGS TAB
// ============================================================

function PricingSettingsTab() {
  const [settings, setSettings] = useState({
    roundingMode: 'ROUND_TO_NEAREST_1',
    roundingPrecision: 2,
    nightChargeStart: 22,
    nightChargeEnd: 6,
    defaultFreeWaitingMinutes: 15,
    defaultWaitingRatePerMin: 5,
    gpsTrackingIntervalSeconds: 10,
    gpsRetentionDays: 90,
    defaultTollPolicy: 'MANUALLY_ENTERED',
    defaultParkingPolicy: 'MANUALLY_ENTERED',
  });

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Pricing Configuration</h3>

        <div className="space-y-6">
          {/* Rounding */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Rounding Rules</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Rounding Mode</label>
                <select
                  value={settings.roundingMode}
                  onChange={(e) => setSettings((s) => ({ ...s, roundingMode: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="NO_ROUNDING">No Rounding</option>
                  <option value="ROUND_TO_NEAREST_1">Nearest ₹1</option>
                  <option value="ROUND_TO_NEAREST_5">Nearest ₹5</option>
                  <option value="ROUND_TO_NEAREST_10">Nearest ₹10</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Decimal Places</label>
                <input
                  type="number"
                  value={settings.roundingPrecision}
                  onChange={(e) => setSettings((s) => ({ ...s, roundingPrecision: Number(e.target.value) }))}
                  min={0}
                  max={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Night Charge Hours */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Night Charge Window</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Night Starts (hour)</label>
                <input
                  type="number"
                  value={settings.nightChargeStart}
                  onChange={(e) => setSettings((s) => ({ ...s, nightChargeStart: Number(e.target.value) }))}
                  min={0}
                  max={23}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Night Ends (hour)</label>
                <input
                  type="number"
                  value={settings.nightChargeEnd}
                  onChange={(e) => setSettings((s) => ({ ...s, nightChargeEnd: Number(e.target.value) }))}
                  min={0}
                  max={23}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Waiting Defaults */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Waiting Charges</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Free Waiting Minutes</label>
                <input
                  type="number"
                  value={settings.defaultFreeWaitingMinutes}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultFreeWaitingMinutes: Number(e.target.value) }))}
                  min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Waiting Rate (₹/min)</label>
                <input
                  type="number"
                  value={settings.defaultWaitingRatePerMin}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultWaitingRatePerMin: Number(e.target.value) }))}
                  min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* GPS */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">GPS & Tracking</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">GPS Interval (seconds)</label>
                <input
                  type="number"
                  value={settings.gpsTrackingIntervalSeconds}
                  onChange={(e) => setSettings((s) => ({ ...s, gpsTrackingIntervalSeconds: Number(e.target.value) }))}
                  min={1}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">GPS Retention (days)</label>
                <input
                  type="number"
                  value={settings.gpsRetentionDays}
                  onChange={(e) => setSettings((s) => ({ ...s, gpsRetentionDays: Number(e.target.value) }))}
                  min={7}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Toll & Parking */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Toll & Parking Policy</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Toll Policy</label>
                <select
                  value={settings.defaultTollPolicy}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultTollPolicy: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="NOT_INCLUDED">Not Included</option>
                  <option value="INCLUDED">Included in Rate</option>
                  <option value="VENDOR_REPORTED">Vendor Reported</option>
                  <option value="MANUALLY_ENTERED">Manually Entered</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Parking Policy</label>
                <select
                  value={settings.defaultParkingPolicy}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultParkingPolicy: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="NOT_INCLUDED">Not Included</option>
                  <option value="INCLUDED">Included in Rate</option>
                  <option value="VENDOR_REPORTED">Vendor Reported</option>
                  <option value="MANUALLY_ENTERED">Manually Entered</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RATE CARD FORM MODAL
// ============================================================

function RateCardFormModal({
  rateCard,
  onClose,
  onSave,
}: {
  rateCard: RateCard | null;
  onClose: () => void;
  onSave: (rc: RateCard) => void;
}) {
  const [form, setForm] = useState<Partial<RateCard>>(
    rateCard || {
      serviceType: 'CAB',
      acType: 'AC',
      baseFare: 0,
      perKmRate: 0,
      perHourRate: 0,
      minimumKm: 10,
      minimumFare: 0,
      waitingChargePerMin: 5,
      freeWaitingMinutes: 15,
      nightChargeType: 'PERCENTAGE',
      nightChargeValue: 0,
      airportCharge: 0,
      additionalPassengerCharge: 0,
      tollPolicy: 'MANUALLY_ENTERED',
      tollAmount: 0,
      parkingPolicy: 'MANUALLY_ENTERED',
      parkingAmount: 0,
      isActive: true,
      priority: 0,
      version: 1,
    }
  );

  const handleSave = () => {
    const rc: RateCard = {
      ...form,
      id: rateCard?.id || `rc-${Date.now()}`,
      name: form.name || 'Unnamed',
      code: form.code || `${form.serviceType}-${form.acType}`,
      effectiveFrom: form.effectiveFrom || new Date().toISOString().split('T')[0],
      createdAt: rateCard?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as RateCard;
    onSave(rc);
  };

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {rateCard ? 'Edit Rate Card' : 'Create Rate Card'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Classification */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
              <select value={form.serviceType || ''} onChange={(e) => update('serviceType', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="CAB">Cab</option>
                <option value="SHUTTLE">Shuttle</option>
                <option value="BUS">Bus</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
              <select value={form.vehicleType || ''} onChange={(e) => update('vehicleType', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Any</option>
                <option value="CAB">Hatchback</option>
                <option value="SEDAN">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="VAN">Van</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AC Type *</label>
              <select value={form.acType || ''} onChange={(e) => update('acType', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="AC">AC</option>
                <option value="NON_AC">NON AC</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={form.name || ''} onChange={(e) => update('name', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., Cab — AC" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input type="text" value={form.code || ''} onChange={(e) => update('code', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., CAB-AC" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" value={form.city || ''} onChange={(e) => update('city', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., Mumbai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <input type="number" value={form.priority || 0} onChange={(e) => update('priority', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Pricing</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Per KM Rate (₹) *</label>
                <input type="number" value={form.perKmRate || 0} onChange={(e) => update('perKmRate', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} step={0.5} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Fare (₹)</label>
                <input type="number" value={form.baseFare || 0} onChange={(e) => update('baseFare', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Per Hour Rate (₹)</label>
                <input type="number" value={form.perHourRate || 0} onChange={(e) => update('perHourRate', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum KM</label>
                <input type="number" value={form.minimumKm || 0} onChange={(e) => update('minimumKm', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Fare (₹)</label>
                <input type="number" value={form.minimumFare || 0} onChange={(e) => update('minimumFare', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Airport Charge (₹)</label>
                <input type="number" value={form.airportCharge || 0} onChange={(e) => update('airportCharge', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} />
              </div>
            </div>
          </div>

          {/* Waiting */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Waiting Charges</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Free Waiting (min)</label>
                <input type="number" value={form.freeWaitingMinutes || 0} onChange={(e) => update('freeWaitingMinutes', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Waiting Rate (₹/min)</label>
                <input type="number" value={form.waitingChargePerMin || 0} onChange={(e) => update('waitingChargePerMin', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} step={0.5} />
              </div>
            </div>
          </div>

          {/* Night Charge */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Night Charge</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Night Charge Type</label>
                <select value={form.nightChargeType || 'PERCENTAGE'} onChange={(e) => update('nightChargeType', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                  <option value="PER_KM">Per KM (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Night Charge Value</label>
                <input type="number" value={form.nightChargeValue || 0} onChange={(e) => update('nightChargeValue', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} />
              </div>
            </div>
          </div>

          {/* Toll & Parking */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Toll & Parking</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Toll Policy</label>
                <select value={form.tollPolicy || 'NOT_INCLUDED'} onChange={(e) => update('tollPolicy', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="NOT_INCLUDED">Not Included</option>
                  <option value="INCLUDED">Included in Rate</option>
                  <option value="VENDOR_REPORTED">Vendor Reported</option>
                  <option value="MANUALLY_ENTERED">Manually Entered</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parking Policy</label>
                <select value={form.parkingPolicy || 'NOT_INCLUDED'} onChange={(e) => update('parkingPolicy', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="NOT_INCLUDED">Not Included</option>
                  <option value="INCLUDED">Included in Rate</option>
                  <option value="VENDOR_REPORTED">Vendor Reported</option>
                  <option value="MANUALLY_ENTERED">Manually Entered</option>
                </select>
              </div>
            </div>
          </div>

          {/* Validity */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Validity</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective From *</label>
                <input type="date" value={form.effectiveFrom || ''} onChange={(e) => update('effectiveFrom', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective To</label>
                <input type="date" value={form.effectiveTo || ''} onChange={(e) => update('effectiveTo', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => update('notes', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Optional notes about this rate card..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            {rateCard ? 'Update Rate Card' : 'Create Rate Card'}
          </button>
        </div>
      </div>
    </div>
  );
}
