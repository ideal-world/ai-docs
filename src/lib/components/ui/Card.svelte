<script lang="ts">
	interface Props {
		title?: string;
		collapsible?: boolean;
		collapsed?: boolean;
		children?: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
	}

	let {
		title,
		collapsible = false,
		collapsed = $bindable(false),
		children,
		actions
	}: Props = $props();

	function toggleCollapse() {
		if (collapsible) {
			collapsed = !collapsed;
		}
	}
</script>

<div class="card bg-base-100 shadow-xl">
	{#if title}
		<div class="card-header flex items-center justify-between p-4 border-b">
			<div class="flex items-center gap-2">
				<h3 class="card-title text-lg font-semibold">{title}</h3>
				{#if collapsible}
					<button
						type="button"
						class="btn btn-ghost btn-xs"
						aria-expanded={!collapsed}
						aria-label={collapsed ? 'Expand section' : 'Collapse section'}
						onclick={toggleCollapse}
						onkeydown={(e) => e.key === 'Enter' && toggleCollapse()}
					>
						{collapsed ? '▼' : '▲'}
					</button>
				{/if}
			</div>
			{#if actions}
				<div class="card-actions">
					{@render actions()}
				</div>
			{/if}
		</div>
	{/if}

	{#if !collapsed}
		<div class="card-body p-4">
			{@render children?.()}
		</div>
	{/if}
</div>
