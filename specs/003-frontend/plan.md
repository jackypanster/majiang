# Implementation Plan: 血战到底麻将前端界面

**Branch**: `001-frontend` | **Date**: 2025-11-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-frontend/spec.md`

## Summary

实现血战到底麻将游戏的前端用户界面，支持1名真人玩家与3名AI玩家对战。前端使用React + Vite + TypeScript构建，通过Canvas 2D API程序化绘制麻将牌（无需外部图片资源）。核心功能包括：游戏初始化与埋牌、玩家出牌与AI自动响应、碰杠胡操作响应、血战模式手牌锁定、游戏信息展示。前端通过轮询（500ms间隔）与FastAPI后端同步游戏状态，所有交互均为单机localhost环境。

**技术方案**: 采用状态管理库（Zustand）+ 服务器状态缓存（TanStack Query）管理游戏数据流，Canvas分层渲染策略优化性能，响应式错误处理确保单机环境稳定性。

## Technical Context

**Language/Version**: TypeScript 5.0+, Node.js 18+
**Primary Dependencies**: React 18+, Vite 5+, Zustand 4+, TanStack Query 5+, Tailwind CSS 3+, Axios 1+
**Storage**: 浏览器内存（无持久化，游戏状态由后端管理）
**Testing**: Vitest + React Testing Library（单元测试）
**Target Platform**: 现代桌面浏览器（Chrome 90+, Firefox 88+, Safari 14+）
**Project Type**: Web frontend（单页应用 SPA）
**Performance Goals**:
- UI响应 <100ms（本地状态更新）
- Canvas渲染 ≥30fps（1080p分辨率）
- AI轮询延迟 ≤500ms（状态同步）
- 埋牌流程 <5s（端到端）

**Constraints**:
- 最小窗口分辨率：1280x720
- 无移动端支持（仅桌面浏览器）
- 单机localhost环境（前后端同一PC）
- 无用户认证或持久化存储
- Canvas 2D API程序化绘制（禁止外部图片依赖）

**Scale/Scope**:
- 6个用户故事（3个P1核心功能）
- ~15个React组件
- 3个后端API端点集成
- ~50个TypeScript类型定义
- ~20个单元测试

## Constitution Check

### Core Principles Compliance

✅ **I. Simplicity First**
- 前端遵循函数组件优先，避免类组件
- 自定义Hooks保持单一职责，<50行代码
- 组件拆分遵循高内聚低耦合原则
- 避免过早抽象：重复3次后再考虑抽象

✅ **II. Test-First (Adapted for Frontend)**
- 关键业务逻辑（工具函数、Hooks）使用Vitest编写单元测试
- 组件测试使用React Testing Library，测试用户行为而非实现细节
- 避免mock：测试真实API调用通过MSW（Mock Service Worker）模拟后端响应
- 测试策略：优先测试业务逻辑和用户交互流程，Canvas渲染通过手动测试验证

✅ **III. Library-First Architecture (Frontend Adaptation)**
- 前端分层架构：Presentation (Components) → State (Zustand/TanStack Query) → Services (API Client) → Data (Types)
- 业务逻辑集中在Services和Hooks层，组件仅负责渲染和事件绑定
- TypeScript类型定义与后端API契约对齐（基于OpenAPI schema生成）
- Canvas渲染器（TileRenderer）作为独立模块，可复用于不同组件

✅ **IV. Fast-Fail Error Handling**
- Axios拦截器统一处理网络错误，包含请求URL、错误码、错误消息
- 前端错误边界（Error Boundary）捕获React组件错误，显示用户友好提示
- 关键操作（埋牌、出牌、响应）添加try-catch，错误通过Toast显示给用户
- 日志策略：console.error记录异常，包含game_id、player_id、action上下文

✅ **V. Domain Model Integrity (Frontend Sync)**
- 前端TypeScript类型定义与后端Python dataclass保持一致
- 游戏规则验证（如埋牌同花色校验）在前端预检查，后端为最终权威
- 前端不修改游戏规则逻辑，所有规则计算依赖后端API返回
- 定期与`docs/PRD.md`对齐，确保UI行为符合游戏规则

### Technical Standards Compliance

✅ **Language & Dependencies**
- TypeScript 5.0+（强类型，与Python 3.8+类型系统对齐）
- Vite作为构建工具（快速HMR，替代Webpack）
- ESLint + Prettier（代码质量，对应Python的ruff）
- 零运行时外部依赖限制不适用前端（需React生态库）

✅ **Code Structure**
- 前端四层架构（详见Project Structure）：
  1. **Components**: UI展示层（无业务逻辑）
  2. **Stores/Hooks**: 状态管理与业务逻辑
  3. **Services**: API调用与数据转换
  4. **Types**: TypeScript类型定义

✅ **Observability (Frontend Adaptation)**
- 使用浏览器Console API记录关键操作（game创建、动作提交、错误）
- 开发环境启用详细日志（INFO级别），生产环境仅ERROR
- 日志格式：`[GameID: xxx] [PlayerID: 0] Action: DISCARD Tile: wan-1`
- 避免过度日志：不记录每次渲染，仅记录用户交互和API调用

✅ **Naming & Style**
- 组件：PascalCase（`GameBoard`, `PlayerHand`）
- 函数/变量：camelCase（`selectedTiles`, `executeAction`）
- 常量：UPPER_SNAKE_CASE（`API_BASE_URL`, `POLLING_INTERVAL`）
- 文件命名：kebab-case（`game-board.tsx`, `use-player-action.ts`）

### Workflow Compliance

✅ **Pre-Implementation Checklist** (Adapted)
1. 理解功能需求（参考spec.md用户故事）
2. 编写组件/Hook的单元测试（测试用户行为）
3. 实现最简单可工作的版本
4. 重构优化（组件拆分、性能优化）
5. 手动测试UI交互流程

✅ **Testing Requirements**
- 必测场景：埋牌验证、出牌流程、碰杠胡响应、手牌锁定
- 测试组织：`tests/unit/`, `tests/integration/`（API mock测试）
- 覆盖率目标：关键业务逻辑 >80%

✅ **Commit Standards**
- 遵循相同格式：`feat:`, `fix:`, `test:`, `docs:`
- 示例：`feat: 实现Canvas麻将牌渲染器`, `fix(#22): 修复埋牌同花色校验逻辑`

### Communication Standards

✅ **Development Communication**
- 内部分析：English（技术讨论、代码注释）
- 交付物：中文（用户界面文案、commit message、issue讨论）
- 代码：English（变量名、函数名、TypeScript类型名）

## Project Structure

### Documentation (this feature)

```text
specs/001-frontend/
├── plan.md              # 本文件 (实施计划)
├── spec.md              # 功能规格
├── research.md          # Phase 0 技术调研
├── data-model.md        # Phase 1 数据模型
├── quickstart.md        # Phase 1 快速开始指南
├── contracts/           # Phase 1 API契约
│   └── frontend-backend-api.yaml  # OpenAPI规范
└── tasks.md             # Phase 2 任务分解 (由 /speckit.tasks 生成)
```

### Source Code (repository root)

**选择结构**: Option 2 - Web application (前端+后端分离，已有后端实现)

```text
frontend/                         # 新增：前端项目根目录
├── public/                       # 静态资源
│   └── favicon.ico
│
├── src/
│   ├── main.tsx                  # 应用入口
│   ├── App.tsx                   # 根组件
│   ├── vite-env.d.ts             # Vite类型定义
│   │
│   ├── components/               # UI组件
│   │   ├── common/               # 通用组件
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Toast.tsx
│   │   │
│   │   ├── game/                 # 游戏组件
│   │   │   ├── GameBoard.tsx     # 游戏面板（容器）
│   │   │   ├── PlayerHand.tsx    # 玩家手牌区域
│   │   │   ├── AIPlayer.tsx      # AI玩家区域
│   │   │   ├── DiscardPile.tsx   # 弃牌堆
│   │   │   ├── ActionButtons.tsx # 操作按钮组（碰/杠/胡）
│   │   │   └── GameInfo.tsx      # 游戏信息栏
│   │   │
│   │   └── canvas/               # Canvas渲染组件
│   │       ├── TileCanvas.tsx    # 麻将牌Canvas容器
│   │       └── BoardCanvas.tsx   # 游戏桌面Canvas
│   │
│   ├── stores/                   # Zustand状态管理
│   │   ├── gameStore.ts          # 游戏状态
│   │   ├── uiStore.ts            # UI状态（模态框、提示等）
│   │   └── index.ts              # 统一导出
│   │
│   ├── hooks/                    # 自定义Hooks
│   │   ├── useGameState.ts       # 游戏状态Hook（轮询）
│   │   ├── usePlayerAction.ts    # 玩家操作Hook
│   │   ├── useTileSelection.ts   # 手牌选择Hook
│   │   └── useCanvas.ts          # Canvas渲染Hook
│   │
│   ├── services/                 # API服务层
│   │   ├── api/
│   │   │   ├── gameApi.ts        # 游戏API
│   │   │   └── index.ts
│   │   └── apiClient.ts          # Axios配置
│   │
│   ├── types/                    # TypeScript类型定义
│   │   ├── game.ts               # 游戏相关类型
│   │   ├── tile.ts               # 麻将牌类型
│   │   ├── api.ts                # API请求/响应类型
│   │   └── index.ts
│   │
│   ├── utils/                    # 工具函数
│   │   ├── tileUtils.ts          # 麻将牌工具（排序、比较）
│   │   ├── canvasUtils.ts        # Canvas工具（绘制、坐标转换）
│   │   ├── constants.ts          # 常量定义
│   │   └── helpers.ts            # 通用辅助函数
│   │
│   ├── renderers/                # Canvas渲染器（业务逻辑）
│   │   ├── TileRenderer.ts       # 麻将牌渲染器
│   │   ├── BoardRenderer.ts      # 游戏桌面渲染器
│   │   └── AnimationManager.ts   # 动画管理器（可选）
│   │
│   └── styles/                   # 全局样式
│       ├── index.css             # Tailwind入口 + 全局样式
│       └── variables.css         # CSS变量
│
├── tests/
│   ├── unit/                     # 单元测试
│   │   ├── utils/
│   │   │   ├── tileUtils.test.ts
│   │   │   └── canvasUtils.test.ts
│   │   ├── hooks/
│   │   │   ├── useGameState.test.ts
│   │   │   └── usePlayerAction.test.ts
│   │   └── renderers/
│   │       └── TileRenderer.test.ts
│   │
│   └── integration/              # 集成测试
│       └── gameFlow.test.ts      # 完整游戏流程测试
│
├── index.html                    # HTML模板
├── package.json
├── tsconfig.json                 # TypeScript配置
├── vite.config.ts                # Vite配置
├── tailwind.config.js            # Tailwind配置
├── eslint.config.js              # ESLint配置
├── .prettierrc                   # Prettier配置
└── README.md

backend/                          # 已存在：后端项目 (src/mahjong/, app/)
├── src/mahjong/                  # 核心游戏逻辑库
├── app/                          # FastAPI HTTP层
└── tests/                        # 后端测试
```

**结构决策**:
- 前端作为独立项目位于 `frontend/` 目录，与后端 `src/mahjong/` 和 `app/` 并列
- 遵循React最佳实践：组件按功能域分组（`common/`, `game/`, `canvas/`）
- 状态管理分离：全局游戏状态（Zustand）vs 服务器状态（TanStack Query）
- Canvas渲染逻辑独立为 `renderers/`，便于测试和复用
- 工具函数集中在 `utils/`，但避免成为"垃圾堆"（遵循Simplicity原则）

## Complexity Tracking

无需填写。本项目符合所有Constitution原则，无违规需要豁免。

## Phase 0: Research & Unknowns

**状态**: 待执行
**输出**: `research.md`

### 研究任务列表

1. **React状态管理策略对比**
   - 任务：对比Zustand vs Redux Toolkit vs Context API在麻将游戏场景下的适用性
   - 关注点：轮询同步、状态更新频率、开发体验、包大小
   - 输出：推荐方案及理由

2. **Canvas性能优化最佳实践**
   - 任务：调研Canvas 2D在麻将牌渲染场景下的性能优化策略
   - 关注点：离屏Canvas缓存、分层渲染、按需重绘、requestAnimationFrame
   - 输出：性能优化checklist

3. **TanStack Query轮询配置**
   - 任务：研究TanStack Query的轮询模式（refetchInterval）最佳实践
   - 关注点：轮询间隔设置、条件轮询、错误重试策略、内存泄漏防范
   - 输出：轮询配置模板

4. **TypeScript类型生成工具选型**
   - 任务：评估从后端Python dataclass生成前端TypeScript类型的工具
   - 候选：手动维护、OpenAPI Generator、自定义脚本
   - 输出：推荐方案及同步流程

5. **Vite项目初始化配置**
   - 任务：调研Vite + React + TypeScript + Tailwind的最佳初始化模板
   - 关注点：HMR配置、路径别名、环境变量、构建优化
   - 输出：Vite配置文件模板

6. **单机环境错误处理策略**
   - 任务：研究localhost环境下前端错误处理的最佳实践
   - 关注点：后端服务停止检测、端口占用提示、CORS问题处理
   - 输出：错误边界和重试逻辑实现指南

### 待解决的NEEDS CLARIFICATION项

无。所有技术栈已在Technical Context中明确定义。

## Phase 1: Design & Contracts

**状态**: 待执行
**前置条件**: Phase 0 research.md完成
**输出**: `data-model.md`, `contracts/frontend-backend-api.yaml`, `quickstart.md`

### Phase 1.1: 数据模型设计 (data-model.md)

**任务**: 定义前端TypeScript类型系统，与后端Python dataclass对齐

**输出结构**:
```markdown
# 前端数据模型

## 核心实体类型

### Tile（麻将牌）
### GameState（游戏状态）
### Player（玩家）
### Meld（明牌组合）
### PlayerResponse（玩家响应）

## API请求/响应类型

### CreateGameRequest/Response
### GameStateResponse
### PlayerActionRequest/Response
### BuryCardsRequest/Response

## UI状态类型

### UIStore（UI状态）
### ToastMessage（提示消息）
### ModalConfig（模态框配置）

## 类型同步策略

- 手动维护 vs 自动生成（基于research.md结论）
- 类型版本管理（与后端API版本对齐）
```

### Phase 1.2: API契约定义 (contracts/)

**任务**: 定义前后端API契约，基于已存在的后端实现

**输出文件**: `contracts/frontend-backend-api.yaml`（OpenAPI 3.0格式）

**端点列表**（基于后端 `app/api.py`）:
1. `POST /games` - 创建游戏
2. `GET /games/{id}` - 获取游戏状态（针对玩家过滤）
3. `POST /games/{id}/action` - 执行玩家动作（埋牌/出牌/响应）

**契约内容**:
- 请求/响应Schema（基于backend `app/schemas.py`）
- 错误码定义（4xx客户端错误、5xx服务器错误）
- 认证方式（N/A，单机环境无需认证）

### Phase 1.3: 快速开始指南 (quickstart.md)

**任务**: 编写前端项目快速启动文档

**内容结构**:
```markdown
# 前端快速开始指南

## 环境准备
- Node.js 18+ 安装
- npm或yarn安装
- 后端服务启动确认

## 安装依赖
\`\`\`bash
cd frontend
npm install
\`\`\`

## 开发模式运行
\`\`\`bash
npm run dev
\`\`\`

## 构建生产版本
\`\`\`bash
npm run build
\`\`\`

## 运行测试
\`\`\`bash
npm run test
\`\`\`

## 环境变量配置
- VITE_API_BASE_URL: 后端API地址（默认 http://localhost:8000）

## 常见问题
- 后端服务未启动：显示连接错误
- 端口占用：修改vite.config.ts中的server.port
- CORS错误：确认后端CORS配置
```

### Phase 1.4: Agent Context更新

**任务**: 运行 `.specify/scripts/bash/update-agent-context.sh claude` 更新 `CLAUDE.md`

**新增技术栈**（将添加到CLAUDE.md的Active Technologies部分）:
- React 18+ (UI framework)
- Vite 5+ (build tool)
- TypeScript 5.0+ (type system)
- Zustand 4+ (state management)
- TanStack Query 5+ (server state)
- Tailwind CSS 3+ (styling)
- Vitest (testing)

**保留手动添加的内容**（在更新标记之间）

## Phase 2: Task Breakdown

**状态**: 待执行（由 `/speckit.tasks` 命令生成）
**前置条件**: Phase 1所有输出完成
**输出**: `tasks.md`

**注意**: 本命令（`/speckit.plan`）不生成tasks.md。任务分解将由后续的 `/speckit.tasks` 命令完成，该命令会：
- 基于data-model.md、contracts/和spec.md生成依赖有序的任务列表
- 按优先级（P1/P2/P3）分组任务
- 为每个任务定义验收标准
- 估算开发工作量

## Next Steps

1. **立即执行**: Phase 0研究任务（生成research.md）
2. **顺序执行**: Phase 1设计任务（生成data-model.md、contracts/、quickstart.md）
3. **更新上下文**: 运行agent context脚本
4. **任务分解**: 运行 `/speckit.tasks` 生成tasks.md
5. **开始实施**: 按tasks.md中的优先级执行开发任务

## Re-Evaluation Checkpoint

**Phase 1完成后重新检查Constitution符合性**:

待Phase 1完成后填写：
- [ ] 数据模型是否遵循不可变性原则？
- [ ] API契约是否符合RESTful最佳实践？
- [ ] 文件结构是否符合分层架构？
- [ ] 是否引入了不必要的抽象？

如有违规，需在Complexity Tracking表格中记录豁免理由。
