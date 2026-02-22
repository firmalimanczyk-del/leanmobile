# ── Etap 1: Budowanie aplikacji Next.js ─────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Kopiuj pliki zależności
COPY package.json package-lock.json* ./
RUN npm ci

# Kopiuj resztę kodu
COPY . .

# Zmienne potrzebne TYLKO podczas budowania (Next.js inlinuje NEXT_PUBLIC_*)
# Prawdziwe wartości runtime przekazujemy przez docker-compose env
ARG LEANTIME_URL=http://leantime-app:8080
ENV LEANTIME_URL=${LEANTIME_URL}

# Buduj aplikację
RUN npm run build

# ── Etap 2: Obraz produkcyjny (mały, tylko runtime) ─────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Skopiuj tylko to co niezbędne do uruchomienia
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
