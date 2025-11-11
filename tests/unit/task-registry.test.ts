import { describe, expect, it } from 'vitest';
import { taskRegistry } from '$lib/server/task-registry';
import type { Task } from '$lib/types/models';

function buildTask(id: string, overrides: Partial<Task> = {}): Task {
	return {
		id,
		sessionId: overrides.sessionId ?? 'session-test',
		type: overrides.type ?? 'process',
		status: overrides.status ?? 'pending',
		progress: overrides.progress ?? 0,
		stage: overrides.stage,
		createdAt: overrides.createdAt ?? new Date(),
		startedAt: overrides.startedAt,
		completedAt: overrides.completedAt,
		eta: overrides.eta,
		result: overrides.result,
		error: overrides.error,
		fileId: overrides.fileId
	};
}

describe('Task Registry cancellation', () => {
	it('marks running task as cancelled and updates stage', () => {
		const task = buildTask('task-cancel-1', { status: 'running', progress: 40, stage: 'pipeline.stage.office_to_pdf' });
		taskRegistry.register(task);

		const cancelled = taskRegistry.cancel(task.id);
		expect(cancelled).toBe(true);

		const updated = taskRegistry.get(task.id);
		expect(updated).toBeDefined();
		expect(updated?.status).toBe('cancelled');
		expect(updated?.stage).toBe('pipeline.stage.cancelled');
		expect(updated?.completedAt).toBeInstanceOf(Date);
		expect(taskRegistry.isCancelled(task.id)).toBe(true);

		taskRegistry.delete(task.id);
	});

	it('treats cancellation as idempotent for completed tasks', () => {
		const completedAt = new Date();
		const task = buildTask('task-cancel-2', {
			status: 'succeeded',
			progress: 100,
			stage: 'pipeline.stage.completed',
			completedAt
		});
		taskRegistry.register(task);

		const cancelled = taskRegistry.cancel(task.id);
		expect(cancelled).toBe(true);

		const updated = taskRegistry.get(task.id);
		expect(updated).toBeDefined();
		expect(updated?.status).toBe('succeeded');
		expect(updated?.stage).toBe('pipeline.stage.completed');
		expect(updated?.completedAt).toEqual(completedAt);
		expect(taskRegistry.isCancelled(task.id)).toBe(false);

		taskRegistry.delete(task.id);
	});
});
