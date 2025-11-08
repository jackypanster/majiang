import pytest

from mahjong.constants.enums import Suit
from mahjong.services.game_manager import GameManager
from mahjong.services.player_actions import PlayerActions


@pytest.fixture
def playing_game_state():
    player_ids = ["p1", "p2", "p3", "p4"]
    game_state = GameManager.create_game(player_ids)
    game_state = GameManager.start_game(game_state)
    for player in game_state.players:
        suit_counts = {s: sum(1 for t in player.hand if t.suit == s) for s in Suit}
        suit_to_bury = next(s for s, c in suit_counts.items() if c >= 3)
        tiles_to_bury = [t for t in player.hand if t.suit == suit_to_bury][:3]
        game_state = PlayerActions.bury_cards(
            game_state, player.player_id, tiles_to_bury
        )
    return game_state


def test_discard_tile(playing_game_state):
    game_state = playing_game_state
    current_player_id = game_state.players[game_state.current_player_index].player_id
    current_player = game_state.players[game_state.current_player_index]
    initial_hand_count = len(current_player.hand)

    # Find a tile that respects missing suit priority
    missing_suit_tiles = [t for t in current_player.hand if t.suit == current_player.missing_suit]
    if missing_suit_tiles:
        tile_to_discard = missing_suit_tiles[0]
    else:
        tile_to_discard = current_player.hand[0]

    game_state_after = PlayerActions.discard_tile(
        game_state, current_player.player_id, tile_to_discard
    )

    # Find the player who just discarded in the updated state
    discard_player_after = next((p for p in game_state_after.players if p.player_id == current_player_id), None)

    # Verify basic discard logic (independent of who responds)
    assert tile_to_discard in game_state_after.public_discards, "Discarded tile should be in public discards"

    # Check if someone responded (pong/kong/hu)
    someone_responded = game_state_after.current_player_index != (game_state.current_player_index + 1) % 4

    if not someone_responded:
        # No one responded: discard player's hand should have decreased by 1
        assert len(discard_player_after.hand) == initial_hand_count - 1, \
            f"Hand count should decrease by 1 when no one responds (was {initial_hand_count}, now {len(discard_player_after.hand)})"
        assert tile_to_discard not in discard_player_after.hand, "Discarded tile should not be in hand"
        # Next player should have drawn a card
        assert game_state_after.current_player_index == (game_state.current_player_index + 1) % 4
    else:
        # Someone responded: just check that the tile is not in the original player's hand
        assert tile_to_discard not in discard_player_after.hand, \
            "Discarded tile should not be in original player's hand even if someone responded"
