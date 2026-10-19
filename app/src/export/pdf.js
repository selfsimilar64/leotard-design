// Printable full-scale pattern: the pieces (garment/pattern.js) laid out and tiled onto A4 pages
// to print at 100% and tape together. Cut line solid, stitch line dashed, grain arrow, piece name
// and cutting note on every piece; a 50 mm check square and the settings on the first page.
import { jsPDF } from 'jspdf';
import { layoutPieces } from '../garment/pattern.js';

const PAGE = { w: 210, h: 297, margin: 10 };

export function patternPDF({ pieces, settings }, meta = {}) {
	const { placed, size } = layoutPieces(pieces);
	const cw = PAGE.w - 2 * PAGE.margin, ch = PAGE.h - 2 * PAGE.margin;
	// sheet origin: leave room for the title block on the first tile
	const ox = 0, oy = 60;
	const cols = Math.max(1, Math.ceil((size[0] + ox) / cw)), rows = Math.max(1, Math.ceil((size[1] + oy) / ch));
	const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
	for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
		if (r || c) doc.addPage('a4', 'portrait');
		const tx = c * cw, ty = r * ch; // this tile's window on the sheet
		const X = (x) => PAGE.margin + x - tx, Y = (y) => PAGE.margin + y - ty;
		// tile frame and label (tape the tiles edge to edge along the frame)
		doc.setDrawColor(170); doc.setLineWidth(0.15); doc.setLineDashPattern([1, 1.5], 0);
		doc.rect(PAGE.margin, PAGE.margin, cw, ch);
		doc.setLineDashPattern([], 0);
		doc.setFontSize(8); doc.setTextColor(120);
		doc.text(`${String.fromCharCode(65 + r)}${c + 1}  (row ${r + 1} of ${rows}, column ${c + 1} of ${cols})`, PAGE.margin, PAGE.h - 4);
		if (r === 0 && c === 0) {
			doc.setTextColor(20); doc.setFontSize(14);
			doc.text(meta.name ? `Pattern: ${meta.name}` : 'Pattern', PAGE.margin + 2, PAGE.margin + 8);
			doc.setFontSize(8.5);
			doc.text([
				'Print at 100% (no scaling). The square must measure 50 mm.',
				`Seam allowance ${(settings.seamAllowance * 1000).toFixed(0)} mm included (solid line = cut, dashed = stitch).`,
				`Negative ease ${(settings.easeAcross * 100).toFixed(0)}% across, ${(settings.easeAlong * 100).toFixed(0)}% along the grain (four-way stretch fabric).`,
				`${pieces.length} piece(s). Tape tiles together by their letters and numbers.`,
			], PAGE.margin + 2, PAGE.margin + 15);
			doc.setDrawColor(20); doc.setLineWidth(0.3);
			doc.rect(PAGE.margin + 140, PAGE.margin + 2, 50, 50);
			doc.text('50 mm', PAGE.margin + 158, PAGE.margin + 28);
		}
		for (const p of placed) {
			const [px, py] = p.at, sx = (x) => X(ox + px + x), sy = (y) => Y(oy + py + (p.size[1] - y)); // flat v up = page up
			// skip pieces entirely outside this tile
			if (ox + px > tx + cw || ox + px + p.size[0] < tx || oy + py > ty + ch || oy + py + p.size[1] < ty) continue;
			doc.setDrawColor(0); doc.setLineWidth(0.3); doc.setLineDashPattern([], 0);
			poly(doc, p.cutLine.map(([x, y]) => [sx(x), sy(y)]));
			doc.setLineWidth(0.2); doc.setLineDashPattern([2, 1.2], 0);
			poly(doc, p.stitch.map(([x, y]) => [sx(x), sy(y)]));
			doc.setLineDashPattern([], 0);
			// grain line with arrow heads, along the piece's vertical (rotated by the panel's grain)
			const L = Math.min(p.size[1] * 0.6, 160), [gx, gy] = p.grain.at, a = p.grain.angle;
			const dx = Math.sin(a) * L / 2, dy = Math.cos(a) * L / 2;
			const A = [sx(gx - dx), sy(gy - dy)], B = [sx(gx + dx), sy(gy + dy)];
			doc.setLineWidth(0.3); doc.line(A[0], A[1], B[0], B[1]);
			arrow(doc, A, B); arrow(doc, B, A);
			doc.setFontSize(9); doc.setTextColor(20);
			doc.text([p.name, p.cut, p.fabric ? `Fabric: ${p.fabric}` : ''].filter(Boolean), sx(gx) + 3, sy(gy) - 4);
		}
	}
	return doc;
}

function poly(doc, pts) {
	for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; doc.line(a[0], a[1], b[0], b[1]); }
}
function arrow(doc, from, to) {
	const dx = to[0] - from[0], dy = to[1] - from[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, s = 4;
	doc.line(to[0], to[1], to[0] - ux * s - uy * s * 0.5, to[1] - uy * s + ux * s * 0.5);
	doc.line(to[0], to[1], to[0] - ux * s + uy * s * 0.5, to[1] - uy * s - ux * s * 0.5);
}
