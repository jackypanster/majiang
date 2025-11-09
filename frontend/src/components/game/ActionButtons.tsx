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
  // 注意：skip 动作不需要传递 tiles，后端会自动从 public_discards 获取
  const handleSkip = () => {
    mutation.mutate({
      playerId,
      action: 'skip',
      // ✅ 不传递 tiles，避免触发后端 422 验证错误（Issue #70）
      tiles: undefined,
    });
  };

  // T066: 无超时逻辑（不显示倒计时）
  // 按钮常驻显示，不可用时禁用（简化逻辑）
  const isDisabled = mutation.isPending;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        {/* 碰按钮 - 常驻显示 */}
        <button
          onClick={handlePeng}
          disabled={isDisabled || !availableActions.includes('peng')}
          className={`
            px-6 py-3 rounded-md font-semibold text-lg
            border-2 transition-all
            ${
              isDisabled || !availableActions.includes('peng')
                ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                : 'bg-green-500 text-white border-green-600 hover:bg-green-600 cursor-pointer'
            }
          `}
        >
          {BUTTON_LABELS.PONG}
        </button>

        {/* 杠按钮 - 常驻显示 */}
        <button
          onClick={handleGang}
          disabled={isDisabled || !availableActions.includes('gang')}
          className={`
            px-6 py-3 rounded-md font-semibold text-lg
            border-2 transition-all
            ${
              isDisabled || !availableActions.includes('gang')
                ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600 cursor-pointer'
            }
          `}
        >
          {BUTTON_LABELS.KONG}
        </button>

        {/* 胡按钮 - 常驻显示（可用时高亮） */}
        <button
          onClick={handleHu}
          disabled={isDisabled || !availableActions.includes('hu')}
          className={`
            px-6 py-3 rounded-md font-semibold text-lg
            border-2 transition-all
            ${
              isDisabled || !availableActions.includes('hu')
                ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                : 'bg-red-500 text-white border-red-600 hover:bg-red-600 cursor-pointer animate-pulse'
            }
          `}
        >
          {BUTTON_LABELS.HU}
        </button>

        {/* 过按钮 - 常驻显示 */}
        <button
          onClick={handleSkip}
          disabled={isDisabled || !availableActions.includes('skip')}
          className={`
            px-6 py-3 rounded-md font-semibold text-lg
            border-2 transition-all
            ${
              isDisabled || !availableActions.includes('skip')
                ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                : 'bg-gray-500 text-white border-gray-600 hover:bg-gray-600 cursor-pointer'
            }
          `}
        >
          {BUTTON_LABELS.PASS}
        </button>
      </div>

      {/* T065: 错误提示 */}
      {mutation.isError && (
        <div className="mt-1 p-2 bg-red-100 text-red-700 rounded-md text-xs">
          {mutation.error?.message || TOAST_MESSAGES.ACTION_SUCCESS}
        </div>
      )}

      {/* 加载状态提示 */}
      {mutation.isPending && (
        <div className="mt-1 p-2 bg-blue-100 text-blue-700 rounded-md text-xs">
          正在提交操作...
        </div>
      )}
    </div>
  );
}

export default ActionButtons;
