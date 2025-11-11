import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ModelRequest, ModelsConfig, ModelConfig } from '$lib/types/config';

const loadModelsConfigMock = vi.fn<() => ModelsConfig>();
const getApiKeyMock = vi.fn<() => string | undefined>();

vi.mock('$lib/utils/config', () => ({
	loadModelsConfig: loadModelsConfigMock,
	getApiKey: getApiKeyMock,
	systemConfig: {
		upload: {
			max_file_size: 100 * 1024 * 1024,
			allowed_extensions: ['.pdf'],
			allowedMimeTypes: ['application/pdf'],
			tempDir: '/tmp',
			maxFileSize: 100 * 1024 * 1024
		},
		storage: {
			session_ttl: 86400,
			disk_quota: 1024,
			cleanup_interval: 3600,
			dataDir: './data',
			sessionTTL: 86400,
			diskQuota: 1024
		},
		server: {
			request_timeout: 300,
			body_size_limit: 100 * 1024 * 1024,
			port: 5173,
			logLevel: 'info',
			logFormat: 'json'
		},
		libreOffice: {
			path: '/usr/bin/libreoffice',
			timeout: 60
		},
		markitdown: {
			path: 'markitdown',
			timeout: 120000
		}
	}
}));

const originalFetch = global.fetch;
const fetchMock = vi.fn();

const baseSettings: ModelsConfig['settings'] = {
	default_timeout: 30000,
	default_max_concurrency: 5,
	retry_attempts: 3,
	retry_delay: 1000
};

const baseRequest: ModelRequest = {
	model: 'gpt-4o',
	messages: [
		{
			role: 'user',
			content: 'Hello mock model'
		}
	]
};

async function instantiateService(modelConfig: ModelConfig) {
	setupMockConfig(modelConfig);
	const { ModelService } = await import('$lib/services/model.service');
	return new ModelService();
}

function setupMockConfig(modelConfig: ModelConfig): void {
	const config: ModelsConfig = {
		ocr: [],
		translate: [],
		qa: [modelConfig],
		review: [],
		extract: [],
		settings: baseSettings
	};

	vi.resetModules();
	loadModelsConfigMock.mockReturnValue(config);
	getApiKeyMock.mockReturnValue(undefined);
}

describe('ModelService mock support', () => {
	beforeEach(() => {
		fetchMock.mockReset();
		global.fetch = fetchMock as unknown as typeof fetch;
		loadModelsConfigMock.mockReset();
		getApiKeyMock.mockReset();
	});

	afterEach(() => {
		if (originalFetch) {
			global.fetch = originalFetch;
		} else {
			// @ts-expect-error - ensures cleanup when fetch was undefined
			delete global.fetch;
		}
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('returns configured mock response without calling external API', async () => {
		const modelConfig: ModelConfig = {
			id: 'qa-mock-inline',
			name: 'QA Mock Model',
			provider: 'openai',
			model: 'gpt-4o',
			endpoint: 'https://example.com/mock',
			timeout: 5000,
			max_concurrency: 5,
			enabled: true,
			mock: {
				enabled: true,
				delay: 0,
				response: {
					message: '模拟问答结果'
				}
			}
		};

		const service = await instantiateService(modelConfig);
		const result = await service.callModel('qa', baseRequest);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(result.choices[0]?.message?.content).toBe('模拟问答结果');
		expect(result.model).toBe('gpt-4o');
	});

	it('loads mock response from configured file path', async () => {
		const modelConfig: ModelConfig = {
			id: 'qa-mock-file',
			name: 'QA Mock File Model',
			provider: 'openai',
			model: 'gpt-4o',
			endpoint: 'https://example.com/mock',
			timeout: 5000,
			max_concurrency: 3,
			enabled: true,
			mock: {
				enabled: true,
				responsePath: 'sample-chat.json'
			}
		};

		const service = await instantiateService(modelConfig);
		const result = await service.callModel('qa', baseRequest);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(result.choices[0]?.message?.content).toBe('文件中的示例回复');
		expect(result.usage?.total_tokens).toBe(46);
	});

	it('respects configured mock delay before resolving', async () => {
		vi.useFakeTimers();

		const modelConfig: ModelConfig = {
			id: 'qa-mock-delay',
			name: 'QA Mock Delay Model',
			provider: 'openai',
			model: 'gpt-4o',
			endpoint: 'https://example.com/mock',
			timeout: 5000,
			max_concurrency: 2,
			enabled: true,
			mock: {
				enabled: true,
				delay: 1000,
				response: {
					message: '延时后的模拟结果'
				}
			}
		};

		const service = await instantiateService(modelConfig);
		const promise = service.callModel('qa', baseRequest);
		let resolved = false;
		promise.then(() => {
			resolved = true;
		});

		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(999);
		await Promise.resolve();
		expect(resolved).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		const result = await promise;

		expect(resolved).toBe(true);
		expect(result.choices[0]?.message?.content).toBe('延时后的模拟结果');
	});
});
