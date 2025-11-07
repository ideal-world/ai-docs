/**
 * Cleanup Service
 * T099-T106: Session TTL tracking and automatic cleanup scheduler
 */

import { fileRegistry } from '../server/file-registry';
import { taskRegistry } from '../server/task-registry';
import { logger } from './logger.service';
import { promises as fs } from 'fs';
import { join } from 'path';

class CleanupService {
	private cleanupInterval: NodeJS.Timeout | null = null;
	private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
	private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

	/**
	 * T107: Initialize cleanup scheduler on server startup
	 */
	start(): void {
		if (this.cleanupInterval) {
			logger.warn('Cleanup scheduler already running', 'cleanup.start.already_running');
			return;
		}

		logger.info('Starting cleanup scheduler', 'cleanup.start', {
			ttl: this.DEFAULT_TTL,
			interval: this.CLEANUP_INTERVAL
		});

		// Run cleanup immediately on startup
		this.runCleanup();

		// Schedule periodic cleanup
		this.cleanupInterval = setInterval(() => {
			this.runCleanup();
		}, this.CLEANUP_INTERVAL);
	}

	/**
	 * Stop cleanup scheduler
	 */
	stop(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
			logger.info('Cleanup scheduler stopped', 'cleanup.stop');
		}
	}

	/**
	 * T099-T106: Run cleanup process
	 * Check all sessions, delete expired ones
	 */
	private async runCleanup(): Promise<void> {
		const startTime = Date.now();
		logger.info('Running cleanup process', 'cleanup.run.start');

		try {
			const dataDir = './data';

			// Get all session directories
			const sessions = await fs.readdir(dataDir);

			let deletedSessions = 0;
			let deletedFiles = 0;
			let freedSpace = 0;

			for (const sessionId of sessions) {
				const sessionPath = join(dataDir, sessionId);
				const stat = await fs.stat(sessionPath);

				if (!stat.isDirectory()) continue;

				// T098: Check TTL - session creation time vs current time
				const sessionAge = Date.now() - stat.mtime.getTime();

				if (sessionAge > this.DEFAULT_TTL) {
					// T103: Session expired, cleanup files
					logger.info('Session expired, cleaning up', 'cleanup.session.expired', {
						sessionId,
						ageHours: Math.floor(sessionAge / (60 * 60 * 1000)),
						ttlHours: Math.floor(this.DEFAULT_TTL / (60 * 60 * 1000))
					});

					// T100: Delete files and calculate freed space
					const sessionSize = await this.calculateDirectorySize(sessionPath);
					const filesDeleted = await this.deleteSession(sessionId, sessionPath);

					deletedSessions++;
					deletedFiles += filesDeleted;
					freedSpace += sessionSize;

					// T106: Log cleanup details
					logger.info('Session cleanup complete', 'cleanup.session.complete', {
						sessionId,
						filesDeleted,
						freedSpaceKB: Math.floor(freedSpace / 1024)
					});
				}
			}

			const duration = Date.now() - startTime;

			// T106: Log cleanup summary
			logger.logEvent('cleanup.run.complete', 'Cleanup process complete', {
				duration,
				deletedSessions,
				deletedFiles,
				freedSpaceMB: Math.floor(freedSpace / (1024 * 1024))
			});
		} catch (error) {
			logger.error('Cleanup process failed', error as Error, {});
		}
	}

	/**
	 * T100: Delete session and all its files
	 */
	private async deleteSession(sessionId: string, sessionPath: string): Promise<number> {
		let filesDeleted = 0;

		try {
			// Clean up in-memory registries
			// Get all files for this session from registry
			const files = fileRegistry.listBySession(sessionId);
			for (const file of files) {
				fileRegistry.delete(file.id);
				filesDeleted++;
			}

			// Clean up tasks for this session
			taskRegistry.cleanupSession(sessionId);

			// T100: Delete directory recursively
			await fs.rm(sessionPath, { recursive: true, force: true });

			logger.info('Session deleted', 'cleanup.session.deleted', {
				sessionId,
				filesDeleted
			});
		} catch (error) {
			logger.error('Failed to delete session', error as Error, { sessionId });
		}

		return filesDeleted;
	}

	/**
	 * Calculate total size of directory (recursive)
	 */
	private async calculateDirectorySize(dirPath: string): Promise<number> {
		let totalSize = 0;

		try {
			const files = await fs.readdir(dirPath, { withFileTypes: true });

			for (const file of files) {
				const filePath = join(dirPath, file.name);

				if (file.isDirectory()) {
					totalSize += await this.calculateDirectorySize(filePath);
				} else {
					const stat = await fs.stat(filePath);
					totalSize += stat.size;
				}
			}
		} catch (error) {
			logger.error('Failed to calculate directory size', error as Error, { dirPath });
		}

		return totalSize;
	}

	/**
	 * T101: Get total disk usage across all sessions
	 */
	async getTotalDiskUsage(): Promise<number> {
		const dataDir = './data';
		return this.calculateDirectorySize(dataDir);
	}

	/**
	 * T102: Check if upload would exceed quota
	 */
	async checkQuota(
		fileSize: number,
		quotaLimit: number = 100 * 1024 * 1024 * 1024
	): Promise<boolean> {
		const currentUsage = await this.getTotalDiskUsage();
		return currentUsage + fileSize <= quotaLimit;
	}

	/**
	 * Manual cleanup trigger (for testing/admin)
	 */
	async triggerCleanup(): Promise<void> {
		logger.info('Manual cleanup triggered', 'cleanup.manual');
		await this.runCleanup();
	}
}

// Singleton instance
export const cleanupService = new CleanupService();
