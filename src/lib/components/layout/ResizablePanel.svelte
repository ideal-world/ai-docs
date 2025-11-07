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
	class="resizable-panel-container"
	class:horizontal={orientation === 'horizontal'}
	class:vertical={orientation === 'vertical'}
>
	<div
		class="resizable-panel"
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
			class="resizer"
			class:horizontal={orientation === 'horizontal'}
			class:vertical={orientation === 'vertical'}
			class:dragging={isDragging}
			onmousedown={handleMouseDown}
			onkeydown={handleKeyDown}
			aria-label={orientation === 'horizontal'
				? 'Resize panel horizontally'
				: 'Resize panel vertically'}
		></div>
	{/if}
</div>

<style>
	.resizable-panel-container {
		position: relative;
		display: flex;
		width: 100%;
		height: 100%;
	}

	.resizable-panel-container.horizontal {
		flex-direction: row;
	}

	.resizable-panel-container.vertical {
		flex-direction: column;
	}

	.resizable-panel {
		overflow: auto;
	}

	.resizer {
		background: oklch(var(--b3));
		cursor: col-resize;
		user-select: none;
	}

	.resizer.horizontal {
		width: 4px;
		height: 100%;
		cursor: col-resize;
	}

	.resizer.vertical {
		height: 4px;
		width: 100%;
		cursor: row-resize;
	}

	.resizer:hover,
	.resizer.dragging {
		background: oklch(var(--p));
	}
</style>
