/**
 * KongButtons Component
 *
 * 显示主动杠牌按钮（暗杠/补杠）
 * - 仅在玩家自己回合显示
 * - 根据手牌和明牌情况动态渲染
 * - 暗杠：手中有4张相同的牌
 * - 补杠：已碰的牌，手中有第4张
 */

import { usePlayerAction } from '@/hooks/usePlayerAction';
import { BUTTON_LABELS } from '@/utils/messages';
import { logger } from '@/utils/logger';
import type { KongOption } from '@/utils/kongDetection';

interface KongButtonsProps {
  /**
   * 游戏 ID
   */
  gameId: string | null;
  /**
   * 玩家 ID
   */
  playerId: string;
  /**
   * 可用的杠牌选项
   */
  kongOptions: KongOption[];
  /**
   * 操作成功回调
   */
  onSuccess?: () => void;
  /**
   * 操作失败回调
   */
  onError?: (error: Error) => void;
}

export function KongButtons({
  gameId,
  playerId,
  kongOptions,
  onSuccess,
  onError,
}: KongButtonsProps) {
  // 使用 usePlayerAction Hook 提交动作
  const mutation = usePlayerAction(gameId, {
    onSuccess: () => {
      logger.log('[KongButtons] Kong action submitted successfully');
      onSuccess?.();
    },
    onError: (error) => {
      logger.error('[KongButtons] Kong action failed', { error: error.message });
      onError?.(error);
    },
  });

  const handleKong = (option: KongOption) => {
    logger.log('[KongButtons] Submitting kong action', {
      type: option.type,
      tile: option.tile,
    });

    mutation.mutate({
      playerId,
      action: option.type, // 'angang' or 'bugang'
      tiles: [option.tile],
    });
  };

  // 如果没有可用的杠牌选项，不显示组件
  if (kongOptions.length === 0) {
    return null;
  }

  const isDisabled = mutation.isPending;

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow-lg p-4 border-2 border-yellow-300 max-w-xs">
      <h3 className="text-base font-semibold mb-2 text-yellow-800">
        🀄 可用杠牌操作
      </h3>
      <div className="flex flex-col gap-2">
        {kongOptions.map((option, index) => (
          <button
            key={`${option.type}-${index}`}
            onClick={() => handleKong(option)}
            disabled={isDisabled}
            className={`
              px-4 py-2 rounded-md font-semibold text-sm
              border-2 transition-all flex items-center justify-between
              ${
                isDisabled
                  ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                  : option.type === 'angang'
                  ? 'bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600 cursor-pointer hover:shadow-lg'
                  : 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600 cursor-pointer hover:shadow-lg'
              }
            `}
          >
            <span>{option.display}</span>
            <span className="text-xs opacity-90">
              {option.type === 'angang' ? '暗杠' : '补杠'}
            </span>
          </button>
        ))}
      </div>

      {/* 错误提示 */}
      {mutation.isError && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 rounded-md text-xs">
          {mutation.error?.message || '杠牌操作失败'}
        </div>
      )}

      {/* 加载状态提示 */}
      {mutation.isPending && (
        <div className="mt-2 p-2 bg-blue-100 text-blue-700 rounded-md text-xs">
          正在提交杠牌操作...
        </div>
      )}
    </div>
  );
}

export default KongButtons;
