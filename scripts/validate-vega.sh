#!/usr/bin/env bash
set -euo pipefail

echo "== Kaylane TV / Vega validation =="

command -v node >/dev/null
command -v npm >/dev/null
command -v vega >/dev/null

echo "-- Versions --"
node --version
npm --version
vega --version

echo "-- Vega dependency reconciliation --"
vega project install --fix

echo "-- npm dependency resolution --"
npm install

echo "-- Static project validation --"
npm run validate:static

echo "-- Unit tests --"
npm test

echo "-- TypeScript --"
npm run typecheck

echo "-- Vega doctor --"
npm run doctor

echo "-- Debug build --"
npm run build:debug

echo "-- Release build --"
npm run build:release

echo "== Kaylane TV validation completed successfully =="
echo "Next: validate the Release VPKG with VPT/Strict ABI, then install it on the physical Fire TV."
