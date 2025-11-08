/**
 * ActionButtons Component
 *
 * 显示响应操作按钮（碰/杠/胡/过）
 * - 根据可用动作动态渲染按钮
 * - 胡按钮高亮显示
 * - 无超时倒计时，等待玩家手动点击
 * - 支持防重复提交
 */

import { usePlayerAction } from '@/hooks/usePlayerAction';
import { BUTTON_LABELS, TOAST_MESSAGES } from '@/utils/messages';
import { logger } from '@/utils/logger';
import type { Tile } from '@/types';

interface ActionButtonsProps {
  /**
   * 游戏 ID
   */
  gameId: string | null;
  /**
   * 玩家 ID（通常为 "human"）
   */
  playerId: string;
  /**
   * 最后一张出牌（用于碰/杠/胡）
   */
  lastDiscardedTile: Tile | null;
  /**
   * 可用的动作列表
   * 由父组件根据游戏规则检测
   */
  availableActions: ('peng' | 'gang' | 'hu' | 'skip')[];
  /**
   * 操作成功回调
   */
  onSuccess?: () => void;
  /**
   * 操作失败回调
   */
  onError?: (error: Error) => void;
}

export function ActionButtons({
  gameId,
  playerId,
  lastDiscardedTile,
  availableActions,
  onSuccess,
  onError,
}: ActionButtonsProps) {
  // 使用 usePlayerAction Hook 提交动作
  const mutation = usePlayerAction(gameId, {
    onSuccess: () => {
      logger.log('[ActionButtons] Action submitted successfully');
      onSuccess?.();
    },
    onError: (error) => {
      logger.error('[ActionButtons] Action failed', { error: error.message });
      onError?.(error);
    },
  });

  // T058: 碰牌动作提交
  const handlePeng = () => {
    if (!lastDiscardedTile) {
      logger.error('[ActionButtons] No discarded tile for peng');
      return;
    }

    mutation.mutate({
      playerId,
      action: 'peng',
      tiles: [lastDiscardedTile],
    });
  };

  // T059: 杠牌动作提交
  const handleGang = () => {
    if (!lastDiscardedTile) {
      logger.error('[ActionButtons] No discarded tile for gang');
      return;
    }

    mutation.mutate({
      playerId,
      action: 'gang',
      tiles: [lastDiscardedTile],
    });
  };

  // T060: 胡牌动作提交
  const handleHu = () => {
    if (!lastDiscardedTile) {
      logger.error('[ActionButtons] No discarded tile for hu');
      return;
    }

    mutation.mutate({
      playerId,
      action: 'hu',
      tiles: [lastDiscardedTile],
    });
  };

  // T061: 跳过动作提交
  const handleSkip = () => {
    mutation.mutate({
      playerId,
      action: 'skip',
      tiles: lastDiscardedTile ? [lastDiscardedTile] : undefined,
    });
  };

  // 如果没有可用动作，不显示按钮
  if (availableActions.length === 0) {
    return null;
  }

  // T066: 无超时逻辑（不显示倒计时）
  const isDisabled = mutation.isPending;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-3">响应操作</h3>
      <div className="flex gap-3">
        {/* 碰按钮 */}
        {availableActions.includes('peng') && (
          <button
            onClick={handlePeng}
            disabled={isDisabled}
            className={`
              px-6 py-3 rounded-md font-semibold text-lg
              border-2 transition-all
              ${
                isDisabled
                  ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                  : 'bg-green-500 text-white border-green-600 hover:bg-green-600 cursor-pointer'
              }
            `}
          >
            {BUTTON_LABELS.PONG}
          </button>
        )}

        {/* 杠按钮 */}
        {availableActions.includes('gang') && (
          <button
            onClick={handleGang}
            disabled={isDisabled}
            className={`
              px-6 py-3 rounded-md font-semibold text-lg
              border-2 transition-all
              ${
                isDisabled
                  ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600 cursor-pointer'
              }
            `}
          >
            {BUTTON_LABELS.KONG}
          </button>
        )}

        {/* 胡按钮（高亮显示） */}
        {availableActions.includes('hu') && (
          <button
            onClick={handleHu}
            disabled={isDisabled}
            className={`
              px-6 py-3 rounded-md font-semibold text-lg
              border-2 transition-all
              ${
                isDisabled
                  ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                  : 'bg-red-500 text-white border-red-600 hover:bg-red-600 cursor-pointer animate-pulse'
              }
            `}
          >
            {BUTTON_LABELS.HU}
          </button>
        )}

        {/* 过按钮 */}
        {availableActions.includes('skip') && (
          <button
            onClick={handleSkip}
            disabled={isDisabled}
            className={`
              px-6 py-3 rounded-md font-semibold text-lg
              border-2 transition-all
              ${
                isDisabled
                  ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                  : 'bg-gray-500 text-white border-gray-600 hover:bg-gray-600 cursor-pointer'
              }
            `}
          >
            {BUTTON_LABELS.PASS}
          </button>
        )}
      </div>

      {/* T065: 错误提示 */}
      {mutation.isError && (
        <div className="mt-3 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {mutation.error?.message || TOAST_MESSAGES.ACTION_SUCCESS}
        </div>
      )}

      {/* 加载状态提示 */}
      {mutation.isPending && (
        <div className="mt-3 p-3 bg-blue-100 text-blue-700 rounded-md text-sm">
          正在提交操作...
        </div>
      )}
    </div>
  );
}

export default ActionButtons;
