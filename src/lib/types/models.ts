// File Types
export type FileType = 'image' | 'pdf' | 'office';

// Task Types
export type TaskType = 'office_to_pdf' | 'ocr' | 'extract' | 'translate' | 'qa' | 'review';
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Session Model
export interface Session {
	id: string;
	language: string;
	createdAt: string;
	expiresAt: string;
}

// File Model
export interface File {
	id: string;
	sessionId: string;
	originalName: string;
	storagePath: string;
	fileType: FileType;
	mimeType: string;
	size: number;
	uploadedAt: string;
	metadata?: ImageMetadata | PDFMetadata | OfficeMetadata;
}

// Image Metadata
export interface ImageMetadata {
	width: number;
	height: number;
	format: string;
}

// PDF Metadata
export interface PDFMetadata {
	pageCount: number;
	title?: string;
	author?: string;
}

// Office Metadata
export interface OfficeMetadata {
	pageCount?: number;
	wordCount?: number;
	application?: string;
	convertedPdfId?: string;
}

// Task Model
export interface Task {
	id: string;
	sessionId: string;
	type: TaskType;
	status: TaskStatus;
	inputFileId: string;
	outputFileId?: string;
	progress: number;
	errorMessage?: string;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
}
