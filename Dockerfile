# syntax=docker/dockerfile:1

# 注意：build context 是 repo 根目錄（pnpm workspace）
FROM node:22-alpine AS build
RUN npm install -g pnpm@10.11.0
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/cms/package.json ./apps/cms/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/brief-bot/package.json ./apps/brief-bot/package.json
RUN pnpm install --frozen-lockfile --filter web...

COPY apps/web ./apps/web
RUN pnpm --filter web build

FROM node:22-alpine AS prod-deps
RUN npm install -g pnpm@10.11.0
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/cms/package.json ./apps/cms/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/brief-bot/package.json ./apps/brief-bot/package.json
RUN pnpm install --frozen-lockfile --prod --filter web...

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# standalone 輸出仍有外部相依（如 piccolore），需要 production node_modules
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/web/dist ./apps/web/dist

EXPOSE 4321
CMD ["node", "./apps/web/dist/server/entry.mjs"]
