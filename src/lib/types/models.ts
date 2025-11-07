/**
 * Core Data Models
 * Based on data-model.md specification
 */

// File Types
export type FileType = 'image' | 'pdf' | 'office';
export type Category = 'uploads' | 'converted' | 'results';

// Task Types
export type TaskType = 'convert' | 'ocr' | 'translate' | 'qa' | 'review' | 'extract' | 'writeback';
export type TaskStatus = 'pending' | 'running' | 'succeeded' | 'failed';

// Session Model
export interface Session {
	id: string;
	createdAt: Date;
	expiresAt: Date;
	language: 'zh-CN' | 'en-US';
	files: FileRef[];
	metadata?: Record<string, unknown>;
}

export interface FileRef {
	fileId: string;
	category: Category;
}

// File Model
export interface File {
	id: string;
	sessionId: string;
	name: string;
	type: FileType;
	mimeType: string;
	size: number;
	path: string;
	category: Category;
	createdAt: Date;
	metadata?: ImageMetadata | PDFMetadata | OfficeMetadata;
}

// Image Metadata
export interface ImageMetadata {
	width: number;
	height: number;
	format: 'png' | 'jpg' | 'webp';
}

// PDF Metadata
export interface PDFMetadata {
	pages: number;
	title?: string;
	author?: string;
}

// Office Metadata
export interface OfficeMetadata {
	format: 'docx' | 'xlsx' | 'pptx';
	convertedPdfId?: string;
}

// Task Model
export interface Task {
	id: string;
	sessionId: string;
	type: TaskType;
	status: TaskStatus;
	progress: number; // 0-100
	stage?: string; // Current stage description
	createdAt: Date;
	startedAt?: Date;
	completedAt?: Date;
	eta?: Date; // Estimated time of arrival
	result?: TaskResult;
	error?: TaskError;
}

export interface TaskResult {
	fileId?: string;
	data?: unknown;
}

export interface TaskError {
	code: string;
	message: string;
	stack?: string;
}
