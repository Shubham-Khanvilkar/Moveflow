import logging
import math
from typing import Dict, List, Optional, Tuple

from app.models.route_optimizer import Location, RouteOptimizer

logger = logging.getLogger(__name__)


class RouteService:
    """Business logic layer for route optimization."""

    def __init__(self) -> None:
        self._optimizer = RouteOptimizer()

    def optimize_route(
        self,
        pickup_lat: float,
        pickup_lon: float,
        dropoff_lat: float,
        dropoff_lon: float,
        vehicle_type: str = "cab_hybrid",
        traffic_level: str = "medium",
        stops: Optional[List[Tuple[float, float]]] = None,
    ) -> Dict:
        pickup = Location(latitude=pickup_lat, longitude=pickup_lon)
        dropoff = Location(latitude=dropoff_lat, longitude=dropoff_lon)

        if stops:
            return self._multi_stop_route(pickup, dropoff, stops, vehicle_type, traffic_level)

        route = self._optimizer.optimize_route(
            pickup=pickup,
            dropoff=dropoff,
            vehicle_type=vehicle_type,
            traffic_level=traffic_level,
        )

        return {
            "distance_km": route.distance,
            "duration_minutes": route.duration,
            "polyline": route.polyline,
            "traffic_level": route.traffic_level,
            "estimated_fuel_liters": route.estimated_fuel,
            "carbon_footprint_kg": route.carbon_footprint,
            "optimized_stops": None,
        }

    def _multi_stop_route(
        self,
        pickup: Location,
        dropoff: Location,
        stops: List[Tuple[float, float]],
        vehicle_type: str,
        traffic_level: str,
    ) -> Dict:
        ordered = self._nearest_neighbor_order(pickup, stops, dropoff)

        total_distance = 0.0
        total_duration = 0
        total_fuel = 0.0
        total_carbon = 0.0

        waypoints = [pickup] + ordered + [dropoff]
        optimized_stops: List[Dict] = []

        for i in range(len(waypoints) - 1):
            segment = self._optimizer.optimize_route(
                pickup=waypoints[i],
                dropoff=waypoints[i + 1],
                vehicle_type=vehicle_type,
                traffic_level=traffic_level,
            )
            total_distance += segment.distance
            total_duration += segment.duration
            total_fuel += segment.estimated_fuel
            total_carbon += segment.carbon_footprint

            if i > 0 and i <= len(ordered):
                optimized_stops.append({
                    "latitude": waypoints[i].latitude,
                    "longitude": waypoints[i].longitude,
                    "stop_order": i,
                })

        polyline_parts = [f"{p.latitude},{p.longitude}" for p in waypoints]
        combined_polyline = "|".join(polyline_parts)

        return {
            "distance_km": round(total_distance, 2),
            "duration_minutes": total_duration,
            "polyline": combined_polyline,
            "traffic_level": traffic_level,
            "estimated_fuel_liters": round(total_fuel, 2),
            "carbon_footprint_kg": round(total_carbon, 2),
            "optimized_stops": optimized_stops,
        }

    def _nearest_neighbor_order(
        self,
        start: Location,
        stops: List[Tuple[float, float]],
        end: Location,
    ) -> List[Location]:
        remaining = [Location(latitude=lat, longitude=lon) for lat, lon in stops]
        ordered: List[Location] = []
        current = start

        while remaining:
            nearest = min(
                remaining,
                key=lambda s: self._haversine(current.latitude, current.longitude, s.latitude, s.longitude),
            )
            ordered.append(nearest)
            remaining.remove(nearest)
            current = nearest

        return ordered

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2) ** 2
        )
        return R * 2 * math.asin(math.sqrt(a))
