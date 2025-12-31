#!/usr/bin/env bash
set -euo pipefail

if [ ! -f ".env" ]; then
  echo ".env not found. Create one from .env.example:"
  echo "  cp .env.example .env"
  exit 1
fi

docker compose --profile prod up -d --build
docker compose ps
