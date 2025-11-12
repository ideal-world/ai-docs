<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
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
			canvas: m.preview_pdf_canvas(),
			loading: m.preview_loading(),
			sidebarOutline: m.preview_sidebar_outline(),
			sidebarThumbnails: m.preview_sidebar_thumbnails(),
			sidebarOpen: m.preview_sidebar_open(),
			outlineUntitled: m.preview_outline_untitled(),
			zoomOpen: m.preview_zoom_open(),
			thumbnailPage: (page: number) => m.preview_thumbnail_page({ page }),
			pageCanvas: (page: number) => m.preview_page_canvas({ page }),
			pageLabel: (page: number) => m.preview_sidebar_page_label({ page }),
			commonLoading: m.common_loading()
		};
	});

	interface PdfViewport {
		width: number;
		height: number;
	}

	interface PdfRenderTask {
		promise: Promise<void>;
	}

	interface PdfPage {
		getViewport: (options: { scale: number }) => PdfViewport;
		render: (context: {
			canvasContext: CanvasRenderingContext2D | null;
			viewport: PdfViewport;
		}) => PdfRenderTask;
	}

	interface PdfOutlineItem {
		title?: string;
		dest?: unknown;
		url?: string | null;
		items?: PdfOutlineItem[];
	}

	interface PdfDocLite {
		numPages: number;
		getPage: (num: number) => Promise<PdfPage>;
		getOutline?: () => Promise<PdfOutlineItem[] | null>;
		getDestination?: (dest: unknown) => Promise<unknown>;
		getPageIndex?: (ref: unknown) => Promise<number>;
	}

	interface LoadingTask {
		promise: Promise<PdfDocLite>;
		destroy?: () => void;
	}

	interface PageState {
		num: number;
	}

	interface OutlineEntry {
		id: string;
		title: string;
		dest: unknown | null;
		url?: string | null;
		level: number;
		pageNumber: number | null;
	}

	const MAX_THUMBNAIL_WIDTH = 140;
	const sidebarBaseClass =
		'absolute inset-y-6 left-6 z-30 flex max-h-[calc(100%-3rem)] w-64 transition-all duration-200';
	const sidebarVisibleClass = 'pointer-events-auto opacity-100 translate-x-0';
	const sidebarHiddenClass = 'pointer-events-none -translate-x-4 opacity-0';
	const zoomToolbarBaseClass =
		'absolute bottom-6 right-6 z-30 flex items-center gap-1.5 rounded-xl border border-base-content/15 bg-base-100/95 px-2.5 py-1.5 shadow-lg backdrop-blur-sm transition-all duration-200';
	const zoomToolbarVisibleClass = 'pointer-events-auto opacity-100 translate-y-0';
	const zoomToolbarHiddenClass = 'pointer-events-none opacity-0 translate-y-2';
	const zoomButtonClass =
		'h-8 w-8 rounded-lg border border-base-content/15 bg-base-100/90 text-base-content/70 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/40 flex items-center justify-center';

	let pdfDoc: PdfDocLite | null = $state(null);
	let pdfjsLib: typeof import('pdfjs-dist') | null = $state(null);
	let pageCount = $state(0);
	let scale = $state(1.0);
	let pages = $state<PageState[]>([]);
	let thumbnails = $state<Record<number, string | null>>({});
	let activePage = $state(1);
	let outlineEntries = $state<OutlineEntry[]>([]);
	let isLoading = $state(true);

	let canvasRefs = $state<Record<number, HTMLCanvasElement | null>>({});
	let pageWrappers = $state<Record<number, HTMLDivElement | null>>({});
	let scrollContainerRef: HTMLDivElement;
	let sidebarPanelRef: HTMLElement;
	let zoomToolbarRef: HTMLDivElement;

	let sidebarVisible = $state(false);
	let zoomToolbarVisible = $state(false);
	let isSidebarPointerInside = $state(false);

	let sidebarHideTimeout: ReturnType<typeof setTimeout> | null = null;
	let zoomHideTimeout: ReturnType<typeof setTimeout> | null = null;

	let currentLoadingTask: LoadingTask | null = null;
	let currentLoadToken = 0;
	let currentRenderToken = 0;
	let lastLoadedUrl: string | null = null;

	let intersectionObserver: IntersectionObserver | null = null;

	onMount(async () => {
		const lib = await import('pdfjs-dist');
		pdfjsLib = lib;
		const workerUrl = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url);
		lib.GlobalWorkerOptions.workerSrc = workerUrl.toString();
	});

	onDestroy(() => {
		currentLoadingTask?.destroy?.();
		cleanupObserver();
	});

	function cleanupObserver() {
		intersectionObserver?.disconnect();
		intersectionObserver = null;
	}

	function resetViewerState() {
		pages = [];
		thumbnails = {};
		outlineEntries = [];
		pageCount = 0;
		activePage = 1;
		canvasRefs = {};
		pageWrappers = {};
		isLoading = true;
		cleanupObserver();
	}

	async function loadPdf(url: string) {
		if (!pdfjsLib) return;
		resetViewerState();

		const token = ++currentLoadToken;
		currentRenderToken++;
		currentLoadingTask?.destroy?.();

		try {
			const loadingTask = pdfjsLib.getDocument(url) as unknown as LoadingTask;
			currentLoadingTask = loadingTask;
			const doc = await loadingTask.promise;
			if (token !== currentLoadToken) {
				loadingTask.destroy?.();
				return;
			}

			pdfDoc = doc;
			pageCount = doc.numPages;
			pages = Array.from({ length: doc.numPages }, (_, index) => ({ num: index + 1 }));
			thumbnails = {};
			activePage = 1;

			const outline = doc.getOutline ? await doc.getOutline() : null;
			if (outline && outline.length > 0) {
				const flattened = flattenOutline(outline);
				outlineEntries = await annotateOutlineEntries(doc, flattened);
			} else {
				outlineEntries = [];
			}

			await tick();
			setupIntersectionObserver();

			await renderAllPages({ regenerateThumbnails: true });

			if (isLoading) {
				isLoading = false;
			}
		} catch (error) {
			if (token === currentLoadToken) {
				console.error('Error loading PDF:', error);
				pdfDoc = null;
				outlineEntries = [];
				isLoading = false;
			}
		}
	}

	function flattenOutline(items: PdfOutlineItem[], level = 0, acc: OutlineEntry[] = []) {
		for (const item of items) {
			const entry: OutlineEntry = {
				id: randomId(),
				title: item.title ?? '',
				dest: item.dest ?? null,
				url: item.url ?? null,
				level,
				pageNumber: null
			};
			acc.push(entry);
			if (item.items && item.items.length > 0) {
				flattenOutline(item.items, level + 1, acc);
			}
		}
		return acc;
	}

	async function annotateOutlineEntries(doc: PdfDocLite, entries: OutlineEntry[]) {
		const result: OutlineEntry[] = [];
		for (const entry of entries) {
			let pageNumber: number | null = null;
			if (entry.dest) {
				pageNumber = await resolveDestinationToPage(entry.dest, doc);
			}
			result.push({ ...entry, pageNumber });
		}
		return result;
	}

	async function renderAllPages(options: { regenerateThumbnails?: boolean } = {}) {
		if (!pdfDoc || pages.length === 0) return;

		const { regenerateThumbnails = false } = options;
		const token = ++currentRenderToken;

		await tick();

		let markedLoaded = false;
		for (const page of pages) {
			if (token !== currentRenderToken) {
				return;
			}
			const rendered = await renderPageView(page.num, token, regenerateThumbnails);
			if (rendered && !markedLoaded && isLoading) {
				isLoading = false;
				markedLoaded = true;
			}
		}

		if (!markedLoaded && isLoading) {
			isLoading = false;
		}
	}

	async function renderPageView(pageNumber: number, token: number, regenerateThumb: boolean) {
		if (!pdfDoc) return false;

		let canvas = canvasRefs[pageNumber];
		if (!canvas) {
			await tick();
			canvas = canvasRefs[pageNumber];
			if (!canvas) {
				return false;
			}
		}

		try {
			const page = await pdfDoc.getPage(pageNumber);
			const viewport = page.getViewport({ scale });
			const context = canvas.getContext('2d');
			if (!context) {
				return false;
			}

			if (canvas.width !== viewport.width || canvas.height !== viewport.height) {
				canvas.width = viewport.width;
				canvas.height = viewport.height;
			}

			const renderTask = page.render({ canvasContext: context, viewport });
			await renderTask.promise;

			if (regenerateThumb || !thumbnails[pageNumber]) {
				const thumb = createThumbnail(canvas);
				thumbnails = { ...thumbnails, [pageNumber]: thumb };
			}

			return true;
		} catch (error) {
			if (token === currentRenderToken) {
				console.error(`Error rendering page ${pageNumber}:`, error);
			}
			return false;
		}
	}

	function createThumbnail(canvas: HTMLCanvasElement): string | null {
		if (!canvas.width || !canvas.height) {
			return null;
		}
		const ratio = Math.min(1, MAX_THUMBNAIL_WIDTH / canvas.width);
		const width = Math.max(1, Math.round(canvas.width * ratio));
		const height = Math.max(1, Math.round(canvas.height * ratio));

		const thumbCanvas = document.createElement('canvas');
		thumbCanvas.width = width;
		thumbCanvas.height = height;
		const context = thumbCanvas.getContext('2d');
		if (!context) {
			return null;
		}
		context.drawImage(canvas, 0, 0, width, height);
		return thumbCanvas.toDataURL('image/png');
	}

	function setupIntersectionObserver() {
		cleanupObserver();
		if (!scrollContainerRef) return;

		const observer = new IntersectionObserver(
			(entries) => {
				let candidate: { ratio: number; page: number } | null = null;
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					const page = Number((entry.target as HTMLElement).dataset.pageNumber);
					if (!Number.isFinite(page)) continue;
					if (!candidate || entry.intersectionRatio > candidate.ratio) {
						candidate = { ratio: entry.intersectionRatio, page };
					}
				}
				if (candidate && candidate.page !== activePage) {
					activePage = candidate.page;
				}
			},
			{
				root: scrollContainerRef,
				threshold: [0.25, 0.5, 0.75, 0.95]
			}
		);

		for (const page of pages) {
			const wrapper = pageWrappers[page.num];
			if (wrapper) {
				wrapper.dataset.pageNumber = String(page.num);
				observer.observe(wrapper);
			}
		}

		intersectionObserver = observer;
	}

	function randomId() {
		if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
			return crypto.randomUUID();
		}
		return `outline-${Math.random().toString(36).slice(2, 10)}`;
	}

	function showSidebar() {
		if (sidebarHideTimeout) {
			clearTimeout(sidebarHideTimeout);
			sidebarHideTimeout = null;
		}
		sidebarVisible = true;
	}

	function hideSidebarWithDelay() {
		if (isSidebarPointerInside) {
			return;
		}
		if (sidebarHideTimeout) {
			clearTimeout(sidebarHideTimeout);
		}
		sidebarHideTimeout = setTimeout(() => {
			sidebarVisible = false;
			sidebarHideTimeout = null;
		}, 180);
	}

	function handleSidebarMouseEnter() {
		isSidebarPointerInside = true;
		showSidebar();
	}

	function handleSidebarMouseLeave() {
		isSidebarPointerInside = false;
		hideSidebarWithDelay();
	}

	function handleSidebarPanelFocusOut(event: FocusEvent) {
		const container = event.currentTarget as HTMLElement | null;
		const next = event.relatedTarget as Node | null;
		if (container && next && container.contains(next)) {
			return;
		}
		hideSidebarWithDelay();
	}

	function handleSidebarTriggerFocusOut(event: FocusEvent) {
		const next = event.relatedTarget as Node | null;
		if (sidebarPanelRef && next && sidebarPanelRef.contains(next)) {
			return;
		}
		hideSidebarWithDelay();
	}

	function showZoomToolbar() {
		if (zoomHideTimeout) {
			clearTimeout(zoomHideTimeout);
			zoomHideTimeout = null;
		}
		zoomToolbarVisible = true;
	}

	function hideZoomToolbarWithDelay() {
		if (zoomHideTimeout) {
			clearTimeout(zoomHideTimeout);
		}
		zoomHideTimeout = setTimeout(() => {
			zoomToolbarVisible = false;
			zoomHideTimeout = null;
		}, 200);
	}

	function handleZoomToolbarFocusOut(event: FocusEvent) {
		const container = event.currentTarget as HTMLElement | null;
		const next = event.relatedTarget as Node | null;
		if (container && next && container.contains(next)) {
			return;
		}
		hideZoomToolbarWithDelay();
	}

	function handleZoomTriggerFocusOut(event: FocusEvent) {
		const next = event.relatedTarget as Node | null;
		if (zoomToolbarRef && next && zoomToolbarRef.contains(next)) {
			return;
		}
		hideZoomToolbarWithDelay();
	}

	function zoomIn() {
		scale = Math.min(scale + 0.25, 3.0);
		void renderAllPages();
		showZoomToolbar();
	}

	function zoomOut() {
		scale = Math.max(scale - 0.25, 0.5);
		void renderAllPages();
		showZoomToolbar();
	}

	function registerWrapper(node: HTMLDivElement, pageNumber: number) {
		pageWrappers = { ...pageWrappers, [pageNumber]: node };
		node.dataset.pageNumber = String(pageNumber);
		if (intersectionObserver) {
			intersectionObserver.observe(node);
		}
		return {
			destroy() {
				if (intersectionObserver) {
					intersectionObserver.unobserve(node);
				}
				pageWrappers = { ...pageWrappers, [pageNumber]: null };
			}
		};
	}

	function registerCanvas(node: HTMLCanvasElement, pageNumber: number) {
		canvasRefs = { ...canvasRefs, [pageNumber]: node };
		return {
			destroy() {
				canvasRefs = { ...canvasRefs, [pageNumber]: null };
			}
		};
	}

	function scrollToPage(pageNumber: number) {
		const wrapper = pageWrappers[pageNumber];
		const container = scrollContainerRef;
		if (!wrapper || !container) return;

		const containerRect = container.getBoundingClientRect();
		const wrapperRect = wrapper.getBoundingClientRect();
		const offset = wrapperRect.top - containerRect.top;
		container.scrollTo({ top: container.scrollTop + offset - 24, behavior: 'smooth' });
	}

	async function resolveDestinationToPage(
		dest: unknown,
		docParam?: PdfDocLite
	): Promise<number | null> {
		const doc = docParam ?? pdfDoc;
		if (!doc) return null;
		try {
			let explicitDest = dest;
			if (typeof explicitDest === 'string' && doc.getDestination) {
				explicitDest = await doc.getDestination(explicitDest);
			}
			if (!explicitDest) {
				return null;
			}
			if (Array.isArray(explicitDest)) {
				const first = explicitDest[0];
				if (
					typeof first === 'object' &&
					first !== null &&
					'num' in (first as Record<string, unknown>)
				) {
					if (doc.getPageIndex) {
						const pageIndex = await doc.getPageIndex(first);
						if (typeof pageIndex === 'number' && Number.isFinite(pageIndex)) {
							return pageIndex + 1;
						}
					}
				} else if (typeof first === 'number' && Number.isFinite(first)) {
					return first + 1;
				}
			}
		} catch (error) {
			console.error('Error resolving destination:', error);
		}
		return null;
	}

	async function navigateToEntry(entry: OutlineEntry) {
		if (entry.url) {
			window.open(entry.url, '_blank', 'noopener,noreferrer');
			return;
		}
		if (!entry.dest) return;
		const pageNumber = entry.pageNumber ?? (await resolveDestinationToPage(entry.dest));
		if (pageNumber) {
			scrollToPage(pageNumber);
			activePage = pageNumber;
		}
	}

	$effect(() => {
		const lib = pdfjsLib;
		const url = fileUrl;
		if (!lib) {
			return;
		}
		if (!url) {
			lastLoadedUrl = null;
			resetViewerState();
			pdfDoc = null;
			return;
		}
		if (lastLoadedUrl === url) {
			return;
		}
		lastLoadedUrl = url;
		void loadPdf(url);
	});
</script>

<div
	class="relative flex h-full min-h-0 overflow-hidden rounded-lg bg-base-200"
	role="group"
	aria-label={labels.canvas}
>
	<button
		type="button"
		class="absolute inset-y-0 left-0 z-20 w-5 cursor-pointer border-none bg-transparent p-0"
		aria-label={labels.sidebarOpen}
		onmouseenter={handleSidebarMouseEnter}
		onmouseleave={handleSidebarMouseLeave}
		onfocusin={showSidebar}
		onfocusout={handleSidebarTriggerFocusOut}
	></button>

	<aside
		bind:this={sidebarPanelRef}
		class={`${sidebarBaseClass} ${sidebarVisible ? sidebarVisibleClass : sidebarHiddenClass}`}
		onmouseenter={handleSidebarMouseEnter}
		onmouseleave={handleSidebarMouseLeave}
		onfocusin={showSidebar}
		onfocusout={handleSidebarPanelFocusOut}
	>
		<div
			class="flex w-full flex-col gap-3 rounded-2xl border border-base-content/15 bg-base-100/95 p-3 text-sm text-base-content/80 shadow-xl backdrop-blur"
		>
			{#if outlineEntries.length > 0}
				<div class="flex flex-col gap-2 overflow-hidden">
					<h3 class="m-0 text-xs font-semibold uppercase tracking-wide text-base-content/50">
						{labels.sidebarOutline}
					</h3>
					<ul class="flex-1 space-y-1 overflow-y-auto pr-1" role="tree">
						{#each outlineEntries as entry (entry.id)}
							<li role="none">
								<button
									class={`flex w-full items-center rounded-lg border border-transparent px-2 py-1 text-left text-xs transition hover:border-primary/40 hover:bg-primary/10 ${entry.pageNumber && entry.pageNumber === activePage ? 'border-primary/60 bg-primary/10 text-primary' : 'text-base-content/70'}`}
									role="treeitem"
									aria-level={entry.level + 1}
									aria-current={entry.pageNumber === activePage ? 'page' : undefined}
									aria-selected={entry.pageNumber === activePage ? 'true' : 'false'}
									onclick={() => {
										void navigateToEntry(entry);
									}}
									style={`padding-left: ${entry.level * 12 + 8}px;`}
									disabled={!entry.dest && !entry.url}
								>
									<span class="truncate">
										{entry.title?.trim() ? entry.title : labels.outlineUntitled}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<div class="flex flex-col gap-2 overflow-hidden">
					<h3 class="m-0 text-xs font-semibold uppercase tracking-wide text-base-content/50">
						{labels.sidebarThumbnails}
					</h3>
					<div class="flex-1 space-y-2 overflow-y-auto pr-1">
						{#each pages as page (page.num)}
							<button
								class={`flex w-full flex-col items-center gap-2 rounded-lg border border-base-content/10 bg-base-100/90 p-2 text-xs transition hover:border-primary/50 hover:bg-primary/5 ${activePage === page.num ? 'border-primary/60 ring-1 ring-primary/40' : ''}`}
								onclick={() => {
									scrollToPage(page.num);
									activePage = page.num;
								}}
								aria-label={labels.thumbnailPage(page.num)}
							>
								{#if thumbnails[page.num]}
									<img
										src={thumbnails[page.num]!}
										alt={labels.thumbnailPage(page.num)}
										class="h-auto w-full rounded border border-base-content/10 bg-base-100 object-cover"
									/>
								{:else}
									<div
										class="flex h-28 w-full items-center justify-center rounded border border-dashed border-base-content/20 text-[0.65rem] text-base-content/50"
									>
										{labels.commonLoading}
									</div>
								{/if}
								<span
									class="block w-full text-center text-[0.65rem] font-medium uppercase tracking-wide text-base-content/50"
								>
									{labels.pageLabel(page.num)}
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</aside>

	<div class="relative flex-1 overflow-hidden">
		<div bind:this={scrollContainerRef} class="h-full w-full overflow-auto px-6 py-8">
			<div class="mx-auto flex max-w-5xl flex-col gap-8">
				{#each pages as page (page.num)}
					<div
						class="flex justify-center"
						data-page-number={page.num}
						use:registerWrapper={page.num}
					>
						<canvas
							use:registerCanvas={page.num}
							class="max-w-full rounded-xl border border-base-content/10 bg-base-100 shadow-xl"
							aria-label={labels.pageCanvas(page.num)}
						></canvas>
					</div>
				{/each}
			</div>
		</div>
	</div>

	{#if isLoading}
		<div
			class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-base-200/80"
		>
			<span class="loading loading-spinner text-primary" aria-hidden="true"></span>
			<span class="sr-only">{labels.loading}</span>
		</div>
	{/if}

	<button
		type="button"
		class="absolute bottom-0 right-0 z-20 h-16 w-16 cursor-pointer border-none bg-transparent p-0"
		aria-label={labels.zoomOpen}
		onmouseenter={showZoomToolbar}
		onmouseleave={hideZoomToolbarWithDelay}
		onfocusin={showZoomToolbar}
		onfocusout={handleZoomTriggerFocusOut}
	></button>

	<div
		bind:this={zoomToolbarRef}
		class={`${zoomToolbarBaseClass} ${zoomToolbarVisible ? zoomToolbarVisibleClass : zoomToolbarHiddenClass}`}
		role="group"
		onmouseenter={showZoomToolbar}
		onmouseleave={hideZoomToolbarWithDelay}
		onfocusin={showZoomToolbar}
		onfocusout={handleZoomToolbarFocusOut}
	>
		<Button
			variant="ghost"
			size="xs"
			on:click={zoomOut}
			disabled={scale <= 0.5}
			class={zoomButtonClass}
			ariaLabel={labels.zoomOut}
		>
			<svg
				width="12"
				height="12"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				class="h-3.5 w-3.5"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
			</svg>
		</Button>
		<Button
			variant="ghost"
			size="xs"
			on:click={zoomIn}
			disabled={scale >= 3.0}
			class={zoomButtonClass}
			ariaLabel={labels.zoomIn}
		>
			<svg
				width="12"
				height="12"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				class="h-3.5 w-3.5"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
		</Button>
	</div>
</div>
