"""测试门清（All Concealed）判断逻辑（Issue #42）"""
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.models.meld import Meld
from mahjong.constants.enums import Suit, ActionType
from mahjong.services.scorer import Scorer


def test_menqing_no_melds():
    """测试：没有明牌组合时保持门清"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),
            Tile(Suit.WAN, 1), Tile(Suit.WAN, 2), Tile(Suit.WAN, 3),
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 门清(1) = 2番
    score = Scorer.calculate_score(player)
    assert score == 2


def test_menqing_with_concealed_kong():
    """测试：暗杠不破坏门清"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),
            Tile(Suit.WAN, 9), Tile(Suit.WAN, 9),
        ],
        melds=[
            Meld(ActionType.KONG_CONCEALED, (Tile(Suit.TONG, 1),) * 4, is_concealed=True)
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 门清(1) + 对对胡(1) + 带根(1) = 4番
    score = Scorer.calculate_score(player)
    assert score == 4


def test_menqing_broken_by_pong():
    """测试：碰破坏门清"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),
            Tile(Suit.WAN, 9), Tile(Suit.WAN, 9),
        ],
        melds=[
            Meld(ActionType.PONG, (Tile(Suit.TONG, 1),) * 3, is_concealed=False)
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 对对胡(1) = 2番（无门清）
    score = Scorer.calculate_score(player)
    assert score == 2


def test_menqing_broken_by_exposed_kong():
    """测试：明杠破坏门清"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),
            Tile(Suit.WAN, 9), Tile(Suit.WAN, 9),
        ],
        melds=[
            Meld(ActionType.KONG_EXPOSED, (Tile(Suit.TONG, 1),) * 4, is_concealed=False)
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 对对胡(1) + 带根(1) = 3番（无门清）
    score = Scorer.calculate_score(player)
    assert score == 3


def test_menqing_broken_by_kong_upgrade():
    """测试：补杠破坏门清"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),
            Tile(Suit.WAN, 9), Tile(Suit.WAN, 9),
        ],
        melds=[
            Meld(ActionType.KONG_UPGRADE, (Tile(Suit.TONG, 1),) * 4, is_concealed=False)
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 对对胡(1) + 带根(1) = 3番（无门清）
    score = Scorer.calculate_score(player)
    assert score == 3


def test_menqing_multiple_concealed_kongs():
    """测试：多个暗杠不破坏门清"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 3), Tile(Suit.TONG, 3), Tile(Suit.TONG, 3),
            Tile(Suit.WAN, 9), Tile(Suit.WAN, 9),
        ],
        melds=[
            Meld(ActionType.KONG_CONCEALED, (Tile(Suit.TONG, 1),) * 4, is_concealed=True),
            Meld(ActionType.KONG_CONCEALED, (Tile(Suit.TONG, 2),) * 4, is_concealed=True),
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 门清(1) + 对对胡(1) + 带根(2) = 5番
    score = Scorer.calculate_score(player)
    assert score == 5


def test_menqing_mixed_concealed_and_exposed():
    """测试：暗杠+明杠混合时破坏门清（但保留暗杠的带根分）"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 3), Tile(Suit.TONG, 3), Tile(Suit.TONG, 3),
            Tile(Suit.WAN, 9), Tile(Suit.WAN, 9),
        ],
        melds=[
            Meld(ActionType.KONG_CONCEALED, (Tile(Suit.TONG, 1),) * 4, is_concealed=True),
            Meld(ActionType.PONG, (Tile(Suit.TONG, 2),) * 3, is_concealed=False),
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 对对胡(1) + 带根(1) = 3番（无门清，因为有碰）
    score = Scorer.calculate_score(player)
    assert score == 3


def test_menqing_with_self_draw():
    """测试：门清+自摸组合"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),
            Tile(Suit.WAN, 1), Tile(Suit.WAN, 2), Tile(Suit.WAN, 3),
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 门清(1) + 自摸(1) = 3番
    score = Scorer.calculate_score(player, is_self_drawn=True)
    assert score == 3


def test_menqing_pure_suit_with_concealed_kong():
    """测试：清一色+门清+暗杠组合"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),
            Tile(Suit.TONG, 3), Tile(Suit.TONG, 3), Tile(Suit.TONG, 3),
            Tile(Suit.TONG, 9), Tile(Suit.TONG, 9),
        ],
        melds=[
            Meld(ActionType.KONG_CONCEALED, (Tile(Suit.TONG, 1),) * 4, is_concealed=True),
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 门清(1) + 清对(3, 替代清一色+对对胡) + 带根(1) = 6番
    score = Scorer.calculate_score(player)
    assert score == 6
