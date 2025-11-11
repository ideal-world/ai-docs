<script lang="ts">
	import SplitPane from '$lib/components/layout/SplitPane.svelte';
	import PreviewPanel from '$lib/components/workspace/PreviewPanel.svelte';
	import AttachmentPanel from '$lib/components/workspace/AttachmentPanel.svelte';
	import OperationPanel from '$lib/components/workspace/OperationPanel.svelte';
	import { currentPreview } from '$lib/stores/documents';
</script>

<SplitPane orientation="horizontal" initialLeftSize={58} minLeftSize={30} maxLeftSize={80}>
	{#snippet leftPanel()}
		<section class="flex h-full min-h-0 flex-col gap-2 p-1.5">
			<SplitPane
				orientation="vertical"
				initialLeftSize={74}
				minLeftSize={28}
				maxLeftSize={90}
				resizable={true}
				class="h-full min-h-0"
			>
				{#snippet leftPanel()}
					<div class="flex flex-1 min-h-0 flex-col">
						<PreviewPanel file={$currentPreview} />
					</div>
				{/snippet}
				{#snippet rightPanel()}
					<div class="flex h-full min-h-0 flex-col">
						<AttachmentPanel />
					</div>
				{/snippet}
			</SplitPane>
		</section>
	{/snippet}

	{#snippet rightPanel()}
		<OperationPanel />
	{/snippet}
</SplitPane>
