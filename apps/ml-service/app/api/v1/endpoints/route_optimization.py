import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models import RouteOptimizer
from app.services.route_service import RouteService

logger = logging.getLogger(__name__)
router = APIRouter()


class LocationPayload(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: str = ""


class OptimizeRouteRequest(BaseModel):
    pickup: LocationPayload
    dropoff: LocationPayload
    vehicle_type: str = Field(default="cab_hybrid")
    traffic_level: str = Field(default="medium")
    stops: Optional[List[LocationPayload]] = None


class OptimizeRouteResponse(BaseModel):
    distance_km: float
    duration_minutes: int
    polyline: str
    traffic_level: str
    estimated_fuel_liters: float
    carbon_footprint_kg: float
    optimized_stops: Optional[List[dict]] = None


@router.post("/optimize-route", response_model=OptimizeRouteResponse)
async def optimize_route(request: OptimizeRouteRequest):
    """Optimize a route between pickup and dropoff locations with optional intermediate stops."""
    try:
        service = RouteService()
        result = service.optimize_route(
            pickup_lat=request.pickup.latitude,
            pickup_lon=request.pickup.longitude,
            dropoff_lat=request.dropoff.latitude,
            dropoff_lon=request.dropoff.longitude,
            vehicle_type=request.vehicle_type,
            traffic_level=request.traffic_level,
            stops=[(s.latitude, s.longitude) for s in (request.stops or [])],
        )
        return OptimizeRouteResponse(**result)
    except ValueError as e:
        logger.warning("Invalid route request: %s", e)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Route optimization failed")
        raise HTTPException(status_code=500, detail="Route optimization failed")
