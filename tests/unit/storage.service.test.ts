/**
 * Storage Service Tests
 * 测试文件存储服务的核心功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storageService } from '$lib/services/storage.service';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

describe('Storage Service', () => {
	const testSessionId = 'test-session-123';
	const testDataDir = './data';

	beforeEach(async () => {
		// 清理测试会话目录
		try {
			const sessionPath = join(testDataDir, testSessionId);
			await fs.rm(sessionPath, { recursive: true, force: true });
		} catch {
			// 忽略错误
		}
	});

	afterEach(async () => {
		// 清理测试会话目录
		try {
			const sessionPath = join(testDataDir, testSessionId);
			await fs.rm(sessionPath, { recursive: true, force: true });
		} catch {
			// 忽略错误
		}
	});

	describe('createSessionDir', () => {
		it('should create session directory structure', async () => {
			await storageService.createSessionDir(testSessionId);

			const sessionPath = join(testDataDir, testSessionId);
			const uploadsPath = join(sessionPath, 'uploads');
			const convertedPath = join(sessionPath, 'converted');
			const resultsPath = join(sessionPath, 'results');

			// 验证目录是否创建
			const sessionStat = await fs.stat(sessionPath);
			expect(sessionStat.isDirectory()).toBe(true);

			const uploadsStat = await fs.stat(uploadsPath);
			expect(uploadsStat.isDirectory()).toBe(true);

			const convertedStat = await fs.stat(convertedPath);
			expect(convertedStat.isDirectory()).toBe(true);

			const resultsStat = await fs.stat(resultsPath);
			expect(resultsStat.isDirectory()).toBe(true);
		});

		it('should not fail if directory already exists', async () => {
			await storageService.createSessionDir(testSessionId);
			// 再次创建不应该抛出错误
			await expect(storageService.createSessionDir(testSessionId)).resolves.not.toThrow();
		});
	});

	describe('saveFile', () => {
		it('should save file to correct path', async () => {
			await storageService.createSessionDir(testSessionId);

			const testContent = Buffer.from('Test file content');
			const filename = 'test-file.txt';

			const savedPath = await storageService.saveFile(
				testSessionId,
				'uploads',
				filename,
				testContent
			);

			// 验证文件路径格式
			expect(savedPath).toContain(testSessionId);
			expect(savedPath).toContain('uploads');
			expect(savedPath).toContain(filename);

			// 验证文件内容
			const content = await fs.readFile(savedPath);
			expect(content.toString()).toBe('Test file content');
		});

		it('should save files to different categories', async () => {
			await storageService.createSessionDir(testSessionId);

			const testContent = Buffer.from('Test content');

			const uploadsPath = await storageService.saveFile(
				testSessionId,
				'uploads',
				'file1.txt',
				testContent
			);
			const convertedPath = await storageService.saveFile(
				testSessionId,
				'converted',
				'file2.txt',
				testContent
			);
			const resultsPath = await storageService.saveFile(
				testSessionId,
				'results',
				'file3.txt',
				testContent
			);

			expect(uploadsPath).toContain('uploads');
			expect(convertedPath).toContain('converted');
			expect(resultsPath).toContain('results');
		});
	});

	describe('getFilePath', () => {
		it('should generate correct file paths', () => {
			const path = storageService.getFilePath(testSessionId, 'uploads', 'test.pdf');

			expect(path).toContain(testSessionId);
			expect(path).toContain('uploads');
			expect(path).toContain('test.pdf');
		});
	});

	describe('deleteFile', () => {
		it('should delete existing file', async () => {
			await storageService.createSessionDir(testSessionId);

			const testContent = Buffer.from('Test content');
			const savedPath = await storageService.saveFile(
				testSessionId,
				'uploads',
				'delete-test.txt',
				testContent
			);

			// 验证文件存在
			await expect(fs.access(savedPath)).resolves.not.toThrow();

			// 删除文件
			await storageService.deleteFile(testSessionId, 'uploads', 'delete-test.txt');

			// 验证文件已删除
			await expect(fs.access(savedPath)).rejects.toThrow();
		});

		it('should not fail when deleting non-existent file', async () => {
			await expect(
				storageService.deleteFile(testSessionId, 'uploads', 'non-existent.txt')
			).resolves.not.toThrow();
		});
	});

	describe('listFiles', () => {
		it('should list files in category', async () => {
			await storageService.createSessionDir(testSessionId);

			const testContent = Buffer.from('Test content');
			await storageService.saveFile(testSessionId, 'uploads', 'file1.txt', testContent);
			await storageService.saveFile(testSessionId, 'uploads', 'file2.txt', testContent);

			const files = await storageService.listFiles(testSessionId, 'uploads');

			expect(files).toHaveLength(2);
			expect(files).toContain('file1.txt');
			expect(files).toContain('file2.txt');
		});

		it('should return empty array for non-existent category', async () => {
			const files = await storageService.listFiles(testSessionId, 'uploads');

			expect(files).toEqual([]);
		});
	});

	describe('getFileSize', () => {
		it('should return correct file size', async () => {
			await storageService.createSessionDir(testSessionId);

			const testContent = Buffer.from('A'.repeat(1000)); // 1000 bytes
			await storageService.saveFile(testSessionId, 'uploads', 'test-size.txt', testContent);

			const size = await storageService.getFileSize(testSessionId, 'uploads', 'test-size.txt');

			expect(size).toBe(1000);
		});
	});
});
