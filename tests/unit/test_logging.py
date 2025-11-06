"""
Unit tests for logging functionality across all services.

Tests verify that:
1. Log format matches constitution requirements
2. INFO logs appear for key operations
3. ERROR logs appear with full context on exceptions
"""
import pytest
from mahjong.constants.enums import ActionType, GamePhase, Suit
from mahjong.exceptions.game_errors import InvalidActionError, InvalidGameStateError
from mahjong.models.tile import Tile
from mahjong.services.game_manager import GameManager
from mahjong.services.player_actions import PlayerActions


class TestLoggingFormat:
    """Test that log format matches constitution requirements."""

    def test_logger_configuration(self, caplog):
        """Verify logger is properly configured with expected format."""
        # Create a game to trigger logging
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])

        # Check that log record was created
        assert len(caplog.records) == 1
        record = caplog.records[0]

        # Verify log level
        assert record.levelname == "INFO"

        # Verify message contains required context
        assert game_state.game_id in record.message
        assert "Created with 4 players" in record.message

        # Verify logger name format
        assert record.name == "mahjong.services.game_manager"


class TestGameManagerInfoLogs:
    """Test INFO-level logging in GameManager."""

    def test_create_game_logs_creation(self, caplog):
        """Test that create_game logs game creation with game_id and player count."""
        caplog.set_level("INFO")
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])

        # Find the creation log
        creation_logs = [r for r in caplog.records if "Created with" in r.message]
        assert len(creation_logs) == 1

        log = creation_logs[0]
        assert log.levelname == "INFO"
        assert game_state.game_id in log.message
        assert "4 players" in log.message

    def test_start_game_logs_dealer_assignment(self, caplog):
        """Test that start_game logs dealer assignment."""
        caplog.set_level("INFO")
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])
        caplog.clear()

        game_state = GameManager.start_game(game_state)

        # Find dealer assignment log
        dealer_logs = [r for r in caplog.records if "Starting game with dealer" in r.message]
        assert len(dealer_logs) == 1

        log = dealer_logs[0]
        assert log.levelname == "INFO"
        assert game_state.game_id in log.message
        assert "p1" in log.message  # p1 is the dealer (index 0)

    def test_start_game_logs_phase_transition(self, caplog):
        """Test that start_game logs phase transition PREPARING → BURYING."""
        caplog.set_level("INFO")
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])
        caplog.clear()

        game_state = GameManager.start_game(game_state)

        # Find phase transition log
        phase_logs = [r for r in caplog.records if "Phase transition" in r.message and "BURYING" in r.message]
        assert len(phase_logs) == 1

        log = phase_logs[0]
        assert log.levelname == "INFO"
        assert game_state.game_id in log.message
        assert "PREPARING → BURYING" in log.message

    def test_end_game_logs_final_scores(self, caplog):
        """Test that end_game logs final scores for all players."""
        caplog.set_level("INFO")
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])
        game_state = GameManager.start_game(game_state)
        caplog.clear()

        game_state = GameManager.end_game(game_state)

        # Find final scores log
        score_logs = [r for r in caplog.records if "Ending game with scores" in r.message]
        assert len(score_logs) == 1

        log = score_logs[0]
        assert log.levelname == "INFO"
        assert game_state.game_id in log.message
        # Should contain all player scores
        for player in game_state.players:
            assert player.player_id in log.message

    def test_end_game_logs_correct_phase_transition(self, caplog):
        """Test that end_game logs correct phase transition (not ENDED → ENDED)."""
        caplog.set_level("INFO")
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])
        game_state = GameManager.start_game(game_state)
        caplog.clear()

        # Game is in BURYING phase after start_game
        assert game_state.game_phase.name == "BURYING"

        game_state = GameManager.end_game(game_state)

        # Find phase transition log
        phase_logs = [r for r in caplog.records if "Phase transition" in r.message and "→ ENDED" in r.message]
        assert len(phase_logs) == 1

        log = phase_logs[0]
        assert log.levelname == "INFO"
        # Should show BURYING → ENDED, not ENDED → ENDED (issue #48)
        assert "BURYING → ENDED" in log.message
        assert "ENDED → ENDED" not in log.message


class TestPlayerActionsInfoLogs:
    """Test INFO-level logging in PlayerActions."""

    def test_bury_cards_logs_action(self, caplog):
        """Test that bury_cards logs player_id, tiles, and missing_suit."""
        caplog.set_level("INFO")
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])
        game_state = GameManager.start_game(game_state)
        caplog.clear()

        # Get some tiles from player's hand to bury
        player = game_state.players[0]
        tiles_to_bury = [t for t in player.hand if t.suit == Suit.TONG][:3]

        if len(tiles_to_bury) == 3:
            game_state = PlayerActions.bury_cards(game_state, "p1", tiles_to_bury)

            # Find burial log
            burial_logs = [r for r in caplog.records if "buried cards" in r.message]
            assert len(burial_logs) >= 1

            log = burial_logs[0]
            assert log.levelname == "INFO"
            assert game_state.game_id in log.message
            assert "p1" in log.message
            assert "TONG" in log.message

    def test_bury_cards_logs_phase_transition(self, caplog):
        """Test that bury_cards logs phase transition when all players finish."""
        caplog.set_level("INFO")
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])
        game_state = GameManager.start_game(game_state)

        # Bury cards for all players
        for i, player in enumerate(game_state.players):
            for suit in [Suit.TONG, Suit.TIAO, Suit.WAN]:
                tiles_to_bury = [t for t in player.hand if t.suit == suit][:3]
                if len(tiles_to_bury) == 3:
                    caplog.clear()
                    game_state = PlayerActions.bury_cards(
                        game_state, player.player_id, tiles_to_bury
                    )

                    # Check if phase transition logged (only on last player)
                    if i == 3:
                        phase_logs = [
                            r for r in caplog.records if "Phase transition" in r.message and "PLAYING" in r.message
                        ]
                        assert len(phase_logs) == 1
                    break

    def test_discard_tile_logs_action(self, caplog):
        """Test that discard_tile logs player_id and tile."""
        caplog.set_level("INFO")
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])
        game_state = GameManager.start_game(game_state)

        # Complete burial phase
        for player in game_state.players:
            for suit in [Suit.TONG, Suit.TIAO, Suit.WAN]:
                tiles_to_bury = [t for t in player.hand if t.suit == suit][:3]
                if len(tiles_to_bury) == 3:
                    game_state = PlayerActions.bury_cards(
                        game_state, player.player_id, tiles_to_bury
                    )
                    break

        caplog.clear()

        # Discard a tile - must respect missing suit priority
        current_player = game_state.players[game_state.current_player_index]

        # Find a tile that respects missing suit priority (prefer missing suit tiles if any)
        missing_suit_tiles = [t for t in current_player.hand if t.suit == current_player.missing_suit]
        if missing_suit_tiles:
            tile_to_discard = missing_suit_tiles[0]
        else:
            tile_to_discard = current_player.hand[0]

        game_state = PlayerActions.discard_tile(
            game_state, current_player.player_id, tile_to_discard
        )

        # Find discard log
        discard_logs = [r for r in caplog.records if "discarded" in r.message]
        assert len(discard_logs) == 1

        log = discard_logs[0]
        assert log.levelname == "INFO"
        assert game_state.game_id in log.message
        assert current_player.player_id in log.message
        assert str(tile_to_discard) in log.message


class TestErrorLogs:
    """Test ERROR-level logging on exceptions."""

    def test_create_game_logs_error_on_invalid_player_count(self, caplog):
        """Test that create_game logs ERROR with context when player count is invalid."""
        caplog.set_level("ERROR")

        with pytest.raises(ValueError, match="exactly 4 players"):
            GameManager.create_game(["p1", "p2"])

        # Find error log
        error_logs = [r for r in caplog.records if r.levelname == "ERROR"]
        assert len(error_logs) == 1

        log = error_logs[0]
        assert "Failed to create game" in log.message
        assert "create_game" in log.message
        assert "game_manager.py" in log.message
        assert "Invalid player count" in log.message
        assert "2" in log.message
        assert "expected 4" in log.message

    def test_start_game_logs_error_on_wrong_phase(self, caplog):
        """Test that start_game logs ERROR when game is not in PREPARING phase."""
        caplog.set_level("ERROR")
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])
        game_state = GameManager.start_game(game_state)
        caplog.clear()

        # Try to start again (wrong phase)
        with pytest.raises(InvalidGameStateError, match="PREPARING"):
            GameManager.start_game(game_state)

        # Find error log
        error_logs = [r for r in caplog.records if r.levelname == "ERROR"]
        assert len(error_logs) == 1

        log = error_logs[0]
        assert "Failed in start_game" in log.message
        assert "game_manager.py" in log.message
        assert game_state.game_id in log.message
        assert "BURYING" in log.message or "PLAYING" in log.message
        assert "expected PREPARING" in log.message

    def test_bury_cards_logs_error_on_wrong_phase(self, caplog):
        """Test that bury_cards logs ERROR when game is not in BURYING phase."""
        caplog.set_level("ERROR")
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])
        caplog.clear()

        # Try to bury before game start (wrong phase)
        player = game_state.players[0]
        with pytest.raises(InvalidGameStateError, match="BURYING"):
            PlayerActions.bury_cards(game_state, player.player_id, [])

        # Find error log
        error_logs = [r for r in caplog.records if r.levelname == "ERROR"]
        assert len(error_logs) == 1

        log = error_logs[0]
        assert "Failed in bury_cards" in log.message
        assert "player_actions.py" in log.message
        assert game_state.game_id in log.message
        assert player.player_id in log.message
        assert "expected BURYING" in log.message

    def test_discard_tile_logs_error_on_tile_not_in_hand(self, caplog):
        """Test that discard_tile logs ERROR when tile is not in player's hand."""
        caplog.set_level("ERROR")
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])
        game_state = GameManager.start_game(game_state)

        # Complete burial phase
        for player in game_state.players:
            for suit in [Suit.TONG, Suit.TIAO, Suit.WAN]:
                tiles_to_bury = [t for t in player.hand if t.suit == suit][:3]
                if len(tiles_to_bury) == 3:
                    game_state = PlayerActions.bury_cards(
                        game_state, player.player_id, tiles_to_bury
                    )
                    break

        caplog.clear()

        # Try to discard tile not in hand - create a tile that's guaranteed not to be in the player's hand
        current_player = game_state.players[game_state.current_player_index]
        # Find a tile that the player doesn't have
        fake_tile = None
        for suit in [Suit.TONG, Suit.TIAO, Suit.WAN]:
            for rank in range(1, 10):
                test_tile = Tile(suit, rank)
                if test_tile not in current_player.hand:
                    fake_tile = test_tile
                    break
            if fake_tile:
                break

        if fake_tile:
            with pytest.raises(InvalidActionError, match="not in player's hand"):
                PlayerActions.discard_tile(game_state, current_player.player_id, fake_tile)

        # Find error log
        error_logs = [r for r in caplog.records if r.levelname == "ERROR"]
        assert len(error_logs) == 1

        log = error_logs[0]
        assert "Failed in discard_tile" in log.message
        assert "player_actions.py" in log.message
        assert game_state.game_id in log.message
        assert current_player.player_id in log.message
        assert "not in hand" in log.message


class TestLogContextCompleteness:
    """Test that all logs contain complete context as per constitution."""

    def test_all_info_logs_have_game_id(self, caplog):
        """Verify all INFO logs include game_id."""
        caplog.set_level("INFO")
        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])
        game_state = GameManager.start_game(game_state)

        # Check all INFO logs have game_id
        info_logs = [r for r in caplog.records if r.levelname == "INFO"]
        assert len(info_logs) > 0

        for log in info_logs:
            assert game_state.game_id in log.message, f"Log missing game_id: {log.message}"

    def test_all_error_logs_have_full_context(self, caplog):
        """Verify all ERROR logs include function name, file, and error context."""
        caplog.set_level("ERROR")

        # Trigger various errors
        try:
            GameManager.create_game(["p1"])
        except ValueError:
            pass

        game_state = GameManager.create_game(["p1", "p2", "p3", "p4"])
        try:
            GameManager.start_game(GameManager.start_game(game_state))
        except InvalidGameStateError:
            pass

        # Check all ERROR logs have required context
        error_logs = [r for r in caplog.records if r.levelname == "ERROR"]
        assert len(error_logs) >= 2

        for log in error_logs:
            # Must have function name
            assert any(
                func in log.message
                for func in ["create_game", "start_game", "bury_cards", "discard_tile", "declare_action"]
            ), f"Log missing function name: {log.message}"

            # Must have file reference
            assert ".py" in log.message, f"Log missing file reference: {log.message}"

            # Must have "Failed in" prefix
            assert "Failed" in log.message, f"Log missing 'Failed' prefix: {log.message}"
