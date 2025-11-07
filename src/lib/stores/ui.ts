import { writable } from 'svelte/store';

export interface UIState {
	theme: 'light' | 'dark' | 'auto';
	sidebarCollapsed: boolean;
	splitPaneSize: number;
	notifications: Array<{
		id: string;
		type: 'success' | 'error' | 'warning' | 'info';
		message: string;
		timestamp: number;
	}>;
}

function createUIStore() {
	const initialState: UIState = {
		theme: 'auto',
		sidebarCollapsed: false,
		splitPaneSize: 30,
		notifications: []
	};

	const { subscribe, set, update } = writable<UIState>(initialState);

	return {
		subscribe,
		setTheme: (theme: UIState['theme']) => update((state) => ({ ...state, theme })),
		toggleSidebar: () =>
			update((state) => ({ ...state, sidebarCollapsed: !state.sidebarCollapsed })),
		setSplitPaneSize: (size: number) => update((state) => ({ ...state, splitPaneSize: size })),
		addNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string) =>
			update((state) => ({
				...state,
				notifications: [
					...state.notifications,
					{
						id: crypto.randomUUID(),
						type,
						message,
						timestamp: Date.now()
					}
				]
			})),
		removeNotification: (id: string) =>
			update((state) => ({
				...state,
				notifications: state.notifications.filter((n) => n.id !== id)
			})),
		clearNotifications: () => update((state) => ({ ...state, notifications: [] })),
		reset: () => set(initialState)
	};
}

export const uiStore = createUIStore();
