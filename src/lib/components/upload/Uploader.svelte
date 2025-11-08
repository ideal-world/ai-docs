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
	let uploadProgress = $state<Map<string, number>>(new Map());
	let fileInputRef: HTMLInputElement;

	// Reactive i18n messages
	let uploadMessages = $derived.by(() => {
		$currentLanguage; // Trigger re-computation
		return {
			uploading: m.common_uploading(),
			dragDrop: m.upload_drag_drop(),
			or: m.upload_or(),
			selectFiles: m.upload_select_files(),
			supportedFormats: m.upload_supported_formats()
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
			onUploadError?.(`Maximum ${maxFiles} files allowed`);
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

			console.log('Upload response:', result); // Debug log

			if (!response.ok) {
				throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
			}

			if (result.success && result.data?.files) {
				console.log('Files to add:', result.data.files); // Debug log
				console.log('documentsStore before:', $documentsStore.files.length); // Debug log
				(result.data.files as Array<Record<string, unknown>>).forEach((fileObj) => {
					console.log('Adding file:', fileObj); // Debug log
					documentsStore.addFile(fileObj as unknown as import('$lib/types/models').File);
				});
				console.log('documentsStore after:', $documentsStore.files.length); // Debug log
				onUploadComplete?.(result.data.files);
			} else {
				throw new Error(result.message || 'Upload failed');
			}
		} catch (error) {
			console.error('Upload error:', error);
			onUploadError?.((error as Error).message);
		} finally {
			isUploading = false;
			uploadProgress.clear();
			if (fileInputRef) fileInputRef.value = '';
		}
	}

	function openFileDialog() {
		fileInputRef?.click();
	}
</script>

<div
	class="uploader"
	class:dragging={isDragging}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	role="button"
	tabindex="0"
	onkeydown={(e) => e.key === 'Enter' && openFileDialog()}
	onclick={(e) => {
		// 仅在点击空白区域（而不是内部按钮等控件）时触发文件对话框，避免重复弹出
		if (e.target === e.currentTarget) openFileDialog();
	}}
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
		<div class="upload-progress">
			<Progress value={50} color="primary" />
			<p class="text-sm mt-2">{uploadMessages.uploading}</p>
		</div>
	{:else}
		<div class="upload-prompt">
			<svg
				class="icon"
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
			<p class="text-lg font-semibold mb-2">{uploadMessages.dragDrop}</p>
			<p class="text-sm text-gray-500 mb-4">{uploadMessages.or}</p>
			<Button variant="primary" on:click={openFileDialog}>
				{uploadMessages.selectFiles}
			</Button>
			<p class="text-xs text-gray-400 mt-4">
				{uploadMessages.supportedFormats}: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
			</p>
		</div>
	{/if}
</div>

<style>
	.uploader {
		border: 2px dashed oklch(var(--bc) / 0.2);
		border-radius: 0.5rem;
		padding: 3rem 2rem;
		text-align: center;
		cursor: pointer;
		transition: all 0.3s ease;
		background: oklch(var(--b1));
	}

	.uploader:hover,
	.uploader.dragging {
		border-color: oklch(var(--p));
		background: oklch(var(--p) / 0.05);
	}

	.upload-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.icon {
		width: 4rem;
		height: 4rem;
		color: oklch(var(--p));
		margin-bottom: 1rem;
	}

	.upload-progress {
		max-width: 20rem;
		margin: 0 auto;
	}

	.hidden {
		display: none;
	}
</style>
