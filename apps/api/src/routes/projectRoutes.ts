import { Router } from "express";
import { canManageProject } from "../middleware/authorize";
import {
	authenticate,
	type AuthenticatedUser,
} from "../middleware/authenticate";
import {
	createProject,
	deleteProject,
	getAllProjects,
	getProjectById,
	updateProject,
} from "../services/projectService";

export const projectRoutes = Router();

// protect every project route with authentication
projectRoutes.use(authenticate);

// convert a route parameter into a valid project ID
function parseProjectId(id: string): number | null {
	const projectId = Number(id);

	if (!Number.isInteger(projectId) || projectId <= 0 || projectId > 2147483647) {
		return null;
	}

	return projectId;
}

// route to get all projects
projectRoutes.get("/projects", async (_req, res) => {
	try {
		const projects = await getAllProjects();
		res.json(projects);
	} catch (error) {
		console.error("Failed to get all projects:", error);
		res.status(500).json({
			error: "Failed to get all projects",
		});
	}
});

// route to get a specific project
projectRoutes.get("/projects/:id", async (req, res) => {
	const projectId = parseProjectId(req.params.id);

	if (projectId === null) {
		res.status(400).json({
			error: "Project ID must be a positive integer",
		});
		return;
	}

	try {
		const project = await getProjectById(projectId);

		if (project === null) {
			res.status(404).json({
				error: "The specified project was not found",
			});
			return;
		}

		res.json(project);
	} catch (error) {
		console.error("Failed to get the specified project:", error);
		res.status(500).json({
			error: "Failed to get the specified project",
		});
	}
});

// route to create a project
projectRoutes.post("/projects", async (req, res) => {
	const { name, description } = req.body ?? {};
	const user = res.locals.user as AuthenticatedUser;

	if (typeof name !== "string" || name.trim().length === 0) {
		res.status(400).json({
			error: "Projects must have a name",
		});
		return;
	}

	if (description !== undefined && description !== null && typeof description !== "string") {
		res.status(400).json({
			error: "The description must be of type string",
		});
		return;
	}

	try {
		const project = await createProject({
			name: name.trim(),
			description: description ?? null,
			ownerId: user.id,
		});

		res.status(201).json(project);
	} catch (error) {
		console.error("Failed to create project:", error);
		res.status(500).json({
			error: "Failed to create project",
		});
	}
});

// route to update a project
projectRoutes.patch("/projects/:id", async (req, res) => {
	const projectId = parseProjectId(req.params.id);
	const user = res.locals.user as AuthenticatedUser;

	if (projectId === null) {
		res.status(400).json({
			error: "Project ID must be a positive integer",
		});
		return;
	}

	const body = req.body ?? {};
	const hasName = Object.prototype.hasOwnProperty.call(body, "name");
	const hasDescription = Object.prototype.hasOwnProperty.call(
		body,
		"description",
	);

	if (!hasName && !hasDescription) {
		res.status(400).json({
			error: "Provide name or description to update",
		});
		return;
	}

	const { name, description } = body;

	if (
		hasName &&
		(typeof name !== "string" || name.trim().length === 0)
	) {
		res.status(400).json({
			error: "Name must be a string",
		});
		return;
	}

	if (hasDescription && description !== null && typeof description !== "string") {
		res.status(400).json({
			error: "Description must be a string or null",
		});
		return;
	}

	try {
		const existingProject = await getProjectById(projectId);

		if (existingProject === null) {
			res.status(404).json({
				error: "The specified project was not found",
			});
			return;
		}

		if (!canManageProject(user, existingProject.ownerId)) {
			res.status(403).json({
				error: "You do not have permission to update this project",
			});
			return;
		}

		const project = await updateProject(projectId, {
			name: hasName ? name.trim() : undefined,
			description: hasDescription ? description : undefined,
		});

		res.json(project);
	} catch (error) {
		console.error("Failed to update project:", error);
		res.status(500).json({
			error: "Failed to update project",
		});
	}
});

// route to delete a project
projectRoutes.delete("/projects/:id", async (req, res) => {
	const projectId = parseProjectId(req.params.id);
	const user = res.locals.user as AuthenticatedUser;

	if (projectId === null) {
		res.status(400).json({
			error: "Project ID must be a positive integer",
		});
		return;
	}

	try {
		const project = await getProjectById(projectId);

		if (project === null) {
			res.status(404).json({
				error: "The specified project was not found",
			});
			return;
		}

		if (!canManageProject(user, project.ownerId)) {
			res.status(403).json({
				error: "You do not have permission to delete this project",
			});
			return;
		}

		await deleteProject(projectId);
		res.status(204).send();
	} catch (error) {
		console.error("Failed to delete project:", error);
		res.status(500).json({
			error: "Failed to delete project",
		});
	}
});
