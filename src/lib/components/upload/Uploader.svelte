<script lang="ts">
	import { documentsStore } from '$lib/stores/documents';
	import { sessionId } from '$lib/stores/session';
	import { currentLanguage } from '$lib/stores/language';
	import { modeStore } from '$lib/stores/mode';
	import { registerProcessingTasks, type TaskLike } from '$lib/utils/processing-client';
	import Button from '$lib/components/ui/Button.svelte';
	import * as m from '$lib/paraglide/messages';
	import { get } from 'svelte/store';

	interface Props {
		onUploadComplete?: (files: Array<{ id: string; name: string }>) => void;
		onUploadError?: (error: string) => void;
		maxFiles?: number;
	}

	let { onUploadComplete, onUploadError, maxFiles = 10 }: Props = $props();

	let isDragging = $state(false);
	let isUploading = $state(false);
	let uploadError = $state<string | null>(null);
	let currentRequest = $state<XMLHttpRequest | null>(null);
	let fileInputRef: HTMLInputElement;

	const copy = $derived.by(() => {
		$currentLanguage;
		return {
			uploading: m.common_uploading(),
			cancel: m.common_cancel(),
			dragDrop: m.upload_drag_drop(),
			or: m.upload_or(),
			selectFiles: m.upload_select_files(),
			supportedFormats: m.upload_supported_formats(),
			maxFilesExceeded: m.upload_max_files_exceeded({ max: maxFiles }),
			uploadFailed: (reason: string) => m.upload_failed({ reason })
		};
	});

	function resetUploadState() {
		isUploading = false;
		uploadError = null;
		currentRequest = null;
		if (fileInputRef) fileInputRef.value = '';
	}

	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (event.currentTarget === event.target) {
			isDragging = false;
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDragging = false;

		const files = Array.from(event.dataTransfer?.files || []);
		uploadFiles(files);
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files || []);
		uploadFiles(files);
	}

	function uploadFiles(files: File[]) {
		if (isUploading) return;
		if (files.length === 0) return;
		if (files.length > maxFiles) {
			onUploadError?.(copy.maxFilesExceeded);
			return;
		}

		const formData = new FormData();
		files.forEach((file, index) => formData.append(`file-${index}`, file));

		const xhr = new XMLHttpRequest();
		const sid = get(sessionId);

		uploadError = null;
		isUploading = true;

		xhr.onerror = () => {
			uploadError = copy.uploadFailed(m.error());
			resetUploadState();
		};

		xhr.onabort = () => {
			uploadError = null;
			resetUploadState();
		};

		xhr.onreadystatechange = () => {
			if (xhr.readyState !== XMLHttpRequest.DONE) return;

			try {
				const payload = JSON.parse(xhr.responseText ?? '{}');

				if (xhr.status < 200 || xhr.status >= 300 || !payload.success) {
					const reason = payload.message || `${xhr.status}`;
					uploadError = copy.uploadFailed(reason);
					resetUploadState();
					return;
				}

				const filesResponse = payload.data?.files ?? [];
				const tasksResponse = payload.data?.tasks ?? [];

				filesResponse.forEach((fileObj: Record<string, unknown>) => {
					const fileModel = fileObj as unknown as import('$lib/types/models').File;
					documentsStore.addFile(fileModel);
					modeAfterUpload(fileModel.id, fileModel.type);
				});

				if (Array.isArray(tasksResponse) && tasksResponse.length > 0) {
					registerProcessingTasks(tasksResponse as TaskLike[]);
				}

				onUploadComplete?.(filesResponse);
			} catch (error) {
				uploadError = copy.uploadFailed((error as Error).message ?? m.error());
			} finally {
				resetUploadState();
			}
		};

		xhr.open('POST', '/api/upload', true);
		xhr.setRequestHeader('x-session-id', sid);
		xhr.send(formData);
		currentRequest = xhr;
	}

	function modeAfterUpload(fileId: string, fileType: import('$lib/types/models').File['type']) {
		documentsStore.setCurrentPreview(fileId);

		if (fileType === 'image' || fileType === 'pdf') {
			modeStore.setMode('ocr');
			modeStore.setMain(fileId);
		}
	}

	function abortUpload() {
		if (!currentRequest) return;
		currentRequest.abort();
	}

	function openFileDialog() {
		fileInputRef?.click();
	}

	function handleContainerClick(event: MouseEvent) {
		const target = event.target as HTMLElement | null;
		if (target?.closest('button, a, input, label')) {
			return;
		}
		openFileDialog();
	}
</script>

<div
	class={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-base-content/20 bg-base-100 px-8 py-12 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${isDragging ? 'border-primary bg-primary/10' : 'hover:border-primary hover:bg-primary/10'}`}
	role="button"
	tabindex="0"
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	onkeydown={(event) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			openFileDialog();
		}
	}}
	onclick={handleContainerClick}
>
	<input
		bind:this={fileInputRef}
		type="file"
		multiple
		accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
		class="hidden"
		onchange={handleFileSelect}
	/>

	{#if isUploading}
		<div class="mx-auto flex max-w-xs flex-col items-center gap-3 text-base-content/75">
			<span class="loading loading-spinner loading-md text-primary"></span>
			<p class="text-sm font-medium">{copy.uploading}</p>
			<Button variant="ghost" size="sm" on:click={abortUpload} disabled={!currentRequest}>
				{copy.cancel}
			</Button>
		</div>
	{:else}
		<div class="flex flex-col items-center">
			<svg
				class="mb-4 h-16 w-16 text-primary"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
				/>
			</svg>
			<p class="mb-2 text-lg font-semibold text-base-content/90">{copy.dragDrop}</p>
			<p class="mb-4 text-sm text-base-content/60">{copy.or}</p>
			<Button
				variant="primary"
				on:click={(event) => {
					event.stopPropagation();
					openFileDialog();
				}}
			>
				{copy.selectFiles}
			</Button>
			<p class="mt-4 text-xs text-base-content/50">
				{copy.supportedFormats}: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
			</p>
			{#if uploadError}
				<p class="mt-3 text-xs text-error">{uploadError}</p>
			{/if}
		</div>
	{/if}
</div>
