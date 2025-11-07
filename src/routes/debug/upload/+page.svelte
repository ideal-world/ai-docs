<script lang="ts">
	import { documentsStore } from '$lib/stores/documents';
	import { sessionId } from '$lib/stores/session';
	import Uploader from '$lib/components/upload/Uploader.svelte';
	import ImagePreview from '$lib/components/preview/ImagePreview.svelte';
	import PDFPreview from '$lib/components/preview/PDFPreview.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Notification from '$lib/components/ui/Notification.svelte';
	import { get } from 'svelte/store';
	import type { File as FileModel } from '$lib/types/models';

	let uploadStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);
	let selectedFile = $state<FileModel | null>(null);
	let previewMode = $state<'list' | 'image' | 'pdf'>('list');

	// 订阅文档存储
	let files = $state<FileModel[]>([]);
	documentsStore.subscribe((state) => {
		files = state.files;
	});

	function handleUploadComplete(uploadedFiles: Array<{ id: string; name: string }>) {
		uploadStatus = {
			type: 'success',
			message: `成功上传 ${uploadedFiles.length} 个文件 / Successfully uploaded ${uploadedFiles.length} file(s)`
		};
		setTimeout(() => {
			uploadStatus = null;
		}, 5000);
	}

	function handleUploadError(error: string) {
		uploadStatus = {
			type: 'error',
			message: `上传失败: ${error} / Upload failed: ${error}`
		};
		setTimeout(() => {
			uploadStatus = null;
		}, 5000);
	}

	function previewFile(file: FileModel) {
		selectedFile = file;
		if (file.type === 'image') {
			previewMode = 'image';
		} else if (file.type === 'pdf') {
			previewMode = 'pdf';
		}
		documentsStore.setCurrentPreview(file.id);
	}

	function closePreview() {
		previewMode = 'list';
		selectedFile = null;
		documentsStore.setCurrentPreview(null);
	}

	async function deleteFile(file: FileModel) {
		if (confirm(`确定要删除 ${file.name} 吗？/ Delete ${file.name}?`)) {
			try {
				const currentSessionId = get(sessionId);
				const response = await fetch(`/api/files/${file.id}`, {
					method: 'DELETE',
					headers: {
						'x-session-id': currentSessionId
					}
				});

				if (response.ok) {
					documentsStore.removeFile(file.id);
					if (selectedFile?.id === file.id) {
						closePreview();
					}
					uploadStatus = {
						type: 'success',
						message: '文件已删除 / File deleted'
					};
				} else {
					throw new Error('Delete failed');
				}
			} catch {
				uploadStatus = {
					type: 'error',
					message: '删除失败 / Delete failed'
				};
			}

			setTimeout(() => {
				uploadStatus = null;
			}, 3000);
		}
	}

	function clearAll() {
		if (confirm('确定要清空所有文件吗？/ Clear all files?')) {
			documentsStore.clearAll();
			closePreview();
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
	}
</script>

<div class="h-screen flex flex-col p-4 bg-base-200">
	<div class="mb-4">
		<h1 class="text-4xl font-bold mb-2">文件上传与预览调试</h1>
		<p class="text-gray-600">Upload & Preview Debug - 测试文件上传和预览功能</p>
	</div>

	{#if uploadStatus}
		<div class="mb-4">
			<Notification type={uploadStatus.type} message={uploadStatus.message} />
		</div>
	{/if}

	<div class="flex-1 flex gap-4 overflow-hidden">
		<!-- 左侧：文件列表 -->
		<div class="w-96 flex flex-col space-y-4 overflow-hidden">
			<!-- 上传区域 -->
			<Card title="上传文件 / Upload Files">
				<Uploader onUploadComplete={handleUploadComplete} onUploadError={handleUploadError} />
			</Card>

			<!-- 文件列表 -->
			<Card title={`文件列表 / File List (${files.length})`}>
				<div class="space-y-2 max-h-96 overflow-y-auto">
					{#if files.length === 0}
						<p class="text-gray-500 text-center py-4">暂无文件 / No files</p>
					{:else}
						{#each files as file (file.id)}
							<div
								class="p-3 rounded border hover:bg-base-300 cursor-pointer transition"
								class:bg-primary={selectedFile?.id === file.id}
								class:text-primary-content={selectedFile?.id === file.id}
								onclick={() => previewFile(file)}
							>
								<div class="flex items-center justify-between">
									<div class="flex-1 min-w-0">
										<p class="font-medium truncate">{file.name}</p>
										<p class="text-xs opacity-75">
											{file.type} • {formatFileSize(file.size)}
										</p>
									</div>
									<Button
										size="sm"
										variant="danger"
										onclick={(e) => {
											e.stopPropagation();
											deleteFile(file);
										}}
									>
										删除
									</Button>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				{#if files.length > 0}
					<div class="mt-4">
						<Button variant="danger" onclick={clearAll}>清空全部 / Clear All</Button>
					</div>
				{/if}
			</Card>
		</div>

		<!-- 右侧：预览区域 -->
		<div class="flex-1 flex flex-col overflow-hidden">
			{#if previewMode === 'list'}
				<Card title="预览区域 / Preview Area">
					<div class="flex flex-col items-center justify-center h-full py-20 text-gray-500">
						<svg class="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						<p class="text-lg font-medium">选择文件进行预览</p>
						<p class="text-sm">Select a file to preview</p>
					</div>
				</Card>
			{/if}

			<!-- 图片预览 -->
			{#if previewMode === 'image' && selectedFile}
				<Card title={`图片预览: ${selectedFile.name}`}>
					<div class="mb-2">
						<Button size="sm" variant="ghost" onclick={closePreview}>← 返回列表</Button>
					</div>
					<div class="h-[calc(100vh-350px)]">
						<ImagePreview
							imageUrl={selectedFile.path}
							alt={selectedFile.name}
							fileName={selectedFile.name}
						/>
					</div>
					<div class="mt-4 p-4 bg-base-200 rounded">
						<h4 class="font-semibold mb-2">文件信息:</h4>
						<ul class="space-y-1 text-sm">
							<li><strong>名称:</strong> {selectedFile.name}</li>
							<li><strong>类型:</strong> {selectedFile.mimeType}</li>
							<li><strong>大小:</strong> {formatFileSize(selectedFile.size)}</li>
							{#if selectedFile.metadata && 'width' in selectedFile.metadata}
								<li>
									<strong>尺寸:</strong>
									{selectedFile.metadata.width} × {selectedFile.metadata.height}
								</li>
							{/if}
						</ul>
					</div>
				</Card>
			{/if}

			<!-- PDF预览 -->
			{#if previewMode === 'pdf' && selectedFile}
				<Card title={`PDF预览: ${selectedFile.name}`}>
					<div class="mb-2">
						<Button size="sm" variant="ghost" onclick={closePreview}>← 返回列表</Button>
					</div>
					<div class="h-[calc(100vh-350px)]">
						<PDFPreview fileUrl={selectedFile.path} fileName={selectedFile.name} />
					</div>
					<div class="mt-4 p-4 bg-base-200 rounded">
						<h4 class="font-semibold mb-2">文件信息:</h4>
						<ul class="space-y-1 text-sm">
							<li><strong>名称:</strong> {selectedFile.name}</li>
							<li><strong>类型:</strong> {selectedFile.mimeType}</li>
							<li><strong>大小:</strong> {formatFileSize(selectedFile.size)}</li>
							{#if selectedFile.metadata && 'pages' in selectedFile.metadata}
								<li><strong>页数:</strong> {selectedFile.metadata.pages}</li>
							{/if}
						</ul>
					</div>
				</Card>
			{/if}
		</div>
	</div>
</div>
