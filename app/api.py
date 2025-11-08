"""API route handlers."""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict

from fastapi import APIRouter, HTTPException, Query

from mahjong.constants.enums import GamePhase, ActionType
from mahjong.exceptions.game_errors import InvalidActionError, InvalidGameStateError
from mahjong.models.game_state import GameState
from mahjong.models.response import PlayerResponse
from mahjong.services.game_manager import GameManager
from mahjong.services.player_actions import PlayerActions
from mahjong.services.win_checker import WinChecker

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


def _human_can_respond(game_state: GameState, human_player_id: str) -> bool:
    """
    Check if human player can respond to the last discarded tile.

    Args:
        game_state: Current game state
        human_player_id: ID of human player

    Returns:
        True if human can peng/kong/hu, False otherwise
    """
    try:
        logger.info(f"[_human_can_respond] ===== START (player_id={human_player_id}) =====")

        # Get human player
        human_player = next((p for p in game_state.players if p.player_id == human_player_id), None)
        if not human_player:
            logger.warning(f"[_human_can_respond] Human player {human_player_id} not found")
            return False

        # Get last discarded tile
        if not game_state.public_discards:
            logger.info("[_human_can_respond] No public discards yet, returning False")
            return False

        last_tile = game_state.public_discards[-1]
        logger.info(f"[_human_can_respond] last_tile = {last_tile}")

        # 手牌详情
        logger.info(f"[_human_can_respond] human_player.is_hu = {human_player.is_hu}")
        logger.info(f"[_human_can_respond] human_player.hand (count={len(human_player.hand)}): {human_player.hand}")

        # Count matching tiles manually for debugging
        matching_count = sum(1 for t in human_player.hand if t.suit == last_tile.suit and t.rank == last_tile.rank)
        logger.info(f"[_human_can_respond] matching tiles (manual count): {matching_count}")

        count_result = human_player.hand.count(last_tile)
        logger.info(f"[_human_can_respond] hand.count(last_tile): {count_result}")

        # Check if human can hu
        try:
            can_hu = WinChecker.is_hu(human_player, last_tile)
            logger.info(f"[_human_can_respond] WinChecker.is_hu() = {can_hu}")
            if can_hu:
                logger.info("[_human_can_respond] → Can HU, returning True")
                return True
        except Exception as e:
            logger.error(f"[_human_can_respond] Error checking hu: {e}")

        # Already hu players cannot peng/kong (hand locked)
        if human_player.is_hu:
            logger.info("[_human_can_respond] → Already hu (is_hu=True), returning False")
            return False

        # Check if human can kong (exposed kong: 3 in hand)
        if count_result >= 3:
            logger.info(f"[_human_can_respond] → Can KONG ({count_result} tiles), returning True")
            return True

        # Check if human can peng (2 in hand)
        if count_result >= 2:
            logger.info(f"[_human_can_respond] → Can PENG ({count_result} tiles), returning True")
            return True

        logger.info("[_human_can_respond] → Cannot respond, returning False")
        return False

    except Exception as e:
        logger.error(f"[_human_can_respond] EXCEPTION: {type(e).__name__}: {e}", exc_info=True)
        return False


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

        # Extract AI player IDs in fixed order (for deterministic AI execution)
        ai_order = [pid for pid in player_ids if pid != "human"]

        # Store session with AI order
        session = GameSession(game_id, datetime.now(), game_state, ai_order)
        from app.main import GAMES
        GAMES[game_id] = session

        logger.info(f"API: Created game {game_id} with players {player_ids}, AI order: {ai_order}")

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

        elif action == "draw":
            # Debug interface: manually trigger draw (normally automatic after discard)
            logger.info(f"Game {game_id}: Manual draw requested by {player_id} (debug mode)")
            # Call private method for debugging purposes
            game_state = PlayerActions._next_player_draw(game_state)

        elif action == "discard":
            if len(tiles) != 1:
                raise HTTPException(status_code=400, detail="Discard requires exactly 1 tile")
            game_state = PlayerActions.discard_tile(game_state, player_id, tiles[0])
            # Record the discard player for potential responses
            session.last_discard_player_id = player_id

        elif action == "peng":
            # Note: tiles contains the tile to peng from opponent's discard
            if not tiles:
                raise HTTPException(status_code=400, detail="Peng requires specifying tile")
            response = PlayerResponse(
                player_id=player_id,
                action_type=ActionType.PONG,
                target_tile=tiles[0],
                priority=PlayerResponse.get_priority(ActionType.PONG)
            )
            # Use last_discard_player_id from session (set by AI or human discard)
            discard_player_id = session.last_discard_player_id or "unknown"
            game_state = PlayerActions.process_responses(game_state, [response], discard_player_id)

        elif action == "gang":
            if not tiles:
                raise HTTPException(status_code=400, detail="Gang requires specifying tile")
            response = PlayerResponse(
                player_id=player_id,
                action_type=ActionType.KONG_EXPOSED,
                target_tile=tiles[0],
                priority=PlayerResponse.get_priority(ActionType.KONG_EXPOSED)
            )
            # Use last_discard_player_id from session (set by AI or human discard)
            discard_player_id = session.last_discard_player_id or "unknown"
            game_state = PlayerActions.process_responses(game_state, [response], discard_player_id)

        elif action == "hu":
            if not tiles:
                raise HTTPException(status_code=400, detail="Hu requires specifying tile")
            response = PlayerResponse(
                player_id=player_id,
                action_type=ActionType.HU,
                target_tile=tiles[0],
                priority=PlayerResponse.get_priority(ActionType.HU)
            )
            # Use last_discard_player_id from session (set by AI or human discard)
            discard_player_id = session.last_discard_player_id or "unknown"
            game_state = PlayerActions.process_responses(game_state, [response], discard_player_id)

        elif action == "skip":
            # For skip action, we need the last discarded tile as target
            if not game_state.public_discards:
                raise HTTPException(status_code=400, detail="No tile to skip")

            # Get the last discarded tile
            last_tile = game_state.public_discards[-1]

            # Create human's PASS response
            human_response = PlayerResponse(
                player_id=player_id,
                action_type=ActionType.PASS,
                target_tile=last_tile,
                priority=PlayerResponse.get_priority(ActionType.PASS)
            )

            # IMPORTANT: Collect AI responses to the same discard
            # (Human chose to skip, but AI players might want to peng/kong/hu)
            discard_player_id = session.last_discard_player_id or "unknown"
            ai_responses = PlayerActions.collect_ai_responses(game_state, last_tile, discard_player_id)

            # Combine human PASS + AI responses and process together
            all_responses = [human_response] + ai_responses
            game_state = PlayerActions.process_responses(game_state, all_responses, discard_player_id)

        elif action == "angang":
            # Concealed kong (暗杠): 4 identical tiles in hand
            if not tiles:
                raise HTTPException(status_code=400, detail="Angang requires specifying tile")
            game_state = PlayerActions.declare_action(
                game_state,
                player_id,
                ActionType.KONG_CONCEALED,
                tiles[0]
            )

        elif action == "bugang":
            # Upgrade kong (补杠): upgrade existing pong to kong
            if not tiles:
                raise HTTPException(status_code=400, detail="Bugang requires specifying tile")
            game_state = PlayerActions.declare_action(
                game_state,
                player_id,
                ActionType.KONG_UPGRADE,
                tiles[0]
            )

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

        # Check if game ended, but don't cleanup immediately
        # Let frontend have a chance to fetch the final ENDED state
        # Cleanup will happen on next request or after timeout
        # (In production, you'd use a background task to cleanup after 30-60 seconds)

        # Return updated state
        state = session.game_state.to_dict_for_player(player_id)
        return {"game_id": game_id, **state}

    except InvalidActionError as e:
        logger.error(f"Game {game_id}: Invalid action by {player_id}: {e}")
        # 将技术性错误信息转换为用户友好的提示
        error_msg = str(e)
        if "cannot HU" in error_msg:
            # 胡牌失败：可能是手牌中有缺门牌，或者牌型不符合胡牌结构
            user_friendly_msg = "无法胡牌：手牌中包含缺门花色的牌，或牌型不符合胡牌结构（需要1对将 + N个面子）"
        elif "cannot PONG" in error_msg:
            user_friendly_msg = "无法碰牌：手牌中没有足够的相同牌"
        elif "cannot KONG" in error_msg:
            user_friendly_msg = "无法杠牌：手牌中没有足够的相同牌"
        elif "not player's turn" in error_msg:
            user_friendly_msg = "现在不是你的回合"
        elif "missing_suit" in error_msg:
            user_friendly_msg = "必须优先打出缺门花色的牌"
        else:
            user_friendly_msg = f"操作失败：{error_msg}"

        raise HTTPException(status_code=400, detail=user_friendly_msg)
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

        # Execute AI turn based on game phase
        if game_state.game_phase == GamePhase.BURYING:
            # In BURYING phase, process all AI players who haven't buried yet
            # (BURYING phase doesn't use current_player_index)
            ai_players_need_bury = [
                p for p in game_state.players
                if p.player_id != human_player_id and p.missing_suit is None
            ]

            if not ai_players_need_bury:
                # All AI players have buried, exit loop
                break

            # Process first AI player who needs to bury
            current_player = ai_players_need_bury[0]
            tiles_to_bury = ai.choose_bury_tiles(current_player)
            game_state = PlayerActions.bury_cards(game_state, current_player.player_id, tiles_to_bury)
            logger.info(f"Game {game_id}: AI {current_player.player_id} buried {len(tiles_to_bury)} tiles")

            # Update session state immediately
            session.game_state = game_state

        elif game_state.game_phase == GamePhase.PLAYING:
            # In PLAYING phase, use current_player_index
            current_player = game_state.players[game_state.current_player_index]

            # Stop if it's human's turn
            if current_player.player_id == human_player_id:
                break

            try:
                # AI discards a tile (without processing responses yet)
                tile_to_discard = ai.choose_discard_tile(current_player, game_state)
                game_state = PlayerActions.discard_tile(game_state, current_player.player_id, tile_to_discard, skip_responses=True)
                # Record the discard player for potential human responses
                session.last_discard_player_id = current_player.player_id
                logger.info(f"Game {game_id}: AI {current_player.player_id} discarded {tile_to_discard}")

                # IMPORTANT: Update session state immediately after AI discard
                session.game_state = game_state

                # Check if human player can respond to this discard
                # If yes, stop AI execution and wait for human's response via UI
                if _human_can_respond(game_state, human_player_id):
                    logger.info(f"Game {game_id}: Human player can respond to {tile_to_discard}, pausing AI execution")
                    break

                # Human cannot respond, process AI responses and continue
                logger.info(f"Game {game_id}: Human cannot respond to {tile_to_discard}, processing AI responses")
                responses = PlayerActions.collect_ai_responses(game_state, tile_to_discard, current_player.player_id)
                game_state = PlayerActions.process_responses(game_state, responses, current_player.player_id)

                # Update session state after processing responses
                session.game_state = game_state

            except InvalidActionError as e:
                # AI made invalid move (e.g., already-hu player discarded wrong tile)
                # Force AI to discard the correct tile (last_drawn_tile for hu players)
                logger.error(f"Game {game_id}: AI {current_player.player_id} invalid action: {e}")

                if current_player.is_hu and current_player.last_drawn_tile:
                    # Already-hu player must discard last_drawn_tile
                    logger.info(f"Game {game_id}: Forcing AI {current_player.player_id} to discard last_drawn_tile {current_player.last_drawn_tile}")
                    game_state = PlayerActions.discard_tile(game_state, current_player.player_id, current_player.last_drawn_tile, skip_responses=True)
                    session.last_discard_player_id = current_player.player_id
                    session.game_state = game_state

                    # Check human response and process as normal
                    tile_to_discard = current_player.last_drawn_tile
                    if _human_can_respond(game_state, human_player_id):
                        logger.info(f"Game {game_id}: Human player can respond to {tile_to_discard}, pausing AI execution")
                        break

                    responses = PlayerActions.collect_ai_responses(game_state, tile_to_discard, current_player.player_id)
                    game_state = PlayerActions.process_responses(game_state, responses, current_player.player_id)
                    session.game_state = game_state
                else:
                    # Other invalid actions - skip this AI player
                    logger.error(f"Game {game_id}: Skipping AI {current_player.player_id} due to invalid action")
                    break

        else:
            # Unexpected phase, stop to avoid infinite loop
            logger.warning(f"Game {game_id}: Unexpected game phase {game_state.game_phase}, stopping AI execution")
            break

        # Small delay to avoid tight loop
        await asyncio.sleep(0.01)

    if iterations >= max_iterations:
        logger.error(f"Game {game_id}: AI execution exceeded max iterations")
        raise RuntimeError("AI execution exceeded max iterations")
