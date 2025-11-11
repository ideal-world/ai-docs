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

import type { LogLevel, LogFormat } from '$lib/types/config';
import { systemConfig } from '$lib/utils/config';

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

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

const needsQuoting = (value: string): boolean => /[\s=]/.test(value) || value.includes('"');

const sanitizeValue = (value: unknown): string => {
	if (value === undefined || value === null) {
		return '';
	}

	if (typeof value === 'string') {
		return value;
	}

	if (value instanceof Error) {
		return value.message;
	}

	return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

export class Logger {
	private logLevel: LogLevel;
	private logFormat: LogFormat;

 constructor(level: LogLevel = 'info', format: LogFormat = 'logfmt') {
	this.logLevel = level;
	this.logFormat = format;
	}

	private shouldLog(level: LogLevel): boolean {
		const currentLevelIndex = LOG_LEVELS.indexOf(this.logLevel);
		const messageLevelIndex = LOG_LEVELS.indexOf(level);
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

		const logString = this.serialize(entry);

		if (entry.level === 'error') {
			console.error(logString);
		} else if (entry.level === 'warn') {
			console.warn(logString);
		} else {
			console.log(logString);
		}
	}

	private serialize(entry: LogEntry): string {
		if (this.logFormat === 'logfmt') {
			return this.formatLogFmt(entry);
		}

		return JSON.stringify(entry);
	}

	private formatLogFmt(entry: LogEntry): string {
		const parts: string[] = [];
		const push = (key: string, raw: unknown) => {
			const value = sanitizeValue(raw);
			if (!value) return;
			const escaped = value.replace(/"/g, '\\"');
			if (needsQuoting(escaped)) {
				parts.push(`${key}="${escaped}"`);
			} else {
				parts.push(`${key}=${escaped}`);
			}
		};

		push('ts', entry.timestamp);
		push('level', entry.level);
		push('event', entry.eventType);
		push('trace', entry.traceId);
		push('session', entry.sessionId);
		push('file', entry.fileId);
		push('msg_key', entry.messageKey);
		push('msg', entry.message);

		if (entry.context) {
			for (const [key, value] of Object.entries(entry.context)) {
				push(`ctx.${key}`, value);
			}
		}

		if (entry.error) {
			push('err', entry.error.message);
			push('err_code', entry.error.code);
			push('err_stack', entry.error.stack);
		}

		return parts.join(' ');
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

	setLogFormat(format: LogFormat): void {
		this.logFormat = format;
	}
}

// Singleton instance
const resolveLogLevel = (): LogLevel => {
	const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
	if (envLevel && LOG_LEVELS.includes(envLevel)) {
		return envLevel;
	}

	return systemConfig.server.logLevel || (import.meta.env.DEV ? 'debug' : 'info');
};

const resolveLogFormat = (): LogFormat => {
	const envFormat = process.env.LOG_FORMAT?.toLowerCase() as LogFormat | undefined;
	if (envFormat === 'logfmt' || envFormat === 'json') {
		return envFormat;
	}

	return systemConfig.server.logFormat || 'logfmt';
};

export const logger = new Logger(resolveLogLevel(), resolveLogFormat());
