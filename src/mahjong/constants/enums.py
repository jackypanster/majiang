from enum import Enum, auto


class Suit(Enum):
    TONG = auto()  # Dots
    TIAO = auto()  # Bamboos
    WAN = auto()  # Characters


class GamePhase(Enum):
    PREPARING = auto()
    BURYING = auto()
    PLAYING = auto()
    ENDED = auto()


class ActionType(Enum):
    PONG = auto()
    KONG = auto()  # Generic kong type (for backward compatibility)
    KONG_EXPOSED = auto()  # 明杠/直杠: 3 in hand + 1 from discard (2x score)
    KONG_CONCEALED = auto()  # 暗杠: 4 in hand (1x score each player)
    KONG_UPGRADE = auto()  # 补杠/巴杠: upgrade pong to kong (1x score each player)
    HU = auto()
    PASS = auto()
