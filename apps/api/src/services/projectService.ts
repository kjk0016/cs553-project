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
