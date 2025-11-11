import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSuccessResponse, createErrorResponse } from '$lib/utils/api';
import { logger } from '$lib/services/logger.service';
import { taskRegistry } from '$lib/server/task-registry';

function serializeTask(task: import('$lib/types/models').Task) {
	return {
		id: task.id,
		sessionId: task.sessionId,
		fileId: task.fileId,
		type: task.type,
		status: task.status,
		stage: task.stage,
		progress: task.progress,
		createdAt: task.createdAt.toISOString(),
		startedAt: task.startedAt?.toISOString(),
		completedAt: task.completedAt?.toISOString(),
		eta: task.eta?.toISOString(),
		result: task.result,
		error: task.error
	};
}

export const POST: RequestHandler = async ({ params, locals }) => {
	const traceId = locals.traceId;
	const language = locals.preferredLanguage;
	const taskId = params.id;

	if (!taskId) {
		return json(
			createErrorResponse('VALIDATION_ERROR', 'errors.validation_failed', traceId, undefined, language),
			{ status: 400 }
		);
	}

	const task = taskRegistry.get(taskId);

	if (!task) {
		logger.warn('Task cancel request failed: task not found', 'task.cancel.not_found', { taskId }, traceId);
		return json(
			createErrorResponse('TASK_NOT_FOUND', 'errors.not_found', traceId, undefined, language),
			{ status: 404 }
		);
	}

	if (task.status === 'succeeded' || task.status === 'failed' || task.status === 'cancelled') {
		return json(
			createSuccessResponse('task_cancel_success', traceId, { task: serializeTask(task) }, language),
			{ status: 200 }
		);
	}

	taskRegistry.cancel(taskId);
	const updatedTask = taskRegistry.get(taskId)!;

	logger.logEvent(
		'task.cancelled',
		'Task cancelled by user',
		{
			taskId,
			sessionId: updatedTask.sessionId,
			fileId: updatedTask.fileId
		},
		traceId
	);

	return json(
		createSuccessResponse('task_cancel_success', traceId, { task: serializeTask(updatedTask) }, language),
		{ status: 200 }
	);
};
