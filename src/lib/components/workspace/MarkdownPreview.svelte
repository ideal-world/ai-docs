<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import type { File } from '$lib/types/models';

	interface Props {
		file: File | null;
		loadingText: string;
		errorText: (reason: string) => string;
	}

	let { file, loadingText, errorText }: Props = $props();

	let html = $state('');
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let controller: AbortController | null = null;
	let containerRef = $state<HTMLElement | null>(null);
	let mermaidModule: Promise<typeof import('mermaid')> | null = null;
	let mermaidInitialized = false;
	let highlightModule: Promise<typeof import('highlight.js/lib/common')> | null = null;
	let highlightStylesLoaded = false;

	async function renderMarkdown(markdown: string): Promise<string> {
		const [{ marked }, { default: createDOMPurify }] = await Promise.all([
			import('marked'),
			import('dompurify')
		]);

		const preprocessed = preprocessMarkdown(markdown);

		marked.setOptions({
			gfm: true,
			breaks: true
		});

		const parsed = await marked.parse(preprocessed);
		const DOMPurify = createDOMPurify(window);
		return DOMPurify.sanitize(parsed, {
			ADD_TAGS: ['svg', 'path'],
			ADD_ATTR: ['style', 'class', 'viewBox', 'aria-label', 'data-callout']
		});
	}

	function preprocessMarkdown(markdown: string): string {
		return markdown
			.replace(/\r\n?/g, '\n')
			.replace(/\\\*\\\*(.*?)\\\*\\\*/gs, '**$1**')
			.replace(/\\`/g, '`')
			.replace(/\\([!#()*+\-./:<=>?@[\\\]^_{|}~])/g, '$1');
	}

	async function loadMarkdown(target: File) {
		if (!browser) return;

		controller?.abort();

		const nextController = new AbortController();
		controller = nextController;

		loading = true;
		errorMessage = null;
		html = '';

		try {
			const response = await fetch(target.path, { signal: nextController.signal });
			if (!response.ok) {
				throw new Error(`${response.status}`);
			}

			const markdown = await response.text();
			html = await renderMarkdown(markdown);
			await tick();
			await enhanceMarkdown();
		} catch (error) {
			if ((error as DOMException)?.name === 'AbortError') {
				return;
			}
			errorMessage = errorText((error as Error).message ?? 'Unknown error');
		} finally {
			if (controller === nextController) {
				controller = null;
			}
			loading = false;
		}
	}

	async function enhanceMarkdown() {
		if (!browser || !containerRef) return;
		enhanceLinks();
		enhanceCallouts();
		enhanceTaskLists();
		enhanceTables();
		enhanceHeadings();
		normalizeMermaidParagraphs();
		await renderMermaidDiagrams();
		await highlightCodeBlocks();
	}

	function enhanceLinks() {
		if (!containerRef) return;
		const anchors = containerRef.querySelectorAll<HTMLAnchorElement>('a[href]');
		anchors.forEach((anchor) => {
			anchor.setAttribute('target', '_blank');
			anchor.setAttribute('rel', 'noopener noreferrer');
		});
	}

	function enhanceTaskLists() {
		if (!containerRef) return;
		const inputs = containerRef.querySelectorAll<HTMLInputElement>('li > input[type="checkbox"]');
		inputs.forEach((input) => {
			input.disabled = true;
			const listItem = input.closest('li');
			if (listItem) {
				listItem.classList.add('task-list-item');
			}
			input.classList.add('task-checkbox');
		});
	}

	function enhanceTables() {
		if (!containerRef) return;
		const tables = containerRef.querySelectorAll('table');
		tables.forEach((table) => {
			const parent = table.parentElement;
			if (!parent) return;
			if (parent.classList.contains('table-wrapper')) return;
			const wrapper = document.createElement('div');
			wrapper.className = 'table-wrapper';
			parent.insertBefore(wrapper, table);
			wrapper.appendChild(table);
		});
	}

	function enhanceCallouts() {
		if (!containerRef) return;
		const blockquotes = containerRef.querySelectorAll('blockquote');
		blockquotes.forEach((blockquote) => {
			const first = blockquote.firstElementChild;
			if (!first) return;
			const textContent = first.textContent?.trim();
			if (!textContent) return;
			const match = textContent.match(
				/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DANGER|INFO)\]\s*(.*)$/i
			);
			if (!match) return;

			const [, rawType, message] = match;
			const type = rawType.toLowerCase();
			blockquote.dataset.callout = rawType.toUpperCase();
			blockquote.classList.add('callout', `callout-${type}`);
			first.textContent = message || '';
		});
	}

	function slugify(text: string): string {
		return text
			.toString()
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^\p{L}\p{N}\s-]/gu, '')
			.trim()
			.replace(/[\s_-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase();
	}

	function enhanceHeadings() {
		if (!containerRef) return;
		const headings = containerRef.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6');
		const used = new Set<string>();
		headings.forEach((heading) => {
			const text = heading.textContent?.trim();
			if (!text) return;
			let slug = slugify(text) || 'section';
			let suffix = 1;
			while (used.has(slug)) {
				slug = `${slug}-${suffix++}`;
			}
			used.add(slug);
			heading.id = slug;

			if (!heading.classList.contains('has-anchor')) {
				heading.classList.add('has-anchor');
				const anchor = document.createElement('a');
				anchor.href = `#${slug}`;
				anchor.className = 'heading-anchor';
				anchor.setAttribute('aria-label', text);
				anchor.setAttribute('tabindex', '-1');
				anchor.innerHTML =
					'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.59 13.41a1 1 0 010-1.41l2-2a1 1 0 011.41 1.41l-2 2a1 1 0 01-1.41 0zm-4.95 4.95a3 3 0 010-4.24l2.12-2.12a1 1 0 111.41 1.41L7.05 15.54a1 1 0 000 1.41 1 1 0 001.41 0l2.12-2.12a1 1 0 111.41 1.41l-2.12 2.12a3 3 0 01-4.24 0zm7.78-7.78a1 1 0 010-1.41l2.12-2.12a3 3 0 014.24 4.24l-2.12 2.12a1 1 0 11-1.41-1.41l2.12-2.12a1 1 0 000-1.41 1 1 0 00-1.41 0l-2.12 2.12a1 1 0 01-1.41 0z"/></svg>';
				heading.appendChild(anchor);
			}
		});
	}

	function normalizeMermaidParagraphs() {
		if (!containerRef) return;
		const paragraphs = containerRef.querySelectorAll('p');
		paragraphs.forEach((paragraph) => {
			const text = paragraph.textContent?.trim();
			if (!text) return;

			if (/^(flowchart|graph|sequenceDiagram|classDiagram)\b/i.test(text)) {
				const normalized = text
					.replace(/\u00A0/g, ' ')
					.split('\n')
					.map((line) => line.trimEnd())
					.join('\n');

				const pre = document.createElement('pre');
				const code = document.createElement('code');
				code.className = 'language-mermaid';
				code.textContent = normalized;
				pre.appendChild(code);
				paragraph.replaceWith(pre);
			}
		});
	}

	async function renderMermaidDiagrams() {
		if (!containerRef) return;
		const codeBlocks = containerRef.querySelectorAll(
			'code.language-mermaid, code.language-flowchart'
		);
		if (!codeBlocks.length) return;

		try {
			if (!mermaidModule) {
				mermaidModule = import('mermaid');
			}

			const mermaid = (await mermaidModule).default ?? (await mermaidModule);
			if (!mermaidInitialized) {
				mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'neutral' });
				mermaidInitialized = true;
			}

			await Promise.all(
				Array.from(codeBlocks).map(async (codeBlock, index) => {
					const parent = codeBlock.closest('pre');
					const definition = codeBlock.textContent?.trim();
					if (!parent || !definition) {
						return;
					}

					const diagramId =
						typeof crypto !== 'undefined' && 'randomUUID' in crypto
							? crypto.randomUUID()
							: `mermaid-${Date.now()}-${index}`;

					try {
						const { svg } = await mermaid.render(diagramId, definition);
						const wrapper = document.createElement('div');
						wrapper.className = 'mermaid-diagram';
						wrapper.innerHTML = svg;
						parent.replaceWith(wrapper);
					} catch (error) {
						const fallback = document.createElement('pre');
						fallback.className = 'mermaid-error';
						fallback.textContent = `Mermaid render failed: ${(error as Error).message}`;
						parent.replaceWith(fallback);
					}
				})
			);
		} catch (_error) {
			mermaidModule = null;
		}
	}

	async function highlightCodeBlocks() {
		if (!containerRef) return;
		const codeBlocks = containerRef.querySelectorAll<HTMLElement>(
			'pre code:not(.language-mermaid)'
		);
		if (!codeBlocks.length) return;

		try {
			if (!highlightModule) {
				highlightModule = import('highlight.js/lib/common');
			}
			if (!highlightStylesLoaded) {
				await import('highlight.js/styles/github-dark-dimmed.css');
				highlightStylesLoaded = true;
			}
			const highlight = (await highlightModule).default ?? (await highlightModule);
			codeBlocks.forEach((block) => {
				highlight.highlightElement(block);
				block.classList.add('hljs-ready');
			});
		} catch (_error) {
			highlightModule = null;
		}
	}

	$effect(() => {
		if (!file || !browser) {
			html = '';
			errorMessage = null;
			loading = false;
			controller?.abort();
			controller = null;
			return;
		}

		void loadMarkdown(file);
	});

	onDestroy(() => {
		controller?.abort();
	});
</script>

<div class="h-full min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3">
	{#if loading}
		<p class="text-sm text-base-content/60">{loadingText}</p>
	{:else if errorMessage}
		<p class="text-sm text-error">{errorMessage}</p>
	{:else if html}
		<article
			bind:this={containerRef}
			class="prose prose-sm max-w-none text-base-content/80 markdown-content"
			aria-live="polite"
		>
			{@html html}
		</article>
	{/if}
</div>

<style>
	.markdown-content {
		font-family:
			'Inter',
			ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
	}

	.markdown-content :global(h1),
	.markdown-content :global(h2),
	.markdown-content :global(h3) {
		font-weight: 700;
		color: rgb(30 41 59);
		margin-top: 1.75rem;
		margin-bottom: 0.75rem;
	}

	.markdown-content :global(h4),
	.markdown-content :global(h5),
	.markdown-content :global(h6) {
		font-weight: 600;
		color: rgb(51 65 85);
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.markdown-content :global(h1) {
		font-size: 1.875rem;
	}

	.markdown-content :global(h2) {
		font-size: 1.5rem;
	}

	.markdown-content :global(h3) {
		font-size: 1.25rem;
	}

	.markdown-content :global(p + h1),
	.markdown-content :global(p + h2),
	.markdown-content :global(p + h3) {
		margin-top: 2.25rem;
	}

	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		margin: 1rem 0 1rem 1.5rem;
		padding: 0;
		color: rgb(55 65 81);
	}

	.markdown-content :global(li) {
		margin: 0.35rem 0;
		line-height: 1.6;
	}

	.markdown-content :global(li::marker) {
		color: rgb(148 163 184);
	}

	.markdown-content :global(li > p) {
		margin: 0.35rem 0;
	}

	.markdown-content :global(pre) {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(236, 72, 153, 0.08));
		border-radius: 0.75rem;
		padding: 1rem;
		overflow-x: auto;
		margin: 1.25rem 0;
	}

	.markdown-content :global(code) {
		font-family: var(--font-mono, 'Fira Code', 'SFMono-Regular', ui-monospace, monospace);
	}

	.markdown-content :global(code:not(pre code)) {
		background: rgba(15, 23, 42, 0.05);
		padding: 0.15rem 0.35rem;
		border-radius: 0.4rem;
		font-size: 0.9em;
	}

	.markdown-content :global(strong) {
		font-weight: 700;
		color: rgb(30 41 59);
	}

	.markdown-content :global(em) {
		font-style: italic;
		color: rgb(55 65 81);
	}

	.markdown-content :global(blockquote) {
		border-left: 4px solid rgba(59, 130, 246, 0.4);
		padding-left: 1rem;
		color: rgb(71 85 105);
		font-style: italic;
		background-color: rgba(59, 130, 246, 0.05);
		border-radius: 0.5rem;
	}

	.markdown-content :global(blockquote > p) {
		margin: 0.5rem 0;
	}

	.markdown-content :global(hr) {
		border: none;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4), transparent);
		margin: 2rem 0;
	}

	.markdown-content :global(img) {
		max-width: 100%;
		border-radius: 0.75rem;
		box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
	}

	.markdown-content :global(kbd) {
		background: rgba(15, 23, 42, 0.08);
		border-radius: 0.4rem;
		padding: 0.15rem 0.35rem;
		font-size: 0.85em;
		box-shadow: inset 0 -1px 0 rgba(15, 23, 42, 0.4);
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
	}

	.markdown-content :global(mark) {
		background: rgba(250, 204, 21, 0.35);
		padding: 0.1rem 0.35rem;
		border-radius: 0.35rem;
	}

	.markdown-content :global(table) {
		width: 100%;
		border-collapse: collapse;
	}

	.markdown-content :global(th),
	.markdown-content :global(td) {
		border: 1px solid rgb(229 231 235 / 0.6);
		padding: 0.5rem 0.75rem;
	}

	.markdown-content :global(th) {
		background: rgba(59, 130, 246, 0.08);
		font-weight: 600;
	}

	.markdown-content :global(tr:nth-child(even) td) {
		background: rgba(148, 163, 184, 0.08);
	}

	.markdown-content :global(.table-wrapper) {
		overflow-x: auto;
		margin: 1.5rem 0;
		border-radius: 0.75rem;
		border: 1px solid rgba(148, 163, 184, 0.25);
		background: linear-gradient(135deg, rgba(148, 163, 184, 0.08), rgba(59, 130, 246, 0.05));
	}

	.markdown-content :global(.table-wrapper table) {
		margin: 0;
		min-width: min(100%, 680px);
	}

	.markdown-content :global(.mermaid-diagram) {
		margin: 1.5rem 0;
		padding: 1rem;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, rgba(94, 234, 212, 0.12), rgba(37, 99, 235, 0.08));
		overflow-x: auto;
	}

	.markdown-content :global(.mermaid-error) {
		background: rgba(239, 68, 68, 0.1);
		border-radius: 0.75rem;
		padding: 1rem;
		color: rgb(185 28 28);
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.markdown-content :global(.task-list-item) {
		list-style: none;
		margin-left: 0;
		position: relative;
		padding-left: 1.75rem;
	}

	.markdown-content :global(.task-checkbox) {
		position: absolute;
		left: 0;
		top: 0.25rem;
		width: 1rem;
		height: 1rem;
		accent-color: rgb(59 130 246);
		border-radius: 0.25rem;
	}

	.markdown-content :global(.callout) {
		position: relative;
		border-radius: 0.75rem;
		padding: 1rem 1.25rem 1rem 1.25rem;
		margin: 1.5rem 0;
		border: 1px solid rgba(148, 163, 184, 0.3);
		background: rgba(226, 232, 240, 0.4);
	}

	.markdown-content :global(.callout)::before {
		content: attr(data-callout);
		position: absolute;
		top: -0.85rem;
		left: 1.25rem;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		padding: 0.25rem 0.6rem;
		border-radius: 9999px;
		text-transform: uppercase;
		background: rgba(15, 23, 42, 0.85);
		color: white;
	}

	.markdown-content :global(.callout-tip) {
		border-color: rgba(45, 212, 191, 0.4);
		background: rgba(16, 185, 129, 0.08);
	}

	.markdown-content :global(.callout-warning),
	.markdown-content :global(.callout-caution) {
		border-color: rgba(251, 191, 36, 0.55);
		background: rgba(251, 191, 36, 0.1);
	}

	.markdown-content :global(.callout-danger) {
		border-color: rgba(239, 68, 68, 0.5);
		background: rgba(239, 68, 68, 0.12);
	}

	.markdown-content :global(.callout-important),
	.markdown-content :global(.callout-note),
	.markdown-content :global(.callout-info) {
		border-color: rgba(59, 130, 246, 0.45);
		background: rgba(59, 130, 246, 0.12);
	}

	.markdown-content :global(.heading-anchor) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		margin-left: 0.35rem;
		border-radius: 9999px;
		color: rgba(59, 130, 246, 0.55);
		opacity: 0;
		transition:
			opacity 0.2s ease,
			transform 0.2s ease;
	}

	.markdown-content :global(.heading-anchor svg) {
		width: 1rem;
		height: 1rem;
	}

	.markdown-content :global(.has-anchor:hover .heading-anchor),
	.markdown-content :global(.has-anchor:focus-within .heading-anchor) {
		opacity: 1;
		transform: translateY(-2px);
	}

	.markdown-content :global(.hljs) {
		background: transparent;
		padding: 0;
	}

	.markdown-content :global(details) {
		margin: 1.5rem 0;
		border: 1px solid rgba(148, 163, 184, 0.3);
		border-radius: 0.75rem;
		padding: 0.75rem 1rem;
		background: rgba(226, 232, 240, 0.35);
	}

	.markdown-content :global(summary) {
		cursor: pointer;
		font-weight: 600;
	}

	.markdown-content :global(a) {
		color: rgb(37 99 235);
		text-decoration: none;
		border-bottom: 1px solid rgba(37, 99, 235, 0.35);
		transition:
			color 0.2s ease,
			border-color 0.2s ease;
	}

	.markdown-content :global(a:hover) {
		color: rgb(59 130 246);
		border-color: rgba(59, 130, 246, 0.6);
	}
</style>
