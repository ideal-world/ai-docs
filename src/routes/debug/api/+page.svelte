<script lang="ts">
	import { sessionId } from '$lib/stores/session';
	import { get } from 'svelte/store';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';

	interface HealthData {
		success: boolean;
		data?: {
			status?: 'healthy' | 'degraded' | 'unhealthy';
			uptime?: {
				formatted?: string;
			};
			services?: {
				libreOffice?: boolean;
				models?: string[];
			};
		};
	}

	interface ApiResponse {
		status: number;
		statusText: string;
		headers: Record<string, string>;
		data: unknown;
	}

	let healthData = $state<HealthData | null>(null);
	let healthLoading = $state(false);
	let healthError = $state<string | null>(null);

	let apiEndpoint = $state('/api/health');
	let apiMethod = $state<'GET' | 'POST' | 'DELETE'>('GET');
	let apiBody = $state('');
	let apiResponse = $state<ApiResponse | null>(null);
	let apiLoading = $state(false);
	let apiError = $state<string | null>(null);

	async function checkHealth() {
		healthLoading = true;
		healthError = null;

		try {
			const response = await fetch('/api/health');
			const data = await response.json();
			healthData = data;
		} catch (error) {
			healthError = (error as Error).message;
		} finally {
			healthLoading = false;
		}
	}

	async function testApiEndpoint() {
		apiLoading = true;
		apiError = null;
		apiResponse = null;

		try {
			const currentSessionId = get(sessionId);
			const options: RequestInit = {
				method: apiMethod,
				headers: {
					'Content-Type': 'application/json',
					'x-session-id': currentSessionId
				}
			};

			if (apiMethod === 'POST' && apiBody) {
				options.body = apiBody;
			}

			const response = await fetch(apiEndpoint, options);
			const data = await response.json();

			apiResponse = {
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				data
			};
		} catch (error) {
			apiError = (error as Error).message;
		} finally {
			apiLoading = false;
		}
	}

	// 预定义的API测试用例
	const testCases = [
		{
			name: '健康检查',
			endpoint: '/api/health',
			method: 'GET' as const,
			body: ''
		},
		{
			name: '配置重载',
			endpoint: '/api/config/reload',
			method: 'POST' as const,
			body: ''
		},
		{
			name: '查询任务（示例）',
			endpoint: '/api/task/test-task-id',
			method: 'GET' as const,
			body: ''
		},
		{
			name: '查询文件（示例）',
			endpoint: '/api/files/test-file-id',
			method: 'GET' as const,
			body: ''
		}
	];

	function loadTestCase(testCase: (typeof testCases)[0]) {
		apiEndpoint = testCase.endpoint;
		apiMethod = testCase.method;
		apiBody = testCase.body;
	}

	function formatJSON(obj: unknown): string {
		return JSON.stringify(obj, null, 2);
	}

	// 初始化时检查健康状态
	checkHealth();
</script>

<div class="container mx-auto p-8 max-w-7xl">
	<div class="mb-8">
		<h1 class="text-4xl font-bold mb-2">API端点测试</h1>
		<p class="text-gray-600 mb-4">API Endpoint Testing - 测试所有API端点的功能</p>

		<div class="text-sm text-gray-600">
			<p>Current Session ID: <code class="bg-base-200 px-2 py-1 rounded">{$sessionId}</code></p>
		</div>
	</div>

	<!-- 健康检查 -->
	<Card title="系统健康检查 / System Health Check">
		<div class="space-y-4">
			<Button onclick={checkHealth} disabled={healthLoading}>
				{healthLoading ? '检查中... / Checking...' : '刷新 / Refresh'}
			</Button>

			{#if healthError}
				<div class="alert alert-error">
					<span>错误 / Error: {healthError}</span>
				</div>
			{/if}

			{#if healthData}
				<div class="bg-base-200 p-4 rounded-lg">
					<h3 class="font-semibold mb-2">Health Status:</h3>
					<pre class="text-sm overflow-auto">{formatJSON(healthData)}</pre>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="stats shadow">
						<div class="stat">
							<div class="stat-title">Status</div>
							<div
								class="stat-value text-2xl"
								class:text-success={healthData.data?.status === 'healthy'}
								class:text-warning={healthData.data?.status === 'degraded'}
								class:text-error={healthData.data?.status === 'unhealthy'}
							>
								{healthData.data?.status || 'unknown'}
							</div>
						</div>
					</div>

					<div class="stats shadow">
						<div class="stat">
							<div class="stat-title">Uptime</div>
							<div class="stat-value text-2xl">
								{healthData.data?.uptime?.formatted || 'N/A'}
							</div>
						</div>
					</div>
				</div>

				{#if healthData.data?.services}
					<div class="bg-base-200 p-4 rounded-lg">
						<h3 class="font-semibold mb-2">Services:</h3>
						<ul class="space-y-1">
							<li>
								LibreOffice:
								<span
									class="badge"
									class:badge-success={healthData.data.services.libreOffice}
									class:badge-error={!healthData.data.services.libreOffice}
								>
									{healthData.data.services.libreOffice ? 'Available' : 'Unavailable'}
								</span>
							</li>
							{#if healthData.data.services.models}
								<li class="mt-2">
									<strong>Models:</strong>
									<div class="flex flex-wrap gap-1 mt-1">
										{#each Object.entries(healthData.data.services.models) as [key, value] (key)}
											<span
												class="badge badge-sm"
												class:badge-success={value}
												class:badge-error={!value}
											>
												{key}
											</span>
										{/each}
									</div>
								</li>
							{/if}
						</ul>
					</div>
				{/if}
			{/if}
		</div>
	</Card>

	<!-- API测试工具 -->
	<Card title="API测试工具 / API Testing Tool">
		<div class="space-y-4">
			<!-- 预定义测试用例 -->
			<div>
				<label class="label">
					<span class="label-text">快速测试 / Quick Tests:</span>
				</label>
				<div class="flex flex-wrap gap-2">
					{#each testCases as testCase (testCase.name)}
						<Button size="sm" variant="ghost" onclick={() => loadTestCase(testCase)}>
							{testCase.name}
						</Button>
					{/each}
				</div>
			</div>
			<!-- 请求配置 -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="md:col-span-2">
					<Input bind:value={apiEndpoint} label="Endpoint" placeholder="/api/..." />
				</div>
				<div>
					<label class="label">
						<span class="label-text">Method</span>
					</label>
					<select class="select select-bordered w-full" bind:value={apiMethod}>
						<option value="GET">GET</option>
						<option value="POST">POST</option>
						<option value="DELETE">DELETE</option>
					</select>
				</div>
			</div>

			{#if apiMethod === 'POST'}
				<Textarea
					bind:value={apiBody}
					label="Request Body (JSON)"
					placeholder={`{"key": "value"}`}
					showCount={false}
				/>
			{/if}

			<Button onclick={testApiEndpoint} disabled={apiLoading} variant="primary">
				{apiLoading ? '发送中... / Sending...' : '发送请求 / Send Request'}
			</Button>

			<!-- 响应显示 -->
			{#if apiError}
				<div class="alert alert-error">
					<span>错误 / Error: {apiError}</span>
				</div>
			{/if}

			{#if apiResponse}
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<span class="font-semibold">Status:</span>
						<span
							class="badge"
							class:badge-success={apiResponse.status >= 200 && apiResponse.status < 300}
							class:badge-warning={apiResponse.status >= 300 && apiResponse.status < 400}
							class:badge-error={apiResponse.status >= 400}
						>
							{apiResponse.status}
							{apiResponse.statusText}
						</span>
					</div>

					<div>
						<h4 class="font-semibold mb-2">Response Headers:</h4>
						<pre class="bg-base-200 p-4 rounded-lg text-xs overflow-auto">{formatJSON(
								apiResponse.headers
							)}</pre>
					</div>

					<div>
						<h4 class="font-semibold mb-2">Response Body:</h4>
						<pre class="bg-base-200 p-4 rounded-lg text-sm overflow-auto">{formatJSON(
								apiResponse.data
							)}</pre>
					</div>
				</div>
			{/if}
		</div>
	</Card>

	<!-- API文档链接 -->
	<Card title="API文档 / API Documentation">
		<div class="prose">
			<p>完整的API文档请参考: <code>/docs/API.md</code></p>

			<h4>可用端点 / Available Endpoints:</h4>
			<ul class="list-disc list-inside space-y-1">
				<li><code>GET /api/health</code> - 健康检查</li>
				<li><code>POST /api/upload</code> - 文件上传</li>
				<li><code>POST /api/attachments</code> - 附件上传</li>
				<li><code>GET /api/files/[fileId]</code> - 获取文件信息</li>
				<li><code>DELETE /api/files/[fileId]</code> - 删除文件</li>
				<li><code>GET /api/files/[id]/download</code> - 下载文件</li>
				<li><code>GET /api/task/[id]</code> - 查询任务状态</li>
				<li><code>POST /api/config/reload</code> - 重载配置</li>
			</ul>

			<h4>响应格式 / Response Format:</h4>
			<p>所有API端点返回统一的JSON格式:</p>
			<pre class="bg-base-200 p-4 rounded-lg text-sm">{`{
  "success": true,
  "code": "OK",
  "message": "操作成功",
  "traceId": "uuid-v4",
  "timestamp": "2025-11-07T...",
  "data": { ... }
}`}</pre>
		</div>
	</Card>
</div>
