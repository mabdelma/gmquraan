# Build context = repo ROOT:  docker build -f services/engagement/Dockerfile -t <reg>/engagement .
FROM node:22-alpine
WORKDIR /repo

COPY . .
RUN npm install --no-package-lock
RUN npx prisma generate --schema packages/db/prisma/schema.prisma

ENV NODE_ENV=production
WORKDIR /repo/services/engagement
EXPOSE 8080
CMD ["npx", "tsx", "src/server.ts"]
