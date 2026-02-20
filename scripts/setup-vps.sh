#!/bin/bash
# ============================================
# OpenClaw VPS Setup Script
# Run this on your server (217.25.94.44)
# ============================================
# Usage: ssh root@217.25.94.44
# Then paste this whole script and press Enter

echo "=== OpenClaw VPS Setup ==="

# Step 1: Find and update the OpenClaw config to listen on 0.0.0.0
echo "[1/4] Looking for OpenClaw config..."

CONFIG_PATHS=(
  "/opt/openclaw/config.yml"
  "/etc/openclaw/config.yml"
  "/root/openclaw/config.yml"
  "$HOME/openclaw/config.yml"
)

FOUND_CONFIG=""
for path in "${CONFIG_PATHS[@]}"; do
  if [ -f "$path" ]; then
    FOUND_CONFIG="$path"
    echo "  Found config at: $path"
    break
  fi
done

if [ -z "$FOUND_CONFIG" ]; then
  echo "  Config not found at standard paths. Searching..."
  FOUND_CONFIG=$(find / -name "config.yml" -path "*openclaw*" 2>/dev/null | head -1)
  if [ -z "$FOUND_CONFIG" ]; then
    FOUND_CONFIG=$(find / -name "config.yml" -path "*claw*" 2>/dev/null | head -1)
  fi
  if [ -n "$FOUND_CONFIG" ]; then
    echo "  Found config at: $FOUND_CONFIG"
  else
    echo "  ERROR: Could not find OpenClaw config.yml"
    echo "  Please find it manually and update gateway.listen to '0.0.0.0:18789'"
    exit 1
  fi
fi

echo ""
echo "[2/4] Current config content:"
cat "$FOUND_CONFIG"
echo ""

# Step 2: Show the auth token
echo "[3/4] Your auth token (you need this for the web dashboard):"
grep -A2 "auth" "$FOUND_CONFIG" | grep "token" | awk '{print $2}' | tr -d '"' | tr -d "'"
echo ""

# Step 3: Update binding from 127.0.0.1 to 0.0.0.0
echo "[4/4] Updating gateway listen address to 0.0.0.0:18789..."
sed -i 's/127\.0\.0\.1:18789/0.0.0.0:18789/g' "$FOUND_CONFIG"
sed -i 's/localhost:18789/0.0.0.0:18789/g' "$FOUND_CONFIG"
echo "  Done. Updated config:"
grep "listen" "$FOUND_CONFIG"
echo ""

# Step 4: Restart the container
echo "Restarting OpenClaw container..."
# Try docker compose first
if command -v docker &> /dev/null; then
  # Find docker-compose file
  COMPOSE_DIR=$(dirname "$FOUND_CONFIG")
  if [ -f "$COMPOSE_DIR/docker-compose.yml" ]; then
    cd "$COMPOSE_DIR"
    docker compose restart 2>/dev/null || docker-compose restart 2>/dev/null
  else
    # Try to find running container
    CONTAINER=$(docker ps --filter "name=openclaw" --format "{{.Names}}" | head -1)
    if [ -z "$CONTAINER" ]; then
      CONTAINER=$(docker ps --filter "name=claw" --format "{{.Names}}" | head -1)
    fi
    if [ -n "$CONTAINER" ]; then
      echo "  Restarting container: $CONTAINER"
      docker restart "$CONTAINER"
    else
      echo "  Could not find OpenClaw container. Please restart it manually."
    fi
  fi
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Your gateway should now be accessible at: ws://217.25.94.44:18789"
echo "Open your web dashboard and enter:"
echo "  Gateway URL: ws://217.25.94.44:18789"
echo "  Auth Token:  (shown above)"
echo ""
