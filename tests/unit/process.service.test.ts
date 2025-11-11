import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category, File } from '$lib/types/models';
import { processService } from '../../src/lib/services/process.service';

type MarkItDownConvertParams = [
	sessionId: string,
	sourceCategory: Category,
	sourceFilename: string,
	traceId?: string,
	options?: { outputFilename?: string }
];

type MarkItDownConvertReturn = Promise<{ filename: string; outputPath: string }>;

const markitdownConvertMock = vi.hoisted(() =>
	vi.fn<(...args: MarkItDownConvertParams) => MarkItDownConvertReturn>()
);

const storageServiceMock = vi.hoisted(() => ({
	getFilePath: vi.fn((sessionId: string, category: string, filename: string) =>
		`/data/${sessionId}/${category}/${filename}`
	),
	getFileSize: vi.fn(async () => 2048),
	saveFile: vi.fn()
}));

const fileRegistryMock = vi.hoisted(() => ({
	register: vi.fn(),
	update: vi.fn(),
	get: vi.fn(),
	delete: vi.fn()
}));

const taskRegistryMock = vi.hoisted(() => ({
	register: vi.fn(),
	update: vi.fn(),
	isCancelled: vi.fn(() => false),
	cancel: vi.fn(),
	get: vi.fn(),
	delete: vi.fn()
}));

const loggerMock = vi.hoisted(() => ({
	logEvent: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
	info: vi.fn()
}));

const generateTraceIdMock = vi.hoisted(() => vi.fn(() => 'markdown-id'));

vi.mock('$lib/services/markitdown.service', () => ({
	markitdownService: {
		convertToMarkdown: markitdownConvertMock
	}
}));

vi.mock('$lib/services/storage.service', () => ({
	storageService: storageServiceMock
}));

vi.mock('$lib/server/file-registry', () => ({
	fileRegistry: fileRegistryMock
}));

vi.mock('$lib/server/task-registry', () => ({
	taskRegistry: taskRegistryMock
}));

vi.mock('$lib/services/logger.service', () => ({
	logger: loggerMock
}));

vi.mock('$lib/utils/trace', () => ({
	generateTraceId: generateTraceIdMock
}));

describe('ProcessService office markdown generation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		markitdownConvertMock.mockReset();
		storageServiceMock.getFilePath.mockClear();
		storageServiceMock.getFileSize.mockClear();
		fileRegistryMock.register.mockClear();
		loggerMock.warn.mockClear();
		loggerMock.error.mockClear();
		generateTraceIdMock.mockClear();
		generateTraceIdMock.mockImplementation(() => 'markdown-id');
		taskRegistryMock.isCancelled.mockReturnValue(false);
	});

	const callGenerate = async () => {
		const docFile: File = {
			id: 'doc-file-id',
			sessionId: 'session-123',
			name: 'example.docx',
			type: 'office',
			mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			size: 1024,
			path: '/data/session-123/uploads/doc-file-id_example.docx',
			category: 'uploads',
			createdAt: new Date()
		};

		const pdfFile: File = {
			id: 'pdf-file-id',
			sessionId: 'session-123',
			name: 'example.pdf',
			type: 'pdf',
			mimeType: 'application/pdf',
			size: 2048,
			path: '/data/session-123/converted/pdf-file-id_example.pdf',
			category: 'converted',
			createdAt: new Date()
		};

		const service = processService as unknown as {
			generateMarkdownFromOffice: (
				taskId: string,
				sourceFile: File,
				pdfFile: File,
				traceId?: string
			) => Promise<File>;
		};

		return service.generateMarkdownFromOffice('task-xyz', docFile, pdfFile, 'trace-abc');
	};

	it('prefers original Office upload when converting to markdown', async () => {
		markitdownConvertMock.mockResolvedValue({ filename: 'output.md', outputPath: '/tmp/output.md' });

		const markdownFile = await callGenerate();

		expect(markitdownConvertMock).toHaveBeenCalledTimes(1);
		expect(markitdownConvertMock).toHaveBeenCalledWith(
			'session-123',
			'uploads',
			'doc-file-id_example.docx',
			'trace-abc',
			{ outputFilename: expect.stringMatching(/\.md$/) }
		);
		expect(markdownFile.id).toBe('markdown-id');
		expect(markdownFile.name).toBe('example.md');
		expect(markdownFile.category).toBe('results');
		expect(fileRegistryMock.register).toHaveBeenCalledWith('session-123', markdownFile);
	});

	it('falls back to converted PDF when direct Office conversion fails', async () => {
		markitdownConvertMock
			.mockRejectedValueOnce(new Error('docx conversion failed'))
			.mockResolvedValueOnce({ filename: 'fallback.md', outputPath: '/tmp/fallback.md' });

		const markdownFile = await callGenerate();

		expect(markitdownConvertMock).toHaveBeenCalledTimes(2);
		expect(markitdownConvertMock).toHaveBeenNthCalledWith(
			1,
			'session-123',
			'uploads',
			'doc-file-id_example.docx',
			'trace-abc',
			{ outputFilename: expect.any(String) }
		);
		expect(markitdownConvertMock).toHaveBeenNthCalledWith(
			2,
			'session-123',
			'converted',
			'pdf-file-id_example.pdf',
			'trace-abc',
			{ outputFilename: expect.any(String) }
		);
		expect(loggerMock.warn).toHaveBeenCalledWith(
			'Direct Office to Markdown conversion failed, falling back to PDF',
			'pipeline.office.markitdown_fallback',
			expect.objectContaining({ fileId: 'doc-file-id', convertedPdfId: 'pdf-file-id' }),
			'trace-abc'
		);
		expect(markdownFile.name).toBe('example.md');
		expect(fileRegistryMock.register).toHaveBeenCalledWith('session-123', markdownFile);
	});
});
