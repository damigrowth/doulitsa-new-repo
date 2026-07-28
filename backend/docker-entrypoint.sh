#!/usr/bin/env sh
# Backend container entrypoint.
#
# On boot the web service applies database migrations and collects static
# assets, then execs the container command (daphne by default). Celery worker
# and beat containers reuse this same image but should set RUN_MIGRATIONS=0 so
# they don't all race to migrate.
set -e

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "[entrypoint] Applying database migrations..."
  # --fake-initial: the legacy Postgres already holds the migrated tables, so
  # initial migrations are marked applied instead of re-creating them.
  python manage.py migrate --fake-initial --noinput

  echo "[entrypoint] Collecting static files..."
  python manage.py collectstatic --noinput
fi

echo "[entrypoint] Starting: $*"
exec "$@"
