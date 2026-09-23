FROM node:26.9-alpine@sha256:dbaa92e5758cbbcf85d65d5403fdb530fe3442cbe8c6dbfb7ef23365450d5070 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

FROM node:26.9-alpine@sha256:dbaa92e5758cbbcf85d65d5403fdb530fe3442cbe8c6dbfb7ef23365450d5070 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:26.9-alpine@sha256:dbaa92e5758cbbcf85d65d5403fdb530fe3442cbe8c6dbfb7ef23365450d5070 AS runner
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
