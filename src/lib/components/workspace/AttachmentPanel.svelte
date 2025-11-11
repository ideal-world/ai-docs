<script lang="ts">
	import { documentsStore } from '$lib/stores/documents';
	import { attachmentIds, modeStore } from '$lib/stores/mode';
	import { sessionId } from '$lib/stores/session';
	import { get } from 'svelte/store';
	import Button from '$lib/components/ui/Button.svelte';
	import Progress from '$lib/components/ui/Progress.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { File as StoredFile } from '$lib/types/models';
	import { registerProcessingTasks, type TaskLike } from '$lib/utils/processing-client';

	let uploading = $state(false);
	let deletingId = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let errorMsg = $state<string | null>(null);
	let uploadProgress = $state(0);
	let currentRequest = $state<XMLHttpRequest | null>(null);

	const copy = $derived.by(() => ({
		uploading: m.common_uploading(),
		cancel: m.common_cancel(),
		uploadFailed: (reason: string) => m.upload_failed({ reason })
	}));

	// Drag-and-drop入口已移除，仅保留按钮上传

	const tooltipClass =
		'pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-base-content/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-base-100 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100';

	// 过滤出附件：依据 modeStore.attachments 列表或 metadata.role
	const attachments = $derived.by(() => {
		const all = $documentsStore.files;
		const ids = $attachmentIds;
		return all.filter(
			(f) => ids.includes(f.id) || f.metadata?.role === 'attachment' || f.category === 'attachments'
		);
	});

	function triggerSelect() {
		if (uploading) return;
		fileInput?.click();
	}

	async function handleSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = Array.from(input.files || []);
		if (!files.length) return;
		await uploadAttachments(files);
		input.value = '';
	}

	async function uploadAttachments(files: globalThis.File[]) {
		if (uploading || files.length === 0) return;

		uploading = true;
		uploadProgress = 0;
		errorMsg = null;

		const form = new FormData();
		files.forEach((file, index) => form.append(`file-${index}`, file));
		const sid = get(sessionId);

		const xhr = new XMLHttpRequest();
		currentRequest = xhr;

		xhr.upload.onprogress = (event) => {
			if (!event.lengthComputable) return;
			uploadProgress = Math.min(100, Math.round((event.loaded / event.total) * 100));
		};

		xhr.onerror = () => {
			errorMsg = copy.uploadFailed(m.error());
			resetUploadState();
		};

		xhr.onabort = () => {
			errorMsg = null;
			resetUploadState();
		};

		xhr.onreadystatechange = () => {
			if (xhr.readyState !== XMLHttpRequest.DONE) return;

			try {
				const payload = JSON.parse(xhr.responseText ?? '{}');

				if (xhr.status < 200 || xhr.status >= 300 || !payload.success) {
					const reason = payload.message || `${xhr.status}`;
					errorMsg = copy.uploadFailed(reason);
					resetUploadState();
					return;
				}

				const filesResponse = payload.data?.files ?? [];
				const tasksResponse = payload.data?.tasks ?? [];

				filesResponse.forEach((fileObj: Record<string, unknown>) => {
					const file = fileObj as unknown as import('$lib/types/models').File;
					documentsStore.addFile(file);
					modeStore.addAttachment(file.id);
				});

				if (Array.isArray(tasksResponse) && tasksResponse.length > 0) {
					registerProcessingTasks(tasksResponse as TaskLike[]);
				}
			} catch (error) {
				errorMsg = copy.uploadFailed((error as Error).message ?? m.error());
			} finally {
				resetUploadState();
			}
		};

		xhr.open('POST', '/api/attachments', true);
		xhr.setRequestHeader('x-session-id', sid);
		xhr.send(form);
	}

	function resetUploadState() {
		uploading = false;
		uploadProgress = 0;
		currentRequest = null;
	}

	function cancelUpload() {
		currentRequest?.abort();
	}

	function viewAttachment(id: string) {
		documentsStore.pushTempPreview(id);
	}

	function formatSize(bytes: number) {
		if (!Number.isFinite(bytes)) return '';
		const units = ['B', 'KB', 'MB', 'GB'];
		let value = bytes;
		let unitIndex = 0;
		while (value >= 1024 && unitIndex < units.length - 1) {
			value /= 1024;
			unitIndex += 1;
		}
		const formatted =
			value >= 10 || unitIndex === 0 ? Math.round(value) : Math.round(value * 10) / 10;
		return `${formatted} ${units[unitIndex]}`;
	}

	async function deleteAttachment(file: StoredFile) {
		if (deletingId) return;
		deletingId = file.id;
		errorMsg = null;
		try {
			const sid = get(sessionId);
			const resp = await fetch(`/api/attachments/${file.id}`, {
				method: 'DELETE',
				headers: { 'x-session-id': sid }
			});
			if (!resp.ok) {
				const payload = await resp.json().catch(() => null);
				errorMsg = payload?.message || m.attachments_delete_failed();
				return;
			}
			modeStore.removeAttachment(file.id);
			documentsStore.removeFile(file.id);
			const docs = $documentsStore;
			if (docs.previewOverrideId === file.id) {
				documentsStore.popTempPreview();
			}
			if (docs.currentPreviewId === file.id) {
				documentsStore.setCurrentPreview(null);
				const currentModeState = get(modeStore);
				if (currentModeState.selectedMainId === file.id) {
					modeStore.setMain(null);
				}
			}
		} catch (err) {
			errorMsg = m.attachments_delete_failed();
		} finally {
			deletingId = null;
		}
	}
</script>

<section
	class="flex h-full flex-col overflow-hidden rounded-lg border border-base-content/12 bg-base-100"
>
	<header class="flex items-center justify-between gap-2 border-b border-base-content/10 px-3">
		<h3 class="text-sm font-semibold text-base-content/90">{m.attachments_title()}</h3>
		<div class="group relative inline-flex">
			<Button
				variant="secondary"
				size="xs"
				on:click={triggerSelect}
				disabled={uploading}
				ariaLabel={m.attachments_add()}
				class="rounded-full"
			>
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14" />
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
				</svg>
			</Button>
			<span class={tooltipClass}>{m.attachments_add()}</span>
		</div>
	</header>
	<input
		bind:this={fileInput}
		type="file"
		multiple
		accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
		class="hidden"
		onchange={handleSelect}
	/>
	{#if uploading}
		<div class="px-3 pt-2">
			<Progress value={uploadProgress} color="primary" />
			<div class="mt-1 flex items-center justify-between text-xs text-base-content/60">
				<span>{copy.uploading} {uploadProgress}%</span>
				<Button variant="ghost" size="xs" on:click={cancelUpload} disabled={!currentRequest}>
					{copy.cancel}
				</Button>
			</div>
		</div>
	{/if}
	{#if errorMsg}
		<p class="px-3 pt-2 text-xs text-error">{errorMsg}</p>
	{/if}
	<div class="flex-1 min-h-0 space-y-2 overflow-auto px-3 py-3">
		{#if attachments.length === 0}
			<p
				class="rounded-md border border-dashed border-base-content/15 px-3 py-6 text-center text-xs text-base-content/60"
			>
				{m.file_list_empty()}
			</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each attachments as file (file.id)}
					<li
						class={`group flex items-center gap-3 rounded-lg border px-3 py-2 shadow-sm ring-0 transition hover:border-primary/40 hover:bg-primary/5 ${
							$documentsStore.previewOverrideId === file.id
								? 'border-primary/40 bg-primary/10 text-primary'
								: 'border-base-content/10 bg-base-100/90 text-base-content/80'
						}`}
					>
						<button
							type="button"
							onclick={() => viewAttachment(file.id)}
							class={`flex flex-1 flex-col items-start text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
								$documentsStore.previewOverrideId === file.id
									? 'text-primary'
									: 'text-base-content/80'
							}`}
						>
							<span
								class={`line-clamp-1 font-medium ${
									$documentsStore.previewOverrideId === file.id
										? 'text-primary'
										: 'text-base-content/90'
								}`}
								title={file.name}
							>
								{file.name}
							</span>
							<span
								class={`mt-0.5 text-xs ${
									$documentsStore.previewOverrideId === file.id
										? 'text-primary/80'
										: 'text-base-content/60'
								}`}
							>
								{file.type.toUpperCase()} · {formatSize(file.size)}
							</span>
						</button>
						<div class="flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								on:click={() => viewAttachment(file.id)}
								disabled={$documentsStore.previewOverrideId === file.id}
							>
								{m.preview()}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								class="text-error hover:text-error"
								on:click={() => deleteAttachment(file)}
								disabled={deletingId === file.id}
							>
								{m.attachments_remove()}
							</Button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
	{#if $documentsStore.previewOverrideId}
		<div
			class="border-t border-base-content/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary"
		>
			{m.attachments_badge()}
		</div>
	{/if}
</section>
