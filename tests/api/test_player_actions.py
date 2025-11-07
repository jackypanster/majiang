"""Integration tests for player actions."""

import pytest
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_bury_action():
    """Test bury action in BURYING phase."""
    # Create game
    create_resp = client.post("/games")
    game_id = create_resp.json()["game_id"]
    state = create_resp.json()["state"]

    # Get human player's hand
    human_player = next(p for p in state["players"] if p["player_id"] == "human")
    hand = human_player["hand"]

    # Find 3 tiles of same suit
    from collections import Counter
    suit_counts = Counter(tile["suit"] for tile in hand)
    most_common_suit = suit_counts.most_common(1)[0][0]
    tiles_to_bury = [t for t in hand if t["suit"] == most_common_suit][:3]

    # Submit bury action
    response = client.post(
        f"/games/{game_id}/action",
        json={
            "player_id": "human",
            "action": "bury",
            "tiles": tiles_to_bury
        }
    )

    assert response.status_code == 200
    data = response.json()
    # After all players bury, phase should transition to PLAYING
    # Note: AI will auto-bury, so check if phase changed
    assert data["game_phase"] in ["BURYING", "PLAYING"]


def test_invalid_bury_action():
    """Test invalid bury action (wrong number of tiles)."""
    # Create game
    create_resp = client.post("/games")
    game_id = create_resp.json()["game_id"]

    # Try to bury only 2 tiles (invalid)
    response = client.post(
        f"/games/{game_id}/action",
        json={
            "player_id": "human",
            "action": "bury",
            "tiles": [
                {"suit": "TONG", "rank": 1},
                {"suit": "TONG", "rank": 2}
            ]
        }
    )

    assert response.status_code == 422  # Pydantic validation error
    # Pydantic error format includes validation details
    assert response.status_code != 200
