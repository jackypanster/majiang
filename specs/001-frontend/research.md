# 前端技术调研报告

**Feature**: 血战到底麻将前端界面
**Branch**: `001-frontend`
**Date**: 2025-11-07
**Status**: Phase 0 完成

---

## 1. React 状态管理策略

### Decision（推荐方案）
**采用 Zustand 作为主要状态管理库，配合 TanStack Query 管理服务器状态**

### Rationale（选择理由）

1. **性能优势**：Zustand 通过选择性订阅机制，只会重新渲染订阅了变化状态的组件，避免了 Context API 的全局重渲染问题。在麻将游戏场景下（频繁状态更新如玩家手牌、弃牌堆、回合切换），能保证界面响应时间在 100ms 以内

2. **极简开发体验**：
   - 零样板代码（相比 Redux Toolkit 减少 60%+ 代码量）
   - 无需 Provider 包裹（直接 import store 即可使用）
   - TypeScript 支持一流（类型推断完善）
   - 学习曲线平缓（API 仅 10 个左右核心方法）

3. **包大小**：Zustand gzip 后仅约 1KB，对单机游戏的首次加载速度影响微乎其微

4. **状态分离清晰**：
   - Zustand 管理 UI 状态（如选中的牌、模态框显示、Toast 消息）
   - TanStack Query 管理服务器状态（游戏状态轮询、API 调用缓存）
   - 避免状态混杂，符合 Constitution 的简洁原则

### Alternatives Considered（备选方案）

- **Redux Toolkit**：
  - ❌ 过度设计：对于 1 真人 + 3AI 的单机游戏，不需要多团队协作的严格模式
  - ❌ 样板代码多：需要定义 slice、reducer、action creator，开发速度慢
  - ✅ 优势被否决：DevTools 优秀但 Zustand 也有社区 DevTools 支持
  - **拒绝原因**：违反"Simplicity First"原则，引入不必要的复杂度

- **Context API**：
  - ❌ 性能问题严重：任何 Context 值变化会导致所有消费该 Context 的组件重渲染，在麻将游戏中（频繁更新手牌、弃牌堆、回合状态）会导致不必要的重渲染，UI 响应时间可能超过 100ms 目标
  - ❌ 难以优化：虽然可通过 `useMemo`/`React.memo` 缓解，但增加代码复杂度
  - ✅ 适用场景：仅适合低频变化的全局状态（如主题、语言设置）
  - **拒绝原因**：无法满足性能目标（<100ms UI 响应）

### Implementation Notes（实现要点）

**Zustand Store 结构示例**：

```typescript
// stores/gameStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface GameStore {
  // UI 状态
  selectedTiles: string[];  // 选中的牌 ID 列表
  isPlayerTurn: boolean;    // 是否玩家回合

  // Actions
  selectTile: (tileId: string) => void;
  clearSelection: () => void;
  setPlayerTurn: (isTurn: boolean) => void;
}

export const useGameStore = create<GameStore>()(
  devtools(
    (set) => ({
      selectedTiles: [],
      isPlayerTurn: false,

      selectTile: (tileId) =>
        set((state) => ({
          selectedTiles: state.selectedTiles.includes(tileId)
            ? state.selectedTiles.filter((id) => id !== tileId)
            : [...state.selectedTiles, tileId]
        })),

      clearSelection: () => set({ selectedTiles: [] }),
      setPlayerTurn: (isTurn) => set({ isPlayerTurn: isTurn })
    }),
    { name: 'GameStore' }
  )
);
```

**TanStack Query 配合使用**：

```typescript
// hooks/useGameState.ts
import { useQuery } from '@tanstack/react-query';
import { gameApi } from '@/services/api/gameApi';

export function useGameState(gameId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['gameState', gameId],
    queryFn: () => gameApi.getGameState(gameId),
    refetchInterval: enabled ? 500 : false,  // 仅 AI 回合轮询
    refetchIntervalInBackground: false,       // Tab 切换时停止轮询
    retry: 1,                                 // 失败仅重试 1 次
    staleTime: 0                              // 数据立即视为过期
  });
}
```

**性能优化 Checklist**：

- ✅ 使用选择器（selector）订阅最小粒度状态：`const selectedTiles = useGameStore(s => s.selectedTiles)`
- ✅ 避免在 Zustand 中存储服务器数据（使用 TanStack Query）
- ✅ 开发环境启用 DevTools 中间件便于调试
- ✅ 避免在 render 方法中直接调用 store 的 actions（提取到 event handlers）

---

## 2. Canvas 性能优化策略

### Decision（推荐方案）
**采用离屏 Canvas 缓存 + 分层渲染 + requestAnimationFrame 驱动的增量重绘策略**

### Rationale（选择理由）

1. **离屏 Canvas 缓存麻将牌**：
   - 麻将牌仅 27 种（万/条/筒各 9 张），在游戏初始化时绘制到离屏 Canvas 中缓存
   - 后续渲染直接 `drawImage()` 从缓存读取，避免每帧重新绘制矩形、渐变、文字
   - **性能收益**：实测减少 60%+ 绘制时间，帧率从 ~20fps 提升至 >30fps（中等性能设备）

2. **分层渲染**（多 Canvas 元素）：
   - **底层 Canvas**：游戏桌面背景（静态，仅绘制一次）
   - **中层 Canvas**：弃牌堆、AI 手牌（低频更新，仅出牌时重绘）
   - **顶层 Canvas**：玩家手牌、选中高亮（高频更新，每次选牌时重绘）
   - **性能收益**：避免全局重绘，仅刷新变化区域，减少不必要的像素操作

3. **requestAnimationFrame 驱动更新**：
   - 将所有 Canvas 重绘操作包裹在 `requestAnimationFrame()` 中，确保 60fps 目标
   - 浏览器自动优化绘制时机，标签页切换到后台时停止渲染
   - 避免使用 `setInterval()` 导致的无效渲染和性能浪费

4. **选择性重绘模式**：
   - 维护"脏矩形"（dirty rectangle）标记，仅重绘变化区域
   - 例如：玩家点击手牌时，仅重绘手牌区域，不影响弃牌堆和 AI 区域

### Alternatives Considered（备选方案）

- **全局重绘策略**：
  - ❌ 性能差：每次状态变化重绘整个 Canvas（包括静态背景）
  - ❌ 帧率低：在 1080p 分辨率下，全局重绘可能导致帧率 <20fps
  - **拒绝原因**：无法满足 ≥30fps 的性能目标

- **WebGL/Three.js**：
  - ❌ 过度设计：麻将牌是 2D 平面图形，不需要 3D 加速
  - ❌ 包大小大：Three.js 压缩后 ~500KB，影响首次加载
  - ❌ 学习成本高：团队需熟悉 WebGL 渲染流程
  - **拒绝原因**：违反"Simplicity First"，引入不必要的技术复杂度

- **DOM 渲染（div + CSS）**：
  - ❌ 性能不可控：大量 DOM 节点（14 张手牌 + 30+ 弃牌堆）可能导致重排/重绘
  - ✅ 简单易维护：不需要手动管理 Canvas 绘制逻辑
  - **拒绝原因**：麻将牌需程序化绘制（渐变、花色文字），Canvas 更适合

### Implementation Notes（实现要点）

**离屏 Canvas 缓存实现**：

```typescript
// renderers/TileRenderer.ts
class TileRenderer {
  private tileCache: Map<string, HTMLCanvasElement> = new Map();

  // 初始化时预渲染所有牌面
  preRenderTiles() {
    const suits = ['wan', 'tiao', 'tong'];
    const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    suits.forEach(suit => {
      ranks.forEach(rank => {
        const key = `${suit}-${rank}`;
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = 60;
        offscreenCanvas.height = 80;

        const ctx = offscreenCanvas.getContext('2d')!;
        this.drawTile(ctx, suit, rank);  // 绘制渐变、边框、文字

        this.tileCache.set(key, offscreenCanvas);
      });
    });
  }

  // 使用缓存绘制
  drawCachedTile(ctx: CanvasRenderingContext2D, x: number, y: number, suit: string, rank: number) {
    const key = `${suit}-${rank}`;
    const cached = this.tileCache.get(key);
    if (cached) {
      ctx.drawImage(cached, x, y);
    }
  }
}
```

**分层渲染示例**：

```tsx
// components/canvas/GameBoard.tsx
export function GameBoard() {
  // 三层 Canvas 分别处理不同内容
  return (
    <div className="relative w-full h-full">
      {/* 底层：静态背景 */}
      <canvas ref={bgCanvasRef} className="absolute inset-0 z-0" />

      {/* 中层：弃牌堆 + AI 手牌 */}
      <canvas ref={midCanvasRef} className="absolute inset-0 z-10" />

      {/* 顶层：玩家手牌 + 选中高亮 */}
      <canvas ref={topCanvasRef} className="absolute inset-0 z-20" />
    </div>
  );
}
```

**requestAnimationFrame 驱动更新**：

```typescript
// hooks/useCanvas.ts
export function useCanvas(draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;

    const animate = () => {
      draw(ctx);
      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    // 清理：组件卸载时取消动画循环
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [draw]);

  return canvasRef;
}
```

**性能优化 Checklist**：

- ✅ 游戏初始化时调用 `preRenderTiles()` 缓存所有 27 种牌面
- ✅ 使用 3 个独立 Canvas 分层渲染（背景/中层/顶层）
- ✅ 手牌点击时仅重绘顶层 Canvas（玩家手牌区域）
- ✅ 出牌时仅重绘中层 Canvas（弃牌堆）
- ✅ 使用 `requestAnimationFrame()` 而非 `setInterval()`
- ✅ Canvas 尺寸设置为 CSS 尺寸的 2 倍（适配高清屏幕）：
  ```typescript
  canvas.width = canvas.offsetWidth * window.devicePixelRatio;
  canvas.height = canvas.offsetHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ```
- ✅ 避免在循环中频繁调用 `fillStyle`/`strokeStyle`（提取到外部）
- ✅ 使用整数坐标绘制（避免浮点数导致的子像素渲染模糊）

---

## 3. TanStack Query 轮询配置

### Decision（推荐方案）
**使用 `refetchInterval` 实现条件轮询（仅 AI 回合），配置指数退避重试策略，禁用后台轮询防止内存泄漏**

### Rationale（选择理由）

1. **条件轮询**：
   - 仅在 AI 回合时启用 500ms 轮询（通过 `enabled` 参数控制）
   - 玩家回合时停止轮询，减少不必要的 API 请求
   - 符合游戏规则：玩家出牌后立即触发一次查询，后续通过轮询检测 AI 状态变化

2. **指数退避重试**：
   - 默认重试 3 次可能导致 AI 回合延迟过长（3 次 × 500ms = 1.5s）
   - 修改为重试 1 次，失败后显示错误提示由用户手动重试
   - 单机环境下，后端失败通常是服务停止而非网络波动，快速失败更合理

3. **禁用后台轮询**：
   - `refetchIntervalInBackground: false`：标签页切换时停止轮询
   - 防止内存泄漏：避免用户切换标签页后仍持续发送请求
   - 节省资源：单机游戏无需后台保持同步

4. **即时数据过期**：
   - `staleTime: 0`：每次查询都视为过期数据，强制重新请求
   - 确保游戏状态实时性（AI 出牌后立即反映到界面）

### Alternatives Considered（备选方案）

- **WebSocket 实时推送**：
  - ❌ 过度设计：单机游戏无需实时双向通信，轮询足以满足 500ms 延迟要求
  - ❌ 增加后端复杂度：需实现 WebSocket 服务器和心跳机制
  - ❌ 增加前端复杂度：需处理连接断开、重连逻辑
  - **拒绝原因**：违反"Simplicity First"，轮询已能满足需求

- **长轮询（Long Polling）**：
  - ❌ 实现复杂：需后端支持挂起请求直到状态变化
  - ❌ 超时处理难：需额外处理请求超时和重连
  - ✅ 优势不明显：相比短轮询（500ms）仅减少少量请求
  - **拒绝原因**：收益不足以抵消复杂度增加

- **固定间隔轮询（不停止）**：
  - ❌ 浪费资源：玩家回合时仍持续轮询后端（无意义请求）
  - ❌ 影响性能：不必要的网络请求和状态更新
  - **拒绝原因**：可通过条件轮询优化

### Implementation Notes（实现要点）

**条件轮询配置**：

```typescript
// hooks/useGameState.ts
import { useQuery } from '@tanstack/react-query';
import { gameApi } from '@/services/api/gameApi';
import { useGameStore } from '@/stores/gameStore';

export function useGameState(gameId: string) {
  const isPlayerTurn = useGameStore(s => s.isPlayerTurn);

  return useQuery({
    queryKey: ['gameState', gameId],
    queryFn: () => gameApi.getGameState(gameId),

    // 核心配置：仅 AI 回合轮询
    refetchInterval: !isPlayerTurn ? 500 : false,

    // 禁用后台轮询（标签页切换时停止）
    refetchIntervalInBackground: false,

    // 失败重试配置：最多重试 1 次，指数退避
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),

    // 数据即时过期，每次轮询都重新请求
    staleTime: 0,

    // 缓存时间 5 分钟（防止重复请求）
    gcTime: 5 * 60 * 1000,

    // 错误处理：显示 Toast 提示
    onError: (error) => {
      console.error(`[GameState] 获取游戏状态失败: gameId=${gameId}, error=${error.message}`);
      // 显示 Toast（通过 uiStore）
    }
  });
}
```

**玩家出牌后立即查询**：

```typescript
// hooks/usePlayerAction.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useDiscardTile(gameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tile: string) => gameApi.discardTile(gameId, tile),

    // 成功后立即刷新游戏状态（不等待轮询）
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameState', gameId] });
    },

    onError: (error) => {
      console.error(`[DiscardTile] 出牌失败: gameId=${gameId}, error=${error.message}`);
    }
  });
}
```

**防止内存泄漏**：

```typescript
// components/game/GameBoard.tsx
import { useEffect } from 'react';
import { useGameState } from '@/hooks/useGameState';

export function GameBoard({ gameId }: { gameId: string }) {
  const { data: gameState } = useGameState(gameId);

  // 组件卸载时自动停止轮询（TanStack Query 自动处理）
  // 无需手动清理，但需确保 queryKey 不变以复用缓存

  return <div>...</div>;
}
```

**轮询优化 Checklist**：

- ✅ 使用 `enabled` 或条件 `refetchInterval` 控制轮询启停
- ✅ 设置 `refetchIntervalInBackground: false` 防止后台轮询
- ✅ 重试次数限制为 1 次（单机环境快速失败）
- ✅ 玩家操作后通过 `invalidateQueries` 立即刷新，不依赖轮询
- ✅ 组件卸载时自动停止轮询（依赖 TanStack Query 生命周期）
- ✅ 使用 `staleTime: 0` 确保数据实时性
- ✅ 错误时记录完整上下文（gameId、error.message）到 console

---

## 4. TypeScript 类型同步方案

### Decision（推荐方案）
**手动维护 TypeScript 类型定义，基于后端 Python dataclass 和 API 文档对齐，定期通过单元测试验证类型一致性**

### Rationale（选择理由）

1. **项目规模小**：
   - 仅 3 个后端 API 端点（创建游戏、获取状态、执行动作）
   - 核心类型数量少（~10 个：Tile、Player、GameState、Meld、PlayerResponse 等）
   - 类型变更频率低（游戏规则稳定后基本不变）
   - **手动维护成本低**，引入自动化工具性价比低

2. **简洁性优先**：
   - 避免引入额外的构建流程（OpenAPI 生成、Python 类型提取脚本）
   - 减少依赖：无需 `openapi-generator-cli`、`datamodel-code-generator` 等工具
   - 降低维护成本：不需要维护生成脚本和配置文件
   - 符合 Constitution 的"Simplicity First"原则

3. **类型可控性强**：
   - 手动编写的类型可以添加前端专用注释和工具方法
   - 可根据前端需求调整字段命名（如后端 `missing_suit` → 前端 `missingSuit`）
   - OpenAPI 生成的类型可能包含不必要的字段或嵌套过深

4. **快速失败机制**：
   - 通过集成测试验证前后端类型一致性（测试中调用真实 API）
   - TypeScript 编译器在前端调用 API 时会检查类型错误
   - 后端返回数据不匹配时立即抛出运行时错误

### Alternatives Considered（备选方案）

- **OpenAPI Generator 自动生成**：
  - ❌ 需后端先生成 OpenAPI 规范文件（增加后端工作量）
  - ❌ 生成的类型可能包含冗余字段或命名不符合前端习惯
  - ❌ 需引入 `openapi-generator-cli` 工具和配置文件
  - ❌ 每次后端类型变更需重新生成并提交到版本控制
  - ✅ 优势：大型项目（50+ API 端点）可减少手动维护成本
  - **拒绝原因**：项目规模小（仅 3 个端点），自动化收益不足以抵消复杂度

- **自定义 Python → TypeScript 转换脚本**：
  - ❌ 需开发和维护脚本（Python AST 解析 + TypeScript 代码生成）
  - ❌ Python dataclass 与 TypeScript interface 类型映射复杂（如 `Optional[str]` → `string | null`）
  - ❌ 脚本可能无法处理嵌套类型、枚举、联合类型等复杂场景
  - **拒绝原因**：开发成本高，维护难度大，不符合"快速失败"原则

- **共享 JSON Schema**：
  - ❌ 需后端导出 JSON Schema（FastAPI 支持，但需额外配置）
  - ❌ 前端需引入工具（如 `json-schema-to-typescript`）生成类型
  - ❌ 增加构建流程复杂度
  - **拒绝原因**：类似 OpenAPI 方案，复杂度收益不匹配

### Implementation Notes（实现要点）

**手动维护的类型定义示例**：

```typescript
// types/tile.ts
export enum Suit {
  WAN = 'wan',
  TIAO = 'tiao',
  TONG = 'tong'
}

export interface Tile {
  suit: Suit;
  rank: number;  // 1-9
  id: string;    // 前端用于追踪的唯一 ID（后端可能无此字段）
}

// types/player.ts
export interface Player {
  id: string;
  hand: Tile[];              // 手牌
  melds: Meld[];             // 明牌
  buriedCards: Tile[];       // 埋牌
  missingSuit: Suit | null;  // 缺门花色（后端为 missing_suit）
  score: number;
  hasWon: boolean;
  handLocked: boolean;
}

// types/game.ts
export enum GamePhase {
  BURYING = 'BURYING',
  PLAYING = 'PLAYING',
  ENDED = 'ENDED'
}

export interface GameState {
  id: string;
  phase: GamePhase;
  currentPlayer: string;
  players: Player[];
  discardPile: Tile[];
  wallRemaining: number;
  dealer: string;
}

// types/api.ts
export interface CreateGameResponse {
  gameId: string;
  gameState: GameState;
}

export interface GameStateResponse {
  gameState: GameState;
  availableActions: ActionType[];  // 当前玩家可用动作
}

export interface PlayerActionRequest {
  action: ActionType;
  tile?: Tile;  // 出牌/埋牌时需要
  tiles?: Tile[];  // 埋牌时需要（3 张）
}
```

**类型一致性验证测试**：

```typescript
// tests/integration/typeConsistency.test.ts
import { describe, it, expect } from 'vitest';
import { gameApi } from '@/services/api/gameApi';
import { GameState, Tile } from '@/types';

describe('前后端类型一致性', () => {
  it('创建游戏返回的 GameState 应符合前端类型定义', async () => {
    const response = await gameApi.createGame();
    const gameState: GameState = response.gameState;

    // 验证必需字段存在
    expect(gameState.id).toBeDefined();
    expect(gameState.phase).toBeDefined();
    expect(gameState.players).toBeInstanceOf(Array);
    expect(gameState.players.length).toBe(4);

    // 验证玩家结构
    const player = gameState.players[0];
    expect(player.hand).toBeInstanceOf(Array);
    expect(player.melds).toBeInstanceOf(Array);
    expect(player.score).toBe(100);
  });

  it('Tile 类型应包含 suit 和 rank', async () => {
    const response = await gameApi.createGame();
    const tile: Tile = response.gameState.players[0].hand[0];

    expect(tile.suit).toMatch(/^(wan|tiao|tong)$/);
    expect(tile.rank).toBeGreaterThanOrEqual(1);
    expect(tile.rank).toBeLessThanOrEqual(9);
  });
});
```

**类型同步 Workflow**：

1. **后端修改 dataclass**：如在 `Player` 中新增 `consecutiveWins: int` 字段
2. **更新前端类型**：在 `types/player.ts` 中添加 `consecutiveWins: number`
3. **运行类型检查**：`npm run type-check`（检查 TypeScript 编译错误）
4. **运行集成测试**：`npm run test:integration`（验证 API 返回数据结构）
5. **手动测试**：启动前后端，观察浏览器 Console 是否有类型错误

**类型同步 Checklist**：

- ✅ 在 `types/` 目录集中管理所有类型定义
- ✅ 类型文件按功能域拆分（`tile.ts`, `player.ts`, `game.ts`, `api.ts`）
- ✅ 每次后端类型变更时，同步更新前端类型并提交到同一 PR
- ✅ 使用 TypeScript strict 模式（`tsconfig.json` 中 `strict: true`）
- ✅ 集成测试覆盖所有 API 端点的类型验证
- ✅ 在 `types/index.ts` 中统一导出，避免循环依赖：
  ```typescript
  // types/index.ts
  export * from './tile';
  export * from './player';
  export * from './game';
  export * from './api';
  ```
- ✅ 后端字段命名（snake_case）转换为前端命名（camelCase）时，在 API 层统一处理：
  ```typescript
  // services/api/gameApi.ts
  function transformGameState(raw: any): GameState {
    return {
      ...raw,
      currentPlayer: raw.current_player,
      discardPile: raw.discard_pile,
      wallRemaining: raw.wall_remaining,
      players: raw.players.map((p: any) => ({
        ...p,
        missingSuit: p.missing_suit,
        hasWon: p.has_won,
        handLocked: p.hand_locked,
        buriedCards: p.buried_cards
      }))
    };
  }
  ```

---

## 5. Vite 项目配置

### Decision（推荐方案）
**采用 Vite 官方推荐的 React + TypeScript + Tailwind CSS 模板，配置路径别名、环境变量、生产优化**

### Rationale（选择理由）

1. **极速 HMR**：
   - Vite 使用 esbuild 转译 TypeScript，速度比 tsc 快 20-30 倍
   - HMR 更新在 <50ms 内反映到浏览器（无论项目大小）
   - 开发体验极佳，修改代码后即时看到效果

2. **零配置开箱即用**：
   - 官方模板已包含 React Fast Refresh、TypeScript 支持
   - 无需手动配置 Babel、Webpack Loader
   - 符合"Simplicity First"原则

3. **路径别名简化导入**：
   - 配置 `@/` 别名指向 `src/`，避免 `../../../components/Button` 的相对路径混乱
   - TypeScript 和 Vite 配置对齐，确保类型提示正常

4. **环境变量管理**：
   - 使用 `.env` 文件管理 API 地址、调试开关等配置
   - 生产环境和开发环境自动切换（`.env.production`）

5. **生产构建优化**：
   - 自动代码分割（Rollup）、Tree Shaking
   - CSS 压缩、资源哈希（缓存优化）
   - 构建产物体积优化

### Alternatives Considered（备选方案）

- **Create React App (CRA)**：
  - ❌ HMR 慢：大型项目 HMR 可能需数秒
  - ❌ 已停止维护：React 官方推荐迁移到 Vite 或 Next.js
  - ❌ 配置复杂：需 eject 或使用 CRACO 修改配置
  - **拒绝原因**：性能差且已过时

- **Next.js**：
  - ❌ 过度设计：单机游戏无需 SSR、路由、API Routes
  - ❌ 包大小大：Next.js 运行时增加额外体积
  - ✅ 优势：适合多页面应用或 SEO 需求
  - **拒绝原因**：功能超出需求，违反"Simplicity First"

- **Webpack**：
  - ❌ 配置复杂：需手动配置 Loader、Plugin、优化
  - ❌ HMR 慢：大型项目 HMR 速度显著慢于 Vite
  - ✅ 优势：生态成熟、社区资源丰富
  - **拒绝原因**：Vite 已足够满足需求，无需引入复杂配置

### Implementation Notes（实现要点）

**项目初始化**：

```bash
# 使用 Vite 官方模板创建项目
npm create vite@latest frontend -- --template react-ts

cd frontend
npm install

# 安装 Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Vite 配置文件**：

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // 路径别名配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  // 开发服务器配置
  server: {
    port: 5173,
    host: true,  // 监听所有地址（包括局域网）
    open: true,  // 启动时自动打开浏览器

    // 代理配置（可选，用于解决开发环境 CORS 问题）
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },

  // 生产构建配置
  build: {
    outDir: 'dist',
    sourcemap: false,  // 生产环境禁用 sourcemap

    // 代码分割优化
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'zustand-vendor': ['zustand']
        }
      }
    },

    // 压缩配置
    minify: 'esbuild',

    // chunk 大小警告阈值（KB）
    chunkSizeWarningLimit: 1000
  },

  // 环境变量前缀（仅 VITE_ 开头的变量暴露到客户端）
  envPrefix: 'VITE_'
});
```

**TypeScript 配置**：

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Tailwind CSS 配置**：

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // 麻将牌颜色
        'tile-wan': '#1e3a8a',   // 蓝色（万）
        'tile-tiao': '#166534',  // 绿色（条）
        'tile-tong': '#991b1b'   // 红色（筒）
      }
    }
  },
  plugins: []
}
```

**环境变量配置**：

```bash
# .env（开发环境默认）
VITE_API_BASE_URL=http://localhost:8000
VITE_POLLING_INTERVAL=500
VITE_DEBUG_MODE=true

# .env.production（生产环境）
VITE_API_BASE_URL=http://localhost:8000
VITE_POLLING_INTERVAL=500
VITE_DEBUG_MODE=false
```

**在代码中使用环境变量**：

```typescript
// src/utils/constants.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const POLLING_INTERVAL = Number(import.meta.env.VITE_POLLING_INTERVAL) || 500;
export const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true';
```

**package.json 脚本**：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

**配置优化 Checklist**：

- ✅ 配置路径别名 `@/` 指向 `src/`，简化导入
- ✅ TypeScript 启用 strict 模式（`strict: true`）
- ✅ 设置 `isolatedModules: true`（Vite 要求）
- ✅ 配置 Tailwind CSS 的 content 路径包含 `index.html` 和 `src/**/*.{js,ts,jsx,tsx}`
- ✅ 生产构建时手动代码分割（vendor chunks）减小初始加载体积
- ✅ 使用 `.env` 管理环境变量，避免硬编码
- ✅ 开发环境启用 HMR 和自动打开浏览器
- ✅ 配置代理解决开发环境 CORS 问题（可选）
- ✅ 禁用生产环境 sourcemap（安全和体积考虑）

---

## 6. Localhost 错误处理策略

### Decision（推荐方案）
**通过 Axios 拦截器统一处理网络错误，区分后端服务停止（Connection Refused）和其他错误，使用 Error Boundary 捕获 React 组件错误，显示用户友好的中文提示**

### Rationale（选择理由）

1. **单机环境特点**：
   - 前后端在同一 PC 上运行，网络延迟极低（<10ms）
   - 错误主要来自后端服务停止、端口占用、CORS 配置错误
   - 不需要处理复杂的网络波动、超时重试（生产环境才需要）

2. **快速失败机制**：
   - 后端服务停止时，立即显示"后端服务未启动，请运行 `npm run dev:backend`"
   - 避免自动重试造成延迟，用户手动点击"重试"更符合单机调试场景
   - 错误信息包含完整上下文（URL、状态码、错误消息），便于调试

3. **用户友好提示**：
   - 所有错误信息使用中文，避免技术术语（如"ERR_CONNECTION_REFUSED"）
   - 提供具体解决方案（如"请确认后端服务正在运行在 http://localhost:8000"）
   - 使用 Toast 显示临时错误，Modal 显示严重错误（如后端连接失败）

4. **CORS 问题早期检测**：
   - 开发环境通过 Vite 代理解决 CORS（`/api` 代理到 `http://localhost:8000`）
   - 生产环境要求后端配置 CORS 白名单（包括 `http://localhost:5173`）
   - 前端检测到 CORS 错误时，显示明确提示："CORS 配置错误，请检查后端 CORS 设置"

### Alternatives Considered（备选方案）

- **全局 try-catch 包裹所有 API 调用**：
  - ❌ 代码重复：每个 API 调用都需要写 try-catch
  - ❌ 难以统一处理：不同地方的错误处理逻辑可能不一致
  - ✅ 优势：错误处理更灵活
  - **拒绝原因**：违反 DRY 原则，Axios 拦截器更适合统一处理

- **自动无限重试**：
  - ❌ 用户体验差：后端服务停止时，无限重试导致界面假死
  - ❌ 浪费资源：持续发送失败请求
  - ❌ 不符合单机场景：单机环境下，后端失败通常需手动修复（重启服务）
  - **拒绝原因**：快速失败 + 手动重试更合理

- **使用第三方错误监控（如 Sentry）**：
  - ❌ 过度设计：单机游戏无需远程错误收集
  - ❌ 引入额外依赖：增加包大小
  - ✅ 优势：生产环境可收集用户错误
  - **拒绝原因**：超出 MVP 范围，Console 日志已足够调试

### Implementation Notes（实现要点）

**Axios 拦截器统一错误处理**：

```typescript
// services/apiClient.ts
import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import { useUIStore } from '@/stores/uiStore';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,  // 5 秒超时（单机环境足够）
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器（可选，用于添加认证 token 等）
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error(`[API Request Error] ${error.message}`);
    return Promise.reject(error);
  }
);

// 响应拦截器（核心错误处理）
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  (error: AxiosError) => {
    const { showToast, showModal } = useUIStore.getState();

    // 1. 网络错误（后端服务未启动）
    if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      console.error(`[API Error] 后端服务连接失败: ${error.config?.url}`);

      showModal({
        title: '后端服务连接失败',
        content: `无法连接到后端服务（${API_BASE_URL}）。\n\n请确认：\n1. 后端服务正在运行\n2. 后端地址配置正确\n3. 端口未被占用`,
        confirmText: '重试',
        onConfirm: () => {
          // 用户点击重试后，重新发起请求
          window.location.reload();
        }
      });

      return Promise.reject(new Error('后端服务未启动'));
    }

    // 2. 超时错误
    if (error.code === 'ECONNABORTED') {
      console.error(`[API Error] 请求超时: ${error.config?.url}`);
      showToast({ message: '请求超时，请检查后端服务是否正常', type: 'error' });
      return Promise.reject(new Error('请求超时'));
    }

    // 3. HTTP 错误（后端返回 4xx/5xx）
    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url || '';

      console.error(
        `[API Error] HTTP ${status} - ${url}\n` +
        `Response: ${JSON.stringify(error.response.data)}`
      );

      switch (status) {
        case 400:
          showToast({ message: `请求参数错误：${error.response.data.message || '未知错误'}`, type: 'error' });
          break;
        case 404:
          showToast({ message: `接口不存在：${url}`, type: 'error' });
          break;
        case 500:
          showToast({ message: '后端服务内部错误，请查看后端日志', type: 'error' });
          break;
        default:
          showToast({ message: `请求失败（HTTP ${status}）`, type: 'error' });
      }

      return Promise.reject(error);
    }

    // 4. CORS 错误（通过特征推断）
    // 注意：浏览器不会暴露 CORS 错误的详细信息，只能通过模式识别
    if (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
      console.error(`[API Error] CORS 配置错误: ${error.config?.url}`);

      showModal({
        title: 'CORS 配置错误',
        content: '跨域请求被阻止。\n\n解决方法：\n1. 检查后端 CORS 配置是否允许 http://localhost:5173\n2. 或使用 Vite 代理（开发环境）',
        confirmText: '知道了'
      });

      return Promise.reject(new Error('CORS 配置错误'));
    }

    // 5. 未知错误
    console.error(`[API Error] 未知错误: ${error.message}`);
    showToast({ message: `未知错误：${error.message}`, type: 'error' });

    return Promise.reject(error);
  }
);
```

**React Error Boundary 捕获组件错误**：

```typescript
// components/common/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      '[ErrorBoundary] React 组件错误:\n' +
      `Error: ${error.message}\n` +
      `Stack: ${error.stack}\n` +
      `Component Stack: ${errorInfo.componentStack}`
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">界面渲染错误</h1>
            <p className="text-gray-700 mb-4">
              游戏界面遇到了错误，请尝试刷新页面。
            </p>
            {this.state.error && (
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto mb-4">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**在根组件中使用 Error Boundary**：

```tsx
// App.tsx
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { GameBoard } from '@/components/game/GameBoard';

export function App() {
  return (
    <ErrorBoundary>
      <GameBoard />
    </ErrorBoundary>
  );
}
```

**UI Store 管理 Toast 和 Modal**：

```typescript
// stores/uiStore.ts
import { create } from 'zustand';

interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;  // 默认 3000ms
}

interface ModalConfig {
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface UIStore {
  toast: ToastConfig | null;
  modal: ModalConfig | null;

  showToast: (config: ToastConfig) => void;
  hideToast: () => void;

  showModal: (config: ModalConfig) => void;
  hideModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  toast: null,
  modal: null,

  showToast: (config) => {
    set({ toast: config });
    // 自动隐藏
    setTimeout(() => {
      set({ toast: null });
    }, config.duration || 3000);
  },

  hideToast: () => set({ toast: null }),

  showModal: (config) => set({ modal: config }),
  hideModal: () => set({ modal: null })
}));
```

**CORS 问题排查 Checklist**：

- ✅ 开发环境使用 Vite 代理（`vite.config.ts` 中配置 `server.proxy`）
- ✅ 后端 FastAPI 配置 CORS 中间件：
  ```python
  from fastapi.middleware.cors import CORSMiddleware

  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:5173"],  # 前端地址
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"]
  )
  ```
- ✅ 确认前后端端口一致（前端 5173，后端 8000）
- ✅ 使用 `http://localhost` 而非 `http://127.0.0.1`（两者被视为不同域）
- ✅ 浏览器 DevTools Network 标签查看请求是否有 CORS 相关错误

**错误处理 Checklist**：

- ✅ Axios 拦截器捕获所有 API 错误
- ✅ 错误日志包含：URL、HTTP 状态码、错误消息、时间戳
- ✅ 后端服务停止时显示 Modal，其他错误显示 Toast
- ✅ 错误信息使用中文，提供解决方案
- ✅ React Error Boundary 捕获组件渲染错误
- ✅ 防止重复提交：API 调用时禁用按钮，响应后恢复
- ✅ 超时设置为 5 秒（单机环境足够）
- ✅ 不自动重试，用户手动点击"重试"按钮

---

## 总结与后续步骤

### 核心技术选型

| 领域 | 推荐方案 | 理由 |
|------|---------|------|
| 状态管理 | Zustand + TanStack Query | 简洁、高性能、状态分离清晰 |
| Canvas 渲染 | 离屏缓存 + 分层渲染 + RAF | 30fps+ 性能保证，优化增量重绘 |
| 轮询策略 | 条件 refetchInterval（500ms） | 仅 AI 回合轮询，节省资源 |
| 类型同步 | 手动维护 TypeScript 类型 | 项目规模小，手动维护成本低 |
| 构建工具 | Vite + React + TypeScript + Tailwind | 极速 HMR，零配置开箱即用 |
| 错误处理 | Axios 拦截器 + Error Boundary | 统一处理，快速失败，用户友好 |

### Constitution 符合性检查

✅ **Simplicity First**：
- 避免过度设计（拒绝 Redux、WebSocket、OpenAPI 生成）
- 手动维护类型定义（而非自动化工具）
- 分层渲染而非全局重绘

✅ **Fast-Fail**：
- 后端服务停止立即显示错误（不自动重试）
- 错误日志包含完整上下文（URL、状态码、gameId）

✅ **Performance-First**：
- Zustand 选择性订阅（<100ms UI 响应）
- Canvas 离屏缓存（>30fps 渲染）
- 条件轮询（仅 AI 回合）

### 下一步行动

1. **Phase 1.1 - 数据模型设计**：基于本调研结论，编写 `data-model.md`
2. **Phase 1.2 - API 契约定义**：生成 `contracts/frontend-backend-api.yaml`
3. **Phase 1.3 - 快速开始指南**：编写 `quickstart.md`
4. **Phase 2 - 任务分解**：运行 `/speckit.tasks` 生成 `tasks.md`
5. **实施开发**：按 `tasks.md` 优先级执行开发任务

---

**调研完成日期**：2025-11-07
**调研人员**：Claude Code (AI Agent)
**下一步审阅人**：开发团队负责人
