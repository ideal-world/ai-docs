import type { ApiSuccessResponse, ApiErrorResponse } from '$lib/types/api';

/**
 * Create a success API response
 */
export function createSuccessResponse<T>(
	data: T,
	traceId: string
): ApiSuccessResponse<T> {
	return {
		success: true,
		data,
		traceId,
		timestamp: new Date().toISOString()
	};
}

/**
 * Create an error API response
 */
export function createErrorResponse(
	code: string,
	message: string,
	traceId: string,
	details?: Record<string, unknown>
): ApiErrorResponse {
	return {
		success: false,
		error: {
			code,
			message,
			...(details && { details })
		},
		traceId,
		timestamp: new Date().toISOString()
	};
}
