import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Dev-only file bridge, so the running app (and an agent driving it) can keep designs and
// screenshots on disk:
//   GET  /__fs/designs/<name>.json        read a saved design (404 if missing)
//   PUT  /__fs/designs/<name>.json        write a design
//   GET  /__fs/designs/                   list saved designs
//   POST /__fs/captures/<name>.png        write a screenshot (body = PNG bytes)
//   PUT  /__fs/thumbs/<group>/<name>.jpg  write a picker thumbnail into public/thumbs (served at /thumbs)
//   PUT  /__fs/scanthumbs/<id>.jpg        write a scanned fabric's picker tile into ../assets/textures/vmod/thumbs/cloth
//                                         (licensed content stays with the scans; served at /textures/vmod/thumbs/cloth)
//   GET  /textures/<...>                  owner's licensed textures from ../assets/textures (never bundled)
//   GET  /moodboard/<file>                the owner's moodboard photos from ../moodboard (never bundled)
//   GET  /hdri/<file>.hdr                 studio HDRIs from ../assets/hdri (Poly Haven, CC0; never bundled)
// Paths are confined to their folder; anything else is refused.
const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const DIRS = { designs: path.join(ROOT, 'designs'), captures: path.join(ROOT, 'captures'), references: path.join(ROOT, 'references'), exports: path.join(ROOT, 'exports'), thumbs: path.join(ROOT, 'public', 'thumbs'), scanthumbs: path.join(ROOT, '..', 'assets', 'textures', 'vmod', 'thumbs', 'cloth') };
const TEXTURES = path.join(ROOT, '..', 'assets', 'textures');
const MOODBOARD = path.join(ROOT, '..', 'moodboard'); // the owner's reference photos (read only, never bundled)
const HDRI = path.join(ROOT, '..', 'assets', 'hdri');

function inside(dir, rel) {
	const p = path.resolve(dir, rel);
	return p.startsWith(path.resolve(dir) + path.sep) ? p : null;
}

function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on('data', (c) => chunks.push(c));
		req.on('end', () => resolve(Buffer.concat(chunks)));
		req.on('error', reject);
	});
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ktx2': 'image/ktx2', '.json': 'application/json', '.webp': 'image/webp', '.pdf': 'application/pdf', '.hdr': 'application/octet-stream' };

function fileBridge() {
	return {
		name: 'leotard-file-bridge',
		apply: 'serve',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = decodeURIComponent((req.url || '').split('?')[0]);
				try {
					let m = url.match(/^\/__fs\/(designs|captures|references|exports|thumbs|scanthumbs)\/(.*)$/);
					if (m) {
						const dir = DIRS[m[1]];
						fs.mkdirSync(dir, { recursive: true });
						if (m[2] === '' && req.method === 'GET') {
							res.setHeader('Content-Type', 'application/json');
							res.end(JSON.stringify(fs.readdirSync(dir)));
							return;
						}
						const p = inside(dir, m[2]);
						if (!p) { res.statusCode = 400; res.end('bad path'); return; }
						if (req.method === 'GET') {
							if (!fs.existsSync(p)) { res.statusCode = 404; res.end('missing'); return; }
							res.setHeader('Content-Type', MIME[path.extname(p).toLowerCase()] || 'application/octet-stream');
							res.end(fs.readFileSync(p));
							return;
						}
						if (req.method === 'PUT' || req.method === 'POST') {
							fs.mkdirSync(path.dirname(p), { recursive: true });
							fs.writeFileSync(p, await readBody(req));
							res.end('ok');
							return;
						}
					}
					m = url.match(/^\/(textures|moodboard|hdri)\/(.*)$/);
					if (m) {
						const p = inside({ textures: TEXTURES, moodboard: MOODBOARD, hdri: HDRI }[m[1]], m[2]);
						if (!p || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; res.end('missing'); return; }
						res.setHeader('Content-Type', MIME[path.extname(p).toLowerCase()] || 'application/octet-stream');
						res.setHeader('Cache-Control', 'max-age=3600');
						res.end(fs.readFileSync(p));
						return;
					}
				} catch (e) {
					res.statusCode = 500; res.end(String(e)); return;
				}
				next();
			});
		},
	};
}

export default defineConfig({
	plugins: [fileBridge()],
	oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
	optimizeDeps: { rolldownOptions: { transform: { jsx: { runtime: 'automatic', importSource: 'preact' } } } },
	server: { port: 5174, strictPort: true },
	build: { target: 'es2022' },
	test: { environment: 'node', include: ['test/**/*.test.js'], exclude: process.env.DEBUG_TESTS ? [] : ['test/debug/**'], testTimeout: 120000 },
});
