'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, ApiError } from '../../lib/api-client';

interface TripPassenger {
  id: string;
  userId: string;
  boardingStatus: string;
  seatNumber: number | null;
  boardTime: string | null;
  alightTime: string | null;
  boardedImage: string | null;
  User: { id: string; name: string; email: string; phone: string | null };
}

interface Trip {
  id: string;
  tripCode: string;
  status: string;
  type: string;
  passengerCount: number;
  scheduledPickupTime: string;
  pickupAddress: string;
  dropAddress: string;
  vehicle?: { id: string; registrationNo: string; maxCapacity: number } | null;
  driver?: { id: string; name: string; email: string } | null;
}

type FilterStatus = 'ALL' | 'PICKED_UP' | 'IN_TRANSIT' | 'ALIGHTING' | 'DROPPED' | 'NO_SHOW';

const BOARDING_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  SCHEDULED:        { bg: '#e5e7eb', text: '#374151', label: 'Scheduled' },
  EN_ROUTE_TO_PICKUP: { bg: '#dbeafe', text: '#1e40af', label: 'En Route' },
  PICKED_UP:        { bg: '#d1fae5', text: '#065f46', label: 'Boarded' },
  IN_TRANSIT:       { bg: '#fef3c7', text: '#92400e', label: 'In Transit' },
  ALIGHTING:        { bg: '#fce7f3', text: '#9d174d', label: 'Alighting' },
  DROPPED:          { bg: '#ede9fe', text: '#5b21b6', label: 'Dropped' },
  NO_SHOW:          { bg: '#fee2e2', text: '#991b1b', label: 'No Show' },
  CANCELLED:        { bg: '#f3f4f6', text: '#6b7280', label: 'Cancelled' },
};

const TRIP_STATUS_STYLES: Record<string, string> = {
  ARRIVED_AT_PICKUP: 'Started',
  BOARDING: 'Boarding',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_DROP: 'Arrived',
  COMPLETED: 'Completed',
};

export default function BoardingPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [passengers, setPassengers] = useState<TripPassenger[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingPassengers, setLoadingPassengers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [passengerFilter, setPassengerFilter] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTrips = useCallback(async () => {
    try {
      setLoadingTrips(true);
      setError(null);
      const data = await apiGet<Trip[]>('/trips?status=ARRIVED_AT_PICKUP,BOARDING,IN_TRANSIT,ARRIVED_AT_DROP');
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load trips');
      }
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  const fetchPassengers = useCallback(async (tripId: string) => {
    try {
      setLoadingPassengers(true);
      setError(null);
      const data = await apiGet<TripPassenger[]>(`/trips/${tripId}/passengers`);
      setPassengers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load passengers');
      }
      setPassengers([]);
    } finally {
      setLoadingPassengers(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  useEffect(() => {
    if (selectedTrip) {
      fetchPassengers(selectedTrip.id);
    }
  }, [selectedTrip, fetchPassengers]);

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setPassengerFilter('ALL');
    setSearchQuery('');
  };

  const handleTripTransition = async (action: string) => {
    if (!selectedTrip) return;
    try {
      setActionLoading(action);
      setError(null);
      await apiPost(`/trips/${selectedTrip.id}/transition`, { action });
      const updated = await apiGet<Trip>(`/trips/${selectedTrip.id}`);
      setSelectedTrip(updated);
      setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(`Failed to ${action.replace(/_/g, ' ').toLowerCase()}`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handlePassengerTransition = async (userId: string, action: string) => {
    if (!selectedTrip) return;
    const passengerKey = `${selectedTrip.id}-${userId}`;
    try {
      setActionLoading(passengerKey);
      setError(null);
      await apiPost(`/trips/${selectedTrip.id}/passengers/${userId}/transition`, { action });
      await fetchPassengers(selectedTrip.id);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(`Failed to ${action.replace(/_/g, ' ').toLowerCase()} passenger`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPassengers = passengers.filter((p) => {
    const matchesFilter = passengerFilter === 'ALL' || p.boardingStatus === passengerFilter;
    const matchesSearch =
      !searchQuery ||
      p.User.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.User.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getValidTripActions = (status: string): string[] => {
    const map: Record<string, string[]> = {
      ARRIVED_AT_PICKUP: ['START_BOARDING', 'MARK_NO_SHOW'],
      BOARDING: ['START_TRIP'],
      IN_TRANSIT: ['ARRIVE_AT_DROP'],
      ARRIVED_AT_DROP: ['COMPLETE_TRIP'],
    };
    return map[status] || [];
  };

  const getValidPassengerActions = (status: string): string[] => {
    const map: Record<string, string[]> = {
      SCHEDULED: ['PICKED_UP', 'NO_SHOW'],
      EN_ROUTE_TO_PICKUP: ['PICKED_UP', 'NO_SHOW'],
      PICKED_UP: ['IN_TRANSIT'],
      IN_TRANSIT: ['ALIGHTING', 'DROPPED'],
      ALIGHTING: ['DROPPED'],
    };
    return map[status] || [];
  };

  const getBoardedCount = () => passengers.filter((p) => ['PICKED_UP', 'IN_TRANSIT', 'ALIGHTING'].includes(p.boardingStatus)).length;
  const getAlightedCount = () => passengers.filter((p) => p.boardingStatus === 'DROPPED').length;
  const getNoShowCount = () => passengers.filter((p) => p.boardingStatus === 'NO_SHOW').length;

  const buildActionLabel = (action: string) => action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  if (loadingTrips) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#6b7280' }}>Loading trips...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && trips.length === 0 && !selectedTrip) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#991b1b', fontWeight: 600 }}>Error loading trips</p>
          <p style={{ color: '#dc2626', marginTop: 4, fontSize: 14 }}>{error}</p>
          <button onClick={() => { setError(null); fetchTrips(); }} style={{ marginTop: 12, padding: '8px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!selectedTrip) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Boarding Verification</h1>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>OTP/QR verification for passenger boarding</p>

        {trips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <h3 style={{ color: '#374151', marginTop: 12 }}>No trips ready for boarding</h3>
            <p style={{ color: '#6b7280' }}>Trips will appear here once they arrive at pickup.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {trips.map((trip) => (
              <div key={trip.id} onClick={() => handleSelectTrip(trip)} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'box-shadow 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{trip.tripCode}</div>
                  <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{trip.pickupAddress} → {trip.dropAddress}</div>
                  <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{trip.passengerCount} passengers · {trip.type}</div>
                </div>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#dbeafe', color: '#1e40af' }}>
                  {TRIP_STATUS_STYLES[trip.status] || trip.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const tripActions = getValidTripActions(selectedTrip.status);
  const boardedCount = getBoardedCount();
  const alightedCount = getAlightedCount();
  const noShowCount = getNoShowCount();
  const capacity = selectedTrip.vehicle?.maxCapacity || selectedTrip.passengerCount;

  return (
    <div style={{ padding: 24 }}>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#991b1b', fontSize: 14 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      <button onClick={() => setSelectedTrip(null)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 14, marginBottom: 12, padding: 0 }}>
        ← Back to trips
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>{selectedTrip.tripCode}</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0' }}>{selectedTrip.pickupAddress} → {selectedTrip.dropAddress}</p>
        </div>
        <span style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: '#dbeafe', color: '#1e40af' }}>
          {selectedTrip.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>{boardedCount}</div>
          <div style={{ fontSize: 12, color: '#15803d' }}>Boarded</div>
        </div>
        <div style={{ background: '#ede9fe', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#5b21b6' }}>{alightedCount}</div>
          <div style={{ fontSize: 12, color: '#6d28d9' }}>Dropped</div>
        </div>
        <div style={{ background: '#fef2f2', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#991b1b' }}>{noShowCount}</div>
          <div style={{ fontSize: 12, color: '#dc2626' }}>No Show</div>
        </div>
        <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#075985' }}>{capacity}</div>
          <div style={{ fontSize: 12, color: '#0369a1' }}>Capacity</div>
        </div>
      </div>

      {tripActions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {tripActions.map((action) => {
            const isBoardingAction = action === 'START_BOARDING';
            const isTripStart = action === 'START_TRIP';
            return (
              <button key={action} onClick={() => handleTripTransition(action)} disabled={actionLoading === action}
                style={{
                  padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, border: 'none', cursor: actionLoading === action ? 'wait' : 'pointer',
                  background: isTripStart ? '#059669' : isBoardingAction ? '#2563eb' : '#374151',
                  color: 'white', opacity: actionLoading === action ? 0.6 : 1,
                }}
              >
                {actionLoading === action ? 'Processing...' : buildActionLabel(action)}
              </button>
            );
          })}
        </div>
      )}

      {selectedTrip.driver && (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
          <span style={{ color: '#6b7280' }}>Driver: <strong style={{ color: '#111827' }}>{selectedTrip.driver.name}</strong></span>
          {selectedTrip.vehicle && <span style={{ color: '#6b7280' }}>Vehicle: <strong style={{ color: '#111827' }}>{selectedTrip.vehicle.registrationNo}</strong></span>}
        </div>
      )}

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search passengers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }}
        />
        {(['ALL', 'PICKED_UP', 'IN_TRANSIT', 'ALIGHTING', 'DROPPED', 'NO_SHOW'] as FilterStatus[]).map((f) => (
          <button key={f} onClick={() => setPassengerFilter(f)}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid',
              borderColor: passengerFilter === f ? '#2563eb' : '#d1d5db',
              background: passengerFilter === f ? '#2563eb' : 'white',
              color: passengerFilter === f ? 'white' : '#374151', cursor: 'pointer',
            }}
          >
            {f === 'ALL' ? 'All' : (BOARDING_STATUS_STYLES[f]?.label || f)}
          </button>
        ))}
      </div>

      {loadingPassengers ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading passengers...</div>
      ) : filteredPassengers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#f9fafb', borderRadius: 8, color: '#6b7280' }}>
          {passengers.length === 0 ? 'No passengers on this trip.' : 'No passengers match this filter.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filteredPassengers.map((p) => {
            const style = BOARDING_STATUS_STYLES[p.boardingStatus] || BOARDING_STATUS_STYLES.SCHEDULED;
            const validActions = getValidPassengerActions(p.boardingStatus);
            return (
              <div key={p.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.User.name}</div>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>{p.User.email}</div>
                  {p.seatNumber != null && <div style={{ color: '#6b7280', fontSize: 12 }}>Seat {p.seatNumber}</div>}
                  {p.boardTime && <div style={{ color: '#6b7280', fontSize: 11 }}>Boarded {new Date(p.boardTime).toLocaleTimeString()}</div>}
                  {p.alightTime && <div style={{ color: '#6b7280', fontSize: 11 }}>Alighted {new Date(p.alightTime).toLocaleTimeString()}</div>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: style.bg, color: style.text }}>
                    {style.label}
                  </span>

                  {validActions.map((action) => (
                    <button key={action} onClick={() => handlePassengerTransition(p.userId, action)}
                      disabled={actionLoading === `${selectedTrip.id}-${p.userId}`}
                      style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                        background: action === 'NO_SHOW' ? '#dc2626' : action === 'DROPPED' || action === 'PICKED_UP' ? '#059669' : '#2563eb',
                        color: 'white', opacity: actionLoading === `${selectedTrip.id}-${p.userId}` ? 0.6 : 1,
                      }}
                    >
                      {actionLoading === `${selectedTrip.id}-${p.userId}` ? '...' : buildActionLabel(action)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
