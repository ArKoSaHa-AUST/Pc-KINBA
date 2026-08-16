#!/usr/bin/env bash
# Clean and run local build sequence
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/.."

echo "Running Clean Script..."
bash ./scripts/clean.sh

echo "Installing client dependencies..."
cd client && npm install

echo "Building React client..."
cd ..
bash ./client-build.sh

echo "Rebuild complete successfully."
