FROM node:18-alpine

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm install --production

COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

COPY server/ ./server/

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
