<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { onMount } from 'svelte';
	import { currentLanguage } from '$lib/stores/language';

	let { children } = $props();

	onMount(() => {
		// Initialize language from localStorage or browser settings
		currentLanguage.init();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
