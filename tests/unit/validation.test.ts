/**
 * Validation Utilities Tests
 * 测试验证工具函数
 */

import { describe, it, expect } from 'vitest';
import { validateFileType, validateFileSize, isValidUUID } from '$lib/utils/validation';

describe('Validation Utilities', () => {
	describe('validateFileType', () => {
		it('should identify image MIME types correctly', () => {
			expect(validateFileType('image/png')).toBe('image');
			expect(validateFileType('image/jpeg')).toBe('image');
			expect(validateFileType('image/jpg')).toBe('image');
			expect(validateFileType('image/webp')).toBe('image');
		});

		it('should identify PDF MIME type correctly', () => {
			expect(validateFileType('application/pdf')).toBe('pdf');
		});

		it('should identify Office MIME types correctly', () => {
			expect(
				validateFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
			).toBe('office');
			expect(
				validateFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
			).toBe('office');
			expect(
				validateFileType(
					'application/vnd.openxmlformats-officedocument.presentationml.presentation'
				)
			).toBe('office');
		});

		it('should return null for invalid MIME types', () => {
			expect(validateFileType('text/plain')).toBeNull();
			expect(validateFileType('application/json')).toBeNull();
			expect(validateFileType('video/mp4')).toBeNull();
			expect(validateFileType('')).toBeNull();
		});
	});

	describe('validateFileSize', () => {
		it('should accept files within limit', () => {
			const maxSize = 10 * 1024 * 1024; // 10MB

			expect(validateFileSize(1024, maxSize)).toBe(true); // 1KB
			expect(validateFileSize(1024 * 1024, maxSize)).toBe(true); // 1MB
			expect(validateFileSize(5 * 1024 * 1024, maxSize)).toBe(true); // 5MB
			expect(validateFileSize(maxSize, maxSize)).toBe(true); // exactly max
		});

		it('should reject files exceeding limit', () => {
			const maxSize = 10 * 1024 * 1024; // 10MB

			expect(validateFileSize(maxSize + 1, maxSize)).toBe(false);
			expect(validateFileSize(20 * 1024 * 1024, maxSize)).toBe(false);
		});

		it('should reject negative or zero sizes', () => {
			const maxSize = 10 * 1024 * 1024;

			expect(validateFileSize(0, maxSize)).toBe(false);
			expect(validateFileSize(-1, maxSize)).toBe(false);
		});
	});

	describe('isValidUUID', () => {
		it('should validate correct UUID format', () => {
			// 使用实际的UUID v4格式（注意第3组必须以4开头，第4组必须以8/9/a/b开头）
			const validUUIDs = [
				'550e8400-e29b-41d4-a716-446655440000',
				'f47ac10b-58cc-4372-a567-0e02b2c3d479',
				'6ba7b814-9dad-41d1-80b4-00c04fd430c8'
			];

			validUUIDs.forEach((uuid) => {
				expect(isValidUUID(uuid)).toBe(true);
			});
		});

		it('should reject invalid UUID formats', () => {
			const invalidUUIDs = [
				'not-a-uuid',
				'550e8400-e29b-41d4-a716', // too short
				'550e8400-e29b-41d4-a716-446655440000-extra', // too long
				'550e8400e29b41d4a716446655440000', // missing dashes
				'',
				'ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ' // invalid characters
			];

			invalidUUIDs.forEach((uuid) => {
				expect(isValidUUID(uuid)).toBe(false);
			});
		});
	});
});
