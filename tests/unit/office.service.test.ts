import { describe, it, expect, beforeEach, vi } from 'vitest';

interface ExecResponse {
	error: Error | null;
	stdout: string;
	stderr: string;
}

const execState = vi.hoisted(() => ({
	queue: [] as ExecResponse[],
	commands: [] as string[],
	mock: null as unknown as ReturnType<typeof vi.fn>
}));

vi.mock('node:util', () => {
	const promisify = (fn: (...args: unknown[]) => void) =>
		(...args: unknown[]) =>
			new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
				fn(...args, (error: Error | null, stdout: string, stderr: string) => {
					if (error) {
						reject(error);
					} else {
						resolve({ stdout, stderr });
					}
				});
			});

	return {
		promisify,
		default: { promisify }
	};
});

vi.mock('node:child_process', () => {
	const execMock = vi.fn(
		(
			command: string,
			optionsOrCallback?: unknown,
			maybeCallback?: (error: Error | null, stdout: string, stderr: string) => void
		) => {
			execState.commands.push(command);
			const callback =
				typeof optionsOrCallback === 'function'
					? optionsOrCallback
					: (maybeCallback as ((error: Error | null, stdout: string, stderr: string) => void) | undefined);
			const response = execState.queue.shift() ?? { error: null, stdout: '', stderr: '' };
			setImmediate(() => {
				callback?.(response.error, response.stdout, response.stderr);
			});
			return {} as unknown;
		}
	);

	execState.mock = execMock;
	return {
		exec: execMock,
		default: { exec: execMock }
	};
});

const loggerMock = vi.hoisted(() => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	logEvent: vi.fn()
}));

vi.mock('$lib/services/logger.service', () => ({
	logger: loggerMock
}));

const storageMock = vi.hoisted(() => ({
	getFilePath: vi.fn((sessionId: string, category: string, filename: string) =>
		`/data/${sessionId}/${category}/${filename}`
	),
	getSessionDir: vi.fn((sessionId: string) => `/data/${sessionId}`),
	getFileSize: vi.fn(),
	readFile: vi.fn()
}));

vi.mock('$lib/services/storage.service', () => ({
	storageService: storageMock
}));

vi.mock('$lib/utils/config', () => ({
	systemConfig: {
		libreOffice: {
			path: '/usr/bin/libreoffice',
			timeout: 60000
		}
	}
}));

import { OfficeService } from '$lib/services/office.service';

describe('OfficeService', () => {
	beforeEach(() => {
		execState.queue.length = 0;
		execState.commands.length = 0;
		execState.mock?.mockClear();
		loggerMock.debug.mockClear();
		loggerMock.info.mockClear();
		loggerMock.warn.mockClear();
		loggerMock.error.mockClear();
		loggerMock.logEvent.mockClear();
	});

	it('throws LIBREOFFICE_NOT_INSTALLED when LibreOffice binary is missing', async () => {
		execState.queue.push({
			error: Object.assign(new Error('/usr/bin/libreoffice: not found'), { code: 'ENOENT' }),
			stdout: '',
			stderr: ''
		});

		const service = new OfficeService();

		await expect(service.convertToPdf('session', 'document.docx')).rejects.toThrow(
			'LIBREOFFICE_NOT_INSTALLED'
		);

		expect(execState.commands).toHaveLength(1);
		expect(execState.commands[0]).toContain('--version');
		expect(loggerMock.warn).toHaveBeenCalled();
	});

	it('converts Office documents when LibreOffice is available', async () => {
		execState.queue.push({ error: null, stdout: 'LibreOffice 7.6.0\n', stderr: '' });

		const service = new OfficeService();

		const available = await service.isAvailable();
		expect(available).toBe(true);

		execState.queue.push({ error: null, stdout: 'conversion ok', stderr: '' });

		const pdfName = await service.convertToPdf('sessionA', 'first.docx');

		expect(pdfName).toBe('first.pdf');
		expect(execState.commands.filter((cmd) => cmd.includes('--version'))).toHaveLength(1);
		expect(execState.commands.filter((cmd) => cmd.includes('--convert-to'))).toHaveLength(1);
	});
});
