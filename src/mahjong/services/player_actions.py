from collections import Counter
from dataclasses import replace
from typing import List, Optional

from mahjong.constants.enums import ActionType, GamePhase, Suit
from mahjong.exceptions.game_errors import InvalidActionError, InvalidGameStateError
from mahjong.models.game_state import GameState
from mahjong.models.meld import Meld
from mahjong.models.player import Player
from mahjong.models.response import PlayerResponse
from mahjong.models.tile import Tile
from mahjong.services.win_checker import WinChecker


class PlayerActions:
    @staticmethod
    def collect_ai_responses(
        game_state: GameState,
        discarded_tile: Tile,
        discard_player_id: str,
    ) -> List[PlayerResponse]:
        """
        收集AI玩家对打出牌的响应（1个真人 + 3个AI模式）

        AI决策策略（简单）：
        1. 能胡 → 胡
        2. 能杠 → 杠
        3. 能碰 → 碰
        4. 否则 → 过

        Args:
            game_state: 当前游戏状态
            discarded_tile: 打出的牌
            discard_player_id: 打牌者ID

        Returns:
            所有玩家的响应列表
        """
        responses = []

        for player in game_state.players:
            # 跳过打牌者自己
            if player.player_id == discard_player_id:
                continue

            # 跳过已经胡牌的玩家
            if player.is_hu:
                continue

            # AI决策：按优先级检查
            action_type = ActionType.PASS

            # 1. 检查能否胡牌
            if WinChecker.is_hu(player, discarded_tile):
                action_type = ActionType.HU
            # 2. 检查能否杠（明杠：手中3张）
            elif player.hand.count(discarded_tile) >= 3:
                action_type = ActionType.KONG_EXPOSED
            # 3. 检查能否碰（手中2张）
            elif player.hand.count(discarded_tile) >= 2:
                action_type = ActionType.PONG

            responses.append(PlayerResponse(
                player_id=player.player_id,
                action_type=action_type,
                target_tile=discarded_tile,
                priority=PlayerResponse.get_priority(action_type)
            ))

        return responses

    @staticmethod
    def process_responses(
        game_state: GameState,
        responses: List[PlayerResponse],
        discard_player_id: str,
    ) -> GameState:
        """
        处理响应：按优先级仲裁并执行（胡 > 杠 > 碰）

        Args:
            game_state: 当前游戏状态
            responses: 所有玩家的响应
            discard_player_id: 打牌者ID（用于明杠结算）

        Returns:
            更新后的游戏状态
        """
        # 按优先级排序（降序）
        sorted_responses = sorted(responses, key=lambda r: r.priority, reverse=True)

        # 取优先级最高的响应
        highest_response = sorted_responses[0]

        # 如果最高优先级是PASS，说明没人响应
        if highest_response.action_type == ActionType.PASS:
            # 无人响应，下一个玩家摸牌
            return PlayerActions._next_player_draw(game_state)

        # 有人响应，执行对应操作
        return PlayerActions.declare_action(
            game_state,
            highest_response.player_id,
            highest_response.action_type,
            highest_response.target_tile,
            discard_player_id=discard_player_id,
        )

    @staticmethod
    def _next_player_draw(game_state: GameState) -> GameState:
        """
        无人响应时，下一个玩家摸牌

        Args:
            game_state: 当前游戏状态

        Returns:
            更新后的游戏状态
        """
        current_player_index = game_state.current_player_index
        new_current_player_index = (current_player_index + 1) % 4

        new_wall = list(game_state.wall)
        new_players = list(game_state.players)

        # 下一个玩家摸牌
        if new_wall:
            drawn_tile = new_wall.pop(0)
            next_player = new_players[new_current_player_index]
            updated_next_player_hand = list(next_player.hand)
            updated_next_player_hand.append(drawn_tile)
            updated_next_player = replace(next_player, hand=updated_next_player_hand)
            new_players[new_current_player_index] = updated_next_player

        return replace(
            game_state,
            players=new_players,
            wall=new_wall,
            current_player_index=new_current_player_index,
        )

    @staticmethod
    def _settle_kong_score(
        players: List[Player],
        base_score: int,
        kong_player_id: str,
        kong_type: ActionType,
        discard_player_id: Optional[str] = None,
    ) -> List[Player]:
        """
        Settle kong scores immediately (刮风下雨).

        Args:
            players: Current players list (已包含手牌/melds更新)
            base_score: Base score for kong calculation
            kong_player_id: ID of player who made the kong
            kong_type: Type of kong (EXPOSED, CONCEALED, UPGRADE)
            discard_player_id: ID of player who discarded (for exposed kong only)

        Returns:
            Updated players list with settled scores
        """
        new_players = list(players)
        kong_player_idx = next(i for i, p in enumerate(new_players) if p.player_id == kong_player_id)

        if kong_type in (ActionType.KONG, ActionType.KONG_EXPOSED):
            # 明杠：点杠者付2倍底分
            if not discard_player_id:
                raise InvalidActionError("discard_player_id required for exposed kong")

            discard_player_idx = next(
                (i for i, p in enumerate(new_players) if p.player_id == discard_player_id),
                None
            )
            if discard_player_idx is None:
                raise ValueError(f"Discard player {discard_player_id} not found")

            kong_score = base_score * 2

            # 点杠者扣分
            new_players[discard_player_idx] = replace(
                new_players[discard_player_idx],
                score=new_players[discard_player_idx].score - kong_score
            )

            # 杠牌者得分
            new_players[kong_player_idx] = replace(
                new_players[kong_player_idx],
                score=new_players[kong_player_idx].score + kong_score
            )

        elif kong_type in (ActionType.KONG_CONCEALED, ActionType.KONG_UPGRADE):
            # 暗杠/补杠：其他三家各付1倍底分
            kong_score = base_score * 1

            for i, player in enumerate(new_players):
                if player.player_id != kong_player_id:
                    # 其他玩家扣分
                    new_players[i] = replace(
                        player,
                        score=player.score - kong_score
                    )

            # 杠牌者得3倍分（3家各付1倍）
            new_players[kong_player_idx] = replace(
                new_players[kong_player_idx],
                score=new_players[kong_player_idx].score + kong_score * 3
            )

        return new_players

    @staticmethod
    def bury_cards(
        game_state: GameState, player_id: str, tiles: List[Tile]
    ) -> GameState:
        if game_state.game_phase != GamePhase.BURYING:
            raise InvalidGameStateError("Cannot bury cards outside of BURYING phase.")

        player = next((p for p in game_state.players if p.player_id == player_id), None)
        if not player:
            raise ValueError(f"Player {player_id} not found.")

        if len(tiles) != 3:
            raise InvalidActionError("Must bury exactly 3 tiles.")
        if not all(t.suit == tiles[0].suit for t in tiles):
            raise InvalidActionError("Buried tiles must be of the same suit.")

        # Check if all tiles are in hand and count is sufficient
        hand_counts = Counter(player.hand)
        bury_counts = Counter(tiles)

        for tile, count in bury_counts.items():
            if hand_counts[tile] < count:
                raise InvalidActionError(
                    f"Not enough copies of tile {tile} in player's hand to bury."
                )

        # Create a new hand for the player
        new_hand = list(player.hand)
        for tile in tiles:
            new_hand.remove(tile)

        updated_player = replace(
            player,
            missing_suit=tiles[0].suit,
            buried_cards=tiles,
            hand=new_hand,
        )

        # Update players list
        new_players = list(game_state.players)
        player_index = next(i for i, p in enumerate(new_players) if p.player_id == player_id)
        new_players[player_index] = updated_player

        # Check if all players have buried their cards
        new_game_phase = game_state.game_phase
        if all(p.missing_suit is not None for p in new_players):
            new_game_phase = GamePhase.PLAYING

        return replace(
            game_state, players=new_players, game_phase=new_game_phase
        )

    @staticmethod
    def discard_tile(game_state: GameState, player_id: str, tile: Tile) -> GameState:
        """
        打牌并处理AI响应（1个真人 + 3个AI模式）

        流程：
        1. 打牌到弃牌堆
        2. 收集AI响应（碰/杠/胡/过）
        3. 按优先级处理响应（胡 > 杠 > 碰）
        4. 如果无人响应，下一个玩家摸牌

        Args:
            game_state: 当前游戏状态
            player_id: 打牌者ID
            tile: 打出的牌

        Returns:
            更新后的游戏状态
        """
        if game_state.game_phase != GamePhase.PLAYING:
            raise InvalidGameStateError("Cannot discard tile outside of PLAYING phase.")

        current_player_index = game_state.current_player_index
        current_player = game_state.players[current_player_index]
        if current_player.player_id != player_id:
            raise InvalidActionError(f"It is not player {player_id}'s turn.")

        # 1. 检查牌是否在手牌中
        if tile not in current_player.hand:
            raise InvalidActionError(f"Tile {tile} not in player's hand in discard_tile(): {player_id}, {tile}")

        # 2. 缺门优先检查（PRD.md 第 2.2 节第 32 行）
        # "玩家在后续出牌时，必须优先打完缺门花色的牌"
        if current_player.missing_suit is not None:
            # 检查手牌中是否还有缺门牌
            missing_suit_tiles = [t for t in current_player.hand if t.suit == current_player.missing_suit]

            if missing_suit_tiles and tile.suit != current_player.missing_suit:
                # 手牌中有缺门牌，但打出的不是缺门牌
                suit_names = {Suit.TONG: "筒", Suit.TIAO: "条", Suit.WAN: "万"}
                raise InvalidActionError(
                    f"缺门优先规则违反: 玩家 {player_id} 必须优先打完缺门({suit_names[current_player.missing_suit]})的牌。"
                    f"手牌中还有 {len(missing_suit_tiles)} 张缺门牌，不能打出非缺门牌 {tile}。"
                )

        # 3. 打牌到弃牌堆
        new_current_player_hand = list(current_player.hand)
        new_current_player_hand.remove(tile)

        updated_current_player = replace(current_player, hand=new_current_player_hand)

        new_public_discards = list(game_state.public_discards)
        new_public_discards.append(tile)

        new_players = list(game_state.players)
        new_players[current_player_index] = updated_current_player

        # 创建临时状态（打牌后，响应前）
        temp_state = replace(
            game_state,
            players=new_players,
            public_discards=new_public_discards,
        )

        # 2. 收集AI响应
        responses = PlayerActions.collect_ai_responses(temp_state, tile, player_id)

        # 3. 处理响应（会自动处理摸牌）
        return PlayerActions.process_responses(temp_state, responses, player_id)

    @staticmethod
    def declare_action(
        game_state: GameState,
        player_id: str,
        action_type: ActionType,
        target_tile: Tile,
        discard_player_id: Optional[str] = None,
    ) -> GameState:
        """
        Handle a player's declared action (HU, PONG, KONG) on a tile.

        This implements the basic logic for each action type.
        Response window and priority resolution are handled separately (Issue #43/#36).

        Args:
            game_state: Current game state
            player_id: ID of player making the action
            action_type: Type of action (HU/PONG/KONG/PASS)
            target_tile: The tile being acted upon
            discard_player_id: ID of player who discarded the tile (for exposed kong)

        Returns:
            Updated game state
        """
        if game_state.game_phase != GamePhase.PLAYING:
            raise InvalidGameStateError("Can only declare actions during PLAYING phase.")

        player = next((p for p in game_state.players if p.player_id == player_id), None)
        if not player:
            raise ValueError(f"Player {player_id} not found in declare_action(): {player_id}")

        player_index = next(i for i, p in enumerate(game_state.players) if p.player_id == player_id)

        if action_type == ActionType.PASS:
            # No state change needed for PASS
            return game_state

        if action_type == ActionType.HU:
            # Check if player can win with this tile
            if not WinChecker.is_hu(player, target_tile):
                raise InvalidActionError(f"Player {player_id} cannot HU with tile {target_tile}")

            # Update player to mark as won
            updated_player = replace(player, is_hu=True)
            new_players = list(game_state.players)
            new_players[player_index] = updated_player

            return replace(game_state, players=new_players)

        if action_type == ActionType.PONG:
            # Check if player has 2 matching tiles in hand
            if player.hand.count(target_tile) < 2:
                raise InvalidActionError(
                    f"Player {player_id} cannot PONG {target_tile} - only has {player.hand.count(target_tile)} in hand"
                )

            # Remove 2 tiles from hand
            new_hand = list(player.hand)
            for _ in range(2):
                new_hand.remove(target_tile)

            # Create meld (碰) with the 3 tiles
            new_meld = Meld(meld_type=ActionType.PONG, tiles=(target_tile, target_tile, target_tile), is_concealed=False)
            new_melds = list(player.melds) + [new_meld]

            # Update player
            updated_player = replace(player, hand=new_hand, melds=new_melds)
            new_players = list(game_state.players)
            new_players[player_index] = updated_player

            # Switch current player to the one who ponged
            return replace(
                game_state,
                players=new_players,
                current_player_index=player_index,
            )

        if action_type in (ActionType.KONG, ActionType.KONG_EXPOSED):
            # 明杠（exposed kong）: 3 in hand + 1 from discard
            # Check if player has 3 matching tiles in hand
            if player.hand.count(target_tile) < 3:
                raise InvalidActionError(
                    f"Player {player_id} cannot KONG_EXPOSED {target_tile} - only has {player.hand.count(target_tile)} in hand"
                )

            # Remove 3 tiles from hand
            new_hand = list(player.hand)
            for _ in range(3):
                new_hand.remove(target_tile)

            # Create meld (明杠) with the 4 tiles
            meld_type = ActionType.KONG_EXPOSED if action_type == ActionType.KONG_EXPOSED else ActionType.KONG
            new_meld = Meld(meld_type=meld_type, tiles=(target_tile,) * 4, is_concealed=False)
            new_melds = list(player.melds) + [new_meld]

            # Draw a replacement tile from the end of the wall
            new_wall = list(game_state.wall)
            if not new_wall:
                raise InvalidActionError("Cannot KONG - no tiles left in wall")

            drawn_tile = new_wall.pop()  # Draw from end for kong
            new_hand.append(drawn_tile)

            # Update player with new hand and melds
            updated_player = replace(player, hand=new_hand, melds=new_melds)
            new_players = list(game_state.players)
            new_players[player_index] = updated_player

            # Settle kong scores immediately (刮风下雨)
            new_players = PlayerActions._settle_kong_score(
                new_players, game_state.base_score, player_id, meld_type, discard_player_id
            )

            # Create new game state
            new_game_state = replace(
                game_state,
                players=new_players,
                wall=new_wall,
                current_player_index=player_index,
            )

            # Verify zero-sum property
            new_game_state.verify_zero_sum()

            return new_game_state

        if action_type == ActionType.KONG_CONCEALED:
            # 暗杠（concealed kong）: 4 in hand
            # Check if player has 4 matching tiles in hand
            if player.hand.count(target_tile) < 4:
                raise InvalidActionError(
                    f"Player {player_id} cannot KONG_CONCEALED {target_tile} - only has {player.hand.count(target_tile)} in hand"
                )

            # Remove 4 tiles from hand
            new_hand = list(player.hand)
            for _ in range(4):
                new_hand.remove(target_tile)

            # Create meld (暗杠) with the 4 tiles
            new_meld = Meld(meld_type=ActionType.KONG_CONCEALED, tiles=(target_tile,) * 4, is_concealed=True)
            new_melds = list(player.melds) + [new_meld]

            # Draw a replacement tile from the end of the wall
            new_wall = list(game_state.wall)
            if not new_wall:
                raise InvalidActionError("Cannot KONG_CONCEALED - no tiles left in wall")

            drawn_tile = new_wall.pop()  # Draw from end for kong
            new_hand.append(drawn_tile)

            # Update player
            updated_player = replace(player, hand=new_hand, melds=new_melds)
            new_players = list(game_state.players)
            new_players[player_index] = updated_player

            # Settle kong scores immediately (刮风下雨)
            new_players = PlayerActions._settle_kong_score(
                new_players, game_state.base_score, player_id, ActionType.KONG_CONCEALED
            )

            # Create new game state
            new_game_state = replace(
                game_state,
                players=new_players,
                wall=new_wall,
            )

            # Verify zero-sum property
            new_game_state.verify_zero_sum()

            return new_game_state

        if action_type == ActionType.KONG_UPGRADE:
            # 补杠（upgrade kong）: upgrade existing pong to kong
            # Check if player has a PONG of this tile
            pong_to_upgrade = None
            pong_index = None
            for i, meld in enumerate(player.melds):
                if meld.meld_type == ActionType.PONG and meld.tiles[0] == target_tile:
                    pong_to_upgrade = meld
                    pong_index = i
                    break

            if pong_to_upgrade is None:
                raise InvalidActionError(
                    f"Player {player_id} cannot KONG_UPGRADE {target_tile} - no existing PONG found"
                )

            # Check if player has 1 more matching tile in hand
            if player.hand.count(target_tile) < 1:
                raise InvalidActionError(
                    f"Player {player_id} cannot KONG_UPGRADE {target_tile} - no tile in hand to upgrade"
                )

            # Remove 1 tile from hand
            new_hand = list(player.hand)
            new_hand.remove(target_tile)

            # Upgrade the PONG to KONG_UPGRADE
            new_melds = list(player.melds)
            new_melds[pong_index] = Meld(
                meld_type=ActionType.KONG_UPGRADE,
                tiles=(target_tile,) * 4,
                is_concealed=False
            )

            # Draw a replacement tile from the end of the wall
            new_wall = list(game_state.wall)
            if not new_wall:
                raise InvalidActionError("Cannot KONG_UPGRADE - no tiles left in wall")

            drawn_tile = new_wall.pop()  # Draw from end for kong
            new_hand.append(drawn_tile)

            # Update player
            updated_player = replace(player, hand=new_hand, melds=new_melds)
            new_players = list(game_state.players)
            new_players[player_index] = updated_player

            # Settle kong scores immediately (刮风下雨)
            new_players = PlayerActions._settle_kong_score(
                new_players, game_state.base_score, player_id, ActionType.KONG_UPGRADE
            )

            # Create new game state
            new_game_state = replace(
                game_state,
                players=new_players,
                wall=new_wall,
            )

            # Verify zero-sum property
            new_game_state.verify_zero_sum()

            return new_game_state

        raise InvalidActionError(f"Unknown action type: {action_type}")
