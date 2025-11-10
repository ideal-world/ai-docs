<script lang="ts">
	import { currentLanguage } from '$lib/stores/language';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		visible?: boolean;
		onClose?: () => void;
	}

	let { visible = $bindable(false), onClose }: Props = $props();

	const copy = $derived.by(() => {
		$currentLanguage;
		return {
			title: m.settings_title(),
			language: m.language(),
			chinese: m.chinese(),
			english: m.english(),
			close: m.common_close()
		};
	});

	function handleClose() {
		visible = false;
		onClose?.();
	}

	function switchLanguage(lang: 'zh-cn' | 'en-us') {
		currentLanguage.set(lang);
	}
</script>


	<Modal bind:open={visible} title={copy.title} onClose={handleClose} size="md">
		{#snippet children()}
			<section class="flex flex-col gap-6">
				<div>
					<h3 class="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-base-content/60">
						{copy.language}
					</h3>
						<div class="flex gap-3">
							<button
								type="button"
								class={`flex-1 rounded-lg border border-base-content/15 bg-base-200 px-4 py-3 text-sm font-medium text-base-content/80 transition-all duration-200 hover:border-primary/60 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${$currentLanguage === 'zh-cn' ? 'border-primary bg-primary/15 text-primary font-semibold' : ''}`}
								onclick={() => switchLanguage('zh-cn')}
							>
							{copy.chinese}
							</button>
							<button
								type="button"
								class={`flex-1 rounded-lg border border-base-content/15 bg-base-200 px-4 py-3 text-sm font-medium text-base-content/80 transition-all duration-200 hover:border-primary/60 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${$currentLanguage === 'en-us' ? 'border-primary bg-primary/15 text-primary font-semibold' : ''}`}
								onclick={() => switchLanguage('en-us')}
							>
							{copy.english}
							</button>
						</div>
				</div>
			</section>
		{/snippet}

		{#snippet actions()}
			<Button variant="primary" on:click={handleClose}>
				{copy.close}
			</Button>
		{/snippet}
	</Modal>

