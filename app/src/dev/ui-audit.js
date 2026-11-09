// Checks the interface's rule that no card scrolls (knowledge/engineering/app/glass-studio-interface.md): clicks
// through every card and every face the open design can reach and compares each card body's content height with
// the room it has. Run it in the page, at the window size to check:
//   (await import('/src/dev/ui-audit.js')).audit()
// It returns { size, faces, over: [each face that overflows, by how many px], tall: [the five tallest cards], errors }.
// It edits nothing (it puts tools on and off, opens parts from the lists, and ends with everything put away), so it
// is safe on any design; a design with a crystal pattern that has modifiers of each kind, a drawn line and a strap
// covers the most faces.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];

export async function audit() {
	const rows = [], errors = [];
	const onError = (e) => errors.push(String(e.message || e.reason));
	addEventListener('error', onError); addEventListener('unhandledrejection', onError);
	const measure = (label) => {
		const b = q('.inspector .card-body'), c = q('.inspector .card');
		rows.push({ label, over: b ? Math.max(b.scrollHeight - b.clientHeight, b.scrollWidth - b.clientWidth) : 0, card: c ? Math.round(c.getBoundingClientRect().height) : 0 });
	};
	const face = async (name) => { qa('.inspector .faces .face').find((f) => f.textContent === name)?.click(); await sleep(180); };
	// every face of the card on show; each(label, face name) may look further into one
	const faces = async (label, each) => {
		const names = qa('.inspector .faces .face').map((f) => f.textContent);
		if (!names.length) { measure(label); return; }
		for (const name of names) { await face(name); measure(`${label} / ${name}`); if (each) await each(`${label} / ${name}`, name); }
	};
	const spine = async (i) => { const b = qa('.spine-btn')[i]; if (!b.classList.contains('on')) b.click(); await sleep(250); };
	const escape = async () => { dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await sleep(120); };
	// Shape: each element of the cut, each drawing tool, each drawn line and strap
	await spine(0);
	await faces('Shape', async (l, name) => {
		if (name === 'Silhouette') for (const c of qa('.el-chip')) { c.click(); await sleep(150); measure(`${l} / ${c.textContent}`); }
		if (name === 'Draw') for (let i = 0; i < 3; i++) { qa('.inspector .mode')[i].click(); await sleep(150); measure(`${l} / tool ${i + 1}`); }
	});
	await escape();
	await spine(0); await face('Draw');
	for (let i = 0, n = qa('.inspector .part-row').length; i < n; i++) {
		await spine(0); await face('Draw');
		const r = qa('.inspector .part-row')[i];
		if (!r) break;
		const name = r.textContent;
		r.click(); await sleep(250);
		await faces('Drawn: ' + name);
		q('.card-back')?.click(); await sleep(200);
	}
	// Fabric: a piece
	await spine(1); await sleep(200);
	await faces('Piece');
	// Sparkle: each tool, then each crystal group, pattern (its modifiers too) and lettering on the design
	await spine(2); await sleep(200);
	await faces('Sparkle');
	for (let i = 0; i < 4; i++) { qa('.inspector .mode')[i].click(); await sleep(250); await faces(`Sparkle, tool ${i + 1}`); }
	qa('.inspector .mode')[4].click(); await sleep(250);
	await faces('New lettering');
	q('.card-back')?.click(); await sleep(200);
	await spine(2); await face('On design');
	for (let i = 0, n = qa('.inspector .part-row:not(.static)').length; i < n; i++) {
		await face('On design');
		const r = qa('.inspector .part-row:not(.static)')[i];
		if (!r) break;
		const name = r.textContent;
		r.click(); await sleep(400);
		await faces('On design: ' + name, async (l, fname) => {
			if (fname === 'Place') { qa('.inspector .card-body .seg-opt')[1].click(); await sleep(200); measure(l + ' / the crystals under it'); qa('.inspector .card-body .seg-opt')[0].click(); await sleep(150); }
			if (fname === 'Preset') for (const s of qa('.inspector .card-body .seg-opt')) { s.click(); await sleep(150); measure(`${l} / ${s.textContent}`); }
			if (fname === 'Modify') for (let k = 0, m = qa('.mod-open').length; k < m; k++) {
				qa('.mod-open')[k].click(); await sleep(300);
				const t = q('.card-title')?.textContent;
				for (const f of ['Effect', 'Shape']) { await face(f); measure(`Modifier ${t} / ${f}`); }
				q('.card-back').click(); await sleep(250);
				await face('Modify');
			}
		});
		q('.card-back')?.click(); await sleep(250);
	}
	// Stage
	await spine(3); await sleep(200);
	await faces('Stage');
	await escape(); await escape();
	removeEventListener('error', onError); removeEventListener('unhandledrejection', onError);
	return {
		size: `${innerWidth} x ${innerHeight}`, faces: rows.length, errors,
		over: rows.filter((r) => r.over > 0).map((r) => `${r.label}: ${r.over} px`),
		tall: [...rows].sort((a, b) => b.card - a.card).slice(0, 5).map((r) => `${r.label}: ${r.card} px`),
	};
}
