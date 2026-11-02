---
type: Technique
title: Refitting after an edit
description: "November 2026: how fast and how accurately a fitted block re-settles after a structural edit such as a cutout, started from the fit already there. First measurement, on one body, of the owner's plan for updating the fit inside the app."
tags: [fit, performance, refit, cutouts]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T23:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-02 (Claude Code session)
    title: "Edits within the base design need no recalculation; structural edits re-fit automatically or from a button, and must not interrupt designing"
    author: human:mattj
  - id: code
    resource: "pipeline/refit_bench.py, pipeline/wrap_block.py"
    title: Benchmark and fit
---

# Takeaway

The owner's plan: edits within the base design reuse the fit; structural edits such as cutouts get a re-fit, automatic if fast enough, otherwise from a button.[^owner] Measured on `young`, high cut, in the offline Python solver (6,898 points, about 0.3 s per iteration, unoptimised):[^code] a whole-garment re-fit needs tens of seconds to settle, too slow for after every edit, acceptable in the background or behind a button. The first results are in the table below.

# Method

`pipeline/refit_bench.py` settles the fit, cuts triangles out, and re-solves from where the fabric was. Each run is judged against a 600-iteration solve of the same cut. Control: with no edit, 600 more iterations move the fit 0.29 mm mean, 3.9 mm at most, so differences smaller than that are not meaningful. A first run without settling overstated errors, since it counted the fit's own drift against each edit.

# Results

Mean / max displacement from the reference near the hole, mm (within 12 cm of its edge).

| Method | Time | Back keyhole | Large back opening | Front side cutout |
|---|---|---|---|---|
| Keep the old fit | 0 | 7.4 / 29.8 | 5.7 / 24.5 | 3.4 / 23.1 |
| Whole garment, 20 iterations | 6-13 s | 5.1 / 22.9 | 3.0 / 8.0 | 2.4 / 19.8 |
| Whole garment, 80 iterations | 21-31 s | 2.6 / 11.3 | 1.2 / 7.6 | 1.6 / 12.3 |
| Whole garment, 160 iterations | 41-54 s | 1.4 / 4.4 | 0.7 / 7.6 | 0.9 / 6.2 |
| Near the hole only, 160 iterations | 11-22 s | 4.6 / 11.7 | 3.2 / 8.6 | 2.2 / 20.9 |

A local re-fit improves at first and then stalls, since fabric beyond its limit stays wrong (elsewhere mean 1.9-2.8 mm, max 9-22 mm, unchanged). A cutout's effect reaches well beyond the hole.

# Known limits

- One body, one cut style. Holes are removed triangles with rough edges and no elastic; a finished cutout with elastic will differ.
- The reference is this solver's own answer, not reality.
- Timings are Python on the development machine, and include the fit's rebuild of its equations every iteration. Nothing has been optimised or ported into the app, so these are not the app's speed.
- Whether to run automatically, and what error a designer would notice, are undecided.

[^owner]: Conversation with the product owner.
[^code]: Benchmark and fit.
