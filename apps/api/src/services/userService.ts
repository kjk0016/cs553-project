import { pool } from "../db/pool";

export type UserRole = "user" | "admin";

// The public user DTO schema
export type User = {
	id: number;
	name: string;
	email: string;
	role: UserRole;
	createdAt: Date;
};

// Internal user schema that includes the password hash
export type UserWithPassword = User & {
	passwordHash: string;
};

// schema for creating a user
export type CreateUserInput = {
	name: string;
	email: string;
	passwordHash: string;
};

// list the public user fields returned by database queries
const userFields = `id,
                   name,
                   email,
                   role,
                   created_at AS "createdAt"`;

// return all users without returning password hashes
export async function getAllUsers(): Promise<User[]> {
	const result = await pool.query<User>(
		`SELECT ${userFields}
		 FROM users
		 ORDER BY id`,
	);

	return result.rows;
}

// return a user by email, including the password hash for login
export async function getUserByEmail(
	email: string,
): Promise<UserWithPassword | null> {
	const result = await pool.query<UserWithPassword>(
		`SELECT ${userFields},
		        password_hash AS "passwordHash"
		 FROM users
		 WHERE LOWER(email) = LOWER($1)`,
		[email],
	);

	return result.rows[0] ?? null;
}

// return a user by id without returning the password hash
export async function getUserById(id: number): Promise<User | null> {
	const result = await pool.query<User>(
		`SELECT ${userFields}
		 FROM users
		 WHERE id = $1`,
		[id],
	);

	return result.rows[0] ?? null;
}

// create a normal user account
export async function createUser(input: CreateUserInput): Promise<User> {
	const result = await pool.query<User>(
		`INSERT INTO users (name, email, password_hash, role)
		 VALUES ($1, $2, $3, 'user')
		 RETURNING ${userFields}`,
		[input.name, input.email, input.passwordHash],
	);

	return result.rows[0];
}
