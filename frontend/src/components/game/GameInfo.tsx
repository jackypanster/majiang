/**
 * GameInfo Component (Phase 6: User Story 4 - 游戏信息面板)
 *
 * 显示游戏全局信息：
 * - 当前回合玩家（带高亮）
 * - 剩余牌数
 * - 所有玩家分数（实时更新，带动画）
 * - 游戏阶段
 */

import { useState, useEffect } from 'react';
import type { Player } from '@/types';

interface GameInfoProps {
  /**
   * 当前回合玩家索引
   */
  currentPlayerIndex: number;
  /**
   * 所有玩家信息
   */
  players: Player[];
  /**
   * 牌墙剩余数量
   */
  wallRemaining: number;
  /**
   * 当前游戏阶段
   */
  gamePhase: string;
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
 * 获取玩家显示名称
 */
function getPlayerName(playerId: string): string {
  const nameMap: Record<string, string> = {
    human: '你',
    ai_1: 'AI 1',
    ai_2: 'AI 2',
    ai_3: 'AI 3',
  };
  return nameMap[playerId] || playerId;
}

export function GameInfo({
  currentPlayerIndex,
  players,
  wallRemaining,
  gamePhase,
}: GameInfoProps) {
  // 记录每个玩家的上一个分数，用于动画
  const [prevScores, setPrevScores] = useState<Map<string, number>>(
    new Map(players.map(p => [p.playerId, p.score]))
  );
  const [scoreAnimations, setScoreAnimations] = useState<Map<string, 'increase' | 'decrease' | null>>(
    new Map()
  );

  // 监听分数变化
  useEffect(() => {
    const newAnimations = new Map<string, 'increase' | 'decrease' | null>();
    const newPrevScores = new Map<string, number>();

    players.forEach(player => {
      const prevScore = prevScores.get(player.playerId) ?? player.score;
      newPrevScores.set(player.playerId, player.score);

      if (player.score !== prevScore) {
        const change = player.score - prevScore;
        if (change > 0) {
          newAnimations.set(player.playerId, 'increase');
        } else if (change < 0) {
          newAnimations.set(player.playerId, 'decrease');
        }
      }
    });

    setScoreAnimations(newAnimations);
    setPrevScores(newPrevScores);

    // 0.5秒后清除动画
    if (newAnimations.size > 0) {
      const timer = setTimeout(() => {
        setScoreAnimations(new Map());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [players]);

  // 获取当前玩家
  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border-2 border-gray-200 p-3">
      {/* 横向紧凑布局 */}
      <div className="flex items-center gap-4">
        {/* 游戏阶段 + 剩余牌数 */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">阶段:</span>
            <span className="font-bold text-gray-800">{getPhaseDisplay(gamePhase)}</span>
          </div>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">剩余:</span>
            <span className="font-bold text-green-700">{wallRemaining}张</span>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-300"></div>

        {/* 当前回合 */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-lg leading-none">👉</span>
          <span className="font-bold text-yellow-700">
            {currentPlayer ? getPlayerName(currentPlayer.playerId) : '—'}
          </span>
        </div>

        <div className="h-6 w-px bg-gray-300"></div>

        {/* 玩家分数列表 - 横向排列 */}
        <div className="flex items-center gap-2">
          {players.map((player, index) => {
            const isCurrentTurn = index === currentPlayerIndex;
            const animation = scoreAnimations.get(player.playerId);

            return (
              <div
                key={player.playerId}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded text-xs
                  transition-all duration-200
                  ${isCurrentTurn ? 'bg-yellow-50 border border-yellow-300' : 'bg-gray-50'}
                `}
              >
                <span className={`font-semibold ${isCurrentTurn ? 'text-yellow-800' : 'text-gray-700'}`}>
                  {getPlayerName(player.playerId)}
                </span>
                {player.isHu && (
                  <span className="text-yellow-600 font-bold text-xs">胡</span>
                )}
                <div
                  className={`
                    font-bold px-1 py-0.5 rounded transition-colors duration-500
                    ${animation === 'increase' ? 'bg-green-200 text-green-800' : ''}
                    ${animation === 'decrease' ? 'bg-red-200 text-red-800' : ''}
                    ${!animation ? 'text-gray-700' : ''}
                  `}
                >
                  {player.score}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default GameInfo;
