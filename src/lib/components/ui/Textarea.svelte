<script lang="ts">
	interface Props {
		id?: string;
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
		id,
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
	const generatedId = `textarea-${Math.random().toString(36).slice(2, 8)}`;
	const textareaId = $derived.by(() => id ?? generatedId);
</script>

<div class="form-control w-full">
	{#if label}
		<label class="label" for={textareaId}>
			<span class="label-text">
				{label}
				{#if required}<span class="text-error">*</span>{/if}
			</span>
		</label>
	{/if}
	<textarea
		id={textareaId}
		{placeholder}
		{disabled}
		{required}
		{rows}
		maxlength={maxLength}
		bind:value
		class="textarea textarea-bordered w-full"
		class:textarea-error={error}
	></textarea>
	<div class="label" aria-live="polite">
		<span class={`label-text-alt ${error ? 'text-error' : 'text-base-content/60'}`}>
			{#if error}
				{error}
			{:else}
				&nbsp;
			{/if}
		</span>
		{#if showCount}
			<span class="label-text-alt text-base-content/60">
				{charCount}{#if maxLength}/{maxLength}{/if}
			</span>
		{/if}
	</div>
</div>
