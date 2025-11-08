<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		fileUrl: string;
		fileName?: string;
	}

	let { fileUrl, fileName = 'document.pdf' }: Props = $props();

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
	let pdfDoc: PdfDocLite | null = $state(null);
	let pdfjsLib: typeof import('pdfjs-dist') | null = $state(null);
	let pageRendering = $state(false);
	let currentLoadingTask: LoadingTask | null = null;
	let currentLoadToken = 0;
	let lastLoadedUrl: string | null = null;

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

	function resetZoom() {
		scale = 1.0;
		renderPage(pageNum);
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

<div class="pdf-preview">
	<!-- Toolbar -->
	<div class="toolbar">
		<div class="toolbar-section">
			<Button variant="secondary" size="sm" on:click={previousPage} disabled={pageNum <= 1}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</Button>
			<span class="page-info">
				{pageNum} / {pageCount}
			</span>
			<Button variant="secondary" size="sm" on:click={nextPage} disabled={pageNum >= pageCount}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</Button>
		</div>

		<div class="toolbar-section">
			<Button variant="secondary" size="sm" on:click={zoomOut} disabled={scale <= 0.5}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
				</svg>
			</Button>
			<span class="zoom-info">{Math.round(scale * 100)}%</span>
			<Button variant="secondary" size="sm" on:click={zoomIn} disabled={scale >= 3.0}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
			</Button>
			<Button variant="secondary" size="sm" on:click={resetZoom}>100%</Button>
		</div>

		<div class="toolbar-section">
			<span class="file-name">{fileName}</span>
		</div>
	</div>

	<!-- Canvas -->
	<div class="canvas-container">
		<canvas bind:this={canvasRef}></canvas>
	</div>
</div>

<style>
	.pdf-preview {
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

	.page-info,
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

	.canvas-container {
		flex: 1;
		overflow: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	canvas {
		box-shadow:
			0 4px 6px -1px rgb(0 0 0 / 0.1),
			0 2px 4px -2px rgb(0 0 0 / 0.1);
		background: white;
	}
</style>
