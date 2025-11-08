#!/bin/bash

# 开发环境一键启动脚本
# 功能：
# 1. 清空日志文件
# 2. 杀死旧的前后端进程（避免端口冲突）
# 3. 启动后端服务（日志输出到 logs/backend.log）
# 4. 启动前端服务（日志输出到 logs/frontend.log）

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  血战到底麻将 - 开发环境启动${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 清空日志
echo -e "${YELLOW}📋 步骤 1/4: 清空日志文件${NC}"
bash scripts/clean-logs.sh
echo ""

# 2. 杀死旧进程
echo -e "${YELLOW}🔪 步骤 2/4: 杀死旧的服务进程${NC}"

# 杀死占用 8000 端口的进程（后端）
if lsof -ti:8000 > /dev/null 2>&1; then
  echo -e "${RED}  发现端口 8000 被占用，正在杀死进程...${NC}"
  lsof -ti:8000 | xargs kill -9 2>/dev/null || true
  echo -e "${GREEN}  ✅ 已杀死占用端口 8000 的进程${NC}"
else
  echo -e "${GREEN}  ✅ 端口 8000 未被占用${NC}"
fi

# 杀死占用 5173 端口的进程（前端）
if lsof -ti:5173 > /dev/null 2>&1; then
  echo -e "${RED}  发现端口 5173 被占用，正在杀死进程...${NC}"
  lsof -ti:5173 | xargs kill -9 2>/dev/null || true
  echo -e "${GREEN}  ✅ 已杀死占用端口 5173 的进程${NC}"
else
  echo -e "${GREEN}  ✅ 端口 5173 未被占用${NC}"
fi

echo ""

# 3. 启动后端
echo -e "${YELLOW}🚀 步骤 3/4: 启动后端服务${NC}"
echo -e "  日志文件: ${BLUE}logs/backend.log${NC}"
echo -e "  API 地址: ${BLUE}http://localhost:8000${NC}"
echo -e "  API 文档: ${BLUE}http://localhost:8000/docs${NC}"

# 后台启动后端，日志输出到文件
nohup uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > logs/backend.log 2>&1 &
BACKEND_PID=$!

# 等待后端启动
sleep 2

# 检查后端是否成功启动
if ps -p $BACKEND_PID > /dev/null; then
  echo -e "${GREEN}  ✅ 后端服务启动成功 (PID: $BACKEND_PID)${NC}"
else
  echo -e "${RED}  ❌ 后端服务启动失败！请查看 logs/backend.log${NC}"
  exit 1
fi

echo ""

# 4. 启动前端
echo -e "${YELLOW}🚀 步骤 4/4: 启动前端服务${NC}"
echo -e "  日志文件: ${BLUE}logs/frontend.log${NC}"
echo -e "  访问地址: ${BLUE}http://localhost:5173${NC}"

# 后台启动前端，日志输出到文件
nohup npm run dev --prefix frontend > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# 等待前端启动
sleep 3

# 检查前端是否成功启动
if ps -p $FRONTEND_PID > /dev/null; then
  echo -e "${GREEN}  ✅ 前端服务启动成功 (PID: $FRONTEND_PID)${NC}"
else
  echo -e "${RED}  ❌ 前端服务启动失败！请查看 logs/frontend.log${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  🎉 所有服务启动成功！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📌 ${YELLOW}快速访问：${NC}"
echo -e "  • 游戏前端: ${BLUE}http://localhost:5173${NC}"
echo -e "  • API 文档: ${BLUE}http://localhost:8000/docs${NC}"
echo -e "  • 后端日志: ${BLUE}tail -f logs/backend.log${NC}"
echo -e "  • 前端日志: ${BLUE}tail -f logs/frontend.log${NC}"
echo ""
echo -e "📌 ${YELLOW}进程管理：${NC}"
echo -e "  • 后端 PID: ${BLUE}$BACKEND_PID${NC}"
echo -e "  • 前端 PID: ${BLUE}$FRONTEND_PID${NC}"
echo -e "  • 停止所有: ${BLUE}kill $BACKEND_PID $FRONTEND_PID${NC}"
echo ""
echo -e "📌 ${YELLOW}调试技巧：${NC}"
echo -e "  • 重新清空日志: ${BLUE}bash scripts/clean-logs.sh${NC}"
echo -e "  • 实时查看日志: ${BLUE}tail -f logs/*.log${NC}"
echo ""
