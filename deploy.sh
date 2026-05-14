#!/bin/bash
set -e

# Configuration
REMOTE_HOST="blocks"
REMOTE_DIR="~/track-occupancy"
# If you add new dependencies, run with BUILD=1 ./deploy.sh
BUILD=${BUILD:-0}

echo "🚀 Starting fast-sync deployment to $REMOTE_HOST..."

# 1. Build the UI locally
echo "🔍 Checking for UI changes..."
UI_SOURCES="ui/src ui/public lib/r49 lib/classifier lib/uid ui/package.json"
# We hash the contents of all source files to decide if a rebuild is needed
NEW_HASH=$(find $UI_SOURCES -name "node_modules" -prune -o -type f -print0 | sort -z | xargs -0 md5 -q | md5 -q)
OLD_HASH=$(cat .ui_build_hash 2>/dev/null || echo "")

if [ "$NEW_HASH" != "$OLD_HASH" ] || [ ! -d "ui/dist" ]; then
  echo "📦 Changes detected. Building UI..."
  pnpm --filter @occupancy/ui build
  echo "$NEW_HASH" > .ui_build_hash
else
  echo "⏩ No UI changes detected. Skipping build."
fi

# 2. Prepare local data for the detector
echo "📁 Preparing model and layout..."
# We keep control/data for layout.r49 which is managed by the app

# 3. Sync essential files
# We preserve directory structure for bind mounts
echo "📦 Syncing essential files..."
rsync -avzR -c --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'control/data/layout.r49' \
  control/ lib/ ui/dist/ dataset/data/ cnn/models/ \
  package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json \
  "$REMOTE_HOST:$REMOTE_DIR/"

# 4. Remote Execution
if [ "$BUILD" -eq 1 ]; then
  echo "🐳 Rebuilding containers (no-cache)..."
  ssh "$REMOTE_HOST" "cd $REMOTE_DIR/control && docker compose build --no-cache && docker compose up -d"
else
  echo "♻️  Updating services and restarting if needed..."
  ssh "$REMOTE_HOST" "cd $REMOTE_DIR/control && docker compose up -d --build"
fi

echo "✅ Deployment complete! Changes are live."
