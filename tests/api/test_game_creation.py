"""Integration tests for game creation and state query."""

import pytest
from starlette.testclient import TestClient

from app.main import app

# Use synchronous TestClient for FastAPI
client = TestClient(app)


def test_root_endpoint():
    """Test health check endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "docs" in data
    assert "active_games" in data


def test_create_game_with_defaults():
    """Test game creation returns valid ID and initial state."""
    response = client.post("/games")

    assert response.status_code == 200
    data = response.json()

    # Verify game_id exists (8-character hex format from GameManager)
    assert "game_id" in data
    assert len(data["game_id"]) == 8

    # Verify initial state
    assert "state" in data
    state = data["state"]
    assert state["game_phase"] == "BURYING"
    assert len(state["players"]) == 4
    assert state["current_player_index"] == 0


def test_get_game_state():
    """Test querying game state after creation."""
    # Create game
    create_resp = client.post("/games")
    game_id = create_resp.json()["game_id"]

    # Query state
    get_resp = client.get(f"/games/{game_id}?player_id=human")

    assert get_resp.status_code == 200
    state = get_resp.json()
    assert state["game_id"] == game_id
    assert state["game_phase"] == "BURYING"


def test_get_nonexistent_game():
    """Test 404 for non-existent game."""
    response = client.get("/games/invalid-uuid?player_id=human")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
