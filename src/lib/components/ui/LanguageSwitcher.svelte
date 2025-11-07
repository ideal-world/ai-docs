<script lang="ts">
	import { currentLanguage } from '$lib/stores/language';
	import * as m from '$lib/paraglide/messages';

	function handleLanguageChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		currentLanguage.set(target.value);
	}
</script>

<div class="flex items-center gap-2">
	<label for="language-select" class="text-sm font-medium">
		{m.language()}
	</label>
	<select
		id="language-select"
		class="select select-bordered"
		value={$currentLanguage}
		on:change={handleLanguageChange}
	>
		<option value="zh-cn">{m.chinese()}</option>
		<option value="en-us">{m.english()}</option>
	</select>
</div>
