FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

COPY . .

RUN bun run build

FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./

EXPOSE 3000

CMD ["bun", "run", "start"]
