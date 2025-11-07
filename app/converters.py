"""Type conversion utilities between API models and game logic models."""

from typing import List, Union

from mahjong.constants.enums import Suit
from mahjong.models.tile import Tile
from app.schemas import TileInput


def to_tile(tile_input: Union[TileInput, dict]) -> Tile:
    """Convert TileInput (API format) to Tile (game logic format).

    Args:
        tile_input: TileInput object or dict with 'suit' (str) and 'rank' (int)

    Returns:
        Tile object from mahjong library
    """
    if isinstance(tile_input, TileInput):
        return Tile(suit=Suit[tile_input.suit], rank=tile_input.rank)
    else:
        return Tile(suit=Suit[tile_input["suit"]], rank=tile_input["rank"])


def tiles_from_request(tiles: List[Union[TileInput, dict]]) -> List[Tile]:
    """Convert list of TileInput to list of Tile objects.

    Args:
        tiles: List of TileInput objects or dicts from API request

    Returns:
        List of Tile objects
    """
    return [to_tile(t) for t in tiles]
