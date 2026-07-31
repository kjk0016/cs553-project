import { pool } from "../db/pool";

export type TaskStatus = "todo" | "in_progress" | "done";

// The task DTO schema
export type Task = {
	id: number;
	title: string;
	description: string | null;
	status: TaskStatus;
	projectId: number;
	assignedTo: number | null;
	createdAt: Date;
	updatedAt: Date;
};

// schema for creating a task
export type CreateTaskInput = {
	title: string;
	description?: string | null;
	projectId: number;
	assignedTo?: number | null;
};

// schema for updating a task
export type UpdateTaskInput = {
	title?: string;
	description?: string | null;
	status?: TaskStatus;
	assignedTo?: number | null;
};

// list the task fields returned by database queries
const taskFields = `id,
                   title,
                   description,
                   status,
                   project_id AS "projectId",
                   assigned_to AS "assignedTo",
                   created_at AS "createdAt",
                   updated_at AS "updatedAt"`;

// return all tasks (promise to eventually return all of the tasks in the db)
export async function getAllTasks(): Promise<Task[]> {
	const result = await pool.query<Task>(
		`SELECT ${taskFields}
		 FROM tasks
		 ORDER BY id`,
	);

	return result.rows;
}

// return the specified task (promise to eventually return the specified task)
export async function getTaskById(id: number): Promise<Task | null> {
	const result = await pool.query<Task>(
		`SELECT ${taskFields}
		 FROM tasks
		 WHERE id = $1`,
		[id],
	);

	return result.rows[0] ?? null;
}

// create task (promise to ......)
export async function createTask(input: CreateTaskInput): Promise<Task> {
	const result = await pool.query<Task>(
		`INSERT INTO tasks (
		     title,
		     description,
		     project_id,
		     assigned_to
		 )
		 VALUES ($1, $2, $3, $4)
		 RETURNING ${taskFields}`,
		[
			input.title,
			input.description ?? null,
			input.projectId,
			input.assignedTo ?? null,
		],
	);

	return result.rows[0];
}

// update a task
export async function updateTask(
	id: number,
	input: UpdateTaskInput,
): Promise<Task | null> {
	const result = await pool.query<Task>(
		`UPDATE tasks
		 SET title = CASE WHEN $1::boolean THEN $2::text ELSE title END,
		     description = CASE WHEN $3::boolean THEN $4::text ELSE description END,
		     status = CASE WHEN $5::boolean THEN $6::text ELSE status END,
		     assigned_to = CASE WHEN $7::boolean THEN $8::integer ELSE assigned_to END,
		     updated_at = NOW()
		 WHERE id = $9
		 RETURNING ${taskFields}`,
		[
			input.title !== undefined,
			input.title ?? null,
			Object.prototype.hasOwnProperty.call(input, "description"),
			input.description ?? null,
			input.status !== undefined,
			input.status ?? null,
			Object.prototype.hasOwnProperty.call(input, "assignedTo"),
			input.assignedTo ?? null,
			id,
		],
	);

	return result.rows[0] ?? null;
}

// delete a task
export async function deleteTask(id: number): Promise<boolean> {
	const result = await pool.query(
		`DELETE FROM tasks
		 WHERE id = $1
		 RETURNING id`,
		[id],
	);

	return result.rows.length > 0;
}
