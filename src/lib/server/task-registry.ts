/**
 * Task Registry Service
 * In-memory task tracking (should be replaced with database in production)
 */

import type { Task, TaskStatus } from '$lib/types/models';

class TaskRegistry {
	private tasks: Map<string, Task> = new Map();

	/**
	 * Register a new task
	 */
	register(task: Task): void {
		this.tasks.set(task.id, task);
	}

	/**
	 * Get a task by ID
	 */
	get(taskId: string): Task | undefined {
		return this.tasks.get(taskId);
	}

	/**
	 * Update task status
	 */
	updateStatus(
		taskId: string,
		status: TaskStatus,
		progress?: number,
		errorDetails?: { code: string; message: string; stack?: string }
	): boolean {
		return this.update(taskId, {
			status,
			progress,
			error: errorDetails
		});
	}

	/**
	 * Update task fields (status, progress, stage, eta, result, error)
	 */
	update(
		taskId: string,
		updates: Partial<
			Pick<Task, 'status' | 'progress' | 'stage' | 'eta' | 'result' | 'error' | 'startedAt' | 'completedAt'>
		>
	): boolean {
		const task = this.tasks.get(taskId);
		if (!task) return false;

		if (updates.status) {
			task.status = updates.status;
			if (updates.status === 'running' && !task.startedAt) {
				task.startedAt = new Date();
			}
			if (updates.status === 'succeeded' || updates.status === 'failed' || updates.status === 'cancelled') {
				task.completedAt = updates.completedAt ?? new Date();
			}
		}

		if (updates.progress !== undefined) {
			task.progress = updates.progress;
		}

		if (updates.stage !== undefined) {
			task.stage = updates.stage;
		}

		if (updates.eta !== undefined) {
			task.eta = updates.eta;
		}

		if (updates.result !== undefined) {
			task.result = updates.result;
		}

		if (updates.error !== undefined) {
			task.error = updates.error;
		}

		return true;
	}

	cancel(taskId: string): boolean {
		const task = this.tasks.get(taskId);
		if (!task) return false;

		if (task.status === 'succeeded' || task.status === 'failed' || task.status === 'cancelled') {
			return true;
		}

		task.status = 'cancelled';
		task.stage = 'pipeline.stage.cancelled';
		task.completedAt = new Date();
		return true;
	}

	isCancelled(taskId: string): boolean {
		return this.tasks.get(taskId)?.status === 'cancelled';
	}

	/**
	 * List tasks for a session
	 */
	listBySession(sessionId: string): Task[] {
		return Array.from(this.tasks.values()).filter((task) => task.sessionId === sessionId);
	}

	/**
	 * Delete a task
	 */
	delete(taskId: string): boolean {
		return this.tasks.delete(taskId);
	}

	/**
	 * Cleanup tasks for a session by deleting all task records
	 */
	cleanupSession(sessionId: string): void {
		const toDelete = Array.from(this.tasks.entries())
			// Filter tasks belonging to session (ignore taskId key)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			.filter(([_taskId, task]) => task.sessionId === sessionId)
			.map(([id]) => id);

		toDelete.forEach((id) => this.tasks.delete(id));
	}

	/**
	 * Get total task count (for debugging)
	 */
	size(): number {
		return this.tasks.size;
	}
}

export const taskRegistry = new TaskRegistry();
