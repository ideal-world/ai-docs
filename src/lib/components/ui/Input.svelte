<script lang="ts">
	interface Props {
		id?: string;
		value?: string;
		placeholder?: string;
		type?: 'text' | 'email' | 'password' | 'number';
		disabled?: boolean;
		error?: string;
		label?: string;
		required?: boolean;
	}

	let {
		id,
		value = $bindable(''),
		placeholder,
		type = 'text',
		disabled = false,
		error,
		label,
		required = false
	}: Props = $props();

	const generatedId = `input-${Math.random().toString(36).slice(2, 8)}`;
	const inputId = $derived.by(() => id ?? generatedId);
</script>

<div class="form-control w-full">
	{#if label}
		<label class="label" for={inputId}>
			<span class="label-text">
				{label}
				{#if required}<span class="text-error">*</span>{/if}
			</span>
		</label>
	{/if}
	<input
		id={inputId}
		{type}
		{placeholder}
		{disabled}
		{required}
		bind:value
		class="input input-bordered w-full"
		class:input-error={error}
	/>
	<div class="label" aria-live="polite">
		<span class={`label-text-alt ${error ? 'text-error' : 'text-base-content/60'}`}>
			{#if error}
				{error}
			{:else}
				&nbsp;
			{/if}
		</span>
	</div>
</div>
