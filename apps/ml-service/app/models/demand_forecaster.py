import numpy as np
from typing import List, Dict, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import pandas as pd

@dataclass
class DemandPrediction:
    timestamp: datetime
    predicted_demand: int
    confidence: float
    factors: Dict[str, float]

class DemandForecaster:
    """AI-powered demand forecasting for vehicle allocation"""
    
    def __init__(self):
        # Historical patterns (would be learned from data in production)
        self.hourly_patterns = {
            0: 0.1, 1: 0.05, 2: 0.05, 3: 0.05, 4: 0.1, 5: 0.2,
            6: 0.4, 7: 0.7, 8: 0.9, 9: 0.8, 10: 0.6, 11: 0.5,
            12: 0.7, 13: 0.6, 14: 0.5, 15: 0.6, 16: 0.8, 17: 0.95,
            18: 0.85, 19: 0.6, 20: 0.4, 21: 0.3, 22: 0.2, 23: 0.15,
        }
        
        self.day_patterns = {
            0: 0.7,  # Monday
            1: 0.85,  # Tuesday
            2: 0.9,  # Wednesday
            3: 0.85,  # Thursday
            4: 0.95,  # Friday
            5: 0.3,  # Saturday
            6: 0.2,  # Sunday
        }
        
        self.weather_impact = {
            "sunny": 1.0,
            "cloudy": 1.05,
            "rainy": 1.3,
            "stormy": 1.5,
            "snowy": 1.4,
        }
    
    def predict_demand(
        self,
        timestamp: datetime,
        location: Dict = None,
        weather: str = "sunny",
        events: List[Dict] = None,
    ) -> DemandPrediction:
        """Predict demand for a specific time and location"""
        
        # Base demand from time patterns
        hour_factor = self.hourly_patterns.get(timestamp.hour, 0.5)
        day_factor = self.day_patterns.get(timestamp.weekday(), 0.5)
        
        # Weather impact
        weather_factor = self.weather_impact.get(weather, 1.0)
        
        # Event impact
        event_factor = 1.0
        if events:
            event_factor = 1.0 + sum(e.get("impact", 0.1) for e in events)
        
        # Calculate base demand (0-100 scale)
        base_demand = 50
        adjusted_demand = base_demand * hour_factor * day_factor * weather_factor * event_factor
        
        # Add some randomness (simulating real-world variance)
        noise = np.random.normal(0, 5)
        predicted_demand = max(0, min(100, adjusted_demand + noise))
        
        # Calculate confidence based on factors
        confidence = 0.85 if weather == "sunny" else 0.7
        
        factors = {
            "hour_factor": hour_factor,
            "day_factor": day_factor,
            "weather_factor": weather_factor,
            "event_factor": event_factor,
        }
        
        return DemandPrediction(
            timestamp=timestamp,
            predicted_demand=int(predicted_demand),
            confidence=confidence,
            factors=factors,
        )
    
    def forecast_range(
        self,
        start_time: datetime,
        hours: int,
        location: Dict = None,
        weather: str = "sunny",
    ) -> List[DemandPrediction]:
        """Forecast demand for a range of hours"""
        
        predictions = []
        
        for i in range(hours):
            forecast_time = start_time + timedelta(hours=i)
            prediction = self.predict_demand(
                forecast_time, location, weather
            )
            predictions.append(prediction)
        
        return predictions
    
    def suggest_vehicle_allocation(
        self,
        predictions: List[DemandPrediction],
        total_vehicles: int,
    ) -> List[Dict]:
        """Suggest vehicle allocation based on demand predictions"""
        
        allocations = []
        
        for prediction in predictions:
            # Calculate vehicles needed based on demand
            demand_ratio = prediction.predicted_demand / 100
            vehicles_needed = max(1, int(total_vehicles * demand_ratio))
            
            allocations.append({
                "timestamp": prediction.timestamp.isoformat(),
                "demand_level": prediction.predicted_demand,
                "vehicles_allocated": vehicles_needed,
                "confidence": prediction.confidence,
            })
        
        return allocations
    
    def detect_anomalies(
        self,
        historical_data: List[Dict],
        threshold: float = 2.0,
    ) -> List[Dict]:
        """Detect anomalous demand patterns"""
        
        if not historical_data:
            return []
        
        demands = [d["demand"] for d in historical_data]
        mean_demand = np.mean(demands)
        std_demand = np.std(demands)
        
        anomalies = []
        
        for data_point in historical_data:
            z_score = (data_point["demand"] - mean_demand) / max(std_demand, 1)
            
            if abs(z_score) > threshold:
                anomalies.append({
                    "timestamp": data_point["timestamp"],
                    "demand": data_point["demand"],
                    "expected": mean_demand,
                    "deviation": z_score,
                    "type": "high" if z_score > 0 else "low",
                })
        
        return anomalies
