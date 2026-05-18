#!/bin/bash
# Backup script for Rocrail workspace
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
WORKSPACE_DIR="$HOME/track-occupancy/control/rocview-server/workspace"
cd "$WORKSPACE_DIR" || exit 1

# Ensure ownership is correct so git can read them (in case Rocrail created new files as root)
# Note: This requires sudo access. If it fails, we proceed anyway.
sudo chown -R $(id -u):$(id -g) . 2>/dev/null

git add .
# Only commit if there are changes
if ! git diff-index --quiet HEAD --; then
    git commit -m "Backup $(date +'%Y-%m-%d %H:%M:%S')"
    echo "✅ Changes committed to Git."
else
    echo "ℹ️ No changes to commit."
fi

# Always attempt to push any committed changes to GitHub
echo "🚀 Pushing to GitHub..."
git push origin master
