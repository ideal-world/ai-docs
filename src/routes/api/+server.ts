import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { generateTraceId } from '$lib/utils/trace';
import { createSuccessResponse, createErrorResponse } from '$lib/utils/api';
import { logger } from '$lib/services/logger.service';

/**
 * Base API endpoint - demonstrates unified response format and error handling
 * All API endpoints should follow this pattern:
 * 1. Generate traceId at the start
 * 2. Log request details
 * 3. Use createSuccessResponse/createErrorResponse
 * 4. Log errors with full context
 */
export const GET: RequestHandler = async ({ request }) => {
	const traceId = generateTraceId();
	const language = request.headers.get('Accept-Language')?.split(',')[0] || 'en-US';

	try {
		logger.info(
			'API health check',
			'api.health.request',
			{
				method: request.method,
				url: request.url,
				language
			},
			traceId
		);

		const data = {
			status: 'ok',
			timestamp: new Date().toISOString(),
			version: '0.1.0'
		};

		return json(createSuccessResponse('api.health.success', traceId, data));
	} catch (error) {
		logger.error('API request failed', error as Error, { url: request.url }, traceId);

		return json(createErrorResponse('INTERNAL_ERROR', 'error.internal', traceId), { status: 500 });
	}
};
