/**
 * Logger Service Tests
 * T146: Unit tests for core services
 *
 * Basic tests to verify logger API compatibility.
 * Full test coverage with console mocking will be added in future iterations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Logger, logger } from '$lib/services/logger.service';
import { systemConfig } from '$lib/utils/config';
import type { LogFormat } from '$lib/types/config';

describe('Logger Service', () => {
	let originalFormat: LogFormat;

	beforeEach(() => {
		originalFormat = systemConfig.server.logFormat || 'logfmt';
		logger.setLogFormat(originalFormat);
	});

	it('should have logEvent method', () => {
		expect(typeof logger.logEvent).toBe('function');
	});

	it('should have info method', () => {
		expect(typeof logger.info).toBe('function');
	});

	it('should have warn method', () => {
		expect(typeof logger.warn).toBe('function');
	});

	it('should have error method', () => {
		expect(typeof logger.error).toBe('function');
	});

	it('should not throw when logging messages', () => {
		expect(() => {
			logger.info('Test message');
			logger.warn('Test warning');
			logger.error('Test error', new Error('Test error'));
		}).not.toThrow();
	});

	it('supports logfmt output format', () => {
		const localLogger = new Logger('info', 'logfmt');
		expect(() => {
			localLogger.info('Format test', 'event.sample', { foo: 'bar baz' }, 'trace-123');
			localLogger.error('Format error', new Error('boom'), { reason: 'test' }, 'trace-456');
		}).not.toThrow();
	});

	it('can switch log format dynamically', () => {
		expect(() => {
			logger.setLogFormat('logfmt');
			logger.info('Logfmt message');
			logger.setLogFormat('json');
			logger.info('JSON message');
		}).not.toThrow();
	});
});
