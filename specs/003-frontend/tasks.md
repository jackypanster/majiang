# Tasks: 血战到底麻将前端界面

**Input**: Design documents from `/specs/001-frontend/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/frontend-backend-api.yaml

**组织原则**: 任务按用户故事分组,每个故事可独立实现和测试

## 格式: `[ID] [P?] [Story] 描述`

- **[P]**: 可并行执行(不同文件,无依赖)
- **[Story]**: 所属用户故事(US1-US6)
- 包含完整文件路径

## 路径约定

本项目采用前后端分离结构:
- 前端: `frontend/src/`
- 后端: `src/mahjong/`, `app/`

---

## Phase 1: Setup (项目初始化)

**目的**: 搭建 Vite + React + TypeScript + Tailwind CSS 基础架构

- [X] T001 创建 Vite React TypeScript 项目 `frontend/` 目录
- [X] T002 安装核心依赖: React 18, TypeScript 5, Vite 5
- [X] T003 [P] 安装状态管理库: Zustand 4, TanStack Query 5, Axios 1
- [X] T004 [P] 安装样式库: Tailwind CSS 3, PostCSS, Autoprefixer
- [X] T005 [P] 配置 TypeScript (tsconfig.json): strict 模式, 路径别名 @/, ES2020
- [X] T006 [P] 配置 Vite (vite.config.ts): 路径别名, 代理 /api → localhost:8000, 代码分割
- [X] T007 [P] 配置 Tailwind CSS (tailwind.config.js): content 路径, 麻将牌主题色扩展
- [X] T008 [P] 配置 ESLint (eslint.config.js): TypeScript 规则, React Hooks 规则
- [X] T009 [P] 配置 Prettier (.prettierrc): 代码格式化规则
- [X] T010 创建项目目录结构: components/, stores/, hooks/, services/, types/, utils/, renderers/, styles/
- [X] T011 [P] 配置环境变量 (.env): VITE_API_BASE_URL, VITE_POLLING_INTERVAL, VITE_DEBUG_MODE
- [X] T012 [P] 更新 package.json scripts: dev, build, test, lint, format, type-check

**Checkpoint**: 项目结构就绪,可执行 `npm run dev` 启动开发服务器

---

## Phase 2: Foundational (基础设施)

**目的**: 核心基础设施,所有用户故事依赖这些模块

**⚠️ 关键**: 此阶段完成前无法开始任何用户故事开发

### 2.1 TypeScript 类型定义 (基于 data-model.md)

- [X] T013 [P] 定义 Tile 类型和工具函数 frontend/src/types/tile.ts (Suit 枚举, Tile 接口, createTile, getTileId, tilesEqual)
- [X] T014 [P] 定义 Meld 类型 frontend/src/types/meld.ts (MeldType 枚举, Meld 接口, createMeld)
- [X] T015 [P] 定义 Player 类型 frontend/src/types/player.ts (Player 接口, createPlayer)
- [X] T016 [P] 定义 GameState 类型 frontend/src/types/game.ts (GamePhase 枚举, GameState 接口, createGameState)
- [X] T017 [P] 定义 ActionType 和 PlayerResponse 类型 frontend/src/types/action.ts (ActionType 枚举, PlayerResponse 接口, getActionPriority)
- [X] T018 [P] 定义 API 请求/响应类型 frontend/src/types/api.ts (CreateGameRequest/Response, PlayerActionRequest, GameStateResponse, ErrorResponse, WinDetail)
- [X] T019 [P] 定义 UI 状态类型 frontend/src/types/ui.ts (ToastConfig, ToastMessage, ModalConfig)
- [X] T020 创建统一类型导出 frontend/src/types/index.ts (避免循环依赖)

### 2.2 API 客户端层 (基于 contracts/frontend-backend-api.yaml)

- [X] T021 配置 Axios 实例 frontend/src/services/apiClient.ts (baseURL, timeout, 请求/响应拦截器, 错误处理)
- [X] T022 实现游戏 API 客户端 frontend/src/services/api/gameApi.ts (createGame, getGameState, submitAction, 字段名转换 snake_case → camelCase)
- [X] T023 创建 API 统一导出 frontend/src/services/api/index.ts

### 2.3 Zustand 状态管理 (基于 research.md 决策)

- [X] T024 [P] 实现 UI Store frontend/src/stores/uiStore.ts (toast, modal, selectedTiles 状态管理, showToast, hideToast, showModal, hideModal, selectTile, clearSelection)
- [X] T025 [P] 实现 Game Store frontend/src/stores/gameStore.ts (gameId, gameState, isPlayerTurn 状态管理, setGameId, setGameState, setPlayerTurn, reset)
- [X] T026 创建 Store 统一导出 frontend/src/stores/index.ts

### 2.4 通用组件

- [X] T027 [P] 实现 Button 组件 frontend/src/components/common/Button.tsx (props: onClick, disabled, variant, children, className)
- [X] T028 [P] 实现 Modal 组件 frontend/src/components/common/Modal.tsx (props: title, content, confirmText, cancelText, onConfirm, onCancel, closable)
- [X] T029 [P] 实现 Toast 组件 frontend/src/components/common/Toast.tsx (props: message, type, duration, 自动隐藏逻辑)
- [X] T030 [P] 实现 ErrorBoundary 组件 frontend/src/components/common/ErrorBoundary.tsx (捕获 React 渲染错误, 显示友好错误界面)

### 2.5 Canvas 渲染器基础类 (基于 research.md 性能优化策略)

- [X] T031 实现 TileRenderer 骨架类 frontend/src/renderers/TileRenderer.ts (preRenderTiles 方法签名, drawCachedTile 方法签名, tileCache 缓存 Map, 暂不实现具体绘制)
- [X] T032 [P] 实现 Canvas 工具函数 frontend/src/utils/canvasUtils.ts (坐标转换, 高清屏适配, 整数坐标处理)

### 2.6 工具函数

- [X] T033 [P] 实现麻将牌工具函数 frontend/src/utils/tileUtils.ts (排序, 比较, 分组按花色)
- [X] T034 [P] 定义常量 frontend/src/utils/constants.ts (API_BASE_URL, POLLING_INTERVAL, DEBUG_MODE, 牌面尺寸常量)
- [X] T034a [P] 创建中文文案常量文件 frontend/src/utils/messages.ts (所有界面文案: 按钮文字, 提示信息, 错误消息, 遵循 FR-018 中文要求)
- [X] T035 [P] 实现通用辅助函数 frontend/src/utils/helpers.ts (防抖, 节流, 格式化数字)
- [X] T035a [P] 实现 Logger 工具 frontend/src/utils/logger.ts (封装 console API, 包含 game_id/player_id 上下文, log/error/warn 方法, 开发环境 INFO 级别, 生产环境 ERROR 级别)

### 2.7 全局样式

- [X] T036 [P] 配置 Tailwind CSS 入口 frontend/src/styles/index.css (导入 Tailwind 基础样式, 自定义全局样式)
- [X] T037 [P] 定义 CSS 变量 frontend/src/styles/variables.css (麻将牌颜色, 间距, 动画时长)

**Checkpoint**: 基础设施完成,用户故事开发可并行开始

---

## Phase 3: User Story 1 - 开始新游戏并完成定缺埋牌 (Priority: P1) 🎯 MVP

**目标**: 玩家可以创建游戏、选择3张同花色牌埋牌、进入游戏阶段

**独立测试**: 点击"开始游戏"→显示手牌→选3张同花色牌→确认→显示缺门并进入游戏中阶段

### 实现任务

- [X] T038 [US1] 实现 useGameState Hook frontend/src/hooks/useGameState.ts (使用 TanStack Query, 条件轮询 refetchInterval, 仅 AI 回合启用 500ms 轮询)
- [X] T039 [US1] 实现 usePlayerAction Hook frontend/src/hooks/usePlayerAction.ts (useMutation 封装 gameApi.submitAction, 成功后 invalidateQueries 刷新状态)
- [X] T040 [P] [US1] 实现 useTileSelection Hook frontend/src/hooks/useTileSelection.ts (选中/取消选中逻辑, 最多选3张限制, 返回 selectedTiles 和 toggleTile)
- [X] T041 [US1] 实现 GameBoard 容器组件 frontend/src/components/game/GameBoard.tsx (游戏主界面容器, 包含 PlayerHand, AIPlayer, DiscardPile, GameInfo, ActionButtons 子组件)
- [X] T042 [US1] 实现 PlayerHand 组件 frontend/src/components/game/PlayerHand.tsx (显示玩家手牌, 支持点击选中/取消, 高亮显示选中状态, 暂用文字显示牌面如 "万1")
- [X] T043 [US1] 实现埋牌验证逻辑 frontend/src/utils/buryValidation.ts (检查3张同花色, 检查牌是否在手中, 返回验证结果和错误消息)
- [X] T044 [US1] 实现埋牌提交流程 GameBoard.tsx (用户选择3张牌→点击"确认埋牌"→前端校验→调用 API→显示缺门→进入 PLAYING 阶段)
- [X] T045 [US1] 实现"开始游戏"按钮 GameBoard.tsx (点击后调用 createGame API, 设置 gameId 到 Store, 显示加载状态)
- [X] T046 [US1] 添加埋牌阶段错误处理 GameBoard.tsx (网络错误显示 Modal, 验证错误显示 Toast, 提供"重试"按钮)
- [X] T047 [US1] 实现窗口尺寸检测 GameBoard.tsx (useEffect 监听 resize, 窗口 <1280x720 时显示"请调整窗口大小"提示)

**Checkpoint**: 用户故事1完成,可独立测试埋牌流程

---

## Phase 4: User Story 2 - 出牌并观察AI响应 (Priority: P1)

**目标**: 玩家出牌→AI自动响应→轮询更新状态

**独立测试**: 玩家回合点击手牌→牌加入弃牌堆→AI自动出牌→界面更新

### 实现任务

- [X] T048 [US2] 实现 DiscardPile 组件 frontend/src/components/game/DiscardPile.tsx (显示弃牌堆, 按时间倒序堆叠, 最新的牌带黄色高亮边框, 暂用文字显示牌面)
- [X] T049 [US2] 实现出牌逻辑 PlayerHand.tsx (玩家回合时点击手牌触发 discard, 优先打出缺门牌校验, 调用 submitAction API)
- [X] T050 [US2] 实现缺门优先出牌校验 frontend/src/utils/discardValidation.ts (检查手中是否有缺门牌, 如有则禁止打出非缺门牌)
- [X] T051 [US2] 实现 AI 回合轮询逻辑 useGameState.ts (isPlayerTurn=false 时启用 500ms 轮询, isPlayerTurn=true 时停止轮询, refetchIntervalInBackground: false)
- [X] T052 [US2] 实现回合状态判断 GameBoard.tsx (根据 currentPlayerIndex 和 gameState.players[0].playerId 判断是否玩家回合, 更新 Store.setPlayerTurn)
- [X] T053 [US2] 实现防重复提交逻辑 usePlayerAction.ts (mutation.isLoading 时禁用手牌点击, 响应完成后恢复)
- [X] T054 [US2] 实现出牌后状态同步 usePlayerAction.ts (出牌成功后 invalidateQueries 立即刷新, 不依赖轮询)
- [X] T055 [US2] 添加出牌错误处理 GameBoard.tsx (非法出牌显示 Toast 提示, 后端错误显示 Modal)

**Checkpoint**: 用户故事2完成,可独立测试出牌和AI响应流程

---

## Phase 5: User Story 3 - 响应碰牌/杠牌/胡牌操作 (Priority: P1)

**目标**: AI出牌后玩家可以碰/杠/胡或过

**独立测试**: AI出牌→显示操作按钮→点击碰→3张牌移动到明牌区域

### 实现任务

- [X] T056 [US3] 实现 ActionButtons 组件 frontend/src/components/game/ActionButtons.tsx (显示 碰/杠/胡/过 按钮, 根据 availableActions 动态渲染, 胡按钮高亮显示)
- [X] T057 [US3] 实现可用动作检测逻辑 GameBoard.tsx (检测 AI 出牌后是否触发玩家响应, 根据后端返回的 availableActions 显示按钮)
- [X] T058 [US3] 实现碰牌动作提交 ActionButtons.tsx (点击"碰"→调用 submitAction API action='peng', 传入目标牌)
- [X] T059 [US3] 实现杠牌动作提交 ActionButtons.tsx (点击"杠"→调用 submitAction API action='gang', 传入目标牌)
- [X] T060 [US3] 实现胡牌动作提交 ActionButtons.tsx (点击"胡"→调用 submitAction API action='hu', 传入目标牌)
- [X] T061 [US3] 实现跳过动作提交 ActionButtons.tsx (点击"过"→调用 submitAction API action='skip')
- [X] T062 [US3] 实现明牌显示 PlayerHand.tsx (在手牌下方显示 melds 区域, 渲染 player.melds 数组, 显示碰/杠组合, 暂用文字显示)
- [X] T063 [US3] 实现胡牌结果弹窗 GameBoard.tsx (gamePhase='ENDED' 时显示 Modal, 展示番数、得分变化、是否血战继续, 自动停留3秒后"确认"按钮可点击)
- [X] T064 [US3] 实现胡牌后状态更新 GameBoard.tsx (玩家点击"确认"→关闭 Modal→根据 gamePhase 决定是继续游戏还是结束)
- [X] T065 [US3] 添加响应动作错误处理 ActionButtons.tsx (动作失败显示 Toast, 超时显示 Modal)
- [X] T066 [US3] 实现操作按钮无超时逻辑 ActionButtons.tsx (按钮显示后无倒计时, 等待玩家手动点击)

**Checkpoint**: 用户故事3完成,可独立测试碰杠胡操作

---

## Phase 6: User Story 4 - 查看游戏信息和状态 (Priority: P2)

**目标**: 显示当前回合、牌墙剩余、AI明牌、得分、弃牌堆

**独立测试**: 观察界面信息栏和各区域数据是否与后端一致

### 实现任务

- [X] T067 [US4] 实现 GameInfo 组件 frontend/src/components/game/GameInfo.tsx (显示当前回合玩家、牌墙剩余数量、各玩家得分, 实时更新)
- [X] T068 [US4] 实现 AIPlayer 组件 frontend/src/components/game/PlayerArea.tsx (显示 AI 手牌数量、明牌、埋牌、缺门花色、得分, 手牌显示为牌背)
- [X] T069 [P] [US4] 实现当前回合高亮逻辑 GameInfo.tsx (高亮显示当前回合玩家名称, 添加视觉提示如边框或图标)
- [X] T070 [P] [US4] 实现牌墙剩余数量显示 GameInfo.tsx (显示 wallRemainingCount, 格式化为 "剩余: 42张")
- [X] T071 [P] [US4] 实现得分实时更新 GameInfo.tsx (订阅 gameState.players[].score, 分数变化时带动画)
- [X] T072 [US4] 实现 AI 明牌显示 PlayerArea.tsx (渲染 player.melds, 显示碰/杠组合, 暂用文字显示牌面)
- [X] T073 [US4] 实现 AI 埋牌显示 PlayerArea.tsx (渲染 player.buriedCards, 埋牌后可见, 暂用文字显示)
- [X] T074 [US4] 实现缺门花色标识 PlayerArea.tsx (显示 player.missingSuit, 如 "缺: 筒", 带花色图标)
- [X] T075 [US4] 实现弃牌堆历史显示 DiscardPile.tsx (显示 publicDiscards 完整历史, 按时间倒序堆叠, 最新的牌在最上层)

**Checkpoint**: 用户故事4完成,游戏信息完整显示

---

## Phase 7: User Story 5 - 血战模式继续游戏 (Priority: P2)

**目标**: 玩家第一次胡牌后手牌锁定,继续游戏

**独立测试**: 玩家胡牌→显示"血战继续"→手牌标记"已锁定"→只能打最新摸到的牌

### 实现任务

- [X] T076 [US5] 实现手牌锁定状态检测 GameBoard.tsx (检查 player.isHu, 第一次胡牌后标记为手牌锁定状态)
- [X] T077 [US5] 实现手牌锁定 UI 标识 PlayerHand.tsx (手牌区域显示"已锁定"标签, 带视觉提示如红色边框)
- [X] T078 [US5] 实现锁定状态出牌限制 PlayerHand.tsx (手牌锁定后仅允许点击最新摸到的牌, 其他暗牌禁用点击)
- [X] T079 [US5] 实现最新摸牌标识 PlayerHand.tsx (标记 hand 数组最后一张牌为最新摸牌, 添加高亮或图标)
- [X] T080 [US5] 实现血战继续提示 GameBoard.tsx (玩家第一次胡牌后 Modal 显示"血战继续"提示, 自动停留3秒后可点击"确认")
- [X] T081 [US5] 实现再次胡牌逻辑 GameBoard.tsx (手牌锁定状态下再次满足胡牌条件, 显示"再次胡牌", 累计番数更新)
- [X] T082 [US5] 实现游戏结束条件检测 GameBoard.tsx (牌墙摸完时, gamePhase='ENDED', 显示最终得分榜)
- [X] T083 [US5] 实现最终得分榜 GameBoard.tsx (Modal 显示所有玩家最终得分、胡牌次数、番数, 使用简单的浏览器刷新重新开始)
- [X] T084 [US5] ~~实现"再来一局"逻辑~~ (已取消: 使用浏览器刷新即可，无需额外复杂度)

**Checkpoint**: 用户故事5完成,血战模式可独立测试

---

## Phase 8: User Story 6 - 使用Canvas渲染麻将牌 (Priority: P3)

**目标**: 用Canvas绘制麻将牌替代文字显示

**独立测试**: 观察手牌区域是否使用Canvas绘制,是否显示花色和点数

### 实现任务

- [X] T085 [US6] 实现 TileRenderer 完整绘制逻辑 frontend/src/renderers/TileRenderer.ts (drawTile 方法: 绘制矩形、渐变背景、边框、花色文字)
- [X] T086 [US6] 实现离屏 Canvas 缓存预渲染 TileRenderer.ts (preRenderTiles: 初始化时预渲染27种牌面到 tileCache Map)
- [X] T087 [US6] 实现 Canvas 麻将牌绘制 TileRenderer.ts (drawCachedTile: 从 tileCache 读取缓存, 使用 drawImage 绘制)
- [X] T088 [US6] 实现 TileCanvas 组件 frontend/src/components/canvas/TileCanvas.tsx (封装 Canvas 元素, 传入 tile 和 position, 调用 TileRenderer 绘制)
- [X] T089 [US6] 实现 useCanvas Hook frontend/src/hooks/useCanvas.ts (管理 Canvas ref, requestAnimationFrame 驱动重绘, 组件卸载时清理)
- [X] T090 [US6] 替换 PlayerHand 为 Canvas 渲染 PlayerHand.tsx (移除文字显示, 使用 TileCanvas 组件渲染每张牌)
- [X] T091 [US6] 替换 DiscardPile 为 Canvas 渲染 DiscardPile.tsx (移除文字显示, 使用 TileCanvas 组件渲染弃牌堆)
- [X] T092 [US6] 替换 AIPlayer 手牌为 Canvas 牌背 AIPlayer.tsx (移除文字显示, 使用 Canvas 绘制牌背矩形)
- [X] T093 [US6] 实现 Canvas 牌面高亮动画 TileRenderer.ts (选中时添加高亮边框, 向上浮起动画)
- [X] T094 [US6] 实现 Canvas 牌面点击检测 TileCanvas.tsx (Canvas onClick 事件, 坐标转换, 检测点击在哪张牌)
- [X] T095 [US6] 实现高清屏适配 useCanvas.ts (Canvas 尺寸设置为 CSS 尺寸的 devicePixelRatio 倍, ctx.scale 缩放)
- [X] T096 [US6] 优化 Canvas 渲染性能 TileRenderer.ts (使用整数坐标, 提取 fillStyle/strokeStyle 到外部, 避免循环中频繁调用)

**Checkpoint**: 用户故事6完成,所有麻将牌使用 Canvas 渲染

---

## Phase 9: Polish & Cross-Cutting Concerns (完善与优化)

**目的**: 跨故事的优化和文档更新

- [X] T097 [P] 性能优化: Canvas 分层渲染 frontend/src/components/canvas/BoardCanvas.tsx (底层静态背景, 中层弃牌堆/AI, 顶层玩家手牌, 按需重绘)
- [X] T098 [P] 性能优化: Zustand 选择性订阅 (所有组件使用 useGameStore(s => s.field) 而非 useGameStore())
- [X] T099 [P] 性能优化: React.memo 优化高频更新组件 (PlayerHand, CenterArea, GameInfo)
- [X] T100 [P] 代码清理: 移除未使用的导入和变量 (ESLint --fix)
- [X] T101 [P] 代码清理: 统一命名规范检查 (组件 PascalCase, 函数 camelCase, 常量 UPPER_SNAKE_CASE)

---

## 依赖关系与执行顺序

### Phase 依赖

- **Setup (Phase 1)**: 无依赖,可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成 - **阻塞所有用户故事**
- **User Stories (Phase 3-8)**: 全部依赖 Foundational 完成
  - 用户故事间可并行(如有多人)
  - 或按优先级顺序 (P1: US1/US2/US3 → P2: US4/US5 → P3: US6)
- **Polish (Phase 9)**: 依赖所有目标用户故事完成

### 用户故事依赖

- **User Story 1 (P1)**: Foundational 完成后可开始 - 无其他故事依赖
- **User Story 2 (P1)**: Foundational 完成后可开始 - 依赖 US1 的 PlayerHand 组件,但可独立测试
- **User Story 3 (P1)**: Foundational 完成后可开始 - 依赖 US2 的 DiscardPile,但可独立测试
- **User Story 4 (P2)**: Foundational 完成后可开始 - 展示信息,无阻塞依赖
- **User Story 5 (P2)**: Foundational 完成后可开始 - 依赖 US3 的胡牌逻辑,但可独立测试
- **User Story 6 (P3)**: Foundational 完成后可开始 - 视觉升级,可最后实现

### 单个用户故事内依赖

- Hooks 先于组件
- 工具函数先于使用它的模块
- 容器组件先于子组件集成
- 核心功能先于错误处理

### 并行机会

- Phase 1 所有标记 [P] 的任务可并行
- Phase 2 所有标记 [P] 的任务可并行(同一阶段内)
- Foundational 完成后,所有用户故事可并行开始(如团队容量允许)
- 单个用户故事内标记 [P] 的任务可并行
- 不同用户故事可由不同开发者并行工作

---

## 并行示例: User Story 1

```bash
# 并行启动 User Story 1 的 Hooks:
Task: "实现 useTileSelection Hook frontend/src/hooks/useTileSelection.ts"

# 并行启动 User Story 4 的独立组件:
Task: "实现当前回合高亮逻辑 GameInfo.tsx"
Task: "实现牌墙剩余数量显示 GameInfo.tsx"
Task: "实现得分实时更新 GameInfo.tsx"
```

---

## 实施策略

### MVP First (仅 User Story 1-3)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (**关键** - 阻塞所有故事)
3. 完成 Phase 3: User Story 1 (埋牌)
4. 完成 Phase 4: User Story 2 (出牌)
5. 完成 Phase 5: User Story 3 (碰杠胡)
6. **停止并验证**: 测试 US1-3 端到端流程
7. 部署/演示(如准备好)

### 增量交付

1. 完成 Setup + Foundational → 基础就绪
2. 添加 User Story 1 → 独立测试 → 部署/演示 (MVP!)
3. 添加 User Story 2 → 独立测试 → 部署/演示
4. 添加 User Story 3 → 独立测试 → 部署/演示
5. 添加 User Story 4 → 独立测试 → 部署/演示
6. 添加 User Story 5 → 独立测试 → 部署/演示
7. 添加 User Story 6 → 独立测试 → 部署/演示
8. 每个故事增加价值而不破坏之前的故事

### 并行团队策略

多人开发时:

1. 团队一起完成 Setup + Foundational
2. Foundational 完成后:
   - 开发者 A: User Story 1 (埋牌)
   - 开发者 B: User Story 2 (出牌)
   - 开发者 C: User Story 4 (信息展示)
3. 故事独立完成并集成

---

## 注意事项

- **[P] 任务** = 不同文件,无依赖,可并行
- **[Story] 标签** = 追溯任务到用户故事
- **每个用户故事应独立可完成和测试**
- **测试策略**: Constitution 允许前端 UI 采用手动测试,无需 TDD
- **提交频率**: 每完成一个任务或逻辑组提交
- **Checkpoint 验证**: 每个 Checkpoint 停下验证故事独立性
- **避免**: 模糊任务、相同文件冲突、破坏独立性的跨故事依赖

---

## 预估工作量

- **Phase 1 (Setup)**: 0.5天 (12个任务,大多配置文件)
- **Phase 2 (Foundational)**: 2天 (25个任务,类型定义+基础设施)
- **Phase 3 (US1 埋牌)**: 1天 (10个任务,核心流程)
- **Phase 4 (US2 出牌)**: 1天 (8个任务,AI轮询)
- **Phase 5 (US3 碰杠胡)**: 1.5天 (11个任务,复杂交互)
- **Phase 6 (US4 信息展示)**: 0.5天 (9个任务,纯展示)
- **Phase 7 (US5 血战继续)**: 1天 (9个任务,状态管理)
- **Phase 8 (US6 Canvas渲染)**: 2天 (12个任务,性能优化)
- **Phase 9 (Polish)**: 1天 (18个任务,优化+文档)

**总计**: ~10.5天 (单人开发,不含测试和返工)

**MVP (US1-3)**: ~5天 (Setup + Foundational + US1-3)

---

**任务生成日期**: 2025-11-07
**基于文档**: spec.md, plan.md, research.md, data-model.md, contracts/frontend-backend-api.yaml
**下一步**: 运行 `/speckit.implement` 开始执行任务
