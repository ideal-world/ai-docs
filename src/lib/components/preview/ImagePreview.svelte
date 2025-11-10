<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { currentLanguage } from '$lib/stores/language';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		imageUrl: string;
		fileName?: string;
		alt?: string;
	}

	let { imageUrl, fileName = 'image', alt = 'Image preview' }: Props = $props();

	const labels = $derived.by(() => {
		$currentLanguage;
		return {
			zoomOut: m.preview_zoom_out(),
			zoomIn: m.preview_zoom_in(),
			resetZoom: m.preview_reset_zoom(),
			fitScreen: m.preview_fit_screen(),
			canvas: m.preview_image_canvas()
		};
	});

	const toolbarButtonClass =
		'h-8 w-8 rounded-full border border-base-content/15 bg-base-100/90 text-base-content/70 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/40 flex items-center justify-center';

	const toolbarContainerBase =
		'absolute inset-x-4 bottom-4 z-20 flex items-center justify-center transition-all duration-200';

	const toolbarContainerHidden = 'pointer-events-none opacity-0 translate-y-2';
	const toolbarContainerVisible = 'pointer-events-auto opacity-100 translate-y-0';

	const toolbarInnerClass =
		'flex items-center gap-2 rounded-full border border-base-content/15 bg-base-100/95 px-3 py-2 shadow-lg backdrop-blur-sm';

	let scale = $state(1.0);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let isDragging = $state(false);
	let startX = $state(0);
	let startY = $state(0);
	let showToolbar = $state(false);

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

	function handleMouseEnter() {
		showToolbar = true;
	}

	function handleMouseLeave() {
		showToolbar = false;
	}

	function handleFocusIn() {
		showToolbar = true;
	}

	function handleFocusOut(event: FocusEvent) {
		const root = event.currentTarget as HTMLElement | null;
		const next = event.relatedTarget as Node | null;
		if (root && next && root.contains(next)) {
			return;
		}
		showToolbar = false;
	}
</script>

<svelte:window onmouseup={handleMouseUp} onmousemove={handleMouseMove} />

<div
	class="group relative flex h-full min-h-0 overflow-hidden rounded-lg bg-base-200"
	role="group"
	aria-label={labels.canvas}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onfocusin={handleFocusIn}
	onfocusout={handleFocusOut}
>
	<div class={`${toolbarContainerBase} ${showToolbar ? toolbarContainerVisible : toolbarContainerHidden}`}>
		<div class={toolbarInnerClass}>
			<Button
				variant="ghost"
				size="xs"
				on:click={zoomOut}
				disabled={scale <= 0.25}
				class={toolbarButtonClass}
				ariaLabel={labels.zoomOut}
			>
				<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
				</svg>
			</Button>
			<span class="rounded-full border border-base-content/15 bg-base-200/80 px-2 py-0.5 text-[0.7rem] font-semibold text-base-content/70">
				{Math.round(scale * 100)}%
			</span>
			<Button
				variant="ghost"
				size="xs"
				on:click={zoomIn}
				disabled={scale >= 5.0}
				class={toolbarButtonClass}
				ariaLabel={labels.zoomIn}
			>
				<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
			</Button>
			<Button
				variant="ghost"
				size="xs"
				on:click={fitToScreen}
				class={toolbarButtonClass}
				ariaLabel={labels.fitScreen}
			>
				<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
					/>
				</svg>
			</Button>
		</div>
	</div>

	<!-- Image Container -->
	<button
		class={`relative flex flex-1 select-none items-center justify-center overflow-hidden bg-base-200/80 p-5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
			isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-default'
		}`}
		onmousedown={handleMouseDown}
		onwheel={handleWheel}
		type="button"
		aria-label={labels.canvas}
		onkeydown={handleKeyDown}
	>
		<img
			src={imageUrl}
			{alt}
			style="transform: scale({scale}) translate({offsetX / scale}px, {offsetY /
				scale}px); cursor: {scale > 1.0 ? (isDragging ? 'grabbing' : 'grab') : 'default'};"
			class="max-h-full max-w-full select-none object-contain transition-transform duration-100 ease-out"
		/>
	</button>
</div>
