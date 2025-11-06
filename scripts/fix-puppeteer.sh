#!/bin/bash

# Fix Puppeteer Chromium "socket hang up" error
# This script clears corrupted Chromium cache and reinstalls Puppeteer

echo "🔧 Fixing Puppeteer Chromium installation..."

# Navigate to backend directory
cd "$(dirname "$0")/.." || exit 1

# Remove corrupted Chromium cache
echo "📦 Clearing Chromium cache..."
rm -rf node_modules/puppeteer/.local-chromium
rm -rf ~/.cache/puppeteer

# Reinstall Puppeteer
echo "📥 Reinstalling Puppeteer..."
npm install puppeteer --force

echo "✅ Done! Try testing your LinkedIn cookie again."
echo ""
echo "If the issue persists, the system will automatically fall back to HTTP-only provider."

