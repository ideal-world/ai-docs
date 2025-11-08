<script lang="ts">
	import SplitPane from '$lib/components/layout/SplitPane.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let orientation: 'horizontal' | 'vertical' = $state('vertical');

	function toggleOrientation() {
		orientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
	}
</script>

<div class="h-screen flex flex-col p-4 bg-base-200">
	<div class="mb-4">
		<h1 class="text-4xl font-bold mb-2">布局组件调试页面</h1>
		<p class="text-gray-600 mb-4">Layout Components Debug - 测试可调整大小的面板和分割布局</p>

		<div class="flex gap-2">
			<Button on:click={toggleOrientation}>
				切换方向: {orientation === 'horizontal' ? '水平' : '垂直'}
			</Button>
		</div>
	</div>

	<div class="flex-1 overflow-hidden">
		<SplitPane {orientation}>
			{#snippet leftPanel()}
				<Card title="面板 1 / Panel 1">
					<div class="space-y-4">
						<p>这是左侧/上方面板的内容。</p>
						<p>This is the content of the left/top panel.</p>

						<div class="bg-primary text-primary-content p-4 rounded">
							<h3 class="font-bold mb-2">特性演示 / Features:</h3>
							<ul class="list-disc list-inside space-y-1">
								<li>可拖动调整大小 / Draggable resize</li>
								<li>键盘操作支持 / Keyboard support</li>
								<li>无障碍友好 / Accessible</li>
								<li>响应式布局 / Responsive layout</li>
							</ul>
						</div>

						<Card title="嵌套卡片 / Nested Card" collapsible={true}>
							<p>在面板中可以嵌套其他组件。</p>
							<p>You can nest other components in panels.</p>
						</Card>
					</div>
				</Card>
			{/snippet}

			{#snippet rightPanel()}
				<Card title="面板 2 / Panel 2">
					<div class="space-y-4">
						<p>这是右侧/下方面板的内容。</p>
						<p>This is the content of the right/bottom panel.</p>

						<div class="bg-secondary text-secondary-content p-4 rounded">
							<h3 class="font-bold mb-2">操作说明 / Instructions:</h3>
							<ol class="list-decimal list-inside space-y-1">
								<li>拖动中间的分隔条调整大小</li>
								<li>使用键盘方向键也可以调整</li>
								<li>点击"切换方向"改变布局方向</li>
							</ol>
						</div>

						<!-- 嵌套的分割面板演示 -->
						<div class="h-96 border-2 border-dashed border-base-300 rounded-lg overflow-hidden">
							<SplitPane orientation="horizontal">
								{#snippet leftPanel()}
									<div class="h-full bg-accent/20 p-4">
										<h4 class="font-bold mb-2">嵌套面板 A</h4>
										<p>可以在面板中嵌套另一个分割面板。</p>
									</div>
								{/snippet}

								{#snippet rightPanel()}
									<div class="h-full bg-info/20 p-4">
										<h4 class="font-bold mb-2">嵌套面板 B</h4>
										<p>支持水平和垂直方向的任意组合。</p>
									</div>
								{/snippet}
							</SplitPane>
						</div>
					</div>
				</Card>
			{/snippet}
		</SplitPane>
	</div>
</div>

<style>
	:global(body) {
		overflow: hidden;
	}
</style>
