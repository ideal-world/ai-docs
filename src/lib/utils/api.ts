import type { ApiSuccessResponse, ApiErrorResponse, ErrorCode } from '$lib/types/api';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load message files at module initialization
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zhCN: Record<string, any> = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let enUS: Record<string, any> = {};

try {
	// In SvelteKit, messages are in the root messages/ directory
	const messagesPath = process.cwd();
	zhCN = JSON.parse(readFileSync(join(messagesPath, 'messages/zh-cn.json'), 'utf-8'));
	enUS = JSON.parse(readFileSync(join(messagesPath, 'messages/en-us.json'), 'utf-8'));
} catch (error) {
	console.warn('Could not load i18n messages for API responses:', error);
}

/**
 * Resolve i18n message key to localized string
 * T079: i18n message resolution in API responses
 */
function resolveMessage(messageKey: string, language: string = 'zh-CN'): string {
	const messages = language.toLowerCase().startsWith('en') ? enUS : zhCN;

	// Support nested keys like "upload.success" or "errors.not_found"
	const keys = messageKey.split('.');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let value: any = messages;

	for (const key of keys) {
		if (value && typeof value === 'object' && key in value) {
			value = value[key];
		} else {
			// Fallback to message key if not found
			return messageKey;
		}
	}

	return typeof value === 'string' ? value : messageKey;
}

/**
 * Create a success API response with i18n support
 * T079: Message resolution based on language preference
 */
export function createSuccessResponse<T>(
	messageKey: string,
	traceId: string,
	data?: T,
	language?: string
): ApiSuccessResponse<T> {
	return {
		success: true,
		code: 'OK',
		message: resolveMessage(messageKey, language),
		traceId,
		timestamp: new Date().toISOString(),
		data
	};
}

/**
 * Create an error API response with i18n support
 * T079: Message resolution based on language preference
 */
export function createErrorResponse(
	code: ErrorCode,
	messageKey: string,
	traceId: string,
	details?: Record<string, unknown>,
	language?: string
): ApiErrorResponse {
	return {
		success: false,
		code,
		message: resolveMessage(messageKey, language),
		traceId,
		timestamp: new Date().toISOString(),
		...(details && { details })
	};
}
