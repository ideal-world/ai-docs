<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (event: MouseEvent) => void;
		children?: import('svelte').Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		onclick,
		children
	}: Props = $props();

	const variantClasses = {
		primary: 'btn-primary',
		secondary: 'btn-secondary',
		danger: 'btn-error',
		ghost: 'btn-ghost'
	};
</script>

<button
	{type}
	class="btn {variantClasses[variant]} {size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''}"
	disabled={disabled || loading}
	{onclick}
>
	{#if loading}
		<span class="loading loading-spinner"></span>
	{/if}
	{@render children?.()}
</button>

<style>
	@reference "../../../app.css";

	.btn {
		@apply px-4 py-2 rounded font-medium transition-colors;
	}
</style>
