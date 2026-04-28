# ── Stage 1: Frontend deps ─────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-deps
WORKDIR /frontend
COPY frontend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ── Stage 2: Backend deps ──────────────────────────────────────────────────────
FROM node:20-alpine AS backend-deps
WORKDIR /backend
COPY backend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ── Stage 3: Frontend build ────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY --from=frontend-deps /frontend/node_modules ./node_modules
COPY frontend/ .
ARG NEXT_PUBLIC_APP_ENV=production
ARG NEXT_PUBLIC_API_URL=https://api.lbd.rgbindia.com
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# ── Stage 4: Backend build ─────────────────────────────────────────────────────
FROM node:20-alpine AS backend-builder
WORKDIR /backend
COPY --from=backend-deps /backend/node_modules ./node_modules
COPY backend/ .
RUN npx prisma generate
RUN npm run build

# ── Stage 5: Runner ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pm2

# Frontend (Next.js standalone)
WORKDIR /app/frontend
COPY --from=frontend-builder /frontend/.next/standalone ./
COPY --from=frontend-builder /frontend/.next/static ./.next/static
COPY --from=frontend-builder /frontend/public ./public

# Backend (NestJS)
WORKDIR /app/backend
COPY --from=backend-builder /backend/dist ./dist
COPY --from=backend-builder /backend/node_modules ./node_modules
COPY --from=backend-builder /backend/prisma ./prisma
COPY backend/package*.json ./

COPY ecosystem.config.js /app/

WORKDIR /app
EXPOSE 3000 4000
CMD ["pm2-runtime", "/app/ecosystem.config.js"]
