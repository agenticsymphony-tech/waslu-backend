# Development image for the Waslu backend.
#
# This image is for LOCAL DEVELOPMENT (hot reload via `medusa develop`).
# Production deployment is a separate concern and is not defined here.
#
# Build:  docker compose build
# Run:    docker compose up

FROM node:24-bookworm-slim

# The container has no .git directory, so husky must not try to install hooks.
ENV HUSKY=0

WORKDIR /app

# Install dependencies first so Docker reuses this layer when only source changes.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Source is bind-mounted over this at runtime (see docker-compose.yml) so edits
# hot-reload. Copying it here still makes the image usable on its own.
COPY . .

EXPOSE 9000

CMD ["npm", "run", "dev"]