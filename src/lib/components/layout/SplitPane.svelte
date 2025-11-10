<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		class?: string;
		orientation?: 'horizontal' | 'vertical';
		initialLeftSize?: number;
		minLeftSize?: number;
		maxLeftSize?: number;
		resizable?: boolean;
		leftPanel?: import('svelte').Snippet;
		rightPanel?: import('svelte').Snippet;
	}

	let {
		class: externalClass = '',
		orientation = 'horizontal',
		initialLeftSize = 50,
		minLeftSize = 10,
		maxLeftSize = 90,
		resizable = true,
		leftPanel,
		rightPanel
	}: Props = $props();

	let isMobile = $state(false);
	let containerRef = $state<HTMLDivElement | null>(null);
	let primarySize = $state(initialLeftSize);
	let isDragging = $state(false);
	let activeHandle: HTMLElement | null = null;

	const clampSize = (value: number) => Math.max(minLeftSize, Math.min(maxLeftSize, value));

	const updateSizeFromPointer = (event: PointerEvent) => {
		if (!containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		let nextSize: number;

		if (orientation === 'horizontal') {
			nextSize = ((event.clientX - rect.left) / rect.width) * 100;
		} else {
			nextSize = ((event.clientY - rect.top) / rect.height) * 100;
		}

		primarySize = clampSize(nextSize);
	};

	function handlePointerDown(event: PointerEvent) {
		if (!resizable || !containerRef) return;
		event.preventDefault();
		activeHandle = event.currentTarget as HTMLElement | null;
		activeHandle?.setPointerCapture?.(event.pointerId);
		updateSizeFromPointer(event);
		isDragging = true;
		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp, { once: true });
	}

	function handlePointerMove(event: PointerEvent) {
		if (!isDragging) return;
		updateSizeFromPointer(event);
	}

	function handlePointerUp(event: PointerEvent) {
		if (!isDragging) return;
		isDragging = false;
		window.removeEventListener('pointermove', handlePointerMove);
		activeHandle?.releasePointerCapture?.(event.pointerId);
		activeHandle = null;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!resizable) return;
		const step = event.shiftKey ? 10 : 2;
		let delta = 0;

		if (orientation === 'horizontal') {
			if (event.key === 'ArrowLeft') delta = -step;
			if (event.key === 'ArrowRight') delta = step;
		} else {
			if (event.key === 'ArrowUp') delta = -step;
			if (event.key === 'ArrowDown') delta = step;
		}

		if (delta !== 0) {
			event.preventDefault();
			primarySize = clampSize(primarySize + delta);
		}
	}

	function updateMediaQuery() {
		isMobile = window.matchMedia('(max-width: 768px)').matches;
	}

	onMount(() => {
		updateMediaQuery();
		const mediaQuery = window.matchMedia('(max-width: 768px)');
		const listener = (event: MediaQueryListEvent) => {
			isMobile = event.matches;
		};
		mediaQuery.addEventListener('change', listener);
		return () => mediaQuery.removeEventListener('change', listener);
	});
</script>

{#if isMobile}
	<div class={`flex h-full w-full flex-col overflow-y-auto ${externalClass}`}>
		<div class="min-h-[50vh] flex-1 overflow-auto border-b border-base-content/10 bg-base-100">
			{@render leftPanel?.()}
		</div>
		<div class="min-h-[50vh] flex-1 overflow-auto border-t border-base-content/10 bg-base-100">
			{@render rightPanel?.()}
		</div>
	</div>
{:else}
	<div
		bind:this={containerRef}
		class={`flex h-full w-full overflow-hidden ${orientation === 'horizontal' ? 'flex-row' : 'flex-col'} ${externalClass}`}
	>
		<div
			class={`flex min-h-0 min-w-0 flex-col overflow-hidden bg-base-100 shadow-sm border border-base-content/15 ${orientation === 'horizontal' ? 'rounded-l-md rounded-r-none' : 'rounded-t-md rounded-b-none'}`}
			style={orientation === 'horizontal'
				? `flex: 0 0 ${primarySize}%; width: ${primarySize}%;`
				: `flex: 0 0 ${primarySize}%; height: ${primarySize}%;`}
		>
			{@render leftPanel?.()}
		</div>

		{#if resizable}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class={`${orientation === 'horizontal'
					? 'w-2 cursor-col-resize border-x border-dashed'
					: 'h-2 cursor-row-resize border-y border-dashed'} relative flex shrink-0 items-center justify-center overflow-hidden border-primary/40 bg-base-200 transition-colors duration-200 focus:outline-none touch-none ${isDragging ? 'bg-primary/15 ring-2 ring-primary/30' : 'hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/30'}`}
				role="separator"
				tabindex="0"
				aria-orientation={orientation}
				aria-valuemin={minLeftSize}
				aria-valuemax={maxLeftSize}
				aria-valuenow={Math.round(primarySize)}
				onpointerdown={handlePointerDown}
				onkeydown={handleKeyDown}
			>
				<span class={`${orientation === 'horizontal' ? 'h-8 w-0.5' : 'w-8 h-0.5'} rounded-full bg-base-content/40`}></span>
			</div>
		{/if}

		<div
			class={`flex flex-1 flex-col overflow-hidden bg-base-100 shadow-sm border border-base-content/15 ${orientation === 'horizontal' ? 'rounded-r-md rounded-l-none' : 'rounded-b-md rounded-t-none'}`}
		>
			{@render rightPanel?.()}
		</div>
	</div>
{/if}
