<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, tick } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { currentLanguage } from '$lib/stores/language';
	import * as m from '$lib/paraglide/messages';

	type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
	type ModalPosition = 'top' | 'middle' | 'bottom';

	interface Props {
		open?: boolean;
		title?: string;
		onClose?: () => void;
		children?: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
		size?: ModalSize;
		position?: ModalPosition;
		closeOnBackdrop?: boolean;
		closeOnEscape?: boolean;
	}

	const sizeClassMap = {
		sm: 'max-w-sm',
		md: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-3xl'
	} as const;

	const positionClassMap = {
		top: 'items-start pt-6',
		middle: 'items-center',
		bottom: 'items-end pb-6'
	} as const;

	let {
		open = $bindable(false),
		title,
		onClose,
		children,
		actions,
		size = 'md',
		position = 'middle',
		closeOnBackdrop = true,
		closeOnEscape = true
	}: Props = $props();

	let overlayEl = $state<HTMLDivElement | null>(null);
	let dialogEl = $state<HTMLDivElement | null>(null);
	let escapeListener: ((event: KeyboardEvent) => void) | null = null;
	let previousBodyOverflow: string | null = null;

	const id = `modal-${Math.random().toString(36).slice(2, 10)}`;

	let titleId = $derived.by(() => {
		const currentTitle = title;
		return currentTitle ? `${id}-title` : undefined;
	});

	let dialogSizeClass = $derived.by(() => sizeClassMap[size] ?? sizeClassMap.md);
	let modalPositionClass = $derived.by(() => positionClassMap[position] ?? positionClassMap.middle);
	const i18n = $derived.by(() => {
		$currentLanguage;
		return {
			close: m.common_close()
		};
	});

	function handleClose() {
		if (!open) {
			return;
		}
		open = false;
		onClose?.();
	}

	function handleBackdropClick(event: MouseEvent) {
		if (!closeOnBackdrop) {
			return;
		}
		if (event.target !== overlayEl) {
			return;
		}
		handleClose();
	}

	function setupEscapeListener(enable: boolean) {
		if (!browser) {
			return;
		}
		if (enable && closeOnEscape && !escapeListener) {
			const listener = (event: KeyboardEvent) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					handleClose();
				}
			};
			window.addEventListener('keydown', listener);
			escapeListener = listener;
		} else if ((!enable || !closeOnEscape) && escapeListener) {
			window.removeEventListener('keydown', escapeListener);
			escapeListener = null;
		}
	}

	$effect(() => {
		setupEscapeListener(open);
	});

	async function focusDialog() {
		if (!open) {
			return;
		}
		await tick();
		const target = dialogEl;
		if (!target) {
			return;
		}
		const focusable = target.querySelector<HTMLElement>(
			'[autofocus], button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		);
		(focusable ?? target).focus();
	}

	$effect(() => {
		if (open) {
			void focusDialog();
		}
	});

	function lockBodyScroll(shouldLock: boolean) {
		if (!browser) {
			return;
		}
		const { body } = document;
		if (shouldLock) {
			if (previousBodyOverflow === null) {
				previousBodyOverflow = body.style.overflow;
				body.style.overflow = 'hidden';
			}
		} else if (previousBodyOverflow !== null) {
			body.style.overflow = previousBodyOverflow;
			previousBodyOverflow = null;
		}
	}

	$effect(() => {
		lockBodyScroll(open);
	});

	onDestroy(() => {
		lockBodyScroll(false);
		setupEscapeListener(false);
	});
</script>

{#if open}
		<div
			class={`fixed inset-0 z-50 flex justify-center bg-base-content/60 px-4 py-6 sm:px-6 ${modalPositionClass}`}
			role="presentation"
			aria-hidden={!open}
			bind:this={overlayEl}
			onclick={handleBackdropClick}
			transition:fade={{ duration: 150 }}
		>
		<div
			class={`pointer-events-auto w-full ${dialogSizeClass}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			tabindex="-1"
			bind:this={dialogEl}
			transition:scale={{ duration: 150 }}
		>
			<div class="flex max-h-[85vh] flex-col overflow-hidden rounded-xl border border-base-content/10 bg-base-100 text-base-content shadow-xl">
				{#if title}
					<div class="flex items-center justify-between gap-3 border-b border-base-content/10 px-4 py-3">
							<h3 class="text-lg font-semibold" id={titleId}>{title}</h3>
							<button
								type="button"
								class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-base-content/60 transition-all duration-200 hover:bg-base-200/80 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
								onclick={handleClose}
								aria-label={i18n.close}
							>
							✕
						</button>
					</div>
				{/if}

				<div class="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-base-content/80">
					{@render children?.()}
				</div>

				<div class="flex items-center justify-end gap-2 border-t border-base-content/10 px-4 py-3">
					{#if actions}
						{@render actions()}
					{:else}
						<button
							type="button"
							onclick={handleClose}
							class="inline-flex items-center justify-center rounded-lg border border-base-content/15 bg-base-200 px-3 py-2 text-sm font-medium text-base-content/80 transition-colors duration-200 hover:border-primary/60 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
						>
							{i18n.close}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
