import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedUser } from "./authenticate";
import type { UserRole } from "../services/userService";

// require the authenticated user to have one of the specified roles
export function requireRole(...roles: UserRole[]) {
	return (_req: Request, res: Response, next: NextFunction) => {
		const user = res.locals.user as AuthenticatedUser | undefined;

		if (!user) {
			res.status(401).json({
				error: "Authentication required",
			});
			return;
		}

		if (!roles.includes(user.role)) {
			res.status(403).json({
				error: "Administrator access required",
			});
			return;
		}

		next();
	};
}

// project owners and administrators may modify project resources
export function canManageProject(
	user: AuthenticatedUser,
	projectOwnerId: number,
): boolean {
	return user.role === "admin" || user.id === projectOwnerId;
}
