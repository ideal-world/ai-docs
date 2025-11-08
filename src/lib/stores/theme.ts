import { writable } from 'svelte/store';

// FlyonUI supported themes
export const THEMES = [
	'light',
	'dark',
	'black',
	'claude',
	'corporate',
	'ghibli',
	'gourmet',
	'luxury',
	'mintlify',
	'pastel',
	'perplexity',
	'shadcn',
	'slack',
	'soft',
	'spotify',
	'valorant',
	'vscode'
] as const;

export type Theme = (typeof THEMES)[number];

const DEFAULT_THEME: Theme = 'light';
const LOCAL_STORAGE_KEY = 'theme';
const COOKIE_KEY = 'theme';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

function createThemeStore() {
	const { subscribe, set } = writable<Theme>(DEFAULT_THEME);

	const persistTheme = (theme: Theme) => {
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', theme);
			document.cookie = `${COOKIE_KEY}=${encodeURIComponent(theme)}; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
		}
		if (typeof window !== 'undefined') {
			try {
				window.localStorage.setItem(LOCAL_STORAGE_KEY, theme);
			} catch (error) {
				console.error('Failed to save theme to localStorage:', error);
			}
		}
	};

	return {
		subscribe,
		init: () => {
			if (typeof window === 'undefined') return;

			try {
				let selected: Theme = DEFAULT_THEME;
				const cookieValue =
					typeof document !== 'undefined'
						? document.cookie
								?.split(';')
								.map((c) => c.trim())
								.find((c) => c.startsWith(`${COOKIE_KEY}=`))
								?.split('=')[1]
								?.trim()
						: undefined;
				const cookieTheme = cookieValue
					? (decodeURIComponent(cookieValue) as Theme)
					: undefined;
				if (cookieTheme && THEMES.includes(cookieTheme)) {
					selected = cookieTheme;
				}
				const saved = localStorage.getItem(LOCAL_STORAGE_KEY) as Theme | null;
				if (saved && THEMES.includes(saved)) {
					selected = saved;
				}
				set(selected);
				persistTheme(selected);
			} catch (error) {
				console.error('Failed to load theme preference:', error);
				persistTheme(DEFAULT_THEME);
			}
		},
		setTheme: (theme: Theme) => {
			if (typeof window === 'undefined') return;

			set(theme);
			persistTheme(theme);
		}
	};
}

export const themeStore = createThemeStore();
