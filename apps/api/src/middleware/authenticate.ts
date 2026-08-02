import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UserRole } from "../services/userService";

// describe the user information stored after authentication
export type AuthenticatedUser = {
	id: number;
	email: string;
	role: UserRole;
};

// verify the bearer token before allowing access to protected routes
export function authenticate(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const authorization = req.get("authorization");

	// require the Authorization header to use the Bearer format
	if (!authorization?.startsWith("Bearer ")) {
		res.status(401).json({
			error: "Authentication required",
		});
		return;
	}

	const token = authorization.slice("Bearer ".length);

	// verify the token and make its user information available to later routes
	try {
		const payload = jwt.verify(token, env.jwtSecret) as {
			sub: string;
			email: string;
			role: UserRole;
		};

		res.locals.user = {
			id: Number(payload.sub),
			email: payload.email,
			role: payload.role,
		} satisfies AuthenticatedUser;

		next();
	} catch {
		res.status(401).json({
			error: "Authentication required",
		});
	}
}
