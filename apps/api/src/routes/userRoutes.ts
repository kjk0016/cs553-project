import { Router } from "express";
import { requireRole } from "../middleware/authorize";
import { authenticate } from "../middleware/authenticate";
import { getAllUsers } from "../services/userService";

export const userRoutes = Router();

// protect every user route with authentication
userRoutes.use(authenticate);

// route for administrators to get all users
userRoutes.get("/users", requireRole("admin"), async (_req, res) => {
	try {
		const users = await getAllUsers();
		res.json(users);
	} catch (error) {
		console.error("Failed to get all users:", error);
		res.status(500).json({
			error: "Failed to get all users",
		});
	}
});
