import { writable, derived } from 'svelte/store';
import { generateTraceId } from '$lib/utils/trace';
import type { Session, FileRef } from '$lib/types/models';

const SESSION_TTL_HOURS = 24;
const STORAGE_KEY = 'ai-docs-session-id';

function createSessionStore() {
	const initialSession: Session = {
		id: generateTraceId(),
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000),
		language: 'zh-CN',
		files: [],
		metadata: {}
	};

	const { subscribe, set, update } = writable<Session>(initialSession);

	// Initialize session from storage or create new
	function init() {
		if (typeof window === 'undefined') return;

		const storedId = localStorage.getItem(STORAGE_KEY);
		if (storedId) {
			// Load existing session
			update((s) => ({ ...s, id: storedId }));
		} else {
			// Save new session ID
			localStorage.setItem(STORAGE_KEY, initialSession.id);
		}
	}

	return {
		subscribe,
		init,
		setLanguage: (language: 'zh-CN' | 'en-US') => update((s) => ({ ...s, language })),
		addFile: (fileRef: FileRef) =>
			update((s) => ({
				...s,
				files: [...s.files, fileRef]
			})),
		removeFile: (fileId: string) =>
			update((s) => ({
				...s,
				files: s.files.filter((f) => f.fileId !== fileId)
			})),
		setMetadata: (key: string, value: unknown) =>
			update((s) => ({
				...s,
				metadata: { ...s.metadata, [key]: value }
			})),
		reset: () => {
			if (typeof window !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY);
			}
			const newSession: Session = {
				id: generateTraceId(),
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000),
				language: 'zh-CN',
				files: [],
				metadata: {}
			};
			if (typeof window !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, newSession.id);
			}
			set(newSession);
		}
	};
}

export const sessionStore = createSessionStore();

// Derived store for session ID
export const sessionId = derived(sessionStore, ($session) => $session.id);

// Derived store for uploaded files count
export const filesCount = derived(sessionStore, ($session) => $session.files.length);
