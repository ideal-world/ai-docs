<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		initialSize?: number;
		minSize?: number;
		maxSize?: number;
		orientation?: 'horizontal' | 'vertical';
		resizable?: boolean;
		children?: import('svelte').Snippet;
	}

	let {
		initialSize = 50,
		minSize = 10,
		maxSize = 90,
		orientation = 'horizontal',
		resizable = true,
		children
	}: Props = $props();

	let size = $state(initialSize);
	let isDragging = $state(false);
	let containerRef: HTMLDivElement;
	let panelId = `resizable-panel-${Math.random().toString(36).slice(2)}`;

	function handleMouseDown(e: MouseEvent) {
		if (!resizable) return;
		e.preventDefault();
		isDragging = true;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || !containerRef) return;

		const rect = containerRef.getBoundingClientRect();
		let newSize: number;

		if (orientation === 'horizontal') {
			newSize = ((e.clientX - rect.left) / rect.width) * 100;
		} else {
			newSize = ((e.clientY - rect.top) / rect.height) * 100;
		}

		size = Math.max(minSize, Math.min(maxSize, newSize));
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!resizable) return;
		const step = e.shiftKey ? 10 : 2; // larger step with Shift
		let delta = 0;
		if (orientation === 'horizontal') {
			if (e.key === 'ArrowLeft') delta = -step;
			if (e.key === 'ArrowRight') delta = step;
		} else {
			if (e.key === 'ArrowUp') delta = -step;
			if (e.key === 'ArrowDown') delta = step;
		}
		if (delta !== 0) {
			e.preventDefault();
			size = Math.max(minSize, Math.min(maxSize, size + delta));
		}
	}

	onMount(() => {
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
		};
	});
</script>

<div
	bind:this={containerRef}
	class={`relative flex h-full w-full ${orientation === 'horizontal' ? 'flex-row' : 'flex-col'}`}
>
	<div
		class="overflow-auto"
		id={panelId}
		style={orientation === 'horizontal' ? `width: ${size}%` : `height: ${size}%`}
	>
		{@render children?.()}
	</div>
	{#if resizable}
		<div
			role="slider"
			tabindex="0"
			aria-valuenow={Math.round(size)}
			aria-valuemin={minSize}
			aria-valuemax={maxSize}
			aria-orientation={orientation}
			aria-controls={panelId}
			class={`${orientation === 'horizontal'
				? 'w-2 cursor-col-resize border-x border-dashed'
				: 'h-2 cursor-row-resize border-y border-dashed'} relative flex shrink-0 items-center justify-center overflow-hidden border-primary/40 bg-base-200 transition-colors duration-200 focus:outline-none touch-none ${isDragging ? 'bg-primary/15 ring-2 ring-primary/30' : 'hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/30'}`}
			onmousedown={handleMouseDown}
			onkeydown={handleKeyDown}
			aria-label={orientation === 'horizontal'
				? 'Resize panel horizontally'
				: 'Resize panel vertically'}
		>
			<span class={`${orientation === 'horizontal' ? 'h-8 w-0.5' : 'w-8 h-0.5'} rounded-full bg-base-content/40`}></span>
		</div>
	{/if}
</div>
