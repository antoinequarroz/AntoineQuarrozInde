FROM node:22.19-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

FROM node:22.19-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22.19-alpine AS runner
WORKDIR /app
ARG APP_VERSION=development
ARG APP_BUILD_TIME=unknown
ENV NODE_ENV=production
ENV APP_VERSION=$APP_VERSION
ENV APP_BUILD_TIME=$APP_BUILD_TIME
RUN apk add --no-cache typst font-liberation
COPY --from=build /app/.output ./.output
COPY --from=build /app/typst ./typst
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
