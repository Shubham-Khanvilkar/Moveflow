import logging
from typing import Dict, List

from app.models.anomaly_detector import AnomalyDetector

logger = logging.getLogger(__name__)


class AnomalyService:
    """Business logic layer for anomaly detection on trip data."""

    def __init__(self) -> None:
        self._detector = AnomalyDetector()

    def detect_anomalies(
        self,
        trips: List[Dict],
        threshold: float = 2.0,
    ) -> Dict:
        if len(trips) < 2:
            raise ValueError("At least 2 trips are required for anomaly detection")

        anomalies = self._detector.detect(trips=trips, threshold=threshold)

        for metric in AnomalyDetector.METRICS:
            values = [t[metric] for t in trips]

        summary = self._build_summary(trips, anomalies)

        return {
            "anomalies": anomalies,
            "total_trips_analyzed": len(trips),
            "anomaly_count": len(anomalies),
            "summary": summary,
        }

    @staticmethod
    def _build_summary(trips: List[Dict], anomalies: List[Dict]) -> Dict[str, float]:
        import statistics

        summary: Dict[str, float] = {}
        for metric in AnomalyDetector.METRICS:
            values = [t[metric] for t in trips]
            summary[f"{metric}_mean"] = round(statistics.mean(values), 4)
            summary[f"{metric}_stdev"] = round(statistics.stdev(values), 4) if len(values) > 1 else 0.0

        summary["anomaly_rate_pct"] = round(
            (len(anomalies) / len(trips)) * 100, 2
        ) if trips else 0.0

        return summary
