# Task API

This API is the server-side portion of the CS553 task tracking project.

It uses Express, TypeScript, and PostgreSQL to provide a small database-backed
REST API for tasks.

## Project Structure

Current structure:

```shell
apps/api/
|-- package.json
|-- src/
|   |-- server.ts
|   |-- config/
|   |   `-- env.ts
|   |-- db/
|   |   `-- pool.ts
|   |-- routes/
|   |   `-- taskRoutes.ts
|   `-- services/
|       `-- taskService.ts
`-- test/
    `-- taskRoutes.test.ts
```

## File Descriptions

| File | Purpose |
| --- | --- |
| `src/server.ts` | Creates the Express app and starts the API server. |
| `src/routes/taskRoutes.ts` | Defines the task HTTP routes and request validation. |
| `src/services/taskService.ts` | Contains the PostgreSQL queries for tasks. |
| `src/db/pool.ts` | Creates the PostgreSQL connection pool. |
| `src/config/env.ts` | Loads environment variables from the root `.env` file. |
| `test/taskRoutes.test.ts` | Contains automated tests for the task routes. |

## Prerequisites

You must have the following installed for this to run in your environemnt `npm, docker, postgresql-client-common, postgresql-client`

## Installing Dependencies

cd into apps/api and run npm install.

```shell
cd apps/api
npm install
```

## Default connection settings

- Database: cs553
- User: postgres
- Password: postgres
- Port: 5432

## Starting PostgreSQL

Navigate to the repo's root and run

```shell
docker compose up -d
or 
npm run db:start
```

To stop the database:

```shell
docker compose down 
or 
npm run db:stop
```

To reset the database volume:

```shell
docker compose down -v
or 
npm run db:reset
```

## Creating the Database Tables

Run the schema file against the local database after PostgreSQL is running:

```shell
psql postgresql://postgres:postgres@localhost:5432/cs553 -f database/schema.sql
```

## Starting the Server

Navigate to the repo's root and run

```shell
npm run dev
```
```

The server runs on port `3000` by default:

```shell
http://localhost:3000
```

To use a different port, set `PORT` in the root `.env` file:

## Testing

For automated testing, navigate to the root and run:

```shell
npm test
```

For manual testing example curl commands have been provided. 

#### Example curl Commands

Check the API health:

```shell
curl http://localhost:3000/health
```

Create a task:

```shell
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Create task API\",\"description\":\"Implement CRUD routes\"}"
```

Get all tasks:

```shell
curl http://localhost:3000/tasks
```

Update a task:

```shell
curl -X PATCH http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"done\"}"
```

Delete a task:

```shell
curl -X DELETE http://localhost:3000/tasks/1
```

## Supported Routes

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Check whether the API server is running. |
| `GET` | `/db-health` | Check whether the API can connect to PostgreSQL. |
| `GET` | `/tasks` | Return all tasks. |
| `POST` | `/tasks` | Create a new task. |
| `GET` | `/tasks/:id` | Return one task by ID. |
| `PATCH` | `/tasks/:id` | Update an existing task. |
| `DELETE` | `/tasks/:id` | Delete an existing task. |

## Task JSON Shape

A task response includes:

```json
{
  "id": 1,
  "title": "Create task API",
  "description": "Implement the first task endpoint",
  "status": "todo",
  "createdAt": "2026-07-13T12:00:00.000Z",
  "updatedAt": "2026-07-13T12:00:00.000Z"
}
```

## Validation and Error Handling

The API returns JSON error responses for invalid requests.

Examples:

Creating a task without a title returns `400`:

```json
{
  "error": "Title is required"
}
```

Requesting a task ID that does not exist returns `404`:

```json
{
  "error": "Task not found"
}
```
