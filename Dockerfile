FROM node:22-slim

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

COPY backend/package.json ./backend/
RUN cd backend && npm install --production

COPY backend/ ./backend/
RUN mkdir -p /app/backend/logs /app/backend/data/uploads

EXPOSE 10000

ENV NODE_ENV=production
ENV PORT=10000

CMD ["node", "backend/server.js"]
