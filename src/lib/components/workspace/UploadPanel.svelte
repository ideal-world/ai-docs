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


<section class="flex h-full flex-col gap-6 border-base-content/10 bg-base-100 p-7 border-b lg:border-b-0 lg:border-r" aria-label={labels.title}>
	<header class="flex flex-col gap-2">
		<h2 class="text-lg font-semibold text-base-content/90">{labels.title}</h2>
		<p class="text-sm text-base-content/60">{labels.subtitle}</p>
	</header>

	<div class="rounded-xl border border-dashed border-base-content/12 bg-base-100 p-5">
		<Uploader
			onUploadComplete={handleUploadComplete}
			onUploadError={handleUploadError}
			{maxFiles}
		/>
	</div>

	<FileList {files} selectedId={currentFileId} {onSelect} />
</section>
