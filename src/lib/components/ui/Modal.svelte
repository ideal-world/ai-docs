<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, tick } from 'svelte';
	import { fade, scale } from 'svelte/transition';

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
		sm: 'modal-dialog-sm',
		md: 'modal-dialog-md',
		lg: 'modal-dialog-lg',
		xl: 'modal-dialog-xl'
	} as const;

	const positionClassMap = {
		top: 'modal-top',
		middle: 'modal-middle',
		bottom: 'modal-bottom'
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

	let overlayEl: HTMLDivElement | null;
	let dialogEl: HTMLDivElement | null;
	let escapeListener: ((event: KeyboardEvent) => void) | null = null;
	let previousBodyOverflow: string | null = null;

	const id = `modal-${Math.random().toString(36).slice(2, 10)}`;

	let titleId = $derived.by(() => {
		const currentTitle = title;
		return currentTitle ? `${id}-title` : undefined;
	});

	let dialogSizeClass = $derived.by(() => sizeClassMap[size] ?? sizeClassMap.md);
	let modalPositionClass = $derived.by(() => positionClassMap[position] ?? positionClassMap.middle);
	let modalContainerClasses = $derived.by(() => `modal ${modalPositionClass} is-open`);

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
		class="overlay fixed inset-0 z-50 flex items-center justify-center bg-base-content/60 px-4 py-6 sm:px-6"
		role="presentation"
		aria-hidden={!open}
		bind:this={overlayEl}
		onclick={handleBackdropClick}
		transition:fade={{ duration: 150 }}
	>
		<div class={modalContainerClasses} role="presentation">
			<div
				class={`modal-dialog ${dialogSizeClass} w-full max-w-xl pointer-events-auto`}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabindex="-1"
				bind:this={dialogEl}
				transition:scale={{ duration: 150 }}
			>
				<div class="modal-content bg-base-100 text-base-content shadow-xl">
					{#if title}
						<div class="modal-header flex items-center justify-between gap-3">
							<h3 class="modal-title text-lg font-semibold" id={titleId}>{title}</h3>
							<button
								type="button"
								class="btn btn-sm btn-circle btn-ghost"
								onclick={handleClose}
								aria-label="Close modal"
							>
								✕
							</button>
						</div>
					{/if}

					<div class="modal-body">
						{@render children?.()}
					</div>

					<div class="modal-footer flex items-center justify-end gap-2">
						{#if actions}
							{@render actions()}
						{:else}
							<button type="button" class="btn" onclick={handleClose}>Close</button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal.is-open {
		opacity: 1;
		pointer-events: auto;
	}
</style>
