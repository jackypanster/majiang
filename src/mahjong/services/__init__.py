"""
Services module for Mahjong game logic.

This module provides the core game services and a standardized logging configuration.
"""
import logging
import sys

# Configure standardized logger for all services
def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger instance for services.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Configured logger instance

    Log format includes:
    - timestamp: ISO 8601 format
    - level: INFO, ERROR, etc.
    - logger name: module.function
    - message: includes game_id, player_id, action context where applicable

    Example output:
        2025-01-06 17:30:45,123 - INFO - mahjong.services.game_manager - Game abc123: Created with 4 players
    """
    logger = logging.getLogger(name)

    # Only configure if not already configured
    if not logger.handlers:
        # Set level to INFO by default (can be overridden by application)
        logger.setLevel(logging.INFO)

        # Create console handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)

        # Create standardized formatter
        formatter = logging.Formatter(
            fmt='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)

        logger.addHandler(handler)

        # Allow propagation for pytest caplog compatibility
        # In production, this can be set to False to avoid duplicate logs
        logger.propagate = True

    return logger
