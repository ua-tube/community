FROM node:20.11.0 as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20.11.0-slim

RUN apt update && apt install libssl-dev dumb-init -y --no-install-recommends

WORKDIR /app

COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/.env .env
COPY --chown=node:node --from=build /app/package*.json ./

RUN npm install --omit=dev
COPY --chown=node:node --from=build /app/node_modules/.prisma/client  ./node_modules/.prisma/client

ENV NODE_ENV production

EXPOSE 15500

CMD ["dumb-init", "node", "/app/dist/main"]