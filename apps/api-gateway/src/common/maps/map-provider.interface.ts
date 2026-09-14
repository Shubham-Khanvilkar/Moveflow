export interface Place {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
}

export interface RouteResult {
  distance: number; // km
  duration: number; // minutes
  polyline: string;
  steps: Array<{
    instruction: string;
    distance: number;
    duration: number;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
  }>;
}

export interface MatrixResult {
  distances: number[][]; // km
  durations: number[][]; // minutes
}

export interface MapProvider {
  geocode(address: string): Promise<{ lat: number; lng: number }>;
  reverseGeocode(lat: number, lng: number): Promise<string>;
  validateAddress(address: string): Promise<{ valid: boolean; suggestion?: string }>;
  searchPlaces(query: string, location?: { lat: number; lng: number }): Promise<Place[]>;
  calculateRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints?: { lat: number; lng: number }[]
  ): Promise<RouteResult>;
  calculateMatrix(
    origins: { lat: number; lng: number }[],
    destinations: { lat: number; lng: number }[]
  ): Promise<MatrixResult>;
  optimizeRoute(stops: { lat: number; lng: number }[]): Promise<{
    order: number[];
    totalDistance: number;
    totalDuration: number;
  }>;
}
