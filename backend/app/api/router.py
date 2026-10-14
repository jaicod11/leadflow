from fastapi import APIRouter

from app.api.routes import auth, demo, discussions, health, leads

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(leads.router)
api_router.include_router(discussions.router)
api_router.include_router(demo.router)
