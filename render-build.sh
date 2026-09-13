#!/bin/bash
set -e

echo "=== Yusr Build Script ==="
echo "Node: $(node --version)"
echo "npm: $(npm --version)"

echo "--- Installing frontend dependencies ---"
cd frontend
npm install

echo "--- Building frontend ---"
npm run build

echo "--- Installing backend dependencies ---"
cd ../backend
npm install

echo "=== Build complete ==="
