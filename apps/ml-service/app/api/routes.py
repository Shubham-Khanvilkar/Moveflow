from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

from app.models import RouteOptimizer, DemandForecaster, CarbonCalculator

router = APIRouter()

# Initialize models
route_optimizer = RouteOptimizer()
demand_forecaster = DemandForecaster()
carbon_calculator = CarbonCalculator()

# ==================== REQUEST MODELS ====================

class LocationRequest(BaseModel):
    latitude: float
    longitude: float
    address: str = ""

class RouteRequest(BaseModel):
    pickup: LocationRequest
    dropoff: LocationRequest
    vehicle_type: str = "cab_hybrid"
    traffic_level: str = "medium"

class VehicleOptimizationRequest(BaseModel):
    pickup: LocationRequest
    dropoff: LocationRequest
    available_vehicles: List[Dict]
    preferences: Optional[Dict] = None

class DemandPredictionRequest(BaseModel):
    timestamp: datetime
    location: Optional[Dict] = None
    weather: str = "sunny"
    events: Optional[List[Dict]] = None

class CarbonCalculationRequest(BaseModel):
    distance: float
    transport_mode: str
    occupancy: int = 1

class MonthlyFootprintRequest(BaseModel):
    trips: List[Dict]

class SustainabilityReportRequest(BaseModel):
    organization_data: Dict

# ==================== ROUTE ENDPOINTS ====================

@router.post("/route/optimize")
async def optimize_route(request: RouteRequest):
    """Optimize a route between two points"""
    try:
        pickup = LocationRequest(**request.pickup.model_dump())
        dropoff = LocationRequest(**request.dropoff.model_dump())
        
        route = route_optimizer.optimize_route(
            pickup=pickup,
            dropoff=dropoff,
            vehicle_type=request.vehicle_type,
            traffic_level=request.traffic_level,
        )
        
        return {
            "success": True,
            "data": {
                "distance": route.distance,
                "duration": route.duration,
                "polyline": route.polyline,
                "traffic_level": route.traffic_level,
                "estimated_fuel": route.estimated_fuel,
                "carbon_footprint": route.carbon_footprint,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/route/optimize-vehicles")
async def optimize_vehicles(request: VehicleOptimizationRequest):
    """Find optimal vehicles for a route"""
    try:
        pickup = LocationRequest(**request.pickup.model_dump())
        dropoff = LocationRequest(**request.dropoff.model_dump())
        
        results = route_optimizer.find_optimal_vehicle(
            pickup=pickup,
            dropoff=dropoff,
            available_vehicles=request.available_vehicles,
            preferences=request.preferences,
        )
        
        return {
            "success": True,
            "data": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DEMAND ENDPOINTS ====================

@router.post("/demand/predict")
async def predict_demand(request: DemandPredictionRequest):
    """Predict demand for a specific time"""
    try:
        prediction = demand_forecaster.predict_demand(
            timestamp=request.timestamp,
            location=request.location,
            weather=request.weather,
            events=request.events,
        )
        
        return {
            "success": True,
            "data": {
                "timestamp": prediction.timestamp.isoformat(),
                "predicted_demand": prediction.predicted_demand,
                "confidence": prediction.confidence,
                "factors": prediction.factors,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/demand/forecast")
async def forecast_demand(
    start_time: datetime,
    hours: int = 24,
    weather: str = "sunny",
):
    """Forecast demand for a range of hours"""
    try:
        predictions = demand_forecaster.forecast_range(
            start_time=start_time,
            hours=hours,
            weather=weather,
        )
        
        return {
            "success": True,
            "data": [
                {
                    "timestamp": p.timestamp.isoformat(),
                    "predicted_demand": p.predicted_demand,
                    "confidence": p.confidence,
                }
                for p in predictions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/demand/allocate")
async def allocate_vehicles(
    start_time: datetime,
    hours: int = 24,
    total_vehicles: int = 50,
    weather: str = "sunny",
):
    """Suggest vehicle allocation based on demand"""
    try:
        predictions = demand_forecaster.forecast_range(
            start_time=start_time,
            hours=hours,
            weather=weather,
        )
        
        allocations = demand_forecaster.suggest_vehicle_allocation(
            predictions=predictions,
            total_vehicles=total_vehicles,
        )
        
        return {
            "success": True,
            "data": allocations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== CARBON ENDPOINTS ====================

@router.post("/carbon/calculate")
async def calculate_carbon(request: CarbonCalculationRequest):
    """Calculate carbon footprint for a trip"""
    try:
        result = carbon_calculator.calculate_trip_emissions(
            distance=request.distance,
            transport_mode=request.transport_mode,
            occupancy=request.occupancy,
        )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/carbon/monthly")
async def calculate_monthly_footprint(request: MonthlyFootprintRequest):
    """Calculate monthly carbon footprint"""
    try:
        footprint = carbon_calculator.calculate_monthly_footprint(
            trips=request.trips,
        )
        
        return {
            "success": True,
            "data": {
                "total_emissions": footprint.total_emissions,
                "by_transport_mode": footprint.by_transport_mode,
                "trees_needed": footprint.trees_needed,
                "comparison_to_average": footprint.comparison_to_average,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/carbon/alternatives")
async def suggest_alternatives(
    current_mode: str,
    distance: float,
):
    """Suggest sustainable alternatives"""
    try:
        suggestions = carbon_calculator.suggest_sustainable_alternatives(
            current_mode=current_mode,
            distance=distance,
        )
        
        return {
            "success": True,
            "data": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/carbon/report")
async def generate_sustainability_report(request: SustainabilityReportRequest):
    """Generate sustainability report"""
    try:
        report = carbon_calculator.generate_sustainability_report(
            organization_data=request.organization_data,
        )
        
        return {
            "success": True,
            "data": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
