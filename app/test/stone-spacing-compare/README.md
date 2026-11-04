# Stone spacing comparison

Lays the same stone-pattern presets three ways on one flat 0.4 x 0.6 m piece and compares them:

- **old**: the pattern code at a commit you name (the one-by-one clearance check before 2026-11-04 is `d451a97`),
- **current**: the working tree with stones allowed to overlap,
- **peaks**: the working tree with the parallel rule (`keepPattern(..., { peaks: true })`, `app/src/stones/peaks.js`).

The pattern code under `app/src/stones/` imports nothing browser-only, so plain Node runs it.

```bash
# 1. export the old pattern code somewhere outside the repo
mkdir -p /tmp/old && git archive d451a97 app/src/stones | tar -x -C /tmp/old
# 2. lay, measure and time (KEYS=comma list of gallery keys to override the default set)
node app/test/stone-spacing-compare/compare.mjs "$PWD/app/src/stones" /tmp/old/app/src/stones /tmp/out
# 3. contact sheet of some presets: columns old / current / peaks, overlaps outlined red
python app/test/stone-spacing-compare/render.py /tmp/out flower-of-life,circles,scales,wallpaper-p6m,guilloche,scatter-mixed
```

Outputs `stones.json`, `metrics.json` (counts, overlapping pairs below 0.92 of touching, rounds of the parallel rule,
milliseconds to draw afresh and to move) and `spacing-compare.png`. Results of 2026-11-04:
`knowledge/engineering/architecture/parallel-stone-spacing.md`.

`bench-in-app.js`: the in-app timing of stone edits at rising densities (work per step and GPU frame), pasted into the
test tab's console; see its header.
