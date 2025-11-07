<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		options: Option[];
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		onchange?: (value: string) => void;
	}

	let { options, value = $bindable(''), placeholder, disabled = false, onchange }: Props = $props();

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
		onchange?.(value);
	}
</script>

<select class="select select-bordered w-full" {value} {disabled} onchange={handleChange}>
	{#if placeholder}
		<option value="" disabled selected>{placeholder}</option>
	{/if}
	{#each options as option (option.value)}
		<option value={option.value}>{option.label}</option>
	{/each}
</select>
