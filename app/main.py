"""FastAPI application entry point."""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict

from fastapi import FastAPI

from app.models import GameSession

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI application
app = FastAPI(
    title="血战到底麻将 Backend",
    description="FastAPI HTTP backend for Blood Battle Mahjong",
    version="1.0.0"
)

# Global game storage
GAMES: Dict[str, GameSession] = {}


@app.on_event("startup")
async def startup_event():
    """Start background cleanup task."""
    asyncio.create_task(cleanup_old_games())
    logger.info("FastAPI backend started")


async def cleanup_old_games():
    """Periodic cleanup of games older than 24 hours."""
    while True:
        try:
            await asyncio.sleep(3600)  # Every hour
            now = datetime.now()
            expired = [
                gid for gid, session in GAMES.items()
                if (now - session.created_at) > timedelta(hours=24)
            ]
            for gid in expired:
                GAMES.pop(gid, None)
                logger.info(f"Cleaned up expired game: {gid}")
        except asyncio.CancelledError:
            logger.info("Cleanup task cancelled")
            break


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "血战到底麻将 Backend API",
        "docs": "/docs",
        "active_games": len(GAMES)
    }


# Import and include API routes
from app.api import router
app.include_router(router)
