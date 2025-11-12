<script lang="ts">
	import { currentLanguage } from '$lib/stores/language';
	import { themeStore, THEMES, type Theme } from '$lib/stores/theme';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		visible?: boolean;
		onClose?: () => void;
	}

	let { visible = $bindable(false), onClose }: Props = $props();

	type LocaleCode = 'zh-cn' | 'en-us';

	const copy = $derived.by(() => {
		$currentLanguage;
		return {
			title: m.settings_title(),
			language: m.language(),
			languageDescription: m.settings_language_description(),
			chinese: m.chinese(),
			english: m.english(),
			theme: m.settings_theme(),
			themeDescription: m.settings_theme_description(),
			activeThemeBadge: m.settings_theme_active_badge(),
			close: m.common_close()
		};
	});

	const themeLabels = $derived.by(() => {
		$currentLanguage;
		return {
			light: m.theme_light(),
			dark: m.theme_dark(),
			black: m.theme_black(),
			claude: m.theme_claude(),
			corporate: m.theme_corporate(),
			ghibli: m.theme_ghibli(),
			gourmet: m.theme_gourmet(),
			luxury: m.theme_luxury(),
			mintlify: m.theme_mintlify(),
			pastel: m.theme_pastel(),
			perplexity: m.theme_perplexity(),
			shadcn: m.theme_shadcn(),
			slack: m.theme_slack(),
			soft: m.theme_soft(),
			spotify: m.theme_spotify(),
			valorant: m.theme_valorant(),
			vscode: m.theme_vscode()
		} satisfies Record<Theme, string>;
	});

	const selectedTheme = $derived.by(() => $themeStore as Theme);

	function handleClose() {
		visible = false;
		onClose?.();
	}

	function switchLanguage(lang: LocaleCode) {
		currentLanguage.set(lang);
	}

	function handleThemeSelect(theme: Theme) {
		if (selectedTheme === theme) {
			return;
		}
		themeStore.setTheme(theme);
	}
</script>


	<Modal bind:open={visible} title={copy.title} onClose={handleClose} size="lg">
		{#snippet children()}
			<section class="flex flex-col gap-5">
				<div class="rounded-2xl border border-base-content/10 bg-base-200/70 p-5 shadow-sm shadow-base-content/5 backdrop-blur-sm">
					<header class="flex flex-col gap-1.5">
						<h3 class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/60">
							{copy.language}
						</h3>
						<p class="text-sm text-base-content/70">
							{copy.languageDescription}
						</p>
					</header>
					<div class="mt-4 grid gap-3 sm:grid-cols-2">
						<button
							type="button"
							class={`flex items-center justify-center rounded-xl border border-base-content/12 bg-base-100/80 px-4 py-3 text-sm font-medium text-base-content/80 transition-all duration-200 hover:border-primary/55 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${$currentLanguage === 'zh-cn' ? 'border-primary bg-primary/15 text-primary ring-1 ring-primary/40' : ''}`}
							onclick={() => switchLanguage('zh-cn')}
							aria-pressed={$currentLanguage === 'zh-cn'}
						>
							{copy.chinese}
						</button>
						<button
							type="button"
							class={`flex items-center justify-center rounded-xl border border-base-content/12 bg-base-100/80 px-4 py-3 text-sm font-medium text-base-content/80 transition-all duration-200 hover:border-primary/55 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${$currentLanguage === 'en-us' ? 'border-primary bg-primary/15 text-primary ring-1 ring-primary/40' : ''}`}
							onclick={() => switchLanguage('en-us')}
							aria-pressed={$currentLanguage === 'en-us'}
						>
							{copy.english}
						</button>
					</div>
				</div>

				<div class="rounded-2xl border border-base-content/10 bg-base-200/70 p-5 shadow-sm shadow-base-content/5 backdrop-blur-sm">
					<header class="flex flex-col gap-1.5">
						<h3 class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/60">
							{copy.theme}
						</h3>
						<p class="text-sm text-base-content/70">
							{copy.themeDescription}
						</p>
					</header>
					<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{#each THEMES as theme}
							<button
								type="button"
								class={`group flex h-full flex-col gap-3 rounded-xl border border-base-content/12 bg-base-100/80 p-4 text-left transition-all duration-200 hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${selectedTheme === theme ? 'border-primary bg-primary/10 ring-1 ring-primary/40' : ''}`}
								onclick={() => handleThemeSelect(theme)}
								aria-pressed={selectedTheme === theme}
							>
								<div class="flex items-center justify-between gap-2">
									<span class="text-sm font-semibold text-base-content">
										{themeLabels[theme]}
									</span>
									{#if selectedTheme === theme}
										<span class="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
											{copy.activeThemeBadge}
										</span>
									{/if}
								</div>
								<div
									class="flex h-12 w-full items-center justify-between gap-3 rounded-lg border border-base-content/10 bg-base-200/70 px-3 transition-colors duration-200 group-hover:border-primary/50"
									data-theme={theme}
									aria-hidden="true"
								>
									<span class="text-base font-semibold text-base-content">Aa</span>
									<span class="flex flex-1 items-center justify-end gap-1.5">
										<span class="h-2 w-8 rounded-full bg-primary/60"></span>
										<span class="h-2 w-6 rounded-full bg-base-content/40"></span>
									</span>
								</div>
							</button>
						{/each}
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

