/**
 * PlayerHand Component
 *
 * 显示玩家手牌，支持点击选中/取消选中
 * Phase 3: 暂用文字显示牌面（如 "万1"）
 * Phase 8: 将使用 Canvas 渲染真实麻将牌
 */

import { getTileId } from '@/types';
import type { Tile, Meld } from '@/types';

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

interface PlayerHandProps {
  /**
   * 玩家手牌
   */
  hand: Tile[];
  /**
   * 玩家明牌（碰/杠）
   */
  melds?: Meld[];
  /**
   * 选中的牌（埋牌阶段使用）
   */
  selectedTiles?: Tile[];
  /**
   * 是否可以选择（埋牌阶段为 true）
   */
  selectable?: boolean;
  /**
   * 点击牌的回调（埋牌阶段使用）
   */
  onTileClick?: (tile: Tile) => void;
  /**
   * 出牌回调（出牌阶段使用）
   */
  onDiscard?: (tile: Tile) => void;
  /**
   * 是否为玩家回合（出牌阶段使用）
   */
  isPlayerTurn?: boolean;
  /**
   * 玩家缺门花色（用于出牌验证）
   */
  missingSuit?: string | null;
  /**
   * 是否禁用交互（防重复提交）
   */
  disabled?: boolean;
  /**
   * 玩家是否已胡牌（血战到底规则）
   */
  isHu?: boolean;
}

interface PlayerHandInternalProps extends PlayerHandProps {
  /**
   * 检查牌是否被选中（基于索引）
   */
  isSelectedByIndex?: (index: number) => boolean;
  /**
   * 点击牌回调（带索引）
   */
  onTileClickWithIndex?: (tile: Tile, index: number) => void;
}

export function PlayerHand({
  hand,
  melds = [],
  selectedTiles = [],
  selectable = false,
  onTileClick,
  onDiscard,
  isPlayerTurn = false,
  missingSuit = null,
  disabled = false,
  isHu = false,
  isSelectedByIndex,
  onTileClickWithIndex,
}: PlayerHandInternalProps) {
  // 手牌排序：按花色(WAN=1, TIAO=2, TONG=3)和点数排序
  // 同时创建索引映射：sortedIndex -> originalIndex
  const suitOrder: Record<string, number> = { WAN: 1, TIAO: 2, TONG: 3 };
  const indexedHand = hand.map((tile, originalIndex) => ({ tile, originalIndex }));
  const sortedIndexedHand = [...indexedHand].sort((a, b) => {
    const suitA = suitOrder[a.tile.suit] || 0;
    const suitB = suitOrder[b.tile.suit] || 0;
    if (suitA !== suitB) return suitA - suitB;
    return a.tile.rank - b.tile.rank;
  });

  // 兼容旧版：使用 getTileId() 判断选中（会有重复牌的问题）
  const selectedTileIds = new Set(
    selectedTiles.map((tile) => getTileId(tile))
  );

  const handleTileClick = (tile: Tile, index: number) => {
    // T053: 防重复提交 - 禁用时不响应点击
    if (disabled) return;

    // 埋牌阶段：选择牌
    if (selectable) {
      // 优先使用基于索引的 API
      if (onTileClickWithIndex) {
        onTileClickWithIndex(tile, index);
        return;
      }
      // 兼容旧版（有 bug）
      if (onTileClick) {
        onTileClick(tile);
        return;
      }
    }

    // 出牌阶段：打出牌
    if (isPlayerTurn && onDiscard) {
      onDiscard(tile);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 手牌区域 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">
          我的手牌（{hand.length}张）
          {selectable && (
            <span className="ml-2 text-sm text-blue-600 font-normal">
              - 请选择3张埋牌
            </span>
          )}
          {!selectable && isHu && (
            <span className="ml-2 text-sm text-yellow-600 font-normal">
              - 已胡牌，摸什么打什么
            </span>
          )}
          {!selectable && !isHu && isPlayerTurn && (
            <span className="ml-2 text-sm text-green-600 font-normal">
              - 请出牌
            </span>
          )}
          {!selectable && !isHu && !isPlayerTurn && (
            <span className="ml-2 text-sm text-gray-500 font-normal">
              - 等待AI
            </span>
          )}
        </h3>
        <div className="flex flex-wrap gap-2">
          {sortedIndexedHand.length === 0 ? (
            <p className="text-gray-500">暂无手牌</p>
          ) : (
            sortedIndexedHand.map(({ tile, originalIndex }, sortedIndex) => {
              const tileId = getTileId(tile);
              // 优先使用基于索引的选中判断（使用原始索引）
              const isSelected = isSelectedByIndex
                ? isSelectedByIndex(originalIndex)
                : selectedTileIds.has(tileId);
              const key = `${tileId}-${originalIndex}`;

              return (
                <button
                  key={key}
                  onClick={() => handleTileClick(tile, originalIndex)}
                  disabled={disabled || (!selectable && !isPlayerTurn)}
                  className={`
                    px-4 py-2 rounded-md font-semibold text-lg
                    border-2 transition-all
                    ${
                      isSelected
                        ? 'bg-blue-500 text-white border-blue-600 transform -translate-y-2'
                        : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                    }
                    ${disabled || (!selectable && !isPlayerTurn) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                    ${disabled || (!selectable && !isPlayerTurn) ? 'hover:bg-gray-100' : ''}
                  `}
                  title={tileId}
                >
                  {getTileDisplay(tile)}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 明牌区域（碰/杠） */}
      {melds.length > 0 && (
        <div>
          <h4 className="text-md font-semibold mb-2">明牌</h4>
          <div className="flex flex-wrap gap-4">
            {melds.map((meld, meldIndex) => (
              <div
                key={meldIndex}
                className="flex gap-1 bg-green-50 p-2 rounded-md border border-green-300"
              >
                {meld.tiles.map((tile, tileIndex) => (
                  <div
                    key={tileIndex}
                    className="px-3 py-1 bg-white text-gray-800 font-semibold rounded border border-gray-300"
                  >
                    {getTileDisplay(tile)}
                  </div>
                ))}
                <div className="ml-1 text-xs text-gray-600 self-center">
                  {meld.meldType === 'PONG' && '碰'}
                  {meld.meldType === 'KONG' && '杠'}
                  {meld.meldType === 'KONG_EXPOSED' && '明杠'}
                  {meld.meldType === 'KONG_CONCEALED' && '暗杠'}
                  {meld.meldType === 'KONG_UPGRADE' && '补杠'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerHand;
