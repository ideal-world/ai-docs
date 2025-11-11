import { logger } from './logger.service';
import { storageService } from './storage.service';
import { modelService } from './model.service';
import type { Category } from '$lib/types/models';
import type { ModelRequest } from '$lib/types/config';

class OcrService {
	private readonly maxBytes: number;

	constructor() {
		// 32MB safety limit for OCR inputs (base64 grows by ~33%)
		this.maxBytes = 32 * 1024 * 1024;
	}

	async convertToMarkdown(
		sessionId: string,
		sourceCategory: Category,
		sourceFilename: string,
		mimeType: string,
		traceId?: string
	): Promise<string> {
		logger.logEvent(
			'ocr.start',
			'OCR markdown conversion started',
			{
				sessionId,
				sourceFile: sourceFilename,
				mimeType
			},
			traceId
		);

		const buffer = await storageService.readFile(sessionId, sourceCategory, sourceFilename);

		if (buffer.byteLength > this.maxBytes) {
			logger.warn(
				'OCR input exceeds maximum supported size',
				'ocr.input_too_large',
				{
					sessionId,
					sourceFile: sourceFilename,
					size: buffer.byteLength,
					limit: this.maxBytes
				},
				traceId
			);
			throw new Error('OCR_INPUT_TOO_LARGE');
		}

		const base64 = buffer.toString('base64');
		const modelConfig = modelService.selectModel('ocr');

		if (!modelConfig) {
			throw new Error('OCR_MODEL_NOT_CONFIGURED');
		}

		const request: ModelRequest = {
			model: modelConfig.model,
			messages: [
				{
					role: 'system',
					content:
						'You are an OCR engine. Convert provided documents to Markdown preserving structure, headings, lists, and tables. Respond with Markdown only without additional commentary.'
				},
				{
					role: 'user',
					content: `The document is provided as a base64 data URL. mimeType="${mimeType}". Extract readable content and return Markdown. Data: data:${mimeType};base64,${base64}`
				}
			]
		};

		try {
			const response = await modelService.callModel('ocr', request, traceId);
			const content = response.choices?.[0]?.message?.content?.trim() ?? '';

			logger.logEvent(
				'ocr.complete',
				'OCR markdown conversion completed',
				{
					sessionId,
					sourceFile: sourceFilename,
					mimeType,
					length: content.length
				},
				traceId
			);

			return content;
		} catch (error) {
			logger.error(
				'OCR markdown conversion failed',
				error as Error,
				{
					sessionId,
					sourceFile: sourceFilename
				},
				traceId
			);
			throw new Error('OCR_FAILED');
		}
	}
}

export const ocrService = new OcrService();
