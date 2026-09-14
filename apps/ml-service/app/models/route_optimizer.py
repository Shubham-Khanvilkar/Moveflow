import numpy as np
from typing import List, Dict, Tuple
from dataclasses import dataclass
import math

@dataclass
class Location:
    latitude: float
    longitude: float
    address: str = ""

@dataclass
class Route:
    distance: float  # in km
    duration: int  # in minutes
    polyline: str
    traffic_level: str
    estimated_fuel: float  # in liters
    carbon_footprint: float  # in kg CO2

class RouteOptimizer:
    """AI-powered route optimization using advanced algorithms"""
    
    # Carbon emission factors (kg CO2 per km)
    EMISSION_FACTORS = {
        "cab_petrol": 0.19,
        "cab_diesel": 0.17,
        "cab_hybrid": 0.10,
        "cab_electric": 0.05,
        "shuttle": 0.08,
        "bus": 0.06,
        "bike": 0.0,
        "scooter": 0.02,
        "public_transit": 0.04,
    }
    
    # Fuel consumption (liters per 100km)
    FUEL_CONSUMPTION = {
        "cab_petrol": 8.0,
        "cab_diesel": 6.5,
        "cab_hybrid": 4.5,
        "cab_electric": 15.0,  # kWh per 100km
        "shuttle": 12.0,
        "bus": 25.0,
        "bike": 0.0,
        "scooter": 1.5,
        "public_transit": 0.0,
    }
    
    def __init__(self):
        self.traffic_multiplier = {
            "low": 1.0,
            "medium": 1.3,
            "high": 1.6,
            "severe": 2.0,
        }
    
    def calculate_distance(self, start: Location, end: Location) -> float:
        """Calculate distance between two points using Haversine formula"""
        R = 6371  # Earth's radius in km
        
        lat1 = math.radians(start.latitude)
        lat2 = math.radians(end.latitude)
        dlat = math.radians(end.latitude - start.latitude)
        dlon = math.radians(end.longitude - start.longitude)
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def optimize_route(
        self,
        pickup: Location,
        dropoff: Location,
        vehicle_type: str = "cab_hybrid",
        traffic_level: str = "medium",
        time_of_day: int = 9,
    ) -> Route:
        """Optimize a route between two points"""
        
        # Calculate base distance
        distance = self.calculate_distance(pickup, dropoff)
        
        # Estimate duration based on distance and traffic
        base_speed = 30  # km/h in city
        adjusted_speed = base_speed / self.traffic_multiplier[traffic_level]
        duration = int((distance / adjusted_speed) * 60)
        
        # Calculate fuel consumption
        fuel_rate = self.FUEL_CONSUMPTION.get(vehicle_type, 8.0)
        estimated_fuel = (distance * fuel_rate) / 100
        
        # Calculate carbon footprint
        emission_factor = self.EMISSION_FACTORS.get(vehicle_type, 0.19)
        carbon_footprint = distance * emission_factor
        
        # Generate simple polyline (in real app, use Google Maps API)
        polyline = self._generate_polyline(pickup, dropoff)
        
        return Route(
            distance=round(distance, 2),
            duration=duration,
            polyline=polyline,
            traffic_level=traffic_level,
            estimated_fuel=round(estimated_fuel, 2),
            carbon_footprint=round(carbon_footprint, 2),
        )
    
    def find_optimal_vehicle(
        self,
        pickup: Location,
        dropoff: Location,
        available_vehicles: List[Dict],
        preferences: Dict = None,
    ) -> List[Dict]:
        """Find optimal vehicles based on distance, cost, and carbon footprint"""
        
        results = []
        
        for vehicle in available_vehicles:
            vehicle_type = vehicle.get("type", "cab").lower()
            fuel_type = vehicle.get("fuelType", "petrol").lower()
            
            # Determine vehicle category
            if vehicle_type == "cab":
                category = f"cab_{fuel_type}"
            else:
                category = vehicle_type
            
            # Optimize route for this vehicle
            route = self.optimize_route(
                pickup, dropoff, 
                vehicle_type=category,
                traffic_level="medium"
            )
            
            # Calculate cost
            cost = self._calculate_cost(route.distance, vehicle_type)
            
            results.append({
                "vehicle": vehicle,
                "route": {
                    "distance": route.distance,
                    "duration": route.duration,
                    "traffic_level": route.traffic_level,
                },
                "cost": cost,
                "carbon_footprint": route.carbon_footprint,
                "score": self._calculate_score(route, cost, preferences),
            })
        
        # Sort by score (lower is better)
        results.sort(key=lambda x: x["score"])
        
        return results
    
    def _calculate_cost(self, distance: float, vehicle_type: str) -> float:
        """Calculate trip cost based on distance and vehicle type"""
        
        # Base rates per km
        rates = {
            "cab": 1.5,
            "shuttle": 1.2,
            "bus": 0.8,
            "ev": 1.3,
            "bike": 0.5,
            "scooter": 0.6,
        }
        
        base_rate = rates.get(vehicle_type, 1.5)
        return round(distance * base_rate, 2)
    
    def _calculate_score(
        self, 
        route: Route, 
        cost: float, 
        preferences: Dict = None
    ) -> float:
        """Calculate optimization score considering multiple factors"""
        
        if preferences is None:
            preferences = {}
        
        # Weights for different factors
        weights = {
            "time": preferences.get("time_weight", 0.3),
            "cost": preferences.get("cost_weight", 0.3),
            "carbon": preferences.get("carbon_weight", 0.4),
        }
        
        # Normalize values
        max_time = 60  # minutes
        max_cost = 100  # dollars
        max_carbon = 10  # kg CO2
        
        time_score = min(route.duration / max_time, 1.0)
        cost_score = min(cost / max_cost, 1.0)
        carbon_score = min(route.carbon_footprint / max_carbon, 1.0)
        
        # Calculate weighted score
        score = (
            weights["time"] * time_score +
            weights["cost"] * cost_score +
            weights["carbon"] * carbon_score
        )
        
        return round(score, 3)
    
    def _generate_polyline(self, start: Location, end: Location) -> str:
        """Generate a simple polyline (in production, use Maps API)"""
        # Simple encoded polyline for demo
        return f"{start.latitude},{start.longitude}|{end.latitude},{end.longitude}"
