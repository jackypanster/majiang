/**
 * Game Board Component (Phase 3: User Story 1 - 定缺埋牌)
 *
 * 主游戏界面容器，包含：
 * - 开始游戏按钮和欢迎界面
 * - 埋牌阶段：选择3张同花色牌
 * - 游戏进行阶段：显示游戏状态
 * - 错误处理和窗口尺寸检测
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { PlayerHand } from './PlayerHand';
import { PlayerArea } from './PlayerArea';
import { CenterArea } from './CenterArea';
import { ActionButtons } from './ActionButtons';
import { KongButtons } from './KongButtons';
import { useUIStore, useGameStore } from '@/stores';
import { gameApi } from '@/services/api';
import { useGameState } from '@/hooks/useGameState';
import { usePlayerAction } from '@/hooks/usePlayerAction';
import { useTileSelection } from '@/hooks/useTileSelection';
import { validateBuryCards } from '@/utils/buryValidation';
import { validateDiscard } from '@/utils/discardValidation';
import { detectAvailableActions } from '@/utils/availableActions';
import { detectKongOptions } from '@/utils/kongDetection';
import { BUTTON_LABELS, MODAL_TITLES, INFO_LABELS } from '@/utils/messages';
import { logger } from '@/utils/logger';
import { GamePhase } from '@/types';
import type { Tile } from '@/types';

const MIN_WINDOW_WIDTH = 1280;
const MIN_WINDOW_HEIGHT = 720;

export function GameBoard() {
  const [isCreating, setIsCreating] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  // T063-T064: 胡牌结果弹窗状态
  const [showWinModal, setShowWinModal] = useState(false);
  const [winDetails, setWinDetails] = useState<{
    isBloodBattle: boolean;
    winners: Array<{ playerId: string; fanCount: number; scoreChange: number }>;
  } | null>(null);

  const gameId = useGameStore((s) => s.gameId);
  const setGameId = useGameStore((s) => s.setGameId);
  const setPlayerTurn = useGameStore((s) => s.setPlayerTurn);
  const showToast = useUIStore((s) => s.showToast);
  const showModal = useUIStore((s) => s.showModal);

  // 麻将牌选择（用于埋牌）
  const {
    selectedTiles,
    toggleTileByIndex,
    isSelectedByIndex,
    clearSelection,
  } = useTileSelection({ maxSelection: 3 });

  // 获取游戏状态（使用 TanStack Query）
  const {
    data: gameStateData,
    isLoading: isLoadingState,
    error: stateError,
  } = useGameState(gameId, 'human', {
    enabled: !!gameId,
  });

  // 处理游戏404错误（游戏已结束并被清理）
  useEffect(() => {
    if (stateError && (stateError as any)?.response?.status === 404) {
      showModal({
        title: '游戏已结束',
        content: '游戏已结束并被清理。请开始新游戏。',
        confirmText: '开始新游戏',
        onConfirm: () => {
          setGameId(null);
        },
      });
    }
  }, [stateError, showModal, setGameId]);

  // 提交玩家动作
  const { mutate: submitAction, isPending: isSubmitting } = usePlayerAction(
    gameId,
    {
      onSuccess: (data) => {
        // ✅ TanStack Query will automatically refetch and update gameStateData
        // No need to manually set Zustand state here
        clearSelection();

        if (data.gamePhase === GamePhase.PLAYING) {
          showToast({
            type: 'success',
            message: '埋牌成功！游戏开始',
            duration: 2000,
          });
        }
      },
      onError: (error) => {
        showModal({
          title: '操作失败',
          content: error.message,
          confirmText: '确定',
        });
      },
    }
  );

  // ✅ Removed: No longer need to sync TanStack Query data to Zustand
  // Game state is managed solely by TanStack Query to avoid cache conflicts

  // T052: 回合状态判断 - 更新 isPlayerTurn
  useEffect(() => {
    if (gameStateData && gameStateData.gamePhase === GamePhase.PLAYING) {
      // 判断当前是否为玩家回合（不能假设human总是索引0）
      const currentPlayer = gameStateData.players[gameStateData.currentPlayerIndex];
      const isPlayerTurn = currentPlayer?.playerId === 'human';
      setPlayerTurn(isPlayerTurn);

      logger.log('[GameBoard] Turn state updated', {
        currentPlayerIndex: gameStateData.currentPlayerIndex,
        currentPlayerId: currentPlayer?.playerId,
        isPlayerTurn,
      });
    } else {
      // 非 PLAYING 阶段，关闭轮询
      setPlayerTurn(false);
    }
  }, [gameStateData, setPlayerTurn]);

  // 监听窗口尺寸变化
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // T057: 检测可用的响应动作（必须在所有条件返回之前）
  const availableActions = useMemo(() => {
    if (!gameStateData || gameStateData.gamePhase !== GamePhase.PLAYING) {
      return [];
    }

    // 确定目标牌：
    // - 自己回合（自摸）：检测刚摸的牌 (last_drawn_tile)
    // - 别人回合（点炮）：检测弃牌堆最后一张牌
    const humanPlayer = gameStateData.players.find(p => p.playerId === 'human');
    if (!humanPlayer) {
      return [];
    }

    const currentPlayer = gameStateData.players[gameStateData.currentPlayerIndex];
    const isPlayerTurn = currentPlayer?.playerId === 'human';

    let targetTile: Tile | null = null;
    if (isPlayerTurn) {
      // 自摸：使用刚摸的牌
      targetTile = humanPlayer.lastDrawnTile || null;
    } else {
      // 点炮：使用弃牌堆最后一张牌
      targetTile = gameStateData.publicDiscards?.length > 0
        ? gameStateData.publicDiscards[gameStateData.publicDiscards.length - 1]
        : null;
    }

    return detectAvailableActions(gameStateData, 'human', targetTile);
  }, [gameStateData]);

  // 检测可用的杠牌选项（暗杠/补杠）
  const kongOptions = useMemo(() => {
    if (!gameStateData || gameStateData.gamePhase !== GamePhase.PLAYING) {
      return [];
    }

    const humanPlayer = gameStateData.players.find(p => p.playerId === 'human');
    if (!humanPlayer) {
      return [];
    }

    const currentPlayer = gameStateData.players[gameStateData.currentPlayerIndex];
    const isPlayerTurn = currentPlayer?.playerId === 'human';

    return detectKongOptions(humanPlayer, isPlayerTurn);
  }, [gameStateData]);

  // T064: 监听游戏状态变化，检测胡牌事件（必须在所有条件返回之前）
  useEffect(() => {
    if (!gameStateData || gameStateData.players.length === 0) return;

    const humanPlayer = gameStateData.players.find(p => p.playerId === 'human');
    const humanIsHu = humanPlayer?.isHu;
    const winners = (gameStateData as any).winners;

    if (humanIsHu && winners && winners.length > 0) {
      const humanWinner = winners.find((w: any) => w.playerId === 'human');

      if (humanWinner) {
        // 判断是否血战继续
        const isBloodBattle = gameStateData.gamePhase === GamePhase.PLAYING;

        setWinDetails({
          isBloodBattle,
          winners,
        });
        setShowWinModal(true);
      }
    }
  }, [gameStateData]);

  // 处理开始游戏
  const handleStartGame = async () => {
    setIsCreating(true);
    logger.log('[GameBoard] Creating new game...');

    try {
      const response = await gameApi.createGame();
      logger.log('[GameBoard] Game created successfully', {
        gameId: response.gameId,
      });

      setGameId(response.gameId);
      // ✅ TanStack Query will automatically fetch game state after gameId is set

      showToast({
        type: 'success',
        message: `游戏创建成功！游戏ID: ${response.gameId}`,
        duration: 3000,
      });

      logger.setContext({ gameId: response.gameId, playerId: 'human' });
    } catch (error) {
      logger.error('[GameBoard] Failed to create game', error);

      showModal({
        title: '创建游戏失败',
        content: error instanceof Error ? error.message : '未知错误',
        confirmText: '重试',
        onConfirm: () => handleStartGame(),
      });
    } finally {
      setIsCreating(false);
    }
  };

  // 处理埋牌确认
  const handleBuryCards = () => {
    const humanPlayer = gameStateData?.players.find(p => p.playerId === 'human');
    if (!humanPlayer || !humanPlayer.hand) {
      showToast({
        type: 'error',
        message: '无法获取手牌信息',
        duration: 3000,
      });
      return;
    }

    // 前端验证
    const validation = validateBuryCards(
      selectedTiles,
      humanPlayer.hand
    );

    if (!validation.isValid) {
      showToast({
        type: 'error',
        message: validation.errorMessage || '埋牌验证失败',
        duration: 3000,
      });
      return;
    }

    // 提交埋牌请求
    logger.log('[GameBoard] Submitting bury action', {
      tiles: selectedTiles,
    });

    submitAction({
      playerId: 'human',
      action: 'bury',
      tiles: selectedTiles,
    });
  };

  // T049/T050/T055: 处理出牌
  const handleDiscard = (tile: Tile) => {
    if (!gameStateData || !gameStateData.players[0].hand) {
      showToast({
        type: 'error',
        message: '无法获取手牌信息',
        duration: 3000,
      });
      return;
    }

    const humanPlayer = gameStateData.players.find(p => p.playerId === 'human');
    if (!humanPlayer) {
      showToast({
        type: 'error',
        message: '未找到玩家信息',
        duration: 3000,
      });
      return;
    }

    // T050: 前端验证 - 缺门优先出牌
    const validation = validateDiscard(
      tile,
      humanPlayer.hand,
      humanPlayer.missingSuit
    );

    if (!validation.isValid) {
      // T055: 出牌错误处理
      showToast({
        type: 'error',
        message: validation.errorMessage || '出牌验证失败',
        duration: 3000,
      });
      return;
    }

    // 提交出牌请求
    logger.log('[GameBoard] Submitting discard action', {
      tile: `${tile.suit}-${tile.rank}`,
    });

    // T054: 出牌后状态同步通过 usePlayerAction 的 invalidateQueries 自动完成
    submitAction({
      playerId: 'human',
      action: 'discard',
      tiles: [tile],
    });
  };

  // 窗口尺寸检查
  const isWindowTooSmall =
    windowSize.width < MIN_WINDOW_WIDTH ||
    windowSize.height < MIN_WINDOW_HEIGHT;

  if (isWindowTooSmall) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            窗口尺寸不足
          </h2>
          <p className="text-gray-700 mb-2">
            最小窗口尺寸要求：{MIN_WINDOW_WIDTH} x {MIN_WINDOW_HEIGHT}
          </p>
          <p className="text-gray-600">
            当前窗口尺寸：{windowSize.width} x {windowSize.height}
          </p>
          <p className="text-sm text-gray-500 mt-4">
            请调整浏览器窗口大小后继续游戏
          </p>
        </div>
      </div>
    );
  }

  // 欢迎界面（游戏未开始）
  if (!gameId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <div className="bg-white rounded-lg shadow-2xl p-12 max-w-md text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            血战到底麻将
          </h1>
          <p className="text-gray-600 mb-8">1真人 + 3AI 对战模式</p>

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

        <div className="mt-8 text-sm text-gray-500">
          <p>Phase 3: User Story 1 - 定缺埋牌 ✅</p>
        </div>
      </div>
    );
  }

  // 加载中或出错状态
  if (isLoadingState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">加载游戏状态中...</div>
      </div>
    );
  }

  if (stateError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">加载失败</h2>
          <p className="text-gray-700 mb-4">{stateError.message}</p>
          <Button onClick={() => window.location.reload()} variant="primary">
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  if (!gameStateData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">游戏数据不可用</div>
      </div>
    );
  }

  const humanPlayer = gameStateData.players.find(p => p.playerId === 'human');
  const gamePhase = gameStateData.gamePhase;

  // 如果找不到玩家，返回错误状态
  if (!humanPlayer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">未找到玩家信息</div>
      </div>
    );
  }

  // 游戏结束阶段
  if (gamePhase === GamePhase.ENDED) {
    const winners = (gameStateData as any).winners || [];
    const humanWon = winners.some((w: any) => w.playerId === 'human');

    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-3xl font-bold text-center text-gray-800">
              游戏结束
            </h2>
            <p className="text-center text-gray-500 mt-2">
              游戏ID: {gameId}
            </p>
          </div>

          {/* Winner Announcement */}
          {winners.length > 0 ? (
            <div className={`rounded-lg shadow-lg p-8 mb-6 ${
              humanWon ? 'bg-green-50 border-4 border-green-500' : 'bg-blue-50 border-4 border-blue-400'
            }`}>
              <h3 className={`text-2xl font-bold text-center mb-4 ${
                humanWon ? 'text-green-800' : 'text-blue-800'
              }`}>
                {humanWon ? '🎉 恭喜你胡牌了！' : '游戏结束'}
              </h3>
              <div className="space-y-3">
                {winners.map((winner: any) => (
                  <div
                    key={winner.playerId}
                    className={`p-4 rounded-md border-2 ${
                      winner.playerId === 'human'
                        ? 'bg-green-100 border-green-500'
                        : 'bg-blue-100 border-blue-400'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">
                        {winner.playerId === 'human' ? '你' : winner.playerId}
                      </span>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">番数: {winner.fanCount}番</div>
                        <div className={`text-lg font-bold ${
                          winner.scoreChange > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {winner.scoreChange > 0 ? '+' : ''}{winner.scoreChange}分
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-4 border-yellow-400 rounded-lg shadow-lg p-8 mb-6">
              <h3 className="text-2xl font-bold text-center text-yellow-800 mb-2">
                流局
              </h3>
              <p className="text-center text-gray-600">
                牌墙已空，无人胡牌
              </p>
            </div>
          )}

          {/* Final Scores */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">最终得分</h3>
            <div className="space-y-2">
              {gameStateData.players.map((player) => (
                <div
                  key={player.playerId}
                  className={`p-3 rounded flex justify-between items-center ${
                    player.playerId === 'human' ? 'bg-blue-50 font-bold' : 'bg-gray-50'
                  }`}
                >
                  <span>{player.playerId === 'human' ? '你' : player.playerId}</span>
                  <span className="text-lg">{player.score}分</span>
                </div>
              ))}
            </div>
          </div>

          {/* Restart Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => window.location.reload()}
              variant="primary"
              className="px-8 py-3 text-lg"
            >
              重新开始
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 埋牌阶段
  if (gamePhase === GamePhase.BURYING) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  定缺埋牌阶段
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  请选择3张同花色的牌进行埋牌
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">游戏ID: {gameId}</p>
                <p className="text-sm text-gray-600 mt-1">
                  已选择: {selectedTiles.length}/3 张
                </p>
              </div>
            </div>
          </div>

          {/* Player Hand */}
          {humanPlayer.hand && (
            <div className="mb-6">
              <PlayerHand
                hand={humanPlayer.hand}
                selectedTiles={selectedTiles}
                selectable={!isSubmitting}
                onTileClickWithIndex={toggleTileByIndex}
                isSelectedByIndex={isSelectedByIndex}
              />
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleBuryCards}
              disabled={selectedTiles.length !== 3 || isSubmitting}
              variant="primary"
              className="px-8 py-3 text-lg"
            >
              {isSubmitting ? '提交中...' : BUTTON_LABELS.CONFIRM_BURY}
            </Button>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">提示：</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 点击手牌可以选中/取消选中</li>
              <li>• 必须选择3张同花色的牌</li>
              <li>• 埋牌后将确定您的缺门花色</li>
              <li>• 游戏中将不能再使用缺门花色的牌</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // 获取AI玩家（按固定位置排列）
  const aiPlayers = gameStateData.players.filter(p => p.playerId !== 'human');

  // 游戏进行中阶段 - Grid四方位布局
  return (
    <div className="h-screen bg-gradient-to-br from-green-50 to-green-100 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md p-3">
        <div className="flex justify-between items-center max-w-full px-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">血战到底麻将</h2>
            <p className="text-xs text-gray-500">游戏ID: {gameId}</p>
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

      {/* Mahjong Table Grid - 3x3 Grid Layout */}
      <div className="flex-1 grid grid-cols-[220px_1fr_220px] grid-rows-[160px_1fr_280px] gap-3 p-3 overflow-hidden">
        {/* Top-left: Empty */}
        <div />

        {/* Top-center: AI_2 */}
        <div className="flex items-start justify-center">
          {aiPlayers[1] && (
            <PlayerArea
              player={aiPlayers[1]}
              position="top"
              isCurrentTurn={gameStateData.currentPlayerIndex === gameStateData.players.findIndex(p => p.playerId === aiPlayers[1].playerId)}
            />
          )}
        </div>

        {/* Top-right: Empty */}
        <div />

        {/* Middle-left: AI_1 */}
        <div className="flex items-center justify-center">
          {aiPlayers[0] && (
            <PlayerArea
              player={aiPlayers[0]}
              position="left"
              isCurrentTurn={gameStateData.currentPlayerIndex === gameStateData.players.findIndex(p => p.playerId === aiPlayers[0].playerId)}
            />
          )}
        </div>

        {/* Middle-center: Center area (discard pile + game info) */}
        <CenterArea
          publicDiscards={gameStateData.publicDiscards || []}
          wallRemaining={gameStateData.wallRemainingCount}
          gamePhase={gamePhase}
          maxDisplay={24}
        />

        {/* Middle-right: AI_3 */}
        <div className="flex items-center justify-center">
          {aiPlayers[2] && (
            <PlayerArea
              player={aiPlayers[2]}
              position="right"
              isCurrentTurn={gameStateData.currentPlayerIndex === gameStateData.players.findIndex(p => p.playerId === aiPlayers[2].playerId)}
            />
          )}
        </div>

        {/* Bottom-left: Empty */}
        <div />

        {/* Bottom-center: Human player */}
        <div className="flex flex-col gap-2 overflow-auto">
          {/* Player Hand */}
          {humanPlayer.hand && (
            <PlayerHand
              hand={humanPlayer.hand}
              melds={humanPlayer.melds}
              huTiles={humanPlayer.huTiles}
              selectable={false}
              onDiscard={handleDiscard}
              isPlayerTurn={gameStateData.players[gameStateData.currentPlayerIndex]?.playerId === 'human'}
              missingSuit={humanPlayer.missingSuit}
              disabled={isSubmitting}
              isHu={humanPlayer.isHu}
            />
          )}

          {/* Action Buttons - 响应操作（碰/杠/胡/过） */}
          {availableActions.length > 0 && (
            <ActionButtons
              gameId={gameId}
              playerId="human"
              lastDiscardedTile={
                // 确定目标牌：自摸时用刚摸的牌，点炮时用弃牌堆最后一张
                gameStateData.players[gameStateData.currentPlayerIndex]?.playerId === 'human'
                  ? humanPlayer?.lastDrawnTile || null
                  : (gameStateData.publicDiscards?.length > 0
                      ? gameStateData.publicDiscards[gameStateData.publicDiscards.length - 1]
                      : null)
              }
              availableActions={availableActions}
              onSuccess={() => {
                showToast({
                  type: 'success',
                  message: '操作成功',
                  duration: 2000,
                });
              }}
              onError={(error) => {
                showToast({
                  type: 'error',
                  message: error.message || '操作失败',
                  duration: 3000,
                });
              }}
            />
          )}

          {/* Kong Buttons - 主动杠牌（暗杠/补杠） */}
          {kongOptions.length > 0 && (
            <KongButtons
              gameId={gameId}
              playerId="human"
              kongOptions={kongOptions}
              onSuccess={() => {
                showToast({
                  type: 'success',
                  message: '杠牌成功',
                  duration: 2000,
                });
              }}
              onError={(error) => {
                showToast({
                  type: 'error',
                  message: error.message || '杠牌失败',
                  duration: 3000,
                });
              }}
            />
          )}
        </div>

        {/* Bottom-right: Empty */}
        <div />
      </div>

      {/* T063: 胡牌结果弹窗 */}
      {showWinModal && winDetails && (
        <Modal
          title={
            winDetails.isBloodBattle
              ? MODAL_TITLES.BLOOD_BATTLE_CONTINUE
              : MODAL_TITLES.WIN
          }
          content={
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 mb-2">
                  {winDetails.isBloodBattle ? '🎉 恭喜胡牌！血战继续' : '🎉 恭喜胡牌！'}
                </p>
              </div>

              {/* 胜者信息 */}
              <div className="space-y-2">
                {winDetails.winners.map((winner) => (
                  <div
                    key={winner.playerId}
                    className={`p-4 rounded-lg ${
                      winner.playerId === 'human'
                        ? 'bg-green-50 border-2 border-green-500'
                        : 'bg-gray-50 border border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">
                        {winner.playerId === 'human' ? '你' : winner.playerId}
                      </span>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {INFO_LABELS.FAN_COUNT}: {winner.fanCount}
                        </div>
                        <div className={`text-lg font-bold ${
                          winner.scoreChange > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {INFO_LABELS.SCORE_CHANGE}: {winner.scoreChange > 0 ? '+' : ''}{winner.scoreChange}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {winDetails.isBloodBattle && (
                <div className="text-center text-sm text-gray-600 mt-4">
                  血战到底模式：游戏继续，摸什么打什么
                </div>
              )}
            </div>
          }
          confirmText={BUTTON_LABELS.CONFIRM}
          onConfirm={() => {
            setShowWinModal(false);
            setWinDetails(null);
          }}
          closable={false}
        />
      )}
    </div>
  );
}

export default GameBoard;
