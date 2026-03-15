# ─────────────────────────────────────────────
# PRODUCTION BUILD (commented out for dev)
# ─────────────────────────────────────────────
# FROM node:20-alpine
# WORKDIR /app
# COPY package*.json ./
# RUN npm i --only=production
# COPY . .
# EXPOSE 5000
# CMD ["node", "src/index.js"]

# ─────────────────────────────────────────────
# DEVELOPMENT (active)
# Hot reload via nodemon with volume mounts
# ─────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY . .
ENV NODE_ENV=development
EXPOSE 5000
CMD ["npx", "nodemon", "src/index.js"]
