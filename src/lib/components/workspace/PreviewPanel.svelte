<script lang="ts">
	import ImagePreview from '$lib/components/preview/ImagePreview.svelte';
	import PDFPreview from '$lib/components/preview/PDFPreview.svelte';
	import type { File } from '$lib/types/models';
	import { currentLanguage } from '$lib/stores/language';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		file?: File | null;
	}

	let { file = null }: Props = $props();

	const labels = $derived.by(() => {
		$currentLanguage;
		return {
			emptyTitle: m.preview_empty_title(),
			emptyHint: m.preview_empty_hint(),
			conversionTitle: m.preview_office_conversion_title(),
			conversionBody: m.preview_office_conversion_body(),
			unknownTitle: m.preview_unknown_type_title(),
			unknownBody: m.preview_unknown_type_body()
		};
	});
</script>

<section class="preview-panel">
	{#if file}
		{#if file.type === 'image'}
			<ImagePreview imageUrl={file.path} fileName={file.name} />
		{:else if file.type === 'pdf'}
			<PDFPreview fileUrl={file.path} fileName={file.name} />
		{:else if file.type === 'office'}
			<div class="preview-panel__state preview-panel__state--info">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<h3>{labels.conversionTitle}</h3>
				<p>{labels.conversionBody}</p>
			</div>
		{:else}
			<div class="preview-panel__state preview-panel__state--warning">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01M12 5a7 7 0 100 14 7 7 0 000-14z"
					/>
				</svg>
				<h3>{labels.unknownTitle}</h3>
				<p>{labels.unknownBody}</p>
			</div>
		{/if}
	{:else}
		<div class="preview-panel__state preview-panel__state--empty">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
				/>
			</svg>
			<h3>{labels.emptyTitle}</h3>
			<p>{labels.emptyHint}</p>
		</div>
	{/if}
</section>

<style>
	.preview-panel {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: oklch(var(--b2));
	}

	.preview-panel__state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: 1rem;
		padding: 3rem 2rem;
		color: oklch(var(--bc) / 0.75);
	}

	.preview-panel__state svg {
		width: 3.5rem;
		height: 3.5rem;
		color: inherit;
	}

	.preview-panel__state h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: oklch(var(--bc) / 0.9);
	}

	.preview-panel__state p {
		margin: 0;
		max-width: 32rem;
		font-size: 0.95rem;
		line-height: 1.6;
	}

	.preview-panel__state--info {
		color: oklch(var(--su) / 0.75);
	}

	.preview-panel__state--warning {
		color: oklch(var(--wa) / 0.75);
	}

	.preview-panel__state--empty {
		color: oklch(var(--bc) / 0.55);
	}
</style>
