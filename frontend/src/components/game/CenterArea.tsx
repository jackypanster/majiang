/**
 * CenterArea Component
 *
 * 中央区域组件，显示弃牌堆、剩余牌数、游戏阶段等信息
 * 位于麻将桌中央，四个玩家环绕
 */

import { getTileDisplay } from '@/utils/tileUtils';
import type { Tile } from '@/types';

interface CenterAreaProps {
  /**
   * 所有玩家的弃牌列表（按时间顺序）
   */
  publicDiscards: Tile[];
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
    <div className="flex flex-col items-center justify-center gap-4 p-4 rounded-lg border-2 border-green-300 shadow-inner">
      {/* 游戏状态信息 */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-sm font-semibold text-gray-700">
          {getPhaseDisplay(gamePhase)}
        </div>
        <div className="text-xs text-gray-600">
          剩余牌数: <span className="font-bold text-green-700">{wallRemaining}</span>
        </div>
      </div>

      {/* 弃牌堆 */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="text-xs font-semibold text-gray-600">弃牌堆</div>
        <div className="grid grid-cols-6 gap-1.5 max-h-[300px] overflow-y-auto p-2 bg-white/50 rounded">
          {displayedDiscards.length === 0 ? (
            <div className="col-span-6 text-center text-xs text-gray-400 py-4">
              暂无弃牌
            </div>
          ) : (
            displayedDiscards.map((tile, index) => {
              // 最新的弃牌（索引0）高亮显示
              const isLatest = index === 0;
              const actualIndex = publicDiscards.length - 1 - index;

              return (
                <div
                  key={`${tile.suit}-${tile.rank}-${actualIndex}`}
                  className={`
                    w-12 h-14 flex items-center justify-center
                    bg-white text-sm font-bold rounded border-2
                    transition-all duration-300
                    ${isLatest ? 'border-yellow-400 shadow-md scale-105' : 'border-gray-300'}
                  `}
                  style={{
                    animation: `fadeIn 0.3s ease-out ${index * 0.05}s backwards`,
                  }}
                >
                  {getTileDisplay(tile)}
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
