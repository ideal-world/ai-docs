import type { Task } from '$lib/types/models';

const POLL_INTERVAL = 2000;
const pollers = new Map<string, ReturnType<typeof setInterval>>();

interface TaskApiSuccess {
	success: true;
	data: {
		task: TaskResponse;
	};
}

type TaskResponse = Omit<Task, 'createdAt' | 'startedAt' | 'completedAt' | 'eta'> & {
	createdAt: string | Date;
	startedAt?: string | Date;
	completedAt?: string | Date;
	eta?: string | Date;
};

export function startTaskPolling(taskId: string, onUpdate: (task: TaskResponse) => void) {
	if (pollers.has(taskId)) {
		return;
	}

	const poll = async () => {
		try {
			const response = await fetch(`/api/task/${taskId}`);
			if (!response.ok) {
				if (response.status === 404) {
					stopTaskPolling(taskId);
				}
				return;
			}

			const payload = (await response.json()) as TaskApiSuccess | { success: false };
			if (!payload.success) {
				return;
			}

			onUpdate(payload.data.task);

			if (
				payload.data.task.status === 'succeeded' ||
				payload.data.task.status === 'failed' ||
				payload.data.task.status === 'cancelled'
			) {
				stopTaskPolling(taskId);
			}
		} catch (error) {
			console.error('task poll failed', error);
		}
	};

	poll().catch((error) => console.error('task poll failed', error));

	const timer = setInterval(() => {
		void poll();
	}, POLL_INTERVAL);
	pollers.set(taskId, timer);
}

export function stopTaskPolling(taskId: string) {
	const timer = pollers.get(taskId);
	if (timer) {
		clearInterval(timer);
		pollers.delete(taskId);
	}
}

export function stopAllTaskPolling() {
	for (const timer of pollers.values()) {
		clearInterval(timer);
	}
	pollers.clear();
}
