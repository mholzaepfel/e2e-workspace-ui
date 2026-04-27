#!/bin/bash
set -e

# Minimal entrypoint — Testcontainers handles logging and lifecycle.
# Only used for manual docker run; Dockerfile uses CMD directly.

exec "$@"
