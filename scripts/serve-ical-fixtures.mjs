import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { networkInterfaces } from 'node:os';
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

function detectHostIp() {
	const interfaces = networkInterfaces();
	for (const name of Object.keys(interfaces)) {
		for (const iface of interfaces[name] ?? []) {
			if (
				iface.family === 'IPv4' &&
				!iface.internal &&
				/^172\.\d+\.\d+\.\d+$|192\.168\.\d+\.\d+$|10\.\d+\.\d+\.\d+$/.test(iface.address)
			) {
				return iface.address;
			}
		}
	}
	return '127.0.0.1';
}

server.listen(PORT, '0.0.0.0', () => {
	const hostIp = detectHostIp();
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
		console.log(`  ${label.padEnd(24)} http://${hostIp}:${PORT}/${path}`);
	}
	console.log('');
	console.log(`Use the URL above in the app. The edge function container can reach ${hostIp}:${PORT}.`);
	console.log('Press Ctrl+C to stop.');
});