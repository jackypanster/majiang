/**
 * CenterArea Component
 *
 * 中央区域组件，显示弃牌堆、剩余牌数、游戏阶段等信息
 * 位于麻将桌中央，四个玩家环绕
 */

import { getTileDisplay } from '@/utils/tileUtils';
import type { DiscardedTile } from '@/types';

interface CenterAreaProps {
  /**
   * 所有玩家的弃牌列表（按时间顺序，包含打牌者信息）
   */
  publicDiscards: DiscardedTile[];
  /**
   * 牌墙剩余数量
   */
  wallRemaining: number;
  /**
   * 当前游戏阶段
   */
  gamePhase: string;
  /**
   * 最多显示多少张弃牌（默认显示所有）
   */
  maxDisplay?: number;
}

/**
 * 获取游戏阶段显示文本
 */
function getPhaseDisplay(phase: string): string {
  const phaseMap: Record<string, string> = {
    BURYING: '埋牌阶段',
    PLAYING: '游戏中',
    ENDED: '已结束',
  };
  return phaseMap[phase] || phase;
}

/**
 * 获取玩家简短标识（用于弃牌标签）
 */
function getPlayerLabel(playerId: string): string {
  const labelMap: Record<string, string> = {
    human: '人',
    ai_1: '上',
    ai_2: '对',
    ai_3: '下',
  };
  return labelMap[playerId] || playerId;
}

/**
 * 获取玩家标签背景颜色
 */
function getPlayerLabelColor(playerId: string): string {
  const colorMap: Record<string, string> = {
    human: 'bg-blue-500 text-white',
    ai_1: 'bg-green-500 text-white',
    ai_2: 'bg-red-500 text-white',
    ai_3: 'bg-amber-500 text-white',
  };
  return colorMap[playerId] || 'bg-gray-500 text-white';
}

/**
 * 获取玩家牌边框颜色
 */
function getPlayerBorderColor(playerId: string): string {
  const borderMap: Record<string, string> = {
    human: 'border-blue-400',
    ai_1: 'border-green-400',
    ai_2: 'border-red-400',
    ai_3: 'border-amber-400',
  };
  return borderMap[playerId] || 'border-gray-400';
}

export function CenterArea({
  publicDiscards,
  wallRemaining,
  gamePhase,
  maxDisplay,
}: CenterAreaProps) {
  // 计算要显示的弃牌（最新的在前）
  const displayedDiscards = maxDisplay
    ? publicDiscards.slice(-maxDisplay).reverse()
    : [...publicDiscards].reverse();

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border-2 border-green-300 shadow-inner h-full">
      {/* 游戏状态信息 - 紧凑显示 */}
      <div className="flex items-center gap-4">
        <div className="text-sm font-semibold text-gray-700">
          {getPhaseDisplay(gamePhase)}
        </div>
        <div className="text-xs text-gray-600">
          剩余牌数: <span className="font-bold text-green-700">{wallRemaining}</span>
        </div>
      </div>

      {/* 弃牌堆 - 占据大部分空间 */}
      <div className="flex flex-col items-center gap-2 w-full flex-1 min-h-0">
        <div className="text-xs font-semibold text-gray-600">弃牌堆</div>
        <div className="flex flex-wrap gap-0.5 overflow-y-auto p-3 bg-white/50 rounded w-full h-full content-start">
          {displayedDiscards.length === 0 ? (
            <div className="w-full text-center text-xs text-gray-400 py-4">
              暂无弃牌
            </div>
          ) : (
            displayedDiscards.map((discardedTile, index) => {
              // 最新的弃牌（索引0）高亮显示
              const isLatest = index === 0;
              const actualIndex = publicDiscards.length - 1 - index;

              return (
                <div
                  key={`${discardedTile.tile.suit}-${discardedTile.tile.rank}-${actualIndex}`}
                  className="relative flex flex-col items-center w-14"
                >
                  {/* 玩家标识标签 - 每张牌都显示 */}
                  <div
                    className={`
                      absolute -top-4 left-1/2 -translate-x-1/2
                      text-xs font-bold px-1.5 py-0.5 rounded-sm
                      ${getPlayerLabelColor(discardedTile.playerId)}
                    `}
                  >
                    {getPlayerLabel(discardedTile.playerId)}
                  </div>

                  {/* 最新弃牌的倒三角指示器 */}
                  {isLatest && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-yellow-500 text-lg leading-none">
                      ▼
                    </div>
                  )}

                  {/* 弃牌 */}
                  <div
                    className={`
                      w-14 h-16 flex items-center justify-center
                      bg-white text-base font-bold rounded border-2
                      transition-all duration-300
                      ${getPlayerBorderColor(discardedTile.playerId)}
                      ${isLatest ? 'shadow-md scale-105 ring-2 ring-yellow-400' : ''}
                    `}
                    style={{
                      animation: `fadeIn 0.3s ease-out ${index * 0.05}s backwards`,
                    }}
                  >
                    {getTileDisplay(discardedTile.tile)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 动画定义 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default CenterArea;
