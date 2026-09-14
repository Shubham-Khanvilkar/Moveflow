import logging
from typing import Dict, List

from app.models.carbon_calculator import CarbonCalculator

logger = logging.getLogger(__name__)


class CarbonService:
    """Business logic layer for carbon footprint calculations."""

    def __init__(self) -> None:
        self._calculator = CarbonCalculator()

    def calculate_trip_emissions(
        self,
        distance_km: float,
        transport_mode: str,
        occupancy: int = 1,
    ) -> Dict:
        if distance_km <= 0:
            raise ValueError("Distance must be positive")
        if occupancy < 1:
            raise ValueError("Occupancy must be at least 1")

        raw = self._calculator.calculate_trip_emissions(
            distance=distance_km,
            transport_mode=transport_mode,
            occupancy=occupancy,
        )

        return {
            "distance_km": raw["distance"],
            "transport_mode": raw["transport_mode"],
            "emissions_kg": raw["emissions_kg"],
            "trees_needed_to_offset": raw["trees_needed"],
            "equivalent_driving_km": raw["equivalent_driving_km"],
        }

    def calculate_monthly_footprint(self, trips: List[Dict]) -> Dict:
        if not trips:
            raise ValueError("Trip list cannot be empty")

        footprint = self._calculator.calculate_monthly_footprint(trips=trips)

        return {
            "total_emissions_kg": footprint.total_emissions,
            "by_transport_mode": footprint.by_transport_mode,
            "trees_needed": footprint.trees_needed,
            "comparison_to_average_pct": footprint.comparison_to_average,
        }

    def suggest_alternatives(
        self,
        current_mode: str,
        distance_km: float,
    ) -> List[Dict]:
        if distance_km <= 0:
            raise ValueError("Distance must be positive")

        return self._calculator.suggest_sustainable_alternatives(
            current_mode=current_mode,
            distance=distance_km,
        )
