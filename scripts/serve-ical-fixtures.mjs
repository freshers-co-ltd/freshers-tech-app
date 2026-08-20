import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.ICAL_FIXTURES_PORT ?? 8899);
const ROOT = normalize(fileURLToPath(new URL('../tests/fixtures/ical/', import.meta.url))).replace(
	/[\\/]$/,
	'',
);

const CONTENT_TYPES = {
	'.ics': 'text/calendar; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
};

const resolvePath = (pathname) => {
	const filePath = normalize(join(ROOT, pathname));
	if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) {
		return null;
	}
	return filePath;
};

const server = createServer(async (req, res) => {
	try {
		const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
		const pathname = decodeURIComponent(url.pathname);
		const filePath = resolvePath(pathname);
		if (!filePath) {
			res.writeHead(403).end('Forbidden');
			return;
		}
		const body = await readFile(filePath);
		res.writeHead(200, {
			'Content-Type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
			'Cache-Control': 'no-store',
		});
		res.end(body);
	} catch {
		res.writeHead(404).end('Not found');
	}
});

server.listen(PORT, '0.0.0.0', () => {
	const fixtures = [
		['airbnb', 'airbnb/calendar.ics'],
		['booking.com', 'booking.com/calendar.ics'],
		['vrbo', 'vrbo/calendar.ics'],
		['generic', 'generic/calendar.ics'],
		['personal (rejected)', 'personal/calendar.ics'],
		['invalid (rejected)', 'invalid/calendar.ics'],
	];
	console.log(`iCal fixtures serving on port ${PORT}`);
	console.log('');
	for (const [label, path] of fixtures) {
		console.log(`  ${label.padEnd(24)} http://host.docker.internal:${PORT}/${path}`);
	}
	console.log('');
	console.log('Paste the host.docker.internal URL into the app; the edge function container can reach it.');
	console.log('Press Ctrl+C to stop.');
});