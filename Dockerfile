
# Dockerfile (no package-lock.json required)
FROM node:18-alpine

WORKDIR /app

# Only copy package.json
COPY package.json ./

# Install production dependencies without lockfile
RUN npm install --omit=dev

# Copy app source
COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/index.js"]
