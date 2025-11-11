<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsModal from '$lib/components/ui/SettingsModal.svelte';
	import Notification from '$lib/components/ui/Notification.svelte';
	import WorkspaceLayout from '$lib/components/workspace/WorkspaceLayout.svelte';
	import { sessionStore } from '$lib/stores/session';
	import { currentLanguage } from '$lib/stores/language';
	import * as m from '$lib/paraglide/messages';

	type NotificationKind = 'success' | 'error' | 'warning' | 'info';

	let notificationVisible = $state(false);
	let notificationType: NotificationKind = $state('info');
	let notificationMessage = $state('');
	let settingsVisible = $state(false);

	onMount(() => {
		sessionStore.init();
	});

	const headerTexts = $derived.by(() => {
		$currentLanguage;
		return { title: m.welcome(), subtitle: m.workspace_subtitle(), settingsOpen: m.settings_open() };
	});

	function showNotification(type: NotificationKind, message: string) {
		notificationType = type;
		notificationMessage = message;
		notificationVisible = true;
	}

	function handleNotificationClose() {
		notificationVisible = false;
	}

	function openSettings() {
		settingsVisible = true;
	}
</script>


<div class="flex h-screen flex-col gap-2 bg-base-200 px-2 pb-2 pt-2 sm:px-4">
	<header class="flex items-center justify-between rounded-lg bg-base-100 px-3 py-2 shadow-sm">
		<h1 class="text-base font-semibold text-base-content">{headerTexts.title}</h1>
		<button
			type="button"
			class="inline-flex items-center justify-center rounded-lg bg-base-200 text-base-content/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-base-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95"
			onclick={openSettings}
			aria-label={headerTexts.settingsOpen}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
				<circle cx="12" cy="12" r="3"/>
			</svg>
		</button>
	</header>

	<main class="flex flex-1 min-h-0 overflow-hidden rounded-xl bg-base-100 shadow-lg">
		<div class="flex h-full w-full flex-1 min-h-0">
			<WorkspaceLayout />
		</div>
	</main>

	{#if notificationVisible}
		<div class="fixed right-6 top-20 z-60">
			<Notification
				type={notificationType}
				message={notificationMessage}
				duration={3000}
				bind:visible={notificationVisible}
				onClose={handleNotificationClose}
			/>
		</div>
	{/if}

	<SettingsModal bind:visible={settingsVisible} />
</div>
