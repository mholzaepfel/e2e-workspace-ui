#!/bin/bash
set -e

# ============================================================
# OneCX E2E Test Container Entrypoint
# ============================================================
# Runs Playwright E2E tests and collects logs/results.
# Exit code 0 = all tests passed
# Exit code 1 = tests failed
# ============================================================

artifacts_ROOT="${artifacts_ROOT:-/e2e-results}"
RUN_ID="${RUN_ID:-local}"
OUTPUT_DIR="${OUTPUT_DIR:-${artifacts_ROOT}}"
LOG_FILE="${OUTPUT_DIR}/test-run.log"

# Ensure log directory exists
mkdir -p "${OUTPUT_DIR}"

# Logging function
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] $1" | tee -a "${LOG_FILE}"
}

# ============================================================
# Startup
# ============================================================

log "=========================================="
log "OneCX E2E Test Container — Startup"
log "=========================================="
log "BASE_URL: ${BASE_URL}"
log "ONECX_USER: ${ONECX_USER:-${ONECX_USER:-onecx}}"
log "OUTPUT_DIR: ${OUTPUT_DIR}"
log "RUN_ID: ${RUN_ID}"
log "CI: ${CI:-false}"
log "=========================================="

# Prepare output directories
log "Preparing output directories..."
mkdir -p "${OUTPUT_DIR}/screenshots"
mkdir -p "${OUTPUT_DIR}/.auth"
mkdir -p "${OUTPUT_DIR}/test-artifacts"
mkdir -p "${OUTPUT_DIR}/playwright-report"

# Simple BASE_URL reachability check (optional)
if command -v curl &> /dev/null; then
    log "Checking BASE_URL reachability..."
    if ! curl -sf "${BASE_URL}" > /dev/null 2>&1; then
        log "BASE_URL is not responding (this can be OK for auth redirects)"
    else
        log "BASE_URL is reachable"
    fi
fi

# Version information
log "Environment information:"
log "  Node: $(node --version)"
log "  NPM: $(npm --version)"
log "  Playwright: $(node_modules/.bin/playwright --version 2>/dev/null || echo 'n/a')"

# ============================================================
# Error handling and cleanup
# ============================================================

cleanup() {
    local exit_code=$?
    
    log "=========================================="
    log "Test execution finished - Exit code: ${exit_code}"
    log "=========================================="
    
    # Results summary
    if [ -f "${OUTPUT_DIR}/test-results.json" ]; then
        log "Results file: test-results.json"
    fi
    
    if [ -d "${OUTPUT_DIR}/playwright-report" ] && [ -f "${OUTPUT_DIR}/playwright-report/index.html" ]; then
        log "✓ HTML-Report: playwright-report/index.html"
    fi
    
    if [ -n "$(find "${OUTPUT_DIR}/test-artifacts" -type f 2>/dev/null)" ]; then
        log "Test artifacts (traces/videos/screenshots): test-artifacts/"
    fi
    
    if [ -f "${OUTPUT_DIR}/.auth/user.json" ]; then
        log "Auth state: .auth/user.json"
    fi
    
    log "=========================================="
    log "All results available in: ${OUTPUT_DIR}"
    log "Container exits with code: ${exit_code}"
    log "=========================================="
    
    exit ${exit_code}
}

trap cleanup EXIT

# ============================================================
# Main execution
# ============================================================

log ""
log "Starting Playwright tests..."
log "Command: $@"
log "=========================================="
log ""

# Execute the provided command (default: npm test)
# tee writes output to stdout and the log file at the same time
exec "$@" 2>&1 | tee -a "${LOG_FILE}"
