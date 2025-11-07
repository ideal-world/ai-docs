/**
 * Model Service
 * T086-T091: OpenAI-compatible model adapter with timeout, concurrency, and queue management
 */

import type {
	ModelCategory,
	ModelConfig,
	ModelsConfig,
	ModelRequest,
	ModelResponse,
	QueuedRequest
} from '$lib/types/config';
import { loadModelsConfig, getApiKey } from '$lib/utils/config';
import { logger } from './logger.service';
import { v4 as uuidv4 } from 'uuid';

class ModelService {
	private config: ModelsConfig;
	private queues: Map<string, QueuedRequest[]> = new Map();
	private activeRequests: Map<string, number> = new Map();

	constructor() {
		this.config = loadModelsConfig();
		logger.info('Model service initialized', 'model.service.init', {
			categoriesLoaded: Object.keys(this.config).filter((k) => k !== 'settings').length
		});
	}

	/**
	 * T086: Select model by category
	 * Get first enabled model for the specified category
	 */
	selectModel(category: ModelCategory): ModelConfig | null {
		const models = this.config[category];
		if (!models || models.length === 0) {
			logger.warn('No models configured for category', 'model.select.missing', { category });
			return null;
		}

		const enabledModel = models.find((m) => m.enabled);
		if (!enabledModel) {
			logger.warn('No enabled models for category', 'model.select.disabled', { category });
			return null;
		}

		return enabledModel;
	}

	/**
	 * T087-T091: Call model with OpenAI adapter, timeout, concurrency, and queue
	 * Makes an API call to the selected model with full error handling
	 */
	async callModel(
		category: ModelCategory,
		request: ModelRequest,
		traceId?: string
	): Promise<ModelResponse> {
		const model = this.selectModel(category);
		if (!model) {
			throw new Error(`No available model for category: ${category}`);
		}

		// T089: Check concurrency limit
		const activeCount = this.activeRequests.get(model.id) || 0;
		if (activeCount >= model.max_concurrency) {
			// T090: Queue the request
			logger.info(
				'Model at concurrency limit, queuing request',
				'model.queue.add',
				{
					modelId: model.id,
					category,
					activeCount,
					limit: model.max_concurrency
				},
				traceId
			);

			return this.queueRequest(model.id, category, request);
		}

		// Execute request
		return this.executeRequest(model, category, request, traceId);
	}

	/**
	 * T090: Queue request with position tracking
	 */
	private queueRequest(
		modelId: string,
		category: ModelCategory,
		request: ModelRequest
	): Promise<ModelResponse> {
		return new Promise((resolve, reject) => {
			const queuedRequest: QueuedRequest = {
				id: uuidv4(),
				category,
				request,
				timestamp: new Date(),
				resolve,
				reject
			};

			const queue = this.queues.get(modelId) || [];
			queue.push(queuedRequest);
			this.queues.set(modelId, queue);

			logger.info('Request queued', 'model.queue.position', {
				modelId,
				category,
				requestId: queuedRequest.id,
				position: queue.length
			});
		});
	}

	/**
	 * Process next request from queue
	 */
	private async processQueue(modelId: string): Promise<void> {
		const queue = this.queues.get(modelId) || [];
		if (queue.length === 0) return;

		const model = this.findModelById(modelId);
		if (!model) return;

		const activeCount = this.activeRequests.get(modelId) || 0;
		if (activeCount >= model.max_concurrency) return;

		const queuedRequest = queue.shift();
		if (!queuedRequest) return;

		this.queues.set(modelId, queue);

		logger.info('Processing queued request', 'model.queue.process', {
			modelId,
			requestId: queuedRequest.id,
			remainingInQueue: queue.length
		});

		try {
			const response = await this.executeRequest(
				model,
				queuedRequest.category,
				queuedRequest.request
			);
			queuedRequest.resolve(response);
		} catch (error) {
			queuedRequest.reject(error as Error);
		}
	}

	/**
	 * T087-T089: Execute request with OpenAI adapter and timeout
	 */
	private async executeRequest(
		model: ModelConfig,
		category: ModelCategory,
		request: ModelRequest,
		traceId?: string
	): Promise<ModelResponse> {
		// Increment active request count
		const activeCount = (this.activeRequests.get(model.id) || 0) + 1;
		this.activeRequests.set(model.id, activeCount);

		logger.info(
			'Executing model request',
			'model.request.start',
			{
				modelId: model.id,
				category,
				provider: model.provider,
				activeRequests: activeCount
			},
			traceId
		);

		try {
			// T088: Create abort controller for timeout
			const abortController = new AbortController();
			const timeoutId = setTimeout(() => {
				abortController.abort();
			}, model.timeout);

			// T087: Format request for OpenAI-compatible API
			const apiKey = getApiKey(model.provider);
			if (!apiKey && model.provider === 'openai') {
				throw new Error('Missing API key for OpenAI provider');
			}

			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};

			if (apiKey) {
				headers['Authorization'] = `Bearer ${apiKey}`;
			}

			const response = await fetch(model.endpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify(request),
				signal: abortController.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Model API error: ${response.status} - ${errorText}`);
			}

			const result = (await response.json()) as ModelResponse;

			logger.info(
				'Model request completed',
				'model.request.complete',
				{
					modelId: model.id,
					category,
					tokensUsed: result.usage?.total_tokens || 0
				},
				traceId
			);

			return result;
		} catch (error) {
			// T091: Error handling for model calls
			logger.error(
				'Model request failed',
				error as Error,
				{
					modelId: model.id,
					category,
					provider: model.provider
				},
				traceId
			);

			throw error;
		} finally {
			// Decrement active request count
			const newCount = (this.activeRequests.get(model.id) || 1) - 1;
			this.activeRequests.set(model.id, Math.max(0, newCount));

			// Process next queued request
			this.processQueue(model.id);
		}
	}

	/**
	 * Find model by ID across all categories
	 */
	private findModelById(modelId: string): ModelConfig | null {
		const categories: ModelCategory[] = ['ocr', 'translate', 'qa', 'review', 'extract'];
		for (const category of categories) {
			const model = this.config[category].find((m) => m.id === modelId);
			if (model) return model;
		}
		return null;
	}

	/**
	 * T092: Reload configuration from file
	 */
	reloadConfig(): void {
		this.config = loadModelsConfig();
		logger.info('Model configuration reloaded', 'model.config.reload', {
			timestamp: new Date().toISOString()
		});
	}

	/**
	 * T093: Check availability of all enabled models
	 */
	async checkAvailability(): Promise<Record<ModelCategory, boolean>> {
		const categories: ModelCategory[] = ['ocr', 'translate', 'qa', 'review', 'extract'];
		const availability: Record<ModelCategory, boolean> = {
			ocr: false,
			translate: false,
			qa: false,
			review: false,
			extract: false
		};

		for (const category of categories) {
			const model = this.selectModel(category);
			availability[category] = model !== null && model.enabled;
		}

		return availability;
	}

	/**
	 * Get queue position for debugging/monitoring
	 */
	getQueueStatus(): Record<string, number> {
		const status: Record<string, number> = {};
		for (const [modelId, queue] of this.queues.entries()) {
			status[modelId] = queue.length;
		}
		return status;
	}
}

// Singleton instance
export const modelService = new ModelService();
