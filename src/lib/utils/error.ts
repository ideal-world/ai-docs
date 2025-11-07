/**
 * Custom error class for application errors
 */
export class AppError extends Error {
	constructor(
		public code: string,
		message: string,
		public statusCode: number = 500,
		public details?: Record<string, unknown>
	) {
		super(message);
		this.name = 'AppError';
	}
}

/**
 * Handle errors and convert them to a standardized format
 */
export function handleError(error: unknown): {
	code: string;
	message: string;
	statusCode: number;
	details?: Record<string, unknown>;
} {
	if (error instanceof AppError) {
		return {
			code: error.code,
			message: error.message,
			statusCode: error.statusCode,
			details: error.details
		};
	}

	if (error instanceof Error) {
		return {
			code: 'INTERNAL_ERROR',
			message: error.message,
			statusCode: 500
		};
	}

	return {
		code: 'UNKNOWN_ERROR',
		message: 'An unknown error occurred',
		statusCode: 500
	};
}
