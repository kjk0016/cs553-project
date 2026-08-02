import { Router } from "express";
import { loginUser, registerUser } from "../services/authService";

export const authRoutes = Router();

// identify duplicate email errors returned by PostgreSQL
function isDuplicateEmailError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "23505"
	);
}

// route to register a new user
authRoutes.post("/auth/register", async (req, res) => {
	const { name, email, password } = req.body ?? {};

	// validate the user's name
	if (typeof name !== "string" || name.trim().length === 0) {
		res.status(400).json({
			error: "Name is required",
		});
		return;
	}

	// validate the user's email
	if (typeof email !== "string" || email.trim().length === 0 || !email.includes("@")) {
		res.status(400).json({
			error: "A valid email is required",
		});
		return;
	}

	// validate the user's password
	if (typeof password !== "string" || password.length === 0) {
		res.status(400).json({
			error: "Password is required",
		});
		return;
	}

	// try to register the user
	try {
		const user = await registerUser({
			name: name.trim(),
			email: email.trim().toLowerCase(),
			password,
		});

		res.status(201).json(user);
	} catch (error) {
		if (isDuplicateEmailError(error)) {
			res.status(409).json({
				error: "A user with that email already exists",
			});
			return;
		}

		console.error("Failed to register user:", error);
		res.status(500).json({
			error: "Failed to register user",
		});
	}
});

// route to log in an existing user
authRoutes.post("/auth/login", async (req, res) => {
	const { email, password } = req.body ?? {};

	// validate the login fields
	if (typeof email !== "string" || email.trim().length === 0 || typeof password !== "string" || password.length === 0) {
		res.status(400).json({
			error: "Email and password are required",
		});
		return;
	}

	// try to authenticate the user
	try {
		const login = await loginUser(
			email.trim().toLowerCase(),
			password,
		);

		if (login === null) {
			res.status(401).json({
				error: "Invalid email or password",
			});
			return;
		}

		res.json(login);
	} catch (error) {
		console.error("Failed to log in user:", error);
		res.status(500).json({
			error: "Failed to log in user",
		});
	}
});

