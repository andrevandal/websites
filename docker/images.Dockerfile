FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/images/package.json ./apps/images/package.json
COPY packages/sun-ui/package.json ./packages/sun-ui/package.json
COPY websites/brunabraz/package.json ./websites/brunabraz/package.json
COPY websites/vandallabs/package.json ./websites/vandallabs/package.json
RUN bun install --frozen-lockfile --ignore-scripts

FROM base AS sharp-deps
WORKDIR /sharp
COPY apps/images/package.json ./images-package.json
RUN bun -e "const fs=require('fs');const{dependencies}=require('./images-package.json');fs.writeFileSync('package.json',JSON.stringify({dependencies:{sharp:dependencies.sharp}}))" \
  && bun install

FROM base AS builder
COPY --from=deps /app ./
COPY . .
WORKDIR /app/apps/images
RUN bun build src/index.ts --outdir dist --target bun --external sharp

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV FS_DIR=/data/images
ENV LOCAL_CACHE_DIR=/data/cache
ENV QUEUE_DB=/data/queue/queue.db
ENV KV_PATH=/data/kv/kv.db
WORKDIR /app/apps/images
RUN mkdir -p /data/cache /data/queue /data/images /data/kv
COPY --from=builder /app/apps/images/dist ./dist
COPY --from=builder /app/apps/images/public ./public
COPY --from=builder /app/apps/images/package.json ./package.json
COPY --from=sharp-deps /sharp/node_modules ./node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD wget --spider -q http://localhost:3000/healthy || exit 1
CMD ["bun", "dist/index.js"]
