"""API route handlers."""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict

from fastapi import APIRouter, HTTPException, Query

from mahjong.constants.enums import GamePhase, ActionType
from mahjong.exceptions.game_errors import InvalidActionError, InvalidGameStateError
from mahjong.models.response import PlayerResponse
from mahjong.services.game_manager import GameManager
from mahjong.services.player_actions import PlayerActions

from app.converters import tiles_from_request
from app.models import GameSession
from app.schemas import (
    CreateGameRequest,
    CreateGameResponse,
    PlayerActionRequest,
    GameStateResponse
)
import app.ai as ai

logger = logging.getLogger(__name__)

# Router with /games prefix
router = APIRouter(prefix="/games", tags=["games"])


@router.post("", response_model=CreateGameResponse)
async def create_game(request: CreateGameRequest = CreateGameRequest()):
    """Create new game with default or custom players.

    Args:
        request: Optional player IDs (defaults to ["human", "ai_1", "ai_2", "ai_3"])

    Returns:
        CreateGameResponse with game_id and initial state

    Raises:
        HTTPException 500: Game creation failed
    """
    try:
        # Use default players if not provided
        player_ids = request.player_ids or ["human", "ai_1", "ai_2", "ai_3"]

        # Create and start game (game_state will have its own game_id)
        game_state = GameManager.create_game(player_ids)
        game_state = GameManager.start_game(game_state)

        # Use GameState's game_id
        game_id = game_state.game_id

        # Store session
        session = GameSession(game_id, datetime.now(), game_state)
        from app.main import GAMES
        GAMES[game_id] = session

        logger.info(f"API: Created game {game_id} with players {player_ids}")

        # Return initial state (filtered for human player)
        state = game_state.to_dict_for_player("human")
        return CreateGameResponse(game_id=game_id, state=state)

    except Exception as e:
        logger.exception(f"Failed to create game: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{game_id}", response_model=Dict)
async def get_game_state(game_id: str, player_id: str = Query(...)):
    """Query game state filtered for specific player.

    Args:
        game_id: Game UUID
        player_id: ID of player requesting state

    Returns:
        Filtered game state

    Raises:
        HTTPException 404: Game not found
    """
    from app.main import GAMES
    session = GAMES.get(game_id)
    if not session:
        raise HTTPException(status_code=404, detail="Game not found")

    state = session.game_state.to_dict_for_player(player_id)
    return {"game_id": game_id, **state}


@router.post("/{game_id}/action", response_model=Dict)
async def submit_action(game_id: str, request: PlayerActionRequest):
    """Submit player action and execute AI turns automatically.

    Workflow:
    1. Validate and process human player action
    2. Execute all AI turns in sequence (with 5-second timeout)
    3. Return updated game state when it's human's turn again or game ends

    Args:
        game_id: Game UUID
        request: Player action (bury/discard/peng/gang/hu/skip)

    Returns:
        Updated game state

    Raises:
        HTTPException 404: Game not found
        HTTPException 400: Invalid action
        HTTPException 500: AI execution timeout or error
    """
    from app.main import GAMES

    # Validate game exists
    session = GAMES.get(game_id)
    if not session:
        raise HTTPException(status_code=404, detail="Game not found")

    game_state = session.game_state

    try:
        # Process human action
        action = request.action
        player_id = request.player_id
        tiles = tiles_from_request(request.tiles) if request.tiles else []

        logger.info(f"Game {game_id}: Player {player_id} action {action}")

        # Dispatch action
        if action == "bury":
            if len(tiles) != 3:
                raise HTTPException(status_code=400, detail="Bury requires exactly 3 tiles")
            game_state = PlayerActions.bury_cards(game_state, player_id, tiles)

        elif action == "discard":
            if len(tiles) != 1:
                raise HTTPException(status_code=400, detail="Discard requires exactly 1 tile")
            game_state = PlayerActions.discard_tile(game_state, player_id, tiles[0])

        elif action == "peng":
            # Note: tiles contains the tile to peng from opponent's discard
            if not tiles:
                raise HTTPException(status_code=400, detail="Peng requires specifying tile")
            response = PlayerResponse(action_type=ActionType.PENG, tiles=tiles)
            game_state = PlayerActions.process_response(game_state, player_id, response)

        elif action == "gang":
            if not tiles:
                raise HTTPException(status_code=400, detail="Gang requires specifying tile")
            response = PlayerResponse(action_type=ActionType.GANG, tiles=tiles)
            game_state = PlayerActions.process_response(game_state, player_id, response)

        elif action == "hu":
            if not tiles:
                raise HTTPException(status_code=400, detail="Hu requires specifying tile")
            response = PlayerResponse(action_type=ActionType.HU, tiles=tiles)
            game_state = PlayerActions.process_response(game_state, player_id, response)

        elif action == "skip":
            response = PlayerResponse(action_type=ActionType.SKIP, tiles=[])
            game_state = PlayerActions.process_response(game_state, player_id, response)

        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

        # Update session
        session.game_state = game_state

        # Execute AI turns with timeout
        try:
            await asyncio.wait_for(
                execute_ai_turns(game_id, player_id),
                timeout=5.0
            )
        except asyncio.TimeoutError:
            logger.error(f"Game {game_id}: AI execution timeout")
            raise HTTPException(status_code=500, detail="AI execution timeout after 5 seconds")

        # Check if game ended, cleanup immediately
        if session.game_state.game_phase == GamePhase.ENDED:
            logger.info(f"Game {game_id} ended, cleaning up")
            GAMES.pop(game_id, None)

        # Return updated state
        state = session.game_state.to_dict_for_player(player_id)
        return {"game_id": game_id, **state}

    except InvalidActionError as e:
        logger.error(f"Game {game_id}: Invalid action by {player_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except InvalidGameStateError as e:
        logger.error(f"Game {game_id}: Invalid game state: {e}")
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.exception(f"Game {game_id}: Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


async def execute_ai_turns(game_id: str, human_player_id: str):
    """Execute AI turns until it's human's turn again or game ends.

    Args:
        game_id: Game UUID
        human_player_id: ID of human player (to stop when it's their turn)

    Raises:
        InvalidActionError: AI made invalid decision (treat as bug)
        asyncio.TimeoutError: Exceeded 5-second timeout
    """
    from app.main import GAMES
    session = GAMES[game_id]
    game_state = session.game_state

    max_iterations = 100  # Safety limit
    iterations = 0

    while iterations < max_iterations:
        iterations += 1

        # Stop if game ended
        if game_state.game_phase == GamePhase.ENDED:
            break

        # Stop if it's human's turn
        current_player = game_state.players[game_state.current_player_index]
        if current_player.player_id == human_player_id:
            break

        # Execute AI turn based on game phase
        if game_state.game_phase == GamePhase.BURYING:
            # AI buries tiles
            tiles_to_bury = ai.choose_bury_tiles(current_player)
            game_state = PlayerActions.bury_cards(game_state, current_player.player_id, tiles_to_bury)
            logger.info(f"Game {game_id}: AI {current_player.player_id} buried {len(tiles_to_bury)} tiles")

        elif game_state.game_phase == GamePhase.PLAYING:
            # AI discards a tile
            tile_to_discard = ai.choose_discard_tile(current_player, game_state)
            game_state = PlayerActions.discard_tile(game_state, current_player.player_id, tile_to_discard)
            logger.info(f"Game {game_id}: AI {current_player.player_id} discarded {tile_to_discard}")

            # Collect responses from all other players (including human)
            responses = {}
            for player in game_state.players:
                if player.player_id == current_player.player_id:
                    continue  # Skip discarder
                if player.player_id == human_player_id:
                    # Human will respond in next request
                    continue
                # AI players respond
                response = ai.choose_response(player, tile_to_discard, game_state)
                responses[player.player_id] = response

            # TODO: Handle responses (hu > gang > peng > skip priority)
            # For now, simplified: process first non-skip response
            for pid, resp in responses.items():
                if resp.action_type != ActionType.SKIP:
                    game_state = PlayerActions.process_response(game_state, pid, resp)
                    logger.info(f"Game {game_id}: AI {pid} responded with {resp.action_type}")
                    break

        # Update session
        session.game_state = game_state

        # Small delay to avoid tight loop
        await asyncio.sleep(0.01)

    if iterations >= max_iterations:
        logger.error(f"Game {game_id}: AI execution exceeded max iterations")
        raise RuntimeError("AI execution exceeded max iterations")
