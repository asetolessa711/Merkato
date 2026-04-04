#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/Merkato

echo "[codespaces] Installing root dependencies"
npm install

echo "[codespaces] Installing backend dependencies"
npm --prefix backend install

echo "[codespaces] Installing frontend dependencies"
npm --prefix frontend install

echo "[codespaces] Bootstrapping canonical dev database from repository"
npm --prefix backend run db:bootstrap:dev

echo "[codespaces] Validating canonical dev database"
npm --prefix backend run db:validate:dev

echo "[codespaces] Setup complete"
