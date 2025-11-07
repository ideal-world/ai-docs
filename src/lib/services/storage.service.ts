import fs from 'node:fs/promises';
import path from 'node:path';
import { systemConfig } from '$lib/utils/config';
import { logger } from './logger.service';

class StorageService {
	private dataDir: string;

	constructor() {
		this.dataDir = systemConfig.storage.dataDir;
	}

	/**
	 * Initialize storage directories
	 */
	async initialize(): Promise<void> {
		try {
			await fs.mkdir(this.dataDir, { recursive: true });
			logger.info('Storage service initialized', undefined, { dataDir: this.dataDir });
		} catch (error) {
			logger.error('Failed to initialize storage', undefined, { error });
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

		logger.debug('Created session directory', undefined, { sessionId, sessionDir });
	}

	/**
	 * Get file path within session
	 */
	getFilePath(sessionId: string, category: 'uploads' | 'converted' | 'results', filename: string): string {
		return path.join(this.getSessionDir(sessionId), category, filename);
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
