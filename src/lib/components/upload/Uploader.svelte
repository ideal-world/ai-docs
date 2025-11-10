<script lang="ts">
	import { documentsStore } from '$lib/stores/documents';
	import { sessionId } from '$lib/stores/session';
	import { currentLanguage } from '$lib/stores/language';
	import Button from '$lib/components/ui/Button.svelte';
	import Progress from '$lib/components/ui/Progress.svelte';
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
	let fileInputRef: HTMLInputElement;

	// Reactive i18n messages
	const copy = $derived.by(() => {
		$currentLanguage; // Trigger re-computation
		return {
			uploading: m.common_uploading(),
			dragDrop: m.upload_drag_drop(),
			or: m.upload_or(),
			selectFiles: m.upload_select_files(),
			supportedFormats: m.upload_supported_formats(),
			maxFilesExceeded: m.upload_max_files_exceeded({ max: maxFiles }),
			uploadFailed: (reason: string) => m.upload_failed({ reason })
		};
	});

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.currentTarget === e.target) {
			isDragging = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;

		const files = Array.from(e.dataTransfer?.files || []);
		await uploadFiles(files);
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = Array.from(input.files || []);
		uploadFiles(files);
	}

	async function uploadFiles(files: File[]) {
		if (files.length === 0) return;
		if (files.length > maxFiles) {
			onUploadError?.(copy.maxFilesExceeded);
			return;
		}

		isUploading = true;
		const formData = new FormData();
		files.forEach((file, index) => formData.append(`file-${index}`, file));

		try {
			const currentSessionId = get(sessionId);
			const response = await fetch('/api/upload', {
				method: 'POST',
				headers: { 'x-session-id': currentSessionId },
				body: formData
			});
			const result = await response.json();

			if (!response.ok || !result.success || !result.data?.files) {
				const reason = (result && result.message) || `${response.status} ${response.statusText}`;
				onUploadError?.(copy.uploadFailed(reason || m.error()));
				return;
			}

			(result.data.files as Array<Record<string, unknown>>).forEach((fileObj) => {
				documentsStore.addFile(fileObj as unknown as import('$lib/types/models').File);
			});
			onUploadComplete?.(result.data.files);
		} catch (error) {
			const message = ((error as Error).message || '').trim() || m.error();
			onUploadError?.(copy.uploadFailed(message));
		} finally {
			isUploading = false;
			if (fileInputRef) fileInputRef.value = '';
		}
	}

	function openFileDialog() {
		fileInputRef?.click();
	}

	function handleContainerClick(e: MouseEvent) {
		const target = e.target as HTMLElement | null;
		if (target?.closest('button, a, input, label')) {
			return;
		}
		openFileDialog();
	}
</script>

<div
	class={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-base-content/20 bg-base-100 px-8 py-12 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${isDragging ? 'border-primary bg-primary/10' : 'hover:border-primary hover:bg-primary/10'}`}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	role="button"
	tabindex="0"
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
		<div class="mx-auto max-w-xs">
			<Progress value={50} color="primary" />
			<p class="mt-2 text-sm text-base-content/80">{copy.uploading}</p>
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
		</div>
	{/if}
</div>
