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

export class OfficeService {
	private libreOfficePath: string;
	private timeout: number;
	private availabilityChecked = false;
	private libreOfficeAvailable = false;

	constructor() {
		this.libreOfficePath = systemConfig.libreOffice?.path || '/usr/bin/libreoffice';
		this.timeout = systemConfig.libreOffice?.timeout || 180000; // 180 seconds (3 minutes) default
	}

	/**
	 * Check if LibreOffice is installed and available
	 */
	async isAvailable(traceId?: string, forceRefresh = false): Promise<boolean> {
		if (this.availabilityChecked && !forceRefresh) {
			if (!this.libreOfficeAvailable) {
				return this.isAvailable(traceId, true);
			}
			return this.libreOfficeAvailable;
		}

		try {
			const { stdout } = await execAsync(`${this.libreOfficePath} --version`);
			this.libreOfficeAvailable = true;
			logger.debug(
				'LibreOffice detected',
				{ version: stdout.trim(), path: this.libreOfficePath },
				traceId
			);
		} catch (error) {
			this.libreOfficeAvailable = false;
			logger.warn(
				'LibreOffice not available',
				'office.libreoffice.missing',
				{
					path: this.libreOfficePath,
					error: (error as Error).message
				},
				traceId
			);
		} finally {
			this.availabilityChecked = true;
		}

		return this.libreOfficeAvailable;
	}

	/**
	 * Convert Office document to PDF
	 * @param sessionId Session ID
	 * @param filename Original Office filename
	 * @param traceId Optional trace identifier for logging correlation
	 * @returns Promise<string> - Converted PDF filename
	 */
	async convertToPdf(sessionId: string, filename: string, traceId?: string): Promise<string> {
		const inputPath = storageService.getFilePath(sessionId, 'uploads', filename);
		const outputDir = storageService.getSessionDir(sessionId) + '/converted';

		const available = await this.isAvailable(traceId);
		if (!available) {
			logger.warn(
				'LibreOffice binary not found, skipping conversion',
				'office.convert.libreoffice_missing',
				{
					sessionId,
					filename,
					path: this.libreOfficePath
				},
				traceId
			);
			throw new Error('LIBREOFFICE_NOT_INSTALLED');
		}

		try {
			logger.logEvent(
				'office.convert.start',
				'Starting Office to PDF conversion',
				{
					sessionId,
					filename
				},
				traceId
			);

			// Run LibreOffice conversion
			// --headless: run without GUI
			// --convert-to pdf: output format
			// --outdir: output directory
			const command = `${this.libreOfficePath} --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;

			const { stdout, stderr } = await execAsync(command, {
				timeout: this.timeout
			});

			if (stderr) {
				logger.warn(
					'LibreOffice conversion warning',
					'office.convert.warning',
					{
						sessionId,
						filename,
						stderr
					},
					traceId
				);
			}

			// Extract converted filename (LibreOffice changes extension to .pdf)
			const pdfFilename = filename.replace(/\.(docx|xlsx|pptx|doc|xls|ppt)$/i, '.pdf');

			logger.logEvent(
				'office.convert.complete',
				'Office to PDF conversion completed',
				{
					sessionId,
					inputFile: filename,
					outputFile: pdfFilename,
					stdout: stdout.trim()
				},
				traceId
			);

			return pdfFilename;
		} catch (error) {
			const err = error as Error & { code?: string | number; killed?: boolean; signal?: string };

			// Handle timeout
			if (err.killed || err.code === 'ETIMEDOUT') {
				logger.error(
					'Office conversion timeout',
					new Error('Conversion timeout exceeded'),
					{
						sessionId,
						filename,
						timeout: this.timeout
					},
					traceId
				);
				throw new Error('CONVERSION_TIMEOUT');
			}

			if (err.code === 'ENOENT' || String(err.code) === '127') {
				this.availabilityChecked = false;
				this.libreOfficeAvailable = false;
				logger.warn(
					'LibreOffice binary missing during conversion',
					'office.convert.libreoffice_missing',
					{
						sessionId,
						filename,
						path: this.libreOfficePath
					},
					traceId
				);
				throw new Error('LIBREOFFICE_NOT_INSTALLED');
			}

			logger.error(
				'Office conversion failed',
				err,
				{
					sessionId,
					filename
				},
				traceId
			);
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
