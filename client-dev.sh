#!/usr/bin/env bash
# PCBuilder React Client Development Server Script (via Docker)
# Bypasses Vite/Rolldown path-wildcard issues on Linux when folder path has special characters.

docker run -it --rm -p 5173:5173 -v "$(pwd):/workspace" -w /workspace/client node:20-slim npm run dev -- --host 0.0.0.0
