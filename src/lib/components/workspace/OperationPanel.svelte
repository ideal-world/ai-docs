<script lang="ts">
	import MarkdownPreview from '$lib/components/workspace/MarkdownPreview.svelte';
	import { latestMarkdownFile } from '$lib/stores/documents';
	import * as m from '$lib/paraglide/messages';

	const copy = $derived.by(() => ({
		title: m.operation_markdown_latest(),
		empty: m.operation_markdown_empty(),
		loading: m.operation_markdown_loading(),
		error: (reason: string) => m.operation_markdown_error({ reason })
	}));

	const markdownFile = $derived.by(() => $latestMarkdownFile);
</script>

<section class="flex h-full flex-col rounded-lg bg-base-100 shadow-sm">
	{#if markdownFile}
		<div class="flex-1 min-h-0 overflow-hidden">
			<MarkdownPreview file={markdownFile} loadingText={copy.loading} errorText={copy.error} />
		</div>
	{:else}
		<header
			class="flex items-center justify-between gap-3 border-b border-base-content/10 px-4 py-3"
		>
			<h3 class="text-sm font-semibold text-base-content/90">{copy.title}</h3>
		</header>
		<p
			class="flex-1 rounded-b-lg border border-dashed border-base-content/15 bg-base-100/70 px-4 py-6 text-sm leading-relaxed text-base-content/60"
		>
			{copy.empty}
		</p>
	{/if}
</section>
