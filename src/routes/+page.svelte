<script lang="ts">
	import { onMount } from 'svelte';
	import LanguageSwitcher from '$lib/components/ui/LanguageSwitcher.svelte';
	import UploadPanel from '$lib/components/workspace/UploadPanel.svelte';
	import PreviewPanel from '$lib/components/workspace/PreviewPanel.svelte';
	import Notification from '$lib/components/ui/Notification.svelte';
	import { documentsStore, currentPreview } from '$lib/stores/documents';
	import { sessionStore } from '$lib/stores/session';
	import { currentLanguage } from '$lib/stores/language';
	import * as m from '$lib/paraglide/messages';

	type NotificationKind = 'success' | 'error' | 'warning' | 'info';
	type UploadedFileSummary = { id: string; name: string };

	let notificationVisible = $state(false);
	let notificationType: NotificationKind = $state('info');
	let notificationMessage = $state('');

	onMount(() => {
		// Ensure a session exists before any upload happens.
		sessionStore.init();
	});

	const headerTexts = $derived.by(() => {
		$currentLanguage;
		return {
			title: m.welcome(),
			subtitle: m.workspace_subtitle()
		};
	});

	// Keep reactive views of stored files and the currently previewed item.
	let files = $derived($documentsStore.files);
	let currentFile = $derived($currentPreview);

	function showNotification(type: NotificationKind, message: string) {
		notificationType = type;
		notificationMessage = message;
		notificationVisible = true;
	}

	function handleUploadComplete(uploaded: UploadedFileSummary[]) {
		showNotification('success', m.upload_success({ count: uploaded.length }));

		if (uploaded.length > 0) {
			documentsStore.setCurrentPreview(uploaded[0].id);
		}
	}

	function handleUploadError(reason: string) {
		showNotification('error', m.upload_failed({ reason }));
	}

	function handleNotificationClose() {
		notificationVisible = false;
	}

	function handleFileSelect(id: string) {
		documentsStore.setCurrentPreview(id);
	}
</script>

<div class="workspace">
	<header class="workspace__header">
		<div>
			<h1>{headerTexts.title}</h1>
			<p>{headerTexts.subtitle}</p>
		</div>
		<LanguageSwitcher />
	</header>

	<main class="workspace__main">
		<UploadPanel
			{files}
			currentFileId={currentFile?.id ?? null}
			onSelect={handleFileSelect}
			onUploadComplete={handleUploadComplete}
			onUploadError={handleUploadError}
		/>
		<PreviewPanel file={currentFile} />
	</main>

	{#if notificationVisible}
		<div class="workspace__notification">
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

<style>
	.workspace {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: oklch(var(--b2));
	}

	.workspace__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 2rem;
		border-bottom: 1px solid oklch(var(--bc) / 0.08);
		background: oklch(var(--b1));
	}

	.workspace__header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.workspace__header p {
		margin: 0.35rem 0 0;
		font-size: 0.95rem;
		color: oklch(var(--bc) / 0.6);
	}

	.workspace__main {
		flex: 1;
		display: grid;
		grid-template-columns: 320px 1fr;
		min-height: 0;
	}

	@media (max-width: 900px) {
		.workspace__main {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr;
		}
	}

	.workspace__notification {
		position: fixed;
		top: 5rem;
		right: 1.5rem;
		z-index: 60;
	}
</style>
