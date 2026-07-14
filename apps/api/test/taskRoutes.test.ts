import { afterAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import { pool } from "../src/db/pool";
import { createApp } from "../src/server";

const app = createApp();

async function seedTask(
	title = "Create task API",
	description: string | null = "Build the first task endpoint",
) {
	const result = await pool.query(
		`INSERT INTO tasks (title, description)
		 VALUES ($1, $2)
		 RETURNING id, title, description, status`,
		[title, description],
	);

	return result.rows[0];
}

describe("task API", () => {
	beforeEach(async () => {
		await pool.query("TRUNCATE tasks RESTART IDENTITY");
	});

	afterAll(async () => {
		await pool.end();
	});

	test("GET /tasks returns a list", async () => {
		const task = await seedTask();

		const response = await request(app).get("/tasks").expect(200);

		expect(response.body).toEqual([
			expect.objectContaining({
				id: task.id,
				title: "Create task API",
				description: "Build the first task endpoint",
				status: "todo",
			}),
		]);
	});

	test("POST /tasks creates a task", async () => {
		const response = await request(app)
			.post("/tasks")
			.send({
				title: "Write automated tests",
				description: "Cover required task routes",
			})
			.expect(201);

		expect(response.body).toEqual(
			expect.objectContaining({
				id: 1,
				title: "Write automated tests",
				description: "Cover required task routes",
				status: "todo",
			}),
		);
	});

	test("GET /tasks/:id returns one task", async () => {
		const task = await seedTask("Fetch one task");

		const response = await request(app).get(`/tasks/${task.id}`).expect(200);

		expect(response.body).toEqual(
			expect.objectContaining({
				id: task.id,
				title: "Fetch one task",
				status: "todo",
			}),
		);
	});

	test("PATCH /tasks/:id updates a task", async () => {
		const task = await seedTask("Old title");

		const response = await request(app)
			.patch(`/tasks/${task.id}`)
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
			}),
		);
	});

	test("DELETE /tasks/:id deletes a task", async () => {
		const task = await seedTask("Delete this task");

		await request(app).delete(`/tasks/${task.id}`).expect(204);

		const response = await request(app).get(`/tasks/${task.id}`).expect(404);

		expect(response.body).toEqual({ error: "Task not found" });
	});

	test("missing tasks return 404", async () => {
		const response = await request(app).get("/tasks/999").expect(404);

		expect(response.body).toEqual({ error: "Task not found" });
	});

	test("POST /tasks rejects a missing title", async () => {
		const response = await request(app)
			.post("/tasks")
			.send({ description: "No title here" })
			.expect(400);

		expect(response.body).toEqual({ error: "Title is required" });
	});
});
