/**
 * Kong (杠) Detection Utilities
 *
 * 检测玩家可以进行的杠牌操作：
 * 1. 暗杠（Concealed Kong/Angang）：手中有4张相同的牌
 * 2. 补杠（Upgrade Kong/Bugang）：已碰的牌，手中有第4张
 */

import type { Player, Tile } from '@/types';
import { getTileId } from '@/types';
import { logger } from './logger';

/**
 * 杠牌选项接口
 */
export interface KongOption {
  /** 杠牌类型 */
  type: 'angang' | 'bugang';
  /** 目标牌 */
  tile: Tile;
  /** 显示文字 */
  display: string;
}

/**
 * 检测玩家可以暗杠的牌
 *
 * 暗杠规则：手中有4张完全相同的牌
 *
 * @param player - 玩家信息
 * @returns 可以暗杠的牌列表
 */
export function detectAngang(player: Player): Tile[] {
  const tileCounts = new Map<string, { tile: Tile; count: number }>();

  // 统计每种牌的数量
  player.hand.forEach((tile) => {
    const key = getTileId(tile);
    if (!tileCounts.has(key)) {
      tileCounts.set(key, { tile, count: 0 });
    }
    tileCounts.get(key)!.count++;
  });

  // 返回所有有4张的牌
  const angangTiles: Tile[] = [];
  tileCounts.forEach(({ tile, count }) => {
    if (count === 4) {
      angangTiles.push(tile);
    }
  });

  logger.log('[detectAngang] Detected angang options', {
    playerId: player.playerId,
    angangTiles: angangTiles.map((t) => getTileId(t)),
  });

  return angangTiles;
}

/**
 * 检测玩家可以补杠的牌
 *
 * 补杠规则：玩家已有碰牌（3张明牌），手中有第4张相同的牌
 *
 * @param player - 玩家信息
 * @returns 可以补杠的牌列表
 */
export function detectBugang(player: Player): Tile[] {
  const bugangTiles: Tile[] = [];

  // 检查每个已碰的明牌
  player.melds?.forEach((meld) => {
    if (meld.meldType === 'PONG') {
      // 碰牌的第一张代表该组牌
      const pongTile = meld.tiles[0];
      const pongId = getTileId(pongTile);

      // 检查手牌中是否有第4张相同的牌
      const hasFourth = player.hand.some((tile) => getTileId(tile) === pongId);

      if (hasFourth) {
        bugangTiles.push(pongTile);
      }
    }
  });

  logger.log('[detectBugang] Detected bugang options', {
    playerId: player.playerId,
    bugangTiles: bugangTiles.map((t) => getTileId(t)),
  });

  return bugangTiles;
}

/**
 * 检测玩家所有可用的杠牌选项
 *
 * @param player - 玩家信息
 * @param isPlayerTurn - 是否是玩家回合（只有在自己回合才能暗杠/补杠）
 * @returns 杠牌选项列表
 */
export function detectKongOptions(player: Player, isPlayerTurn: boolean): KongOption[] {
  if (!isPlayerTurn) {
    // 只有在自己回合才能主动杠牌
    return [];
  }

  // 已胡玩家手牌锁定，不能杠牌
  if (player.isHu) {
    return [];
  }

  const options: KongOption[] = [];

  // 检测暗杠
  const angangTiles = detectAngang(player);
  angangTiles.forEach((tile) => {
    options.push({
      type: 'angang',
      tile,
      display: `暗杠：${getTileDisplay(tile)} ×4`,
    });
  });

  // 检测补杠
  const bugangTiles = detectBugang(player);
  bugangTiles.forEach((tile) => {
    options.push({
      type: 'bugang',
      tile,
      display: `补杠：${getTileDisplay(tile)}（已碰→杠）`,
    });
  });

  logger.log('[detectKongOptions] All kong options', {
    playerId: player.playerId,
    isPlayerTurn,
    optionsCount: options.length,
    options: options.map((o) => ({ type: o.type, tile: getTileId(o.tile) })),
  });

  return options;
}

/**
 * 获取牌面显示文字
 */
function getTileDisplay(tile: Tile): string {
  const suitMap: Record<string, string> = {
    WAN: '万',
    TIAO: '条',
    TONG: '筒',
  };
  return `${suitMap[tile.suit] || tile.suit}${tile.rank}`;
}

export default {
  detectAngang,
  detectBugang,
  detectKongOptions,
};
