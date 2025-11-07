<script lang="ts">
	interface Props {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		error?: string;
		label?: string;
		required?: boolean;
		rows?: number;
		maxLength?: number;
		showCount?: boolean;
	}

	let {
		value = $bindable(''),
		placeholder,
		disabled = false,
		error,
		label,
		required = false,
		rows = 4,
		maxLength,
		showCount = false
	}: Props = $props();

	let charCount = $derived(value.length);
</script>

<div class="form-control w-full">
	{#if label}
		<label class="label" for={label}>
			<span class="label-text">
				{label}
				{#if required}<span class="text-error">*</span>{/if}
			</span>
		</label>
	{/if}
	<textarea
		id={label}
		{placeholder}
		{disabled}
		{required}
		{rows}
		maxlength={maxLength}
		bind:value
		class="textarea textarea-bordered w-full"
		class:textarea-error={error}
	></textarea>
	<label class="label">
		{#if error}
			<span class="label-text-alt text-error">{error}</span>
		{:else}
			<span class="label-text-alt"></span>
		{/if}
		{#if showCount}
			<span class="label-text-alt">
				{charCount}{#if maxLength}/{maxLength}{/if}
			</span>
		{/if}
	</label>
</div>
