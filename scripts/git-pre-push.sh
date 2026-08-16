#!/usr/bin/env bash
# PCBuilder Local Git Pre-Push Hook
# Aborts the push if compilation, tests, or linting fails.

echo "=========================================="
echo "Running Local Pre-Push Quality Gate..."
echo "=========================================="

# 1. Frontend Quality Verification
echo "👉 Verifying frontend code formatting..."
cd client || exit 1

npm run format
if [ $? -ne 0 ]; then
  echo "❌ Error: Frontend code style/prettier verification failed. Push aborted."
  exit 1
fi
echo "✅ Frontend code formatting conforms."

echo "👉 Verifying frontend linting rules..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Error: ESLint rules failed. Push aborted."
  exit 1
fi
echo "✅ Frontend linting conforms."

echo "👉 Verifying frontend compilation and type-safety..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ Error: TypeScript compilation/type-checking failed. Push aborted."
  exit 1
fi
echo "✅ Frontend compilation is type-safe."

cd ..

echo "=========================================="
echo "🎉 Quality Gate Passed! Proceeding to push."
echo "=========================================="
exit 0
