# OneCX Playwright E2E Tests

This directory contains Playwright-based E2E tests for OneCX UI validation in Docker and CI environments.

## Structure

```text
playwright/
├── harnesses/
│   ├── base.harness.ts
│   ├── keycloak-login.harness.ts
│   ├── workspace-search.harness.ts
│   └── index.ts
├── tests/
│   ├── auth.setup.ts
│   └── workspace-management.spec.ts
├── workspace.Dockerfile
├── docker-entrypoint.sh
├── playwright.config.ts
├── config.env.example
├── package.json
└── tsconfig.json
```

## Environment Variables

| Variable         | Description                               | Default                                              |
| ---------------- | ----------------------------------------- | ---------------------------------------------------- |
| `BASE_URL`       | Target application URL                    | `http://onecx.localhost/onecx-shell/admin/workspace` |
| `ONECX_USER`     | Keycloak test username                    | `onecx`                                              |
| `ONECX_PASSWORD` | Keycloak test password                    | `onecx`                                              |
| `OUTPUT_DIR`     | Output directory for reports/artifacts    | `/e2e-results` in container                          |
| `RUN_ID`         | Run identifier used in artifact pathing   | `local`                                              |
| `CI`             | Enables CI behavior (retries, formatting) | `false`                                              |

Compatibility fallback is supported for `ONECX_USER` and `ONECX_PASSWORD`, but `ONECX_USER` and `ONECX_PASSWORD` are preferred.

## Build Docker Image

```bash
docker build -f workspace.Dockerfile -t onecx-workspace-e2e:latest .
```

## Run Docker Container

### Host network (local)

```bash
docker run --rm \
  -e BASE_URL=http://onecx.localhost/onecx-shell/admin/workspace \
  -e ONECX_USER=onecx \
  -e ONECX_PASSWORD=onecx \
  -v $(pwd)/artifacts:/e2e-results \
  --network=host \
  onecx-workspace-e2e:latest
```

### Docker network

```bash
docker run --rm \
  -e BASE_URL=http://onecx-service:8080/onecx-shell/admin/workspace \
  -e ONECX_USER=onecx \
  -e ONECX_PASSWORD=onecx \
  -v $(pwd)/artifacts:/e2e-results \
  --network=onecx-network \
  onecx-workspace-e2e:latest
```

## Local Development

```bash
npm install
npm test
npm run test:headed
npm run test:debug
npm run test:report
```

### Linux without X server (Option B)

If `npx playwright test --ui` fails with a `Browser.getVersion` / X server error,
run headed/debug tests with `xvfb-run`.

```bash
sudo apt-get update && sudo apt-get install -y xvfb

ONECX_USER=onecx ONECX_PASSWORD=onecx BASE_URL=http://onecx.localhost/onecx-shell/admin/workspace \
xvfb-run -a npm run test:headed

ONECX_USER=onecx ONECX_PASSWORD=onecx BASE_URL=http://onecx.localhost/onecx-shell/admin/workspace \
xvfb-run -a npm run test:debug
```

Optional (UI mode via virtual display):

```bash
ONECX_USER=onecx ONECX_PASSWORD=onecx BASE_URL=http://onecx.localhost/onecx-shell/admin/workspace \
xvfb-run -a npx playwright test --ui
```

## Artifacts

After execution, the output directory contains:

```text
/e2e-results/
├── .auth/user.json
├── test-results.json
├── playwright-report/index.html
├── test-artifacts/
├── screenshots/
└── test-run.log
```
