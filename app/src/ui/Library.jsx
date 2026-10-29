// The design library, over the whole window: the starting points (simple leotards, yours to
// change), the finished moodboard designs and the designer's own saves, each a front-and-back
// picture of the leotard on the matte white mannequin (src/dev/thumbnails.js starts and designs;
// app.save renders a save's). Opening one changes only the leotard: the mannequin, its pose and the
// studio stay.
import { useEffect, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { libraryOpen, designsRev, selection, notify, slow, savedRev, rev } from './state.js';
import { run, thumb } from './kit.jsx';
import { I } from './icons.jsx';
import { STARTS } from '../garment/starts.js';

// The designs in designs/: the moodboard collection (b<n>-name, in order), then the designer's own.
function useDesigns(open) {
	const [list, setList] = useState([]);
	const n = designsRev.value;
	useEffect(() => { if (open) app.designs().then(setList, () => setList([])); }, [n, open]);
	const order = (f) => { const m = f.match(/^b(\d+)-/); return m ? +m[1] : 1000; };
	return [...list].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
}
export const designLabel = (f) => { const s = f.replace(/^b\d+-/, '').replace(/[-_]+/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
export const designThumb = (f) => `/__fs/designs/thumbs/${encodeURIComponent(f)}.jpg`;

export function Library() {
	const open = libraryOpen.value, files = useDesigns(open);
	rev.value;
	const [busy, setBusy] = useState(null), [confirm, setConfirm] = useState(null);
	useEffect(() => {
		if (!open) { setConfirm(null); return; }
		const onKey = (e) => { if (e.key === 'Escape') libraryOpen.value = false; };
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open]);
	if (!open) return null;
	const close = () => { libraryOpen.value = false; };
	const finished = files.filter((f) => /^b\d+-/.test(f)), own = files.filter((f) => !/^b\d+-/.test(f));
	// a starting point is a new design, one undo step away from the one on show
	const start = async (key) => {
		setBusy(key);
		await slow('Starting a new leotard…', () => { run([{ op: 'start.apply', key }, { op: 'meta.set', name: 'Untitled' }]); app.file = null; selection.value = null; });
		setBusy(null); close();
	};
	// opening a file replaces the design on show (and its undo history): ask first if it is not saved
	const unsaved = () => app.revision !== savedRev.value && app.doc.curves.length > 0;
	const openFile = async (f, sure = false) => {
		if (!sure && unsaved()) { setConfirm(f); return; }
		setConfirm(null); setBusy(f);
		try {
			await slow('Opening ' + designLabel(f) + '…', () => app.open(f, app.doc.body, app.doc.scene));
			selection.value = null; savedRev.value = app.revision; close();
		} catch (e) { notify(e.message, 'error'); }
		setBusy(null);
	};
	const current = (k, file) => (file ? app.file === k : !app.file && app.doc.meta.start === k);
	return (
		<div class="library" role="dialog" aria-modal="true" aria-label="Designs" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
			<div class="lib-sheet">
				<header class="lib-head">
					<div>
						<h1 class="lib-title">Designs</h1>
						<p class="lib-sub">Start from a simple leotard or a finished design. Only the leotard changes: the mannequin, its pose and the studio stay as they are.</p>
					</div>
					<button class="icon-btn lib-close" title="Close (Esc)" aria-label="Close" onClick={close}><I.close size={22} /></button>
				</header>
				{confirm ? (
					<div class="lib-confirm" role="alert">
						<span><strong>{app.doc.meta.name || 'This design'}</strong> has changes that are not saved. Opening {designLabel(confirm)} replaces it.</span>
						<span class="btn-row">
							<button class="btn" onClick={async () => { const f = confirm; try { notify('Saved ' + await app.save()); designsRev.value++; savedRev.value = app.revision; openFile(f, true); } catch (e) { notify(e.message, 'error'); } }}>Save, then open</button>
							<button class="btn primary" onClick={() => openFile(confirm, true)}>Open anyway</button>
							<button class="btn quiet" onClick={() => setConfirm(null)}>Cancel</button>
						</span>
					</div>
				) : null}
				<LibSection title="Start fresh" note="Simple leotards to make your own">
					{STARTS.map((s) => <Card key={s.key} img={thumb('starts', s.key)} name={s.label} hint={s.hint} on={current(s.key)} busy={busy === s.key} onClick={() => start(s.key)} />)}
				</LibSection>
				{finished.length ? <LibSection title="Finished designs" note="Rebuilt from the moodboard">
					{finished.map((f) => <Card key={f} img={designThumb(f)} name={designLabel(f)} on={current(f, true)} busy={busy === f} onClick={() => openFile(f)} />)}
				</LibSection> : null}
				{own.length ? <LibSection title="Your designs" note="Saved with Save">
					{own.map((f) => <Card key={f} img={designThumb(f)} name={designLabel(f)} on={current(f, true)} busy={busy === f} onClick={() => openFile(f)} />)}
				</LibSection> : null}
			</div>
		</div>
	);
}

function LibSection({ title, note, children }) {
	return (
		<section class="lib-sec">
			<div class="lib-sec-head"><h2>{title}</h2>{note ? <span>{note}</span> : null}</div>
			<div class="lib-grid">{children}</div>
		</section>
	);
}

function Card({ img, name, hint, on, busy, onClick }) {
	const [loaded, setLoaded] = useState(false);
	return (
		<button class={`card ${on ? 'on' : ''} ${busy ? 'busy' : ''}`} onClick={onClick} title={hint ?? name}>
			<span class={`card-pic ${loaded ? 'loaded' : ''}`}>
				<img src={img} alt="" loading="lazy" draggable={false} onLoad={() => setLoaded(true)} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; setLoaded(true); }} />
				<span class="card-sides"><span>Front</span><span>Back</span></span>
				{on ? <span class="card-badge"><I.check size={14} /> Open</span> : null}
				{busy ? <span class="tile-spin" /> : null}
			</span>
			<span class="card-name">{name}</span>
			{hint ? <span class="card-hint">{hint}</span> : null}
		</button>
	);
}
