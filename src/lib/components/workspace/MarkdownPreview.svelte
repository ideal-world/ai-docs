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
			ADD_ATTR: ['style', 'class', 'viewBox', 'aria-label']
		});
	}

	function preprocessMarkdown(markdown: string): string {
		return markdown.replace(/\\\*\\\*(.*?)\\\*\\\*/gs, '**$1**').replace(/\\`/g, '`');
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
		normalizeMermaidParagraphs();
		await renderMermaidDiagrams();
	}

	function enhanceLinks() {
		if (!containerRef) return;
		const anchors = containerRef.querySelectorAll<HTMLAnchorElement>('a[href]');
		anchors.forEach((anchor) => {
			anchor.setAttribute('target', '_blank');
			anchor.setAttribute('rel', 'noopener noreferrer');
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

	.markdown-content :global(pre) {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(236, 72, 153, 0.08));
		border-radius: 0.75rem;
		padding: 1rem;
		overflow-x: auto;
	}

	.markdown-content :global(code) {
		font-family: var(--font-mono, 'Fira Code', 'SFMono-Regular', ui-monospace, monospace);
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

	.markdown-content :global(table) {
		width: 100%;
		border-collapse: collapse;
	}

	.markdown-content :global(th),
	.markdown-content :global(td) {
		border: 1px solid rgb(229 231 235 / 0.6);
		padding: 0.5rem 0.75rem;
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
</style>
