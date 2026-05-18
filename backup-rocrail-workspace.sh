#!/bin/bash
# Backup script for Rocrail workspace

# Detect if running on local development machine (macOS / Darwin)
if [ "$(uname)" = "Darwin" ]; then
    echo "💻 Running locally on macOS. Tunneling backup command to edge server..."
    
    # Extract REMOTE_HOST and REMOTE_DIR from deploy.sh (fallback to defaults if not found)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    REMOTE_HOST=$(grep -E '^REMOTE_HOST=' "$SCRIPT_DIR/deploy.sh" | cut -d'"' -f2)
    REMOTE_HOST=${REMOTE_HOST:-rails49}
    REMOTE_DIR=$(grep -E '^REMOTE_DIR=' "$SCRIPT_DIR/deploy.sh" | cut -d'"' -f2)
    REMOTE_DIR=${REMOTE_DIR:-"~/track-occupancy"}
    
    echo "🔗 SSH connecting to $REMOTE_HOST to execute backup..."
    ssh -t "$REMOTE_HOST" "bash $REMOTE_DIR/backup-rocrail-workspace.sh"
    exit $?
fi

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
