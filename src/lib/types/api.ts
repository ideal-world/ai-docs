/**
 * API Response Types
 * Unified response format for all API endpoints
 */

export interface ApiSuccessResponse<T = unknown> {
	success: true;
	code: 'OK';
	message: string; // i18n key
	timestamp: string; // ISO 8601
	traceId: string; // UUID v4
	data?: T;
}

export interface ApiErrorResponse {
	success: false;
	code: ErrorCode;
	message: string; // i18n key
	timestamp: string; // ISO 8601
	traceId: string; // UUID v4
	details?: Record<string, unknown>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Error Codes
 */
export type ErrorCode =
	| 'VALIDATION_ERROR'
	| 'UNSUPPORTED_FILE'
	| 'CONVERSION_FAILED'
	| 'FILE_NOT_FOUND'
	| 'UPLOAD_FAILED'
	| 'TASK_NOT_FOUND'
	| 'INTERNAL_ERROR'
	| 'TIMEOUT_ERROR'
	| 'QUOTA_EXCEEDED'
	| 'SESSION_EXPIRED'
	| 'INVALID_CONTENT_TYPE'
	| 'INVALID_FILE_TYPE'
	| 'FILE_TOO_LARGE'
	| 'UNAUTHORIZED'
	| 'NOT_FOUND';

/**
 * HTTP Request/Response Types
 */
export interface RequestContext {
	traceId: string;
	language: string;
	timestamp: Date;
	path: string;
	method: string;
}
