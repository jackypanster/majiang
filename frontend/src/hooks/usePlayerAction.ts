/**
 * usePlayerAction Hook
 *
 * 使用 TanStack Query 的 useMutation 封装玩家动作提交
 * - 成功后自动刷新游戏状态（invalidateQueries）
 * - 支持防重复提交（isLoading 状态）
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gameApi } from '@/services/api';
import { logger } from '@/utils/logger';
import type { PlayerActionRequest, GameStateResponse } from '@/types';

interface UsePlayerActionOptions {
  /**
   * 成功回调
   */
  onSuccess?: (data: GameStateResponse) => void;
  /**
   * 失败回调
   */
  onError?: (error: Error) => void;
}

/**
 * 提交玩家动作的 Hook
 *
 * @param gameId - 游戏 ID
 * @param options - 配置选项
 * @returns useMutation 的返回值
 */
export function usePlayerAction(
  gameId: string | null,
  options?: UsePlayerActionOptions
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options || {};

  return useMutation<GameStateResponse, Error, PlayerActionRequest>({
    mutationFn: (request: PlayerActionRequest) => {
      if (!gameId) {
        throw new Error('Game ID is required');
      }

      logger.log(
        `[usePlayerAction] Submitting action: ${request.action}`,
        { gameId, playerId: request.playerId, action: request.action }
      );

      return gameApi.submitAction(gameId, request);
    },

    onSuccess: (data, variables) => {
      logger.log(
        `[usePlayerAction] Action submitted successfully: ${variables.action}`,
        { gameId, gamePhase: data.gamePhase }
      );

      // 立即刷新游戏状态（不依赖轮询）
      queryClient.invalidateQueries({
        queryKey: ['gameState', gameId],
      });

      // 调用用户自定义成功回调
      onSuccess?.(data);
    },

    onError: (error, variables) => {
      logger.error(
        `[usePlayerAction] Action failed: ${variables.action}`,
        { gameId, error: error.message }
      );

      // 调用用户自定义失败回调
      onError?.(error);
    },

    // 重试策略：失败后不重试（避免重复提交）
    retry: false,
  });
}

export default usePlayerAction;
