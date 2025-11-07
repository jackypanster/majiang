# FastAPI 后端设计说明

## 1. 目标与边界
- **运行环境**：单机部署，只有 1 个真人用户 + 3 个内置 AI；无需高可用与多客户端并发。
- **状态存储**：仅保存在内存，进程退出后数据丢失可接受，无需数据库或缓存服务。
- **职责划分**：`src/mahjong` 保持纯逻辑库；FastAPI 仅作为最薄的 HTTP 适配层，将前端请求映射到现有服务。
- **工具链**：使用 `uv` 管理依赖与虚拟环境，保证开发流程简单一致。

## 2. 模块划分
```
app/
  main.py         # FastAPI 实例与路由注册
  api.py          # 具体 REST 接口实现
  ai.py           # AI 回合执行（可选：若 main.py 中逻辑很少，也可直接写在路由内）
mahjong/          # 现有纯逻辑代码，不做变更
```
- FastAPI 层只持有一个进程内全局字典 `GAMES: dict[str, GameState]`。
- 由 `GameManager`, `PlayerActions`, `WinChecker`, `Scorer` 提供的能力直接复用。

## 3. 核心数据结构
- `GameState`：现有模型，不在 API 层修改其内部结构。
- `GAMES`：简单的全局字典；key 为 `game_id`，value 为 `GameState` 实例。
- `AI_ORDER`: 列表保存 3 个 AI 玩家 ID，保证路由中可以按固定顺序驱动 AI。

## 4. REST 接口约定
| Method & Path | 用途 | 请求体 | 返回 |
| --- | --- | --- | --- |
| `POST /games` | 创建新对局并完成发牌 | 允许传入 `player_id` 列表（缺省时自动生成 1 真人 + 3 AI） | `{"game_id": "...", "state": GameStateView}` |
| `GET /games/{game_id}` | 获取当前状态 | `player_id` 通过 query 参数传递 | `GameStateView`（调用 `GameState.to_dict_for_player`） |
| `POST /games/{game_id}/action` | 提交玩家动作 | `{"player_id": "", "action": "", "tiles": [...]}` | `{"state": GameStateView}` |

### 动作枚举
- `Bury`: 真人埋牌阶段提交三张牌。
- `Draw`: 真人执行摸牌（通常由系统自动完成，可留作调试接口）。
- `Discard`: 真人打牌。
- `Peng` / `Gang` / `Hu` / `Skip`: 对应碰牌、杠牌、胡牌或过牌。参数体内 `tiles` 用于传递具体牌面。

## 5. AI 执行流程（单线程同步）
1. 处理真人动作后，根据规则更新 `GameState`。
2. 调用 `run_ai_turn(game_state)` 辅助函数，在单线程中轮流通知三名 AI：
   - 判定可行响应（胡 > 杠 > 碰 > 过），并调用相应服务。
   - 若 AI 摸到新牌后无需继续动作（比如正常出牌完成），流程返回。
3. AI 执行期间无需异步队列或锁，只要保证主线程内顺序执行。

## 6. 错误处理与日志
- 捕获 `mahjong.exceptions` 中的业务异常返回 HTTP 400，附带 `detail` 字段说明。
- 其他异常交由 FastAPI 默认处理并返回 500。
- 使用标准库 `logging`，在关键节点打印 `game_id`, `player_id`, `action`，便于调试；无需结构化日志。

## 7. 测试建议
- 在 `tests/api/` 内使用 `httpx.AsyncClient` + `pytest` 编写最小集成测试，覆盖：
  1. 建局并确认初始阶段是埋牌。
  2. 真人埋牌 → 打牌过程 → AI 自动响应。
  3. 胡牌或流局路径。

## 8. 运行与开发（使用 `uv`）
- 初始化环境：`uv venv`（或直接 `uv run <command>` 自动管理虚拟环境）。
- 安装依赖：`uv pip install fastapi uvicorn`（与测试所需包）。
- 本地启动：`uv run uvicorn app.main:app --reload`。
- 运行测试：`uv run pytest`。

## 9. 后续可选扩展（保持 “less is more”）
- 如需前端轮询，可追加 `GET /games/{game_id}/events` 简单返回最近动作列表。
- 若未来要保存对局，可在 `GAMES` 旁增加一次性文件 dump；当前阶段无需实现。
