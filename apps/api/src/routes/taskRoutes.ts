import { Router } from "express";
import {
	createTask,
	deleteTask,
	getAllTasks,
	getTaskById,
	updateTask,
} from "../services/taskService";

export const taskRoutes = Router();

function parseTaskId(id: string): number | null {
	const taskId = Number(id);

	if ( !Number.isInteger(taskId) || taskId <= 0 || taskId > 2147483647) {
		return null;
	}

	return taskId;
}

// route to get all tasks
taskRoutes.get("/tasks", async (_req, res) => {
	// try to fetch all tasks
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
	const { title, description } = req.body ?? {};

	// validation for the task title
	if (typeof title !== "string" || title.trim().length === 0) {
		res.status(400).json({
			error: "Tasks must have a title",
		});
		return;
	}

	// validation for the task description
	if ( description !== undefined && description !== null && typeof description !== "string") {
		res.status(400).json({
			error: "The description must be of type string",
		});
		return;
	}

	// if validation passes try to create the task
	try {
		const task = await createTask({
			title: title.trim(),
			description: description ?? null,
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

	// you can make an update without providing at least one field to update
	if (!hasTitle && !hasDescription && !hasStatus) {
		res.status(400).json({
			error: "Provide title, description, or status to update",
		});
		return;
	}

	const { title, description, status } = body;

	// If a title is present, validate it
	if ( hasTitle && (typeof title !== "string" || title.trim().length === 0)) {
		res.status(400).json({
			error: "Title must be a string",
		});
		return;
	}

	// If a description is present, validate it
	if ( hasDescription && description !== null && typeof description !== "string") {
		res.status(400).json({
			error: "Description must be a string",
		});
		return;
	}

	// If a status is present, validate it
	if ( hasStatus && (typeof status !== "string" || status.trim().length === 0)) {
		res.status(400).json({
			error: "Status must be a string",
		});
		return;
	}

	// try to update the task
	try {
		const task = await updateTask(taskId, {
			title: hasTitle ? title.trim() : undefined,
			description: hasDescription ? description : undefined,
			status: hasStatus ? status.trim() : undefined,
		});

		// If task not found send an error response
		if (task === null) {
			res.status(404).json({
				error: "The specified task was not found",
			});
			return;
		}

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

	// validate task id
	if (taskId === null) {
		res.status(400).json({
			error: "Task ID must be a positive integer",
		});
		return;
	}
	// try to delete the task
	try {
		const deleted = await deleteTask(taskId);

		if (!deleted) {
			res.status(404).json({
				error: "Task not found",
			});
			return;
		}

		res.status(204).send();
	} catch (error) {
		console.error("Failed to delete the specified task:", error);
		res.status(500).json({
			error: "Failed to delete the specified task",
		});
	}
});
