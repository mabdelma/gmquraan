# Build context = repo ROOT:  docker build -f apps/web/Dockerfile -t <reg>/web .
# Next.js web app (marketing + client SaaS + partner portal + central admin).
FROM node:22-alpine
WORKDIR /repo

COPY . .
RUN npm install --no-package-lock
RUN npx prisma generate --schema packages/db/prisma/schema.prisma
RUN npm --workspace @app/web run build

ENV NODE_ENV=production
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
