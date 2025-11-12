/**
 * Discard validation utilities (Phase 4: User Story 2 - 出牌并观察AI响应)
 *
 * 缺门优先出牌校验：
 * - 检查手中是否有缺门牌
 * - 如有缺门牌，则禁止打出非缺门牌
 */

import type { Tile } from '@/types';

export interface DiscardValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * 检查是否可以打出指定的牌
 *
 * 规则：必须优先打出缺门花色的牌
 * 只有当手中无缺门牌时，才能打其他花色
 *
 * @param tileToDiscard 要打出的牌
 * @param playerHand 玩家手牌
 * @param missingSuit 玩家的缺门花色（如 "WAN", "TIAO", "TONG"）
 * @returns 验证结果
 */
export function validateDiscard(
  tileToDiscard: Tile,
  playerHand: Tile[],
  missingSuit: string | null
): DiscardValidationResult {
  // 1. 检查牌是否在手中
  const tileInHand = playerHand.some(
    (tile) => tile.suit === tileToDiscard.suit && tile.rank === tileToDiscard.rank
  );

  if (!tileInHand) {
    return {
      isValid: false,
      errorMessage: '选择的牌不在手牌中',
    };
  }

  // 2. 如果没有缺门，任何牌都可以打
  if (!missingSuit) {
    return { isValid: true };
  }

  // 3. 检查手中是否有缺门牌
  const hasMissingSuitTiles = playerHand.some((tile) => tile.suit === missingSuit);

  // 4. 如果手中有缺门牌，必须优先打缺门牌
  if (hasMissingSuitTiles && tileToDiscard.suit !== missingSuit) {
    const suitMap: Record<string, string> = {
      WAN: '万',
      TIAO: '条',
      TONG: '筒',
    };
    const missingSuitDisplay = suitMap[missingSuit] || missingSuit;

    return {
      isValid: false,
      errorMessage: `手中有${missingSuitDisplay}（缺门），必须优先打出缺门牌`,
    };
  }

  return { isValid: true };
}

/**
 * 检查手牌中是否有缺门牌
 */
export function hasMissingSuitInHand(hand: Tile[], missingSuit: string | null): boolean {
  if (!missingSuit) return false;
  return hand.some((tile) => tile.suit === missingSuit);
}
