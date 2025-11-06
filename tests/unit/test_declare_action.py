from mahjong.constants.enums import ActionType, GamePhase, Suit
from mahjong.exceptions.game_errors import InvalidActionError
from mahjong.models.game_state import GameState
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.services.player_actions import PlayerActions
import pytest


def test_declare_hu_success():
    """Test successful HU declaration"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),
            Tile(Suit.WAN, 1), Tile(Suit.WAN, 2), Tile(Suit.WAN, 3),
            Tile(Suit.WAN, 5),  # Missing one WAN 5 to complete
        ],
        missing_suit=Suit.TIAO,
    )
    game_state = GameState(
        game_id="game1",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[],
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.WAN, 5)  # The winning tile
    new_state = PlayerActions.declare_action(game_state, "p1", ActionType.HU, target_tile)

    # Check that player is marked as won
    assert new_state.players[0].is_hu
    assert not new_state.players[1].is_hu


def test_declare_hu_invalid():
    """Test HU declaration with invalid hand"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5),  # Not enough tiles
        ],
        missing_suit=Suit.TIAO,
    )
    game_state = GameState(
        game_id="game1",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[],
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.WAN, 5)

    with pytest.raises(InvalidActionError, match="cannot HU"):
        PlayerActions.declare_action(game_state, "p1", ActionType.HU, target_tile)


def test_declare_pong_success():
    """Test successful PONG declaration"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),  # Two matching tiles
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),
        ],
        missing_suit=Suit.TIAO,
    )
    game_state = GameState(
        game_id="game1",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)] * 10,
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.TONG, 1)  # The tile to PONG
    new_state = PlayerActions.declare_action(game_state, "p1", ActionType.PONG, target_tile)

    # Check hand has 2 tiles removed
    assert len(new_state.players[0].hand) == 4
    assert new_state.players[0].hand.count(target_tile) == 0

    # Check meld was created
    assert len(new_state.players[0].melds) == 1
    assert new_state.players[0].melds[0].meld_type == ActionType.PONG
    assert len(new_state.players[0].melds[0].tiles) == 3

    # Check current player switched
    assert new_state.current_player_index == 0


def test_declare_pong_insufficient_tiles():
    """Test PONG with insufficient tiles"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1),  # Only one matching tile
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
        ],
        missing_suit=Suit.TIAO,
    )
    game_state = GameState(
        game_id="game1",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[],
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.TONG, 1)

    with pytest.raises(InvalidActionError, match="cannot PONG"):
        PlayerActions.declare_action(game_state, "p1", ActionType.PONG, target_tile)


def test_declare_kong_success():
    """Test successful exposed KONG declaration (明杠)"""
    player_p1 = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),  # Three matching
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),
        ],
        missing_suit=Suit.TIAO,
    )
    player_p2 = Player("p2")
    game_state = GameState(
        game_id="game1",
        players=[player_p1, player_p2, Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)],  # One tile to draw
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.TONG, 1)
    # 明杠：p2打出牌，p1杠
    new_state = PlayerActions.declare_action(
        game_state, "p1", ActionType.KONG_EXPOSED, target_tile, discard_player_id="p2"
    )

    # Check hand: removed 3 tiles, added 1 from wall
    assert len(new_state.players[0].hand) == 5  # 7 - 3 + 1
    assert new_state.players[0].hand.count(target_tile) == 0

    # Check meld was created with 4 tiles
    assert len(new_state.players[0].melds) == 1
    assert new_state.players[0].melds[0].meld_type == ActionType.KONG_EXPOSED
    assert len(new_state.players[0].melds[0].tiles) == 4

    # Check tile was drawn from wall
    assert len(new_state.wall) == 0
    assert new_state.players[0].hand[-1] == Tile(Suit.TONG, 9)

    # Check current player switched
    assert new_state.current_player_index == 0

    # Check kong scores settled (明杠: 点杠者付2分)
    assert new_state.players[0].score == 102  # +2
    assert new_state.players[1].score == 98   # -2 (点杠者)
    assert new_state.players[2].score == 100  # 无变化
    assert new_state.players[3].score == 100  # 无变化


def test_declare_kong_insufficient_tiles():
    """Test KONG with insufficient tiles"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),  # Only two matching
            Tile(Suit.TONG, 2),
        ],
        missing_suit=Suit.TIAO,
    )
    game_state = GameState(
        game_id="game1",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)],
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.TONG, 1)

    with pytest.raises(InvalidActionError, match="cannot KONG"):
        PlayerActions.declare_action(game_state, "p1", ActionType.KONG, target_tile)


def test_declare_kong_empty_wall():
    """Test KONG when wall is empty"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),
            Tile(Suit.TONG, 2),
        ],
        missing_suit=Suit.TIAO,
    )
    game_state = GameState(
        game_id="game1",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[],  # Empty wall
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.TONG, 1)

    with pytest.raises(InvalidActionError, match="no tiles left in wall"):
        PlayerActions.declare_action(game_state, "p1", ActionType.KONG, target_tile)


def test_declare_pass():
    """Test PASS action (no state change)"""
    player = Player(player_id="p1", hand=[Tile(Suit.TONG, 1)], missing_suit=Suit.TIAO)
    game_state = GameState(
        game_id="game1",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[],
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.TONG, 1)
    new_state = PlayerActions.declare_action(game_state, "p1", ActionType.PASS, target_tile)

    # State should be unchanged
    assert new_state == game_state


def test_kong_concealed_success():
    """Test concealed kong (暗杠) with 4 tiles in hand"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),  # 4 same tiles
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
        ],
        missing_suit=Suit.TIAO,
    )
    game_state = GameState(
        game_id="game1",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)],
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.TONG, 1)
    new_state = PlayerActions.declare_action(
        game_state, "p1", ActionType.KONG_CONCEALED, target_tile
    )

    # Check 4 tiles removed from hand, 1 drawn
    assert len(new_state.players[0].hand) == 3  # 6 - 4 + 1

    # Check meld created with KONG_CONCEALED type
    assert len(new_state.players[0].melds) == 1
    assert new_state.players[0].melds[0].meld_type == ActionType.KONG_CONCEALED
    assert len(new_state.players[0].melds[0].tiles) == 4

    # Check tile drawn from wall
    assert len(new_state.wall) == 0
    assert new_state.players[0].hand[-1] == Tile(Suit.TONG, 9)


def test_kong_concealed_insufficient_tiles():
    """Test concealed kong fails with less than 4 tiles"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),  # Only 3
            Tile(Suit.TONG, 2),
        ],
        missing_suit=Suit.TIAO,
    )
    game_state = GameState(
        game_id="game1",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)],
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.TONG, 1)

    with pytest.raises(InvalidActionError, match="cannot KONG_CONCEALED"):
        PlayerActions.declare_action(
            game_state, "p1", ActionType.KONG_CONCEALED, target_tile
        )


def test_kong_upgrade_success():
    """Test upgrade kong (补杠) from existing pong"""
    from mahjong.models.meld import Meld

    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1),  # One more tile to upgrade
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
        ],
        melds=[
            Meld(ActionType.PONG, (Tile(Suit.TONG, 1),) * 3)  # Existing PONG
        ],
        missing_suit=Suit.TIAO,
    )
    game_state = GameState(
        game_id="game1",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)],
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.TONG, 1)
    new_state = PlayerActions.declare_action(
        game_state, "p1", ActionType.KONG_UPGRADE, target_tile
    )

    # Check 1 tile removed from hand, 1 drawn
    assert len(new_state.players[0].hand) == 3  # 3 - 1 + 1

    # Check PONG upgraded to KONG_UPGRADE
    assert len(new_state.players[0].melds) == 1
    assert new_state.players[0].melds[0].meld_type == ActionType.KONG_UPGRADE
    assert len(new_state.players[0].melds[0].tiles) == 4

    # Check tile drawn from wall
    assert len(new_state.wall) == 0


def test_kong_upgrade_no_pong():
    """Test upgrade kong fails without existing pong"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),
            Tile(Suit.TONG, 2),
        ],
        melds=[],  # No existing pong
        missing_suit=Suit.TIAO,
    )
    game_state = GameState(
        game_id="game1",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)],
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.TONG, 1)

    with pytest.raises(InvalidActionError, match="no existing PONG found"):
        PlayerActions.declare_action(
            game_state, "p1", ActionType.KONG_UPGRADE, target_tile
        )


def test_kong_upgrade_no_tile_in_hand():
    """Test upgrade kong fails without tile in hand"""
    from mahjong.models.meld import Meld

    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),  # No TONG 1
        ],
        melds=[
            Meld(ActionType.PONG, (Tile(Suit.TONG, 1),) * 3)  # Existing PONG
        ],
        missing_suit=Suit.TIAO,
    )
    game_state = GameState(
        game_id="game1",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)],
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    target_tile = Tile(Suit.TONG, 1)

    with pytest.raises(InvalidActionError, match="no tile in hand to upgrade"):
        PlayerActions.declare_action(
            game_state, "p1", ActionType.KONG_UPGRADE, target_tile
        )
