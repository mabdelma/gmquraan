# Build context = repo ROOT:  docker build -f apps/workforce/Dockerfile .
# GM-OS team portal — workforce.example.com
FROM node:22-alpine
WORKDIR /repo

COPY . .
RUN npm install --no-package-lock
RUN npx prisma generate --schema packages/db/prisma/schema.prisma
RUN npm --workspace @app/workforce run build

ENV NODE_ENV=production
WORKDIR /repo/apps/workforce
EXPOSE 3002
CMD ["npm", "run", "start"]
