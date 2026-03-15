# ─────────────────────────────────────────────
# PRODUCTION BUILD (commented out for dev)
# ─────────────────────────────────────────────
# FROM node:20-alpine AS deps
# WORKDIR /app
# COPY package*.json ./
# RUN npm i
#
# FROM node:20-alpine AS builder
# WORKDIR /app
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .
# RUN npm run build
#
# FROM node:20-alpine AS runner
# WORKDIR /app
# ENV NODE_ENV=production
# COPY --from=builder /app/.next/standalone ./
# COPY --from=builder /app/.next/static ./.next/static
# COPY --from=builder /app/public ./public
# EXPOSE 3000
# CMD ["node", "server.js"]

# ─────────────────────────────────────────────
# DEVELOPMENT (active)
# Hot reload via `next dev` with volume mounts
# ─────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY . .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]
