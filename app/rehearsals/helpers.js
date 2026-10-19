// Helpers for rehearsal scripts: each benchmark design is rebuilt from its photo with the
// designer's own commands (window.app), as the owner's recreation test will be. Run in the app:
//   const m = await import('/rehearsals/b7.js?t=' + Date.now()); await m.build(app);
export function tools(app) {
	const log = [];
	const X = (c) => { try { return app.exec(c); } catch (e) { log.push(`${c.op} ${c.name ?? ''} ERR ${e.message}`); return undefined; } };
	const id = (name) => app.curveByName(name);
	// a control point attached to a line where the spec falls nearest it (ends stay on the line)
	const on = (curve, spec, kind = 'smooth') => { const r = app.nearestOn(curve, spec); return { at: spec, kind, on: { curve: r.curve, t: r.t, ...(r.mirror ? { mirror: true } : {}) } }; };
	// the panel under a point of the shell
	const at = async (spec) => {
		const { resolvePoint } = await import('/src/curves/points.js');
		const { panelAt } = await import('/src/garment/build.js');
		try { return panelAt(app.engine.layers.get('L0').g, app.doc, app.engine.surf, resolvePoint(spec, app.store.ctx)); } catch (e) { log.push('at ' + JSON.stringify(spec) + ' ' + e.message); return undefined; }
	};
	const settle = async () => { app.endGesture(); await app.engine.whenFlat(); };
	return { X, id, on, at, settle, log };
}
