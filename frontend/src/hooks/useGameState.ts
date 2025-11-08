/**
 * useGameState Hook
 *
 * 使用 TanStack Query 管理游戏状态，支持条件轮询
 * - 玩家回合时：停止轮询
 * - AI 回合时：启用 500ms 轮询
 */

import { useQuery } from '@tanstack/react-query';
import { gameApi } from '@/services/api';
import { useGameStore } from '@/stores';
import { POLLING_INTERVAL } from '@/utils/constants';
import type { GameStateResponse } from '@/types';

interface UseGameStateOptions {
  /**
   * 是否启用轮询
   * - true: AI 回合，启用 500ms 轮询
   * - false: 玩家回合，停止轮询
   */
  enabled?: boolean;
}

/**
 * 获取游戏状态的 Hook
 *
 * @param gameId - 游戏 ID
 * @param playerId - 玩家 ID（默认为 'human'）
 * @param options - 配置选项
 * @returns TanStack Query 的查询结果
 */
export function useGameState(
  gameId: string | null,
  playerId: string = 'human',
  options?: UseGameStateOptions
) {
  const { enabled = true } = options || {};
  const isPlayerTurn = useGameStore((s) => s.isPlayerTurn);

  return useQuery<GameStateResponse, Error>({
    queryKey: ['gameState', gameId, playerId],
    queryFn: () => {
      if (!gameId) {
        throw new Error('Game ID is required');
      }
      return gameApi.getGameState(gameId, playerId);
    },
    // 仅当 gameId 存在且 enabled 为 true 时启用查询
    enabled: !!gameId && enabled,
    // 条件轮询：AI 回合时启用 500ms 轮询，玩家回合时停止
    refetchInterval: (query) => {
      // 如果查询失败（例如404 - 游戏已结束），停止轮询
      if (query.state.status === 'error') {
        return false;
      }
      // 如果游戏已结束，停止轮询
      if (query.state.data?.gamePhase === 'ENDED') {
        return false;
      }
      // AI 回合时轮询，玩家回合时停止
      return !isPlayerTurn ? POLLING_INTERVAL : false;
    },
    // 后台不自动重新获取（避免浪费资源）
    refetchIntervalInBackground: false,
    // 窗口重新获得焦点时不自动重新获取
    refetchOnWindowFocus: false,
    // 重新挂载时不自动重新获取
    refetchOnMount: false,
    // 网络重新连接时不自动重新获取
    refetchOnReconnect: false,
    // 数据永远视为过时（依赖轮询更新）
    staleTime: 0,
    // 缓存时间：10秒（快速清理过期数据，避免多个游戏会话混淆）
    gcTime: 10 * 1000,
    // 重试策略：404错误不重试（游戏已结束），其他错误重试1次
    retry: (failureCount, error: any) => {
      // 404错误表示游戏已结束并被清理，不需要重试
      if (error?.response?.status === 404) {
        return false;
      }
      // 其他错误重试1次
      return failureCount < 1;
    },
    // 重试延迟：1秒
    retryDelay: 1000,
  });
}

export default useGameState;
