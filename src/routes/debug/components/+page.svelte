<script lang="ts">
	import { currentLanguage } from '$lib/stores/language';
	import * as m from '$lib/paraglide/messages';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import Progress from '$lib/components/ui/Progress.svelte';
	import Notification from '$lib/components/ui/Notification.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	let inputValue = $state('');
	let textareaValue = $state('');
	let selectedValue = $state('option1');
	let showModal = $state(false);
	let progressValue = $state(65);

	const dropdownOptions = [
		{ value: 'option1', label: '选项 1 / Option 1' },
		{ value: 'option2', label: '选项 2 / Option 2' },
		{ value: 'option3', label: '选项 3 / Option 3' }
	];
</script>

<div class="container mx-auto p-8 max-w-7xl">
	<div class="mb-8">
		<h1 class="text-4xl font-bold mb-2">UI组件调试页面</h1>
		<p class="text-gray-600">Component Debug Page - 测试所有UI组件的展示和交互</p>
		<div class="flex gap-2 mt-4">
			<Button size="sm" onclick={() => currentLanguage.set('zh-cn')}>中文</Button>
			<Button size="sm" onclick={() => currentLanguage.set('en-us')}>English</Button>
		</div>
	</div>

	<!-- 按钮组件 -->
	<Card title="Button 按钮组件" collapsible={true}>
		<div class="space-y-4">
			<div>
				<h4 class="font-semibold mb-2">Variants 样式变体:</h4>
				<div class="flex flex-wrap gap-2">
					<Button variant="primary">Primary</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="danger">Danger</Button>
					<Button variant="ghost">Ghost</Button>
				</div>
			</div>

			<div>
				<h4 class="font-semibold mb-2">Sizes 尺寸:</h4>
				<div class="flex flex-wrap gap-2 items-center">
					<Button size="sm">Small</Button>
					<Button size="md">Medium</Button>
					<Button size="lg">Large</Button>
				</div>
			</div>

			<div>
				<h4 class="font-semibold mb-2">States 状态:</h4>
				<div class="flex flex-wrap gap-2">
					<Button disabled>Disabled</Button>
					<Button variant="primary">Active</Button>
				</div>
			</div>
		</div>
	</Card>

	<!-- 输入框组件 -->
	<Card title="Input 输入框组件" collapsible={true}>
		<div class="space-y-4">
			<Input
				bind:value={inputValue}
				label="用户名 / Username"
				placeholder="请输入用户名 / Enter username"
			/>
			<Input
				value=""
				label="邮箱 / Email"
				placeholder="user@example.com"
				type="email"
				error="Invalid email format"
			/>
			<Input value="" label="禁用状态 / Disabled" placeholder="Disabled input" disabled />
			<div class="p-4 bg-base-200 rounded">
				<p class="font-mono text-sm">Current value: {inputValue}</p>
			</div>
		</div>
	</Card>

	<!-- 文本域组件 -->
	<Card title="Textarea 文本域组件" collapsible={true}>
		<div class="space-y-4">
			<Textarea
				bind:value={textareaValue}
				label="描述 / Description"
				placeholder="请输入描述信息 / Enter description..."
				showCount={true}
				maxLength={200}
			/>
			<Textarea value="" label="禁用状态 / Disabled" placeholder="Disabled textarea" disabled />
			<div class="p-4 bg-base-200 rounded">
				<p class="font-mono text-sm">Current value: {textareaValue}</p>
			</div>
		</div>
	</Card>

	<!-- 下拉框组件 -->
	<Card title="Dropdown 下拉框组件" collapsible={true}>
		<div class="space-y-4">
			<Dropdown
				bind:value={selectedValue}
				placeholder="选择选项 / Select Option"
				options={dropdownOptions}
			/>
			<Dropdown placeholder="禁用状态 / Disabled" options={dropdownOptions} disabled />
			<div class="p-4 bg-base-200 rounded">
				<p class="font-mono text-sm">Selected: {selectedValue}</p>
			</div>
		</div>
	</Card>

	<!-- 进度条组件 -->
	<Card title="Progress 进度条组件" collapsible={true}>
		<div class="space-y-4">
			<div>
				<label class="label">
					<span class="label-text">调整进度 / Adjust Progress: {progressValue}%</span>
				</label>
				<input
					type="range"
					min="0"
					max="100"
					bind:value={progressValue}
					class="range range-primary"
				/>
			</div>
			<Progress value={progressValue} color="primary" />
			<Progress value={75} color="success" />
			<Progress value={50} color="warning" />
			<Progress value={25} color="error" />
		</div>
	</Card>

	<!-- 通知组件 -->
	<Card title="Notification 通知组件" collapsible={true}>
		<div class="space-y-2">
			<Notification type="success" message="操作成功完成 / Operation completed successfully" />
			<Notification type="info" message="这是一条信息提示 / This is an information message" />
			<Notification type="warning" message="警告：请检查输入 / Warning: Please check your input" />
			<Notification type="error" message="错误：操作失败 / Error: Operation failed" />
		</div>
	</Card>

	<!-- 模态框组件 -->
	<Card title="Modal 模态框组件" collapsible={true}>
		<div class="space-y-4">
			<Button onclick={() => (showModal = true)}>打开模态框 / Open Modal</Button>

			<Modal
				bind:open={showModal}
				title="示例模态框 / Example Modal"
				onClose={() => (showModal = false)}
			>
				<p class="mb-4">这是一个模态框示例。您可以在这里放置任何内容。</p>
				<p class="mb-4">This is an example modal. You can put any content here.</p>

				{#snippet actions()}
					<Button variant="ghost" onclick={() => (showModal = false)}>取消 / Cancel</Button>
					<Button variant="primary" onclick={() => (showModal = false)}>确认 / Confirm</Button>
				{/snippet}
			</Modal>
		</div>
	</Card>

	<!-- 卡片组件本身的演示 -->
	<Card title="Card 卡片组件" collapsible={true}>
		<div class="space-y-4">
			<Card title="嵌套卡片 / Nested Card">
				<p>这是一个嵌套在另一个卡片中的卡片。</p>
				<p>This is a card nested inside another card.</p>
			</Card>

			<Card title="可折叠卡片 / Collapsible Card" collapsible={true}>
				<p>点击标题栏右侧的箭头可以折叠/展开这个卡片。</p>
				<p>Click the arrow on the right side of the title bar to collapse/expand this card.</p>
			</Card>
		</div>
	</Card>

	<!-- 国际化测试 -->
	<Card title="i18n 国际化测试">
		<div class="space-y-2">
			<p><strong>common_uploading:</strong> {m.common_uploading()}</p>
			<p><strong>upload_drag_drop:</strong> {m.upload_drag_drop()}</p>
			<p><strong>upload_select_files:</strong> {m.upload_select_files()}</p>
			<p><strong>upload_supported_formats:</strong> {m.upload_supported_formats()}</p>
		</div>
	</Card>
</div>

<style>
	:global(body) {
		background: oklch(var(--b2));
	}
</style>
