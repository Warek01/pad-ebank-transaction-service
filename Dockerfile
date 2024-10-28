FROM node:22-alpine AS builder
WORKDIR /app

RUN apk update
RUN apk upgrade --no-cache
RUN npm upgrade -g
RUN npm i -g -f pnpm

COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm i --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:22-alpine AS production

WORKDIR /app

RUN apk update
RUN apk upgrade --no-cache
RUN apk add curl
RUN npm upgrade -g
RUN npm i -g -f pnpm

COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm i --frozen-lockfile --prod

COPY --from=builder /app/dist/ dist/

ENV NODE_ENV=production

EXPOSE 3000
EXPOSE 3100
EXPOSE 3200

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3  CMD curl --fail http://localhost:3000/health || exit

ENTRYPOINT ["node", "dist/main.js"]
