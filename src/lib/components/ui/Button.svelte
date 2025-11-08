<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		children?: import('svelte').Snippet;
	}

	const dispatch = createEventDispatcher<{ click: MouseEvent }>();

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		children
	}: Props = $props();

	const variantClasses = {
		primary: 'btn-primary',
		secondary: 'btn-secondary',
		danger: 'btn-error',
		ghost: 'btn-ghost'
	};

	function handleClick(event: MouseEvent) {
		dispatch('click', event);
	}
</script>

<button
	{type}
	class="btn {variantClasses[variant]} {size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''}"
	disabled={disabled || loading}
	onclick={handleClick}
>
	{#if loading}
		<span class="loading loading-spinner"></span>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>

<style>
	@reference '../../../app.css';

	.btn {
		@apply px-4 py-2 rounded font-medium transition-colors;
	}
</style>
