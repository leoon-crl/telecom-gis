# ─────────────────────────────────────────────────────────────
# ART TELECOM GIS — Frontend React : build Vite + Nginx
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS construction

WORKDIR /application
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ── Image finale : Nginx servant le build + proxy API ──
FROM nginx:1.27-alpine

COPY --from=construction /application/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173
