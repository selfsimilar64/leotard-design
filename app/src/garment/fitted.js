// Fitted garments: a flat block drafted as a pattern maker would, sewn and fitted onto the body by the fit solver
// (pipeline/wrap_block.py), shown instead of the app's own drawn pieces (render/fitted.js). A design picks one with
// meta.fitted (op fitted.set); its panels named Front, Back and Sleeve dress the fitted pieces of the same name.
// Files: app/public/fitted/, copied there by pipeline/publish_fitted.py from the fit's output (twin: its OWNED list).
// Only blocks the project owns are listed: a block derived from a bought pattern stays out (its licence bars
// redistributing it). knowledge/engineering/app/fitted-garments-in-the-app.md
export const FITTED = [
	{ key: 'armstrong-6', label: 'Textbook leotard', leg: 'Basic leg', file: 'armstrong-6-block', fittedOn: 'young' },
	{ key: 'armstrong-6-high', label: 'Textbook leotard, high cut', leg: 'High-cut leg', file: 'armstrong-6-high-resolved', fittedOn: 'young' },
];

export const fittedOf = (doc) => FITTED.find((f) => f.key === doc?.meta?.fitted) ?? null;
