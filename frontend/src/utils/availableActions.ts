/**
 * Available Actions Detection
 *
 * 检测玩家可以执行的响应操作（碰/杠/胡/过）
 *
 * 注意：这是前端预检测逻辑，后端仍然是最终权威
 */

import type { Player, Tile, GameState } from '@/types';
import { logger } from './logger';

/**
 * 检测玩家是否可以碰牌
 * 规则：手牌中至少有2张与目标牌相同的牌
 */
export function canPeng(player: Player, targetTile: Tile): boolean {
  if (!targetTile) return false;

  const matchingTiles = player.hand.filter(
    (tile) => tile.suit === targetTile.suit && tile.rank === targetTile.rank
  );

  return matchingTiles.length >= 2;
}

/**
 * 检测玩家是否可以杠牌（明杠）
 * 规则：手牌中至少有3张与目标牌相同的牌
 */
export function canKong(player: Player, targetTile: Tile): boolean {
  if (!targetTile) return false;

  const matchingTiles = player.hand.filter(
    (tile) => tile.suit === targetTile.suit && tile.rank === targetTile.rank
  );

  return matchingTiles.length >= 3;
}

/**
 * 检测玩家是否可以胡牌
 *
 * 简化逻辑：由于胡牌判断复杂（需要检测缺门、牌型结构），
 * 前端只做简单检测，实际判断由后端负责
 *
 * 基本检测：
 * 1. 手牌数量符合要求（庄家11张，闲家10张）
 * 2. 目标牌不是缺门花色
 * 3. 手牌中不包含缺门花色的牌
 *
 * 注意：无论自摸还是点炮，都应该显示"胡"按钮让玩家选择，
 * 因为玩家可能想等待更大的牌型（如清一色、对对胡等）。
 * 一旦选择胡牌，手牌结构就固定了，不能再改变。
 */
export function canHu(player: Player, targetTile: Tile, isPlayerTurn: boolean): boolean {
  if (!targetTile) return false;

  // ✅ 简化逻辑：前端只做基本预检测，复杂的结构检查由后端负责
  // 这样可以避免前后端逻辑不一致导致的bug（例如Issue #69）

  // 基本检查 1：目标牌不能是缺门花色
  if (player.missingSuit && targetTile.suit === player.missingSuit) {
    logger.log('[canHu] Cannot HU - target tile is missing suit', {
      playerId: player.playerId,
      missingSuit: player.missingSuit,
      targetTile,
    });
    return false;
  }

  // 基本检查 2：手牌中不能包含缺门花色的牌
  // 规则：胡牌时任何暗牌都不得包含自己的缺门花色
  if (player.missingSuit) {
    const hasMissingSuitTiles = player.hand.some(tile => tile.suit === player.missingSuit);
    if (hasMissingSuitTiles) {
      logger.log('[canHu] Cannot HU - hand contains missing suit tiles', {
        playerId: player.playerId,
        missingSuit: player.missingSuit,
        hand: player.hand,
      });
      return false;
    }
  }

  // ✅ 不再检查手牌数量和牌型结构
  // 原因：这些检查容易出错，且与后端逻辑不一致
  // 让后端的 WinChecker.is_hu() 做最终判断

  logger.log('[canHu] Basic checks passed, returning true (backend will do final validation)', {
    playerId: player.playerId,
    targetTile,
    handCount: player.hand.length,
    meldCount: player.melds.length,
  });

  return true;
}

/**
 * 检测玩家可用的响应动作
 *
 * @param gameState - 当前游戏状态
 * @param playerId - 玩家 ID
 * @param lastDiscardedTile - 最后一张出牌
 * @returns 可用动作列表
 */
export function detectAvailableActions(
  gameState: GameState | null,
  playerId: string,
  lastDiscardedTile: Tile | null
): ('peng' | 'gang' | 'hu' | 'skip')[] {
  if (!gameState || !lastDiscardedTile) {
    return [];
  }

  // 只在 PLAYING 阶段检测
  if (gameState.gamePhase !== 'PLAYING') {
    return [];
  }

  // 找到当前玩家
  const player = gameState.players.find((p) => p.playerId === playerId);
  if (!player) {
    logger.error('[detectAvailableActions] Player not found', { playerId });
    return [];
  }

  // 判断是否是玩家回合（不能假设human总是索引0）
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isPlayerTurn = currentPlayer?.playerId === playerId;

  // 检测可用动作
  const actions: ('peng' | 'gang' | 'hu' | 'skip')[] = [];

  // 🔍 调试日志：输出详细信息
  logger.log('[detectAvailableActions] Debug info', {
    playerId,
    isPlayerTurn,
    lastDiscardedTile,
    playerHand: player.hand,
    playerHandCount: player.hand.length,
    canPengResult: !isPlayerTurn ? canPeng(player, lastDiscardedTile) : null,
    canKongResult: !isPlayerTurn ? canKong(player, lastDiscardedTile) : null,
    canHuResult: canHu(player, lastDiscardedTile, isPlayerTurn),
  });

  if (isPlayerTurn) {
    // 玩家自己回合：只检测自摸胡牌
    // 在血战到底模式中，玩家可以选择是否胡牌（可能想等更大的牌型）
    if (canHu(player, lastDiscardedTile, isPlayerTurn)) {
      actions.push('hu');
      actions.push('skip'); // 可以选择不胡
    }
  } else {
    // 他人回合：检测碰/杠/胡（响应其他玩家的出牌）
    if (canPeng(player, lastDiscardedTile)) {
      actions.push('peng');
    }

    if (canKong(player, lastDiscardedTile)) {
      actions.push('gang');
    }

    if (canHu(player, lastDiscardedTile, isPlayerTurn)) {
      actions.push('hu');
    }

    // 只要有其他动作可选，就添加"过"按钮
    if (actions.length > 0) {
      actions.push('skip');
    }
  }

  logger.log('[detectAvailableActions] Detected actions', {
    playerId,
    lastDiscardedTile,
    actions,
  });

  return actions;
}

export default {
  canPeng,
  canKong,
  canHu,
  detectAvailableActions,
};
