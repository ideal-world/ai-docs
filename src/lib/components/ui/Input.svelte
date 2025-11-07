<script lang="ts">
	interface Props {
		value?: string;
		placeholder?: string;
		type?: 'text' | 'email' | 'password' | 'number';
		disabled?: boolean;
		error?: string;
		label?: string;
		required?: boolean;
	}

	let {
		value = $bindable(''),
		placeholder,
		type = 'text',
		disabled = false,
		error,
		label,
		required = false
	}: Props = $props();
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
	<input
		id={label}
		{type}
		{placeholder}
		{disabled}
		{required}
		bind:value
		class="input input-bordered w-full"
		class:input-error={error}
	/>
	{#if error}
		<label class="label">
			<span class="label-text-alt text-error">{error}</span>
		</label>
	{/if}
</div>
