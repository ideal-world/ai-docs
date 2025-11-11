<script lang="ts">
	import { currentMode, modeStore } from '$lib/stores/mode';
	import { currentPreview, mainPreview, resultFiles } from '$lib/stores/documents';
	import Progress from '$lib/components/ui/Progress.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import * as m from '$lib/paraglide/messages';
	import { get } from 'svelte/store';
	import { currentLanguage } from '$lib/stores/language';

	let executing = $state(false);
	let progress = $state(0);
	let resultReady = $state(false);
	let errorMsg = $state<string | null>(null);

	const copy = $derived.by(() => {
		$currentLanguage;
		return {
			modes: {
				ocr: m.mode_ocr(),
				translate: m.mode_translate(),
				qa: m.mode_qa(),
				review: m.mode_review(),
				extract: m.mode_extract()
			},
			gating: m.gating_ocr_required(),
			emptyHint: m.operation_instructions_upload_prompt(),
			instructions: m.operation_instructions_default(),
			execute: m.operation_execute(),
			resultExport: m.result_export(),
			previewOcr: m.preview_view_ocr_result()
		};
	});

	const modes = ['ocr', 'translate', 'qa', 'review', 'extract'] as const;
	type Mode = (typeof modes)[number];
	const iconMap: Record<Mode, string> = {
		ocr: '📄',
		translate: '🌐',
		qa: '❓',
		review: '✓',
		extract: '📋'
	};

	// OCR 门控：图片/PDF 主文件 + 未发现 OCR 结果文件时，除 OCR 模式外全部禁用
	import type { FeatureMode } from '$lib/stores/mode';

	function isOcrGated(mode: FeatureMode): boolean {
		if (mode === 'idle') return false;
		const main = get(mainPreview);
		if (!main) return false;
		const isImageOrPdf = main.type === 'image' || main.type === 'pdf';
		const hasOcrResult = get(resultFiles).some((f) => f.name.endsWith('_ocr.json'));
		if (!isImageOrPdf) return false; // 仅图片/PDF 触发
		if (hasOcrResult) return false; // 已完成 OCR
		return mode !== 'ocr';
	}

	function switchMode(mode: Mode) {
		modeStore.setMode(mode);
	}

	async function executeCurrent() {
		executing = true; progress = 5; errorMsg = null; resultReady = false;
		try {
			// 占位模拟执行进度
			for (const step of [25,50,75,100]) {
				await new Promise(r=>setTimeout(r, 120));
				progress = step;
			}
			resultReady = true;
		} catch (err) {
			errorMsg = (err as Error).message;
		} finally {
			executing = false;
		}
	}

	function canExecute(): boolean {
		if (isOcrGated(get(currentMode))) return false;
		return !!get(currentPreview);
	}

	function viewOcrResult() {
		// 占位：未来打开 OCR 结果查看组件
		// 这里仅添加一个通知标记
		alert(m.preview_view_ocr_result());
	}

</script>

<section class="flex h-full flex-col gap-4 rounded-lg bg-base-100 p-4 shadow-sm">
	<header>
		<div class="flex flex-wrap gap-2.5">
			{#each modes as mode}
				<button
					class={`flex items-center gap-2 rounded-lg border border-base-content/15 bg-base-200 px-4 py-2 text-sm font-medium text-base-content/80 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-45 ${mode === $currentMode ? 'border-primary bg-primary/15 text-primary font-semibold ring-2 ring-primary/20' : 'hover:-translate-y-0.5 hover:border-primary/60 hover:bg-base-100 hover:text-primary hover:shadow-md'} ${isOcrGated(mode) ? 'pointer-events-none' : ''}`}
					onclick={() => switchMode(mode)}
					disabled={isOcrGated(mode)}
					type="button"
				>
					<span class="text-lg leading-none">{iconMap[mode]}</span>
					<span class="leading-none">
						{#if mode === 'ocr'}{copy.modes.ocr}{:else if mode === 'translate'}{copy.modes.translate}{:else if mode === 'qa'}{copy.modes.qa}{:else if mode === 'review'}{copy.modes.review}{:else if mode === 'extract'}{copy.modes.extract}{/if}
					</span>
					{#if isOcrGated(mode)}<span class="ml-1 text-xs" title={copy.gating}>🔒</span>{/if}
				</button>
			{/each}
		</div>
	</header>

	<div class="flex flex-1 flex-col gap-3">
		{#if !$currentPreview}
			<div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-base-content/20 bg-base-100/80 px-6 py-10 text-center text-sm leading-relaxed text-base-content/60">
				<svg class="mb-4 h-10 w-10 text-base-content/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 16v-8m0 0l-3 3m3-3l3 3M6 16v1a2 2 0 002 2h8a2 2 0 002-2v-1" />
				</svg>
				<p class="max-w-xs">{copy.emptyHint}</p>
			</div>
		{:else if isOcrGated($currentMode)}
			<p class="text-xs text-base-content/60">{copy.gating}</p>
		{:else}
			<div class="rounded-lg border border-dashed border-base-content/15 p-3 text-xs text-base-content/60">
				<p class="m-0 leading-relaxed">{copy.instructions}</p>
			</div>
			<div class="mt-2 flex flex-col gap-2">
				<Button variant="primary" disabled={!canExecute() || executing} on:click={executeCurrent}>
					{copy.execute}
				</Button>
				{#if executing}
					<div class="mt-2"><Progress value={progress} /></div>
				{/if}
				{#if errorMsg}
					<p class="mt-1 text-xs text-error">{errorMsg}</p>
				{/if}
			</div>
		{/if}
	</div>

	{#if resultReady}
		<div class="mt-4 flex flex-col gap-2 border-t border-base-content/10 pt-2 text-sm text-base-content/80">
			<header class="flex items-center justify-between">
				<h4>{copy.resultExport}</h4>
				<!-- 导出按钮占位 -->
				<Button variant="secondary" size="sm">Export ▼</Button>
			</header>
			<div class="text-xs text-base-content/70">
				<p class="m-0">Result content placeholder...</p>
			</div>
		</div>
	{/if}

	{#if get(resultFiles).some((f) => f.name.endsWith('_ocr.json'))}
		<div class="mt-auto">
			<Button variant="ghost" size="sm" on:click={viewOcrResult}>{copy.previewOcr}</Button>
		</div>
	{/if}
</section>
