ARG BASE_IMAGE_REGISTRY=docker.m.daocloud.io
FROM ${BASE_IMAGE_REGISTRY}/library/node:22-alpine AS build
WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=$NPM_REGISTRY

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM ${BASE_IMAGE_REGISTRY}/library/nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
