FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY package*.json ./
# We install all dependencies (including dev) because the 'setup' script requires ts-node and the src directory to run migrations
RUN npm ci

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/src ./src

USER node
EXPOSE 3000

CMD ["sh", "-c", "node dist/scripts/env-check.js && node dist/database/migrate.js && node dist/database/seed.js && node dist/bootstrap/bootstrap-admin.js && npm run start:prod"]
