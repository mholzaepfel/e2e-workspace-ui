# OneCX E2E Runbook (Playwright)

This runbook describes how to execute OneCX workspace UI E2E tests in local development, Docker, and CI pipelines.

## Goals

- Keep tests reusable via harnesses
- Keep runtime configuration environment-driven
- Run reliably in Docker and Testcontainers networks
- Export test artifacts for later analysis

## Quick Start

### Local execution

```bash
cp config.env.example .env.local
npm install
npm test
```

### Docker execution

```bash
docker build -f workspace.Dockerfile -t onecx-workspace-e2e:latest .

docker run --rm \
  -e BASE_URL=http://onecx.localhost/onecx-shell/admin/workspace \
  -e ONECX_USER=onecx \
  -e ONECX_PASSWORD=onecx \
  -v $(pwd)/artifacts:/e2e-results \
  --network=host \
  onecx-workspace-e2e:latest
```

## Environment Variables

| Variable             | Purpose                             | Default                                              |
| -------------------- | ----------------------------------- | ---------------------------------------------------- |
| `BASE_URL`           | Target workspace URL                | `http://onecx.localhost/onecx-shell/admin/workspace` |
| `ONECX_USER`         | Keycloak username                   | `onecx`                                              |
| `ONECX_PASSWORD`     | Keycloak password                   | `onecx`                                              |
| `OUTPUT_DIR`         | Output path for artifacts           | `/e2e-results`                                       |
| `RUN_ID`             | Run identifier for artifact pathing | `local`                                              |
| `CI`                 | CI mode (enables retries)           | `false`                                              |
| `TEST_TIMEOUT`       | Per-test timeout in ms              | `30000`                                              |
| `EXPECT_TIMEOUT`     | Assertion timeout in ms             | `10000`                                              |
| `NAVIGATION_TIMEOUT` | Navigation timeout in ms            | `15000`                                              |
| `ACTION_TIMEOUT`     | Action timeout in ms                | `10000`                                              |

Compatibility fallback is supported for `ONECX_USER` and `ONECX_PASSWORD`, but `ONECX_USER` and `ONECX_PASSWORD` are the canonical variables.

## Harness Architecture

- `BaseHarness`: shared navigation/error helpers
- `KeycloakLoginHarness`: keycloak login page interactions
- `WorkspaceSearchHarness`: workspace page interactions

## Test Flow

1. `auth.setup.ts` signs in and writes `.auth/user.json`
2. Main browser project reuses storage state
3. Workspace tests run against authenticated session
4. Reports, traces, screenshots are persisted to output directory

## Artifact Output

```text
/e2e-results/
├── .auth/user.json
├── test-results.json
├── playwright-report/index.html
├── test-artifacts/
├── screenshots/
└── test-run.log
```

## CI / Testcontainers Notes

- Use network aliases for target services
- Never rely on localhost unless using host network
- Mount output directory as volume to extract results
- Consume container exit code for pass/fail

## Troubleshooting

### Authentication redirect loop

- Verify `BASE_URL`
- Verify Keycloak reachability and credentials
- Inspect `test-run.log`

### Missing storage state

- Check setup test logs
- Confirm `.auth/user.json` exists in output directory

### Flaky waits

- Use locator auto-waiting in harness methods
- Keep all timeout tuning centralized in `playwright.config.ts`
