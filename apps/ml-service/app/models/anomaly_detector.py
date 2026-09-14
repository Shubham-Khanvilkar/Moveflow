import math
import statistics
from typing import Dict, List


class AnomalyDetector:
    """Statistical anomaly detection on trip data using z-score analysis."""

    METRICS = ["distance_km", "duration_minutes", "cost"]

    def detect(
        self,
        trips: List[Dict],
        threshold: float = 2.0,
    ) -> List[Dict]:
        if len(trips) < 2:
            raise ValueError("At least 2 trips are required for anomaly detection")

        anomalies: List[Dict] = []

        for metric in self.METRICS:
            values = [t[metric] for t in trips]
            mean = statistics.mean(values)
            stdev = statistics.stdev(values) if len(values) > 1 else 0

            if stdev == 0:
                continue

            for idx, trip in enumerate(trips):
                value = trip[metric]
                z_score = (value - mean) / stdev

                if abs(z_score) > threshold:
                    severity = self._classify_severity(abs(z_score))
                    anomalies.append({
                        "index": idx,
                        "timestamp": trip.get("timestamp", ""),
                        "metric": metric,
                        "value": round(value, 4),
                        "expected": round(mean, 4),
                        "z_score": round(z_score, 4),
                        "severity": severity,
                    })

        anomalies.sort(key=lambda a: abs(a["z_score"]), reverse=True)
        return anomalies

    @staticmethod
    def _classify_severity(abs_z: float) -> str:
        if abs_z >= 4.0:
            return "critical"
        if abs_z >= 3.0:
            return "high"
        if abs_z >= 2.5:
            return "medium"
        return "low"
