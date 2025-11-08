#!/bin/bash

# 清空日志脚本
# 用途：清空 logs/ 目录下的所有日志文件，方便每次调试时从干净的日志开始

set -e

LOG_DIR="logs"

echo "🧹 清空日志文件..."

# 创建 logs 目录（如果不存在）
mkdir -p "$LOG_DIR"

# 清空后端日志
if [ -f "$LOG_DIR/backend.log" ]; then
  > "$LOG_DIR/backend.log"
  echo "✅ 已清空 $LOG_DIR/backend.log"
else
  touch "$LOG_DIR/backend.log"
  echo "✅ 已创建 $LOG_DIR/backend.log"
fi

# 清空前端日志
if [ -f "$LOG_DIR/frontend.log" ]; then
  > "$LOG_DIR/frontend.log"
  echo "✅ 已清空 $LOG_DIR/frontend.log"
else
  touch "$LOG_DIR/frontend.log"
  echo "✅ 已创建 $LOG_DIR/frontend.log"
fi

echo "🎉 日志清空完成！"
