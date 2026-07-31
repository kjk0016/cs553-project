# Database

This project uses PostgreSQL running in Docker.

The database name, username, and password must be provided in the root `.env`
file. Copy `.env.example` to `.env` and replace each placeholder before starting
PostgreSQL.

## Setting up the database

```shell
docker compose up -d
or 
npm run db:start
```
Stop the database
```shell
docker compose down 
or 
npm run db:stop
```
Reset the database completely
```shell
docker compose down -v
or 
npm run db:reset
```
## Database connection settings

The root `.env` file must define:

```dotenv
POSTGRES_DB=cs553
POSTGRES_USER=replace-this-value
POSTGRES_PASSWORD=replace-this-value
DATABASE_URL=postgresql://replace-this-value:replace-this-value@localhost:5432/cs553
```

## Creating tables

Run the schema file against the local database after PostgreSQL is running:

```shell
psql "$DATABASE_URL" -f database/schema.sql
```
