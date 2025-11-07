import { writable, derived } from 'svelte/store';
import { getLocale, setLocale, locales } from '$lib/paraglide/runtime';

// Create a writable store for the current language
function createLanguageStore() {
	const { subscribe, set } = writable(getLocale());

	return {
		subscribe,
		set: (lang: string) => {
			// Validate and set locale
			if (lang === 'zh-cn') {
				setLocale('zh-cn', { reload: false });
				set(lang);
			} else if (lang === 'en-us') {
				setLocale('en-us', { reload: false });
				set(lang);
			}
		},
		init: () => {
			// Initialize with current locale from paraglide runtime
			const currentLocale = getLocale();
			set(currentLocale);
		}
	};
}

export const currentLanguage = createLanguageStore();

// Derived store for available languages
export const languages = derived(currentLanguage, () => locales);
