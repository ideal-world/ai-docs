/**
 * Health Check API Endpoint
 * Returns system health status including LibreOffice availability and uptime
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSuccessResponse } from '$lib/utils/api';
import { officeService } from '$lib/services/office.service';
import { modelService } from '$lib/services/model.service';
import { logger } from '$lib/services/logger.service';
import { markitdownService } from '$lib/services/markitdown.service';

const startTime = Date.now();
const APP_VERSION = '0.1.0'; // TODO: Load from package.json in build process

/**
 * GET /api/health
 * Returns health status of the service
 */
export const GET: RequestHandler = async ({ locals }) => {
	const traceId = locals.traceId;
	const language = locals.preferredLanguage;

	try {
		// Check LibreOffice availability
		const isOfficeAvailable = await officeService.isAvailable(traceId, true);
		const isMarkitDownAvailable = await markitdownService.isAvailable(traceId);

		// T093: Check model availability
		const modelAvailability = await modelService.checkAvailability();

		// Calculate uptime
		const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
		const uptimeFormatted = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`;

		const isHealthy = isOfficeAvailable && isMarkitDownAvailable;
		const healthData = {
			status: isHealthy ? 'healthy' : 'degraded',
			timestamp: new Date().toISOString(),
			uptime: {
				seconds: uptimeSeconds,
				formatted: uptimeFormatted
			},
			services: {
				libreOffice: isOfficeAvailable,
				markitdown: isMarkitDownAvailable,
				models: modelAvailability
			},
			version: APP_VERSION
		};

		// Return 200 even if degraded (service is still partially functional)
		if (isHealthy) {
			return json(createSuccessResponse('api.health.success', traceId, healthData, language), {
				status: 200
			});
		} else {
			return json(
				createSuccessResponse(
					'api.health.success',
					traceId,
					{
						...healthData,
						note: 'health.note.document_processing_degraded'
					},
					language
				),
				{ status: 200 }
			);
		}
	} catch (error) {
		logger.error('Health check failed', error as Error, {}, traceId);
		throw error;
	}
};
