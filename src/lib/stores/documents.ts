import { writable, derived } from 'svelte/store';
import type { File as FileModel } from '$lib/types/models';

interface DocumentsState {
	files: FileModel[];
	currentPreviewId: string | null;
	uploadProgress: Map<string, number>; // fileId -> progress (0-100)
}

function buildFileUrl(file: FileModel): string {
	return `/api/files/${file.sessionId}/${file.category}/${file.id}_${file.name}`;
}

function normalizeFile(file: FileModel): FileModel {
	return {
		...file,
		path: buildFileUrl(file)
	};
}

function createDocumentsStore() {
	const initialState: DocumentsState = {
		files: [],
		currentPreviewId: null,
		uploadProgress: new Map()
	};

	const { subscribe, set, update } = writable<DocumentsState>(initialState);

	return {
		subscribe,
		addFile: (file: FileModel) =>
			update((state) => ({
				...state,
				files: [...state.files, normalizeFile(file)]
			})),
		removeFile: (fileId: string) =>
			update((state) => ({
				...state,
				files: state.files.filter((f) => f.id !== fileId),
				currentPreviewId: state.currentPreviewId === fileId ? null : state.currentPreviewId
			})),
		updateFile: (fileId: string, updates: Partial<FileModel>) =>
			update((state) => ({
				...state,
				files: state.files.map((f) =>
					f.id === fileId ? normalizeFile({ ...f, ...updates }) : f
				)
			})),
		setCurrentPreview: (fileId: string | null) =>
			update((state) => ({
				...state,
				currentPreviewId: fileId
			})),
		setUploadProgress: (fileId: string, progress: number) =>
			update((state) => {
				const newProgress = new Map(state.uploadProgress);
				newProgress.set(fileId, progress);
				return { ...state, uploadProgress: newProgress };
			}),
		removeUploadProgress: (fileId: string) =>
			update((state) => {
				const newProgress = new Map(state.uploadProgress);
				newProgress.delete(fileId);
				return { ...state, uploadProgress: newProgress };
			}),
		clearAll: () => set(initialState),
		reset: () => set(initialState)
	};
}

export const documentsStore = createDocumentsStore();

// Derived store for current preview file
export const currentPreview = derived(
	documentsStore,
	($docs) => $docs.files.find((f) => f.id === $docs.currentPreviewId) || null
);

// Derived store for uploaded files by type
export const imageFiles = derived(documentsStore, ($docs) =>
	$docs.files.filter((f) => f.type === 'image')
);

export const pdfFiles = derived(documentsStore, ($docs) =>
	$docs.files.filter((f) => f.type === 'pdf')
);

export const officeFiles = derived(documentsStore, ($docs) =>
	$docs.files.filter((f) => f.type === 'office')
);

// Derived store for files by category
export const uploadedFiles = derived(documentsStore, ($docs) =>
	$docs.files.filter((f) => f.category === 'uploads')
);

export const convertedFiles = derived(documentsStore, ($docs) =>
	$docs.files.filter((f) => f.category === 'converted')
);

export const resultFiles = derived(documentsStore, ($docs) =>
	$docs.files.filter((f) => f.category === 'results')
);
