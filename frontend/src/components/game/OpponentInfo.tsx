/**
 * OpponentInfo Component
 *
 * 显示其他玩家（AI）的基本信息
 * - 玩家ID
 * - 手牌数量
 * - 缺门花色
 * - 明牌（碰/杠）
 */

import type { Player } from '@/types';

/**
 * 将花色枚举转换为中文显示
 */
function getSuitDisplay(suit: string): string {
  const suitMap: Record<string, string> = {
    WAN: '万',
    TIAO: '条',
    TONG: '筒',
  };
  return suitMap[suit] || suit;
}

/**
 * 将明牌类型转换为中文显示
 */
function getMeldTypeDisplay(meldType: string): string {
  const meldTypeMap: Record<string, string> = {
    PONG: '碰',
    KONG: '杠',
    KONG_EXPOSED: '明杠',
    KONG_CONCEALED: '暗杠',
    KONG_UPGRADE: '补杠',
  };
  return meldTypeMap[meldType] || meldType;
}

interface OpponentInfoProps {
  /**
   * 其他玩家列表（不包括human）
   */
  opponents: Player[];
  /**
   * 当前回合玩家索引
   */
  currentPlayerIndex: number;
}

export function OpponentInfo({ opponents, currentPlayerIndex }: OpponentInfoProps) {
  if (opponents.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">其他玩家</h3>
      <div className="space-y-4">
        {opponents.map((opponent, idx) => {
          const playerIndex = idx + 1; // AI玩家索引从1开始（0是human）
          const isCurrentPlayer = playerIndex === currentPlayerIndex;

          return (
            <div
              key={opponent.playerId}
              className={`p-4 rounded-md border-2 transition-all ${
                isCurrentPlayer
                  ? 'bg-yellow-50 border-yellow-500 shadow-md'
                  : 'bg-gray-50 border-gray-300'
              }`}
            >
              {/* 玩家ID和回合指示器 */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-md">
                  {opponent.playerId}
                  {isCurrentPlayer && (
                    <span className="ml-2 text-sm text-yellow-600 font-normal">
                      (当前回合)
                    </span>
                  )}
                </h4>
                <div className="text-sm text-gray-600">
                  手牌: {opponent.hand?.length || 0}张
                </div>
              </div>

              {/* 缺门信息 */}
              {opponent.missingSuit && (
                <div className="text-sm text-gray-600 mb-2">
                  缺门:{' '}
                  <span className="font-semibold text-red-600">
                    {getSuitDisplay(opponent.missingSuit)}
                  </span>
                </div>
              )}

              {/* 明牌（碰/杠） */}
              {opponent.melds && opponent.melds.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm text-gray-600 mb-1">明牌:</div>
                  <div className="flex flex-wrap gap-2">
                    {opponent.melds.map((meld, meldIdx) => (
                      <div
                        key={meldIdx}
                        className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded border border-green-300"
                      >
                        <span className="text-xs font-semibold">
                          {getMeldTypeDisplay(meld.meldType)}
                        </span>
                        <span className="text-xs">
                          {getSuitDisplay(meld.tiles[0].suit)}
                          {meld.tiles[0].rank}
                        </span>
                        <span className="text-xs text-gray-500">
                          ×{meld.tiles.length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OpponentInfo;
