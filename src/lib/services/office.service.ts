/**
 * LibreOffice Service
 * Handles Office document to PDF conversion using LibreOffice
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from './logger.service';
import { storageService } from './storage.service';
import { systemConfig } from '$lib/utils/config';

const execAsync = promisify(exec);

class OfficeService {
	private libreOfficePath: string;
	private timeout: number;

	constructor() {
		this.libreOfficePath = systemConfig.libreOffice?.path || '/usr/bin/libreoffice';
		this.timeout = systemConfig.libreOffice?.timeout || 60000; // 60 seconds
	}

	/**
	 * Check if LibreOffice is installed and available
	 */
	async isAvailable(): Promise<boolean> {
		try {
			const { stdout } = await execAsync(`${this.libreOfficePath} --version`);
			logger.debug('LibreOffice detected', { version: stdout.trim() });
			return true;
		} catch (error) {
			logger.warn('LibreOffice not available', 'office.unavailable', {
				path: this.libreOfficePath,
				error: (error as Error).message
			});
			return false;
		}
	}

	/**
	 * Convert Office document to PDF
	 * @param sessionId Session ID
	 * @param filename Original Office filename
	 * @returns Promise<string> - Converted PDF filename
	 */
	async convertToPdf(sessionId: string, filename: string): Promise<string> {
		const inputPath = storageService.getFilePath(sessionId, 'uploads', filename);
		const outputDir = storageService.getSessionDir(sessionId) + '/converted';

		try {
			logger.logEvent('office.convert.start', 'Starting Office to PDF conversion', {
				sessionId,
				filename
			});

			// Run LibreOffice conversion
			// --headless: run without GUI
			// --convert-to pdf: output format
			// --outdir: output directory
			const command = `${this.libreOfficePath} --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;

			const { stdout, stderr } = await execAsync(command, {
				timeout: this.timeout
			});

			if (stderr) {
				logger.warn('LibreOffice conversion warning', 'office.convert.warning', {
					sessionId,
					filename,
					stderr
				});
			}

			// Extract converted filename (LibreOffice changes extension to .pdf)
			const pdfFilename = filename.replace(/\.(docx|xlsx|pptx|doc|xls|ppt)$/i, '.pdf');

			logger.logEvent('office.convert.complete', 'Office to PDF conversion completed', {
				sessionId,
				inputFile: filename,
				outputFile: pdfFilename,
				stdout: stdout.trim()
			});

			return pdfFilename;
		} catch (error) {
			const err = error as Error & { code?: string; killed?: boolean; signal?: string };

			// Handle timeout
			if (err.killed || err.code === 'ETIMEDOUT') {
				logger.error('Office conversion timeout', new Error('Conversion timeout exceeded'), {
					sessionId,
					filename,
					timeout: this.timeout
				});
				throw new Error('CONVERSION_TIMEOUT');
			}

			logger.error('Office conversion failed', err, {
				sessionId,
				filename
			});
			throw new Error('CONVERSION_FAILED');
		}
	}

	/**
	 * Get supported Office formats
	 */
	getSupportedFormats(): string[] {
		return [
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
			'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
			'application/msword', // .doc
			'application/vnd.ms-excel', // .xls
			'application/vnd.ms-powerpoint' // .ppt
		];
	}

	/**
	 * Check if MIME type is supported Office format
	 */
	isOfficeFormat(mimeType: string): boolean {
		return this.getSupportedFormats().includes(mimeType);
	}
}

// Export singleton instance
export const officeService = new OfficeService();
