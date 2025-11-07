<script lang="ts">
	interface Props {
		type?: 'success' | 'error' | 'warning' | 'info';
		message: string;
		duration?: number; // milliseconds, 0 = no auto-dismiss
		onClose?: () => void;
		visible?: boolean;
	}

	let {
		type = 'info',
		message,
		duration = 3000,
		onClose,
		visible = $bindable(true)
	}: Props = $props();

	const typeClasses = {
		success: 'alert-success',
		error: 'alert-error',
		warning: 'alert-warning',
		info: 'alert-info'
	};

	const icons = {
		success: '✓',
		error: '✕',
		warning: '⚠',
		info: 'ℹ'
	};

	$effect(() => {
		if (visible && duration > 0) {
			const timer = setTimeout(() => {
				visible = false;
				onClose?.();
			}, duration);
			return () => clearTimeout(timer);
		}
	});

	function handleClose() {
		visible = false;
		onClose?.();
	}
</script>

{#if visible}
	<div class="alert {typeClasses[type]} shadow-lg" role="alert">
		<span class="text-lg">{icons[type]}</span>
		<span>{message}</span>
		<button class="btn btn-ghost btn-sm" onclick={handleClose} aria-label="Close">✕</button>
	</div>
{/if}
