import * as Location from 'expo-location';
import { gpsApi } from './api';

const GPS_INTERVAL = 30000;

class GPSTrackingService {
  private isTracking = false;
  private subscription: Location.LocationSubscription | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private currentTripId: string | null = null;
  private currentVehicleId: string | null = null;

  async startTracking(tripId: string, vehicleId: string): Promise<boolean> {
    if (this.isTracking) {
      console.log('GPS tracking already active');
      return true;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return false;
      }

      this.currentTripId = tripId;
      this.currentVehicleId = vehicleId;
      this.isTracking = true;

      await this.sendLocation();

      this.intervalId = setInterval(() => {
        this.sendLocation();
      }, GPS_INTERVAL);

      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: GPS_INTERVAL,
          distanceInterval: 50,
        },
        (location) => {
          this.recordLocation(location, tripId);
        }
      );

      console.log('GPS tracking started for trip:', tripId);
      return true;
    } catch (error) {
      console.error('Failed to start GPS tracking:', error);
      this.isTracking = false;
      return false;
    }
  }

  async stopTracking(): Promise<void> {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isTracking = false;
    this.currentTripId = null;
    this.currentVehicleId = null;
    console.log('GPS tracking stopped');
  }

  async sendLocation(): Promise<void> {
    if (!this.currentTripId) return;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await this.recordLocation(location, this.currentTripId);
    } catch (error) {
      console.error('Failed to get current location:', error);
    }
  }

  private async recordLocation(
    location: Location.LocationObject,
    tripId: string
  ): Promise<void> {
    try {
      await gpsApi.recordLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        speed: location.coords.speed || undefined,
        heading: location.coords.heading || undefined,
        tripId,
        vehicleId: this.currentVehicleId || '',
      });
    } catch (error) {
      console.error('Failed to record GPS location:', error);
    }
  }

  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Failed to get current location:', error);
      return null;
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results.length > 0) {
        const addr = results[0];
        const parts = [
          addr.streetNumber,
          addr.street,
          addr.district,
          addr.city,
          addr.region,
        ].filter(Boolean);
        return parts.join(', ') || null;
      }
      return null;
    } catch (error) {
      console.error('Reverse geocode failed:', error);
      return null;
    }
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  isActive(): boolean {
    return this.isTracking;
  }
}

export const gpsService = new GPSTrackingService();
export default gpsService;
