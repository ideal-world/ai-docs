/**
 * Attachments Upload API Endpoint
 * Handles file uploads for attachments (similar to main upload but different category)
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import Busboy from 'busboy';
import { Readable } from 'node:stream';
import { generateTraceId } from '$lib/utils/trace';
import { createSuccessResponse, createErrorResponse } from '$lib/utils/api';
import { validateFileType, validateFileSize } from '$lib/utils/validation';
import { storageService } from '$lib/services/storage.service';
import { logger } from '$lib/services/logger.service';
import { systemConfig } from '$lib/utils/config';
import { fileRegistry } from '$lib/server/file-registry';
import type { File as FileModel } from '$lib/types/models';

const MAX_FILE_SIZE = systemConfig.upload.maxFileSize;

export async function POST({ request }: RequestEvent) {
	const traceId = generateTraceId();

	try {
		const contentType = request.headers.get('content-type');
		if (!contentType || !contentType.includes('multipart/form-data')) {
			logger.warn(
				'Invalid content type for attachment upload',
				'upload.invalid_content_type',
				{},
				traceId
			);
			return json(
				createErrorResponse('INVALID_CONTENT_TYPE', 'upload.error.invalid_content_type', traceId),
				{ status: 400 }
			);
		}

		const sessionId = request.headers.get('x-session-id') || generateTraceId();

		// Ensure session directory exists
		await storageService.createSessionDir(sessionId);

		logger.logEvent('upload.start', 'Starting attachment upload', { sessionId }, traceId);

		const uploadedFiles: FileModel[] = [];

		// Convert Web ReadableStream to Node.js stream
		// The Web ReadableStream needs to be cast via 'unknown' first to satisfy TypeScript
		const nodeStream = Readable.from(request.body as unknown as AsyncIterable<Uint8Array>);

		const busboy = Busboy({
			headers: {
				'content-type': contentType
			},
			limits: {
				fileSize: MAX_FILE_SIZE
			},
			defParamCharset: 'utf8'
		});

		const processingPromises: Promise<void>[] = [];

		busboy.on('file', (fieldname, file, info) => {
			const { filename, mimeType } = info;

			const processingPromise = (async () => {
				try {
					// Validate file type
					const fileType = validateFileType(mimeType);
					if (!fileType) {
						file.resume(); // Drain the stream
						logger.warn(
							'Invalid file type for attachment',
							'upload.invalid_type',
							{
								sessionId,
								filename,
								mimeType
							},
							traceId
						);
						throw new Error(`Invalid file type: ${mimeType}`);
					}

					// Collect file chunks
					const chunks: Buffer[] = [];
					let fileSize = 0;

					file.on('data', (chunk: Buffer) => {
						chunks.push(chunk);
						fileSize += chunk.length;

						// Validate size during upload
						if (!validateFileSize(fileSize, MAX_FILE_SIZE)) {
							file.destroy();
							throw new Error(`File too large: ${fileSize} bytes`);
						}
					});

					await new Promise<void>((resolve, reject) => {
						file.on('end', () => resolve());
						file.on('error', (error) => reject(error));
						file.on('limit', () => reject(new Error('File size limit exceeded')));
					});

					const buffer = Buffer.concat(chunks);
					const fileId = generateTraceId();

					// Save file to storage (attachments category)
					const filePath = await storageService.saveFile(
						sessionId,
						'uploads', // Attachments also go to uploads, but could be different
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
						category: 'uploads', // Mark as attachment in metadata if needed
						createdAt: new Date(),
						metadata:
							fileType === 'image'
								? { width: 0, height: 0, format: 'png' as const, role: 'attachment' as const }
								: fileType === 'pdf'
									? { pages: 0, role: 'attachment' as const }
									: { format: 'docx' as const, role: 'attachment' as const }
					};					// Register file in server-side registry
					fileRegistry.register(sessionId, fileRecord);

					uploadedFiles.push(fileRecord);

					logger.logEvent(
						'upload.attachment.complete',
						'Attachment uploaded successfully',
						{
							sessionId,
							fileId,
							filename,
							size: fileSize
						},
						traceId
					);
				} catch (error) {
					logger.error(
						'Error processing attachment',
						error as Error,
						{
							sessionId,
							filename
						},
						traceId
					);
					throw error;
				}
			})();

			processingPromises.push(processingPromise);
		});

		// Pipe the stream to busboy
		nodeStream.pipe(busboy);

		// Wait for all files to be processed
		await new Promise<void>((resolve, reject) => {
			busboy.on('finish', () => {
				Promise.all(processingPromises)
					.then(() => resolve())
					.catch(reject);
			});
			busboy.on('error', reject);
		});

		logger.logEvent(
			'upload.complete',
			'All attachments uploaded',
			{
				sessionId,
				fileCount: uploadedFiles.length
			},
			traceId
		);

		return json(
			createSuccessResponse('upload.success', traceId, {
				files: uploadedFiles,
				sessionId
			}),
			{ status: 201 }
		);
	} catch (error) {
		logger.error('Attachment upload failed', error as Error, {}, traceId);
		return json(createErrorResponse('UPLOAD_FAILED', 'upload.error.failed', traceId), {
			status: 500
		});
	}
}
