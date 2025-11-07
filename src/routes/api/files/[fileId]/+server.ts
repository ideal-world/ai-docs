/**
 * File Info and Delete API Endpoints
 * GET: Retrieve file metadata
 * DELETE: Delete file from storage
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSuccessResponse, createErrorResponse } from '$lib/utils/api';
import { generateTraceId } from '$lib/utils/trace';
import { logger } from '$lib/services/logger.service';
import { fileRegistry } from '$lib/server/file-registry';
import { storageService } from '$lib/services/storage.service';

/**
 * GET /api/files/:fileId
 * Retrieve file metadata
 */
export const GET: RequestHandler = async ({ params }) => {
	const traceId = generateTraceId();
	const fileId = params.fileId;

	if (!fileId) {
		return json(createErrorResponse('VALIDATION_ERROR', 'errors.validation_failed', traceId), {
			status: 400
		});
	}

	try {
		const fileWithSession = fileRegistry.get(fileId);

		if (!fileWithSession) {
			logger.logEvent('file.not_found', 'File not found', { fileId }, traceId);
			return json(createErrorResponse('FILE_NOT_FOUND', 'errors.not_found', traceId), {
				status: 404
			});
		}

		// Destructure to omit sessionId from response
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { sessionId: _omittedSessionId, ...file } = fileWithSession;

		logger.logEvent('file.info', 'File info retrieved', { fileId }, traceId);

		return json(
			createSuccessResponse('file.info_success', traceId, {
				file: {
					...file,
					createdAt: file.createdAt.toISOString()
				}
			}),
			{ status: 200 }
		);
	} catch (error) {
		logger.error('File info retrieval failed', error as Error, { fileId }, traceId);
		return json(createErrorResponse('INTERNAL_ERROR', 'errors.internal_error', traceId), {
			status: 500
		});
	}
};

/**
 * DELETE /api/files/:fileId
 * Delete file from storage
 */
export const DELETE: RequestHandler = async ({ params, request }) => {
	const traceId = generateTraceId();
	const fileId = params.fileId;

	if (!fileId) {
		return json(createErrorResponse('VALIDATION_ERROR', 'errors.validation_failed', traceId), {
			status: 400
		});
	}

	try {
		const fileWithSession = fileRegistry.get(fileId);

		if (!fileWithSession) {
			logger.warn('File not found for deletion', 'file.not_found', { fileId }, traceId);
			return json(createErrorResponse('FILE_NOT_FOUND', 'errors.not_found', traceId), {
				status: 404
			});
		}

		const { sessionId, ...file } = fileWithSession;

		// Optional: Verify session ID from request header matches
		const requestSessionId = request.headers.get('x-session-id');
		if (requestSessionId && requestSessionId !== sessionId) {
			logger.warn(
				'Session ID mismatch for file deletion',
				'file.session_mismatch',
				{
					fileId,
					requestSessionId,
					fileSessionId: sessionId
				},
				traceId
			);
			return json(createErrorResponse('UNAUTHORIZED', 'errors.unauthorized', traceId), {
				status: 403
			});
		}

		// Delete from storage
		await storageService.deleteFile(sessionId, file.category, file.name);

		// Remove from registry
		fileRegistry.delete(fileId);

		logger.logEvent(
			'file.deleted',
			'File deleted successfully',
			{
				fileId,
				filename: file.name
			},
			traceId
		);

		return json(
			createSuccessResponse('file.delete_success', traceId, {
				deleted: true,
				fileId
			}),
			{ status: 200 }
		);
	} catch (error) {
		logger.error('File deletion failed', error as Error, { fileId }, traceId);
		return json(createErrorResponse('INTERNAL_ERROR', 'errors.internal_error', traceId), {
			status: 500
		});
	}
};
