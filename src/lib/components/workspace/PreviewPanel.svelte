<script lang="ts">
	import ImagePreview from '$lib/components/preview/ImagePreview.svelte';
	import PDFPreview from '$lib/components/preview/PDFPreview.svelte';
	import Uploader from '$lib/components/upload/Uploader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { File } from '$lib/types/models';
	import { currentLanguage } from '$lib/stores/language';
	import { documentsStore, currentPreview } from '$lib/stores/documents';
	import { modeStore } from '$lib/stores/mode';
	import { activeTasks } from '$lib/stores/processing';
	import { get } from 'svelte/store';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		file?: File | null;
	}

	let { file = null }: Props = $props();

	let showUploadPanel = $state(false);

	const labels = $derived.by(() => {
		$currentLanguage;
		return {
			emptyTitle: m.preview_empty_title(),
			emptyHint: m.preview_empty_hint(),
			conversionTitle: m.preview_office_conversion_title(),
			conversionBody: m.preview_office_conversion_body(),
			conversionCancelledTitle: m.task_cancel_success(),
			conversionCancelledBody: m.processing_modal_cancel_success(),
			unknownTitle: m.preview_unknown_type_title(),
			unknownBody: m.preview_unknown_type_body(),
			uploadNew: m.preview_upload_new(),
			uploadReplace: m.preview_upload_replace(),
			uploadHide: m.preview_upload_hide(),
			closeAttachment: m.attachments_view_close()
		};
	});

	const officeTaskState = $derived.by(() => {
		$activeTasks;
		const currentFile = file;
		if (!currentFile || currentFile.type !== 'office') {
			return { status: 'idle' as const };
		}

		const tasksForFile = $activeTasks.filter((task) => task.fileId === currentFile.id);
		if (!tasksForFile.length) {
			return { status: 'idle' as const };
		}

		const score = (date?: Date | null) => (date ? date.getTime() : 0);
		const latestTask = tasksForFile.reduce((latest, task) => {
			if (!latest) return task;
			const latestTime = Math.max(
				score(latest.completedAt),
				score(latest.startedAt),
				score(latest.createdAt)
			);
			const taskTime = Math.max(
				score(task.completedAt),
				score(task.startedAt),
				score(task.createdAt)
			);
			return taskTime >= latestTime ? task : latest;
		}, tasksForFile[0]);

		if (latestTask.status === 'pending' || latestTask.status === 'running') {
			return { status: 'processing' as const };
		}

		if (latestTask.status === 'cancelled') {
			return { status: 'cancelled' as const };
		}

		if (latestTask.status === 'failed') {
			return { status: 'failed' as const };
		}

		return { status: 'completed' as const };
	});

	const tooltipClass =
		'pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-base-content/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-base-100 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100';

	function handleMainUploadComplete(items: Array<{ id: string; name: string }>) {
		if (!items?.length) return;
		const id = items[0]?.id;
		if (!id) return;
		documentsStore.setCurrentPreview(id);
		modeStore.setMain(id);
		const preview = get(currentPreview);
		if (preview && (preview.type === 'image' || preview.type === 'pdf')) {
			modeStore.setMode('ocr');
		}
		showUploadPanel = false;
	}

	function closeAttachmentPreview() {
		documentsStore.popTempPreview();
	}

	$effect(() => {
		if (!file) {
			showUploadPanel = true;
		}
	});
</script>

<section class="flex h-full flex-col rounded-lg border border-base-content/12 bg-base-100">
	<div class="flex items-center justify-between gap-2 border-b border-base-content/10">
		<div class="flex min-w-0 flex-1 items-center gap-3">
			<div class="group relative inline-flex">
				<Button
					variant={file ? 'secondary' : 'primary'}
					size="xs"
					on:click={() => (showUploadPanel = !showUploadPanel)}
					ariaLabel={file
						? showUploadPanel
							? labels.uploadHide
							: labels.uploadReplace
						: labels.uploadNew}
					class="rounded-full"
				>
					{#if !file}
						<svg
							class="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4" />
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M6 14v2a2 2 0 002 2h8a2 2 0 002-2v-2"
							/>
						</svg>
					{:else if showUploadPanel}
						<svg
							class="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 15l6-6 6 6" />
						</svg>
					{:else}
						<svg
							class="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16" />
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v12" />
						</svg>
					{/if}
				</Button>
				<span class={tooltipClass}>
					{file ? (showUploadPanel ? labels.uploadHide : labels.uploadReplace) : labels.uploadNew}
				</span>
			</div>
			<span
				class="min-w-0 flex-1 truncate text-sm font-semibold text-base-content/80"
				title={file ? file.name : labels.emptyTitle}
			>
				{file ? file.name : labels.emptyTitle}
			</span>
		</div>
		{#if $documentsStore.previewOverrideId}
			<div class="group relative inline-flex">
				<Button
					variant="ghost"
					size="xs"
					on:click={closeAttachmentPreview}
					ariaLabel={labels.closeAttachment}
					class="rounded-full"
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</Button>
				<span class={tooltipClass}>{labels.closeAttachment}</span>
			</div>
		{/if}
	</div>

	{#if showUploadPanel}
		<div class="px-3 py-3">
			<Uploader maxFiles={1} onUploadComplete={handleMainUploadComplete} />
		</div>
	{/if}

	<div class="flex-1 overflow-hidden">
		{#if file}
			{#if file.type === 'image'}
				<ImagePreview imageUrl={file.path} fileName={file.name} />
			{:else if file.type === 'pdf'}
				<PDFPreview fileUrl={file.path} fileName={file.name} />
			{:else if file.type === 'office'}
				{#if officeTaskState.status === 'processing'}
					<div
						class="flex h-full flex-col items-center justify-center gap-6 px-8 py-12 text-center text-success/80"
					>
						<svg
							class="h-14 w-14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<h3 class="m-0 text-lg font-semibold text-success/90">{labels.conversionTitle}</h3>
						<p class="m-0 max-w-2xl text-base leading-relaxed text-success/70">
							{labels.conversionBody}
						</p>
					</div>
				{:else if officeTaskState.status === 'cancelled'}
					<div
						class="flex h-full flex-col items-center justify-center gap-6 px-8 py-12 text-center text-warning/80"
					>
						<svg
							class="h-14 w-14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
						<h3 class="m-0 text-lg font-semibold text-warning/90">
							{labels.conversionCancelledTitle}
						</h3>
						<p class="m-0 max-w-2xl text-base leading-relaxed text-warning/70">
							{labels.conversionCancelledBody}
						</p>
					</div>
				{:else}
					<div
						class="flex h-full flex-col items-center justify-center gap-6 px-8 py-12 text-center text-warning/80"
					>
						<svg
							class="h-14 w-14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01M12 5a7 7 0 100 14 7 7 0 000-14z"
							/>
						</svg>
						<h3 class="m-0 text-lg font-semibold text-warning/90">{labels.unknownTitle}</h3>
						<p class="m-0 max-w-2xl text-base text-warning/70">{labels.unknownBody}</p>
					</div>
				{/if}
			{:else}
				<div
					class="flex h-full flex-col items-center justify-center gap-6 px-8 py-12 text-center text-warning/80"
				>
					<svg
						class="h-14 w-14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01M12 5a7 7 0 100 14 7 7 0 000-14z"
						/>
					</svg>
					<h3 class="m-0 text-lg font-semibold text-warning/90">{labels.unknownTitle}</h3>
					<p class="m-0 max-w-2xl text-base text-warning/70">{labels.unknownBody}</p>
				</div>
			{/if}
		{:else if !showUploadPanel}
			<div
				class="flex h-full flex-col items-center justify-center gap-4 px-6 py-10 text-center text-base-content/60"
			>
				<svg
					class="h-14 w-14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
					/>
				</svg>
				<h3 class="m-0 text-base font-semibold text-base-content/80">{labels.emptyTitle}</h3>
				<p class="m-0 max-w-xl text-sm leading-relaxed text-base-content/60">{labels.emptyHint}</p>
			</div>
		{/if}
	</div>
</section>
