FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV UPLOADS_DIR=/app/uploads

RUN mkdir -p /app/uploads

EXPOSE 8080
CMD ["node", "src/server.js"]
