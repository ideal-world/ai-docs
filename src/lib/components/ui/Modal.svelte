<script lang="ts">
	interface Props {
		open?: boolean;
		title?: string;
		onClose?: () => void;
		children?: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
	}

	let { open = $bindable(false), title, onClose, children, actions }: Props = $props();

	function handleClose() {
		open = false;
		onClose?.();
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal modal-open" onclick={handleBackdropClick}>
		<div class="modal-box">
			{#if title}
				<h3 class="font-bold text-lg mb-4">{title}</h3>
			{/if}

			<div class="modal-content">
				{@render children?.()}
			</div>

			{#if actions}
				<div class="modal-action">
					{@render actions()}
				</div>
			{:else}
				<div class="modal-action">
					<button class="btn" onclick={handleClose}>Close</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
