import { writable, derived } from 'svelte/store';
import { getLocale, setLocale, locales } from '$lib/paraglide/runtime';

type LocaleCode = 'zh-cn' | 'en-us';

const DEFAULT_LOCALE: LocaleCode = 'zh-cn';
const LOCAL_STORAGE_KEY = 'preferred-locale';
const COOKIE_KEY = 'preferred-locale';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

// Normalize user-provided locale variants to canonical paraglide codes
function normalize(code: string | null | undefined): LocaleCode | null {
	if (!code) return null;
	const lower = code.toLowerCase();
	if (lower === 'zh-cn' || lower === 'zh_cn' || lower === 'zh') return 'zh-cn';
	if (lower === 'en-us' || lower === 'en_us' || lower === 'en') return 'en-us';
	return null;
}

// Create a writable store for the current language
function createLanguageStore() {
	const initialRuntimeLocale = normalize(getLocale()) ?? DEFAULT_LOCALE;
	const { subscribe, set } = writable<LocaleCode>(initialRuntimeLocale);

	const persistLocale = (locale: LocaleCode) => {
		if (typeof document !== 'undefined') {
			document.documentElement.lang = locale;
		}
		if (typeof window !== 'undefined') {
			try {
				window.localStorage.setItem(LOCAL_STORAGE_KEY, locale);
			} catch (error) {
				console.warn('Failed to persist locale preference', error);
			}
		}
		if (typeof document !== 'undefined') {
			document.cookie = `${COOKIE_KEY}=${encodeURIComponent(locale)}; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
		}
	};

	return {
		subscribe,
		set: (lang: string) => {
			const normalized = normalize(lang);
			if (normalized) {
				setLocale(normalized, { reload: false });
				set(normalized);
				persistLocale(normalized);
			}
		},
		init: () => {
			// Initialize with stored preference or paraglide runtime locale
			let initial: LocaleCode = initialRuntimeLocale;
			if (typeof document !== 'undefined') {
				const cookieLocale = normalize(
					document.cookie
						?.split(';')
						.map((c) => c.trim())
						.find((c) => c.startsWith(`${COOKIE_KEY}=`))
						?.split('=')[1]
						?.trim()
				);
				if (cookieLocale) {
					initial = cookieLocale;
				}
			}
			if (typeof window !== 'undefined') {
				try {
					const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
					const normalized = normalize(stored);
					if (normalized) {
						initial = normalized;
					}
				} catch (error) {
					console.warn('Failed to read locale preference', error);
				}
			}
			setLocale(initial, { reload: false });
			set(initial);
			persistLocale(initial);
		}
	};
}

export const currentLanguage = createLanguageStore();

// Derived store for available languages
export const languages = derived(currentLanguage, () => locales);
