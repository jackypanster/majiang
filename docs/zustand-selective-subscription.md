# Zustand 选择性订阅优化 (T098)

## 概述

本文档描述了麻将游戏前端的 Zustand 状态管理优化方案，通过选择性订阅模式避免不必要的组件重新渲染，提升应用性能。

## 问题分析

### 性能问题：全量订阅导致过度渲染

**错误模式** ❌:
```typescript
// 订阅整个 store，任何字段变化都会触发组件重新渲染
const gameStore = useGameStore();
const { gameId, isPlayerTurn } = gameStore;
```

**问题**:
1. 组件订阅了整个 store 对象
2. Store 中任何字段变化都会触发该组件重新渲染
3. 即使组件只使用 `gameId`，`isPlayerTurn` 变化也会导致渲染
4. 多个组件全量订阅时，性能问题呈指数级增长

### 性能指标（优化前的潜在问题）

| 场景 | 问题 | 影响 |
|------|------|------|
| 回合切换 | `isPlayerTurn` 变化触发所有组件渲染 | 不必要的 30+ 组件渲染 |
| 游戏开始 | `gameId` 变化触发所有组件渲染 | 初始化性能降低 |
| Toast 显示 | `toast` 变化触发游戏组件渲染 | UI 卡顿 |

## 解决方案：选择性订阅模式

### 核心原理

Zustand 支持通过 selector 函数实现选择性订阅：

```typescript
// 只订阅 gameId 字段
const gameId = useGameStore((state) => state.gameId);

// 只订阅 isPlayerTurn 字段
const isPlayerTurn = useGameStore((state) => state.isPlayerTurn);

// 只订阅 showToast 函数（函数引用不变，不会导致重新渲染）
const showToast = useUIStore((state) => state.showToast);
```

**工作机制**:
1. Zustand 使用 selector 函数提取特定字段
2. 组件只在该字段值变化时重新渲染
3. 其他字段变化不影响该组件
4. 使用浅比较（shallow comparison）检测变化

### 最佳实践

#### ✅ 正确模式

```typescript
import { useGameStore, useUIStore } from '@/stores';

function GameBoard() {
  // 每个字段单独订阅
  const gameId = useGameStore((s) => s.gameId);
  const isPlayerTurn = useGameStore((s) => s.isPlayerTurn);

  // 订阅 actions（函数引用稳定，不会导致重新渲染）
  const setGameId = useGameStore((s) => s.setGameId);
  const setPlayerTurn = useGameStore((s) => s.setPlayerTurn);

  // UI store 同理
  const showToast = useUIStore((s) => s.showToast);
  const showModal = useUIStore((s) => s.showModal);

  // 组件逻辑...
}
```

#### ❌ 错误模式

```typescript
// 错误 1: 全量订阅
const gameStore = useGameStore();
const { gameId, isPlayerTurn } = gameStore;

// 错误 2: 解构整个 store
const { gameId, isPlayerTurn, setGameId } = useGameStore();

// 错误 3: 订阅多个字段为对象（除非使用 shallow）
const gameData = useGameStore((s) => ({
  gameId: s.gameId,
  isPlayerTurn: s.isPlayerTurn
}));
```

#### ✅ 高级模式：订阅多个字段

如果确实需要订阅多个字段，使用 `shallow` 比较：

```typescript
import { useGameStore } from '@/stores';
import { shallow } from 'zustand/shallow';

function GameInfo() {
  // 使用 shallow 比较，只有对象内容变化才触发渲染
  const { gameId, isPlayerTurn } = useGameStore(
    (s) => ({ gameId: s.gameId, isPlayerTurn: s.isPlayerTurn }),
    shallow
  );
}
```

### 在 React 外部访问 Store

对于 hooks 或工具函数中需要访问 store，使用 `getState()`:

```typescript
// ✅ 在 hook 中访问 store（不订阅）
function useGameState(gameId: string | null) {
  return useQuery({
    queryKey: ['gameState', gameId],
    queryFn: () => gameApi.getGameState(gameId!),
    enabled: !!gameId,
    refetchInterval: () => {
      // 读取当前状态，但不订阅
      const isPlayerTurn = useGameStore.getState().isPlayerTurn;
      return !isPlayerTurn ? POLLING_INTERVAL : false;
    },
  });
}
```

## 项目中的实现状态

### ✅ 已正确实现

#### 1. GameBoard.tsx

```typescript
// ✅ 正确：每个字段单独订阅
const gameId = useGameStore((s) => s.gameId);
const setGameId = useGameStore((s) => s.setGameId);
const setPlayerTurn = useGameStore((s) => s.setPlayerTurn);
const showToast = useUIStore((s) => s.showToast);
const showModal = useUIStore((s) => s.showModal);
```

**分析**: GameBoard 是最大的容器组件，正确使用选择性订阅模式，避免不必要的渲染。

#### 2. useGameState.ts Hook

```typescript
// ✅ 正确：使用 getState() 在非 React 上下文中访问
refetchInterval: () => {
  const isPlayerTurn = useGameStore.getState().isPlayerTurn;
  return !isPlayerTurn ? POLLING_INTERVAL : false;
},
```

**分析**: 在 TanStack Query 的回调函数中使用 `getState()`，避免在非 React 上下文中使用 hook。

#### 3. 子组件采用 Props 传递

所有子组件（PlayerHand, ActionButtons, GameInfo 等）不直接使用 store，而是通过 props 接收数据：

```typescript
// ✅ 正确：子组件不直接访问 store
function PlayerHand({ hand, selectedTiles, onTileClick }: PlayerHandProps) {
  // 纯展示组件，数据从 props 传入
}
```

**优势**:
- 组件更容易测试（pure function）
- 降低耦合度
- 避免深层组件直接订阅 store 导致的性能问题

### Store 架构

#### gameStore.ts

```typescript
interface GameStore {
  gameId: string | null;
  isPlayerTurn: boolean;

  setGameId: (id: string) => void;
  setPlayerTurn: (isTurn: boolean) => void;
  reset: () => void;
}
```

**设计原则**:
- **轻量级**: 只存储必要的全局状态
- **不存储衍生数据**: `gameState` 由 TanStack Query 管理
- **Actions 稳定**: 函数引用不变，订阅不会导致重新渲染

#### uiStore.ts

```typescript
interface UIStore {
  toast: ToastMessage | null;
  modal: ModalConfig | null;
  selectedTiles: string[];
  isPlayerTurn: boolean;

  showToast: (config: ToastConfig) => void;
  showModal: (config: ModalConfig) => void;
  selectTile: (tileId: string) => void;
  // ...
}
```

**设计原则**:
- **UI 状态隔离**: Toast/Modal 状态不影响游戏逻辑组件
- **临时状态**: 埋牌选择等临时交互状态
- **自动清理**: Toast 自动隐藏，避免状态泄漏

## 性能测试

### 测试方法

#### 1. React DevTools Profiler

1. 打开 React DevTools
2. 切换到 Profiler 标签
3. 开始录制
4. 执行操作（如回合切换）
5. 停止录制，查看重新渲染的组件

**指标**:
- Render count: 渲染次数
- Render duration: 渲染时长
- Component tree: 哪些组件被重新渲染

#### 2. 自定义渲染计数器

```typescript
import { useEffect, useRef } from 'react';

function useRenderCount(componentName: string) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    console.log(`[${componentName}] Render count: ${renderCount.current}`);
  });
}

// 使用
function GameBoard() {
  useRenderCount('GameBoard');
  // ...
}
```

#### 3. Zustand DevTools

```typescript
import { devtools } from 'zustand/middleware';

export const useGameStore = create<GameStore>()(
  devtools(
    (set) => ({ /* ... */ }),
    { name: 'GameStore' }
  )
);
```

在 Redux DevTools 扩展中查看：
- State changes: 状态变化历史
- Action traces: 哪些 action 触发了状态变化
- Time travel: 回放状态变化

### 预期性能改进

| 场景 | 优化前（全量订阅） | 优化后（选择性订阅） | 改进 |
|------|-------------------|---------------------|------|
| 回合切换时渲染组件数 | ~30 个 | ~5 个 | **83% ↓** |
| Toast 显示时渲染组件数 | ~30 个 | 1 个（Toast） | **97% ↓** |
| 游戏初始化渲染时间 | ~200ms | ~80ms | **60% ↓** |
| 内存占用（订阅数） | ~50 个订阅 | ~10 个订阅 | **80% ↓** |

**注**: 本项目已正确实现选择性订阅，这些数据为假设性对比。

## 常见陷阱与解决方案

### 陷阱 1: 每次创建新对象

```typescript
// ❌ 错误：每次渲染创建新对象引用
const actions = useGameStore((s) => ({
  setGameId: s.setGameId,
  setPlayerTurn: s.setPlayerTurn,
}));
```

**问题**: 即使函数引用相同，对象引用每次都不同，导致依赖该对象的 `useEffect` 频繁执行。

**解决方案**:
```typescript
// ✅ 方案 1：单独订阅
const setGameId = useGameStore((s) => s.setGameId);
const setPlayerTurn = useGameStore((s) => s.setPlayerTurn);

// ✅ 方案 2：使用 shallow 比较
import { shallow } from 'zustand/shallow';
const actions = useGameStore(
  (s) => ({ setGameId: s.setGameId, setPlayerTurn: s.setPlayerTurn }),
  shallow
);
```

### 陷阱 2: 在循环中使用 hook

```typescript
// ❌ 错误：在循环中调用 hook
players.map((player) => {
  const playerData = useGameStore((s) => s.players[player.id]); // 违反 React hooks 规则
  return <PlayerCard data={playerData} />;
});
```

**解决方案**:
```typescript
// ✅ 方案 1：在组件外订阅
const allPlayers = useGameStore((s) => s.players);
players.map((player) => {
  const playerData = allPlayers[player.id];
  return <PlayerCard data={playerData} />;
});

// ✅ 方案 2：创建子组件
function PlayerCardContainer({ playerId }: { playerId: string }) {
  const playerData = useGameStore((s) => s.players[playerId]);
  return <PlayerCard data={playerData} />;
}

players.map((player) => <PlayerCardContainer key={player.id} playerId={player.id} />);
```

### 陷阱 3: 衍生数据计算

```typescript
// ❌ 低效：每次渲染都计算
const gameId = useGameStore((s) => s.gameId);
const isGameActive = gameId !== null && gameId.length > 0;
```

**解决方案**:
```typescript
// ✅ 方案 1：在 selector 中计算
const isGameActive = useGameStore((s) => s.gameId !== null && s.gameId.length > 0);

// ✅ 方案 2：使用 useMemo
const gameId = useGameStore((s) => s.gameId);
const isGameActive = useMemo(() => gameId !== null && gameId.length > 0, [gameId]);

// ✅ 方案 3：添加到 store（如果多处使用）
interface GameStore {
  gameId: string | null;
  isGameActive: boolean;  // 衍生状态

  setGameId: (id: string) => void;
}

// 在 action 中更新衍生状态
setGameId: (id) => set({
  gameId: id,
  isGameActive: id !== null && id.length > 0
}),
```

## 测试指南

### 单元测试 Store

```typescript
import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '@/stores';

describe('useGameStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useGameStore.getState().reset();
  });

  it('should update gameId', () => {
    const { result } = renderHook(() => useGameStore((s) => s.gameId));

    expect(result.current).toBeNull();

    act(() => {
      useGameStore.getState().setGameId('game-123');
    });

    expect(result.current).toBe('game-123');
  });

  it('should only re-render when subscribed field changes', () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      return useGameStore((s) => s.gameId);
    });

    // 初始渲染
    expect(renderCount).toBe(1);

    // 更新 gameId - 应该触发渲染
    act(() => {
      useGameStore.getState().setGameId('game-123');
    });
    expect(renderCount).toBe(2);

    // 更新 isPlayerTurn - 不应该触发渲染（未订阅）
    act(() => {
      useGameStore.getState().setPlayerTurn(true);
    });
    expect(renderCount).toBe(2); // 仍然是 2
  });
});
```

### 集成测试组件

```typescript
import { render, screen } from '@testing-library/react';
import { useGameStore } from '@/stores';
import { GameBoard } from '@/components/game/GameBoard';

describe('GameBoard selective subscription', () => {
  it('should not re-render when unsubscribed store field changes', () => {
    const renderSpy = jest.fn();

    function TestComponent() {
      renderSpy();
      const gameId = useGameStore((s) => s.gameId);
      return <div>{gameId || 'No game'}</div>;
    }

    const { rerender } = render(<TestComponent />);

    // 初始渲染
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // 更新未订阅的字段
    act(() => {
      useGameStore.getState().setPlayerTurn(true);
    });

    rerender(<TestComponent />);

    // 不应该触发额外渲染
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
```

## 维护检查清单

### 代码审查要点

- [ ] 确认所有 `useGameStore()` 和 `useUIStore()` 调用都使用 selector 函数
- [ ] 验证子组件优先使用 props 而非直接订阅 store
- [ ] 检查 selector 函数是否返回最小必要数据
- [ ] 确认没有在循环或条件语句中使用 store hooks
- [ ] 验证 actions 订阅不会导致不必要的重新渲染

### 性能监控

定期检查：
1. React DevTools Profiler 中的组件渲染次数
2. Zustand DevTools 中的订阅数量
3. 用户交互的响应时间（<100ms 目标）

## 参考资料

- [Zustand 官方文档 - Auto Generating Selectors](https://docs.pmnd.rs/zustand/guides/auto-generating-selectors)
- [Zustand 官方文档 - Preventing Rerenders](https://docs.pmnd.rs/zustand/guides/prevent-rerenders-with-use-shallow)
- [React 性能优化最佳实践](https://react.dev/learn/render-and-commit)

## 更新日志

- **2025-11-11**: T098 任务完成
  - 审查所有组件的 store 使用模式
  - 确认项目已正确实现选择性订阅
  - 修复 BoardCanvas.example.tsx 的错误示例代码
  - 添加完整的最佳实践文档和测试指南

---

**维护者**: Claude Code
**最后更新**: 2025-11-11
**相关任务**: T098, T099 (React.memo 优化)
