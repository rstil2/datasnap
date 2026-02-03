from fastapi import APIRouter

from app.api.v1.endpoints import csv, stats, statistical_tests, visualizations, narratives

api_router = APIRouter()
api_router.include_router(csv.router, prefix="/csv", tags=["csv"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(statistical_tests.router, prefix="/statistical_tests", tags=["statistical_tests"])
api_router.include_router(visualizations.router, prefix="/visualizations", tags=["visualizations"])
api_router.include_router(narratives.router, prefix="/narratives", tags=["narratives"])
