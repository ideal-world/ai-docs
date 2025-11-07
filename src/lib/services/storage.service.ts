import fs from 'node:fs/promises';
import path from 'node:path';
import { systemConfig } from '$lib/utils/config';
import { logger } from './logger.service';
import type { Category } from '$lib/types/models';

class StorageService {
	private dataDir: string;

	constructor() {
		this.dataDir = systemConfig.storage.dataDir || './data';
	}

	/**
	 * Initialize storage directories
	 */
	async initialize(): Promise<void> {
		try {
			await fs.mkdir(this.dataDir, { recursive: true });
			logger.info('Storage service initialized', 'storage.init', { dataDir: this.dataDir });
		} catch (error) {
			logger.error('Failed to initialize storage', error as Error, { dataDir: this.dataDir });
			throw error;
		}
	}

	/**
	 * Get session directory path
	 */
	getSessionDir(sessionId: string): string {
		return path.join(this.dataDir, sessionId);
	}

	/**
	 * Create session directory structure
	 */
	async createSessionDir(sessionId: string): Promise<void> {
		const sessionDir = this.getSessionDir(sessionId);
		const subdirs = ['uploads', 'converted', 'results'];

		await fs.mkdir(sessionDir, { recursive: true });

		for (const subdir of subdirs) {
			await fs.mkdir(path.join(sessionDir, subdir), { recursive: true });
		}

		logger.logEvent('storage.session.created', 'Created session directory', {
			sessionId,
			sessionDir
		});
	}

	/**
	 * Get file path within session
	 */
	getFilePath(sessionId: string, category: Category, filename: string): string {
		return path.join(this.getSessionDir(sessionId), category, filename);
	}

	/**
	 * Save file to storage
	 */
	async saveFile(
		sessionId: string,
		category: Category,
		filename: string,
		data: Buffer | Uint8Array
	): Promise<string> {
		const filePath = this.getFilePath(sessionId, category, filename);

		// Ensure directory exists
		await fs.mkdir(path.dirname(filePath), { recursive: true });

		// Write file
		await fs.writeFile(filePath, data);

		logger.logEvent('storage.file.saved', 'File saved', {
			sessionId,
			category,
			filename,
			size: data.length
		});

		return filePath;
	}

	/**
	 * Read file from storage
	 */
	async readFile(sessionId: string, category: Category, filename: string): Promise<Buffer> {
		const filePath = this.getFilePath(sessionId, category, filename);
		return await fs.readFile(filePath);
	}

	/**
	 * Delete file from storage
	 */
	async deleteFile(sessionId: string, category: Category, filename: string): Promise<void> {
		const filePath = this.getFilePath(sessionId, category, filename);
		try {
			await fs.unlink(filePath);
			logger.logEvent('storage.file.deleted', 'File deleted', { sessionId, category, filename });
		} catch (error) {
			logger.warn('Failed to delete file', 'storage.file.delete.failed', {
				sessionId,
				category,
				filename,
				error: (error as Error).message
			});
		}
	}

	/**
	 * Cleanup old sessions (TTL expired)
	 */
	async cleanupExpiredSessions(): Promise<void> {
		try {
			const sessions = await fs.readdir(this.dataDir);
			const now = Date.now();
			const ttl = systemConfig.storage.session_ttl * 1000; // Convert to ms

			for (const sessionId of sessions) {
				const sessionDir = this.getSessionDir(sessionId);
				const stats = await fs.stat(sessionDir);

				// Check if session is expired
				if (now - stats.mtimeMs > ttl) {
					await fs.rm(sessionDir, { recursive: true, force: true });
					logger.info('Cleaned up expired session', 'storage.cleanup', { sessionId });
				}
			}
		} catch (error) {
			logger.error('Failed to cleanup expired sessions', error as Error, {});
		}
	}

	/**
	 * Get file size
	 */
	async getFileSize(sessionId: string, category: Category, filename: string): Promise<number> {
		const filePath = this.getFilePath(sessionId, category, filename);
		const stats = await fs.stat(filePath);
		return stats.size;
	}

	/**
	 * List files in category
	 */
	async listFiles(sessionId: string, category: Category): Promise<string[]> {
		const categoryDir = path.join(this.getSessionDir(sessionId), category);
		try {
			return await fs.readdir(categoryDir);
		} catch {
			return [];
		}
	}

	/**
	 * Check if directory exists
	 */
	async dirExists(dirPath: string): Promise<boolean> {
		try {
			const stats = await fs.stat(dirPath);
			return stats.isDirectory();
		} catch {
			return false;
		}
	}

	/**
	 * Check if file exists
	 */
	async fileExists(filePath: string): Promise<boolean> {
		try {
			const stats = await fs.stat(filePath);
			return stats.isFile();
		} catch {
			return false;
		}
	}
}

// Export singleton instance
export const storageService = new StorageService();
