#!/bin/sh
set -e

# 数据目录权限：docker-compose 的 bind mount 会覆盖镜像层目录的属主，
# 因此必须在运行时按宿主实际属主重新 chown，兼容旧版 root 容器遗留的
# root 属主数据（否则 node 用户写入 SQLite 会报 "readonly database"）。
mkdir -p /app/server/data
if ! chown -R node:node /app/server/data 2>/dev/null; then
  echo "警告：无法设置数据目录 /app/server/data 属主，node 用户可能无写权限" >&2
fi

# 降权到 node 用户运行（保留非 root 运行的安全收益）。
# gosu 用 exec 替换进程，使应用成为 PID 1，信号（SIGTERM/SIGINT）转发正确。
exec gosu node "$@"
