#!/usr/bin/env bash
# Clean project build files, cache, and dependencies
echo "Cleaning Laravel backend vendor and cache..."
rm -rf server/vendor server/bootstrap/cache/*.php server/storage/framework/cache/data/* 2>/dev/null

echo "Cleaning React client node_modules and builds..."
rm -rf client/node_modules client/dist client/coverage client/dist-ssr 2>/dev/null

echo "Cleaning complete."
