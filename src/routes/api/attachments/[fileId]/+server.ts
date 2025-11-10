/**
 * Attachment deletion endpoint
 * Removes an attachment file associated with the current session
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import path from 'node:path';
import { createErrorResponse, createSuccessResponse } from '$lib/utils/api';
import { logger } from '$lib/services/logger.service';
import { fileRegistry } from '$lib/server/file-registry';
import { storageService } from '$lib/services/storage.service';

export async function DELETE(event: RequestEvent) {
    const traceId = event.locals.traceId;
    const language = event.locals.preferredLanguage ?? 'zh-CN';
    const fileId = event.params.fileId;

    if (!fileId) {
        logger.warn(
            'Missing attachment id in delete request',
            'attachment.delete.validation_failed',
            {},
            traceId
        );
        return json(
            createErrorResponse('VALIDATION_ERROR', 'attachments_delete_missing_id', traceId, undefined, language),
            { status: 400 }
        );
    }

    const sessionId = event.request.headers.get('x-session-id');

    if (!sessionId) {
        logger.warn(
            'Missing session id for attachment delete',
            'attachment.delete.missing_session',
            { fileId },
            traceId
        );
        return json(
            createErrorResponse(
                'SESSION_EXPIRED',
                'attachments_delete_missing_session',
                traceId,
                { fileId },
                language
            ),
            { status: 400 }
        );
    }

    const record = fileRegistry.get(fileId);

    if (!record) {
        logger.warn(
            'Attachment not found in registry',
            'attachment.delete.not_found',
            { fileId, sessionId },
            traceId
        );
        return json(
            createErrorResponse('FILE_NOT_FOUND', 'attachments_delete_not_found', traceId, { fileId }, language),
            { status: 404 }
        );
    }

    if (record.sessionId !== sessionId) {
        logger.warn(
            'Session mismatch when deleting attachment',
            'attachment.delete.session_mismatch',
            { fileId, sessionId, ownerSession: record.sessionId },
            traceId
        );
        return json(
            createErrorResponse('UNAUTHORIZED', 'attachments_delete_unauthorized', traceId, { fileId }, language),
            { status: 403 }
        );
    }

    try {
        const storedFilename = path.basename(record.path);
        await storageService.deleteFile(sessionId, record.category, storedFilename);
        fileRegistry.delete(fileId);

        logger.logEvent(
            'attachment.delete.success',
            'Attachment deleted successfully',
            { fileId, sessionId, filename: record.name },
            traceId
        );

        return json(
            createSuccessResponse('attachments_delete_success', traceId, { fileId }, language),
            { status: 200 }
        );
    } catch (error) {
        logger.error(
            'Failed to delete attachment',
            error as Error,
            { fileId, sessionId },
            traceId
        );

        return json(
            createErrorResponse('INTERNAL_ERROR', 'attachments_delete_failed', traceId, { fileId }, language),
            { status: 500 }
        );
    }
}
