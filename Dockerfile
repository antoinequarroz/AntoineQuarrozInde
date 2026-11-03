# syntax=docker/dockerfile:1.7
FROM node:26.12-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS deps
WORKDIR /app
COPY package*.json ./
COPY scripts/prepare-nuxt.mjs ./scripts/prepare-nuxt.mjs
RUN npm ci --legacy-peer-deps

FROM node:26.12-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS build
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

FROM node:26.12-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS runner
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
