FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci

COPY client/package*.json ./client/
RUN cd client && npm ci

COPY server/ ./server/
COPY client/ ./client/

RUN cd client && npm run build
RUN cd server && npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
