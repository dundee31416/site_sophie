#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Seeding admin user..."
python -m src.seed_admin

echo "Starting application..."
exec "$@"
