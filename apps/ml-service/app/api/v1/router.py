from fastapi import APIRouter

from app.api.v1.endpoints import (
    route_optimization,
    demand_forecasting,
    carbon_tracking,
    anomaly_detection,
    safety_scoring,
)

api_router = APIRouter()

api_router.include_router(
    route_optimization.router,
    prefix="/route",
    tags=["Route Optimization"],
)
api_router.include_router(
    demand_forecasting.router,
    prefix="/demand",
    tags=["Demand Forecasting"],
)
api_router.include_router(
    carbon_tracking.router,
    prefix="/carbon",
    tags=["Carbon Tracking"],
)
api_router.include_router(
    anomaly_detection.router,
    prefix="/anomaly",
    tags=["Anomaly Detection"],
)
api_router.include_router(
    safety_scoring.router,
    prefix="/safety",
    tags=["Safety Scoring"],
)
