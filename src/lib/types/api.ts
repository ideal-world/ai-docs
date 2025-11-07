// API Response Types
export interface ApiSuccessResponse<T = unknown> {
	success: true;
	data: T;
	traceId: string;
	timestamp: string;
}

export interface ApiErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	};
	traceId: string;
	timestamp: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
