/**
 * Configuration Types
 * System and model configuration interfaces
 */

// System Configuration
export interface SystemConfig {
	upload: {
		max_file_size: number; // in bytes
		allowed_extensions: string[];
	};
	storage: {
		session_ttl: number; // in seconds
		disk_quota: number; // in bytes
		cleanup_interval: number; // in seconds
	};
	server: {
		request_timeout: number; // in seconds
		body_size_limit: number; // in bytes
	};
	conversion?: {
		timeout: number; // in seconds
		max_concurrent: number;
	};
}

// Model Configuration
// T084: Enhanced ModelConfig types
export type ModelCategory = 'ocr' | 'translate' | 'qa' | 'review' | 'extract';
export type ModelProvider = 'openai' | 'azure' | 'custom';

export interface ModelConfig {
	id: string;
	name: string;
	provider: ModelProvider;
	model: string;
	endpoint: string;
	timeout: number; // milliseconds
	max_concurrency: number;
	enabled: boolean;
}

export interface ModelSettings {
	default_timeout: number;
	default_max_concurrency: number;
	retry_attempts: number;
	retry_delay: number;
}

export interface ModelsConfig {
	ocr: ModelConfig[];
	translate: ModelConfig[];
	qa: ModelConfig[];
	review: ModelConfig[];
	extract: ModelConfig[];
	settings: ModelSettings;
}

export interface ModelRequest {
	model: string;
	messages: Array<{
		role: 'system' | 'user' | 'assistant';
		content: string;
	}>;
	temperature?: number;
	max_tokens?: number;
	stream?: boolean;
}

export interface ModelResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: {
			role: string;
			content: string;
		};
		finish_reason: string;
	}>;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface QueuedRequest {
	id: string;
	category: ModelCategory;
	request: ModelRequest;
	timestamp: Date;
	resolve: (value: ModelResponse) => void;
	reject: (reason: Error) => void;
}

// Environment Configuration
export interface EnvironmentConfig {
	port: number;
	logLevel: LogLevel;
	dataDir: string;
	libreOfficePath?: string;
	apiKeys?: Record<string, string>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
