import { rename } from 'node:fs/promises';
import path from 'node:path';
import { logger } from './logger.service';
import { officeService } from './office.service';
import { storageService } from './storage.service';
import { markitdownService } from './markitdown.service';
import { ocrService } from './ocr.service';
import { fileRegistry } from '$lib/server/file-registry';
import { taskRegistry } from '$lib/server/task-registry';
import { generateTraceId } from '$lib/utils/trace';
import type { Category, File, Task } from '$lib/types/models';

const STAGE = {
	pending: 'pipeline.stage.pending',
	officeToPdf: 'pipeline.stage.office_to_pdf',
	pdfToMarkdown: 'pipeline.stage.pdf_to_markdown',
	ocrToMarkdown: 'pipeline.stage.ocr_to_markdown',
	complete: 'pipeline.stage.completed',
	cancelled: 'pipeline.stage.cancelled'
} as const;

const MIME = {
	pdf: 'application/pdf',
	markdown: 'text/markdown'
} as const;

type ProcessRole = 'main' | 'attachment';

type PipelineKind = 'office-markitdown' | 'legacy-ocr' | 'pdf-ocr' | 'image-ocr';

class TaskCancelledError extends Error {
	constructor() {
		super('TASK_CANCELLED');
	}
}

interface ProcessOptions {
	traceId?: string;
	role?: ProcessRole;
}

interface PipelineResult {
	sourceFile: File;
	markdownFile: File;
	convertedPdfFile?: File;
}

class ProcessService {
	startProcessing(file: File, options: ProcessOptions = {}): Task {
		const task: Task = {
			id: generateTraceId(),
			sessionId: file.sessionId,
			fileId: file.id,
			type: 'process',
			status: 'pending',
			progress: 0,
			stage: STAGE.pending,
			createdAt: new Date()
		};

		taskRegistry.register(task);

		void this.runPipeline(task.id, file, options).catch((error) => {
			logger.error(
				'Pipeline execution failed (unhandled)',
				error as Error,
				{
					sessionId: file.sessionId,
					fileId: file.id
				},
				options.traceId
			);
		});

		return task;
	}

	private ensureNotCancelled(taskId: string): void {
		if (taskRegistry.isCancelled(taskId)) {
			throw new TaskCancelledError();
		}
	}

	private async runPipeline(taskId: string, file: File, options: ProcessOptions): Promise<void> {
		const traceId = options.traceId;

		logger.logEvent(
			'pipeline.start',
			'File processing pipeline started',
			{
				sessionId: file.sessionId,
				fileId: file.id,
				role: options.role ?? 'main'
			},
			traceId
		);

		taskRegistry.update(taskId, {
			status: 'running',
			progress: 5,
			stage: STAGE.pending
		});

		this.ensureNotCancelled(taskId);

		try {
			const kind = this.determinePipeline(file);

			let pipelineResult: PipelineResult | null = null;

			switch (kind) {
				case 'office-markitdown':
					pipelineResult = await this.runOfficeMarkitDownPipeline(taskId, file, traceId);
					break;
				case 'legacy-ocr':
					pipelineResult = await this.runLegacyOcrPipeline(taskId, file, traceId);
					break;
				case 'pdf-ocr':
				case 'image-ocr':
					pipelineResult = await this.runDirectOcrPipeline(taskId, file, kind, traceId);
					break;
				default:
					throw new Error('UNSUPPORTED_PIPELINE');
			}

			if (!pipelineResult) {
				throw new Error('PIPELINE_NO_RESULT');
			}

			this.ensureNotCancelled(taskId);

			taskRegistry.update(taskId, {
				status: 'succeeded',
				progress: 100,
				stage: STAGE.complete,
				result: {
					fileId: pipelineResult.markdownFile.id,
					data: {
						markdownFile: pipelineResult.markdownFile,
						convertedPdfFile: pipelineResult.convertedPdfFile,
						sourceFile: pipelineResult.sourceFile
					}
				}
			});

			logger.logEvent(
				'pipeline.complete',
				'File processing pipeline completed',
				{
					sessionId: file.sessionId,
					fileId: file.id,
					role: options.role ?? 'main',
					markdownFileId: pipelineResult.markdownFile.id
				},
				traceId
			);
		} catch (error) {
			if (error instanceof TaskCancelledError) {
				taskRegistry.update(taskId, {
					status: 'cancelled',
					stage: STAGE.cancelled
				});
				logger.logEvent(
					'pipeline.cancelled',
					'File processing pipeline cancelled',
					{
						sessionId: file.sessionId,
						fileId: file.id,
						role: options.role ?? 'main'
					},
					traceId
				);
				return;
			}

			const err = error as Error;

			taskRegistry.update(taskId, {
				status: 'failed',
				progress: 100,
				error: {
					code: err.message || 'PIPELINE_FAILED',
					message: err.message
				}
			});

			logger.error(
				'File processing pipeline failed',
				err,
				{
					sessionId: file.sessionId,
					fileId: file.id
				},
				traceId
			);
			throw err;
		}
	}

	private determinePipeline(file: File): PipelineKind {
		const extension = path.extname(file.name).toLowerCase();

		if (['.pptx', '.docx', '.xlsx', '.xls'].includes(extension)) {
			return 'office-markitdown';
		}

		if (['.doc', '.ppt'].includes(extension)) {
			return 'legacy-ocr';
		}

		if (file.type === 'pdf') {
			return 'pdf-ocr';
		}

		if (file.type === 'image') {
			return 'image-ocr';
		}

		throw new Error('UNSUPPORTED_FILE_TYPE');
	}

	private async runOfficeMarkitDownPipeline(taskId: string, file: File, traceId?: string): Promise<PipelineResult> {
		this.ensureNotCancelled(taskId);
		taskRegistry.update(taskId, { stage: STAGE.officeToPdf, progress: 20 });

		const { pdfFile, sourceFile } = await this.convertOfficeToPdf(file, traceId);
		this.ensureNotCancelled(taskId);

		taskRegistry.update(taskId, { stage: STAGE.pdfToMarkdown, progress: 55 });
		this.ensureNotCancelled(taskId);

		const markdownFile = await this.generateMarkdownFromOffice(taskId, file, pdfFile, traceId);
		this.ensureNotCancelled(taskId);

		return {
			sourceFile,
			markdownFile,
			convertedPdfFile: pdfFile
		};
	}

	private async runLegacyOcrPipeline(taskId: string, file: File, traceId?: string): Promise<PipelineResult> {
		this.ensureNotCancelled(taskId);
		taskRegistry.update(taskId, { stage: STAGE.officeToPdf, progress: 20 });

		const { pdfFile, sourceFile } = await this.convertOfficeToPdf(file, traceId);
		this.ensureNotCancelled(taskId);

		taskRegistry.update(taskId, { stage: STAGE.ocrToMarkdown, progress: 60 });
		this.ensureNotCancelled(taskId);

		const markdownFile = await this.runOcr(file.sessionId, pdfFile, MIME.pdf, traceId);
		this.ensureNotCancelled(taskId);

		return {
			sourceFile,
			markdownFile,
			convertedPdfFile: pdfFile
		};
	}

	private async runDirectOcrPipeline(
		taskId: string,
		file: File,
		kind: 'pdf-ocr' | 'image-ocr',
		traceId?: string
	): Promise<PipelineResult> {
		this.ensureNotCancelled(taskId);
		taskRegistry.update(taskId, { stage: STAGE.ocrToMarkdown, progress: 60 });
		this.ensureNotCancelled(taskId);

		const mimeType = kind === 'pdf-ocr' ? MIME.pdf : file.mimeType;
		const markdownFile = await this.runOcr(file.sessionId, file, mimeType, traceId);
		this.ensureNotCancelled(taskId);

		return {
			sourceFile: file,
			markdownFile
		};
	}

	private async convertOfficeToPdf(file: File, traceId?: string): Promise<{ pdfFile: File; sourceFile: File }> {
		const sessionId = file.sessionId;
		const originalStoredName = `${file.id}_${file.name}`;

		const convertedFilename = await officeService.convertToPdf(
			sessionId,
			originalStoredName,
			traceId
		);
		const convertedPath = storageService.getFilePath(sessionId, 'converted', convertedFilename);

		const pdfId = generateTraceId();
		const pdfDisplayName = `${path.parse(file.name).name}.pdf`;
		const pdfStoredFilename = `${pdfId}_${pdfDisplayName}`;
		const pdfTargetPath = storageService.getFilePath(sessionId, 'converted', pdfStoredFilename);

		await rename(convertedPath, pdfTargetPath);

		const pdfStatsSize = await storageService.getFileSize(sessionId, 'converted', pdfStoredFilename);

		const pdfFile: File = {
			id: pdfId,
			sessionId,
			name: pdfDisplayName,
			type: 'pdf',
			mimeType: MIME.pdf,
			size: pdfStatsSize,
			path: pdfTargetPath,
			category: 'converted',
			createdAt: new Date()
		};

		fileRegistry.register(sessionId, pdfFile);

		const extension = path.extname(file.name).toLowerCase().slice(1) as
			| 'doc'
			| 'docx'
			| 'ppt'
			| 'pptx'
			| 'xls'
			| 'xlsx';

		const updatedMetadata = {
			...(file.metadata ?? {}),
			...(extension ? { format: extension } : {}),
			convertedPdfId: pdfId
		};

		const updatedSourceRecord = fileRegistry.update(file.id, {
			metadata: updatedMetadata as File['metadata']
		});

		const sourceFile = updatedSourceRecord
			? (updatedSourceRecord as File)
			: {
				...file,
				metadata: updatedMetadata as File['metadata']
			};

		return { pdfFile, sourceFile };
	}

	private async generateMarkdownFromOffice(
		taskId: string,
		sourceFile: File,
		pdfFile: File,
		traceId?: string
	): Promise<File> {
		this.ensureNotCancelled(taskId);

		const sessionId = sourceFile.sessionId;
		const markdownId = generateTraceId();
		const markdownDisplayName = `${path.parse(sourceFile.name).name}.md`;
		const markdownStoredFilename = `${markdownId}_${markdownDisplayName}`;
		const sourceStoredFilename = `${sourceFile.id}_${sourceFile.name}`;

		try {
			await this.runMarkItDownConversion(
				sessionId,
				'uploads',
				sourceStoredFilename,
				markdownStoredFilename,
				traceId
			);
			this.ensureNotCancelled(taskId);
			return this.createMarkdownFileRecord(
				sessionId,
				markdownId,
				markdownDisplayName,
				markdownStoredFilename
			);
		} catch (error) {
			logger.warn(
				'Direct Office to Markdown conversion failed, falling back to PDF',
				'pipeline.office.markitdown_fallback',
				{
					sessionId: sourceFile.sessionId,
					fileId: sourceFile.id,
					convertedPdfId: pdfFile.id,
					reason: (error as Error).message
				},
				traceId
			);

			this.ensureNotCancelled(taskId);

			try {
				const fallback = await this.runMarkItDown(sourceFile.sessionId, pdfFile, traceId, {
					markdownId,
					markdownDisplayName,
					markdownStoredFilename
				});
				this.ensureNotCancelled(taskId);
				return fallback;
			} catch (fallbackError) {
				logger.error(
					'Fallback PDF to Markdown conversion failed',
					fallbackError as Error,
					{
						sessionId: sourceFile.sessionId,
						fileId: sourceFile.id,
						convertedPdfId: pdfFile.id
					},
					traceId
				);
				throw fallbackError;
			}
		}
	}

	private async runMarkItDown(
		sessionId: string,
		pdfFile: File,
		traceId?: string,
		options?: {
			markdownId?: string;
			markdownDisplayName?: string;
			markdownStoredFilename?: string;
		}
	): Promise<File> {
		const markdownDisplayName =
			options?.markdownDisplayName ?? `${path.parse(pdfFile.name).name}.md`;
		const markdownId = options?.markdownId ?? generateTraceId();
		const markdownStoredFilename =
			options?.markdownStoredFilename ?? `${markdownId}_${markdownDisplayName}`;

		await this.runMarkItDownConversion(
			sessionId,
			'converted',
			`${pdfFile.id}_${pdfFile.name}`,
			markdownStoredFilename,
			traceId
		);

		return this.createMarkdownFileRecord(
			sessionId,
			markdownId,
			markdownDisplayName,
			markdownStoredFilename
		);
	}

	private async runMarkItDownConversion(
		sessionId: string,
		sourceCategory: Category,
		sourceFilename: string,
		outputFilename: string,
		traceId?: string
	): Promise<void> {
		await markitdownService.convertToMarkdown(
			sessionId,
			sourceCategory,
			sourceFilename,
			traceId,
			{ outputFilename }
		);
	}

	private async createMarkdownFileRecord(
		sessionId: string,
		markdownId: string,
		markdownDisplayName: string,
		markdownStoredFilename: string
	): Promise<File> {
		const markdownSize = await storageService.getFileSize(
			sessionId,
			'results',
			markdownStoredFilename
		);
		const markdownPath = storageService.getFilePath(
			sessionId,
			'results',
			markdownStoredFilename
		);

		const markdownFile: File = {
			id: markdownId,
			sessionId,
			name: markdownDisplayName,
			type: 'text',
			mimeType: MIME.markdown,
			size: markdownSize,
			path: markdownPath,
			category: 'results',
			createdAt: new Date()
		};

		fileRegistry.register(sessionId, markdownFile);

		return markdownFile;
	}

	private async runOcr(sessionId: string, file: File, mimeType: string, traceId?: string): Promise<File> {
		const markdownId = generateTraceId();
		const markdownDisplayName = `${path.parse(file.name).name}.md`;
		const markdownStoredFilename = `${markdownId}_${markdownDisplayName}`;

		const markdownText = await ocrService.convertToMarkdown(
			sessionId,
			file.category,
			`${file.id}_${file.name}`,
			mimeType,
			traceId
		);

		await storageService.saveFile(
			sessionId,
			'results',
			markdownStoredFilename,
			Buffer.from(markdownText, 'utf-8')
		);

		const markdownSize = await storageService.getFileSize(sessionId, 'results', markdownStoredFilename);
		const markdownPath = storageService.getFilePath(sessionId, 'results', markdownStoredFilename);

		const markdownFile: File = {
			id: markdownId,
			sessionId,
			name: markdownDisplayName,
			type: 'text',
			mimeType: MIME.markdown,
			size: markdownSize,
			path: markdownPath,
			category: 'results',
			createdAt: new Date()
		};

		fileRegistry.register(sessionId, markdownFile);

		return markdownFile;
	}
}

export const processService = new ProcessService();
