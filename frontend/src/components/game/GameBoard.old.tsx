/**
 * Game Board Component (Main Game UI Container)
 *
 * Phase 2: Basic skeleton
 * Phase 3-8: Will be enhanced with full game features
 */

import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { useUIStore, useGameStore } from '@/stores';
import { gameApi } from '@/services/api';
import { BUTTON_LABELS } from '@/utils/messages';
import { logger } from '@/utils/logger';

export function GameBoard() {
  const [isCreating, setIsCreating] = useState(false);
  const gameId = useGameStore((s) => s.gameId);
  const gameState = useGameStore((s) => s.gameState);
  const setGameId = useGameStore((s) => s.setGameId);
  const setGameState = useGameStore((s) => s.setGameState);
  const showToast = useUIStore((s) => s.showToast);
  const showModal = useUIStore((s) => s.showModal);

  const handleStartGame = async () => {
    setIsCreating(true);
    logger.log('Creating new game...');

    try {
      const response = await gameApi.createGame();

      logger.log('Game created successfully', { gameId: response.gameId });

      setGameId(response.gameId);
      setGameState(response.state);

      showToast({
        type: 'success',
        message: `游戏创建成功！游戏ID: ${response.gameId}`,
        duration: 3000
      });

      logger.setContext({ gameId: response.gameId, playerId: 'human' });
    } catch (error) {
      logger.error('Failed to create game', error);

      showModal({
        title: '创建游戏失败',
        content: error instanceof Error ? error.message : '未知错误',
        confirmText: '重试',
        onConfirm: () => handleStartGame()
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Welcome screen (before game starts)
  if (!gameId || !gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <div className="bg-white rounded-lg shadow-2xl p-12 max-w-md text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            血战到底麻将
          </h1>
          <p className="text-gray-600 mb-8">
            1真人 + 3AI 对战模式
          </p>

          <div className="space-y-4">
            <Button
              onClick={handleStartGame}
              disabled={isCreating}
              variant="primary"
              className="w-full text-lg py-3"
            >
              {isCreating ? '创建中...' : BUTTON_LABELS.START_GAME}
            </Button>

            <div className="text-sm text-gray-500 mt-6">
              <p>游戏规则：</p>
              <ul className="text-left mt-2 space-y-1">
                <li>• 开局定缺埋牌（3张同花色）</li>
                <li>• 血战到底（胡牌后继续游戏）</li>
                <li>• 手牌锁定（胡牌后摸什么打什么）</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Phase 2: 基础设施已完成 ✅</p>
          <p className="mt-1">Phase 3-8: 游戏功能开发中...</p>
        </div>
      </div>
    );
  }

  // Game screen (after game starts)
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">游戏进行中</h2>
              <p className="text-sm text-gray-500 mt-1">游戏ID: {gameId}</p>
            </div>
            <Button
              onClick={() => {
                if (confirm('确定要重新开始吗？')) {
                  window.location.reload();
                }
              }}
              variant="secondary"
            >
              重新开始
            </Button>
          </div>
        </div>

        {/* Game State Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">游戏状态</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">游戏阶段</p>
              <p className="text-lg font-medium">{gameState.gamePhase}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">当前回合</p>
              <p className="text-lg font-medium">玩家 {gameState.currentPlayerIndex}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">牌墙剩余</p>
              <p className="text-lg font-medium">{gameState.wallRemainingCount} 张</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">玩家数量</p>
              <p className="text-lg font-medium">{gameState.players.length} 人</p>
            </div>
          </div>

          {/* Player Info */}
          <div className="mt-6">
            <h4 className="text-md font-semibold mb-3">玩家信息</h4>
            <div className="space-y-2">
              {gameState.players.map((player, index) => (
                <div
                  key={player.playerId}
                  className={`p-3 rounded ${
                    index === gameState.currentPlayerIndex
                      ? 'bg-blue-50 border-2 border-blue-300'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {player.playerId}
                      {index === gameState.currentPlayerIndex && ' ⬅️ 当前回合'}
                    </span>
                    <span>分数: {player.score}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    手牌: {player.hand ? player.hand.length : player.handCount} 张
                    {player.missingSuit && ` | 缺门: ${player.missingSuit}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Development Info */}
          <div className="mt-6 p-4 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>开发状态：</strong>Phase 2 基础设施已完成。
              游戏UI组件（埋牌、出牌、碰杠胡等）将在 Phase 3-8 中实现。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameBoard;
