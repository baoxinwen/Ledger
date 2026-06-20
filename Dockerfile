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

COPY server/package*.json ./server/
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
