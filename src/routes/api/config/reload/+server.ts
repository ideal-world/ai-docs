/**
 * Config Reload API Endpoint
 * T092: Hot reload model configuration without restart
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSuccessResponse, createErrorResponse } from '$lib/utils/api';
import { modelService } from '$lib/services/model.service';
import { logger } from '$lib/services/logger.service';

/**
 * POST /api/config/reload
 * Reload model configuration from file
 */
export const POST: RequestHandler = async ({ locals }) => {
	const traceId = locals.traceId;
	const language = locals.preferredLanguage;

	try {
		logger.logEvent('config.reload.start', 'Config reload requested', {}, traceId);

		// Reload model configuration
		modelService.reloadConfig();

		logger.logEvent('config.reload.complete', 'Config reload completed', {}, traceId);

		return json(
			createSuccessResponse(
				'api.config.reload_success',
				traceId,
				{
					message: 'Configuration reloaded successfully',
					timestamp: new Date().toISOString()
				},
				language
			),
			{ status: 200 }
		);
	} catch (error) {
		logger.error('Config reload failed', error as Error, {}, traceId);
		return json(
			createErrorResponse('INTERNAL_ERROR', 'errors.internal_error', traceId, undefined, language),
			{ status: 500 }
		);
	}
};
