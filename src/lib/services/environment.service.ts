import { execFile } from 'node:child_process';
import type { ExecFileOptions } from 'node:child_process';
import { promisify } from 'node:util';
import { access as fsAccess } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { logger } from './logger.service';
import { officeService } from './office.service';
import { markitdownService } from './markitdown.service';
import { systemConfig } from '$lib/utils/config';

const execFileAsync = promisify(execFile);

export type DependencyName = 'libreoffice' | 'markitdown';

export interface DependencyStatus {
	name: DependencyName;
	available: boolean;
	lastCheckedAt: number;
	installAttempted: boolean;
	message?: string;
	suggestion?: string;
}

export interface EnvironmentStatus {
	ready: boolean;
	lastCheckedAt: number;
	dependencies: Record<DependencyName, DependencyStatus>;
}

export class EnvironmentSetupError extends Error {
	status: EnvironmentStatus;

	constructor(status: EnvironmentStatus) {
		super('ENVIRONMENT_SETUP_FAILED');
		this.name = 'EnvironmentSetupError';
		this.status = status;
	}
}

type OfficeDependency = {
	isAvailable: (traceId?: string, forceRefresh?: boolean) => Promise<boolean>;
};

type MarkitdownDependency = {
	isAvailable: (traceId?: string) => Promise<boolean>;
};

type ExecOutput = { stdout: string | Buffer; stderr: string | Buffer };

type ExecRunner = (
	command: string,
	args: string[],
	options: ExecFileOptions
) => Promise<ExecOutput>;

type AccessFn = (targetPath: string, mode?: number) => Promise<void>;

type InstallResult =
	| { success: true }
	| { success: false; reason: 'script-missing' | 'exec-error'; error?: Error };

interface EnvironmentServiceDependencies {
	office?: OfficeDependency;
	markitdown?: MarkitdownDependency;
	execFile?: ExecRunner;
	access?: AccessFn;
	scriptsDir?: string;
	installTimeoutMs?: number;
}

const normalizeOutput = (value: string | Buffer | undefined): string => {
	if (value === undefined) {
		return '';
	}

	return typeof value === 'string' ? value : value.toString('utf-8');
};

const DEFAULT_STATUS: EnvironmentStatus = {
	ready: false,
	lastCheckedAt: 0,
	dependencies: {
		libreoffice: {
			name: 'libreoffice',
			available: false,
			lastCheckedAt: 0,
			installAttempted: false
		},
		markitdown: {
			name: 'markitdown',
			available: false,
			lastCheckedAt: 0,
			installAttempted: false
		}
	}
};

export class EnvironmentService {
	private status: EnvironmentStatus = { ...DEFAULT_STATUS };
	private runningCheck: Promise<EnvironmentStatus> | null = null;
	private readonly office: OfficeDependency;
	private readonly markitdown: MarkitdownDependency;
	private readonly execRunner: ExecRunner;
	private readonly access: AccessFn;
	private readonly scriptsDir: string;
	private readonly installTimeoutMs: number;

	constructor(deps: EnvironmentServiceDependencies = {}) {
		this.office = deps.office ?? officeService;
		this.markitdown = deps.markitdown ?? markitdownService;
		this.execRunner =
			deps.execFile ??
			((command: string, args: string[], options: ExecFileOptions) => execFileAsync(command, args, options));
		this.access = deps.access ?? ((targetPath: string, mode?: number) => fsAccess(targetPath, mode));
		this.scriptsDir = deps.scriptsDir ?? path.join(process.cwd(), 'scripts');
		this.installTimeoutMs = deps.installTimeoutMs ?? 10 * 60 * 1000; // 10 minutes
	}

	async ensureEnvironment(
		traceId?: string,
		options?: { force?: boolean; abortOnFailure?: boolean }
	): Promise<EnvironmentStatus> {
		const force = options?.force ?? false;
		const abortOnFailure = options?.abortOnFailure ?? false;

		if (!force && this.status.ready && this.status.lastCheckedAt !== 0) {
			return this.status;
		}

		if (this.runningCheck && !force) {
			return this.runningCheck;
		}

		const nextCheck = this.performCheck(traceId, force, abortOnFailure);
		this.runningCheck = nextCheck;

		try {
			const result = await nextCheck;
			return result;
		} finally {
			if (this.runningCheck === nextCheck) {
				this.runningCheck = null;
			}
		}
	}

	getStatus(): EnvironmentStatus {
		return this.status;
	}

	private async performCheck(
		traceId?: string,
		force = false,
		abortOnFailure = false
	): Promise<EnvironmentStatus> {
		logger.logEvent(
			'environment.check.start',
			'Runtime dependency check started',
			{ force },
			traceId
		);

		const libreStatus = await this.verifyLibreOffice(traceId);
		const markStatus = await this.verifyMarkItDown(traceId);

		const ready = libreStatus.available && markStatus.available;
		const result: EnvironmentStatus = {
			ready,
			lastCheckedAt: Date.now(),
			dependencies: {
				libreoffice: libreStatus,
				markitdown: markStatus
			}
		};

		this.status = result;

		if (ready) {
			logger.logEvent(
				'environment.check.ready',
				'Runtime dependencies satisfied',
				{
					libreOffice: {
						available: libreStatus.available,
						installAttempted: libreStatus.installAttempted
					},
					markitdown: {
						available: markStatus.available,
						installAttempted: markStatus.installAttempted
					}
				},
				traceId
			);
		} else {
			logger.warn(
				'Runtime dependencies missing after startup check',
				'environment.check.degraded',
				{
					libreOffice: libreStatus,
					markitdown: markStatus
				},
				traceId
			);

			if (abortOnFailure) {
				throw new EnvironmentSetupError(result);
			}
		}

		return result;
	}

	private async verifyLibreOffice(traceId?: string): Promise<DependencyStatus> {
		const status: DependencyStatus = {
			name: 'libreoffice',
			available: false,
			lastCheckedAt: Date.now(),
			installAttempted: false
		};

		const available = await this.office.isAvailable(traceId, true);

		if (available) {
			status.available = true;
			return status;
		}

		const scriptName = 'install_libreoffice.sh';
		const relativeScript = `scripts/${scriptName}`;
		const manualCommand = `bash ${relativeScript}`;
		status.suggestion = `请手动执行 ${manualCommand} 并确保 libreoffice --version 输出正常。`;

		logger.warn(
			'LibreOffice binary not available',
			'environment.libreoffice.missing',
			{
				path: systemConfig.libreOffice?.path ?? 'libreoffice'
			},
			traceId
		);

		status.installAttempted = true;
		const installResult = await this.runInstallScript(scriptName, traceId);

		if (!installResult.success) {
			status.message =
				installResult.reason === 'script-missing'
					? 'INSTALL_SCRIPT_NOT_FOUND'
					: 'INSTALLATION_FAILED';
			status.suggestion =
				installResult.reason === 'script-missing'
					? `请确认 ${relativeScript} 存在并具有执行权限，然后手动执行 ${manualCommand}。`
					: `请确认具有 sudo 权限，并手动执行 ${manualCommand}。`;
			status.available = await this.office.isAvailable(traceId, true);
			return status;
		}

		status.available = await this.office.isAvailable(traceId, true);
		status.lastCheckedAt = Date.now();

		if (status.available) {
			status.suggestion = undefined;
			logger.logEvent(
				'environment.libreoffice.installed',
				'LibreOffice installed through automation script',
				{
					path: systemConfig.libreOffice?.path ?? 'libreoffice'
				},
				traceId
			);
		} else {
			status.message = 'POST_INSTALL_VALIDATION_FAILED';
			status.suggestion = `请手动执行 ${manualCommand}，并确认 libreoffice --version 输出正常。`;
			logger.error(
				'LibreOffice remains unavailable after installation attempt',
				new Error('LibreOffice not detected after installation'),
				{
					path: systemConfig.libreOffice?.path ?? 'libreoffice'
				},
				traceId
			);
		}

		return status;
	}

	private async verifyMarkItDown(traceId?: string): Promise<DependencyStatus> {
		const status: DependencyStatus = {
			name: 'markitdown',
			available: false,
			lastCheckedAt: Date.now(),
			installAttempted: false
		};

		const available = await this.markitdown.isAvailable(traceId);

		if (available) {
			status.available = true;
			return status;
		}

		const scriptName = 'install_markitdown.sh';
		const relativeScript = `scripts/${scriptName}`;
		const manualCommand = `bash ${relativeScript}`;
		status.suggestion = `请手动执行 ${manualCommand}，并确保 markitdown --help 可以正常运行。`;

		logger.warn(
			'MarkItDown CLI not available',
			'environment.markitdown.missing',
			{
				path: systemConfig.markitdown?.path ?? 'markitdown'
			},
			traceId
		);

		status.installAttempted = true;
		const installResult = await this.runInstallScript(scriptName, traceId);

		if (!installResult.success) {
			status.message =
				installResult.reason === 'script-missing'
					? 'INSTALL_SCRIPT_NOT_FOUND'
					: 'INSTALLATION_FAILED';
			status.suggestion =
				installResult.reason === 'script-missing'
					? `请确认 ${relativeScript} 存在并具有执行权限，然后手动执行 ${manualCommand}。`
					: `请确认具有执行权限，并手动执行 ${manualCommand}。`;
			status.available = await this.markitdown.isAvailable(traceId);
			return status;
		}

		status.available = await this.markitdown.isAvailable(traceId);
		status.lastCheckedAt = Date.now();

		if (status.available) {
			status.suggestion = undefined;
			logger.logEvent(
				'environment.markitdown.installed',
				'MarkItDown CLI installed through automation script',
				{
					path: systemConfig.markitdown?.path ?? 'markitdown'
				},
				traceId
			);
		} else {
			status.message = 'POST_INSTALL_VALIDATION_FAILED';
			status.suggestion = `请手动执行 ${manualCommand}，并确认 ${systemConfig.markitdown?.path ?? 'markitdown'} 已加入 PATH 或配置 config/system.yaml 中的 markitdown.path。`;
			logger.error(
				'MarkItDown remains unavailable after installation attempt',
				new Error('MarkItDown not detected after installation'),
				{
					path: systemConfig.markitdown?.path ?? 'markitdown'
				},
				traceId
			);
		}

		return status;
	}

	private async runInstallScript(
		scriptName: string,
		traceId?: string,
		envOverrides?: NodeJS.ProcessEnv
	): Promise<InstallResult> {
		const scriptPath = path.join(this.scriptsDir, scriptName);

		try {
			await this.access(scriptPath, fsConstants.F_OK);
		} catch (error) {
			logger.error(
				`Installation script not found: ${scriptName}`,
				error as Error,
				{ scriptPath },
				traceId
			);
			return { success: false, reason: 'script-missing', error: error as Error };
		}

		try {
			logger.logEvent(
				'environment.install.start',
				'Running dependency installation script',
				{ script: scriptName },
				traceId
			);

			const { stdout, stderr } = await this.execRunner('bash', [scriptPath], {
				cwd: this.scriptsDir,
				timeout: this.installTimeoutMs,
				env: {
					...process.env,
					...envOverrides
				}
			});

			const stdoutText = normalizeOutput(stdout);
			const trimmedStdout = stdoutText.trim();
			if (trimmedStdout) {
				const limited = trimmedStdout.split('\n').slice(-10).join('\n');
				logger.logEvent(
					'environment.install.stdout',
					'Installation script output',
					{
						script: scriptName,
						output: limited
					},
					traceId
				);
			}

			const stderrText = normalizeOutput(stderr);
			const trimmedStderr = stderrText.trim();
			if (trimmedStderr) {
				const limited = trimmedStderr.split('\n').slice(-10).join('\n');
				logger.warn(
					'Installation script reported warnings',
					'environment.install.stderr',
					{
						script: scriptName,
						output: limited
					},
					traceId
				);
			}

			logger.logEvent(
				'environment.install.complete',
				'Installation script completed successfully',
				{ script: scriptName },
				traceId
			);

			return { success: true };
		} catch (error) {
			logger.error(
				`Installation script failed: ${scriptName}`,
				error as Error,
				{ script: scriptName },
				traceId
			);
			return { success: false, reason: 'exec-error', error: error as Error };
		}
	}
}

export const environmentService = new EnvironmentService();
