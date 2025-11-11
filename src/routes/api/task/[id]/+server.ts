/**
 * Task Query API Endpoint
 * Returns task status and progress by task ID
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSuccessResponse, createErrorResponse } from '$lib/utils/api';
import { logger } from '$lib/services/logger.service';
import { taskRegistry } from '$lib/server/task-registry';

/**
 * GET /api/task/:id
 * Retrieve task status and progress
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const traceId = locals.traceId;
	const language = locals.preferredLanguage;
	const taskId = params.id;

	if (!taskId) {
		return json(
			createErrorResponse(
				'VALIDATION_ERROR',
				'errors.validation_failed',
				traceId,
				undefined,
				language
			),
			{ status: 400 }
		);
	}

	try {
		const task = taskRegistry.get(taskId);

		if (!task) {
			logger.warn('Task not found', 'task.not_found', { taskId }, traceId);
			return json(
				createErrorResponse('TASK_NOT_FOUND', 'errors.not_found', traceId, undefined, language),
				{ status: 404 }
			);
		}

		logger.logEvent('task.query', 'Task queried', { taskId, status: task.status }, traceId);

		return json(
			createSuccessResponse(
				'task.query_success',
				traceId,
				{
					task: {
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
					}
				},
				language
			),
			{ status: 200 }
		);
	} catch (error) {
		logger.error('Task query failed', error as Error, { taskId }, traceId);
		return json(
			createErrorResponse('INTERNAL_ERROR', 'errors.internal_error', traceId, undefined, language),
			{ status: 500 }
		);
	}
};
