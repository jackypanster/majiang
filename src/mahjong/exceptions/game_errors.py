class InvalidActionError(Exception):
    """Raised when a player attempts an invalid action."""

    pass


class InvalidGameStateError(Exception):
    """Raised when an action is attempted in an invalid game state."""

    pass
