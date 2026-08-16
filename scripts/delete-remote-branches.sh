#!/usr/bin/env bash
# Deletes all remote dependabot branches from origin

echo "Fetching remote branches..."
git fetch --prune

# Find all dependabot branches on origin
branches=$(git branch -r | grep 'origin/dependabot/' | sed 's/^[[:space:]]*origin\///')

if [ -z "$branches" ]; then
  echo "No remote dependabot branches found."
  exit 0
fi

echo "The following remote branches will be deleted:"
echo "$branches"
echo ""

read -p "Are you sure you want to delete these remote branches? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
  for branch in $branches; do
    echo "Deleting remote branch: $branch"
    git push origin --delete "$branch"
  done
  echo "All remote dependabot branches deleted."
else
  echo "Aborted."
fi
