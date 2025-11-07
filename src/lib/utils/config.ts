import type { SystemConfig } from '$lib/types/config';
import { env } from '$env/dynamic/private';

/**
 * Load system configuration from environment variables
 */
export function loadSystemConfig(): SystemConfig {
	return {
		upload: {
			maxFileSize: 100 * 1024 * 1024, // 100MB
			allowedMimeTypes: [
				// Images
				'image/jpeg',
				'image/png',
				'image/gif',
				'image/webp',
				// PDF
				'application/pdf',
				// Office documents
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				'application/msword',
				'application/vnd.ms-excel',
				'application/vnd.ms-powerpoint'
			],
			tempDir: '/tmp/ai-docs-uploads'
		},
		storage: {
			dataDir: env.DATA_DIR || './data',
			sessionTTL: 24 * 60 * 60, // 24 hours in seconds
			diskQuota: 100 * 1024 * 1024 * 1024 // 100GB
		},
		server: {
			port: parseInt(env.PORT || '5173'),
			logLevel: (env.LOG_LEVEL as SystemConfig['server']['logLevel']) || 'info'
		},
		libreOffice: {
			path: env.LIBREOFFICE_PATH || '/usr/bin/libreoffice',
			timeout: 60 // 60 seconds
		}
	};
}

// Export singleton instance
export const systemConfig = loadSystemConfig();
