import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { authRoutes } from "./routes/authRoutes";
import { projectRoutes } from "./routes/projectRoutes";
import { taskRoutes } from "./routes/taskRoutes";
import { userRoutes } from "./routes/userRoutes";

export function createApp() {
	// create the Express application and enable JSON request bodies
	const app = express();

	app.use(express.json());

	// return the current API health status
	app.get("/health", (_req, res) => {
		res.json({
			status: "ok",
			service: "cs553-api",
		});
	});

	// verify that the API can connect to PostgreSQL
	app.get("/db-health", async (_req, res) => {
		try {
			const result = await pool.query("SELECT NOW() AS current_time");
			res.json({
				status: "ok",
				database: "connected",
				currentTime: result.rows[0].current_time,
			});
		} catch (error) {
			console.error("Database health check failed:", error);
			res.status(500).json({
				status: "error",
				database: "disconnected",
			});
		}
	});

	// register the API route groups
	app.use(authRoutes);
	app.use(userRoutes);
	app.use(projectRoutes);
	app.use(taskRoutes);

	// return a JSON response for unknown routes
	app.use((_req, res) => {
		res.status(404).json({
			error: "Route not found",
		});
	});

	// return JSON when Express rejects malformed request data
	app.use(
		(
			error: unknown,
			_req: Request,
			res: Response,
			_next: NextFunction,
		) => {
			const isInvalidJson =
				error instanceof SyntaxError &&
				typeof error === "object" &&
				error !== null &&
				"status" in error &&
				error.status === 400;

			if (isInvalidJson) {
				res.status(400).json({
					error: "Request body must contain valid JSON",
				});
				return;
			}

			console.error("Unexpected server error:", error);
			res.status(500).json({
				error: "Internal server error",
			});
		},
	);

	return app;
}

// start the server when this file is run directly
if (require.main === module) {
	const app = createApp();

	app.listen(env.port, () => {
		console.log(`Server running at http://localhost:${env.port}`);
	});
}
