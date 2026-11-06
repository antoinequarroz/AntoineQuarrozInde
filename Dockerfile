# syntax=docker/dockerfile:1.7
FROM node:26.13-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS deps
WORKDIR /app
COPY package*.json ./
COPY scripts/prepare-nuxt.mjs ./scripts/prepare-nuxt.mjs
RUN npm ci --legacy-peer-deps

FROM node:26.13-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS build
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

FROM node:26.13-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS runner
WORKDIR /app
ARG APP_VERSION=development
ARG APP_BUILD_TIME=unknown
ENV NODE_ENV=production
ENV APP_VERSION=$APP_VERSION
ENV APP_BUILD_TIME=$APP_BUILD_TIME
RUN apk add --no-cache typst font-liberation ffmpeg
COPY --chown=node:node --from=build /app/.output ./.output
COPY --chown=node:node --from=build /app/typst ./typst
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
