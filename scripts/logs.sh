#!/usr/bin/env bash
# View real-time logs for PCBuilder container stack
docker compose logs -f "$@"
