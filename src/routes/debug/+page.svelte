<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	const debugPages = [
		{
			title: 'UI组件测试',
			subtitle: 'UI Components Debug',
			description: '测试所有UI组件：按钮、输入框、卡片、模态框等',
			path: '/debug/components',
			icon: '🎨'
		},
		{
			title: '布局组件测试',
			subtitle: 'Layout Components Debug',
			description: '测试可调整大小的面板和分割布局',
			path: '/debug/layout',
			icon: '📐'
		},
		{
			title: '文件上传与预览',
			subtitle: 'Upload & Preview Debug',
			description: '测试文件上传、图片预览、PDF预览功能',
			path: '/debug/upload',
			icon: '📁'
		},
		{
			title: 'API端点测试',
			subtitle: 'API Endpoint Testing',
			description: '测试所有API端点的功能和响应',
			path: '/debug/api',
			icon: '🔌'
		}
	];

	const features = [
		{ name: '国际化', status: '✅', desc: 'i18n (zh-CN / en-US)' },
		{ name: 'UI组件库', status: '✅', desc: '10+ 可复用组件' },
		{ name: '文件上传', status: '✅', desc: '拖放、多文件、验证' },
		{ name: '文件预览', status: '✅', desc: '图片、PDF预览' },
		{ name: 'API架构', status: '✅', desc: '统一响应、错误处理' },
		{ name: '存储管理', status: '✅', desc: '会话隔离、TTL清理' },
		{ name: '模型配置', status: '✅', desc: 'YAML配置、热重载' },
		{ name: '日志系统', status: '✅', desc: '结构化、traceId' },
		{ name: '安全', status: '✅', desc: 'CORS、速率限制' },
		{ name: '无障碍', status: '✅', desc: '键盘、ARIA、语义化' }
	];
</script>

<div class="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-8">
	<div class="container mx-auto max-w-7xl">
		<!-- 头部 -->
		<div class="text-center mb-12">
			<h1
				class="text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
			>
				AI-Docs 调试中心
			</h1>
			<p class="text-2xl text-gray-600 mb-2">Debug & Testing Center</p>
			<p class="text-lg text-gray-500">
				手工验证各项功能是否正常 / Manual verification of all features
			</p>
		</div>

		<!-- 功能状态 -->
		<div class="mb-8">
			<Card title="实现功能清单 / Implemented Features">
				<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
					{#each features as feature (feature.name)}
						<div class="bg-base-200 p-4 rounded-lg text-center">
							<div class="text-3xl mb-2">{feature.status}</div>
							<div class="font-semibold">{feature.name}</div>
							<div class="text-xs text-gray-600 mt-1">{feature.desc}</div>
						</div>
					{/each}
				</div>
			</Card>
		</div>
		<!-- 调试页面导航 -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
			{#each debugPages as page (page.path)}
				<Card>
					<a
						href={page.path}
						data-sveltekit-preload-data="tap"
						class="block hover:bg-base-200 p-6 rounded-lg transition"
					>
						<div class="flex items-start gap-4">
							<div class="text-6xl">{page.icon}</div>
							<div class="flex-1">
								<h3 class="text-2xl font-bold mb-1">{page.title}</h3>
								<p class="text-sm text-gray-600 mb-2">{page.subtitle}</p>
								<p class="text-gray-700">{page.description}</p>
								<div class="mt-4">
									<Button variant="primary" size="sm">打开测试页面 / Open Test Page →</Button>
								</div>
							</div>
						</div>
					</a>
				</Card>
			{/each}
		</div>

		<!-- 快速访问 -->
		<Card title="快速访问 / Quick Access">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="bg-base-200 p-4 rounded-lg">
					<h4 class="font-semibold mb-2">📚 文档</h4>
					<ul class="space-y-1 text-sm">
						<li><span class="link">功能总结 (docs/FEATURES_SUMMARY.md)</span></li>
						<li><span class="link">API文档 (docs/API.md)</span></li>
						<li><span class="link">开发指南 (docs/DEVELOPMENT.md)</span></li>
						<li><span class="link">部署指南 (docs/DEPLOYMENT.md)</span></li>
					</ul>
				</div>

				<div class="bg-base-200 p-4 rounded-lg">
					<h4 class="font-semibold mb-2">🔧 配置</h4>
					<ul class="space-y-1 text-sm">
						<li><code class="text-xs">config/system.yaml</code> - 系统配置</li>
						<li><code class="text-xs">config/models.yaml</code> - 模型配置</li>
						<li><code class="text-xs">messages/*.json</code> - i18n消息</li>
					</ul>
				</div>

				<div class="bg-base-200 p-4 rounded-lg">
					<h4 class="font-semibold mb-2">🧪 测试</h4>
					<ul class="space-y-1 text-sm">
						<li><code class="text-xs">pnpm test</code> - 运行单元测试</li>
						<li><code class="text-xs">pnpm lint</code> - 代码检查</li>
						<li><code class="text-xs">pnpm check</code> - 类型检查</li>
						<li><code class="text-xs">pnpm build</code> - 生产构建</li>
					</ul>
				</div>
			</div>
		</Card>

		<!-- 注意事项 -->
		<div class="mt-8 p-6 bg-warning/20 border-2 border-warning rounded-lg">
			<h3 class="font-bold text-lg mb-2">⚠️ 注意事项 / Notes:</h3>
			<ul class="list-disc list-inside space-y-1">
				<li>调试页面仅用于开发和测试，生产环境应移除 <code>/debug</code> 路由</li>
				<li>文件上传需要确保 <code>./data</code> 目录有写入权限</li>
				<li>Office文档转换需要安装LibreOffice (可选)</li>
				<li>某些功能需要配置相应的环境变量和API密钥</li>
			</ul>
		</div>

		<!-- 返回主页 -->
		<div class="text-center mt-8">
			<a href="/">
				<Button size="lg" variant="primary">← 返回主应用 / Back to Main App</Button>
			</a>
		</div>
	</div>
</div>
