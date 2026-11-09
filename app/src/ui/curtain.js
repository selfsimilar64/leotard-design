// The curtain over the page while it starts (index.html #curtain, drawn before any script has loaded): the step under way,
// the thread that fills as the start goes on, a note for a long wait, and lifting it once the first finished frame is on
// screen (main.jsx). Every call is a no-op once it is gone, so a page without it (refit.html, wrap.html) is unaffected.
const el = () => document.getElementById('curtain');

// The step under way ('Lighting the studio'), and how far the start has come (0..1).
export function curtainStep(text, share) {
	performance.mark?.('start: ' + text); // (the start's steps in the browser's performance timeline)
	const c = el();
	if (!c) return;
	const s = c.querySelector('.curtain-step');
	if (s && s.textContent !== text) {
		s.textContent = text;
		s.animate?.([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
		c.setAttribute('aria-valuetext', text);
	}
	if (share != null) c.querySelector('.curtain-thread')?.style.setProperty('--progress', String(share));
}

export function curtainNote(text) {
	const n = el()?.querySelector('.curtain-note');
	if (n) n.textContent = text;
}

export function liftCurtain() {
	const c = el();
	if (!c || c.classList.contains('lifted')) return;
	c.classList.add('lifted');
	setTimeout(() => c.remove(), 900);
}
