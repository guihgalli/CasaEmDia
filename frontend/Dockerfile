FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Em produção, use URL relativa /api (proxy nginx para o backend)
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
# Mais memória para o Node no build (evita travar em "rendering chunks" no Docker)
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  resolver 127.0.0.11 valid=10s ipv6=off; \
  set $backend_upstream http://backend:3000; \
  location / { try_files $uri $uri/ /index.html; } \
  location /api { proxy_pass $backend_upstream; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_connect_timeout 5s; proxy_read_timeout 60s; } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
