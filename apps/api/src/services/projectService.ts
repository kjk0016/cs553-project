import { pool } from "../db/pool";

// The project DTO schema
export type Project = {
	id: number;
	name: string;
	description: string | null;
	ownerId: number;
	createdAt: Date;
};

// schema for creating a project
export type CreateProjectInput = {
	name: string;
	description?: string | null;
	ownerId: number;
};

// schema for updating a project
export type UpdateProjectInput = {
	name?: string;
	description?: string | null;
};

// list the project fields returned by database queries
const projectFields = `id,
                      name,
                      description,
                      owner_id AS "ownerId",
                      created_at AS "createdAt"`;

// return all projects
export async function getAllProjects(): Promise<Project[]> {
	const result = await pool.query<Project>(
		`SELECT ${projectFields}
		 FROM projects
		 ORDER BY id`,
	);

	return result.rows;
}

// return the specified project
export async function getProjectById(
	id: number,
): Promise<Project | null> {
	const result = await pool.query<Project>(
		`SELECT ${projectFields}
		 FROM projects
		 WHERE id = $1`,
		[id],
	);

	return result.rows[0] ?? null;
}

// create a project
export async function createProject(
	input: CreateProjectInput,
): Promise<Project> {
	const result = await pool.query<Project>(
		`INSERT INTO projects (name, description, owner_id)
		 VALUES ($1, $2, $3)
		 RETURNING ${projectFields}`,
		[input.name, input.description ?? null, input.ownerId],
	);

	return result.rows[0];
}

// update a project
export async function updateProject(
	id: number,
	input: UpdateProjectInput,
): Promise<Project | null> {
	const result = await pool.query<Project>(
		`UPDATE projects
		 SET name = CASE WHEN $1::boolean THEN $2::text ELSE name END,
		     description = CASE WHEN $3::boolean THEN $4::text ELSE description END
		 WHERE id = $5
		 RETURNING ${projectFields}`,
		[
			input.name !== undefined,
			input.name ?? null,
			Object.prototype.hasOwnProperty.call(input, "description"),
			input.description ?? null,
			id,
		],
	);

	return result.rows[0] ?? null;
}

// delete a project
export async function deleteProject(id: number): Promise<boolean> {
	const result = await pool.query(
		`DELETE FROM projects
		 WHERE id = $1
		 RETURNING id`,
		[id],
	);

	return result.rows.length > 0;
}
