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

## Reflection Questions
Answer the following questions in your README or in a separate file such as answers.md.

1.What is the difference between an in-memory API and a database-backed API?

The difference between an in-memory API and a database-backed API, is that one stores information in memory during runtime, and the other stores information in an external database. With an in-memory API the information is saved on the server, while it is running. This means that information can only be stored so long as the server is running, and once it is taken down all of that information is lost. This means the information is not persistent. However, with a database-backed API the information is stored in an independent external database. While maintaining a database, alongside the API, is more work it allows stored information to be saved even when the server is no longer running. Is is necessary for pretty much all practical production environments, as losing important information due to a server outage would be devestating. 

2.Why is it useful to separate routes, services, and database logic?

The reason it is useful to separate routes, services, and database logic, is that it makes the overall codebase easier to understand, maintain, and test. Breaking the overall application into smaller, specialized sections allows developers to work on one part of the system without having to search through one massive file containing irrelevant code focused on other parts. For example, if a developer wanted to add, modify, or remouve a route, they could go directly to the routes file, instead of having to search through service and database logic too. This seperation is especially useful when updates are required, as one section can be changed without needed to change the entire application. Finally it improves testing as routes, services, and database logic can be tested individually instead of all together. 

3.What HTTP status codes did you use, and why?

The status codes I used were `200`, `201`, `204`, `400`, `404`, and `500`.

- 200 was used to show that a task was succesfully received and processed.
- 201 was used to show that a task was succesfully created.
- 204 was used to show that a task was successfully deleted, and there is no response body to return.
- 400 was used to inform the user that an invalid request was made.
- 404 was used to inform the user that a valid request was made, but the specific task id requested could not be found.
- 500 was used to inform the user of an internal server or database error.

4.What happens when a client requests a task ID that does not exist?

When a client requests a task ID that does not exist, the server catches that during taskID verification, and sends a `404` error to inform the user the specified task was not found.

5.What was the hardest part of connecting the API to PostgreSQL?

The hardest part of connecting the API to PostgreSQL, was writing the SQL queries in `taskService.ts`. With a decent amount of the connection work already being completed in the starter, the hardest thing was figuring out how to write sql queries that matched the logic expected of the routes. It has been a long time since I've had to work with sql statements, so I found refreshing myself on how to use placeholders and certain statements to be the most time consuming aspect of the database connection. 
