<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		imageUrl: string;
		fileName?: string;
		alt?: string;
	}

	let { imageUrl, fileName = 'image', alt = 'Image preview' }: Props = $props();

	let scale = $state(1.0);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let isDragging = $state(false);
	let startX = $state(0);
	let startY = $state(0);

	function zoomIn() {
		scale = Math.min(scale + 0.25, 5.0);
	}

	function zoomOut() {
		scale = Math.max(scale - 0.25, 0.25);
	}

	function resetZoom() {
		scale = 1.0;
		offsetX = 0;
		offsetY = 0;
	}

	function fitToScreen() {
		scale = 1.0;
		offsetX = 0;
		offsetY = 0;
	}

	function handleMouseDown(e: MouseEvent) {
		if (scale > 1.0) {
			isDragging = true;
			startX = e.clientX - offsetX;
			startY = e.clientY - offsetY;
			e.preventDefault();
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (isDragging) {
			offsetX = e.clientX - startX;
			offsetY = e.clientY - startY;
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		if (e.deltaY < 0) {
			zoomIn();
		} else {
			zoomOut();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === '+' || e.key === '=') {
			e.preventDefault();
			zoomIn();
		} else if (e.key === '-' || e.key === '_') {
			e.preventDefault();
			zoomOut();
		} else if (e.key === '0') {
			e.preventDefault();
			resetZoom();
		} else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
			const step = e.shiftKey ? 40 : 20;
			if (e.key === 'ArrowLeft') offsetX -= step;
			if (e.key === 'ArrowRight') offsetX += step;
			if (e.key === 'ArrowUp') offsetY -= step;
			if (e.key === 'ArrowDown') offsetY += step;
		}
	}
</script>

<svelte:window onmouseup={handleMouseUp} onmousemove={handleMouseMove} />

<div class="image-preview">
	<!-- Toolbar -->
	<div class="toolbar">
		<div class="toolbar-section">
			<Button variant="secondary" size="sm" onclick={zoomOut} disabled={scale <= 0.25}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
				</svg>
			</Button>
			<span class="zoom-info">{Math.round(scale * 100)}%</span>
			<Button variant="secondary" size="sm" onclick={zoomIn} disabled={scale >= 5.0}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
			</Button>
			<Button variant="secondary" size="sm" onclick={resetZoom}>100%</Button>
			<Button variant="secondary" size="sm" onclick={fitToScreen}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
					/>
				</svg>
			</Button>
		</div>

		<div class="toolbar-section">
			<span class="file-name">{fileName}</span>
		</div>
	</div>

	<!-- Image Container -->
	<!-- Interactive image wrapper using button for accessibility -->
	<button
		class="image-container"
		class:dragging={isDragging}
		onmousedown={handleMouseDown}
		onwheel={handleWheel}
		type="button"
		aria-label={alt}
		onkeydown={handleKeyDown}
	>
		<img
			src={imageUrl}
			{alt}
			style="transform: scale({scale}) translate({offsetX / scale}px, {offsetY /
				scale}px); cursor: {scale > 1.0 ? (isDragging ? 'grabbing' : 'grab') : 'default'};"
		/>
	</button>
</div>

<style>
	.image-preview {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: oklch(var(--b2));
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: oklch(var(--b1));
		border-bottom: 1px solid oklch(var(--bc) / 0.1);
		gap: 1rem;
		flex-wrap: wrap;
	}

	.toolbar-section {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.zoom-info {
		font-size: 0.875rem;
		font-weight: 500;
		min-width: 4rem;
		text-align: center;
	}

	.file-name {
		font-size: 0.875rem;
		color: oklch(var(--bc) / 0.7);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 300px;
	}

	.image-container {
		flex: 1;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		user-select: none;
	}

	.image-container.dragging {
		cursor: grabbing;
	}

	img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		transition: transform 0.1s ease-out;
	}
</style>
