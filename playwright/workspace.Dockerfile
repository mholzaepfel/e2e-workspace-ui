# OneCX E2E Test Docker Image - Playwright + Chromium
#
# Build:
#   docker build -f workspace.Dockerfile -t onecx-workspace-e2e:latest .
#
# Run (local host network):
#   docker run --rm \
#     -e BASE_URL=http://onecx.localhost/onecx-shell/admin/workspace \
#     -e ONECX_USER=onecx -e ONECX_PASSWORD=onecx \
#     -v $(pwd)/artifacts:/e2e-results \
#     --network=host \
#     onecx-workspace-e2e:latest
#
# Run (container network):
#   docker run --rm \
#     -e BASE_URL=http://onecx-service:8080/onecx-shell/admin/workspace \
#     -e ONECX_USER=onecx -e ONECX_PASSWORD=onecx \
#     -v $(pwd)/artifacts:/e2e-results \
#     --network=<test-network> \
#     onecx-workspace-e2e:latest

FROM mcr.microsoft.com/playwright:v1.59.1-noble

LABEL maintainer="OneCX Team"
LABEL description="E2E tests for OneCX workspace management"
LABEL version="1.0"

WORKDIR /app

ENV NODE_ENV=production
ENV RUN_ID=local
ENV CI=true

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci --include=dev || { echo "npm ci failed"; npm install --include=dev; }

COPY tsconfig.json playwright.config.ts ./
COPY harnesses/ ./harnesses/
COPY tests/ ./tests/

RUN mkdir -p /e2e-results/screenshots \
    && mkdir -p /e2e-results/.auth \
    && mkdir -p /e2e-results/test-artifacts \
    && mkdir -p /e2e-results/playwright-report

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

VOLUME ["/e2e-results"]

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "test"]
