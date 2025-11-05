from mahjong.models.player import Player
from mahjong.services.scorer import Scorer
from mahjong.services.win_checker import WinChecker


def test_win_checker_placeholder():
    player = Player(player_id="p1")
    assert not WinChecker.is_hu(player)


def test_scorer_placeholder():
    player = Player(player_id="p1")
    assert Scorer.calculate_score(player) == 1
