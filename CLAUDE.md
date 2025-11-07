# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个"血战到底"麻将游戏的后端逻辑库，实现了完整的游戏规则和算法。项目采用纯 Python 实现，使用 dataclass 作为核心数据结构。

**技术栈**：Python 3.8+, pytest, ruff, uv

**关键特性**：
- 血战到底模式：玩家第一次胡牌后继续参与，必须"摸什么打什么"
- 定缺埋牌：开局必须埋3张同花色牌确定缺门
- 简化规则：胡牌牌型统一为"一对将 + 三个面子"，得分直接等于番数
- 1真人 + 3AI 模式：AI 即时响应，真人自由思考

## 开发命令

### 环境管理（使用 uv）
```bash
# 创建虚拟环境（如果需要）
uv venv

# 激活虚拟环境
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows

# 安装依赖（uv 会自动管理虚拟环境）
uv pip install -e .
```

### 测试
```bash
# 运行所有测试
uv run pytest

# 运行单个测试文件
uv run pytest tests/unit/test_game_manager.py

# 运行特定测试函数
uv run pytest tests/unit/test_game_manager.py::test_create_game

# 显示详细输出
uv run pytest -v

# 显示 print 输出
uv run pytest -s
```

### 代码质量
```bash
# 格式化代码（ruff）
uv run ruff format .

# 检查代码风格
uv run ruff check .

# 自动修复可修复的问题
uv run ruff check --fix .
```

## 核心架构

### 目录结构
```
src/mahjong/
├── constants/
│   └── enums.py          # GamePhase, ActionType, Suit, MeldType 等枚举
├── exceptions/
│   └── game_errors.py    # InvalidActionError, InvalidGameStateError
├── models/
│   ├── game_state.py     # GameState（游戏全局状态）
│   ├── player.py         # Player（玩家状态）
│   ├── tile.py           # Tile（麻将牌，frozen dataclass）
│   ├── meld.py           # Meld（明牌组合：碰/杠）
│   └── response.py       # PlayerResponse（玩家响应）
└── services/
    ├── game_manager.py   # GameManager（游戏生命周期管理）
    ├── player_actions.py # PlayerActions（玩家动作处理）
    ├── win_checker.py    # WinChecker（胡牌判断）
    └── scorer.py         # Scorer（番数计算）

tests/unit/               # 所有测试文件以 test_ 开头
```

### 三层架构设计

**1. Models 层（数据结构）**
- 使用 `@dataclass` 定义不可变数据结构
- `Tile` 使用 `frozen=True` 确保牌的不可变性
- `GameState` 包含完整游戏状态，提供 `to_dict_for_player()` 进行信息过滤

**2. Services 层（核心逻辑）**
- `GameManager`: 创建游戏、发牌、结束游戏
- `PlayerActions`: 处理埋牌、出牌、碰/杠/胡等玩家动作
- `WinChecker`: 检查胡牌条件（缺门、牌型结构）
- `Scorer`: 计算番数（门清、自摸、带根、对对胡、清一色等）

**3. API 层（计划中，使用 FastAPI）**
- 位置：`app/` 目录（尚未实现）
- 职责：最薄的 HTTP 适配层，映射前端请求到 `mahjong` 服务
- 全局状态：进程内字典 `GAMES: dict[str, GameState]`
- 参考：`docs/backend_architecture.md`

### 关键数据流

**游戏启动流程**：
```python
GameManager.create_game(player_ids)    # 创建游戏，初始化玩家
  → GameManager.start_game(game_state) # 洗牌、发牌（庄家14张，闲家13张）
  → game_phase = GamePhase.BURYING     # 进入埋牌阶段
```

**埋牌阶段**：
```python
PlayerActions.bury_cards(game_state, player_id, tiles)  # 玩家提交3张同花色牌
  → 验证：牌是否在手中、是否同花色、是否3张
  → 设置 player.missing_suit 和 player.buried_cards
  → 所有玩家埋牌完成 → game_phase = GamePhase.PLAYING
```

**游戏主循环**：
```python
PlayerActions.discard_tile(game_state, player_id, tile)  # 玩家出牌
  → 收集其他玩家响应（胡 > 杠 > 碰 > 过）
  → 处理最高优先级响应
  → 若无人响应，下家摸牌
  → 检查是否流局（牌墙为空且未满3家胡牌）
```

**胡牌检查逻辑**：
```python
WinChecker.is_hu(player, new_tile)
  1. 检查是否满足缺门要求（手牌+明牌中无缺门牌）
  2. 检查牌型结构（一对将 + 三个面子）
     - 面子：顺子（123）、刻子（111）、杠（1111）
```

## 血战到底特殊规则

### 手牌锁定机制
- **第一次胡牌后**：玩家的暗牌结构锁定，禁止重新排列
- **后续行为**：必须"摸什么打什么"（通过 `hand_locked=True` 标记）
- **继续胡牌**：可以继续自摸或点炮，累计番数
- **游戏结束**：牌墙摸完或满3家胡牌

### 手牌数量约束
- **庄家**：最多14张（埋牌后11张）
- **闲家**：最多13张（埋牌后10张）
- **杠牌操作**：先将4张移出手牌形成明牌，再补摸1张，暗牌数减3
- **即使连续杠牌，暗牌数量也不会超过14张**

### 缺门优先出牌
- 玩家必须优先打出缺门花色的牌
- `PlayerActions.discard_tile()` 会验证此规则
- 只有当手中无缺门牌时，才能打其他花色

## 测试策略

### 真实测试原则
- ✅ 使用真实 `GameState`, `Player`, `Tile` 对象
- ✅ 调用真实服务方法，测试完整数据流
- ❌ 禁止 mock：不使用 `unittest.mock`

### 测试文件组织
```
tests/unit/
├── test_game_manager.py        # 游戏生命周期（创建、发牌、结束）
├── test_player_actions_*.py    # 玩家动作（埋牌、出牌、响应）
├── test_win_and_scoring.py     # 胡牌检查和番数计算
├── test_blood_battle_rules.py  # 血战到底特殊规则（手牌锁定、继续胡）
├── test_edge_cases.py          # 边界情况（流局、连续杠牌）
└── test_error_handling.py      # 错误处理（非法动作、状态异常）
```

### 测试辅助函数
位置：`tests/unit/test_*.py` 内部定义的 helper 函数

常见模式：
```python
def test_example():
    # 1. 创建游戏并发牌
    game_state = GameManager.create_game(["p0", "p1", "p2", "p3"])
    game_state = GameManager.start_game(game_state)

    # 2. 构造特定场景（手动设置手牌）
    game_state.players[0].hand = [Tile(Suit.TONG, 1), ...]

    # 3. 执行操作
    game_state = PlayerActions.discard_tile(game_state, "p0", tile)

    # 4. 断言结果
    assert game_state.game_phase == GamePhase.ENDED
```

## 常见陷阱和注意事项

### 数据不可变性
- `Tile` 是 `frozen=True` 的 dataclass，不能修改
- `GameState` 和 `Player` 的修改需要通过服务方法，或使用 `dataclasses.replace()`
- 手牌列表 `player.hand` 是可变的，但建议通过服务方法操作

### 手牌排序
- 发牌时会自动排序：`sorted(tiles, key=lambda t: (t.suit.value, t.rank))`
- 测试中构造手牌时也要保持排序，避免比较失败

### 零和性质
- 游戏总分始终为400（4人×100分初始分）
- `GameState.verify_zero_sum()` 在关键操作后检查
- 杠分即时结算（刮风下雨），需确保分数同步更新

### AI 响应收集
- 使用 `PlayerActions.collect_ai_responses()` 收集所有玩家响应
- 优先级：胡 > 杠 > 碰 > 过
- 需过滤打牌者自己（不能响应自己的出牌）

### 错误处理
- 抛出业务异常：`InvalidActionError`, `InvalidGameStateError`
- 错误信息格式：`f"Function failed in file.py:line: {reason}, player={player_id}, tile={tile}"`
- 包含完整上下文：函数名、玩家ID、牌面、失败原因

## 关键规则参考

**完整规则文档**：
- `docs/PRD.md` - 产品需求文档（权威规则定义）
- `docs/血战到底麻将规则.md` - 详细游戏规则
- `docs/血战到底麻将游戏算法逻辑实现原理.md` - 算法实现原理

**主要番型**：
| 番型 | 番数 | 条件 |
|------|------|------|
| 基本胡 | 1 | 满足胡牌结构和缺门 |
| 门清 | +1 | 未碰、未明杠/补杠（暗杠不破坏） |
| 自摸 | +1 | 自己摸牌胡 |
| 带根 | +1/根 | 每组四张同牌（刻子/杠） |
| 对对胡 | +1 | 三副刻子/杠 |
| 清一色 | +2 | 所有牌同一花色 |
| 金钩钓 | +1 | 胡牌时暗牌仅剩1张 |
| 清金钩钓 | +4 | 同时满足清一色+金钩钓 |
| 天胡/地胡 | +5 | 庄家埋牌后直接胡/闲家第一轮摸牌即胡 |
| 杠上花/炮 | +1 | 杠后立即胡 |
| 海底捞月 | +1 | 摸最后一张牌胡 |

## Git 工作流

**分支策略**：
- `main` - 主分支，始终保持可用状态
- 功能分支：`001-backend-logic`, `002-fastapi-layer` 等

**提交消息格式**（遵循现有风格）：
```
feat: 实现XXX功能
fix(#issue_number): 修复XXX问题
test: 添加XXX测试
docs: 更新XXX文档
```

**PR 流程**：
- 创建 PR 前确保所有测试通过：`uv run pytest`
- PR 描述包含：功能说明、测试覆盖、相关 issue 引用

## Active Technologies
- Python 3.8+ (required for modern dataclass support, already in project) (002-fastapi-backend)
- In-memory only (dict-based `GAMES: Dict[str, GameSession]`, no database) (002-fastapi-backend)

## Recent Changes
- 002-fastapi-backend: Added Python 3.8+ (required for modern dataclass support, already in project)
