import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from app.models.demand_forecaster import DemandForecaster

logger = logging.getLogger(__name__)


class DemandService:
    """Business logic layer for demand forecasting."""

    def __init__(self) -> None:
        self._forecaster = DemandForecaster()

    def predict_demand(
        self,
        timestamp: datetime,
        weather: str = "sunny",
        event_impact: float = 0.0,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> Dict:
        events = [{"impact": event_impact}] if event_impact != 0.0 else None
        location = {}
        if latitude is not None and longitude is not None:
            location = {"latitude": latitude, "longitude": longitude}

        prediction = self._forecaster.predict_demand(
            timestamp=timestamp,
            location=location or None,
            weather=weather,
            events=events,
        )

        return {
            "timestamp": prediction.timestamp.isoformat(),
            "predicted_demand": prediction.predicted_demand,
            "confidence": prediction.confidence,
            "factors": prediction.factors,
        }

    def forecast_range(
        self,
        start_time: datetime,
        hours: int,
        weather: str = "sunny",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> List[Dict]:
        location = {}
        if latitude is not None and longitude is not None:
            location = {"latitude": latitude, "longitude": longitude}

        predictions = self._forecaster.forecast_range(
            start_time=start_time,
            hours=hours,
            location=location or None,
            weather=weather,
        )

        return [
            {
                "timestamp": p.timestamp.isoformat(),
                "predicted_demand": p.predicted_demand,
                "confidence": p.confidence,
                "factors": p.factors,
            }
            for p in predictions
        ]
