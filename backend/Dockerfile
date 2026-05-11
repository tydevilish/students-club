# -- Build stage --
FROM oven/bun:1.3.0 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --no-frozen-lockfile
COPY . .

# -- Production stage --
FROM oven/bun:1.3.0-slim
WORKDIR /app
COPY package.json ./
COPY --from=builder /app/bun.lock ./
RUN bun install --production
COPY --from=builder /app/*.js ./
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/middleware ./middleware
EXPOSE 14001
CMD ["bun", "run", "start"]
