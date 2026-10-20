# Build context = repo ROOT:  docker build -f apps/agent/Dockerfile -t <reg>/agent .
# AI Solutions Advisor (Next.js, OpenAI Realtime).
FROM node:22-alpine
WORKDIR /repo

COPY . .
RUN npm install --no-package-lock
RUN npx prisma generate --schema packages/db/prisma/schema.prisma
RUN npm --workspace @app/agent run build

ENV NODE_ENV=production
WORKDIR /repo/apps/agent
EXPOSE 3001
CMD ["npm", "run", "start"]
