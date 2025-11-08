import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET /api/files/sessionId/category/filename
export const GET: RequestHandler = async ({ params }) => {
	const pathParts = params.path.split('/');
	
	if (pathParts.length < 3) {
		throw error(400, 'Invalid file path');
	}

	const [sessionId, category, ...filenameParts] = pathParts;
	const filename = filenameParts.join('/'); // Handle filenames with slashes
	
	try {
		// Construct file path
		const filePath = join(process.cwd(), 'data', sessionId, category, filename);
		
		// Security: Ensure the path is within the data directory
		if (!filePath.startsWith(join(process.cwd(), 'data'))) {
			throw error(403, 'Access denied');
		}
		
		// Check if file exists
		if (!existsSync(filePath)) {
			throw error(404, `File not found: ${filename}`);
		}
		
		// Read file
		const fileBuffer = await readFile(filePath);
		
		// Determine content type from filename
		let contentType = 'application/octet-stream';
		if (filename.endsWith('.pdf')) {
			contentType = 'application/pdf';
		} else if (filename.endsWith('.png')) {
			contentType = 'image/png';
		} else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
			contentType = 'image/jpeg';
		} else if (filename.endsWith('.doc') || filename.endsWith('.docx')) {
			contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
		} else if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) {
			contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
		}
		
		return new Response(fileBuffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
				'Cache-Control': 'private, max-age=3600'
			}
		});
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
		console.error('File serve error:', err);
		throw error(500, 'Failed to serve file');
	}
};
