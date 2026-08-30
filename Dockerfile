FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
  NPM_CONFIG_REPLACE_REGISTRY_HOST=always \
  npm_config_nodedir=/usr/local

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./server/
RUN cd server && npm ci

COPY client/package*.json ./client/
RUN cd client && npm ci

COPY server/ ./server/
COPY client/ ./client/

RUN cd client && npm run build
RUN cd server && npm run build
RUN cd server && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Asia/Shanghai

# gosu：entrypoint 里用于把权限从 root 降到 node 用户（保留非 root 运行的安全收益）。
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./server/
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY server/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

# 健康检查：进程活着但无响应时由 Docker 判定不健康。端口跟随 PORT env（默认 3000）。
# 注意：restart 策略只响应进程退出，不会因 unhealthy 自动重启容器；如需自愈请引入 autoheal 或外部看门狗。
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# entrypoint 以 root 启动，chown 数据目录后 gosu 降权到 node 用户运行应用。
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/dist/index.js"]
