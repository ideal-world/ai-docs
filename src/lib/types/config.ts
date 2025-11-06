// System Configuration
export interface SystemConfig {
	upload: {
		maxFileSize: number; // in bytes
		allowedMimeTypes: string[];
		tempDir: string;
	};
	storage: {
		dataDir: string;
		sessionTTL: number; // in seconds
		diskQuota: number; // in bytes
	};
	server: {
		port: number;
		logLevel: 'debug' | 'info' | 'warn' | 'error';
	};
	libreOffice: {
		path: string;
		timeout: number; // in seconds
	};
}

// Model Configuration
export type ModelCategory = 'ocr' | 'translate' | 'qa' | 'review' | 'extract';

export interface ModelConfig {
	id: string;
	name: string;
	category: ModelCategory;
	endpoint: string;
	apiKey?: string;
	timeout: number; // in seconds
	maxConcurrency: number;
	enabled: boolean;
}
