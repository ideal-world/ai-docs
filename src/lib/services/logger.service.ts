/**
 * Structured Logger Service
 * JSON-formatted logging with traceId, levels, event types, and context
 *
 * T080: Log file rotation configuration
 * TODO: In production, implement file-based logging with rotation:
 * - Daily rotation (logs/app-YYYY-MM-DD.log)
 * - Max file size: 100MB
 * - Keep 30 days of logs
 * - Auto-compression of old logs (gzip)
 * - Use winston or pino with rotating-file-stream
 *
 * Example with winston:
 * ```typescript
 * import winston from 'winston';
 * import DailyRotateFile from 'winston-daily-rotate-file';
 *
 * const transport = new DailyRotateFile({
 *   filename: 'logs/app-%DATE%.log',
 *   datePattern: 'YYYY-MM-DD',
 *   maxSize: '100m',
 *   maxFiles: '30d',
 *   zippedArchive: true
 * });
 * ```
 */

import type { LogLevel } from '$lib/types/config';

export interface LogEntry {
	timestamp: string; // ISO 8601
	level: LogLevel;
	eventType?: string;
	traceId?: string;
	sessionId?: string;
	fileId?: string;
	messageKey?: string; // i18n key
	message: string;
	context?: Record<string, unknown>;
	error?: {
		message: string;
		stack?: string;
		code?: string;
	};
}

class Logger {
	private logLevel: LogLevel;

	constructor(level: LogLevel = 'info') {
		this.logLevel = level;
	}

	private shouldLog(level: LogLevel): boolean {
		const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
		const currentLevelIndex = levels.indexOf(this.logLevel);
		const messageLevelIndex = levels.indexOf(level);
		return messageLevelIndex >= currentLevelIndex;
	}

	private formatEntry(entry: Partial<LogEntry>): LogEntry {
		return {
			timestamp: new Date().toISOString(),
			level: entry.level || 'info',
			eventType: entry.eventType,
			traceId: entry.traceId,
			sessionId: entry.sessionId,
			fileId: entry.fileId,
			messageKey: entry.messageKey,
			message: entry.message || '',
			context: entry.context,
			error: entry.error
		};
	}

	private writeLog(entry: LogEntry): void {
		if (!this.shouldLog(entry.level)) return;

		// In production, write to file. In development, use console
		const logString = JSON.stringify(entry);

		if (entry.level === 'error') {
			console.error(logString);
		} else if (entry.level === 'warn') {
			console.warn(logString);
		} else {
			console.log(logString);
		}
	}

	debug(message: string, context?: Record<string, unknown>, traceId?: string): void {
		this.writeLog(
			this.formatEntry({
				level: 'debug',
				message,
				context,
				traceId
			})
		);
	}

	info(
		message: string,
		eventType?: string,
		context?: Record<string, unknown>,
		traceId?: string
	): void {
		this.writeLog(
			this.formatEntry({
				level: 'info',
				eventType,
				message,
				context,
				traceId
			})
		);
	}

	warn(
		message: string,
		eventType?: string,
		context?: Record<string, unknown>,
		traceId?: string
	): void {
		this.writeLog(
			this.formatEntry({
				level: 'warn',
				eventType,
				message,
				context,
				traceId
			})
		);
	}

	error(message: string, error: Error, context?: Record<string, unknown>, traceId?: string): void {
		this.writeLog(
			this.formatEntry({
				level: 'error',
				eventType: 'error',
				message,
				context,
				traceId,
				error: {
					message: error.message,
					stack: error.stack,
					code: (error as { code?: string }).code
				}
			})
		);
	}

	// Convenience methods for common events
	logEvent(
		eventType: string,
		message: string,
		context?: Record<string, unknown>,
		traceId?: string
	): void {
		this.info(message, eventType, context, traceId);
	}

	setLogLevel(level: LogLevel): void {
		this.logLevel = level;
	}
}

// Singleton instance
export const logger = new Logger(
	(process.env.LOG_LEVEL as LogLevel) || (import.meta.env.DEV ? 'debug' : 'info')
);
