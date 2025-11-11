/**
 * PlayerHand Component
 *
 * 显示玩家手牌，支持点击选中/取消选中
 * T090: 使用 Canvas 渲染真实麻将牌（替换文字显示）
 */

import { getTileId } from '@/types';
import type { Tile, Meld } from '@/types';
import { INFO_LABELS } from '@/utils/messages';
import { TileCanvas } from '@/components/canvas/TileCanvas';
import { TILE_WIDTH, TILE_HEIGHT } from '@/utils/constants';

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
   * 玩家胡牌（已经胡过的牌，血战到底模式）
   */
  huTiles?: Tile[];
  /**
   * 玩家埋的3张牌（游戏开始时埋牌）
   */
  buriedCards?: Tile[];
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
  /**
   * 最后摸的牌（用于"摸什么打什么"高亮显示）
   */
  lastDrawnTile?: Tile | null;
  /**
   * 手牌是否锁定（血战到底模式，第一次胡牌后手牌锁定）
   */
  isHandLocked?: boolean;
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
  huTiles = [],
  buriedCards = [],
  selectedTiles = [],
  selectable = false,
  onTileClick,
  onDiscard,
  isPlayerTurn = false,
  missingSuit = null,
  disabled = false,
  isHu = false,
  lastDrawnTile = null,
  isHandLocked = false,
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

  // 找到第一个匹配 lastDrawnTile 的牌的索引（避免重复标记）
  const firstMatchingIndex = lastDrawnTile
    ? hand.findIndex(t => t.suit === lastDrawnTile.suit && t.rank === lastDrawnTile.rank)
    : -1;

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
    <div className="flex flex-row gap-4 items-start">
      {/* 埋牌区域 - 最左侧 */}
      {buriedCards.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-gray-700">
            埋牌
            {missingSuit && (
              <span className="ml-2 text-xs text-red-600 font-normal">
                (缺{missingSuit === 'WAN' ? '万' : missingSuit === 'TIAO' ? '条' : '筒'})
              </span>
            )}
          </h4>
          <div className="flex flex-row gap-1 bg-orange-50 p-2 rounded-md border border-orange-300">
            {buriedCards.map((tile, index) => (
              <div
                key={index}
                className="rounded border border-orange-400 overflow-hidden"
              >
                <TileCanvas
                  tile={tile}
                  width={TILE_WIDTH * 0.9}
                  height={TILE_HEIGHT * 0.9}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 明牌区域（碰/杠） */}
      {melds.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-gray-700">明牌</h4>
          <div className="flex flex-row gap-2">
            {melds.map((meld, meldIndex) => (
              <div
                key={meldIndex}
                className="flex gap-1 bg-green-50 p-2 rounded-md border border-green-300"
              >
                {meld.tiles.map((tile, tileIndex) => (
                  <div
                    key={tileIndex}
                    className="rounded border border-gray-300 overflow-hidden"
                  >
                    <TileCanvas
                      tile={tile}
                      width={TILE_WIDTH * 0.9}
                      height={TILE_HEIGHT * 0.9}
                    />
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

      {/* 手牌区域 - 中间 - T077: 添加手牌锁定 UI 标识 */}
      <div className={`flex flex-col gap-2 flex-1 ${isHandLocked ? 'relative' : ''}`}>
        {/* T077: 手牌锁定标识 - 显著的视觉提示 */}
        {isHandLocked && (
          <div className="absolute -top-2 -left-2 -right-2 -bottom-2 border-4 border-red-500 rounded-lg pointer-events-none z-10 animate-pulse"></div>
        )}

        <h3 className="text-sm font-semibold text-gray-700">
          我的手牌（{hand.length}张）
          {/* T077: 手牌锁定标签 */}
          {isHandLocked && (
            <span className="ml-2 px-2 py-0.5 text-xs font-bold text-white bg-red-600 rounded border-2 border-red-700">
              🔒 {INFO_LABELS.HAND_LOCKED}
            </span>
          )}
          {selectable && (
            <span className="ml-2 text-xs text-blue-600 font-normal">
              - 请选择3张埋牌
            </span>
          )}
          {!selectable && isHu && !isHandLocked && (
            <span className="ml-2 text-xs text-yellow-600 font-normal">
              - 已胡牌，摸什么打什么
            </span>
          )}
          {!selectable && !isHu && isPlayerTurn && (
            <span className="ml-2 text-xs text-green-600 font-normal">
              - 请出牌
            </span>
          )}
          {!selectable && !isHu && !isPlayerTurn && (
            <span className="ml-2 text-xs text-gray-500 font-normal">
              - 等待AI
            </span>
          )}
        </h3>
        <div className="flex flex-nowrap gap-4 overflow-x-auto mt-4">
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

              // 判断是否是最后摸的牌（只标记第一个匹配的，避免重复标记）
              const isLastDrawn = originalIndex === firstMatchingIndex;

              // T078: 手牌锁定状态出牌限制
              // 手牌锁定后：只能打出最后摸的牌（摸什么打什么），其他暗牌禁用点击
              const isLockedTile = isHandLocked && !isLastDrawn;
              const canClick = !disabled && !isLockedTile && (selectable || isPlayerTurn);

              return (
                <div key={key} className={`relative flex flex-col items-center ${selectable && isSelected ? 'pt-16' : 'pt-4'}`}>
                  {/* T079: 最新摸牌标识 - 显示向下箭头和动画效果 */}
                  {isLastDrawn && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-green-600 animate-bounce z-10">
                      <span className="text-xl leading-none drop-shadow-lg">▼</span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap bg-green-600 text-white px-1 rounded">
                        新摸
                      </div>
                    </div>
                  )}

                  {/* T090: Canvas 渲染麻将牌 */}
                  <div
                    className={`
                      rounded-md transition-all
                      ${
                        isSelected
                          ? 'transform -translate-y-2'
                          : isLockedTile
                            ? 'opacity-50'
                            : isLastDrawn
                              ? 'ring-4 ring-green-400 shadow-lg shadow-green-300'
                              : 'hover:ring-2 ring-gray-300'
                      }
                    `}
                    title={isLockedTile ? `${tileId} (已锁定)` : isLastDrawn ? `${tileId} (刚摸的牌 - ${isHandLocked ? '手牌锁定时必须打出' : '可以打出'})` : tileId}
                  >
                    <TileCanvas
                      tile={tile}
                      onClick={canClick ? () => handleTileClick(tile, originalIndex) : undefined}
                      isSelected={isSelected}
                      isDisabled={isLockedTile}
                      width={TILE_WIDTH}
                      height={TILE_HEIGHT}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 胡牌区域（已经胡过的牌，血战到底模式） - 最右侧 */}
      {huTiles.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-gray-700">
            已胡牌
            <span className="ml-2 text-xs text-yellow-600 font-normal">
              (血战到底)
            </span>
          </h4>
          <div className="flex flex-row gap-2">
            {huTiles.map((tile, index) => (
              <div
                key={index}
                className="rounded-md border-2 border-yellow-400 overflow-hidden"
              >
                <TileCanvas
                  tile={tile}
                  width={TILE_WIDTH * 0.9}
                  height={TILE_HEIGHT * 0.9}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerHand;
