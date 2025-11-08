# 前端快速开始指南

**Feature**: 血战到底麻将前端界面
**Branch**: `001-frontend`
**Date**: 2025-11-07

---

## 概述

本指南帮助开发者快速启动血战到底麻将游戏的前端开发环境。前端基于 **React + Vite + TypeScript + Tailwind CSS** 构建，通过 HTTP API 与后端通信。

**核心特性**：
- ⚡ 极速开发体验（Vite HMR <50ms）
- 🎨 Canvas 程序化绘制麻将牌（无外部图片依赖）
- 🔄 自动轮询同步 AI 回合（500ms 间隔）
- 🧪 完整测试覆盖（Vitest + React Testing Library）

---

## 环境准备

### 1. 系统要求

- **Node.js**: 18.0 或更高版本
- **包管理器**: npm 或 yarn
- **操作系统**: macOS、Linux、Windows（推荐 macOS/Linux）
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+（开发推荐 Chrome）

**验证 Node.js 版本**：

```bash
node --version  # 应显示 v18.x.x 或更高
npm --version   # 应显示 9.x.x 或更高
```

**如果版本过低，请安装最新 LTS 版本**：

```bash
# macOS（使用 Homebrew）
brew install node

# Linux（使用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts

# Windows（使用官方安装包）
# 访问 https://nodejs.org/en/download/
```

---

### 2. 后端服务

前端依赖后端 API 服务，必须先启动后端。

**检查后端是否运行**：

```bash
curl http://localhost:8000/health
# 应返回: {"status": "healthy"}
```

**如果后端未启动，请执行以下步骤**（在项目根目录）：

```bash
# 1. 激活后端虚拟环境
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows

# 2. 安装后端依赖（如果尚未安装）
uv pip install -e .

# 3. 启动后端服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 应看到输出：
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**验证后端可访问**：

```bash
# 创建测试游戏
curl -X POST http://localhost:8000/games -H "Content-Type: application/json" -d '{}'
# 应返回包含 game_id 的 JSON 响应
```

---

## 安装步骤

### 1. 克隆项目（如果尚未克隆）

```bash
# 克隆仓库
git clone <repository-url>
cd majiang

# 切换到前端分支
git checkout 001-frontend
```

---

### 2. 进入前端目录

```bash
cd frontend
```

**如果 `frontend/` 目录不存在，请先初始化前端项目**：

```bash
# 在项目根目录执行
npm create vite@latest frontend -- --template react-ts

cd frontend
```

---

### 3. 安装依赖

使用 npm 或 yarn 安装依赖：

```bash
# 使用 npm（推荐）
npm install

# 或使用 yarn
yarn install
```

**预期安装的主要依赖**：
- `react` & `react-dom`: UI 框架
- `vite`: 构建工具
- `typescript`: 类型系统
- `zustand`: 状态管理
- `@tanstack/react-query`: 服务器状态缓存
- `axios`: HTTP 客户端
- `tailwindcss`: CSS 框架
- `vitest`: 测试框架

**安装完成后验证**：

```bash
npm list --depth=0
# 应显示所有依赖包及版本
```

---

### 4. 配置环境变量

创建 `.env` 文件（在 `frontend/` 目录下）：

```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:8000
VITE_POLLING_INTERVAL=500
VITE_DEBUG_MODE=true
```

**环境变量说明**：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | 后端 API 地址 |
| `VITE_POLLING_INTERVAL` | `500` | 轮询间隔（毫秒） |
| `VITE_DEBUG_MODE` | `true` | 开发环境启用详细日志 |

**注意**：
- 所有环境变量必须以 `VITE_` 开头（Vite 要求）
- 修改 `.env` 文件后需重启开发服务器

---

## 开发模式运行

### 1. 启动开发服务器

```bash
npm run dev
```

**预期输出**：

```
  VITE v5.x.x  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
  ➜  press h to show help
```

**浏览器自动打开**（如果配置了 `server.open: true`）：

访问 http://localhost:5173 查看应用。

---

### 2. 验证前后端连接

**方法 1：检查浏览器控制台**

打开浏览器开发者工具（F12），查看 Console 标签：

- ✅ 正常：应看到 `[API Request] POST /games`、`[API Response] ... Status: 200` 等日志
- ❌ 异常：如果显示 `ERR_NETWORK` 或 `CORS error`，请参考下方故障排查

**方法 2：检查 Network 标签**

打开 DevTools → Network 标签，刷新页面：

- 应看到 `POST http://localhost:8000/games` 请求，状态码 200
- 如果状态码 404/500/CORS 错误，请参考故障排查

---

### 3. 热模块替换（HMR）测试

修改任意组件文件（如 `src/App.tsx`），保存后：

- ✅ 浏览器应在 <100ms 内自动更新，无需手动刷新
- ❌ 如果需要手动刷新，检查 Vite 配置和浏览器控制台错误

---

## 构建生产版本

### 1. 构建命令

```bash
npm run build
```

**构建流程**：

1. TypeScript 类型检查（`tsc`）
2. Vite 打包（Rollup）
3. 代码压缩（esbuild）
4. 静态资源哈希

**预期输出**：

```
vite v5.x.x building for production...
✓ 150 modules transformed.
dist/index.html                  0.45 kB
dist/assets/index-abc123.css     5.20 kB │ gzip: 1.80 kB
dist/assets/index-def456.js     85.30 kB │ gzip: 28.50 kB
✓ built in 3.50s
```

**构建产物**：

```
frontend/dist/
├── index.html
├── assets/
│   ├── index-abc123.css  # 压缩后的 CSS
│   └── index-def456.js   # 压缩后的 JS
└── favicon.ico
```

---

### 2. 预览构建结果

```bash
npm run preview
```

**预期输出**：

```
  ➜  Local:   http://localhost:4173/
  ➜  Network: http://192.168.1.100:4173/
```

访问 http://localhost:4173 查看生产版本效果。

---

## 运行测试

### 1. 单元测试

```bash
npm run test
```

**执行内容**：
- 运行所有 `*.test.ts` 和 `*.test.tsx` 文件
- 使用 Vitest 测试框架
- 自动监听文件变化（watch mode）

**预期输出**：

```
✓ tests/unit/tileUtils.test.ts (5 tests) 50ms
✓ tests/unit/useGameState.test.ts (3 tests) 120ms

Test Files  2 passed (2)
     Tests  8 passed (8)
  Start at  10:30:00
  Duration  500ms
```

**退出 watch mode**：按 `q` 键。

---

### 2. 查看测试覆盖率

```bash
npm run test:coverage
```

**预期输出**：

```
----------------------|---------|----------|---------|---------|-------------------
File                  | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------|---------|----------|---------|---------|-------------------
All files             |   85.20 |    78.50 |   90.30 |   85.20 |
 src/utils            |   92.00 |    88.00 |   95.00 |   92.00 |
  tileUtils.ts        |   95.00 |    90.00 |  100.00 |   95.00 | 45-47
 src/hooks            |   80.00 |    75.00 |   85.00 |   80.00 |
  useGameState.ts     |   80.00 |    75.00 |   85.00 |   80.00 | 30-35
----------------------|---------|----------|---------|---------|-------------------
```

**覆盖率目标**：
- 关键业务逻辑：>80%
- 工具函数：>90%
- UI 组件：>70%（视觉交互通过手动测试）

---

### 3. 集成测试（API 一致性）

```bash
npm run test:integration
```

**前置条件**：后端服务必须运行在 `http://localhost:8000`。

**执行内容**：
- 验证前后端类型一致性
- 测试真实 API 调用
- 验证数据转换逻辑

**预期输出**：

```
✓ tests/integration/typeConsistency.test.ts (3 tests) 500ms
  ✓ 创建游戏返回的 GameState 应符合前端类型定义
  ✓ Tile 类型应包含 suit 和 rank
  ✓ Player 类型应正确区分 hand 和 handCount

Test Files  1 passed (1)
     Tests  3 passed (3)
```

---

### 4. 测试 UI（可选）

使用 Vitest UI 查看测试结果：

```bash
npm run test:ui
```

**浏览器自动打开**：访问 http://localhost:51204/__vitest__/ 查看交互式测试界面。

---

## 代码质量检查

### 1. TypeScript 类型检查

```bash
npm run type-check
```

**执行内容**：运行 `tsc --noEmit`，检查类型错误但不生成文件。

**预期输出**（无错误）：

```
（无输出表示类型检查通过）
```

**如果有类型错误**：

```
src/components/GameBoard.tsx:45:10 - error TS2322: Type 'string' is not assignable to type 'number'.

45   rank: "5"
          ~~~~

Found 1 error.
```

根据提示修复类型错误。

---

### 2. ESLint 代码检查

```bash
npm run lint
```

**执行内容**：检查代码风格和潜在错误。

**预期输出**（无错误）：

```
（无输出表示检查通过）
```

**如果有错误**：

```
/frontend/src/App.tsx
  10:7  error  'selectedTiles' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)
```

根据提示修复错误或使用 `--fix` 自动修复：

```bash
npm run lint -- --fix
```

---

### 3. Prettier 格式化

```bash
npm run format
```

**执行内容**：自动格式化所有 `.ts`、`.tsx`、`.css` 文件。

**预期输出**：

```
src/App.tsx 200ms
src/components/GameBoard.tsx 150ms
src/styles/index.css 50ms
```

**配置文件**：`.prettierrc`（项目根目录）

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

---

## 常见问题排查

### 问题 1：后端服务未运行

**症状**：
- 浏览器控制台显示 `ERR_NETWORK` 或 `Network Error`
- 前端显示模态框："后端服务连接失败"

**解决方法**：

```bash
# 1. 检查后端是否运行
curl http://localhost:8000/health

# 2. 如果失败，启动后端服务
cd /path/to/majiang
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 3. 验证后端启动成功
curl http://localhost:8000/health
# 应返回: {"status": "healthy"}
```

---

### 问题 2：CORS 跨域错误

**症状**：
- 浏览器控制台显示：`Access to XMLHttpRequest at 'http://localhost:8000/games' from origin 'http://localhost:5173' has been blocked by CORS policy`

**原因**：后端未正确配置 CORS 中间件。

**解决方法**：

检查后端 `app/main.py` 是否包含 CORS 配置：

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

如果缺失，请添加并重启后端服务。

**临时解决方案**（开发环境）：

使用 Vite 代理（`vite.config.ts`）：

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
```

修改前端 API 调用：

```typescript
// 原来：axios.post('http://localhost:8000/games', ...)
// 改为：axios.post('/api/games', ...)
```

---

### 问题 3：端口被占用

**症状**：
- 启动前端时显示：`Port 5173 is already in use`

**解决方法**：

**方法 1：修改端口**

编辑 `vite.config.ts`：

```typescript
export default defineConfig({
  server: {
    port: 5174,  // 修改为其他端口
  }
});
```

**方法 2：杀死占用进程**

```bash
# macOS/Linux
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <进程ID> /F
```

---

### 问题 4：依赖安装失败

**症状**：
- `npm install` 时显示错误：`ERESOLVE unable to resolve dependency tree`

**解决方法**：

**方法 1：清理缓存重试**

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**方法 2：使用 `--legacy-peer-deps`**

```bash
npm install --legacy-peer-deps
```

**方法 3：升级 npm 版本**

```bash
npm install -g npm@latest
```

---

### 问题 5：TypeScript 类型错误

**症状**：
- 代码中使用的类型找不到：`Cannot find name 'GameState'`

**解决方法**：

**检查导入路径**：

```typescript
// ❌ 错误：相对路径错误
import { GameState } from '../types/game';

// ✅ 正确：使用路径别名
import { GameState } from '@/types';
```

**检查 `tsconfig.json` 配置**：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**重启 TypeScript 服务器**（VSCode）：

1. 按 `Cmd+Shift+P`（macOS）或 `Ctrl+Shift+P`（Windows）
2. 输入 `TypeScript: Restart TS Server`
3. 回车执行

---

### 问题 6：Canvas 渲染异常

**症状**：
- 麻将牌显示为空白或模糊

**解决方法**：

**检查 Canvas 尺寸设置**（适配高清屏幕）：

```typescript
const canvas = canvasRef.current;
const dpr = window.devicePixelRatio || 1;

canvas.width = canvas.offsetWidth * dpr;
canvas.height = canvas.offsetHeight * dpr;
ctx.scale(dpr, dpr);
```

**检查是否调用了预渲染**：

```typescript
// 在游戏初始化时调用
useEffect(() => {
  tileRenderer.preRenderTiles();
}, []);
```

---

### 问题 7：轮询未停止（内存泄漏）

**症状**：
- 切换页面后仍有大量网络请求
- 浏览器内存持续增长

**解决方法**：

**检查 TanStack Query 配置**：

```typescript
useQuery({
  queryKey: ['gameState', gameId],
  queryFn: () => gameApi.getGameState(gameId, 'human'),
  refetchInterval: isPlayerTurn ? false : 500,
  refetchIntervalInBackground: false,  // ✅ 确保此项为 false
});
```

**检查组件卸载时是否清理**：

```typescript
useEffect(() => {
  const rafId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(rafId);  // ✅ 清理动画循环
  };
}, []);
```

---

## 开发工具推荐

### 1. VSCode 插件

推荐安装以下插件提升开发体验：

- **ESLint**: 实时代码检查
- **Prettier - Code formatter**: 自动格式化
- **TypeScript Vue Plugin (Volar)**: React 类型提示增强
- **Tailwind CSS IntelliSense**: Tailwind 类名自动补全
- **React Developer Tools**: React 组件调试（浏览器扩展）

**安装命令**（VSCode）：

```bash
# 在 VSCode 中按 Cmd+P（macOS）或 Ctrl+P（Windows），输入：
ext install dbaeumer.vscode-eslint
ext install esbenp.prettier-vscode
ext install Vue.volar
ext install bradlc.vscode-tailwindcss
```

---

### 2. 浏览器扩展

- **React Developer Tools**: 查看组件树和状态
- **Redux DevTools**: 查看 Zustand 状态变化（需配置 devtools 中间件）

**安装地址**：
- Chrome: https://chrome.google.com/webstore
- Firefox: https://addons.mozilla.org

---

### 3. 性能分析工具

**检查渲染性能**：

```bash
# 打开浏览器 DevTools
# 1. Performance 标签 → 点击 Record
# 2. 执行游戏操作（出牌、选牌等）
# 3. 停止 Record
# 4. 查看 FPS 曲线（应 ≥30fps）
```

**检查内存泄漏**：

```bash
# 打开浏览器 DevTools
# 1. Memory 标签 → Heap snapshot
# 2. 执行游戏流程（创建游戏 → 埋牌 → 出牌 → 结束）
# 3. 再次 Heap snapshot
# 4. 对比两次快照，查看增长的对象
```

---

## 下一步

### 学习资源

- **Vite 官方文档**: https://vitejs.dev/
- **React 官方文档**: https://react.dev/
- **TanStack Query 文档**: https://tanstack.com/query/latest
- **Zustand 文档**: https://github.com/pmndrs/zustand
- **Tailwind CSS 文档**: https://tailwindcss.com/docs

### 开发任务

1. **阅读设计文档**：
   - `/specs/001-frontend/spec.md`（功能规格）
   - `/specs/001-frontend/data-model.md`（数据模型）
   - `/specs/001-frontend/contracts/frontend-backend-api.yaml`（API 契约）

2. **熟悉代码结构**：
   - 查看 `src/components/`（UI 组件）
   - 查看 `src/stores/`（状态管理）
   - 查看 `src/services/`（API 调用）

3. **运行测试**：
   - 运行 `npm run test` 了解测试用例
   - 阅读 `tests/unit/` 下的测试文件

4. **开始开发**：
   - 参考 `tasks.md`（任务分解，由 `/speckit.tasks` 生成）
   - 按优先级（P1 → P2 → P3）执行开发任务

---

## 支持与反馈

**遇到问题？**

1. 查看本文档的"常见问题排查"部分
2. 查看 GitHub Issues：<repository-url>/issues
3. 联系开发团队：<team-contact>

**贡献代码？**

1. 阅读 `CONTRIBUTING.md`（如有）
2. 遵循 `CLAUDE.md` 中的编码原则
3. 提交 PR 前运行 `npm run lint` 和 `npm run test`

---

**快速开始指南版本**: v1.0 (2025-11-07)
**维护者**: 前端开发团队
