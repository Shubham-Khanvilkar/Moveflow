import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.carbon_service import CarbonService

logger = logging.getLogger(__name__)
router = APIRouter()


class CalculateCarbonRequest(BaseModel):
    distance_km: float = Field(..., gt=0)
    transport_mode: str = Field(..., min_length=1)
    occupancy: int = Field(default=1, ge=1, le=100)


class CalculateCarbonResponse(BaseModel):
    distance_km: float
    transport_mode: str
    emissions_kg: float
    trees_needed_to_offset: float
    equivalent_driving_km: float


class TripInput(BaseModel):
    distance_km: float = Field(..., gt=0)
    transport_mode: str
    occupancy: int = Field(default=1, ge=1)


class MonthlyFootprintRequest(BaseModel):
    trips: List[TripInput]


class MonthlyFootprintResponse(BaseModel):
    total_emissions_kg: float
    by_transport_mode: Dict[str, float]
    trees_needed: float
    comparison_to_average_pct: float


class AlternativeRequest(BaseModel):
    current_mode: str
    distance_km: float = Field(..., gt=0)


class AlternativeResponse(BaseModel):
    mode: str
    emissions_kg: float
    savings_kg: float
    savings_percentage: float


@router.post("/calculate-carbon", response_model=CalculateCarbonResponse)
async def calculate_carbon(request: CalculateCarbonRequest):
    """Calculate carbon emissions for a single trip."""
    try:
        service = CarbonService()
        result = service.calculate_trip_emissions(
            distance_km=request.distance_km,
            transport_mode=request.transport_mode,
            occupancy=request.occupancy,
        )
        return CalculateCarbonResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Carbon calculation failed")
        raise HTTPException(status_code=500, detail="Carbon calculation failed")


@router.post("/monthly-footprint", response_model=MonthlyFootprintResponse)
async def monthly_footprint(request: MonthlyFootprintRequest):
    """Calculate total monthly carbon footprint from a list of trips."""
    try:
        service = CarbonService()
        result = service.calculate_monthly_footprint(
            trips=[t.model_dump() for t in request.trips]
        )
        return MonthlyFootprintResponse(**result)
    except Exception as e:
        logger.exception("Monthly footprint calculation failed")
        raise HTTPException(status_code=500, detail="Monthly footprint calculation failed")


@router.post("/alternatives", response_model=List[AlternativeResponse])
async def suggest_alternatives(request: AlternativeRequest):
    """Suggest greener transport alternatives for a given trip."""
    try:
        service = CarbonService()
        results = service.suggest_alternatives(
            current_mode=request.current_mode,
            distance_km=request.distance_km,
        )
        return [AlternativeResponse(**r) for r in results]
    except Exception as e:
        logger.exception("Alternative suggestion failed")
        raise HTTPException(status_code=500, detail="Alternative suggestion failed")
