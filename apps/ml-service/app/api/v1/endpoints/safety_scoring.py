import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.safety_service import SafetyService

logger = logging.getLogger(__name__)
router = APIRouter()


class DriverMetrics(BaseModel):
    total_trips: int = Field(..., ge=0)
    avg_rating: float = Field(..., ge=0, le=5.0)
    compliance_score: float = Field(..., ge=0, le=1.0)
    accident_count: int = Field(default=0, ge=0)
    total_distance_km: float = Field(default=0, ge=0)
    years_experience: float = Field(default=0, ge=0)
    late_arrivals_pct: float = Field(default=0, ge=0, le=1.0)


class SafetyScoreRequest(BaseModel):
    driver_id: str = Field(..., min_length=1)
    metrics: DriverMetrics


class SafetyScoreResponse(BaseModel):
    driver_id: str
    safety_score: float
    risk_level: str
    breakdown: Dict[str, float]
    recommendations: List[str]


class BatchSafetyRequest(BaseModel):
    drivers: List[SafetyScoreRequest]


class BatchSafetyResponse(BaseModel):
    results: List[SafetyScoreResponse]
    average_safety_score: float
    highest_risk_driver: Optional[str]
    lowest_risk_driver: Optional[str]


@router.post("/safety-score", response_model=SafetyScoreResponse)
async def calculate_safety_score(request: SafetyScoreRequest):
    """Calculate safety score for a driver based on their metrics."""
    try:
        service = SafetyService()
        result = service.calculate_safety_score(
            driver_id=request.driver_id,
            metrics=request.metrics.model_dump(),
        )
        return SafetyScoreResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Safety score calculation failed")
        raise HTTPException(status_code=500, detail="Safety score calculation failed")


@router.post("/safety-score/batch", response_model=BatchSafetyResponse)
async def batch_safety_score(request: BatchSafetyRequest):
    """Calculate safety scores for multiple drivers in batch."""
    try:
        service = SafetyService()
        results = []
        for driver in request.drivers:
            result = service.calculate_safety_score(
                driver_id=driver.driver_id,
                metrics=driver.metrics.model_dump(),
            )
            results.append(SafetyScoreResponse(**result))

        scores = [r.safety_score for r in results]
        avg_score = sum(scores) / len(scores) if scores else 0

        highest_risk = None
        lowest_risk = None
        if results:
            highest_risk = min(results, key=lambda r: r.safety_score).driver_id
            lowest_risk = max(results, key=lambda r: r.safety_score).driver_id

        return BatchSafetyResponse(
            results=results,
            average_safety_score=round(avg_score, 2),
            highest_risk_driver=highest_risk,
            lowest_risk_driver=lowest_risk,
        )
    except Exception as e:
        logger.exception("Batch safety score calculation failed")
        raise HTTPException(status_code=500, detail="Batch safety score calculation failed")
