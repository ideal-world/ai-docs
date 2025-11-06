<script lang="ts">
	import LanguageSwitcher from '$lib/components/ui/LanguageSwitcher.svelte';
	import * as m from '$lib/paraglide/messages';
</script>

<div class="container mx-auto px-4 py-8">
	<header class="mb-8 flex items-center justify-between">
		<h1 class="text-4xl font-bold">{m.welcome()}</h1>
		<LanguageSwitcher />
	</header>

	<main>
		<p class="text-lg text-gray-600">
			This is the AI Document Processing Platform. Upload your documents to get started.
		</p>
	</main>
</div>
