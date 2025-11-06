import { systemConfig } from '$lib/utils/config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	traceId?: string;
	data?: Record<string, unknown>;
}

class Logger {
	private logLevel: LogLevel;

	constructor() {
		this.logLevel = systemConfig.server.logLevel;
	}

	private shouldLog(level: LogLevel): boolean {
		const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
		return levels.indexOf(level) >= levels.indexOf(this.logLevel);
	}

	private formatLog(entry: LogEntry): string {
		return JSON.stringify(entry);
	}

	private log(level: LogLevel, message: string, traceId?: string, data?: Record<string, unknown>) {
		if (!this.shouldLog(level)) {
			return;
		}

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			...(traceId && { traceId }),
			...(data && { data })
		};

		const formatted = this.formatLog(entry);

		switch (level) {
			case 'debug':
			case 'info':
				console.log(formatted);
				break;
			case 'warn':
				console.warn(formatted);
				break;
			case 'error':
				console.error(formatted);
				break;
		}
	}

	debug(message: string, traceId?: string, data?: Record<string, unknown>) {
		this.log('debug', message, traceId, data);
	}

	info(message: string, traceId?: string, data?: Record<string, unknown>) {
		this.log('info', message, traceId, data);
	}

	warn(message: string, traceId?: string, data?: Record<string, unknown>) {
		this.log('warn', message, traceId, data);
	}

	error(message: string, traceId?: string, data?: Record<string, unknown>) {
		this.log('error', message, traceId, data);
	}
}

// Export singleton instance
export const logger = new Logger();
