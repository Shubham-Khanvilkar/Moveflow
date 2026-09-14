from typing import Dict, List
from dataclasses import dataclass

@dataclass
class CarbonFootprint:
    total_emissions: float  # kg CO2
    by_transport_mode: Dict[str, float]
    trees_needed: float  # trees to offset
    comparison_to_average: float  # percentage

class CarbonCalculator:
    """Calculate and track carbon footprint for sustainable commuting"""
    
    # CO2 emission factors (kg CO2 per km)
    EMISSION_FACTORS = {
        "cab_petrol": 0.192,
        "cab_diesel": 0.171,
        "cab_hybrid": 0.095,
        "cab_electric": 0.053,
        "shuttle_diesel": 0.089,
        "shuttle_electric": 0.032,
        "bus_diesel": 0.068,
        "bus_electric": 0.025,
        "bike": 0.0,
        "e_bike": 0.015,
        "scooter": 0.021,
        "public_transit": 0.041,
        "walking": 0.0,
        "carpool": 0.065,
    }
    
    # Average emissions per km for comparison
    AVERAGE_EMISSIONS_PER_KM = 0.15  # kg CO2
    
    # CO2 absorbed by one tree per year (kg)
    TREE_ABSORPTION_PER_YEAR = 21.77
    
    def calculate_trip_emissions(
        self,
        distance: float,  # km
        transport_mode: str,
        occupancy: int = 1,
    ) -> Dict:
        """Calculate emissions for a single trip"""
        
        emission_factor = self.EMISSION_FACTORS.get(transport_mode, 0.15)
        
        # Adjust for occupancy (shared rides)
        adjusted_factor = emission_factor / max(occupancy, 1)
        
        emissions = distance * adjusted_factor
        
        # Calculate trees needed to offset (per year)
        trees_needed = emissions / self.TREE_ABSORPTION_PER_YEAR
        
        return {
            "distance": distance,
            "transport_mode": transport_mode,
            "emissions_kg": round(emissions, 3),
            "trees_needed": round(trees_needed, 4),
            "equivalent_driving_km": round(emissions / 0.192, 2),
        }
    
    def calculate_monthly_footprint(
        self,
        trips: List[Dict],
    ) -> CarbonFootprint:
        """Calculate total monthly carbon footprint"""
        
        by_mode = {}
        total_emissions = 0
        
        for trip in trips:
            mode = trip.get("transport_mode", "cab_petrol")
            distance = trip.get("distance", 0)
            occupancy = trip.get("occupancy", 1)
            
            result = self.calculate_trip_emissions(distance, mode, occupancy)
            emissions = result["emissions_kg"]
            
            by_mode[mode] = by_mode.get(mode, 0) + emissions
            total_emissions += emissions
        
        # Compare to average
        total_distance = sum(t.get("distance", 0) for t in trips)
        expected_emissions = total_distance * self.AVERAGE_EMISSIONS_PER_KM
        comparison = ((total_emissions - expected_emissions) / max(expected_emissions, 1)) * 100
        
        trees_needed = total_emissions / self.TREE_ABSORPTION_PER_YEAR
        
        return CarbonFootprint(
            total_emissions=round(total_emissions, 2),
            by_transport_mode={k: round(v, 2) for k, v in by_mode.items()},
            trees_needed=round(trees_needed, 2),
            comparison_to_average=round(comparison, 2),
        )
    
    def get_greenest_option(
        self,
        options: List[Dict],
    ) -> Dict:
        """Find the greenest transport option"""
        
        if not options:
            return None
        
        # Calculate emissions for each option
        scored_options = []
        
        for option in options:
            result = self.calculate_trip_emissions(
                option.get("distance", 0),
                option.get("transport_mode", "cab_petrol"),
                option.get("occupancy", 1),
            )
            scored_options.append({
                **option,
                "emissions_kg": result["emissions_kg"],
            })
        
        # Sort by emissions (lowest first)
        scored_options.sort(key=lambda x: x["emissions_kg"])
        
        return scored_options[0] if scored_options else None
    
    def suggest_sustainable_alternatives(
        self,
        current_mode: str,
        distance: float,
    ) -> List[Dict]:
        """Suggest more sustainable alternatives"""
        
        current_emissions = self.calculate_trip_emissions(distance, current_mode)
        
        suggestions = []
        
        for mode, factor in self.EMISSION_FACTORS.items():
            if mode == current_mode:
                continue
            
            emissions = self.calculate_trip_emissions(distance, mode)
            
            if emissions["emissions_kg"] < current_emissions["emissions_kg"]:
                savings = current_emissions["emissions_kg"] - emissions["emissions_kg"]
                suggestions.append({
                    "mode": mode,
                    "emissions_kg": emissions["emissions_kg"],
                    "savings_kg": round(savings, 3),
                    "savings_percentage": round((savings / current_emissions["emissions_kg"]) * 100, 1),
                })
        
        # Sort by savings (highest first)
        suggestions.sort(key=lambda x: x["savings_kg"], reverse=True)
        
        return suggestions[:5]  # Return top 5 suggestions
    
    def generate_sustainability_report(
        self,
        organization_data: Dict,
    ) -> Dict:
        """Generate a sustainability report for an organization"""
        
        total_emissions = organization_data.get("total_emissions", 0)
        total_distance = organization_data.get("total_distance", 0)
        employee_count = organization_data.get("employee_count", 1)
        
        # Calculate key metrics
        avg_emissions_per_employee = total_emissions / employee_count
        avg_distance_per_employee = total_distance / employee_count
        
        # Trees needed for offset
        trees_needed = total_emissions / self.TREE_ABSORPTION_PER_YEAR
        
        # Carbon intensity
        carbon_intensity = total_emissions / total_distance if total_distance > 0 else 0
        
        return {
            "summary": {
                "total_emissions_kg": round(total_emissions, 2),
                "total_distance_km": round(total_distance, 2),
                "employee_count": employee_count,
            },
            "per_employee": {
                "avg_emissions_kg": round(avg_emissions_per_employee, 2),
                "avg_distance_km": round(avg_distance_per_employee, 2),
            },
            "environmental_impact": {
                "trees_needed_for_offset": round(trees_needed, 0),
                "equivalent_cars_off_road": round(total_emissions / 4600, 2),
                "carbon_intensity": round(carbon_intensity, 4),
            },
            "recommendations": self._generate_recommendations(organization_data),
        }
    
    def _generate_recommendations(self, data: Dict) -> List[str]:
        """Generate sustainability recommendations"""
        
        recommendations = []
        
        total_emissions = data.get("total_emissions", 0)
        electric_percentage = data.get("electric_vehicle_percentage", 0)
        carpool_percentage = data.get("carpool_percentage", 0)
        
        if electric_percentage < 30:
            recommendations.append(
                "Consider increasing electric vehicle usage to reduce emissions by up to 70%"
            )
        
        if carpool_percentage < 40:
            recommendations.append(
                "Promote carpooling to reduce per-employee emissions and costs"
            )
        
        if total_emissions > 10000:
            recommendations.append(
                "Implement a carbon offset program to achieve carbon neutrality"
            )
        
        recommendations.append(
            "Consider implementing a 'Green Commute' incentive program"
        )
        
        return recommendations
