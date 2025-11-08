<script lang="ts">
	import { currentLanguage } from '$lib/stores/language';
	import * as m from '$lib/paraglide/messages';
	import type { File } from '$lib/types/models';

	interface Props {
		files?: File[];
		selectedId?: string | null;
		onSelect?: (id: string) => void;
	}

	let { files = [], selectedId = null, onSelect }: Props = $props();

	const labels = $derived.by(() => {
		$currentLanguage;
		return {
			heading: m.file_list_heading(),
			empty: m.file_list_empty(),
			hint: m.upload_sidebar_hint(),
			unit: m.file_unit_kb()
		};
	});

	function fileIcon(type: File['type']) {
		if (type === 'image') {
			return 'image';
		}
		if (type === 'pdf') {
			return 'pdf';
		}
		return 'other';
	}
</script>

<div class="file-list">
	<header class="file-list__header">
		<div>
			<h3 class="file-list__title">{labels.heading}</h3>
			<p class="file-list__hint">{labels.hint}</p>
		</div>
		{#if files.length > 0}
			<span class="file-list__count">{m.file_list_count({ count: files.length })}</span>
		{/if}
	</header>

	{#if files.length === 0}
		<p class="file-list__empty">{labels.empty}</p>
	{:else}
		<ul class="file-list__items">
			{#each files as file (file.id)}
				<li>
					<button
						type="button"
						onclick={() => onSelect?.(file.id)}
						class="file-list__item"
						class:file-list__item--active={selectedId === file.id}
						aria-current={selectedId === file.id ? 'true' : 'false'}
					>
						<span class="file-list__icon" data-type={fileIcon(file.type)} aria-hidden="true">
							{#if fileIcon(file.type) === 'image'}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							{:else if fileIcon(file.type) === 'pdf'}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
									/>
								</svg>
							{:else}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
							{/if}
						</span>
						<div class="file-list__meta">
							<p class="file-list__name" title={file.name}>{file.name}</p>
							<p class="file-list__details">
								{(file.size / 1024).toFixed(1)} {labels.unit}
							</p>
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.file-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.file-list__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.file-list__title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.file-list__hint {
		margin: 0.25rem 0 0;
		font-size: 0.8125rem;
		color: oklch(var(--bc) / 0.6);
	}

	.file-list__count {
		font-size: 0.8125rem;
		color: oklch(var(--bc) / 0.6);
	}

	.file-list__empty {
		padding: 1.5rem;
		text-align: center;
		border: 1px dashed oklch(var(--bc) / 0.2);
		border-radius: 0.75rem;
		color: oklch(var(--bc) / 0.6);
		font-size: 0.875rem;
	}

	.file-list__items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.file-list__item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 0.75rem;
		border: 1px solid transparent;
		transition: background-color 0.2s ease, border-color 0.2s ease;
		background: oklch(var(--b1));
		cursor: pointer;
		text-align: left;
	}

	.file-list__item:hover {
		background: oklch(var(--b1) / 0.9);
		border-color: oklch(var(--bc) / 0.1);
	}

	.file-list__item--active {
		border-color: oklch(var(--p));
		background: oklch(var(--p) / 0.14);
	}

	.file-list__icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		color: oklch(var(--bc) / 0.7);
		background: oklch(var(--bc) / 0.08);
	}

	.file-list__icon svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.file-list__item--active .file-list__icon {
		color: oklch(var(--p));
		background: oklch(var(--p) / 0.16);
	}

	.file-list__meta {
		flex: 1;
		min-width: 0;
	}

	.file-list__name {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-list__details {
		margin: 0.125rem 0 0;
		font-size: 0.75rem;
		color: oklch(var(--bc) / 0.6);
	}
</style>
