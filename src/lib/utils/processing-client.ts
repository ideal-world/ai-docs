import { documentsStore } from '$lib/stores/documents';
import { processingStore } from '$lib/stores/processing';
import { startTaskPolling } from '$lib/utils/task-poller';
import type { File, Task } from '$lib/types/models';

interface PipelineTaskPayload {
	markdownFile?: File;
	convertedPdfFile?: File;
	sourceFile?: File;
}

export type TaskLike = Omit<Task, 'createdAt' | 'startedAt' | 'completedAt' | 'eta'> & {
	createdAt: string | Date;
	startedAt?: string | Date;
	completedAt?: string | Date;
	eta?: string | Date;
};

function normalizeTaskDates(task: TaskLike): Task {
	return {
		...task,
		createdAt: task.createdAt instanceof Date ? task.createdAt : new Date(task.createdAt),
		startedAt:
			task.startedAt instanceof Date || task.startedAt === undefined
				? task.startedAt
				: new Date(task.startedAt),
		completedAt:
			task.completedAt instanceof Date || task.completedAt === undefined
				? task.completedAt
				: new Date(task.completedAt),
		eta:
			task.eta instanceof Date || task.eta === undefined ? task.eta : new Date(task.eta)
	};
}

function handleTaskUpdate(rawTask: TaskLike) {
	const task = normalizeTaskDates(rawTask);
	processingStore.updateTask(task);

	if (task.status !== 'succeeded' || !task.result?.data) {
		return;
	}

	const payload = task.result.data as PipelineTaskPayload;

	if (payload.sourceFile) {
		documentsStore.updateFile(payload.sourceFile.id, payload.sourceFile);
	}

	if (payload.convertedPdfFile) {
		documentsStore.addFile(payload.convertedPdfFile);
		// Auto-switch preview to PDF if currently showing the source office file
		if (task.fileId && task.fileId === payload.sourceFile?.id) {
			documentsStore.setCurrentPreview(payload.convertedPdfFile.id);
		}
	}

	if (payload.markdownFile) {
		documentsStore.addFile(payload.markdownFile);
	}
}

export function registerProcessingTasks(tasks: TaskLike[]): void {
	if (!tasks.length) return;

	const normalizedTasks = tasks.map(normalizeTaskDates);
	processingStore.registerTasks(normalizedTasks);

	normalizedTasks.forEach((task) => {
		startTaskPolling(task.id, handleTaskUpdate);
	});
}
