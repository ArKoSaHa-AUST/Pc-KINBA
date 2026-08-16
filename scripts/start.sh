#!/usr/bin/env bash
# Spins up PCBuilder Docker environment
echo "Starting all Docker containers..."
docker compose up --build -d

echo "All services started."
echo "Go to http://localhost to access the application proxy."
