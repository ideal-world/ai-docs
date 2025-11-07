import type { SystemConfig, ModelsConfig, ModelConfig } from '$lib/types/config';
import { env } from '$env/dynamic/private';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYAML } from 'yaml';

/**
 * Extended system config for implementation
 */
interface ExtendedSystemConfig extends SystemConfig {
	upload: SystemConfig['upload'] & {
		maxFileSize: number;
		allowedMimeTypes: string[];
		tempDir: string;
	};
	storage: SystemConfig['storage'] & {
		dataDir: string;
		sessionTTL: number;
		diskQuota: number;
	};
	server: SystemConfig['server'] & {
		port: number;
		logLevel: 'debug' | 'info' | 'warn' | 'error';
	};
	libreOffice?: {
		path: string;
		timeout: number;
	};
}

/**
 * Load system configuration from environment variables
 */
export function loadSystemConfig(): ExtendedSystemConfig {
	return {
		upload: {
			max_file_size: 100 * 1024 * 1024, // 100MB
			allowed_extensions: [
				'.jpg',
				'.jpeg',
				'.png',
				'.gif',
				'.webp',
				'.pdf',
				'.docx',
				'.xlsx',
				'.pptx',
				'.doc',
				'.xls',
				'.ppt'
			],
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
			session_ttl: 24 * 60 * 60, // 24 hours in seconds
			disk_quota: 100 * 1024 * 1024 * 1024, // 100GB
			cleanup_interval: 3600, // 1 hour
			dataDir: env.DATA_DIR || './data',
			sessionTTL: 24 * 60 * 60, // 24 hours in seconds
			diskQuota: 100 * 1024 * 1024 * 1024 // 100GB
		},
		server: {
			request_timeout: 300, // 5 minutes
			body_size_limit: 100 * 1024 * 1024, // 100MB
			port: parseInt(env.PORT || '5173'),
			logLevel: (env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info'
		},
		libreOffice: {
			path: env.LIBREOFFICE_PATH || '/usr/bin/libreoffice',
			timeout: 60 // 60 seconds
		}
	};
}

// Export singleton instance
export const systemConfig = loadSystemConfig();

/**
 * Load models configuration from YAML file
 * T085: Config loader with environment variable substitution
 */
export function loadModelsConfig(): ModelsConfig {
	try {
		const configPath = join(process.cwd(), 'config/models.yaml');
		const configContent = readFileSync(configPath, 'utf-8');

		// Replace environment variable placeholders
		const resolvedContent = configContent.replace(/\${(\w+)}/g, (_, envVar) => {
			return process.env[envVar] || '';
		});

		const config = parseYAML(resolvedContent) as ModelsConfig;

		// Validate configuration
		validateModelsConfig(config);

		return config;
	} catch (error) {
		console.error('Failed to load models configuration:', error);
		// Return minimal default configuration
		return {
			ocr: [],
			translate: [],
			qa: [],
			review: [],
			extract: [],
			settings: {
				default_timeout: 30000,
				default_max_concurrency: 5,
				retry_attempts: 3,
				retry_delay: 1000
			}
		};
	}
}

/**
 * Validate models configuration structure
 */
function validateModelsConfig(config: ModelsConfig): void {
	if (!config.settings) {
		throw new Error('Missing settings in models configuration');
	}

	const categories: Array<keyof Omit<ModelsConfig, 'settings'>> = [
		'ocr',
		'translate',
		'qa',
		'review',
		'extract'
	];

	for (const category of categories) {
		if (!Array.isArray(config[category])) {
			throw new Error(`Invalid configuration for category: ${category}`);
		}

		for (const model of config[category]) {
			validateModelConfig(model, category);
		}
	}
}

/**
 * Validate individual model configuration
 */
function validateModelConfig(model: ModelConfig, category: string): void {
	const required = ['id', 'name', 'provider', 'model', 'endpoint'];

	for (const field of required) {
		if (!(field in model)) {
			throw new Error(`Missing required field '${field}' in model configuration for ${category}`);
		}
	}

	if (typeof model.timeout !== 'number' || model.timeout <= 0) {
		throw new Error(`Invalid timeout for model ${model.id}`);
	}

	if (typeof model.max_concurrency !== 'number' || model.max_concurrency <= 0) {
		throw new Error(`Invalid max_concurrency for model ${model.id}`);
	}
}

/**
 * Get API key for a model provider from environment variables
 */
export function getApiKey(provider: string): string | undefined {
	const envMap: Record<string, string> = {
		openai: 'OPENAI_API_KEY',
		azure: 'AZURE_API_KEY',
		custom: 'CUSTOM_API_KEY'
	};

	const envVar = envMap[provider];
	return envVar ? process.env[envVar] : undefined;
}
