<script lang="ts">
	interface Props {
		value: number; // 0-100
		showPercentage?: boolean;
		color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
		size?: 'sm' | 'md' | 'lg';
	}

	let { value = 0, showPercentage = true, color = 'primary', size = 'md' }: Props = $props();

	const clampedValue = $derived(Math.max(0, Math.min(100, value)));

	const colorClasses = {
		primary: 'progress-primary',
		secondary: 'progress-secondary',
		success: 'progress-success',
		error: 'progress-error',
		warning: 'progress-warning'
	};

	const sizeClasses = {
		sm: 'progress-sm',
		md: '',
		lg: 'progress-lg'
	};
</script>

<div class="flex items-center gap-2 w-full">
	<progress
		class="progress {colorClasses[color]} {sizeClasses[size]} flex-1"
		value={clampedValue}
		max="100"
	></progress>
	{#if showPercentage}
		<span class="text-sm font-medium min-w-[3rem] text-right">
			{Math.round(clampedValue)}%
		</span>
	{/if}
</div>
