#!/bin/bash
set -e

echo "Starting database initialization..."

SCHEMA_DIR="/docker-entrypoint-initdb.d/schemas"

# Execute SQL files in order
echo "Loading 01-enums.sql..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${SCHEMA_DIR}/01-enums.sql"

echo "Loading 02-organizations.sql..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${SCHEMA_DIR}/02-organizations.sql"

echo "Loading 03-users-and-teams.sql..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${SCHEMA_DIR}/03-users-and-teams.sql"

echo "Loading 04-subscriptions-and-plans.sql..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${SCHEMA_DIR}/04-subscriptions-and-plans.sql"

echo "Loading 05-leads.sql..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${SCHEMA_DIR}/05-leads.sql"

echo "Loading 06-projects.sql..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${SCHEMA_DIR}/06-projects.sql"

echo "Loading 07-apis.sql..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${SCHEMA_DIR}/07-apis.sql"

echo "Loading 08-lead-communication.sql..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${SCHEMA_DIR}/08-lead-communication.sql"

echo "Loading 09-lead-management.sql..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${SCHEMA_DIR}/09-lead-management.sql"

echo "Loading 10-lead-routing.sql..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${SCHEMA_DIR}/10-lead-routing.sql"

# Load seed data
echo "Loading seed data (seed.sql)..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${SCHEMA_DIR}/Scripts/seed.sql"

echo "Database initialization completed successfully!"
