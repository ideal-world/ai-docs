<script lang="ts">
	import { onMount } from 'svelte';
	import ResizablePanel from './ResizablePanel.svelte';

	interface Props {
		orientation?: 'horizontal' | 'vertical';
		initialLeftSize?: number;
		minLeftSize?: number;
		maxLeftSize?: number;
		resizable?: boolean;
		leftPanel?: import('svelte').Snippet;
		rightPanel?: import('svelte').Snippet;
	}

	let {
		orientation = 'horizontal',
		initialLeftSize = 50,
		minLeftSize = 10,
		maxLeftSize = 90,
		resizable = true,
		leftPanel,
		rightPanel
	}: Props = $props();

	let isMobile = $state(false);

	onMount(() => {
		// Check if screen is mobile (< 768px)
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);

		return () => {
			window.removeEventListener('resize', checkMobile);
		};
	});
</script>

{#if isMobile}
	<!-- Stack vertically on mobile -->
	<div class="split-pane-mobile">
		<div class="split-pane-section">
			{@render leftPanel?.()}
		</div>
		<div class="split-pane-section">
			{@render rightPanel?.()}
		</div>
	</div>
{:else}
	<!-- Split layout on desktop -->
	<div
		class="split-pane"
		class:horizontal={orientation === 'horizontal'}
		class:vertical={orientation === 'vertical'}
	>
		<ResizablePanel
			{orientation}
			initialSize={initialLeftSize}
			minSize={minLeftSize}
			maxSize={maxLeftSize}
			{resizable}
		>
			{@render leftPanel?.()}
		</ResizablePanel>
		<div class="split-pane-right">
			{@render rightPanel?.()}
		</div>
	</div>
{/if}

<style>
	.split-pane {
		display: flex;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.split-pane.horizontal {
		flex-direction: row;
	}

	.split-pane.vertical {
		flex-direction: column;
	}

	.split-pane-right {
		flex: 1;
		overflow: auto;
	}

	.split-pane-mobile {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		overflow-y: auto;
	}

	.split-pane-section {
		min-height: 50vh;
		overflow: auto;
	}
</style>
