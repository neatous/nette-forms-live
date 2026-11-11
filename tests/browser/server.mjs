// Minimal static server for the browser tests: serves the repository root.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../..', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const port = Number(process.env.PORT || 4173);

createServer(async (request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname)).replace(/^(\.\.[/\\])+/, '');

    try {
        const body = await readFile(join(root, path));

        response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
        response.end(body);
    } catch {
        response.writeHead(404);
        response.end('Not found');
    }
}).listen(port, '127.0.0.1');
