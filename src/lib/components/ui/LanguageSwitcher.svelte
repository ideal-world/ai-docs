<script lang="ts">
	import { currentLanguage } from '$lib/stores/language';
	import * as m from '$lib/paraglide/messages';

	function handleLanguageChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		currentLanguage.set(target.value);
	}

	// Reactive i18n labels
	let labels = $derived.by(() => {
		$currentLanguage; // Trigger re-computation
		return {
			language: m.language(),
			chinese: m.chinese(),
			english: m.english()
		};
	});
</script>

<div class="flex items-center gap-2">
	<label for="language-select" class="text-sm font-medium">
		{labels.language}
	</label>
	<select
		id="language-select"
		class="select select-bordered"
		value={$currentLanguage}
		onchange={handleLanguageChange}
	>
		<option value="zh-cn">{labels.chinese}</option>
		<option value="en-us">{labels.english}</option>
	</select>
</div>
