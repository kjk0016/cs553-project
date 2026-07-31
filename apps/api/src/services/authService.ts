import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import {
	createUser,
	getUserByEmail,
	type User,
	type UserWithPassword,
} from "./userService";

export type RegisterInput = {
	name: string;
	email: string;
	password: string;
};

export type LoginResult = {
	accessToken: string;
	tokenType: "Bearer";
	expiresIn: string;
	user: User;
};

// configure the access token lifetime and signing algorithm
const jwtExpiresIn = "1h";

const jwtOptions: SignOptions = {
	algorithm: "HS256",
	expiresIn: jwtExpiresIn,
};

// register a new user after hashing their password
export async function registerUser(input: RegisterInput): Promise<User> {
	const passwordHash = await bcrypt.hash(input.password, 10);

	return createUser({
		name: input.name,
		email: input.email.toLowerCase(),
		passwordHash,
	});
}

// verify a users credentials and create their access token
export async function loginUser(
	email: string,
	password: string,
): Promise<LoginResult | null> {
	const user = await getUserByEmail(email);

	if (user === null) {
		return null;
	}

	const passwordMatches = await bcrypt.compare(
		password,
		user.passwordHash,
	);

	if (!passwordMatches) {
		return null;
	}

	const accessToken = jwt.sign(
		{
			email: user.email,
			role: user.role,
		},
		env.jwtSecret,
		{
			...jwtOptions,
			subject: String(user.id),
		},
	);

	return {
		accessToken,
		tokenType: "Bearer",
		expiresIn: jwtExpiresIn,
		user: removePasswordHash(user),
	};
}

// create a user response that never includes the password hash
function removePasswordHash(user: UserWithPassword): User {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		createdAt: user.createdAt,
	};
}
