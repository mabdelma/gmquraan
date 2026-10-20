# Build context = repo ROOT:  docker build -f services/notifications/Dockerfile -t <reg>/notifications .
# notifications has no DB dependency, so no prisma generate step.
FROM node:22-alpine
WORKDIR /repo

COPY . .
RUN npm install --no-package-lock

ENV NODE_ENV=production
WORKDIR /repo/services/notifications
EXPOSE 8080
CMD ["npx", "tsx", "src/server.ts"]
