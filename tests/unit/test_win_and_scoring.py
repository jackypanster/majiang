from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.models.meld import Meld
from mahjong.constants.enums import Suit, ActionType
from mahjong.services.scorer import Scorer
from mahjong.services.win_checker import WinChecker


def test_win_checker_simple_triplets():
    """Test winning with all triplets (对对胡)"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),  # 刻子
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),  # 刻子
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),     # 刻子
            Tile(Suit.WAN, 9), Tile(Suit.WAN, 9),                        # 将
        ],
        missing_suit=Suit.TIAO
    )
    assert WinChecker.is_hu(player)


def test_win_checker_with_sequences():
    """Test winning with sequences (顺子)"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),  # 顺子
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),  # 顺子
            Tile(Suit.TONG, 7), Tile(Suit.TONG, 8), Tile(Suit.TONG, 9),  # 顺子
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),                      # 将
        ],
        missing_suit=Suit.TIAO
    )
    assert WinChecker.is_hu(player)


def test_win_checker_with_quad():
    """Test winning with a quad (杠)"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),  # 杠
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),  # 刻子
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),     # 刻子
            Tile(Suit.WAN, 9), Tile(Suit.WAN, 9),                        # 将
        ],
        missing_suit=Suit.TIAO
    )
    assert WinChecker.is_hu(player)


def test_win_checker_with_extra_tile():
    """Test winning off someone's discard (点炮)"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),  # 刻子
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),  # 刻子
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),     # 刻子
            Tile(Suit.WAN, 9),                                           # 单张，需要另一张 WAN 9
        ],
        missing_suit=Suit.TIAO
    )
    extra_tile = Tile(Suit.WAN, 9)
    assert WinChecker.is_hu(player, extra_tile)


def test_win_checker_missing_suit_violation():
    """Test that having missing suit tiles prevents winning"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),
            Tile(Suit.TIAO, 9), Tile(Suit.TIAO, 9),  # Has missing suit!
        ],
        missing_suit=Suit.TIAO
    )
    assert not WinChecker.is_hu(player)


def test_win_checker_three_suits():
    """Test that having all three suits prevents winning (不缺门)"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),
            Tile(Suit.TIAO, 2), Tile(Suit.TIAO, 2), Tile(Suit.TIAO, 2),
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),
            Tile(Suit.WAN, 9), Tile(Suit.WAN, 9),
        ],
        missing_suit=Suit.TONG  # But has TONG tiles!
    )
    assert not WinChecker.is_hu(player)


def test_win_checker_invalid_structure():
    """Test that invalid hand structure cannot win"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),
            Tile(Suit.TONG, 7), Tile(Suit.TONG, 8),  # Missing a tile
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),
        ],
        missing_suit=Suit.TIAO
    )
    assert not WinChecker.is_hu(player)


def test_win_checker_empty_hand():
    """Test that empty hand cannot win"""
    player = Player(player_id="p1", hand=[], missing_suit=Suit.TIAO)
    assert not WinChecker.is_hu(player)


def test_scorer_basic_win():
    """Test basic win with no special patterns"""
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
    # 基本胡(1) + 门清(1) = 2番 = 2分
    score = Scorer.calculate_score(player)
    assert score == 2


def test_scorer_self_drawn():
    """Test self-drawn win bonus (+1 fan)"""
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
    # 基本胡(1) + 门清(1) + 自摸(1) = 3番 = 3分
    score = Scorer.calculate_score(player, is_self_drawn=True)
    assert score == 3


def test_scorer_all_triplets():
    """Test all triplets (对对胡) (+1 fan)"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),
            Tile(Suit.WAN, 9), Tile(Suit.WAN, 9),
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 门清(1) + 对对胡(1) = 3番 = 3分
    score = Scorer.calculate_score(player)
    assert score == 3


def test_scorer_pure_one_suit():
    """Test pure one suit (清一色) (+2 fan)"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),
            Tile(Suit.TONG, 7), Tile(Suit.TONG, 8), Tile(Suit.TONG, 9),
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 门清(1) + 清一色(2) = 4番 = 4分
    score = Scorer.calculate_score(player)
    assert score == 4


def test_scorer_pure_all_triplets():
    """Test pure all triplets (清对) (+3 fan total)"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),
            Tile(Suit.TONG, 5), Tile(Suit.TONG, 5), Tile(Suit.TONG, 5),
            Tile(Suit.TONG, 9), Tile(Suit.TONG, 9),
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 门清(1) + 清对(3, 替代清一色+对对胡) = 5番 = 5分
    score = Scorer.calculate_score(player)
    assert score == 5


def test_scorer_with_gen():
    """Test with gen (带根) - quad gives +1 fan"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),  # 杠 = 1 gen
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),
            Tile(Suit.WAN, 9), Tile(Suit.WAN, 9),
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 门清(1) + 对对胡(1) + 带根(1) = 4番 = 4分
    score = Scorer.calculate_score(player)
    assert score == 4


def test_scorer_tian_hu():
    """Test tian hu (天胡) (+5 fan)"""
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
    # 基本胡(1) + 天胡(5) + 门清(1) = 7番 = 7分
    score = Scorer.calculate_score(player, is_tian_hu=True)
    assert score == 7


def test_scorer_combo_bonuses():
    """Test combination of multiple bonuses"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),
            Tile(Suit.TONG, 7), Tile(Suit.TONG, 8), Tile(Suit.TONG, 9),
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),
        ],
        missing_suit=Suit.TIAO,
    )
    # 基本胡(1) + 门清(1) + 清一色(2) + 自摸(1) + 杠上花(1) = 6番 = 6分
    score = Scorer.calculate_score(
        player, is_self_drawn=True, is_kong_flower=True
    )
    assert score == 6


def test_scorer_with_melds_no_menqing():
    """Test that having open melds removes menqing bonus"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),  # 刻子
            Tile(Suit.WAN, 5), Tile(Suit.WAN, 5),  # 将
        ],
        melds=[
            Meld(ActionType.PONG, (Tile(Suit.TONG, 4), Tile(Suit.TONG, 4), Tile(Suit.TONG, 4))),
            Meld(ActionType.PONG, (Tile(Suit.WAN, 1), Tile(Suit.WAN, 1), Tile(Suit.WAN, 1))),
        ],
        missing_suit=Suit.TIAO,
    )
    # No 门清 because has open melds, but has 对对胡(+1) = 1 fan = 2^1 = 2
    score = Scorer.calculate_score(player)
    assert score == 2
