# Task API

This API is the server-side portion of the CS553 task and project tracking
application.

It uses Express, TypeScript, and PostgreSQL to provide user registration, JWT
authentication, project ownership, role-based authorization, and task CRUD
operations.

## Project Structure

Current structure:

```shell
apps/api/
|-- README.md
|-- package-lock.json
|-- package.json
|-- tsconfig.json
|-- src/
|   |-- server.ts
|   |-- config/
|   |   `-- env.ts
|   |-- db/
|   |   `-- pool.ts
|   |-- middleware/
|   |   |-- authenticate.ts
|   |   `-- authorize.ts
|   |-- routes/
|   |   |-- authRoutes.ts
|   |   |-- projectRoutes.ts
|   |   |-- taskRoutes.ts
|   |   `-- userRoutes.ts
|   `-- services/
|       |-- authService.ts
|       |-- projectService.ts
|       |-- taskService.ts
|       `-- userService.ts
`-- test/
    `-- testRoutes.test.ts
```

## File Descriptions

| File | Purpose |
| --- | --- |
| `package.json` | Defines the API dependencies and npm scripts. |
| `src/server.ts` | Creates the Express app and starts the API server. |
| `src/config/env.ts` | Loads and validates the root environment variables. |
| `src/db/pool.ts` | Creates the shared PostgreSQL connection pool. |
| `src/middleware/authenticate.ts` | Verifies Bearer tokens and stores the authenticated user for later routes. |
| `src/middleware/authorize.ts` | Checks administrator roles and project ownership. |
| `src/routes/authRoutes.ts` | Defines registration, login, and current-user routes. |
| `src/routes/projectRoutes.ts` | Defines project routes, validation, and ownership checks. |
| `src/routes/taskRoutes.ts` | Defines the task HTTP routes and request validation. |
| `src/routes/userRoutes.ts` | Defines the administrator-only user route. |
| `src/services/authService.ts` | Hashes passwords, verifies credentials, and creates JWTs. |
| `src/services/projectService.ts` | Contains the PostgreSQL queries for projects. |
| `src/services/taskService.ts` | Contains the PostgreSQL queries for tasks. |
| `src/services/userService.ts` | Contains user queries and excludes password hashes from public responses. |
| `test/testRoutes.test.ts` | Contains automated tests for task, project, authentication, and authorization routes. |
| `tsconfig.json` | Configures the TypeScript compiler. |

## Prerequisites

You must have `npm, docker, docker compose, postgresql-client-common, postgresql-client` installed.

## Installing Dependencies

cd into apps/api and run npm install.

```shell
cd apps/api
npm install
```

## Environment configuration

From the repository root, create the required `.env` file by copying
`.env.example`:

```shell
cp .env.example .env
```

The committed `.env.example` file contains placeholders only. Open the new
`.env` file and replace every `replace_with_...` value before starting the
database or API.

### Database Credentials

Choose a database name, database user, and database password.


Build `DATABASE_URL` using the same database name, user, and password:

```dotenv
POSTGRES_DB=your_database_name
POSTGRES_USER=your_database_user
POSTGRES_PASSWORD=your_generated_database_password
DATABASE_URL=postgresql://your_database_user:your_generated_database_password@localhost:5432/your_database_name
PORT=3000
```

### JWT Secret

Generate a separate JWT secret locally:

```shell
openssl rand -hex 16
```

You could also just manually choose a password for the jwt secret, but I thought using openssl to generate the random hex string would be more realistic.

Copy the generated value into `.env`:

```dotenv
JWT_SECRET=your_generated_jwt_secret
```

The JWT secret is used to sign and verify access tokens. Do not reuse the
database password as the JWT secret.

The API reads `.env` automatically. To use `DATABASE_URL` with `psql` commands
in the current Linux terminal, load the values into the shell:

```shell
set -a
source .env
set +a
```

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
psql "$DATABASE_URL" -f database/schema.sql
```

This command uses the database connection created in `.env` and loaded into the
current shell. The schema creates the `users`, `projects`, and `tasks` tables.

## Starting the Server

Navigate to the repo's root and run

```shell
npm run dev
```

The server runs on port `3000` by default:

```shell
http://localhost:3000
```

To use a different port, set `PORT` in the root `.env` file:

## Creating an Administrator

All accounts created through `POST /auth/register` receive the normal `user`
role. Register the account first, then promote it directly in PostgreSQL:

Note: since this will be done in a terminal different from the one used to start the server, its important to remember to rerun the following in the new one.
```shell
set -a
source .env
set +a
```

1. Register the admin
```shell
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Administrator","email":"admin@example.com","password":"AdminPassword123!"}'
```

2. Promote the account to admin
```shell
psql "$DATABASE_URL" -c "UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';"
```

Replace `admin@example.com` with the correct email. Log in
again after changing the role so that the new JWT contains the `admin` role.

## Testing

The automated tests use PostgreSQL and clear the `users`, `projects`, and
`tasks` tables before each test. In the real world we'd need to use a separate test database so development data is not deleted. To follow that practice, follow the commands below.

To create the test database and apply the schema:

```shell
TEST_DATABASE_NAME="${POSTGRES_DB}_test"
TEST_DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${TEST_DATABASE_NAME}"
psql "$DATABASE_URL" -c "CREATE DATABASE \"${TEST_DATABASE_NAME}\";"
psql "$TEST_DATABASE_URL" -f database/schema.sql
```

If the test database already exists, skip the `CREATE DATABASE` command and
reapply the schema.

From the repository root, temporarily point the API at the test database and
run the tests:

```shell
DATABASE_URL="$TEST_DATABASE_URL" npm test
```

## Registration, Login, and JWT Requests

The names, emails, and passwords below are sample request values only. Replace
them when creating your own local account.

### Check the API Health

```shell
curl http://localhost:3000/health
```

### Registering a User

```shell
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"john doe","email":"jd@example.com","password":"password"}'
```

### Logging In

```shell
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jd@example.com","password":"password"}'
```

Login returns the user and an `accessToken`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "expiresIn": "1h",
  "user": {
    "id": 1,
    "name": "john doe",
    "email": "jd@example.com",
    "role": "user",
    "createdAt": "2026-07-31T12:00:00.000Z"
  }
}
```
run:
```shell
export ACCESS_TOKEN="<token-value>"
```
To make following manual commands easier.

### Sending a JWT with a Request

Send the `accessToken` to protected routes using the Bearer format:

```text
Authorization: Bearer <access-token>
```

### Protected Route Examples

Create a project:

```shell
curl -X POST http://localhost:3000/projects \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Checkpoint 2","description":"Authentication and authorization"}'
```

Create a task associated with the project:

```shell
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Create task API","description":"Implement CRUD routes","projectId":1}'
```

Get all tasks:

```shell
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Update a task:

```shell
curl -X PATCH http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```

Delete a task:

```shell
curl -X DELETE http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Supported Routes

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Check whether the API server is running. |
| `GET` | `/db-health` | Check whether the API can connect to PostgreSQL. |
| `POST` | `/auth/register` | Register a normal user account. |
| `POST` | `/auth/login` | Log in and receive a JWT access token. |
| `GET` | `/auth/me` | Return the authenticated user. Requires authentication. |
| `GET` | `/users` | Return all users. Requires authentication and the `admin` role. |
| `GET` | `/projects` | Return all projects. Requires authentication. |
| `POST` | `/projects` | Create a project owned by the authenticated user. Requires authentication. |
| `GET` | `/projects/:id` | Return one project by ID. Requires authentication. |
| `PATCH` | `/projects/:id` | Update a project. Requires the project owner or an administrator. |
| `DELETE` | `/projects/:id` | Delete a project. Requires the project owner or an administrator. |
| `GET` | `/tasks` | Return all tasks. Requires authentication. |
| `POST` | `/tasks` | Create a task in a project. Requires the project owner or an administrator. |
| `GET` | `/tasks/:id` | Return one task by ID. Requires authentication. |
| `PATCH` | `/tasks/:id` | Update a task. Requires the task's project owner or an administrator. |
| `DELETE` | `/tasks/:id` | Delete a task. Requires the task's project owner or an administrator. |

## Authorization and Ownership

Accounts registered through the API receive the `user` role. The `GET /users`
route is the administrator-only operation. A normal user receives `403
Forbidden` when attempting to access it, while an administrator can use it to
view all users.

An authenticated user can create a project, and that user becomes the project's
owner. Project owners can update or delete their own projects. Tasks belong to
projects, so only the project owner can create, update, or delete tasks in that
project. Assigning a task to another user does not make that user the project
owner. An administrator can manage any project or task.

Requests without a valid JWT receive `401 Unauthorized`. Authenticated users
without permission receive `403 Forbidden`. Requests for resources that do not
exist receive `404 Not Found`.

## Response JSON Shapes

A user response does not include the password or password hash:

```json
{
  "id": 1,
  "name": "john doe",
  "email": "jd@example.com",
  "role": "user",
  "createdAt": "2026-07-31T12:00:00.000Z"
}
```

A project response includes its owner's user ID:

```json
{
  "id": 1,
  "name": "Checkpoint 2",
  "description": "Authentication and authorization",
  "ownerId": 1,
  "createdAt": "2026-07-31T12:00:00.000Z"
}
```

A task response includes its project and optional assigned user:

```json
{
  "id": 1,
  "title": "Create task API",
  "description": "Implement the first task endpoint",
  "status": "todo",
  "projectId": 1,
  "assignedTo": null,
  "createdAt": "2026-07-13T12:00:00.000Z",
  "updatedAt": "2026-07-13T12:00:00.000Z"
}
```

## Validation and Error Handling

The API returns JSON error responses and does not return password hashes.

- `400 Bad Request` is used for invalid IDs, missing required fields, invalid
  task statuses, and malformed JSON.
- `401 Unauthorized` is used when a protected route receives a missing or
  invalid JWT.
- `403 Forbidden` is used when an authenticated user does not have the required
  role or ownership.
- `404 Not Found` is used when a requested user, project, or task does not
  exist.
- `409 Conflict` is used when registering an email that already exists.
- `500 Internal Server Error` is used for unexpected database or server errors.

Examples:

Creating a task without a title returns `400`:

```json
{
  "error": "Tasks must have a title"
}
```

Requesting a task ID that does not exist returns `404`:

```json
{
  "error": "The specified task was not found"
}
```

## Reflection Questions

