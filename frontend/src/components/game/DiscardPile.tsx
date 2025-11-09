/**
 * DiscardPile Component (Phase 4: User Story 2 - 出牌并观察AI响应)
 *
 * 显示弃牌堆，按时间倒序堆叠显示
 * - 最新的牌带黄色高亮边框
 * - 添加出牌动画：AI连续出牌时逐帧显示，每张牌延迟600ms
 * - Phase 4: 暂用文字显示牌面（如 "万1"）
 * - Phase 8: 将使用 Canvas 渲染真实麻将牌
 */

import { useState, useEffect } from 'react';
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
  // Track how many tiles should be visible (for animation)
  const [visibleCount, setVisibleCount] = useState(discardPile.length);

  // Detect new tiles and trigger progressive reveal
  useEffect(() => {
    if (discardPile.length > visibleCount) {
      // New tiles added, reveal them one by one
      const newTilesCount = discardPile.length - visibleCount;

      // Reveal tiles progressively with 600ms delay each
      for (let i = 0; i < newTilesCount; i++) {
        setTimeout(() => {
          setVisibleCount((prev) => prev + 1);
        }, i * 600);
      }
    } else if (discardPile.length < visibleCount) {
      // Instant update if tiles decreased (e.g., game reset)
      setVisibleCount(discardPile.length);
    }
  }, [discardPile.length, visibleCount]);

  // Only show visible tiles (for animation)
  const tilesToDisplay = discardPile.slice(0, visibleCount);

  // 按时间倒序（最新在前）
  const displayedTiles = maxDisplay
    ? tilesToDisplay.slice(-maxDisplay).reverse()
    : [...tilesToDisplay].reverse();

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

      <div className="flex flex-wrap gap-1">
        {displayedTiles.map((tile, index) => {
          // 最新的牌（reverse后index=0）
          const isLatest = index === 0;
          // Currently revealing tile (just appeared)
          const isRevealing = discardPile.length - index === visibleCount;

          return (
            <div
              key={`${tile.suit}-${tile.rank}-${discardPile.length - index}`}
              className={`
                px-4 py-2 rounded-md font-semibold text-lg
                border-2 transition-all duration-300
                ${
                  isLatest
                    ? 'bg-yellow-100 border-yellow-500 shadow-lg'
                    : 'bg-gray-100 border-gray-300'
                }
                ${isRevealing ? 'animate-fade-in' : ''}
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
