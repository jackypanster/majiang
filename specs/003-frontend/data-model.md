# 前端数据模型设计

**Feature**: 血战到底麻将前端界面
**Branch**: `001-frontend`
**Date**: 2025-11-07
**Status**: Phase 1 完成

---

## 概述

本文档定义前端 TypeScript 类型系统，与后端 Python dataclass 保持一致。所有类型手动维护（参考 `research.md` 决策），通过集成测试验证类型一致性。

**类型命名规范**：
- 类型名：PascalCase（如 `GameState`, `Tile`）
- 字段名：camelCase（前端）vs snake_case（后端，需转换）
- 枚举名：PascalCase，枚举值：UPPER_CASE

**类型同步策略**：
- 手动维护，每次后端 dataclass 修改时同步更新前端类型
- 通过集成测试验证 API 返回数据结构
- 在 API 层统一处理字段命名转换（snake_case → camelCase）

---

## 1. 核心实体类型

### 1.1 Suit（花色枚举）

对应后端：`src/mahjong/constants/enums.py::Suit`

```typescript
// types/tile.ts

/**
 * 麻将牌花色枚举
 *
 * 后端对应：Suit(Enum) with auto() values
 * 前端使用字符串字面量类型，与后端 API 返回的 name 字段对齐
 */
export enum Suit {
  WAN = 'WAN',    // 万（Characters）
  TIAO = 'TIAO',  // 条（Bamboos）
  TONG = 'TONG'   // 筒（Dots）
}

// 工具类型：将字符串转为 Suit 枚举
export function parseSuit(suit: string): Suit {
  if (!Object.values(Suit).includes(suit as Suit)) {
    throw new Error(`Invalid suit: ${suit}`);
  }
  return suit as Suit;
}
```

---

### 1.2 Tile（麻将牌）

对应后端：`src/mahjong/models/tile.py::Tile`

```typescript
// types/tile.ts

/**
 * 麻将牌
 *
 * 后端对应：@dataclass(frozen=True) Tile
 *
 * 注意：
 * - 后端 Tile 是不可变的（frozen=True）
 * - 前端不需要强制不可变，但应避免直接修改
 * - id 字段为前端专用，用于 React key（后端无此字段）
 */
export interface Tile {
  suit: Suit;
  rank: number;  // 1-9
  id?: string;   // 可选：前端生成的唯一标识符（用于 React key）
}

/**
 * 工具函数：从后端数据创建 Tile
 */
export function createTile(data: { suit: string; rank: number }): Tile {
  return {
    suit: parseSuit(data.suit),
    rank: data.rank
  };
}

/**
 * 工具函数：生成 Tile 的唯一 ID（用于 React key）
 */
export function getTileId(tile: Tile): string {
  return `${tile.suit}-${tile.rank}`;
}

/**
 * 工具函数：比较两个 Tile 是否相同
 */
export function tilesEqual(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}
```

---

### 1.3 MeldType（明牌类型枚举）

对应后端：`src/mahjong/constants/enums.py::ActionType`（部分）

```typescript
// types/meld.ts

/**
 * 明牌组合类型
 *
 * 后端对应：ActionType 枚举的子集
 * 注意：后端使用 ActionType 表示所有动作类型，前端仅提取明牌相关类型
 */
export enum MeldType {
  PONG = 'PONG',                   // 碰（3张）
  KONG = 'KONG',                   // 通用杠（向后兼容）
  KONG_EXPOSED = 'KONG_EXPOSED',   // 明杠/直杠（3手牌+1打出的牌，2倍分）
  KONG_CONCEALED = 'KONG_CONCEALED', // 暗杠（4手牌，1倍分）
  KONG_UPGRADE = 'KONG_UPGRADE'    // 补杠/巴杠（碰升级为杠，1倍分）
}
```

---

### 1.4 Meld（明牌组合）

对应后端：`src/mahjong/models/meld.py::Meld`

```typescript
// types/meld.ts

/**
 * 明牌组合（碰、杠）
 *
 * 后端对应：@dataclass(frozen=True) Meld
 */
export interface Meld {
  meldType: MeldType;
  tiles: Tile[];        // 后端为 Tuple[Tile, ...]，前端使用数组
  isConcealed: boolean; // 是否暗杠（用于判断门清）
}

/**
 * 工具函数：从后端数据创建 Meld
 */
export function createMeld(data: {
  meld_type: string;
  tiles: Array<{ suit: string; rank: number }>;
  is_concealed?: boolean;
}): Meld {
  return {
    meldType: data.meld_type as MeldType,
    tiles: data.tiles.map(createTile),
    isConcealed: data.is_concealed || false
  };
}
```

---

### 1.5 Player（玩家）

对应后端：`src/mahjong/models/player.py::Player`

```typescript
// types/player.ts

/**
 * 玩家状态
 *
 * 后端对应：@dataclass Player
 *
 * 注意：
 * - hand 字段：仅当前玩家可见完整手牌，其他玩家仅显示 handCount
 * - missingSuit: 后端为 missing_suit（需转换）
 * - isHu: 后端为 is_hu（需转换）
 */
export interface Player {
  playerId: string;
  hand?: Tile[];              // 手牌（仅当前玩家可见）
  handCount?: number;         // 手牌数量（其他玩家可见）
  melds: Meld[];              // 明牌（所有人可见）
  buriedCards: Tile[];        // 埋牌（所有人可见）
  missingSuit: Suit | null;   // 缺门花色
  score: number;              // 当前分数
  isHu: boolean;              // 是否已胡牌
}

/**
 * 工具函数：从后端数据创建 Player
 *
 * 后端返回两种格式：
 * 1. 当前玩家：包含 hand（完整手牌）
 * 2. 其他玩家：包含 hand_count（手牌数量）
 */
export function createPlayer(data: any): Player {
  return {
    playerId: data.player_id,
    hand: data.hand ? data.hand.map(createTile) : undefined,
    handCount: data.hand_count,
    melds: (data.melds || []).map(createMeld),
    buriedCards: (data.buried_cards || []).map(createTile),
    missingSuit: data.missing_suit ? parseSuit(data.missing_suit) : null,
    score: data.score,
    isHu: data.is_hu
  };
}
```

---

### 1.6 GamePhase（游戏阶段枚举）

对应后端：`src/mahjong/constants/enums.py::GamePhase`

```typescript
// types/game.ts

/**
 * 游戏阶段枚举
 *
 * 后端对应：GamePhase(Enum)
 */
export enum GamePhase {
  PREPARING = 'PREPARING',  // 准备阶段（前端不使用）
  BURYING = 'BURYING',      // 埋牌阶段
  PLAYING = 'PLAYING',      // 游戏进行中
  ENDED = 'ENDED'           // 游戏结束
}
```

---

### 1.7 GameState（游戏状态）

对应后端：`src/mahjong/models/game_state.py::GameState`

```typescript
// types/game.ts

/**
 * 游戏状态
 *
 * 后端对应：@dataclass GameState
 *
 * 注意：
 * - currentPlayerIndex: 后端为 current_player_index（需转换）
 * - publicDiscards: 后端为 public_discards（需转换）
 * - wallRemainingCount: 后端为 wall_remaining_count（需转换）
 * - baseScore: 后端为 base_score（需转换）
 */
export interface GameState {
  gameId: string;
  gamePhase: GamePhase;
  currentPlayerIndex: number;  // 当前回合玩家索引（0-3）
  players: Player[];           // 4名玩家（索引0通常为真人玩家）
  publicDiscards: Tile[];      // 弃牌堆（所有人可见）
  wallRemainingCount: number;  // 牌墙剩余数量
  baseScore: number;           // 底分（杠分计算用）
}

/**
 * 工具函数：从后端数据创建 GameState
 */
export function createGameState(data: any): GameState {
  return {
    gameId: data.game_id,
    gamePhase: data.game_phase as GamePhase,
    currentPlayerIndex: data.current_player_index,
    players: (data.players || []).map(createPlayer),
    publicDiscards: (data.public_discards || []).map(createTile),
    wallRemainingCount: data.wall_remaining_count,
    baseScore: data.base_score
  };
}
```

---

### 1.8 ActionType（玩家动作类型）

对应后端：`src/mahjong/constants/enums.py::ActionType`

```typescript
// types/action.ts

/**
 * 玩家动作类型
 *
 * 后端对应：ActionType(Enum)
 */
export enum ActionType {
  PONG = 'PONG',                   // 碰
  KONG = 'KONG',                   // 通用杠
  KONG_EXPOSED = 'KONG_EXPOSED',   // 明杠
  KONG_CONCEALED = 'KONG_CONCEALED', // 暗杠
  KONG_UPGRADE = 'KONG_UPGRADE',   // 补杠
  HU = 'HU',                       // 胡
  PASS = 'PASS'                    // 过
}
```

---

### 1.9 PlayerResponse（玩家响应）

对应后端：`src/mahjong/models/response.py::PlayerResponse`

```typescript
// types/action.ts

/**
 * 玩家对打出牌的响应
 *
 * 后端对应：@dataclass PlayerResponse
 *
 * 注意：
 * - targetTile: 后端为 target_tile（需转换）
 * - actionType: 后端为 action_type（需转换）
 */
export interface PlayerResponse {
  playerId: string;
  actionType: ActionType;
  targetTile: Tile;
  priority: number;  // 优先级：HU=3, KONG=2, PONG=1, PASS=0
}

/**
 * 获取动作优先级（与后端逻辑一致）
 */
export function getActionPriority(actionType: ActionType): number {
  switch (actionType) {
    case ActionType.HU:
      return 3;
    case ActionType.KONG:
    case ActionType.KONG_EXPOSED:
      return 2;
    case ActionType.PONG:
      return 1;
    default:
      return 0;
  }
}
```

---

## 2. API 请求/响应类型

### 2.1 CreateGameRequest（创建游戏请求）

对应后端：`app/schemas.py::CreateGameRequest`

```typescript
// types/api.ts

/**
 * 创建游戏请求
 *
 * 后端对应：CreateGameRequest(BaseModel)
 */
export interface CreateGameRequest {
  playerIds?: string[];  // 可选：自定义玩家ID（必须4个）
}

/**
 * 默认玩家ID配置
 */
export const DEFAULT_PLAYER_IDS = ['human', 'ai_1', 'ai_2', 'ai_3'];
```

---

### 2.2 CreateGameResponse（创建游戏响应）

对应后端：`app/schemas.py::CreateGameResponse`

```typescript
// types/api.ts

/**
 * 创建游戏响应
 *
 * 后端对应：CreateGameResponse(BaseModel)
 */
export interface CreateGameResponse {
  gameId: string;
  state: GameState;  // 初始游戏状态（已过滤）
}
```

---

### 2.3 PlayerActionRequest（玩家动作请求）

对应后端：`app/schemas.py::PlayerActionRequest`

```typescript
// types/api.ts

/**
 * 玩家动作请求
 *
 * 后端对应：PlayerActionRequest(BaseModel)
 *
 * 动作类型说明：
 * - bury: 埋牌（需要3张同花色牌）
 * - draw: 摸牌（调试接口，正常由后端自动触发）
 * - discard: 出牌（需要1张牌）
 * - peng/gang/hu: 响应对手打出的牌（需要指定目标牌）
 * - skip: 过（不需要牌）
 */
export interface PlayerActionRequest {
  playerId: string;
  action: 'bury' | 'draw' | 'discard' | 'peng' | 'gang' | 'hu' | 'skip';
  tiles?: Tile[];  // 根据 action 类型，可选或必需
}
```

---

### 2.4 GameStateResponse（游戏状态响应）

对应后端：`app/schemas.py::GameStateResponse`

```typescript
// types/api.ts

/**
 * 游戏状态响应
 *
 * 后端对应：GameStateResponse(BaseModel)
 *
 * 注意：实际返回格式与 GameState 一致，但包装在外层
 */
export interface GameStateResponse {
  gameId: string;
  gamePhase: GamePhase;
  currentPlayerIndex: number;
  players: Player[];
  publicDiscards: Tile[];
  wallRemainingCount: number;
  baseScore: number;
  winners?: WinDetail[];  // 游戏结束时包含胜者信息
}

/**
 * 胜者详情（游戏结束时）
 */
export interface WinDetail {
  playerId: string;
  fanCount: number;      // 番数
  scoreChange: number;   // 分数变化
}
```

---

### 2.5 ErrorResponse（错误响应）

对应后端：`app/schemas.py::ErrorResponse`

```typescript
// types/api.ts

/**
 * 标准错误响应
 *
 * 后端对应：ErrorResponse(BaseModel)
 * FastAPI 的 HTTPException 自动生成此格式
 */
export interface ErrorResponse {
  detail: string;  // 错误消息（中文或英文）
}
```

---

## 3. UI 状态类型

### 3.1 UIStore（UI 状态）

前端专用，用于 Zustand 状态管理

```typescript
// stores/uiStore.ts

/**
 * UI 状态（前端专用，无后端对应）
 */
export interface UIStore {
  // Toast 提示
  toast: ToastMessage | null;
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;

  // Modal 模态框
  modal: ModalConfig | null;
  showModal: (config: ModalConfig) => void;
  hideModal: () => void;

  // 手牌选择状态
  selectedTiles: string[];  // 选中的牌 ID 列表
  selectTile: (tileId: string) => void;
  clearSelection: () => void;

  // 回合状态
  isPlayerTurn: boolean;
  setPlayerTurn: (isTurn: boolean) => void;
}
```

---

### 3.2 ToastMessage（提示消息）

```typescript
// types/ui.ts

/**
 * Toast 提示消息配置
 */
export interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;  // 默认 3000ms
}

export interface ToastMessage extends ToastConfig {
  id: string;  // 唯一标识符（用于多个 Toast）
}
```

---

### 3.3 ModalConfig（模态框配置）

```typescript
// types/ui.ts

/**
 * Modal 模态框配置
 */
export interface ModalConfig {
  title: string;
  content: string;
  confirmText?: string;  // 默认"确定"
  cancelText?: string;   // 默认"取消"
  onConfirm?: () => void;
  onCancel?: () => void;
  closable?: boolean;    // 是否可通过点击遮罩关闭，默认 true
}
```

---

### 3.4 GameStore（游戏状态）

前端专用，用于 Zustand 管理本地游戏状态

```typescript
// stores/gameStore.ts

/**
 * 游戏状态（前端本地状态）
 */
export interface GameStore {
  gameId: string | null;
  currentGameState: GameState | null;

  // 操作
  setGameId: (id: string) => void;
  setGameState: (state: GameState) => void;
  reset: () => void;
}
```

---

## 4. 类型同步策略

### 4.1 手动维护流程

**后端修改类型时的前端同步步骤**：

1. **检查后端变更**：查看后端 PR 中的 dataclass 修改
2. **更新前端类型**：在 `types/` 目录中同步修改对应 TypeScript 类型
3. **更新转换函数**：如果字段名变更，更新 `create*()` 工具函数
4. **运行类型检查**：`npm run type-check`
5. **运行集成测试**：`npm run test:integration`（验证 API 返回数据）
6. **提交到同一 PR**：前后端类型修改在同一 PR 中提交

---

### 4.2 字段命名转换

**后端（Python）→ 前端（TypeScript）字段名映射**：

| 后端字段（snake_case） | 前端字段（camelCase） |
|------------------------|----------------------|
| `player_id` | `playerId` |
| `game_id` | `gameId` |
| `game_phase` | `gamePhase` |
| `current_player_index` | `currentPlayerIndex` |
| `public_discards` | `publicDiscards` |
| `wall_remaining_count` | `wallRemainingCount` |
| `base_score` | `baseScore` |
| `missing_suit` | `missingSuit` |
| `is_hu` | `isHu` |
| `buried_cards` | `buriedCards` |
| `hand_count` | `handCount` |
| `meld_type` | `meldType` |
| `is_concealed` | `isConcealed` |
| `action_type` | `actionType` |
| `target_tile` | `targetTile` |

**转换策略**：
- 在 API 层（`services/api/gameApi.ts`）统一处理字段名转换
- 使用 `create*()` 工具函数封装转换逻辑
- 前端代码中始终使用 camelCase

---

### 4.3 类型一致性测试

**集成测试示例**（验证前后端类型对齐）：

```typescript
// tests/integration/typeConsistency.test.ts
import { describe, it, expect } from 'vitest';
import { gameApi } from '@/services/api/gameApi';
import { GameState, Tile, Player } from '@/types';

describe('前后端类型一致性', () => {
  it('创建游戏返回的 GameState 应符合前端类型定义', async () => {
    const response = await gameApi.createGame();
    const gameState: GameState = response.state;

    // 验证必需字段存在
    expect(gameState.gameId).toBeDefined();
    expect(gameState.gamePhase).toBeDefined();
    expect(gameState.players).toBeInstanceOf(Array);
    expect(gameState.players.length).toBe(4);

    // 验证玩家结构
    const player = gameState.players[0];
    expect(player.playerId).toBeDefined();
    expect(player.score).toBe(100);
    expect(player.melds).toBeInstanceOf(Array);
  });

  it('Tile 类型应包含 suit 和 rank', async () => {
    const response = await gameApi.createGame();
    const player = response.state.players[0];

    if (player.hand && player.hand.length > 0) {
      const tile: Tile = player.hand[0];
      expect(tile.suit).toMatch(/^(WAN|TIAO|TONG)$/);
      expect(tile.rank).toBeGreaterThanOrEqual(1);
      expect(tile.rank).toBeLessThanOrEqual(9);
    }
  });

  it('Player 类型应正确区分 hand 和 handCount', async () => {
    const response = await gameApi.createGame();

    // 真人玩家（索引0）应包含完整手牌
    const humanPlayer = response.state.players[0];
    expect(humanPlayer.hand).toBeDefined();
    expect(humanPlayer.handCount).toBeUndefined();

    // AI 玩家应仅包含手牌数量
    const aiPlayer = response.state.players[1];
    expect(aiPlayer.hand).toBeUndefined();
    expect(aiPlayer.handCount).toBeGreaterThanOrEqual(0);
  });
});
```

---

### 4.4 类型导出结构

**统一导出（避免循环依赖）**：

```typescript
// types/index.ts

// 枚举
export * from './tile';      // Suit, parseSuit
export * from './meld';      // MeldType
export * from './game';      // GamePhase
export * from './action';    // ActionType

// 数据模型
export type { Tile } from './tile';
export type { Meld } from './meld';
export type { Player } from './player';
export type { GameState } from './game';
export type { PlayerResponse } from './action';

// API 类型
export type {
  CreateGameRequest,
  CreateGameResponse,
  PlayerActionRequest,
  GameStateResponse,
  ErrorResponse,
  WinDetail
} from './api';

// UI 类型
export type {
  ToastConfig,
  ToastMessage,
  ModalConfig
} from './ui';

// 工具函数
export {
  createTile,
  getTileId,
  tilesEqual
} from './tile';

export {
  createMeld
} from './meld';

export {
  createPlayer
} from './player';

export {
  createGameState
} from './game';

export {
  getActionPriority
} from './action';
```

---

## 5. 类型使用示例

### 5.1 API 调用（服务层）

```typescript
// services/api/gameApi.ts
import axios from 'axios';
import {
  CreateGameRequest,
  CreateGameResponse,
  PlayerActionRequest,
  GameStateResponse,
  createGameState
} from '@/types';

export const gameApi = {
  /**
   * 创建新游戏
   */
  async createGame(request?: CreateGameRequest): Promise<CreateGameResponse> {
    const { data } = await axios.post('/games', request);

    return {
      gameId: data.game_id,
      state: createGameState(data.state)  // 转换字段名
    };
  },

  /**
   * 获取游戏状态
   */
  async getGameState(gameId: string, playerId: string): Promise<GameStateResponse> {
    const { data } = await axios.get(`/games/${gameId}`, {
      params: { player_id: playerId }
    });

    return createGameState(data);
  },

  /**
   * 提交玩家动作
   */
  async submitAction(gameId: string, request: PlayerActionRequest): Promise<GameStateResponse> {
    const { data } = await axios.post(`/games/${gameId}/action`, {
      player_id: request.playerId,
      action: request.action,
      tiles: request.tiles?.map(t => ({ suit: t.suit, rank: t.rank }))
    });

    return createGameState(data);
  }
};
```

---

### 5.2 组件使用（UI 层）

```typescript
// components/game/PlayerHand.tsx
import React from 'react';
import { Tile, getTileId } from '@/types';

interface PlayerHandProps {
  tiles: Tile[];
  onTileClick: (tile: Tile) => void;
  selectedTiles: string[];
}

export function PlayerHand({ tiles, onTileClick, selectedTiles }: PlayerHandProps) {
  return (
    <div className="flex gap-2">
      {tiles.map((tile) => {
        const tileId = getTileId(tile);
        const isSelected = selectedTiles.includes(tileId);

        return (
          <div
            key={tileId}
            onClick={() => onTileClick(tile)}
            className={`tile ${isSelected ? 'selected' : ''}`}
          >
            {tile.suit}-{tile.rank}
          </div>
        );
      })}
    </div>
  );
}
```

---

### 5.3 状态管理（Store）

```typescript
// stores/gameStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { GameState, Tile } from '@/types';

interface GameStore {
  gameId: string | null;
  gameState: GameState | null;
  selectedTiles: string[];

  setGameId: (id: string) => void;
  setGameState: (state: GameState) => void;
  selectTile: (tileId: string) => void;
  clearSelection: () => void;
}

export const useGameStore = create<GameStore>()(
  devtools(
    (set) => ({
      gameId: null,
      gameState: null,
      selectedTiles: [],

      setGameId: (id) => set({ gameId: id }),
      setGameState: (state) => set({ gameState: state }),

      selectTile: (tileId) =>
        set((state) => ({
          selectedTiles: state.selectedTiles.includes(tileId)
            ? state.selectedTiles.filter((id) => id !== tileId)
            : [...state.selectedTiles, tileId]
        })),

      clearSelection: () => set({ selectedTiles: [] })
    }),
    { name: 'GameStore' }
  )
);
```

---

## 6. 总结

### 核心原则

1. **手动维护类型**：项目规模小，手动维护成本低于自动化工具
2. **严格类型检查**：启用 TypeScript strict 模式，捕获类型错误
3. **命名转换统一**：在 API 层处理 snake_case → camelCase
4. **集成测试验证**：通过真实 API 调用验证类型一致性
5. **快速失败机制**：类型不匹配时立即抛出错误

### 维护清单

- ✅ 后端 dataclass 修改时，同步更新前端类型
- ✅ 新增字段时，更新转换函数（`create*()` 工具函数）
- ✅ 运行 `npm run type-check` 检查类型错误
- ✅ 运行 `npm run test:integration` 验证 API 一致性
- ✅ 前后端类型修改在同一 PR 中提交
- ✅ 在 `types/index.ts` 统一导出，避免循环依赖

---

**版本历史**：
- v1.0 (2025-11-07)：初始版本，定义所有核心类型和 API 类型
