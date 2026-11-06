FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN npm install --global pnpm@11.10.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/whim-low-code/package.json ./apps/whim-low-code/package.json
COPY apps/devops/package.json ./apps/devops/package.json

FROM dependencies AS build
RUN pnpm install --frozen-lockfile
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY apps ./apps
COPY libs ./libs
ARG APP_NAME=whim-low-code
RUN pnpm exec nest build "${APP_NAME}" \
    && mkdir /output \
    && cp -R "dist/apps/${APP_NAME}/." /output/

FROM dependencies AS production-dependencies
RUN pnpm install --prod --frozen-lockfile

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV RUNNING_ENV=dev
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /output ./dist
USER node
CMD ["node", "dist/main.js"]
