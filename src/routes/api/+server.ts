import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { generateTraceId } from '$lib/utils/trace';
import { createSuccessResponse, createErrorResponse } from '$lib/utils/api';
import { handleError } from '$lib/utils/error';
import { logger } from '$lib/services/logger.service';

/**
 * Example API endpoint with traceId and unified error handling
 */
export const GET: RequestHandler = async ({ request }) => {
	const traceId = generateTraceId();

	try {
		logger.info('API request received', traceId, {
			method: request.method,
			url: request.url
		});

		// Example response
		const data = {
			message: 'API endpoint working',
			timestamp: new Date().toISOString()
		};

		return json(createSuccessResponse(data, traceId));
	} catch (error) {
		const errorInfo = handleError(error);
		logger.error('API request failed', traceId, errorInfo);

		return json(
			createErrorResponse(errorInfo.code, errorInfo.message, traceId, errorInfo.details),
			{ status: errorInfo.statusCode }
		);
	}
};
