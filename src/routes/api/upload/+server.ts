/**
 * File Upload API Endpoint
 * Handles multipart file uploads with validation and Office document conversion
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import Busboy from 'busboy';
import { Readable } from 'node:stream';
import { generateTraceId } from '$lib/utils/trace';
import { createSuccessResponse, createErrorResponse } from '$lib/utils/api';
import { validateFileType, validateFileSize } from '$lib/utils/validation';
import { storageService } from '$lib/services/storage.service';
import { officeService } from '$lib/services/office.service';
import { cleanupService } from '$lib/services/cleanup.service';
import { logger } from '$lib/services/logger.service';
import { systemConfig } from '$lib/utils/config';
import { fileRegistry } from '$lib/server/file-registry';
import { taskRegistry } from '$lib/server/task-registry';
import type { File as FileModel, Task } from '$lib/types/models';

const MAX_FILE_SIZE = systemConfig.upload.maxFileSize;
const ALLOWED_MIME_TYPES = systemConfig.upload.allowedMimeTypes;

export async function POST({ request }: RequestEvent) {
	const traceId = generateTraceId();

	try {
		const contentType = request.headers.get('content-type');
		if (!contentType || !contentType.includes('multipart/form-data')) {
			logger.warn('Invalid content type for upload', 'upload.invalid_content_type', {}, traceId);
			return json(
				createErrorResponse('INVALID_CONTENT_TYPE', 'upload.error.invalid_content_type', traceId),
				{ status: 400 }
			);
		}

		// Get sessionId from header or cookie
		const sessionId = request.headers.get('x-session-id') || generateTraceId();

		// Ensure session directory exists
		await storageService.createSessionDir(sessionId);

		const uploadedFiles: FileModel[] = [];
		const tasks: Task[] = [];

		// Parse multipart form data
		const busboy = Busboy({ headers: Object.fromEntries(request.headers) });
		const nodeStream = Readable.from(await streamToAsyncIterator(request.body!));

		await new Promise<void>((resolve, reject) => {
			busboy.on('file', async (fieldname, file, info) => {
				const { filename, mimeType } = info;
				const fileId = generateTraceId();

				try {
					logger.logEvent(
						'upload.start',
						'File upload started',
						{
							sessionId,
							fileId,
							filename,
							mimeType
						},
						traceId
					);

					// Validate MIME type
					const fileType = validateFileType(mimeType);
					if (!fileType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
						logger.warn(
							'Invalid file type',
							'upload.invalid_type',
							{
								sessionId,
								filename,
								mimeType
							},
							traceId
						);
						file.resume(); // Drain the stream
						reject(new Error('INVALID_FILE_TYPE'));
						return;
					}

					// T102: Check disk quota before upload
					const hasQuota = await cleanupService.checkQuota(MAX_FILE_SIZE); // Conservative check
					if (!hasQuota) {
						logger.warn(
							'Disk quota exceeded',
							'upload.quota_exceeded',
							{
								sessionId,
								filename
							},
							traceId
						);
						file.resume(); // Drain the stream
						reject(new Error('QUOTA_EXCEEDED'));
						return;
					}

					// Collect file data
					const chunks: Buffer[] = [];
					let fileSize = 0;

					file.on('data', (chunk: Buffer) => {
						fileSize += chunk.length;

						// Validate file size
						if (!validateFileSize(fileSize, MAX_FILE_SIZE)) {
							logger.warn(
								'File size exceeds limit',
								'upload.size_exceeded',
								{
									sessionId,
									filename,
									fileSize,
									maxSize: MAX_FILE_SIZE
								},
								traceId
							);
							file.resume(); // Drain the stream
							reject(new Error('FILE_TOO_LARGE'));
							return;
						}

						chunks.push(chunk);
					});

					file.on('end', async () => {
						const buffer = Buffer.concat(chunks);

						// Save file to storage
						const filePath = await storageService.saveFile(
							sessionId,
							'uploads',
							`${fileId}_${filename}`,
							buffer
						);

						// Create file record
						const fileRecord: FileModel = {
							id: fileId,
							sessionId,
							name: filename,
							type: fileType,
							mimeType,
							size: fileSize,
							path: filePath,
							category: 'uploads',
							createdAt: new Date()
						};

						// Register file in server-side registry
						fileRegistry.register(sessionId, fileRecord);

						uploadedFiles.push(fileRecord);

						// If Office file, trigger conversion
						if (fileType === 'office' && officeService.isOfficeFormat(mimeType)) {
							const taskId = generateTraceId();
							const task: Task = {
								id: taskId,
								sessionId,
								type: 'convert',
								status: 'pending',
								progress: 0,
								createdAt: new Date()
							};

							// Register task
							taskRegistry.register(task);
							tasks.push(task);

							logger.logEvent(
								'conversion.queued',
								'Office conversion queued',
								{
									sessionId,
									fileId,
									taskId,
									filename
								},
								traceId
							);

							// Trigger conversion asynchronously (don't await)
							officeService
								.convertToPdf(sessionId, `${fileId}_${filename}`)
								.then((pdfFilename) => {
									logger.logEvent('conversion.complete', 'Office conversion completed', {
										sessionId,
										fileId,
										taskId,
										pdfFilename
									});
									// Update task status
									taskRegistry.updateStatus(taskId, 'succeeded', 100);
								})
								.catch((error) => {
									logger.error('Office conversion failed', error as Error, {
										sessionId,
										fileId,
										taskId
									});
									// Update task status
									taskRegistry.updateStatus(taskId, 'failed', 0, {
										code: 'CONVERSION_FAILED',
										message: error.message
									});
								});
						}

						logger.logEvent(
							'upload.complete',
							'File upload completed',
							{
								sessionId,
								fileId,
								filename,
								fileSize
							},
							traceId
						);
					});
				} catch (error) {
					logger.error(
						'File upload failed',
						error as Error,
						{
							sessionId,
							filename
						},
						traceId
					);
					reject(error);
				}
			});

			busboy.on('finish', () => {
				resolve();
			});

			busboy.on('error', (error) => {
				logger.error('Busboy error', error as Error, { sessionId }, traceId);
				reject(error);
			});

			nodeStream.pipe(busboy);
		});

		return json(
			createSuccessResponse('upload.success', traceId, {
				files: uploadedFiles,
				tasks,
				sessionId
			}),
			{ status: 200 }
		);
	} catch (error) {
		const err = error as Error;
		logger.error('Upload endpoint error', err, {}, traceId);

		// Map error to error code
		let errorCode: 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE' | 'QUOTA_EXCEEDED' | 'UPLOAD_FAILED' =
			'UPLOAD_FAILED';
		let messageKey = 'upload.error.failed';

		if (err.message === 'INVALID_FILE_TYPE') {
			errorCode = 'INVALID_FILE_TYPE';
			messageKey = 'upload.error.invalid_type';
		}
		if (err.message === 'FILE_TOO_LARGE') {
			errorCode = 'FILE_TOO_LARGE';
			messageKey = 'upload.error.too_large';
		}
		if (err.message === 'QUOTA_EXCEEDED') {
			errorCode = 'QUOTA_EXCEEDED';
			messageKey = 'upload.error.quota_exceeded';
		}

		return json(createErrorResponse(errorCode, messageKey, traceId), { status: 400 });
	}
}

// Helper to convert Web ReadableStream to async iterator
async function* streamToAsyncIterator(stream: ReadableStream<Uint8Array>) {
	const reader = stream.getReader();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) return;
			yield value;
		}
	} finally {
		reader.releaseLock();
	}
}
