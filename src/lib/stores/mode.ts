import { writable, derived } from 'svelte/store';

export type FeatureMode = 'idle' | 'ocr' | 'translate' | 'qa' | 'review' | 'extract';

interface ModeState {
    currentMode: FeatureMode;
    selectedMainId: string | null;
    attachments: string[]; // file ids
}

const initialState: ModeState = {
    currentMode: 'idle',
    selectedMainId: null,
    attachments: []
};

function createModeStore() {
    const { subscribe, update, set } = writable<ModeState>(initialState);

    return {
        subscribe,
        setMain: (fileId: string | null) =>
            update((s) => ({ ...s, selectedMainId: fileId, currentMode: fileId ? s.currentMode : 'idle' })),
        setMode: (mode: FeatureMode) => update((s) => ({ ...s, currentMode: mode })),
        addAttachment: (fileId: string) =>
            update((s) => (s.attachments.includes(fileId) ? s : { ...s, attachments: [...s.attachments, fileId] })),
        removeAttachment: (fileId: string) =>
            update((s) => ({ ...s, attachments: s.attachments.filter((id) => id !== fileId) })),
        reset: () => set(initialState)
    };
}

export const modeStore = createModeStore();

export const currentMode = derived(modeStore, ($m) => $m.currentMode);
export const attachmentIds = derived(modeStore, ($m) => $m.attachments);
