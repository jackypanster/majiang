# 血战到底麻将 API 接口文档

## 文档版本
- **版本号**: v1.0
- **创建日期**: 2025-11-05
- **最后更新**: 2025-11-05
- **协议**: RESTful API over HTTP
- **数据格式**: JSON

---

## 1. 接口概览

### 1.1 Base URL
```
开发环境: http://localhost:8000
生产环境: (待定)
```

### 1.2 通用约定

#### 1.2.1 请求头
```http
Content-Type: application/json
```

#### 1.2.2 响应格式
所有接口统一返回以下格式：

**成功响应**
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"  // 可选
}
```

**错误响应**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

#### 1.2.3 HTTP状态码
| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

#### 1.2.4 错误码列表
| 错误码 | 说明 |
|--------|------|
| `INVALID_TILE` | 牌不在手牌中 |
| `MUST_DISCARD_MISSING` | 必须先打缺门牌 |
| `INVALID_BURY` | 埋牌不符合规则（非同花色） |
| `NOT_YOUR_TURN` | 不是你的回合 |
| `GAME_NOT_FOUND` | 游戏不存在 |
| `INVALID_ACTION` | 不可用的操作 |
| `GAME_ENDED` | 游戏已结束 |

---

## 2. 数据结构定义

### 2.1 麻将牌 (Tile)
```typescript
{
  "suit": "wan" | "tiao" | "tong",  // 花色：万、条、筒
  "rank": 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9  // 点数
}
```

**示例**
```json
{
  "suit": "wan",
  "rank": 5
}
```

---

### 2.2 面子 (Meld)
```typescript
{
  "type": "pong" | "kong",  // 碰 | 杠
  "tiles": Tile[]           // 3张或4张牌
}
```

**示例：碰牌**
```json
{
  "type": "pong",
  "tiles": [
    { "suit": "tiao", "rank": 3 },
    { "suit": "tiao", "rank": 3 },
    { "suit": "tiao", "rank": 3 }
  ]
}
```

---

### 2.3 AI玩家信息 (AIPlayer)
```typescript
{
  "id": number,               // 玩家ID（1-3）
  "handCount": number,        // 手牌数量
  "melds": Meld[],            // 明牌
  "buried": Tile[],           // 埋牌（公开）
  "missingSuit": string | null,  // 缺门
  "score": number             // 积分
}
```

---

### 2.4 游戏状态 (GameState)
```typescript
{
  "gameId": string,
  "phase": "INIT" | "BURYING" | "PLAYING" | "RESPONDING" | "ENDED",
  "currentPlayer": number,    // 0=玩家, 1-3=AI
  "dealer": number,           // 庄家

  // 玩家信息
  "playerHand": Tile[],
  "playerMelds": Meld[],
  "playerBuried": Tile[],
  "playerMissingSuit": string | null,
  "playerScore": number,

  // AI玩家
  "aiPlayers": AIPlayer[],

  // 公共信息
  "discardPile": Tile[],       // 弃牌堆
  "lastDiscard": Tile | null,  // 最新打出的牌
  "wallRemaining": number,     // 牌墙剩余

  // 可用动作
  "availableActions": ("DISCARD" | "PONG" | "KONG" | "HU" | "PASS")[],

  // 游戏结果（phase=ENDED时）
  "winner": number | null,      // 胡牌者ID
  "winType": "SELF_DRAW" | "DISCARD" | null,  // 自摸/点炮
  "scoreChanges": { [playerId: number]: number }  // 积分变化
}
```

---

## 3. 接口详情

### 3.1 创建游戏

#### 接口信息
- **路径**: `POST /api/game/create`
- **说明**: 创建一个新游戏，初始化牌局

#### 请求参数
```json
{
  "playerName": "玩家1"  // 可选，玩家昵称
}
```

#### 响应示例
```json
{
  "success": true,
  "data": {
    "gameId": "abc123xyz",
    "state": {
      "gameId": "abc123xyz",
      "phase": "BURYING",
      "currentPlayer": 0,
      "dealer": 0,
      "playerHand": [
        { "suit": "wan", "rank": 1 },
        { "suit": "wan", "rank": 2 },
        // ... 共14张
      ],
      "playerMelds": [],
      "playerBuried": [],
      "playerMissingSuit": null,
      "playerScore": 0,
      "aiPlayers": [
        {
          "id": 1,
          "handCount": 13,
          "melds": [],
          "buried": [],
          "missingSuit": null,
          "score": 0
        },
        // AI玩家2、3...
      ],
      "discardPile": [],
      "lastDiscard": null,
      "wallRemaining": 55,
      "availableActions": []
    }
  },
  "message": "游戏创建成功"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "服务器内部错误"
  }
}
```

---

### 3.2 获取游戏状态

#### 接口信息
- **路径**: `GET /api/game/{gameId}/state`
- **说明**: 获取当前游戏状态（用于轮询）

#### 路径参数
- `gameId` (string): 游戏ID

#### 查询参数
- `debug` (boolean, 可选): 是否返回调试信息（显示所有AI手牌）

#### 响应示例
```json
{
  "success": true,
  "data": {
    "gameId": "abc123xyz",
    "phase": "PLAYING",
    "currentPlayer": 0,
    "dealer": 0,
    "playerHand": [
      { "suit": "wan", "rank": 1 },
      { "suit": "wan", "rank": 3 },
      // ... 共11张（埋牌后）
    ],
    "playerMelds": [],
    "playerBuried": [
      { "suit": "tong", "rank": 1 },
      { "suit": "tong", "rank": 2 },
      { "suit": "tong", "rank": 3 }
    ],
    "playerMissingSuit": "tong",
    "playerScore": 0,
    "aiPlayers": [
      {
        "id": 1,
        "handCount": 10,
        "melds": [],
        "buried": [
          { "suit": "wan", "rank": 1 },
          { "suit": "wan", "rank": 2 },
          { "suit": "wan", "rank": 3 }
        ],
        "missingSuit": "wan",
        "score": 0
      },
      // ...
    ],
    "discardPile": [
      { "suit": "tong", "rank": 9 }
    ],
    "lastDiscard": { "suit": "tong", "rank": 9 },
    "wallRemaining": 54,
    "availableActions": ["DISCARD"]
  }
}
```

#### 调试模式响应（debug=true）
```json
{
  "success": true,
  "data": {
    // ... 常规字段
    "debug": {
      "aiHands": [
        [
          { "suit": "wan", "rank": 1 },
          // AI1的手牌
        ],
        // AI2、AI3的手牌
      ]
    }
  }
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "GAME_NOT_FOUND",
    "message": "游戏不存在"
  }
}
```

---

### 3.3 埋牌定缺

#### 接口信息
- **路径**: `POST /api/game/{gameId}/bury`
- **说明**: 玩家埋牌，确定缺门

#### 路径参数
- `gameId` (string): 游戏ID

#### 请求参数
```json
{
  "tiles": [
    { "suit": "tong", "rank": 1 },
    { "suit": "tong", "rank": 2 },
    { "suit": "tong", "rank": 3 }
  ]
}
```

#### 响应示例
```json
{
  "success": true,
  "data": {
    "state": {
      // 更新后的游戏状态
      "phase": "PLAYING",  // 所有玩家埋牌完成后进入PLAYING
      "playerBuried": [
        { "suit": "tong", "rank": 1 },
        { "suit": "tong", "rank": 2 },
        { "suit": "tong", "rank": 3 }
      ],
      "playerMissingSuit": "tong",
      // ...
    }
  },
  "message": "埋牌成功，缺门：筒"
}
```

#### 错误响应

**埋牌非同花色**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_BURY",
    "message": "埋牌必须为同一花色"
  }
}
```

**牌不在手牌中**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TILE",
    "message": "牌不在手牌中"
  }
}
```

---

### 3.4 玩家动作

#### 接口信息
- **路径**: `POST /api/game/{gameId}/action`
- **说明**: 执行玩家动作（出牌、碰、杠、胡、过）

#### 路径参数
- `gameId` (string): 游戏ID

#### 请求参数
```json
{
  "action": "DISCARD" | "PONG" | "KONG" | "HU" | "PASS",
  "tile": Tile  // 仅 action=DISCARD 时需要
}
```

#### 请求示例

**出牌**
```json
{
  "action": "DISCARD",
  "tile": { "suit": "wan", "rank": 5 }
}
```

**碰牌**
```json
{
  "action": "PONG"
}
```

**杠牌**
```json
{
  "action": "KONG",
  "tile": { "suit": "tiao", "rank": 7 }  // 杠的牌
}
```

**胡牌**
```json
{
  "action": "HU"
}
```

**过**
```json
{
  "action": "PASS"
}
```

#### 响应示例

**出牌成功**
```json
{
  "success": true,
  "data": {
    "state": {
      "currentPlayer": 1,  // 轮到下家
      "playerHand": [
        // 少了一张牌
      ],
      "discardPile": [
        { "suit": "wan", "rank": 5 }  // 新增
      ],
      "lastDiscard": { "suit": "wan", "rank": 5 },
      // ...
    }
  },
  "message": "出牌成功"
}
```

**碰牌成功**
```json
{
  "success": true,
  "data": {
    "state": {
      "currentPlayer": 0,  // 玩家获得出牌权
      "playerHand": [
        // 少了2张
      ],
      "playerMelds": [
        {
          "type": "pong",
          "tiles": [
            { "suit": "tiao", "rank": 3 },
            { "suit": "tiao", "rank": 3 },
            { "suit": "tiao", "rank": 3 }
          ]
        }
      ],
      "availableActions": ["DISCARD"]
      // ...
    }
  },
  "message": "碰牌成功"
}
```

**胡牌成功（游戏结束）**
```json
{
  "success": true,
  "data": {
    "state": {
      "phase": "ENDED",
      "winner": 0,
      "winType": "SELF_DRAW",
      "scoreChanges": {
        "0": 30,   // 玩家赢30分
        "1": -10,  // AI1输10分
        "2": -10,
        "3": -10
      },
      // ...
    }
  },
  "message": "恭喜胡牌！自摸"
}
```

#### 错误响应

**不是你的回合**
```json
{
  "success": false,
  "error": {
    "code": "NOT_YOUR_TURN",
    "message": "不是你的回合"
  }
}
```

**动作不可用**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_ACTION",
    "message": "当前不能碰牌"
  }
}
```

**违反定缺规则**
```json
{
  "success": false,
  "error": {
    "code": "MUST_DISCARD_MISSING",
    "message": "手中有缺门牌，必须先打缺门牌"
  }
}
```

---

### 3.5 AI执行一步

#### 接口信息
- **路径**: `POST /api/game/{gameId}/ai/step`
- **说明**: 触发AI执行一步操作（摸牌、出牌、响应等）

#### 路径参数
- `gameId` (string): 游戏ID

#### 请求参数
无

#### 响应示例

**AI出牌后**
```json
{
  "success": true,
  "data": {
    "state": {
      "currentPlayer": 2,  // 轮到下一个AI
      "aiPlayers": [
        {
          "id": 1,
          "handCount": 9,  // 少了一张
          // ...
        }
      ],
      "discardPile": [
        { "suit": "wan", "rank": 7 }  // AI打出的牌
      ],
      "lastDiscard": { "suit": "wan", "rank": 7 },
      // ...
    },
    "aiAction": {
      "playerId": 1,
      "action": "DISCARD",
      "tile": { "suit": "wan", "rank": 7 }
    }
  },
  "message": "AI玩家1出牌"
}
```

**AI碰牌后**
```json
{
  "success": true,
  "data": {
    "state": {
      "currentPlayer": 1,  // AI获得出牌权
      "aiPlayers": [
        {
          "id": 1,
          "handCount": 7,  // 少了2张
          "melds": [
            {
              "type": "pong",
              "tiles": [
                { "suit": "tiao", "rank": 5 },
                { "suit": "tiao", "rank": 5 },
                { "suit": "tiao", "rank": 5 }
              ]
            }
          ]
        }
      ],
      // ...
    },
    "aiAction": {
      "playerId": 1,
      "action": "PONG"
    }
  },
  "message": "AI玩家1碰牌"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "NOT_AI_TURN",
    "message": "当前不是AI回合"
  }
}
```

---

## 4. 接口调用流程

### 4.1 完整游戏流程

#### 流程1：创建游戏
```
前端 → POST /api/game/create
     ← { gameId, state: { phase: "BURYING", playerHand: [...] } }
```

#### 流程2：玩家埋牌
```
前端 → POST /api/game/{gameId}/bury
       { tiles: [3张同花色] }
     ← { state: { playerBuried, playerMissingSuit } }
```

#### 流程3：等待AI埋牌（前端轮询或主动触发）

**方式A：轮询**
```
前端 → GET /api/game/{gameId}/state  (每500ms)
     ← { state: { phase: "PLAYING" } }  (所有AI埋牌完成)
```

**方式B：主动触发（推荐）**
```
前端 → POST /api/game/{gameId}/ai/step  (循环3次，AI1-3埋牌)
     ← { state: { phase: "PLAYING" } }
```

#### 流程4：玩家出牌
```
前端 → POST /api/game/{gameId}/action
       { action: "DISCARD", tile: {...} }
     ← { state: { currentPlayer: 1 } }  (轮到AI1)
```

#### 流程5：AI回合（轮询或触发）

**前端轮询检测**
```javascript
while (state.currentPlayer !== 0 && state.phase !== 'ENDED') {
  await sleep(500)
  const newState = await api.getGameState(gameId)

  // 可选：主动触发AI
  if (newState.currentPlayer !== 0) {
    await api.aiStep(gameId)
  }
}
```

#### 流程6：AI打出牌，玩家可碰
```
前端 → GET /api/game/{gameId}/state
     ← {
         state: {
           currentPlayer: 3,
           lastDiscard: {...},
           availableActions: ["PONG", "PASS"]  // 玩家可碰
         }
       }
```

前端显示 [碰] [过] 按钮

#### 流程7：玩家碰牌
```
前端 → POST /api/game/{gameId}/action
       { action: "PONG" }
     ← { state: { currentPlayer: 0, playerMelds: [...] } }
```

玩家获得出牌权，继续出牌

#### 流程8：胡牌
```
前端 → POST /api/game/{gameId}/action
       { action: "HU" }
     ← {
         state: {
           phase: "ENDED",
           winner: 0,
           winType: "SELF_DRAW",
           scoreChanges: {...}
         }
       }
```

前端显示结算界面

---

### 4.2 轮询策略建议

**仅在AI回合时轮询**
```typescript
const shouldPoll =
  state.phase === 'PLAYING' &&
  state.currentPlayer !== 0 &&
  state.phase !== 'ENDED'

useQuery({
  queryKey: ['gameState', gameId],
  queryFn: () => api.getGameState(gameId),
  refetchInterval: shouldPoll ? 500 : false
})
```

---

## 5. 前端调用示例

### 5.1 创建游戏
```typescript
import { gameApi } from '@/services/api'

async function createGame() {
  try {
    const response = await gameApi.createGame({ playerName: '玩家1' })
    if (response.success) {
      console.log('游戏ID:', response.data.gameId)
      // 存储gameId到Zustand
      useGameStore.getState().setGameState(response.data.state)
    }
  } catch (error) {
    console.error('创建游戏失败', error)
  }
}
```

### 5.2 埋牌
```typescript
async function buryCards(tiles: Tile[]) {
  const { gameId } = useGameStore.getState()

  try {
    const response = await gameApi.buryCards({ gameId, tiles })
    if (response.success) {
      // 更新状态
      useGameStore.getState().setGameState(response.data.state)
    }
  } catch (error) {
    console.error('埋牌失败', error)
  }
}
```

### 5.3 出牌
```typescript
async function discardTile(tile: Tile) {
  const { gameId } = useGameStore.getState()

  try {
    const response = await gameApi.playerAction({
      gameId,
      action: 'DISCARD',
      tile
    })
    if (response.success) {
      useGameStore.getState().setGameState(response.data.state)
    }
  } catch (error) {
    console.error('出牌失败', error)
  }
}
```

### 5.4 轮询状态（使用TanStack Query）
```typescript
import { useQuery } from '@tanstack/react-query'

function useGameState(gameId: string) {
  const { phase, currentPlayer } = useGameStore()

  return useQuery({
    queryKey: ['gameState', gameId],
    queryFn: () => gameApi.getGameState(gameId),
    enabled: !!gameId,
    refetchInterval:
      phase === 'PLAYING' && currentPlayer !== 0 ? 500 : false,
    onSuccess: (data) => {
      if (data.success) {
        useGameStore.getState().setGameState(data.data)
      }
    }
  })
}
```

---

## 6. 后端实现参考（Python FastAPI）

### 6.1 路由定义
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

class Tile(BaseModel):
    suit: str  # "wan" | "tiao" | "tong"
    rank: int  # 1-9

class BuryCardsRequest(BaseModel):
    tiles: List[Tile]

class PlayerActionRequest(BaseModel):
    action: str  # "DISCARD" | "PONG" | "KONG" | "HU" | "PASS"
    tile: Optional[Tile] = None

# ========== 接口实现 ==========

@app.post("/api/game/create")
async def create_game():
    game = Game.create()  # 游戏逻辑
    return {
        "success": True,
        "data": {
            "gameId": game.id,
            "state": game.get_state(player_id=0)
        }
    }

@app.get("/api/game/{game_id}/state")
async def get_game_state(game_id: str, debug: bool = False):
    game = Game.get(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    return {
        "success": True,
        "data": game.get_state(player_id=0, debug=debug)
    }

@app.post("/api/game/{game_id}/bury")
async def bury_cards(game_id: str, req: BuryCardsRequest):
    game = Game.get(game_id)

    # 校验：3张同花色
    if not all(t.suit == req.tiles[0].suit for t in req.tiles):
        return {
            "success": False,
            "error": {
                "code": "INVALID_BURY",
                "message": "埋牌必须为同一花色"
            }
        }

    game.player_bury(0, req.tiles)
    return {
        "success": True,
        "data": {"state": game.get_state(0)}
    }

@app.post("/api/game/{game_id}/action")
async def player_action(game_id: str, req: PlayerActionRequest):
    game = Game.get(game_id)

    try:
        game.execute_action(player_id=0, action=req.action, tile=req.tile)
        return {
            "success": True,
            "data": {"state": game.get_state(0)}
        }
    except GameException as e:
        return {
            "success": False,
            "error": {
                "code": e.code,
                "message": str(e)
            }
        }

@app.post("/api/game/{game_id}/ai/step")
async def ai_step(game_id: str):
    game = Game.get(game_id)
    ai_action = game.ai_auto_step()

    return {
        "success": True,
        "data": {
            "state": game.get_state(0),
            "aiAction": ai_action
        }
    }
```

---

## 7. 测试建议

### 7.1 使用Postman测试

**创建游戏**
```http
POST http://localhost:8000/api/game/create
Content-Type: application/json

{}
```

**获取状态**
```http
GET http://localhost:8000/api/game/abc123xyz/state?debug=true
```

**埋牌**
```http
POST http://localhost:8000/api/game/abc123xyz/bury
Content-Type: application/json

{
  "tiles": [
    { "suit": "tong", "rank": 1 },
    { "suit": "tong", "rank": 2 },
    { "suit": "tong", "rank": 3 }
  ]
}
```

### 7.2 使用curl测试
```bash
# 创建游戏
curl -X POST http://localhost:8000/api/game/create \
  -H "Content-Type: application/json" \
  -d '{}'

# 获取状态
curl http://localhost:8000/api/game/abc123xyz/state

# 出牌
curl -X POST http://localhost:8000/api/game/abc123xyz/action \
  -H "Content-Type: application/json" \
  -d '{
    "action": "DISCARD",
    "tile": { "suit": "wan", "rank": 5 }
  }'
```

---

## 8. 版本管理

### 8.1 版本演进计划

**v1.0（MVP）**
- 创建游戏
- 埋牌定缺
- 出牌、碰牌、杠牌
- 胡牌判断
- 简单计分

**v2.0（血战模式）**
- 新增接口：`POST /api/game/{gameId}/continue` 继续游戏
- 状态字段：`huPlayers: number[]` 已胡玩家列表

**v3.0（复杂番型）**
- 响应字段：`fanDetails: { type: string, fan: number }[]` 番型详情
- 计分接口：`GET /api/game/{gameId}/score` 详细计分

### 8.2 兼容性保证
- 向后兼容：新增字段可选，不影响旧版本
- Breaking Change：需提前通知，升级主版本号

---

## 9. 总结

本API文档定义了前后端通信的完整契约，包括：

✅ **接口路径**：RESTful风格，语义清晰
✅ **数据结构**：TypeScript类型定义，前后端共享
✅ **错误处理**：统一错误码，便于前端处理
✅ **轮询策略**：按需轮询，减少后端压力
✅ **调试支持**：debug模式，开发时可见AI手牌
✅ **扩展性**：预留字段，便于未来扩展

后端开发者请严格按照本文档实现API，前端开发者可基于此文档编写类型定义和API服务层。

---

**文档结束**
