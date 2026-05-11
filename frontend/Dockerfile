FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

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
