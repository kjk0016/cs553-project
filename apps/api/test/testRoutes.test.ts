import { afterAll, beforeEach, describe, expect, test } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";
import { pool } from "../src/db/pool";
import { createApp } from "../src/server";

const app = createApp();

// create a normal user and return a token for protected route tests
async function registerAndLogin(
	name = "Test User",
	email = "test@example.com",
	password = "test-password",
) {
	const registerResponse = await request(app)
		.post("/auth/register")
		.send({
			name,
			email,
			password,
		})
		.expect(201);

	const loginResponse = await request(app)
		.post("/auth/login")
		.send({
			email,
			password,
		})
		.expect(200);

	return {
		user: registerResponse.body,
		accessToken: loginResponse.body.accessToken as string,
	};
}

// create an administrator and return a token for role checks
async function registerAndLoginAdmin(
	name = "Test Administrator",
	email = "admin@example.com",
	password = "admin-password",
) {
	const account = await registerAndLogin(name, email, password);

	await pool.query(
		`UPDATE users
		 SET role = 'admin'
		 WHERE id = $1`,
		[account.user.id],
	);

	const loginResponse = await request(app)
		.post("/auth/login")
		.send({
			email,
			password,
		})
		.expect(200);

	return {
		user: {
			...account.user,
			role: "admin",
		},
		accessToken: loginResponse.body.accessToken as string,
	};
}

// create a project owned by the authenticated test user
async function createTestProject(
	accessToken: string,
	name = "Test Project",
	description: string | null = "Project used by automated tests",
) {
	const response = await request(app)
		.post("/projects")
		.set("Authorization", `Bearer ${accessToken}`)
		.send({
			name,
			description,
		})
		.expect(201);

	return response.body;
}

// insert a task directly into the test database
async function seedTask(
	projectId: number,
	title = "Create task API",
	description: string | null = "Build the first task endpoint",
	assignedTo: number | null = null,
) {
	const result = await pool.query(
		`INSERT INTO tasks (
		     title,
		     description,
		     project_id,
		     assigned_to
		 )
		 VALUES ($1, $2, $3, $4)
		 RETURNING id,
		           title,
		           description,
		           status,
		           project_id AS "projectId",
		           assigned_to AS "assignedTo"`,
		[title, description, projectId, assignedTo],
	);

	return result.rows[0];
}

describe("checkpoint 2 routes", () => {
	// reset the database before each test
	beforeEach(async () => {
		await pool.query(
			"TRUNCATE tasks, projects, users RESTART IDENTITY CASCADE",
		);
	});

	// close the database pool after the test suite finishes
	afterAll(async () => {
		await pool.end();
	});

	// verify registration and login behavior
	test("POST /auth/register creates a user without returning the password hash", async () => {
		const response = await request(app)
			.post("/auth/register")
			.send({
				name: "Test User",
				email: "test@example.com",
				password: "test-password",
			})
			.expect(201);

		expect(response.body).toEqual(
			expect.objectContaining({
				id: 1,
				name: "Test User",
				email: "test@example.com",
				role: "user",
			}),
		);

		expect(response.body).not.toHaveProperty("passwordHash");
		expect(response.body).not.toHaveProperty("password_hash");

		const result = await pool.query(
			`SELECT password_hash
			 FROM users
			 WHERE id = $1`,
			[response.body.id],
		);

		expect(result.rows[0].password_hash).not.toBe("test-password");
	});

	test("POST /auth/login returns an access token", async () => {
		await request(app)
			.post("/auth/register")
			.send({
				name: "Test User",
				email: "test@example.com",
				password: "test-password",
			})
			.expect(201);

		const response = await request(app)
			.post("/auth/login")
			.send({
				email: "test@example.com",
				password: "test-password",
			})
			.expect(200);

		expect(response.body).toEqual(
			expect.objectContaining({
				accessToken: expect.any(String),
				tokenType: "Bearer",
				expiresIn: "1h",
				user: expect.objectContaining({
					id: 1,
					email: "test@example.com",
					role: "user",
				}),
			}),
		);

		expect(response.body.user).not.toHaveProperty("passwordHash");

		const payload = jwt.decode(response.body.accessToken);

		expect(payload).not.toBeNull();
		expect(payload).not.toHaveProperty("password");
		expect(payload).not.toHaveProperty("passwordHash");
		expect(payload).not.toHaveProperty("password_hash");
	});

	test("POST /auth/login rejects an incorrect password", async () => {
		await request(app)
			.post("/auth/register")
			.send({
				name: "Test User",
				email: "test@example.com",
				password: "test-password",
			})
			.expect(201);

		const response = await request(app)
			.post("/auth/login")
			.send({
				email: "test@example.com",
				password: "wrong-password",
			})
			.expect(401);

		expect(response.body).toEqual({
			error: "Invalid email or password",
		});
	});

	// verify that protected routes require a valid token
	test("GET /tasks rejects a missing token", async () => {
		const response = await request(app)
			.get("/tasks")
			.expect(401);

		expect(response.body).toEqual({
			error: "Authentication required",
		});
	});

	// verify administrator-only access to user information
	test("GET /users rejects a normal user", async () => {
		const account = await registerAndLogin();

		const response = await request(app)
			.get("/users")
			.set("Authorization", `Bearer ${account.accessToken}`)
			.expect(403);

		expect(response.body).toEqual({
			error: "Administrator access required",
		});
	});

	test("GET /users returns users to an administrator without password hashes", async () => {
		const administrator = await registerAndLoginAdmin();

		const response = await request(app)
			.get("/users")
			.set("Authorization", `Bearer ${administrator.accessToken}`)
			.expect(200);

		expect(response.body).toEqual([
			expect.objectContaining({
				id: administrator.user.id,
				name: "Test Administrator",
				email: "admin@example.com",
				role: "admin",
			}),
		]);

		for (const user of response.body) {
			expect(user).not.toHaveProperty("passwordHash");
			expect(user).not.toHaveProperty("password_hash");
		}
	});

	// verify project creation and ownership rules
	test("POST /projects creates a project owned by the authenticated user", async () => {
		const account = await registerAndLogin();

		const response = await request(app)
			.post("/projects")
			.set("Authorization", `Bearer ${account.accessToken}`)
			.send({
				name: "Milestone 4",
				description: "Expand the data model",
			})
			.expect(201);

		expect(response.body).toEqual(
			expect.objectContaining({
				id: 1,
				name: "Milestone 4",
				description: "Expand the data model",
				ownerId: account.user.id,
			}),
		);
	});

	// verify task relationships, validation, and ownership rules
	test("POST /tasks creates a task in a valid project", async () => {
		const account = await registerAndLogin();
		const project = await createTestProject(account.accessToken);

		const response = await request(app)
			.post("/tasks")
			.set("Authorization", `Bearer ${account.accessToken}`)
			.send({
				title: "Write automated tests",
				description: "Cover the milestone routes",
				projectId: project.id,
			})
			.expect(201);

		expect(response.body).toEqual(
			expect.objectContaining({
				id: 1,
				title: "Write automated tests",
				description: "Cover the milestone routes",
				status: "todo",
				projectId: project.id,
				assignedTo: null,
			}),
		);
	});

	test("GET /tasks returns a list", async () => {
		const account = await registerAndLogin();
		const project = await createTestProject(account.accessToken);
		const task = await seedTask(project.id);

		const response = await request(app)
			.get("/tasks")
			.set("Authorization", `Bearer ${account.accessToken}`)
			.expect(200);

		expect(response.body).toEqual([
			expect.objectContaining({
				id: task.id,
				title: "Create task API",
			}),
		]);
	});

	test("GET /tasks/:id returns one task", async () => {
		const account = await registerAndLogin();
		const project = await createTestProject(account.accessToken);
		const task = await seedTask(project.id);

		const response = await request(app)
			.get(`/tasks/${task.id}`)
			.set("Authorization", `Bearer ${account.accessToken}`)
			.expect(200);

		expect(response.body).toEqual(
			expect.objectContaining({
				id: task.id,
				title: "Create task API",
				projectId: project.id,
			}),
		);
	});

	test("POST /tasks rejects a missing title", async () => {
		const account = await registerAndLogin();
		const project = await createTestProject(account.accessToken);

		const response = await request(app)
			.post("/tasks")
			.set("Authorization", `Bearer ${account.accessToken}`)
			.send({
				projectId: project.id,
			})
			.expect(400);

		expect(response.body).toEqual({
			error: "Tasks must have a title",
		});
	});

	test("PATCH /tasks/:id updates a task", async () => {
		const owner = await registerAndLogin();
		const project = await createTestProject(owner.accessToken);
		const task = await seedTask(project.id, "Old title");

		const response = await request(app)
			.patch(`/tasks/${task.id}`)
			.set("Authorization", `Bearer ${owner.accessToken}`)
			.send({
				title: "Updated title",
				status: "done",
			})
			.expect(200);

		expect(response.body).toEqual(
			expect.objectContaining({
				id: task.id,
				title: "Updated title",
				status: "done",
				projectId: project.id,
			}),
		);
	});

	test("PATCH /tasks/:id prevents a non-owner from updating a task", async () => {
		const owner = await registerAndLogin(
			"Project Owner",
			"owner@example.com",
		);
		const project = await createTestProject(owner.accessToken);
		const task = await seedTask(project.id);

		const otherUser = await registerAndLogin(
			"Other User",
			"other@example.com",
		);

		const response = await request(app)
			.patch(`/tasks/${task.id}`)
			.set("Authorization", `Bearer ${otherUser.accessToken}`)
			.send({
				status: "done",
			})
			.expect(403);

		expect(response.body).toEqual({
			error: "You do not have permission to update this task",
		});
	});

	test("DELETE /tasks/:id deletes a task and missing tasks return 404", async () => {
		const owner = await registerAndLogin();
		const project = await createTestProject(owner.accessToken);
		const task = await seedTask(project.id, "Delete this task");

		await request(app)
			.delete(`/tasks/${task.id}`)
			.set("Authorization", `Bearer ${owner.accessToken}`)
			.expect(204);

		const response = await request(app)
			.get(`/tasks/${task.id}`)
			.set("Authorization", `Bearer ${owner.accessToken}`)
			.expect(404);

		expect(response.body).toEqual({
			error: "The specified task was not found",
		});
	});
});
