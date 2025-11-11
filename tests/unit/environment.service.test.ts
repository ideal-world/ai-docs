import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DependencyStatus, EnvironmentStatus } from '$lib/services/environment.service';

const loggerMock = {
	logEvent: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
	info: vi.fn()
};

vi.mock('$lib/services/logger.service', () => ({
	logger: loggerMock
}));

const scriptsRoot = '/tmp/scripts';

describe('EnvironmentService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns ready status when dependencies are available', async () => {
		const officeAvailable = vi
			.fn<(traceId?: string, forceRefresh?: boolean) => Promise<boolean>>()
			.mockResolvedValue(true);
		const markAvailable = vi
			.fn<(traceId?: string) => Promise<boolean>>()
			.mockResolvedValue(true);
		const execMock = vi.fn();
		const accessMock = vi.fn().mockResolvedValue(undefined);

		const { EnvironmentService } = await import('$lib/services/environment.service');
		const service = new EnvironmentService({
			office: { isAvailable: officeAvailable },
			markitdown: { isAvailable: markAvailable },
			execFile: execMock,
			access: accessMock,
			scriptsDir: scriptsRoot
		});

		const status = await service.ensureEnvironment('trace-ready', { force: true });

		expect(status.ready).toBe(true);
		expect(status.dependencies.libreoffice.available).toBe(true);
		expect(status.dependencies.markitdown.available).toBe(true);
		expect(execMock).not.toHaveBeenCalled();
		expect(loggerMock.warn).not.toHaveBeenCalled();
	});

	it('installs LibreOffice when missing and verifies availability afterwards', async () => {
		const officeAvailable = vi
			.fn<(traceId?: string, forceRefresh?: boolean) => Promise<boolean>>()
			.mockResolvedValue(true);
		officeAvailable.mockResolvedValueOnce(false);
		const markAvailable = vi
			.fn<(traceId?: string) => Promise<boolean>>()
			.mockResolvedValue(true);
		const execMock = vi.fn().mockResolvedValue({ stdout: 'install ok', stderr: '' });
		const accessMock = vi.fn().mockResolvedValue(undefined);

		const { EnvironmentService } = await import('$lib/services/environment.service');
		const service = new EnvironmentService({
			office: { isAvailable: officeAvailable },
			markitdown: { isAvailable: markAvailable },
			execFile: execMock,
			access: accessMock,
			scriptsDir: scriptsRoot
		});

		const status = await service.ensureEnvironment('trace-libre', { force: true });

		expect(status.ready).toBe(true);

		const libreStatus: DependencyStatus = status.dependencies.libreoffice;
		expect(libreStatus.installAttempted).toBe(true);
		expect(libreStatus.available).toBe(true);

		expect(execMock).toHaveBeenCalledTimes(1);
		const [command, args] = execMock.mock.calls[0];
		expect(command).toBe('bash');
		expect(args[0]).toContain('install_libreoffice.sh');
	});

	it('reports degraded status when MarkItDown installation fails', async () => {
		const officeAvailable = vi
			.fn<(traceId?: string, forceRefresh?: boolean) => Promise<boolean>>()
			.mockResolvedValue(true);
		const markAvailable = vi
			.fn<(traceId?: string) => Promise<boolean>>()
			.mockResolvedValue(false);
		const execMock = vi.fn().mockRejectedValue(new Error('install failed'));
		const accessMock = vi.fn().mockResolvedValue(undefined);

		const { EnvironmentService } = await import('$lib/services/environment.service');
		const service = new EnvironmentService({
			office: { isAvailable: officeAvailable },
			markitdown: { isAvailable: markAvailable },
			execFile: execMock,
			access: accessMock,
			scriptsDir: scriptsRoot
		});

		const status: EnvironmentStatus = await service.ensureEnvironment('trace-mark', { force: true });

		expect(status.ready).toBe(false);
		expect(status.dependencies.markitdown.installAttempted).toBe(true);
		expect(status.dependencies.markitdown.available).toBe(false);
		expect(status.dependencies.markitdown.message).toBe('INSTALLATION_FAILED');

		expect(loggerMock.error).toHaveBeenCalled();
	});
});
