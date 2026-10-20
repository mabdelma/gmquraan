# Build context = repo ROOT:  docker build -f services/auth/Dockerfile -t <reg>/auth .
# Installs the whole npm workspace so @app/shared + @app/db resolve, generates the
# Prisma client, and runs the service with tsx (TS-native, no cross-package build step).
FROM node:22-alpine
WORKDIR /repo

COPY . .
RUN npm install --no-package-lock
RUN npx prisma generate --schema packages/db/prisma/schema.prisma

ENV NODE_ENV=production
WORKDIR /repo/services/auth
EXPOSE 8080
CMD ["npx", "tsx", "src/server.ts"]
