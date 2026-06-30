#!/usr/bin/env bash
# Run schema 01–11 and seed against Docker Postgres (crownco-postgres).
# Usage: from repo root:  ./Backend/database/scripts/setup-db.sh
#        or from Backend/database:  ./scripts/setup-db.sh
# Ensure Docker is running and:  docker-compose -f Infra/Compose/docker-compose.yml up -d

set -e
DB_CONTAINER="${CROWNCO_POSTGRES_CONTAINER:-crownco-postgres}"
DB_USER="${CROWNCO_POSTGRES_USER:-crownco-db-user}"
DB_NAME="${CROWNCO_POSTGRES_DB:-crownco-db}"

# Go to Backend/database (parent of scripts/)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "Using container: $DB_CONTAINER, db: $DB_NAME, user: $DB_USER"
echo "Schema directory: $DIR"

if ! docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
  echo "Error: Postgres not ready in container $DB_CONTAINER. Start it with:"
  echo "  cd Infra/Compose && docker-compose up -d"
  exit 1
fi

SCHEMA_FILES=(
  "01-enums.sql"
  "02-organizations.sql"
  "03-users-and-teams.sql"
  "04-subscriptions-and-plans.sql"
  "05-leads.sql"
  "06-projects.sql"
  "07-apis.sql"
  "08-lead-communication.sql"
  "09-lead-management.sql"
  "10-lead-routing.sql"
  "11-lead-sourcing-integration-required.sql"
)

for f in "${SCHEMA_FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "Missing file: $f"
    exit 1
  fi
  echo "Applying $f ..."
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$f" || { echo "Failed: $f"; exit 1; }
done

if [[ -f "Scripts/seed.sql" ]]; then
  echo "Applying Scripts/seed.sql ..."
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < Scripts/seed.sql || echo "Warning: seed.sql had errors (some inserts may be skipped)."
else
  echo "Scripts/seed.sql not found; skipping seed."
fi

echo "DB setup finished."
