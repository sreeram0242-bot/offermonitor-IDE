FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application source
COPY . .

# Expose HTTP port
EXPOSE 3001
ENV PORT=3001

CMD ["node", "baileys-server.mjs"]
