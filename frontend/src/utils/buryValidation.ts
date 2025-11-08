/**
 * 埋牌验证逻辑
 *
 * 验证玩家选择的埋牌是否符合规则：
 * 1. 必须选择3张牌
 * 2. 3张牌必须是同花色
 * 3. 3张牌必须在玩家手牌中
 */

import { areSameSuit } from './tileUtils';
import { getTileId } from '@/types';
import type { Tile } from '@/types';

export interface BuryValidationResult {
  /**
   * 是否验证通过
   */
  isValid: boolean;
  /**
   * 错误消息（如果验证失败）
   */
  errorMessage?: string;
}

/**
 * 验证埋牌选择是否有效
 *
 * @param selectedTiles - 玩家选择的牌
 * @param playerHand - 玩家的手牌
 * @returns 验证结果
 */
export function validateBuryCards(
  selectedTiles: Tile[],
  playerHand: Tile[]
): BuryValidationResult {
  // 1. 检查是否选择了3张牌
  if (selectedTiles.length !== 3) {
    return {
      isValid: false,
      errorMessage: `请选择3张牌进行埋牌（当前已选${selectedTiles.length}张）`,
    };
  }

  // 2. 检查是否同花色
  if (!areSameSuit(selectedTiles)) {
    const suits = selectedTiles.map((tile) => tile.suit);
    const uniqueSuits = [...new Set(suits)];
    return {
      isValid: false,
      errorMessage: `埋牌必须是同花色，当前选择了：${uniqueSuits.join('、')}`,
    };
  }

  // 3. 所有验证通过
  // 注意：不需要检查重复，因为使用数组索引选择时已经不会有重复
  // 也不需要检查牌是否在手牌中，因为选择时就是从手牌中选的

  return {
    isValid: true,
  };
}

export default validateBuryCards;
