import logging
from typing import Dict

from app.models.safety_scorer import SafetyScorer

logger = logging.getLogger(__name__)


class SafetyService:
    """Business logic layer for driver safety scoring."""

    def __init__(self) -> None:
        self._scorer = SafetyScorer()

    def calculate_safety_score(
        self,
        driver_id: str,
        metrics: Dict,
    ) -> Dict:
        if not driver_id:
            raise ValueError("driver_id is required")

        required_fields = ["total_trips", "avg_rating", "compliance_score"]
        for field in required_fields:
            if field not in metrics:
                raise ValueError(f"Missing required metric: {field}")

        result = self._scorer.calculate(metrics=metrics)

        return {
            "driver_id": driver_id,
            **result,
        }
