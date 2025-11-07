<script lang="ts">
	import { onMount } from 'svelte';
	import LanguageSwitcher from '$lib/components/ui/LanguageSwitcher.svelte';
	import SplitPane from '$lib/components/layout/SplitPane.svelte';
	import Uploader from '$lib/components/upload/Uploader.svelte';
	import PDFPreview from '$lib/components/preview/PDFPreview.svelte';
	import ImagePreview from '$lib/components/preview/ImagePreview.svelte';
	import Notification from '$lib/components/ui/Notification.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { documentsStore, currentPreview } from '$lib/stores/documents';
	import { sessionStore } from '$lib/stores/session';
	import * as m from '$lib/paraglide/messages';

	let notificationVisible = $state(false);
	let notificationType: 'success' | 'error' | 'warning' | 'info' = $state('info');
	let notificationMessage = $state('');

	onMount(() => {
		sessionStore.init();
	});

	function handleUploadComplete(files: Array<{ id: string; name: string }>) {
		notificationType = 'success';
		notificationMessage = `${files.length} file(s) uploaded successfully`;
		notificationVisible = true;

		// Auto-select first file for preview
		if (files.length > 0) {
			documentsStore.setCurrentPreview(files[0].id);
		}
	}

	function handleUploadError(error: string) {
		notificationType = 'error';
		notificationMessage = error;
		notificationVisible = true;
	}

	function handleNotificationClose() {
		notificationVisible = false;
	}

	// Get uploaded files list
	let uploadedFiles = $derived($documentsStore.files);
	let currentFile = $derived($currentPreview);
</script>

<div class="h-screen flex flex-col">
	<!-- Header -->
	<header class="navbar bg-base-200 shadow-lg">
		<div class="flex-1">
			<h1 class="text-xl font-bold">{m.welcome()}</h1>
		</div>
		<div class="flex-none">
			<LanguageSwitcher />
		</div>
	</header>

	<!-- Main Content with Split Pane -->
	<main class="flex-1 overflow-hidden">
		<SplitPane
			orientation="horizontal"
			initialLeftSize={30}
			minLeftSize={20}
			maxLeftSize={50}
			resizable={true}
		>
			{#snippet leftPanel()}
				<div class="h-full p-4 bg-base-100 overflow-y-auto">
					<h2 class="text-lg font-semibold mb-4">{m.upload_file()}</h2>

					<Uploader
						onUploadComplete={handleUploadComplete}
						onUploadError={handleUploadError}
						maxFiles={10}
					/>

					{#if uploadedFiles.length > 0}
						<div class="mt-6">
							<h3 class="text-md font-semibold mb-3">Uploaded Files</h3>
							<div class="space-y-2">
								{#each uploadedFiles as file (file.id)}
									<Card>
										<button
											class="w-full text-left p-2 hover:bg-base-200 rounded transition-colors"
											onclick={() => documentsStore.setCurrentPreview(file.id)}
											class:bg-primary={currentFile?.id === file.id}
											class:text-primary-content={currentFile?.id === file.id}
										>
											<div class="flex items-center gap-2">
												{#if file.type === 'image'}
													<svg
														class="w-5 h-5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
														/>
													</svg>
												{:else if file.type === 'pdf'}
													<svg
														class="w-5 h-5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
														/>
													</svg>
												{:else}
													<svg
														class="w-5 h-5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
														/>
													</svg>
												{/if}
												<div class="flex-1 min-w-0">
													<p class="text-sm font-medium truncate">{file.name}</p>
													<p class="text-xs opacity-70">{(file.size / 1024).toFixed(1)} KB</p>
												</div>
											</div>
										</button>
									</Card>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/snippet}

			{#snippet rightPanel()}
				<div class="h-full bg-base-100">
					{#if currentFile}
						{#if currentFile.type === 'image'}
							<ImagePreview
								imageUrl={`/api/files/${currentFile.id}/download`}
								fileName={currentFile.name}
							/>
						{:else if currentFile.type === 'pdf'}
							<PDFPreview
								fileUrl={`/api/files/${currentFile.id}/download`}
								fileName={currentFile.name}
							/>
						{:else if currentFile.type === 'office'}
							<div class="h-full flex items-center justify-center p-8 text-center">
								<div>
									<svg
										class="w-16 h-16 mx-auto mb-4 text-warning"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<h3 class="text-lg font-semibold mb-2">Converting Office Document</h3>
									<p class="text-sm text-gray-600">
										Your document is being converted to PDF. Please wait...
									</p>
								</div>
							</div>
						{/if}
					{:else}
						<div class="h-full flex items-center justify-center p-8 text-center">
							<div>
								<svg
									class="w-24 h-24 mx-auto mb-4 text-base-300"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
									/>
								</svg>
								<h3 class="text-xl font-semibold mb-2">No Document Selected</h3>
								<p class="text-gray-600">
									Upload a document to get started, or select one from the list
								</p>
							</div>
						</div>
					{/if}
				</div>
			{/snippet}
		</SplitPane>
	</main>

	<!-- Notification -->
	{#if notificationVisible}
		<div class="fixed top-20 right-4 z-50">
			<Notification
				type={notificationType}
				message={notificationMessage}
				duration={3000}
				bind:visible={notificationVisible}
				onClose={handleNotificationClose}
			/>
		</div>
	{/if}
</div>
