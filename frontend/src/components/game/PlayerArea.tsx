/**
 * PlayerArea Component
 *
 * 统一的玩家区域组件，支持四个方向（top/bottom/left/right）
 * 显示玩家信息、手牌（AI显示背面，人类显示正面）、明牌、当前回合高亮
 */

import { getTileDisplay } from '@/utils/tileUtils';
import type { Player, Tile, Meld } from '@/types';

interface PlayerAreaProps {
  /**
   * 玩家数据
   */
  player: Player;
  /**
   * 玩家位置
   */
  position: 'top' | 'bottom' | 'left' | 'right';
  /**
   * 是否为当前回合
   */
  isCurrentTurn: boolean;
  /**
   * 是否为人类玩家
   */
  isHuman?: boolean;
  /**
   * 出牌回调（仅人类玩家）
   */
  onDiscard?: (tile: Tile) => void;
  /**
   * 是否禁用交互
   */
  disabled?: boolean;
}

/**
 * 获取花色显示
 */
function getSuitDisplay(suit: string | null): string {
  if (!suit) return '';
  const suitMap: Record<string, string> = {
    WAN: '万',
    TIAO: '条',
    TONG: '筒',
  };
  return suitMap[suit] || suit;
}

/**
 * 渲染明牌组合
 */
function renderMelds(melds: Meld[], orientation: 'horizontal' | 'vertical') {
  if (melds.length === 0) return null;

  return (
    <div className={`flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} gap-2`}>
      {melds.map((meld, meldIndex) => (
        <div
          key={meldIndex}
          className={`flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} gap-0.5 bg-green-100 p-1 rounded border border-green-400`}
        >
          {meld.tiles.map((tile, tileIndex) => (
            <div
              key={tileIndex}
              className="w-8 h-10 flex items-center justify-center bg-white text-xs font-bold rounded border border-gray-300"
            >
              {getTileDisplay(tile)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * 渲染AI手牌（背面）
 */
function renderAIHand(handCount: number, orientation: 'horizontal' | 'vertical') {
  return (
    <div className={`flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} gap-1`}>
      {Array.from({ length: handCount }).map((_, i) => (
        <div
          key={i}
          className="w-8 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded border-2 border-gray-600 shadow-sm"
          title="手牌（背面）"
        />
      ))}
    </div>
  );
}

export function PlayerArea({
  player,
  position,
  isCurrentTurn,
  isHuman = false,
  onDiscard,
  disabled = false,
}: PlayerAreaProps) {
  const orientation = position === 'left' || position === 'right' ? 'vertical' : 'horizontal';
  const handCount = player.hand?.length || player.handCount || 0;

  return (
    <div
      className={`
        flex gap-3 p-3 rounded-lg border-2 transition-all
        ${isCurrentTurn ? 'border-yellow-500 bg-yellow-50 shadow-lg' : 'border-gray-300 bg-white shadow-md'}
        ${position === 'top' && 'flex-col items-center'}
        ${position === 'bottom' && 'flex-col items-center'}
        ${position === 'left' && 'flex-row items-center'}
        ${position === 'right' && 'flex-row-reverse items-center'}
      `}
    >
      {/* 玩家信息栏 */}
      <div className={`flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} items-center gap-2 text-sm`}>
        <div className="font-bold text-gray-800">
          {isHuman ? '你' : player.playerId}
        </div>
        {player.missingSuit && (
          <div className="text-red-600 font-semibold">
            缺{getSuitDisplay(player.missingSuit)}
          </div>
        )}
        {player.isHu && (
          <div className="text-yellow-600 font-semibold text-xs">
            已胡
          </div>
        )}
        <div className="text-gray-600 text-xs">
          {handCount}张
        </div>
      </div>

      {/* 手牌区域 */}
      {!isHuman && renderAIHand(handCount, orientation)}

      {/* 明牌区域 */}
      {player.melds && renderMelds(player.melds, orientation)}
    </div>
  );
}

export default PlayerArea;
