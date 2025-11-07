/**
 * Logger Service Tests
 * T146: Unit tests for core services
 *
 * Basic tests to verify logger API compatibility.
 * Full test coverage with console mocking will be added in future iterations.
 */

import { describe, it, expect } from 'vitest';
import { logger } from '$lib/services/logger.service';

describe('Logger Service', () => {
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
});
