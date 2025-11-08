/**
 * useTileSelection Hook
 *
 * 管理麻将牌选中状态（基于数组索引）
 * - 支持选中/取消选中
 * - 限制最多选3张牌（用于埋牌）
 * - 提供清空选择功能
 * - 使用数组索引区分相同花色点数的牌
 */

import { useState, useCallback } from 'react';
import type { Tile } from '@/types';

interface UseTileSelectionOptions {
  /**
   * 最大选中数量（默认为3，用于埋牌）
   */
  maxSelection?: number;
}

/**
 * 带索引的牌（用于区分相同的牌）
 */
interface IndexedTile {
  tile: Tile;
  index: number; // 在手牌数组中的索引
}

/**
 * 麻将牌选中状态管理
 *
 * @param options - 配置选项
 * @returns 选中状态和操作方法
 */
export function useTileSelection(options?: UseTileSelectionOptions) {
  const { maxSelection = 3 } = options || {};

  // 选中的牌（存储带索引的 Tile）
  const [selectedIndexedTiles, setSelectedIndexedTiles] = useState<IndexedTile[]>([]);

  /**
   * 切换牌的选中状态（使用索引区分）
   * - 如果已选中，则取消选中
   * - 如果未选中且未达到最大数量，则选中
   */
  const toggleTileByIndex = useCallback(
    (tile: Tile, index: number) => {
      setSelectedIndexedTiles((prev) => {
        const isSelected = prev.some((it) => it.index === index);

        if (isSelected) {
          // 取消选中
          return prev.filter((it) => it.index !== index);
        } else {
          // 检查是否达到最大数量
          if (prev.length >= maxSelection) {
            return prev;
          }
          // 选中
          return [...prev, { tile, index }];
        }
      });
    },
    [maxSelection]
  );

  /**
   * 检查牌是否已选中（根据索引）
   */
  const isSelectedByIndex = useCallback(
    (index: number) => {
      return selectedIndexedTiles.some((it) => it.index === index);
    },
    [selectedIndexedTiles]
  );

  /**
   * 清空所有选中
   */
  const clearSelection = useCallback(() => {
    setSelectedIndexedTiles([]);
  }, []);

  /**
   * 获取选中的牌（不含索引信息）
   */
  const selectedTiles = selectedIndexedTiles.map((it) => it.tile);

  return {
    selectedTiles,
    toggleTileByIndex,
    isSelectedByIndex,
    clearSelection,
    canSelect: selectedIndexedTiles.length < maxSelection,
    selectionCount: selectedIndexedTiles.length,
  };
}

export default useTileSelection;
