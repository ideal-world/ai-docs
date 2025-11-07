/**
 * Server-side file registry
 * Stores file metadata for uploaded files
 * In production, this should be replaced with a database
 */

import type { File as FileModel } from '$lib/types/models';

class FileRegistry {
	private files: Map<string, FileModel & { sessionId: string }> = new Map();

	/**
	 * Register a file
	 */
	register(sessionId: string, file: FileModel): void {
		this.files.set(file.id, { ...file, sessionId });
	}

	/**
	 * Get a file by ID
	 */
	get(fileId: string): (FileModel & { sessionId: string }) | undefined {
		return this.files.get(fileId);
	}

	/**
	 * List files for a session (omits sessionId from returned FileModel)
	 */
	listBySession(sessionId: string): FileModel[] {
		return (
			Array.from(this.files.values())
				.filter((file) => file.sessionId === sessionId)
				// Destructure to omit sessionId from the returned object
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				.map(({ sessionId: _, ...file }) => file as FileModel)
		);
	}

	/**
	 * Delete a file
	 */
	delete(fileId: string): boolean {
		return this.files.delete(fileId);
	}

	/**
	 * Cleanup files for expired sessions by deleting all file records
	 */
	cleanupSession(sessionId: string): void {
		const toDelete = Array.from(this.files.entries())
			// Filter entries where file belongs to the session (ignore key)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			.filter(([_fileId, file]) => file.sessionId === sessionId)
			.map(([id]) => id);

		toDelete.forEach((id) => this.files.delete(id));
	}

	/**
	 * Get total file count (for debugging)
	 */
	size(): number {
		return this.files.size;
	}
}

export const fileRegistry = new FileRegistry();
