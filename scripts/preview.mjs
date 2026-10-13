import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { root, read, locales, pages, source, route } from './site.mjs';

const routes = new Map([...locales, 'en-US'].flatMap(locale => pages.map(page => [route(locale, page), source(locale, page)])));
// The English canonical paths must serve the root documents, not the legacy aliases.
for (const page of pages) routes.set(route('en', page), page);
const redirects = new Map(read('_redirects').split('\n').filter(line => line && !line.startsWith('#')).map(line => line.split(/\s+/).slice(0, 2)));
const types = { '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const port = Number(process.env.PORT || 4173);
http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (redirects.has(pathname)) { response.writeHead(301, { Location: redirects.get(pathname) }); response.end(); return; }
  const file = path.resolve(root, routes.get(pathname) || '.' + pathname);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404); response.end('Not found'); return; }
  response.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'application/octet-stream') + (['.html', '.css', '.txt', '.xml'].includes(path.extname(file)) ? '; charset=utf-8' : '') });
  fs.createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`));
