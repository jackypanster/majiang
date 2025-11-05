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
    KONG = auto()
    HU = auto()
    PASS = auto()
