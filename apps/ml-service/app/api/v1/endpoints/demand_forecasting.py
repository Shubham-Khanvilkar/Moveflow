import logging
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.demand_service import DemandService

logger = logging.getLogger(__name__)
router = APIRouter()


class ForecastDemandRequest(BaseModel):
    timestamp: datetime
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    weather: str = Field(default="sunny")
    event_impact: float = Field(default=0.0, ge=-1.0, le=5.0)


class ForecastDemandResponse(BaseModel):
    timestamp: str
    predicted_demand: int
    confidence: float
    factors: Dict[str, float]


class ForecastRangeRequest(BaseModel):
    start_time: datetime
    hours: int = Field(default=24, ge=1, le=168)
    weather: str = Field(default="sunny")
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@router.post("/forecast-demand", response_model=ForecastDemandResponse)
async def forecast_demand(request: ForecastDemandRequest):
    """Predict demand for a specific timestamp, location, and weather condition."""
    try:
        service = DemandService()
        result = service.predict_demand(
            timestamp=request.timestamp,
            weather=request.weather,
            event_impact=request.event_impact,
            latitude=request.latitude,
            longitude=request.longitude,
        )
        return ForecastDemandResponse(**result)
    except ValueError as e:
        logger.warning("Invalid demand forecast request: %s", e)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Demand forecasting failed")
        raise HTTPException(status_code=500, detail="Demand forecasting failed")


@router.post("/forecast-range", response_model=List[ForecastDemandResponse])
async def forecast_range(request: ForecastRangeRequest):
    """Forecast demand over a range of hours."""
    try:
        service = DemandService()
        results = service.forecast_range(
            start_time=request.start_time,
            hours=request.hours,
            weather=request.weather,
            latitude=request.latitude,
            longitude=request.longitude,
        )
        return [ForecastDemandResponse(**r) for r in results]
    except Exception as e:
        logger.exception("Demand range forecast failed")
        raise HTTPException(status_code=500, detail="Demand range forecast failed")
