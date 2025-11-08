<script lang="ts">
	import FileList from '$lib/components/files/FileList.svelte';
	import Uploader from '$lib/components/upload/Uploader.svelte';
	import * as m from '$lib/paraglide/messages';
	import { currentLanguage } from '$lib/stores/language';
	import type { File } from '$lib/types/models';

	type UploadCompletePayload = Array<{ id: string; name: string }>;

	interface Props {
		files?: File[];
		currentFileId?: string | null;
		maxFiles?: number;
		onSelect?: (id: string) => void;
		onUploadComplete?: (payload: UploadCompletePayload) => void;
		onUploadError?: (message: string) => void;
	}

	let {
		files = [],
		currentFileId = null,
		maxFiles = 10,
		onSelect,
		onUploadComplete,
		onUploadError
	}: Props = $props();

	const labels = $derived.by(() => {
		$currentLanguage;
		return {
			title: m.upload_file(),
			subtitle: m.workspace_subtitle()
		};
	});

	function handleUploadComplete(payload: UploadCompletePayload) {
		onUploadComplete?.(payload);
	}

	function handleUploadError(message: string) {
		onUploadError?.(message);
	}
</script>

<section class="upload-panel" aria-label={labels.title}>
	<header class="upload-panel__header">
		<h2 class="upload-panel__title">{labels.title}</h2>
		<p class="upload-panel__subtitle">{labels.subtitle}</p>
	</header>

	<div class="upload-panel__uploader">
		<Uploader
			onUploadComplete={handleUploadComplete}
			onUploadError={handleUploadError}
			{maxFiles}
		/>
	</div>

	<FileList files={files} selectedId={currentFileId} onSelect={onSelect} />
</section>

<style>
	.upload-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.75rem;
		border-right: 1px solid oklch(var(--bc) / 0.1);
		background: oklch(var(--b1));
		height: 100%;
	}

	.upload-panel__header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.upload-panel__title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.upload-panel__subtitle {
		margin: 0;
		font-size: 0.85rem;
		color: oklch(var(--bc) / 0.6);
	}

	.upload-panel__uploader {
		border-radius: 0.75rem;
		background: oklch(var(--b1));
		border: 1px dashed oklch(var(--bc) / 0.12);
		padding: 1.25rem;
	}

	@media (max-width: 900px) {
		.upload-panel {
			border-right: none;
			border-bottom: 1px solid oklch(var(--bc) / 0.08);
		}
	}
</style>
