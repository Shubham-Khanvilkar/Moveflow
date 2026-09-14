import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ML Service starting up...")
    yield
    logger.info("ML Service shutting down...")


app = FastAPI(
    title="MoveFlow ML Service",
    description="AI-powered route optimization, demand forecasting, carbon tracking, and safety scoring",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "MoveFlow ML Service", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


from app.api.v1.router import api_router

app.include_router(api_router, prefix="/api/v1")
