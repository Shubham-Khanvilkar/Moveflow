from typing import Dict, List


class SafetyScorer:
    """Calculate driver safety scores from operational metrics."""

    WEIGHTS = {
        "rating": 0.25,
        "compliance": 0.30,
        "accident_rate": 0.20,
        "experience": 0.10,
        "late_arrivals": 0.15,
    }

    def calculate(self, metrics: Dict) -> Dict:
        rating_score = self._rating_component(metrics.get("avg_rating", 0))
        compliance_score = metrics.get("compliance_score", 0) * 100
        accident_score = self._accident_component(
            metrics.get("accident_count", 0),
            metrics.get("total_distance_km", 0),
        )
        experience_score = self._experience_component(
            metrics.get("years_experience", 0),
            metrics.get("total_trips", 0),
        )
        late_score = self._lateness_component(
            metrics.get("late_arrivals_pct", 0),
        )

        breakdown = {
            "rating": round(rating_score, 2),
            "compliance": round(compliance_score, 2),
            "accident_free": round(accident_score, 2),
            "experience": round(experience_score, 2),
            "punctuality": round(late_score, 2),
        }

        total = (
            self.WEIGHTS["rating"] * rating_score
            + self.WEIGHTS["compliance"] * compliance_score
            + self.WEIGHTS["accident_rate"] * accident_score
            + self.WEIGHTS["experience"] * experience_score
            + self.WEIGHTS["late_arrivals"] * late_score
        )

        total = max(0.0, min(100.0, total))

        return {
            "safety_score": round(total, 2),
            "risk_level": self._risk_level(total),
            "breakdown": breakdown,
            "recommendations": self._recommendations(breakdown),
        }

    @staticmethod
    def _rating_component(avg_rating: float) -> float:
        clamped = max(0.0, min(5.0, avg_rating))
        return (clamped / 5.0) * 100

    @staticmethod
    def _accident_component(accident_count: int, total_distance_km: float) -> float:
        if total_distance_km <= 0:
            return 80.0 if accident_count == 0 else 40.0
        rate = accident_count / (total_distance_km / 1000)
        score = max(0, 100 - (rate * 500))
        return min(100.0, score)

    @staticmethod
    def _experience_component(years: float, trips: int) -> float:
        year_score = min(years / 10.0, 1.0) * 60
        trip_score = min(trips / 5000.0, 1.0) * 40
        return year_score + trip_score

    @staticmethod
    def _lateness_component(late_pct: float) -> float:
        clamped = max(0.0, min(1.0, late_pct))
        return (1.0 - clamped) * 100

    @staticmethod
    def _risk_level(score: float) -> str:
        if score >= 80:
            return "low"
        if score >= 60:
            return "medium"
        if score >= 40:
            return "high"
        return "critical"

    @staticmethod
    def _recommendations(breakdown: Dict[str, float]) -> List[str]:
        recs: List[str] = []
        if breakdown["rating"] < 70:
            recs.append("Focus on customer service and communication skills")
        if breakdown["compliance"] < 70:
            recs.append("Review and improve compliance with platform policies")
        if breakdown["accident_free"] < 70:
            recs.append("Enroll in defensive driving refresher course")
        if breakdown["punctuality"] < 70:
            recs.append("Improve time management to reduce late arrivals")
        if breakdown["experience"] < 50:
            recs.append("Gain more experience through consistent trip completion")
        if not recs:
            recs.append("Maintain current performance levels")
        return recs
