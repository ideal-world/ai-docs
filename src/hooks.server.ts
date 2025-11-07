import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '$lib/services/logger.service';
import { cleanupService } from '$lib/services/cleanup.service';

// T107: Initialize cleanup scheduler on server startup
cleanupService.start();

// Graceful shutdown
process.on('SIGTERM', () => {
	logger.info('SIGTERM received, stopping cleanup scheduler', 'server.shutdown');
	cleanupService.stop();
	process.exit(0);
});

process.on('SIGINT', () => {
	logger.info('SIGINT received, stopping cleanup scheduler', 'server.shutdown');
	cleanupService.stop();
	process.exit(0);
});

/**
 * Request logging middleware - logs all requests with traceId, duration, and status
 * T076: Request logging middleware
 */
const handleLogging: Handle = async ({ event, resolve }) => {
	const startTime = Date.now();
	const traceId = uuidv4();

	// Attach traceId to event.locals for use in endpoints
	event.locals.traceId = traceId;

	// Log incoming request
	logger.logEvent(
		'request.received',
		'HTTP request received',
		{
			method: event.request.method,
			url: event.url.pathname,
			userAgent: event.request.headers.get('user-agent') || 'unknown'
		},
		traceId
	);

	// Parse Accept-Language header (T078)
	const acceptLanguage = event.request.headers.get('accept-language');
	let preferredLanguage = 'zh-CN'; // default

	if (acceptLanguage) {
		// Parse Accept-Language: en-US,en;q=0.9,zh-CN;q=0.8
		const languages = acceptLanguage
			.split(',')
			.map((lang) => {
				const [code, qPart] = lang.trim().split(';');
				const q = qPart ? parseFloat(qPart.split('=')[1]) : 1.0;
				return { code: code.trim().toLowerCase(), q };
			})
			.sort((a, b) => b.q - a.q);

		// Find first supported language
		for (const lang of languages) {
			if (lang.code.startsWith('en')) {
				preferredLanguage = 'en-US';
				break;
			} else if (lang.code.startsWith('zh')) {
				preferredLanguage = 'zh-CN';
				break;
			}
		}
	}

	// Attach preferred language to event.locals (T078)
	event.locals.preferredLanguage = preferredLanguage;

	let response: Response | undefined;
	let error: Error | null = null;

	try {
		response = await resolve(event);
	} catch (err) {
		error = err as Error;

		// Log error
		logger.error(
			'Request handler error',
			err as Error,
			{
				method: event.request.method,
				url: event.url.pathname
			},
			traceId
		);

		// Re-throw to let handleError handle it
		throw err;
	} finally {
		const duration = Date.now() - startTime;

		// Log request completion
		logger.logEvent(
			'request.completed',
			'HTTP request completed',
			{
				method: event.request.method,
				url: event.url.pathname,
				status: error ? 500 : (response?.status ?? 0),
				duration
			},
			traceId
		);
	}

	return response!;
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

/**
 * Security middleware: basic CORS and simple per-IP rate limiting for /api routes
 * - CORS: allow configurable origin (default '*'), handle OPTIONS preflight
 * - Rate limit: token bucket per IP (default ~60 req/min) for /api/* endpoints
 */
const RATE_LIMIT_CAPACITY = 60; // tokens
const RATE_LIMIT_REFILL_PER_SEC = 1; // tokens per second
type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();

const corsOrigin = process.env.CORS_ALLOW_ORIGIN || '*';
const corsHeaders = (traceId: string): Record<string, string> => ({
	'Access-Control-Allow-Origin': corsOrigin,
	'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
	'Access-Control-Expose-Headers': 'Content-Type, Content-Length, ETag, X-Trace-Id',
	'X-Trace-Id': traceId
});

const handleSecurity: Handle = async ({ event, resolve }) => {
	const { request, url, locals } = event;
	const traceId = locals.traceId || uuidv4();

	// Preflight for API routes
	if (request.method === 'OPTIONS' && url.pathname.startsWith('/api')) {
		return new Response(null, { status: 204, headers: corsHeaders(traceId) });
	}

	// Simple token-bucket rate limiting for API routes (skip for local dev if needed)
	if (url.pathname.startsWith('/api')) {
		// Try common proxy headers, fallback to SvelteKit's getClientAddress where available
		const ip =
			request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
			request.headers.get('x-real-ip') ||
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			((event as any).getClientAddress?.() ?? 'unknown');

		const now = Date.now();
		const bucket = buckets.get(ip!) || { tokens: RATE_LIMIT_CAPACITY, last: now };
		// Refill tokens
		const elapsed = (now - bucket.last) / 1000;
		bucket.tokens = Math.min(
			RATE_LIMIT_CAPACITY,
			bucket.tokens + elapsed * RATE_LIMIT_REFILL_PER_SEC
		);
		bucket.last = now;

		if (bucket.tokens < 1) {
			const retryAfter = Math.ceil((1 - bucket.tokens) / RATE_LIMIT_REFILL_PER_SEC);
			buckets.set(ip!, bucket);
			return new Response(
				JSON.stringify({
					success: false,
					code: 'RATE_LIMITED',
					message: 'Too many requests. Please try again later.',
					timestamp: new Date().toISOString(),
					traceId
				}),
				{
					status: 429,
					headers: { ...corsHeaders(traceId), 'Retry-After': String(retryAfter) }
				}
			);
		}

		bucket.tokens -= 1;
		buckets.set(ip!, bucket);
	}

	// Proceed to next handlers
	const response = await resolve(event);

	// Append CORS and tracing headers to all responses for API routes
	if (event.url.pathname.startsWith('/api')) {
		const headers = corsHeaders(event.locals.traceId || traceId);
		Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
	} else {
		// Still expose trace id for non-API responses
		response.headers.set('X-Trace-Id', event.locals.traceId || traceId);
	}

	return response;
};

// Sequence middleware: logging -> security -> paraglide
export const handle: Handle = sequence(handleLogging, handleSecurity, handleParaglide);

/**
 * Global error handler - catches all uncaught exceptions
 * T077: Error boundary for uncaught exceptions
 */
export const handleError: HandleServerError = ({ error, event }) => {
	const traceId = event.locals.traceId || 'unknown';

	// Log uncaught error with full stack trace
	logger.error(
		'Uncaught exception in request handler',
		error as Error,
		{
			method: event.request.method,
			url: event.url.pathname,
			userAgent: event.request.headers.get('user-agent') || 'unknown'
		},
		traceId
	);

	// Return user-friendly error message
	// SvelteKit will format this into proper error page
	return {
		message: 'An unexpected error occurred. Please try again later.',
		code: 'INTERNAL_SERVER_ERROR',
		traceId
	};
};
