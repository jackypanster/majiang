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
 * 获取玩家显示名称（用于倒三角标识）
 */
function getPlayerDisplay(playerId: string): string {
  const playerMap: Record<string, string> = {
    human: '你',
    ai_1: 'AI1',
    ai_2: 'AI2',
    ai_3: 'AI3',
  };
  return playerMap[playerId] || playerId;
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
        <div className="grid grid-cols-10 gap-2 overflow-y-auto p-3 bg-white/50 rounded w-full h-full content-start">
          {displayedDiscards.length === 0 ? (
            <div className="col-span-10 text-center text-xs text-gray-400 py-4">
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
                  className="relative flex flex-col items-center"
                >
                  {/* 玩家指示器（倒三角）- 只在最新弃牌上显示 */}
                  {isLatest && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-red-600 flex flex-col items-center">
                      <span>{getPlayerDisplay(discardedTile.playerId)}</span>
                      <span className="text-lg leading-none">▼</span>
                    </div>
                  )}

                  {/* 弃牌 */}
                  <div
                    className={`
                      w-14 h-16 flex items-center justify-center
                      bg-white text-base font-bold rounded border-2
                      transition-all duration-300
                      ${isLatest ? 'border-yellow-400 shadow-md scale-105' : 'border-gray-300'}
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
