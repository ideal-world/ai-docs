import { derived, writable } from 'svelte/store';
import type { Task } from '$lib/types/models';

interface ProcessingState {
	tasks: Map<string, Task>;
	fileTaskMap: Map<string, string>;
}

function createProcessingStore() {
	const initialState: ProcessingState = {
		tasks: new Map(),
		fileTaskMap: new Map()
	};

	const { subscribe, update, set } = writable<ProcessingState>(initialState);

	function normalizeTask(task: Task): Task {
		return {
			stage: undefined,
			result: undefined,
			error: undefined,
			...task
		};
	}

	return {
		subscribe,
		registerTask(task: Task) {
			update((state) => {
				const normalized = normalizeTask(task);
				const nextTasks = new Map(state.tasks);
				nextTasks.set(normalized.id, normalized);

				const nextMap = new Map(state.fileTaskMap);
				if (normalized.fileId) {
					nextMap.set(normalized.fileId, normalized.id);
				}

				return {
					tasks: nextTasks,
					fileTaskMap: nextMap
				};
			});
		},
		registerTasks(tasks: Task[]) {
			tasks.forEach((task) => this.registerTask(task));
		},
		updateTask(task: Task) {
			update((state) => {
				if (!state.tasks.has(task.id)) {
					return state;
				}

				const nextTasks = new Map(state.tasks);
				nextTasks.set(task.id, {
					...nextTasks.get(task.id)!,
					...task
				});

				return {
					tasks: nextTasks,
					fileTaskMap: new Map(state.fileTaskMap)
				};
			});
		},
		removeTask(taskId: string) {
			update((state) => {
				if (!state.tasks.has(taskId)) {
					return state;
				}

				const nextTasks = new Map(state.tasks);
				nextTasks.delete(taskId);

				const nextMap = new Map(state.fileTaskMap);
				for (const [fileId, mappedTaskId] of nextMap.entries()) {
					if (mappedTaskId === taskId) {
						nextMap.delete(fileId);
					}
				}

				return {
					tasks: nextTasks,
					fileTaskMap: nextMap
				};
			});
		},
		reset() {
			set(initialState);
		}
	};
}

export const processingStore = createProcessingStore();

export const activeTasks = derived(processingStore, ($processing) => Array.from($processing.tasks.values()));

export function findTaskByFileId(fileId: string) {
	return derived(processingStore, ($processing) => {
		const taskId = $processing.fileTaskMap.get(fileId);
		return taskId ? $processing.tasks.get(taskId) ?? null : null;
	});
}
