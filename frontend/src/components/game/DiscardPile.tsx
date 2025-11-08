/**
 * DiscardPile Component (Phase 4: User Story 2 - 出牌并观察AI响应)
 *
 * 显示弃牌堆，按时间倒序堆叠显示
 * - 最新的牌带黄色高亮边框
 * - Phase 4: 暂用文字显示牌面（如 "万1"）
 * - Phase 8: 将使用 Canvas 渲染真实麻将牌
 */

import type { Tile } from '@/types';

/**
 * 将花色枚举转换为中文显示
 */
function getSuitDisplay(suit: string): string {
  const suitMap: Record<string, string> = {
    WAN: '万',
    TIAO: '条',
    TONG: '筒',
  };
  return suitMap[suit] || suit;
}

/**
 * 获取牌面显示文字
 */
function getTileDisplay(tile: Tile): string {
  return `${getSuitDisplay(tile.suit)}${tile.rank}`;
}

interface DiscardPileProps {
  /**
   * 弃牌堆
   */
  discardPile: Tile[];
  /**
   * 最大显示数量（默认显示全部）
   */
  maxDisplay?: number;
}

export function DiscardPile({ discardPile, maxDisplay }: DiscardPileProps) {
  // 按时间倒序（最新在前）
  const displayedTiles = maxDisplay
    ? discardPile.slice(-maxDisplay).reverse()
    : [...discardPile].reverse();

  if (discardPile.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-3">弃牌堆</h3>
        <p className="text-gray-500 text-center py-8">暂无弃牌</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-3">
        弃牌堆 <span className="text-sm text-gray-500">({discardPile.length}张)</span>
      </h3>

      <div className="flex flex-wrap gap-2">
        {displayedTiles.map((tile, index) => {
          // 最新的牌（reverse后index=0）
          const isLatest = index === 0;

          return (
            <div
              key={`${tile.suit}-${tile.rank}-${discardPile.length - index}`}
              className={`
                px-4 py-2 rounded-md font-semibold text-lg
                border-2 transition-all
                ${
                  isLatest
                    ? 'bg-yellow-100 border-yellow-500 shadow-lg'
                    : 'bg-gray-100 border-gray-300'
                }
              `}
              title={isLatest ? '最新弃牌' : ''}
            >
              {getTileDisplay(tile)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DiscardPile;
