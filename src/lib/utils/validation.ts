import type { FileType } from '$lib/types/models';

/**
 * Validate file type based on MIME type
 */
export function validateFileType(mimeType: string): FileType | null {
	// Image types
	if (mimeType.startsWith('image/')) {
		return 'image';
	}

	// PDF types
	if (mimeType === 'application/pdf') {
		return 'pdf';
	}

	// Office document types
	const officeTypes = [
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
		'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
		'application/msword', // .doc
		'application/vnd.ms-excel', // .xls
		'application/vnd.ms-powerpoint' // .ppt
	];

	if (officeTypes.includes(mimeType)) {
		return 'office';
	}

	return null;
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSize: number): boolean {
	return size > 0 && size <= maxSize;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}
