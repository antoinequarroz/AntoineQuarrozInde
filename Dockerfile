# syntax=docker/dockerfile:1.7
FROM node:26.10-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

FROM node:26.10-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS build
WORKDIR /app
ARG POSTHOG_PROJECT_ID=281423
ARG POSTHOG_HOST=https://eu.posthog.com
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=secret,id=posthog_source_map_api_key,required=true \
    POSTHOG_SOURCE_MAP_API_KEY="$(cat /run/secrets/posthog_source_map_api_key)" \
    POSTHOG_PROJECT_ID="$POSTHOG_PROJECT_ID" \
    POSTHOG_HOST="$POSTHOG_HOST" \
    npm run build

FROM node:26.10-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS runner
WORKDIR /app
ARG APP_VERSION=development
ARG APP_BUILD_TIME=unknown
ENV NODE_ENV=production
ENV APP_VERSION=$APP_VERSION
ENV APP_BUILD_TIME=$APP_BUILD_TIME
RUN apk add --no-cache typst font-liberation
COPY --chown=node:node --from=build /app/.output ./.output
COPY --chown=node:node --from=build /app/typst ./typst
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
