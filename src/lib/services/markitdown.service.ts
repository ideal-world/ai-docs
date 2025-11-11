import { execFile } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';
import { logger } from './logger.service';
import { storageService } from './storage.service';
import { systemConfig } from '$lib/utils/config';
import type { Category } from '$lib/types/models';

const execFileAsync = promisify(execFile);

class MarkItDownService {
	private binaryPath: string;
	private timeout: number;

	constructor() {
		this.binaryPath = systemConfig.markitdown?.path ?? 'markitdown';
		this.timeout = systemConfig.markitdown?.timeout ?? 120_000;
	}

	async isAvailable(traceId?: string): Promise<boolean> {
		try {
			await access(this.binaryPath, fsConstants.X_OK);
			return true;
		} catch (error) {
			logger.warn(
				'MarkItDown binary not accessible',
				'markitdown.unavailable',
				{
					path: this.binaryPath,
					error: (error as Error).message
				},
				traceId
			);
			return false;
		}
	}

	async convertToMarkdown(
		sessionId: string,
		sourceCategory: Category,
		sourceFilename: string,
		traceId?: string,
		options?: { outputFilename?: string }
	): Promise<{ filename: string; outputPath: string }> {
		const inputPath = storageService.getFilePath(sessionId, sourceCategory, sourceFilename);
		const outputFilename = options?.outputFilename ?? sourceFilename.replace(/\.pdf$/i, '.md');
		const outputPath = storageService.getFilePath(sessionId, 'results', outputFilename);
		const outputDir = path.dirname(outputPath);

		try {
			await mkdir(outputDir, { recursive: true });

			logger.logEvent(
				'markitdown.start',
				'MarkItDown conversion started',
				{
					sessionId,
					inputFile: sourceFilename,
					outputFile: outputFilename
				},
				traceId
			);

			await execFileAsync(this.binaryPath, [inputPath, '-o', outputPath], {
				timeout: this.timeout
			});

			logger.logEvent(
				'markitdown.complete',
				'MarkItDown conversion completed',
				{
					sessionId,
					inputFile: sourceFilename,
					outputFile: outputFilename
				},
				traceId
			);

			return { filename: outputFilename, outputPath };
		} catch (error) {
			logger.error(
				'MarkItDown conversion failed',
				error as Error,
				{
					sessionId,
					inputFile: sourceFilename,
					binary: this.binaryPath
				},
				traceId
			);
			throw new Error('MARKITDOWN_FAILED');
		}
	}
}

export const markitdownService = new MarkItDownService();
