import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique trace ID for request tracking
 */
export function generateTraceId(): string {
	return uuidv4();
}
