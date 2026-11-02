---
type: Technique
title: Fit solver realism audit
description: "November 2026 audit of pipeline/wrap_block.py against public cloth simulators and skin-tight garment research, before any speed work: a sound geometric fit but not a realistic cloth simulation. Fifteen ranked differences, what to leave alone, what needs real fabric, and the order of work."
tags: [fit, simulation, audit, fabric, elastic]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-03T00:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-02 (Claude Code session)
    title: "Audit how realistic the solver is before optimising it"
    author: human:mattj
  - id: report
    resource: "reports/Tight garment fit solver audit.md, with notes in research_notes/Tight garment fit solver audit/"
    title: Full audit report and research notes, with sources
---

# Takeaway

The solver is a sound geometric fit, not a realistic cloth simulation, and should not be sped up yet.[^owner] Its overall shape is credible where fabric is taut (estimated several mm to 1 cm, unconfirmed against a garment). It is unreliable for the leg line, the seat, crotch and small of the back, spare fabric, and any pose but the one solved. No audited public project validates a stretch fit against reality. Full table and citations are in the report.[^report]

# Differences, most impact first

The ranking is a judgement: no paper tests these one at a time on one garment.

1. Poses are not re-solved; the slide never sees pattern, elastic or gathering.
2. The garment surface is decided before the fit, for the app's cover and not the block.
3. Elastic strength is a guess, and depends on mesh size, since it is set per span.
4. Spare fabric shows as squeezed print; nothing forms a fold, and rendered wrinkles sit in fixed zones.
5. Nothing selects where slack settles locally.
6. Rigid body.
7. Fabric is the same in every direction; grain is stored but never read.
8. No friction.
9. No narrowing when stretched.
10. Fabric is held to the surface both ways.
11. Seams have no stiffness. 12. The 7 mm mesh is unchecked. 13. No bending or gravity. 14. Linear stretch response. 15. No fabric-on-fabric contact.

# First-hand tests, `young`, high cut

- **Starting shape:** three starts ended 0.4-0.6 mm apart on average, 95% within 1.4 mm, 6.7-9.1 mm at worst; waist back along 0.75-0.76 in all. The overall fit is not set by the start, for this family of starts.
- **Double lift:** `show` in `app/src/dev/wrap-eval.js` placed fabric on the lifted surface and the shader added the lift again: 8.8-12.2 mm at most at the crotch. Fixed; earlier renders carried it. The nub remains without it. A 1.2 mm offset is still applied twice.

# Leave alone

The free-compression force rule, the solving family, flat pieces as rest shape, welded seams, the published leg elastic ratios, and solving half and mirroring. A public engine should not replace the solver as the product; GarmentCode's simulator fork and ARCSim also have non-commercial limits.

# Order of work

Real fabric and sewn garments are ruled out for now.[^owner] So fit cannot be validated against a garment: it is checked against published data, a heavier simulator and photos, and unmeasured values are treated as ranges.

1. Add measures with no physics change: force balance, a ten-times-iterations run, a map of where the surface pulls fabric in, a map of triangles at the gathering limit.
2. Make elastic strength per unit length, set from published and estimated ranges, then test finer meshes. Report how far the fit moves across each range.
3. Run one garment in a heavier public solver as a reference, switching physics on and off.
4. Add the physics that step shows matters.
5. Re-solve two poses and compare with reuse.
6. Drive wrinkles from the solved state.
7. Compare with photos of real leotards, especially printed or striped ones, as a judgement of appearance.
8. Speed work, using `pipeline/refit_bench.py` as baseline.

Hang-weight tests and a printed-grid garment remain the way to replace estimates if physical testing becomes possible.

[^owner]: Conversation with the product owner.
[^report]: Full audit report and research notes, with sources.
