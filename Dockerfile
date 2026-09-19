# Base image with Node.js 20 LTS on Alpine Linux
FROM node:20-alpine AS base
WORKDIR /app

# Stage 1: Dependencies installation
FROM base AS dependencies
# Copy workspace manifests for dependency caching
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci

# Stage 2: Development environment (for docker-compose development)
FROM dependencies AS development
ENV NODE_ENV=development
# Copy source files needed by shared library and API
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package first so dist/index.js exists for api resolution
RUN npm run build --workspace=@multi-gym/shared

EXPOSE 4000
CMD ["npm", "run", "dev", "--workspace=@multi-gym/api"]

# Stage 3: Production builder
FROM dependencies AS build
ENV NODE_ENV=production
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm run build --workspace=@multi-gym/shared
RUN npm run build --workspace=@multi-gym/api

# Stage 4: Production runner
FROM base AS runner
ENV NODE_ENV=production

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts from build stage
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist

USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
