#!/usr/bin/env bash
# Clean project build files, cache, and dependencies
echo "Cleaning Laravel vendor and cache..."
rm -rf vendor/ bootstrap/cache/*.php storage/framework/cache/* storage/framework/sessions/* storage/framework/views/* 2>/dev/null

echo "Cleaning React client node_modules and builds..."
rm -rf client/node_modules client/dist client/coverage client/dist-ssr 2>/dev/null

echo "Cleaning complete."
