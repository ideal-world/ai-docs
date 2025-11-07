import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { storageService } from '$lib/services/storage.service';
import { createErrorResponse } from '$lib/utils/api';
import { v4 as uuidv4 } from 'uuid';
import { fileRegistry } from '$lib/server/file-registry';

/**
 * GET /api/files/:id/download
 * Download a file by its ID
 * Note: File IDs are UUIDs, providing security through obscurity
 */
export const GET: RequestHandler = async ({ params }) => {
	const traceId = uuidv4();
	const fileId = params.id;

	if (!fileId) {
		return json(createErrorResponse('VALIDATION_ERROR', 'errors.validation_failed', traceId), {
			status: 400
		});
	}

	// Get file from registry
	const fileWithSession = fileRegistry.get(fileId);

	if (!fileWithSession) {
		return json(createErrorResponse('NOT_FOUND', 'errors.not_found', traceId), { status: 404 });
	}

	const { sessionId, ...file } = fileWithSession;

	try {
		// Read the file from storage
		const fileBuffer = await storageService.readFile(sessionId, file.category, file.name);

		// Determine MIME type
		const mimeType = file.mimeType || 'application/octet-stream';

		// Return the file with appropriate headers
		return new Response(Buffer.from(fileBuffer), {
			status: 200,
			headers: {
				'Content-Type': mimeType,
				'Content-Disposition': `inline; filename="${file.name}"`,
				'Content-Length': fileBuffer.length.toString(),
				'Cache-Control': 'private, max-age=3600'
			}
		});
	} catch (error) {
		console.error('[api/files/download] Error reading file:', error);
		return json(createErrorResponse('INTERNAL_ERROR', 'errors.internal_error', traceId), {
			status: 500
		});
	}
};
