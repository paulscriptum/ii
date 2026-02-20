#!/bin/bash
# OpenClaw Device Token Mismatch Diagnostic Script
# Run this script on the Ubuntu VPS server as root

set -e

echo "=== OpenClaw Diagnostic Script ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if container exists
echo "1. Checking container status..."
if docker ps -a | grep -q openclaw-gateway; then
    echo -e "${GREEN}✓ Container exists${NC}"
    docker ps -a | grep openclaw-gateway
else
    echo -e "${RED}✗ Container not found${NC}"
    exit 1
fi

echo ""
echo "2. Checking container environment variables..."
docker exec openclaw-gateway env | grep -E "(OPENCLAW|NODE|HOME|USER)" | sort

echo ""
echo "3. Checking OpenClaw state directory structure..."
echo "Host mount point: /root/.openclaw"
if [ -d "/root/.openclaw" ]; then
    echo -e "${GREEN}✓ Directory exists${NC}"
    ls -la /root/.openclaw/
    echo ""
    echo "Subdirectories:"
    find /root/.openclaw -type d -maxdepth 2 2>/dev/null | head -20
else
    echo -e "${RED}✗ Directory does not exist${NC}"
fi

echo ""
echo "4. Checking container internal state directory..."
docker exec openclaw-gateway ls -la /home/node/.openclaw/ 2>/dev/null || echo "Directory not accessible"

echo ""
echo "5. Checking for openclaw.json..."
if [ -f "/root/.openclaw/openclaw.json" ]; then
    echo -e "${GREEN}✓ openclaw.json exists on host${NC}"
    echo "File size: $(stat -c%s /root/.openclaw/openclaw.json) bytes"
    echo "Last modified: $(stat -c%y /root/.openclaw/openclaw.json)"
    echo ""
    echo "Contents (sanitized - no tokens):"
    cat /root/.openclaw/openclaw.json | jq -r 'del(.deviceToken, .tokens, .auth)' 2>/dev/null || cat /root/.openclaw/openclaw.json
else
    echo -e "${YELLOW}⚠ openclaw.json not found on host${NC}"
fi

echo ""
echo "6. Checking container internal openclaw.json..."
docker exec openclaw-gateway cat /home/node/.openclaw/openclaw.json 2>/dev/null | jq -r 'del(.deviceToken, .tokens, .auth)' 2>/dev/null || \
docker exec openclaw-gateway cat /home/node/.openclaw/openclaw.json 2>/dev/null || \
echo "File not accessible in container"

echo ""
echo "7. Checking for alternative state directories..."
echo "Checking common OpenClaw state locations:"
for dir in "/home/node/.openclaw" "/home/node/.config/openclaw" "/root/.openclaw" "/root/.config/openclaw"; do
    if docker exec openclaw-gateway test -d "$dir" 2>/dev/null; then
        echo -e "${YELLOW}⚠ Found: $dir${NC}"
        docker exec openclaw-gateway ls -la "$dir" 2>/dev/null | head -10
    fi
done

echo ""
echo "8. Checking process environment inside container..."
docker exec openclaw-gateway ps aux | grep -E "(node|openclaw)" | head -5

echo ""
echo "9. Checking container logs for device token errors..."
echo "Last 50 lines of logs:"
docker logs --tail 50 openclaw-gateway 2>&1 | grep -i -E "(token|device|auth|unauthorized|mismatch)" || echo "No token-related errors found in recent logs"

echo ""
echo "10. Checking volume mounts..."
docker inspect openclaw-gateway | jq -r '.[0].Mounts[] | "\(.Source) -> \(.Destination) (\(.Type))"' 2>/dev/null || \
docker inspect openclaw-gateway | grep -A 10 "Mounts"

echo ""
echo "11. Checking for OPENCLAW_STATE_DIR environment variable..."
docker exec openclaw-gateway sh -c 'echo "OPENCLAW_STATE_DIR=${OPENCLAW_STATE_DIR:-not set}"'

echo ""
echo "12. Checking user and home directory in container..."
docker exec openclaw-gateway sh -c 'echo "USER=$USER, HOME=$HOME, PWD=$PWD"'
docker exec openclaw-gateway id

echo ""
echo "=== Diagnostic Complete ==="
echo ""
echo "Next steps:"
echo "1. Review the output above"
echo "2. Check if OPENCLAW_STATE_DIR is set incorrectly"
echo "3. Verify volume mounts are correct"
echo "4. Check if device token is being cached elsewhere"
