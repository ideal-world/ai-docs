<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
		size?: 'xs' | 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		ariaLabel?: string;
		title?: string;
		onclick?: (event: MouseEvent) => void;
		children?: import('svelte').Snippet;
	}

	const dispatch = createEventDispatcher<{ click: MouseEvent }>();

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		class: extraClass = '',
		ariaLabel = undefined,
		title: titleAttr = undefined,
		onclick,
		children
	}: Props = $props();

	const variantClasses = {
		primary: 'btn-primary',
		secondary: 'btn-secondary',
		danger: 'btn-error',
		ghost: 'btn-ghost'
	} satisfies Record<NonNullable<Props['variant']>, string>;

	const sizeClasses = {
		xs: 'h-8 px-2 text-xs',
		sm: 'h-9 px-3 text-sm',
		md: 'h-10 px-4 text-sm',
		lg: 'h-11 px-5 text-base'
	} satisfies Record<NonNullable<Props['size']>, string>;

	function handleClick(event: MouseEvent) {
		onclick?.(event);
		dispatch('click', event);
	}
</script>

<button
	{type}
	class={`inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${sizeClasses[size]} ${extraClass}`}
	disabled={disabled || loading}
	onclick={handleClick}
	aria-label={ariaLabel}
	title={titleAttr ?? ariaLabel}
>
	{#if loading}
		<span class="loading loading-spinner"></span>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>
