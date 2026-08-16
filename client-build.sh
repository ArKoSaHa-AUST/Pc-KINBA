#!/usr/bin/env bash
# PCBuilder React Client Build Script (via Docker)
# Bypasses Vite/Rolldown path-wildcard issues on Linux when folder path has special characters.

docker run --rm -v "$(pwd):/workspace" -w /workspace/client node:20-slim npm run build
