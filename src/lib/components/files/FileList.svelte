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

<div class="flex flex-col gap-4">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h3 class="m-0 text-base font-semibold text-base-content/90">{labels.heading}</h3>
			<p class="mt-1 text-xs text-base-content/60">{labels.hint}</p>
		</div>
		{#if files.length > 0}
			<span class="text-xs text-base-content/60">{m.file_list_count({ count: files.length })}</span>
		{/if}
	</header>

	{#if files.length === 0}
		<p class="rounded-xl border border-dashed border-base-content/20 p-6 text-center text-sm text-base-content/60">{labels.empty}</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each files as file (file.id)}
				<li>
					<button
						type="button"
						onclick={() => onSelect?.(file.id)}
						class={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${selectedId === file.id ? 'border-primary bg-primary/15 text-primary' : 'border-transparent bg-base-100 text-base-content/80 hover:border-base-content/10 hover:bg-base-100/90'}`}
						aria-current={selectedId === file.id ? 'true' : 'false'}
					>
						<span
							class={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 ${selectedId === file.id ? 'bg-primary/15 text-primary' : 'bg-base-content/10 text-base-content/70'}`}
							data-type={fileIcon(file.type)}
							aria-hidden="true"
						>
							{#if fileIcon(file.type) === 'image'}
								<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							{:else if fileIcon(file.type) === 'pdf'}
								<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
									/>
								</svg>
							{:else}
								<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
							{/if}
						</span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-base-content/90" title={file.name}>{file.name}</p>
							<p class="mt-1 text-xs text-base-content/60">
								{(file.size / 1024).toFixed(1)}
								{labels.unit}
							</p>
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
