<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { onMount } from 'svelte';
	import { currentLanguage } from '$lib/stores/language';
	import { themeStore } from '$lib/stores/theme';

	let { children } = $props();

	onMount(() => {
		// Initialize language from localStorage or browser settings
		currentLanguage.init();
		// Initialize theme from localStorage
		themeStore.init();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<script>
		(function () {
			try {
				var savedTheme = localStorage.getItem('theme');
				if (savedTheme) {
					document.documentElement.setAttribute('data-theme', savedTheme);
				}
			} catch (error) {
				console.warn('Failed to apply persisted theme before hydration', error);
			}
			try {
				var savedLocale = localStorage.getItem('preferred-locale');
				if (savedLocale) {
					document.documentElement.lang = savedLocale;
				}
			} catch (error) {
				console.warn('Failed to apply persisted locale before hydration', error);
			}
		})();
	</script>
</svelte:head>

<!-- Subscribe globally so all pages re-render when locale or theme changes -->
<span class="hidden">{$currentLanguage}{$themeStore}</span>

{@render children()}
