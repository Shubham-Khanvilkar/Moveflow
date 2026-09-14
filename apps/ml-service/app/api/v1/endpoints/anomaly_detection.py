import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.anomaly_service import AnomalyService

logger = logging.getLogger(__name__)
router = APIRouter()


class TripDataPoint(BaseModel):
    timestamp: str
    distance_km: float = Field(..., ge=0)
    duration_minutes: float = Field(..., ge=0)
    cost: float = Field(..., ge=0)
    vehicle_type: str = "cab"


class DetectAnomaliesRequest(BaseModel):
    trips: List[TripDataPoint] = Field(..., min_length=2)
    threshold: float = Field(default=2.0, gt=0, le=5.0)


class AnomalyResult(BaseModel):
    index: int
    timestamp: str
    metric: str
    value: float
    expected: float
    z_score: float
    severity: str


class DetectAnomaliesResponse(BaseModel):
    anomalies: List[AnomalyResult]
    total_trips_analyzed: int
    anomaly_count: int
    summary: Dict[str, float]


@router.post("/detect-anomalies", response_model=DetectAnomaliesResponse)
async def detect_anomalies(request: DetectAnomaliesRequest):
    """Detect anomalous trips using statistical analysis on distance, duration, and cost metrics."""
    try:
        service = AnomalyService()
        result = service.detect_anomalies(
            trips=[t.model_dump() for t in request.trips],
            threshold=request.threshold,
        )
        return DetectAnomaliesResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Anomaly detection failed")
        raise HTTPException(status_code=500, detail="Anomaly detection failed")
