# syntax=docker/dockerfile:1

# ---- Stage 1: build the static export -------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
# python3 is required by the build-time content guard (`scripts/check-prd-ids.py`).
RUN apk add --no-cache python3
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# SITE_URL is build-time for static export (BR-016): it is baked into the
# canonical/og:url/sitemap <loc>. CI=true forces the production guard to fail
# fast with `E_META: SITE_URL is required for production build` when unset.
ARG SITE_URL
ENV SITE_URL=$SITE_URL
ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- Stage 2: serve the static build with nginx ---------------------------
FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/out /usr/share/nginx/html
COPY config/nginx/container.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
