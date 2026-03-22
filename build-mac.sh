#!/bin/bash
set -e

echo "===================================="
echo " KienzleFaktura - macOS Build"
echo "===================================="
echo

echo "[1/3] Installing dependencies..."
npm install

echo
echo "[2/3] Building app..."
npm run build:mac

echo
echo "[3/3] Done! DMG is in the 'dist' folder."
