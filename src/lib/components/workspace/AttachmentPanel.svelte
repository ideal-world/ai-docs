<script lang="ts">
	import { documentsStore } from '$lib/stores/documents';
	import { attachmentIds, modeStore } from '$lib/stores/mode';
	import { sessionId } from '$lib/stores/session';
	import { currentLanguage } from '$lib/stores/language';
	import { processingStore } from '$lib/stores/processing';
	import { get } from 'svelte/store';
	import Button from '$lib/components/ui/Button.svelte';
	import Progress from '$lib/components/ui/Progress.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { File as StoredFile } from '$lib/types/models';
	import { registerProcessingTasks, type TaskLike } from '$lib/utils/processing-client';

	type PendingStatus = 'uploading' | 'failed';

	interface PendingUpload {
		tempId: string;
		name: string;
		size: number;
		mimeType: string;
		progress: number;
		status: PendingStatus;
		error?: string | null;
		request: XMLHttpRequest | null;
	}

	type AttachmentStage = 'pending' | 'processing' | 'failed' | 'cancelled' | 'ready';

	interface AttachmentDisplay {
		kind: 'file';
		file: StoredFile;
		status: AttachmentStage;
		progress: number | null;
		stageLabel: string | null;
		error?: string | null;
		previewTargetId: string;
		isActive: boolean;
		convertedPdfId?: string;
	}

	interface PendingDisplay {
		kind: 'pending';
		tempId: string;
		name: string;
		size: number;
		progress: number;
		status: PendingStatus;
		error?: string | null;
	}

	type AttachmentListItem = AttachmentDisplay | PendingDisplay;

	let pendingUploads = $state<PendingUpload[]>([]);
	let deletingId = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let errorMsg = $state<string | null>(null);

	const copy = $derived.by(() => {
		$currentLanguage;
		return {
			statusUploading: m.common_uploading(),
			statusProcessing: m.processing_status_running(),
			statusPending: m.processing_status_pending(),
			statusFailed: m.processing_status_failed(),
			statusCancelled: m.processing_status_cancelled(),
			failureTooltip: (reason: string) => reason,
			remove: m.attachments_remove(),
			uploadFailed: (reason: string) => m.upload_failed({ reason })
		};
	});

	const tooltipClass =
		'pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-base-content/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-base-100 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100';

	const attachments = $derived.by(() => {
		const all = $documentsStore.files;
		const ids = $attachmentIds;
		return all.filter(
			(f) => ids.includes(f.id) || f.metadata?.role === 'attachment' || f.category === 'attachments'
		);
	});

	const displayItems = $derived.by<AttachmentListItem[]>(() => {
		$currentLanguage;
		const docs = $documentsStore;
		const proc = $processingStore;
		const previewOverrideId = docs.previewOverrideId ?? null;
		const filesMap = new Map(docs.files.map((f) => [f.id, f] as const));

		const pendingItems: PendingDisplay[] = pendingUploads.map((item) => ({
			kind: 'pending' as const,
			tempId: item.tempId,
			name: item.name,
			size: item.size,
			progress: item.progress,
			status: item.status,
			error: item.error ?? null
		}));

		const fileItems: AttachmentDisplay[] = attachments
			.map((file) => {
				const convertedPdfId =
					typeof file.metadata === 'object' && file.metadata && 'convertedPdfId' in file.metadata
						? (file.metadata as { convertedPdfId?: string }).convertedPdfId
						: undefined;

				const taskId = proc.fileTaskMap.get(file.id);
				const task = taskId ? (proc.tasks.get(taskId) ?? null) : null;

				let status: AttachmentStage = 'ready';
				let progress: number | null = null;
				let error: string | null = null;

				if (task) {
					switch (task.status) {
						case 'pending':
							status = 'pending';
							progress = task.progress ?? 0;
							break;
						case 'running':
							status = 'processing';
							progress = task.progress ?? 0;
							break;
						case 'failed':
							status = 'failed';
							progress = task.progress ?? 0;
							error = task.error?.message ?? null;
							break;
						case 'cancelled':
							status = 'cancelled';
							progress = task.progress ?? 0;
							error = task.error?.message ?? null;
							break;
						default:
							status = 'ready';
							progress = null;
					}
				}

				const stageLabel = resolveStage(task?.stage);
				const hasConverted = convertedPdfId ? filesMap.has(convertedPdfId) : false;
				const previewTargetId = hasConverted ? convertedPdfId! : file.id;
				const isActive =
					previewOverrideId === file.id ||
					(previewOverrideId !== null && convertedPdfId && previewOverrideId === convertedPdfId);

				const result: AttachmentDisplay = {
					kind: 'file',
					file,
					status,
					progress,
					stageLabel,
					error,
					previewTargetId,
					isActive: Boolean(isActive),
					convertedPdfId
				};
				return result;
			})
			.sort((a, b) => {
				const aTime =
					a.file.createdAt instanceof Date
						? a.file.createdAt.getTime()
						: new Date(a.file.createdAt).getTime();
				const bTime =
					b.file.createdAt instanceof Date
						? b.file.createdAt.getTime()
						: new Date(b.file.createdAt).getTime();
				return bTime - aTime;
			});

		return [...pendingItems, ...fileItems];
	});

	function resolveStage(stage?: string | null): string | null {
		switch (stage) {
			case 'pipeline.stage.pending':
				return m.pipeline_stage_pending();
			case 'pipeline.stage.office_to_pdf':
				return m.pipeline_stage_office_to_pdf();
			case 'pipeline.stage.pdf_to_markdown':
				return m.pipeline_stage_pdf_to_markdown();
			case 'pipeline.stage.ocr_to_markdown':
				return m.pipeline_stage_ocr_to_markdown();
			case 'pipeline.stage.completed':
				return m.pipeline_stage_completed();
			case 'pipeline.stage.cancelled':
				return m.pipeline_stage_cancelled();
			default:
				return null;
		}
	}

	function generateTempId(): string {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}
		return Math.random().toString(36).slice(2);
	}

	function updatePending(tempId: string, updater: (item: PendingUpload) => PendingUpload) {
		pendingUploads = pendingUploads.map((item) => (item.tempId === tempId ? updater(item) : item));
	}

	function removePending(tempId: string) {
		pendingUploads = pendingUploads.filter((item) => item.tempId !== tempId);
	}

	function clampProgress(value: number | null | undefined): number {
		if (value == null || Number.isNaN(value)) {
			return 0;
		}
		return Math.max(0, Math.min(100, Math.round(value)));
	}

	function triggerSelect() {
		fileInput?.click();
	}

	async function handleSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files || []);
		if (!files.length) return;
		uploadAttachments(files);
		input.value = '';
	}

	function uploadAttachments(files: globalThis.File[]) {
		if (!files.length) return;
		files.forEach((file) => startSingleUpload(file));
	}

	function startSingleUpload(file: globalThis.File) {
		const tempId = generateTempId();
		const pending: PendingUpload = {
			tempId,
			name: file.name,
			size: file.size,
			mimeType: file.type,
			progress: 0,
			status: 'uploading',
			error: null,
			request: null
		};

		pendingUploads = [...pendingUploads, pending];

		const formData = new FormData();
		formData.append('file-0', file);

		const sid = get(sessionId);
		const xhr = new XMLHttpRequest();

		updatePending(tempId, (item) => ({ ...item, request: xhr }));

		xhr.upload.onprogress = (event) => {
			if (!event.lengthComputable) return;
			const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
			updatePending(tempId, (item) => ({ ...item, progress }));
		};

		xhr.onerror = () => {
			markPendingFailed(tempId, m.error());
		};

		xhr.onabort = () => {
			removePending(tempId);
		};

		xhr.onreadystatechange = () => {
			if (xhr.readyState !== XMLHttpRequest.DONE) return;

			try {
				const responseText = xhr.responseText ?? '{}';
				const payload = JSON.parse(responseText);

				if (xhr.status < 200 || xhr.status >= 300 || !payload.success) {
					const reason = payload?.message || `${xhr.status}`;
					markPendingFailed(tempId, reason);
					return;
				}

				removePending(tempId);

				const filesResponse = payload.data?.files ?? [];
				const tasksResponse = payload.data?.tasks ?? [];

				filesResponse.forEach((fileObj: Record<string, unknown>) => {
					const uploadedFile = fileObj as unknown as StoredFile;
					documentsStore.addFile(uploadedFile);
					modeStore.addAttachment(uploadedFile.id);
				});

				if (Array.isArray(tasksResponse) && tasksResponse.length > 0) {
					registerProcessingTasks(tasksResponse as TaskLike[]);
				}
			} catch (error) {
				markPendingFailed(tempId, (error as Error).message ?? m.error());
			}
		};

		xhr.open('POST', '/api/attachments', true);
		xhr.setRequestHeader('x-session-id', sid);
		xhr.send(formData);
	}

	function markPendingFailed(tempId: string, reason: string) {
		const message = copy.uploadFailed(reason);
		updatePending(tempId, (item) => ({
			...item,
			status: 'failed',
			progress: 0,
			error: message,
			request: null
		}));
	}

	function cancelPendingUpload(tempId: string) {
		const pending = pendingUploads.find((item) => item.tempId === tempId);
		if (!pending) return;

		if (pending.status === 'uploading') {
			pending.request?.abort();
		} else {
			removePending(tempId);
		}
	}

	function formatSize(bytes: number) {
		if (!Number.isFinite(bytes)) return '';
		let value = bytes;
		const units = ['B', 'KB', 'MB', 'GB'];
		let unitIndex = 0;
		while (value >= 1024 && unitIndex < units.length - 1) {
			value /= 1024;
			unitIndex += 1;
		}
		const formatted =
			value >= 10 || unitIndex === 0 ? Math.round(value) : Math.round(value * 10) / 10;
		return `${formatted} ${units[unitIndex]}`;
	}

	function previewAttachment(item: AttachmentDisplay) {
		documentsStore.pushTempPreview(item.previewTargetId);
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

			const docs = $documentsStore;
			const convertedPdfId =
				typeof file.metadata === 'object' && file.metadata && 'convertedPdfId' in file.metadata
					? (file.metadata as { convertedPdfId?: string }).convertedPdfId
					: undefined;

			if (
				docs.previewOverrideId === file.id ||
				(convertedPdfId && docs.previewOverrideId === convertedPdfId)
			) {
				documentsStore.popTempPreview();
			}

			if (convertedPdfId) {
				documentsStore.removeFile(convertedPdfId);
			}

			documentsStore.removeFile(file.id);

			if (docs.currentPreviewId === file.id) {
				documentsStore.setCurrentPreview(null);
				const currentModeState = get(modeStore);
				if (currentModeState.selectedMainId === file.id) {
					modeStore.setMain(null);
				}
			}

			const processingState = $processingStore;
			const mappedTaskId = processingState.fileTaskMap.get(file.id);
			if (mappedTaskId) {
				processingStore.removeTask(mappedTaskId);
			}
		} catch (error) {
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
				onclick={triggerSelect}
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
	{#if errorMsg}
		<p class="px-3 pt-2 text-xs text-error">{errorMsg}</p>
	{/if}
	<div class="flex-1 min-h-0 space-y-2 overflow-auto px-3 py-3">
		{#if displayItems.length === 0}
			<p
				class="rounded-md border border-dashed border-base-content/15 px-3 py-6 text-center text-xs text-base-content/60"
			>
				{m.file_list_empty()}
			</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each displayItems as item (item.kind === 'pending' ? item.tempId : item.file.id)}
					{#if item.kind === 'pending'}
						<li
							class="flex items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2"
						>
							<div class="flex flex-1 flex-col gap-2">
								<div class="flex items-center justify-between gap-2">
									<div class="min-w-0">
										<p class="truncate text-sm font-medium text-base-content/90" title={item.name}>
											{item.name}
										</p>
										<p class="text-xs text-base-content/60">{formatSize(item.size)}</p>
									</div>
									<span class="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
										{item.status === 'uploading'
											? `${copy.statusUploading} ${clampProgress(item.progress)}%`
											: copy.statusFailed}
									</span>
								</div>
								<Progress
									value={clampProgress(item.progress)}
									color={item.status === 'failed' ? 'error' : 'primary'}
								/>
								{#if item.status === 'failed' && item.error}
									<p class="text-xs text-error">{item.error}</p>
								{/if}
							</div>
							<Button variant="ghost" size="xs" onclick={() => cancelPendingUpload(item.tempId)}>
								{item.status === 'uploading' ? m.common_cancel() : m.common_close()}
							</Button>
						</li>
					{:else}
						<li
							class={`group flex flex-col gap-2 rounded-lg border px-3 py-2 shadow-sm ring-0 transition ${
								item.isActive
									? 'border-primary/50 bg-primary/10 text-primary'
									: 'border-base-content/10 bg-base-100/95 text-base-content/80'
							}`}
						>
							<div class="flex items-start justify-between gap-3">
								<button
									type="button"
									onclick={() => previewAttachment(item)}
									disabled={item.status !== 'ready'}
									class={`flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
										item.isActive ? 'text-primary' : 'text-base-content/90'
									}`}
								>
									<span class="line-clamp-1 text-sm font-medium" title={item.file.name}>
										{item.file.name}
									</span>
									<span
										class={`mt-0.5 text-xs ${
											item.isActive ? 'text-primary/80' : 'text-base-content/60'
										}`}
									>
										{item.file.type.toUpperCase()} · {formatSize(item.file.size)}
									</span>
									{#if item.stageLabel}
										<span
											class="mt-1 inline-flex text-[11px] uppercase tracking-[0.2em] text-base-content/50"
										>
											{item.stageLabel}
										</span>
									{/if}
								</button>
								<div class="flex items-center gap-1">
									{#if (item.status === 'failed' || item.status === 'cancelled') && item.error}
										<span
											class="group/status relative inline-flex text-error"
											role="img"
											aria-label={item.error}
										>
											<svg
												class="h-4 w-4"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="1.8"
											>
												<circle
													cx="12"
													cy="12"
													r="10"
													stroke-linecap="round"
													stroke-linejoin="round"
												/>
												<path d="M12 8v5" stroke-linecap="round" stroke-linejoin="round" />
												<path d="M12 16h.01" stroke-linecap="round" stroke-linejoin="round" />
											</svg>
											<span class={tooltipClass}>{copy.failureTooltip(item.error)}</span>
										</span>
									{/if}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => previewAttachment(item)}
										disabled={item.status !== 'ready' || item.isActive}
									>
										{m.preview()}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										class="text-error hover:text-error"
										onclick={() => deleteAttachment(item.file)}
										disabled={deletingId === item.file.id}
									>
										{copy.remove}
									</Button>
								</div>
							</div>
							{#if item.progress !== null && item.status !== 'ready'}
								<div>
									<Progress
										value={clampProgress(item.progress)}
										color={item.status === 'failed' ? 'error' : 'primary'}
									/>
									<div
										class="mt-1 flex items-center justify-between text-[11px] text-base-content/60"
									>
										<span>
											{#if item.status === 'pending'}
												{copy.statusPending}
											{:else if item.status === 'processing'}
												{copy.statusProcessing}
											{:else if item.status === 'failed'}
												{copy.statusFailed}
											{:else if item.status === 'cancelled'}
												{copy.statusCancelled}
											{/if}
										</span>
										<span>{clampProgress(item.progress)}%</span>
									</div>
								</div>
							{:else if item.status === 'failed' && item.error}
								<p class="text-xs text-error">{item.error}</p>
							{/if}
						</li>
					{/if}
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
