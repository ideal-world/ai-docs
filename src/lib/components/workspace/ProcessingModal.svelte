<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Progress from '$lib/components/ui/Progress.svelte';
	import { activeTasks } from '$lib/stores/processing';
	import { mainPreview } from '$lib/stores/documents';
	import * as m from '$lib/paraglide/messages';

	type StageKey =
		| 'pipeline.stage.pending'
		| 'pipeline.stage.office_to_pdf'
		| 'pipeline.stage.pdf_to_markdown'
		| 'pipeline.stage.ocr_to_markdown'
		| 'pipeline.stage.completed'
		| 'pipeline.stage.cancelled'
		| 'unknown';

	const stageLabels = $derived.by<Record<StageKey, string>>(() => ({
		'pipeline.stage.pending': m.pipeline_stage_pending(),
		'pipeline.stage.office_to_pdf': m.pipeline_stage_office_to_pdf(),
		'pipeline.stage.pdf_to_markdown': m.pipeline_stage_pdf_to_markdown(),
		'pipeline.stage.ocr_to_markdown': m.pipeline_stage_ocr_to_markdown(),
		'pipeline.stage.completed': m.pipeline_stage_completed(),
		'pipeline.stage.cancelled': m.pipeline_stage_cancelled(),
		unknown: m.operation_processing_stage_unknown()
	}));

	const copy = $derived.by(() => ({
		title: m.processing_modal_title(),
		description: (filename: string) => m.processing_modal_description({ filename }),
		stageLabel: m.processing_modal_stage_label(),
		progressLabel: m.processing_modal_progress_label(),
		cancel: m.processing_modal_cancel(),
		cancelError: (reason: string) => m.processing_modal_cancel_error({ reason }),
		loading: m.common_loading()
	}));

	const currentTask = $derived.by(() => {
		const tasks = $activeTasks;
		const main = $mainPreview;
		if (!main) return null;
		return (
			tasks.find(
				(task) =>
					task.fileId === main.id && (task.status === 'pending' || task.status === 'running')
			) ?? null
		);
	});

	let open = $state(false);
	let manualDismissed = $state(false);
	let dismissedTaskId: string | null = $state(null);
	let canceling = $state(false);
	let cancelErrorMessage: string | null = $state(null);

	function getStageLabel(stage?: string | null): string {
		const labels = stageLabels;
		const key = (stage ?? 'unknown') as StageKey;
		return labels[key] ?? labels.unknown;
	}

	function resetDismissState() {
		manualDismissed = false;
		dismissedTaskId = null;
	}

	function handleDismiss() {
		const task = currentTask;
		manualDismissed = true;
		dismissedTaskId = task?.id ?? null;
		open = false;
		cancelErrorMessage = null;
	}

	async function cancelCurrentTask() {
		const task = currentTask;
		if (!task) return;

		cancelErrorMessage = null;
		canceling = true;

		try {
			const response = await fetch(`/api/task/${task.id}/cancel`, {
				method: 'POST'
			});

			if (!response.ok) {
				let message = response.statusText;
				try {
					const payload = await response.json();
					message = payload?.message ?? message;
				} catch (parseError) {
					message = response.statusText;
				}
				throw new Error(message);
			}

			manualDismissed = true;
			dismissedTaskId = task.id;
			open = false;
		} catch (error) {
			const reason = (error as Error).message || 'Unknown error';
			cancelErrorMessage = copy.cancelError(reason);
		} finally {
			canceling = false;
		}
	}

	function handleModalClose() {
		handleDismiss();
	}

	$effect(() => {
		const task = currentTask;

		if (task) {
			if (dismissedTaskId && dismissedTaskId !== task.id) {
				resetDismissState();
				cancelErrorMessage = null;
			}

			if (task.status === 'pending' || task.status === 'running') {
				if (!manualDismissed) {
					open = true;
					cancelErrorMessage = null;
				}
				return;
			}
		}

		open = false;
		resetDismissState();
		cancelErrorMessage = null;
		canceling = false;
	});
</script>

<Modal
	bind:open
	title={copy.title}
	onClose={handleModalClose}
	size="md"
	closeOnBackdrop={false}
	closeOnEscape={false}
>
	{#snippet children()}
		{#if currentTask}
			{@const task = currentTask}
			{@const file = $mainPreview}
			{@const progress = task.progress ?? 0}
			<section class="space-y-4 text-sm text-base-content/80">
				<p>{copy.description(file ? file.name : m.preview_empty_title())}</p>

				<div class="rounded-lg border border-base-content/12 bg-base-200/40 px-4 py-3">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
						{copy.stageLabel}
					</p>
					<p class="mt-1 text-sm font-medium text-base-content">{getStageLabel(task.stage)}</p>
				</div>

				<div class="space-y-2">
					<div
						class="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50"
					>
						<span>{copy.progressLabel}</span>
					</div>
					<Progress value={progress} />
				</div>

				{#if cancelErrorMessage}
					<p class="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error/90">
						{cancelErrorMessage}
					</p>
				{/if}
			</section>
		{:else}
			<p class="text-sm text-base-content/70">{m.operation_processing_idle()}</p>
		{/if}
	{/snippet}

	{#snippet actions()}
		<Button
			variant="danger"
			loading={canceling}
			disabled={!currentTask}
			on:click={cancelCurrentTask}
		>
			{canceling ? copy.loading : copy.cancel}
		</Button>
	{/snippet}
</Modal>
