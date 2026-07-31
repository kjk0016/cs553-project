import { Router } from "express";
import { canManageProject } from "../middleware/authorize";
import {
	authenticate,
	type AuthenticatedUser,
} from "../middleware/authenticate";
import { getProjectById } from "../services/projectService";
import {
	createTask,
	deleteTask,
	getAllTasks,
	getTaskById,
	updateTask,
	type TaskStatus,
} from "../services/taskService";
import { getUserById } from "../services/userService";

export const taskRoutes = Router();

// protect every task route with authentication
taskRoutes.use(authenticate);

// convert a route parameter into a valid task ID
function parseTaskId(id: string): number | null {
	const taskId = Number(id);

	if (
		!Number.isInteger(taskId) ||
		taskId <= 0 ||
		taskId > 2147483647
	) {
		return null;
	}

	return taskId;
}

// validate IDs provided in a request body
function parseBodyId(value: unknown): number | null {
	if (
		typeof value !== "number" ||
		!Number.isInteger(value) ||
		value <= 0 ||
		value > 2147483647
	) {
		return null;
	}

	return value;
}

// check that a task status is one of the allowed values
function isTaskStatus(status: unknown): status is TaskStatus {
	return (
		status === "todo" ||
		status === "in_progress" ||
		status === "done"
	);
}

// route to get all tasks
taskRoutes.get("/tasks", async (_req, res) => {
	try {
		const tasks = await getAllTasks();
		res.json(tasks);
	
	// If we fail to get all tasks send an error response	
	} catch (error) {
		console.error("Failed to get all tasks:", error);
		res.status(500).json({
			error: "Failed to get all tasks",
		});
	}
});

// route to get a specific task
taskRoutes.get("/tasks/:id", async (req, res) => {
	const taskId = parseTaskId(req.params.id);

	// if the task id is invalid throw an error resonse
	if (taskId === null) {
		res.status(400).json({
			error: "Task ID must be a positive integer",
		});
		return;
	}

	// try to get the specified task
	try {
		const task = await getTaskById(taskId);
		// fi the task can't be found, send error response
		if (task === null) {
			res.status(404).json({
				error: "The specified task was not found",
			});
			return;
		}
		// send successful response
		res.json(task);

	} catch (error) {
		console.error("Failed to get the specified task:", error);
		res.status(500).json({
			error: "Failed to get the specified task",
		});
	}
});

// route to create a task
taskRoutes.post("/tasks", async (req, res) => {
	const {
		title,
		description,
		projectId: projectIdValue,
		assignedTo: assignedToValue,
	} = req.body ?? {};

	const user = res.locals.user as AuthenticatedUser;
	const projectId = parseBodyId(projectIdValue);

	// validation for the task title
	if (typeof title !== "string" || title.trim().length === 0) {
		res.status(400).json({
			error: "Tasks must have a title",
		});
		return;
	}

	// validation for the task description
	if (description !== undefined && description !== null && typeof description !== "string") {
		res.status(400).json({
			error: "The description must be of type string",
		});
		return;
	}

	// validaton for the project ID
	if (projectId === null) {
		res.status(400).json({
			error: "A valid project ID is required",
		});
		return;
	}

	const assignedTo =
		assignedToValue === undefined || assignedToValue === null
			? assignedToValue
			: parseBodyId(assignedToValue);

	if (assignedToValue !== undefined && assignedToValue !== null && assignedTo === null) {
		res.status(400).json({
			error: "Assigned user ID must be a positive integer or null",
		});
		return;
	}
	// if validation passes try to create the task
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
				error: "You do not have permission to add tasks to this project",
			});
			return;
		}

		if (typeof assignedTo === "number") {
			const assignedUser = await getUserById(assignedTo);

			if (assignedUser === null) {
				res.status(404).json({
					error: "The assigned user was not found",
				});
				return;
			}
		}

		const task = await createTask({
			title: title.trim(),
			description: description ?? null,
			projectId,
			assignedTo: assignedTo ?? null,
		});

		res.status(201).json(task);

	// if a failure to create the task occurs, send an error response.
	} catch (error) {
		console.error("Failed to create the task:", error);
		res.status(500).json({
			error: "Failed to create the task",
		});
	}
});

// route to update a task
taskRoutes.patch("/tasks/:id", async (req, res) => {
	const taskId = parseTaskId(req.params.id);
	const user = res.locals.user as AuthenticatedUser;

	// validation for the specified task
	if (taskId === null) {
		res.status(400).json({
			error: "Task ID must be a positive integer",
		});
		return;
	}

	// determining which fields are present in the request, to see what needs to be updated
	const body = req.body ?? {};
	const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
	const hasDescription = Object.prototype.hasOwnProperty.call(
		body,
		"description",
	);
	const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
	const hasAssignedTo = Object.prototype.hasOwnProperty.call(
		body,
		"assignedTo",
	);

	// you can make an update without providing at least one field to update
	if (!hasTitle && !hasDescription && !hasStatus && !hasAssignedTo) {
		res.status(400).json({
			error: "Provide title, description, status, or assignedTo to update",
		});
		return;
	}

	const { title, description, status, assignedTo: assignedToValue } = body;

	// If a title is present, validate it
	if (hasTitle &&	(typeof title !== "string" || title.trim().length === 0)) {
		res.status(400).json({
			error: "Title must be a string",
		});
		return;
	}
	// If a description is present, validate it
	if (hasDescription && description !== null && typeof description !== "string") {
		res.status(400).json({
			error: "Description must be a string or null",
		});
		return;
	}

	// If a status is present, validate it
	if (hasStatus && !isTaskStatus(status)) {
		res.status(400).json({
			error: "Status must be todo, in_progress, or done",
		});
		return;
	}

	const assignedTo =
		assignedToValue === null
			? null
			: parseBodyId(assignedToValue);

	if (hasAssignedTo && assignedToValue !== null && assignedTo === null) {
		res.status(400).json({
			error: "Assigned user ID must be a positive integer or null",
		});
		return;
	}

	// try to update the task
	try {
		const existingTask = await getTaskById(taskId);

		if (existingTask === null) {
			res.status(404).json({
				error: "The specified task was not found",
			});
			return;
		}

		const project = await getProjectById(existingTask.projectId);

		if (project === null) {
			res.status(404).json({
				error: "The task's project was not found",
			});
			return;
		}

		if (!canManageProject(user, project.ownerId)) {
			res.status(403).json({
				error: "You do not have permission to update this task",
			});
			return;
		}

		if (hasAssignedTo && typeof assignedTo === "number") {
			const assignedUser = await getUserById(assignedTo);

			if (assignedUser === null) {
				res.status(404).json({
					error: "The assigned user was not found",
				});
				return;
			}
		}

		const task = await updateTask(taskId, {
			title: hasTitle ? title.trim() : undefined,
			description: hasDescription ? description : undefined,
			status: hasStatus ? status : undefined,
			assignedTo: hasAssignedTo ? assignedTo : undefined,
		});

		res.json(task);
	} catch (error) {
		console.error("Failed to update task:", error);
		res.status(500).json({
			error: "Failed to update task",
		});
	}
});

// route to delete a task
taskRoutes.delete("/tasks/:id", async (req, res) => {
	const taskId = parseTaskId(req.params.id);
	const user = res.locals.user as AuthenticatedUser;

	// validate task id
	if (taskId === null) {
		res.status(400).json({
			error: "Task ID must be a positive integer",
		});
		return;
	}
	// try to delete the task
	try {
		const task = await getTaskById(taskId);

		if (task === null) {
			res.status(404).json({
				error: "The specified task was not found",
			});
			return;
		}

		const project = await getProjectById(task.projectId);

		if (project === null) {
			res.status(404).json({
				error: "The task's project was not found",
			});
			return;
		}

		if (!canManageProject(user, project.ownerId)) {
			res.status(403).json({
				error: "You do not have permission to delete this task",
			});
			return;
		}

		await deleteTask(taskId);
		res.status(204).send();
	} catch (error) {
		console.error("Failed to delete the specified task:", error);
		res.status(500).json({
			error: "Failed to delete the specified task",
		});
	}
});
