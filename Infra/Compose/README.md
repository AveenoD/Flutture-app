# Crownco Docker Compose Setup

This directory contains Docker Compose configuration to set up PostgreSQL database and Redis for the Crownco application.

## Prerequisites

- Docker
- Docker Compose

## Usage

### Start all services

From the `Infra/Compose` directory:

```bash
docker-compose up -d
```

### Stop all services

```bash
docker-compose down
```

### Stop and remove volumes (clean slate)

```bash
docker-compose down -v
```

### View logs

```bash
# PostgreSQL logs
docker-compose logs -f postgres

# Redis logs
docker-compose logs -f redis

# All services logs
docker-compose logs -f
```

## Services Configuration

### PostgreSQL Database

The database is configured with the following defaults (matching `core-api/config/config.go`):

- **User**: `crownco-db-user`
- **Password**: `crownco-db-password`
- **Database**: `crownco-db`
- **Port**: `5432`

### Redis Cache

Redis is configured with the following defaults (matching `core-api/config/config.go`):

- **Host**: `localhost`
- **Port**: `6379`
- **Password**: `crownco-redis-password`
- **DB**: `0`

## Schema Initialization

The database automatically loads all schema files from `Backend/Database` in the correct order:

1. 01-enums.sql
2. 02-organizations.sql
3. 03-users-and-teams.sql
4. 04-subscriptions-and-plans.sql
5. 05-leads.sql
6. 06-projects.sql
7. 07-apis.sql
8. 08-lead-communication.sql
9. 09-lead-management.sql
10. 10-lead-routing.sql

**Note**: Schema initialization only runs when the database is first created. If you need to reload schemas, remove the volume and restart:

```bash
docker-compose down -v
docker-compose up -d
```

## Connection Strings

### PostgreSQL

```
postgres://crownco-db-user:crownco-db-password@localhost:5432/crownco-db?sslmode=disable
```

### Redis

```
redis://:crownco-redis-password@localhost:6379/0
```

## Environment Variables

You can override the default credentials by setting environment variables before running `docker-compose up`:

```bash
export POSTGRES_USER=myuser
export POSTGRES_PASSWORD=mypassword
export POSTGRES_DB=mydb
export REDIS_PASSWORD=myredispassword
docker-compose up -d
```

Or create a `.env` file in this directory with:

```
POSTGRES_USER=crownco-db-user
POSTGRES_PASSWORD=crownco-db-password
POSTGRES_DB=crownco-db
REDIS_PASSWORD=crownco-redis-password
```

## Testing Connections

### Test PostgreSQL

```bash
docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db -c "SELECT version();"
```

### Test Redis

```bash
docker exec -i crownco-redis redis-cli -a crownco-redis-password ping
```
