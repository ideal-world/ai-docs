<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { currentLanguage } from '$lib/stores/language';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		fileUrl: string;
		fileName?: string;
	}

	let { fileUrl, fileName = 'document.pdf' }: Props = $props();

	const labels = $derived.by(() => {
		$currentLanguage;
		return {
			zoomOut: m.preview_zoom_out(),
			zoomIn: m.preview_zoom_in(),
			fitScreen: m.preview_fit_screen(),
			prevPage: m.preview_prev_page(),
			nextPage: m.preview_next_page(),
			canvas: m.preview_pdf_canvas()
		};
	});

	let canvasRef: HTMLCanvasElement;
	let pageNum = $state(1);
	let pageCount = $state(0);
	let scale = $state(1.0);
	interface PdfDocLite {
		numPages: number;
		getPage: (num: number) => Promise<unknown>;
	}

	interface LoadingTask {
		promise: Promise<PdfDocLite>;
		destroy?: () => void;
	}
	const toolbarButtonClass =
		'h-8 w-8 rounded-full border border-base-content/15 bg-base-100/90 text-base-content/70 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/40 flex items-center justify-center';

	const toolbarContainerBase =
		'absolute inset-x-4 bottom-4 z-20 flex items-center justify-center transition-all duration-200';

	const toolbarContainerHidden = 'pointer-events-none opacity-0 translate-y-2';
	const toolbarContainerVisible = 'pointer-events-auto opacity-100 translate-y-0';

	const toolbarInnerClass =
		'flex flex-wrap items-center gap-3 rounded-full border border-base-content/15 bg-base-100/95 px-3 py-2 text-[0.7rem] text-base-content/70 shadow-lg backdrop-blur-sm';

	let pdfDoc: PdfDocLite | null = $state(null);
	let pdfjsLib: typeof import('pdfjs-dist') | null = $state(null);
	let pageRendering = $state(false);
	let currentLoadingTask: LoadingTask | null = null;
	let currentLoadToken = 0;
	let lastLoadedUrl: string | null = null;
	let showToolbar = $state(false);

	onMount(async () => {
		// Dynamically import pdfjs to avoid bloating initial bundle
		const lib = await import('pdfjs-dist');
		pdfjsLib = lib;

		// Use worker from node_modules via Vite's public URL handling
		// The worker file is in node_modules/pdfjs-dist/build/pdf.worker.mjs
		const workerUrl = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url);
		lib.GlobalWorkerOptions.workerSrc = workerUrl.toString();

		// Wait for worker to load via reactive effect
	});

	async function loadPdf(url: string) {
		try {
			if (!pdfjsLib) return;
			const token = ++currentLoadToken;
			currentLoadingTask?.destroy?.();
			const loadingTask = pdfjsLib.getDocument(url) as unknown as LoadingTask;
			currentLoadingTask = loadingTask;
			const doc = await loadingTask.promise;
			if (token !== currentLoadToken) {
				loadingTask.destroy?.();
				return;
			}
			pdfDoc = doc;
			pageCount = pdfDoc.numPages;
			pageNum = Math.min(pageNum, pageCount) || 1;
			await renderPage(pageNum, token);
		} catch (error) {
			console.error('Error loading PDF:', error);
		}
	}

	async function renderPage(num: number, token = currentLoadToken) {
		if (!pdfDoc || pageRendering || token !== currentLoadToken) return;

		pageRendering = true;

		try {
			// pdf.js page type has many properties; we only need getViewport & render
			interface PdfPage {
				getViewport: (opts: { scale: number }) => { height: number; width: number };
				render: (ctx: {
					canvasContext: CanvasRenderingContext2D | null;
					viewport: { height: number; width: number };
				}) => { promise: Promise<void> };
			}
			const page = (await pdfDoc.getPage(num)) as PdfPage;
			const viewport = page.getViewport({ scale });

			const canvas = canvasRef;
			const context = canvas.getContext('2d');
			if (!context) {
				pageRendering = false;
				return;
			}

			canvas.height = viewport.height;
			canvas.width = viewport.width;

			const renderContext = {
				canvasContext: context,
				viewport: viewport
			};

			await page.render(renderContext).promise;
		} catch (error) {
			console.error('Error rendering page:', error);
		} finally {
			if (token === currentLoadToken) {
				pageRendering = false;
			}
		}
	}

	function previousPage() {
		if (pageNum <= 1) return;
		pageNum--;
		renderPage(pageNum);
	}

	function nextPage() {
		if (pageNum >= pageCount) return;
		pageNum++;
		renderPage(pageNum);
	}

	function zoomIn() {
		scale = Math.min(scale + 0.25, 3.0);
		renderPage(pageNum);
	}

	function zoomOut() {
		scale = Math.max(scale - 0.25, 0.5);
		renderPage(pageNum);
	}

	function fitToScreen() {
		scale = 1.0;
		renderPage(pageNum);
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

	$effect(() => {
		const lib = pdfjsLib;
		const url = fileUrl;
		if (!lib || !url) {
			return;
		}

		if (lastLoadedUrl === url) {
			return;
		}

		lastLoadedUrl = url;
		scale = 1.0;
		pageNum = 1;
		loadPdf(url);
	});
</script>

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
			<div class="flex items-center gap-2">
				<Button
					variant="ghost"
					size="xs"
					on:click={previousPage}
					disabled={pageNum <= 1}
					class={toolbarButtonClass}
					ariaLabel={labels.prevPage}
				>
					<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</Button>
				<span class="rounded-full border border-base-content/15 bg-base-200/80 px-2 py-0.5 text-[0.7rem] font-semibold text-base-content/70">
					{pageNum} / {pageCount || 1}
				</span>
				<Button
					variant="ghost"
					size="xs"
					on:click={nextPage}
					disabled={pageNum >= pageCount}
					class={toolbarButtonClass}
					ariaLabel={labels.nextPage}
				>
					<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</Button>
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="ghost"
					size="xs"
					on:click={zoomOut}
					disabled={scale <= 0.5}
					class={toolbarButtonClass}
					ariaLabel={labels.zoomOut}
				>
					<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
					</svg>
				</Button>
				<span class="min-w-[3.2rem] rounded-full border border-base-content/15 bg-base-200/80 px-2 py-0.5 text-[0.7rem] font-semibold text-base-content/70 text-center">
					{Math.round(scale * 100)}%
				</span>
				<Button
					variant="ghost"
					size="xs"
					on:click={zoomIn}
					disabled={scale >= 3.0}
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
	</div>

	<div class="flex flex-1 items-center justify-center overflow-auto bg-base-200/80 p-6">
		<canvas bind:this={canvasRef} class="rounded-md bg-base-100 shadow-xl" aria-label={labels.canvas}></canvas>
	</div>
</div>
