ARG BASE_IMAGE_REGISTRY=docker.m.daocloud.io
FROM ${BASE_IMAGE_REGISTRY}/library/node:22-alpine

WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=$NPM_REGISTRY

# Best-effort: some networks break Alpine HTTPS fetch; don't fail build if apk repo isn't reachable.
RUN (sed -i 's|https://|http://|g' /etc/apk/repositories && apk add --no-cache ca-certificates) || true

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV UPLOADS_DIR=/app/uploads

RUN mkdir -p /app/uploads

EXPOSE 8080
CMD ["node", "src/server.js"]
