# ─────────────────────────────────────────────
# PRODUCTION BUILD (commented out for dev)
# ─────────────────────────────────────────────
# FROM node:20-alpine
# WORKDIR /app
# COPY package*.json ./
# RUN npm i --only=production
# COPY . .
# EXPOSE 7880
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
EXPOSE 7880
CMD ["npx", "nodemon", "src/index.js"]
