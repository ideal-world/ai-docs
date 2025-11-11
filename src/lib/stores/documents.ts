import { writable, derived } from 'svelte/store';
import type { File as FileModel } from '$lib/types/models';

interface DocumentsState {
	files: FileModel[];
	currentPreviewId: string | null;
	uploadProgress: Map<string, number>; // fileId -> progress (0-100)
	/** 附件临时覆盖预览的文件 id，存在时优先显示该文件 */
	previewOverrideId?: string | null;
}

function buildFileUrl(file: FileModel): string {
	return `/api/files/${file.sessionId}/${file.category}/${file.id}_${file.name}`;
}

function normalizeFile(file: FileModel): FileModel {
	const createdAt = file.createdAt instanceof Date ? file.createdAt : new Date(file.createdAt);

	return {
		...file,
		createdAt,
		path: buildFileUrl(file)
	};
}

function createDocumentsStore() {
	const initialState: DocumentsState = {
		files: [],
		currentPreviewId: null,
		uploadProgress: new Map(),
		previewOverrideId: null
	};

	const { subscribe, set, update } = writable<DocumentsState>(initialState);

	return {
		subscribe,
		addFile: (file: FileModel) =>
			update((state) => {
				const normalized = normalizeFile(file);
				const existingIndex = state.files.findIndex((f) => f.id === normalized.id);
				if (existingIndex >= 0) {
					const nextFiles = [...state.files];
					nextFiles[existingIndex] = normalized;
					return { ...state, files: nextFiles };
				}
				return {
					...state,
					files: [...state.files, normalized]
				};
			}),
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
				currentPreviewId: fileId,
				// 切换主预览时如果覆盖的是同一个文件则清除覆盖
				previewOverrideId: state.previewOverrideId === fileId ? null : state.previewOverrideId
			})),
		pushTempPreview: (fileId: string) =>
			update((state) => ({
				...state,
				previewOverrideId: fileId
			})),
		popTempPreview: () =>
			update((state) => ({
				...state,
				previewOverrideId: null
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
export const currentPreview = derived(documentsStore, ($docs) => {
	const override = $docs.previewOverrideId;
	if (override) return $docs.files.find((f) => f.id === override) || null;
	return $docs.files.find((f) => f.id === $docs.currentPreviewId) || null;
});

export const mainPreview = derived(documentsStore, ($docs) =>
	$docs.files.find((f) => f.id === $docs.currentPreviewId) || null
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

export const latestMarkdownFile = derived(documentsStore, ($docs) => {
	const markdownFiles = $docs.files.filter((f) => f.category === 'results' && f.type === 'text');
	if (markdownFiles.length === 0) {
		return null;
	}

	return markdownFiles.reduce((latest, current) => {
		const latestTime = latest.createdAt instanceof Date ? latest.createdAt.getTime() : new Date(latest.createdAt).getTime();
		const currentTime = current.createdAt instanceof Date ? current.createdAt.getTime() : new Date(current.createdAt).getTime();
		return currentTime > latestTime ? current : latest;
	}, markdownFiles[0]);
});
