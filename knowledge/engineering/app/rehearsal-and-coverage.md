---
type: Component
title: Benchmark rehearsal and tool coverage (P8)
description: "The 13 moodboard benchmark designs rebuilt from their photos with only the designer app's commands (scripts in app/rehearsals, designs in app/designs), each compared side by side with its photo; per-design results, frame costs, rounds and remaining gaps; and an audit of the planned tool space (T1-T14, M1-M10) against what is built. Owner sign-off pending."
tags: [app, rehearsal, benchmark, coverage, p8, recreation-test]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-19T15:00:00Z }
sources:
  - id: code
    resource: "app/rehearsals/*.js, app/designs/b*.json, app/captures/rehearsal-sheet.jpg (captures not tracked; regenerate with app.sideBySide), branch build/designer-app, commit f121b5e"
    title: Rehearsal scripts and designs
    author: claude-code/claude-opus-5-5
  - id: roadmap
    resource: /product/roadmap/moodboard-coverage-roadmap.md
    title: Moodboard coverage roadmap (benchmarks B1-B13, rehearsal protocol, P8)
  - id: tools
    resource: /product/requirements/tool-space-for-moodboard.md
    title: Tool space needed to build every moodboard design
---

# Takeaway

All 13 benchmark designs were rebuilt from their photos through `window.app` commands only (the
designer's tools), posed as in the photo, under a matching light rig, and compared side by side;
every one renders inside the 60 fps budget (9.8-15.2 ms a frame at 1792x1344 on the GTX 1650).
Shape, panelling, fabrics, trims, straps and stone layouts read as the same leotard in all 13; the
remaining differences are listed per design below. The P8 gate is the owner's scoring of these
sheets, then the recreation test.[^roadmap][^code]

# How a rehearsal runs

- `app/rehearsals/<b>.js` exports `build(app, options)` and the photo framing; run in the app:
  `const m = await import('/rehearsals/b7.js?t=' + Date.now()); await m.build(app); await app.sideBySide('b7', m.photo)`.
- `rehearsals/helpers.js`: `X` (exec, errors collected, never thrown), `on(curve, spec)` (a point
  attached to a line where the spec falls nearest it), `at(spec)` (the panel under a point),
  `settle()` (end the gesture, wait for flattening).
- Pattern: block, then lines (seams, edges, print lines) with ends attached to block lines, then
  panels found by point and given fabrics, then trims, bands, straps, hardware, then stones (edges
  and motifs first: a later stone gives way to an earlier one), then logos.
- Pitfalls met: a point spec at the torso's side (`{ p: [0.15, y, 0] }`) can land on the A-pose
  arm; attach to the side seam with `on(side, ...)` instead. `{ front | back: [x, y] }` fails above
  the torso raster (neck); new openings cut from a panel inherit a panel and must be `panel.cut`.

# Results

| Design | Photo | Rounds | ms | Stones | Reads as the photo | Remaining gaps |
|---|---|---|---|---|---|---|
| B1 lace wrap with bow | DAPHNE front + back | 3 | 10.0 | 0.9k | Shield, lace sides and back, V back binding running on into crossed strips, navy brief and bindings, logo | Bow is a figure-eight (no freehand motif import); front lace triangles smaller |
| B2 ombre crossover | Anika | 4 | 12.1 | 1.4k | Raglan mesh sleeves, mock neck, turquoise-to-black ombre, centre mesh strip, crossover bands with mesh triangles, neck rays, monogram | Band satin reads matte; rays bunch at the neck |
| B3 tone-on-tone S-band | N3_DSC1064 | 3 | 12.9 | 4.3k | Mesh yoke and sleeves, curved bodice, S-curve mesh band, waist stripes, triple rows, scatter, cuff rows, motif | Bodice top less sweetheart-shaped; S band wider at the top |
| B4 mesh and lining | TREILLE OCEAN | 3 (P3) + fringe | 10.9 | 5.2k | Raglan mesh, bandeau lining under mesh, trellis lattice, waist fringe, logo, pose | Trellis nodes lack the star motifs |
| B5 strap-network back | Nejahkaki | traced (P6) | 8.4 | 0.1k | Y spine, V straps, bridge band, stones on straps | Pose (arms) only approximated; foil depth |
| B6 six-strap fan | Sparkle Ella (back + front) | 3 | 13.3 | 7.1k | Sweetheart mesh yoke, open U crossed by six straps, clasp, lotus motif, mesh sleeves with stones | Lotus is a simple flower motif; sleeve stones scattered, not drawn motifs |
| B7 asymmetric wedges | Screenshot 104228 | 3 | 14.5 | 5.8k | One mesh and one opaque sleeve, two mesh wedges, double rows, cuff density band, monogram, star glare, hand on hip | Upper wedge a little high at the right shoulder |
| B8 liquid hologram | Screenshot 205248 | 4 (P3) | 10.6 | 4.4k | Opal hologram bodice, black foil brief, raglan tape, red rows, AB sleeves, monogram | Hologram rainbow subtler than the photo's |
| B9 crystal rain | Screenshot 113858 / 113907 | 3 | 12.4 | 7.1k | Raglan mesh yoke over the caps, wandering rain AB to sapphire on body and sleeves, neckband, monogram | Rain a touch regular; yoke edge cluster lighter |
| B10 jet and amethyst | 14a7094... | 3 | 15.2 | 6.4k | Mesh yoke plunging to a V, edge rings coloured by depth, diamond motifs, stones stop at the hip | Amethyst reads brighter; diamond lattice simplified to three columns |
| B11 converging fan | Instagram 115458 | 3 | 12.1 | 4.2k | Navy V panel, mock neck, fan of rows into the V point, waist band, sleeves | Fan rows sparser than the photo's |
| B12 lace over hologram | It Was All A Dream | 5 (P3) | 9.8 | 0.9k | Lace bodice over a sweetheart glitter lining, spangle scatter, logo, hands in front | Lining less bright than the photo's metallic |
| B13 midriff arch (child) | IMG_4141 | 4 | 11.4 | 2.6k | Child body, diagonal ombre, vesica mesh insert with tape, stone band, midriff arch, gym light | Side cut-outs sit too far round the side; band not crossed |

# Coverage audit against the tool space

| Tool | State | Notes |
|---|---|---|
| T1 Block library | built | Necks crew/scoop/V/high/boat, backs crew/scoop/low/V/keyhole/open, tank to long sleeves, raglan or set-in, two leg cuts. V necks fixed in P8 (they had stayed crew-deep) |
| T2 Pen on body | built (body) | Pen tool and `curve.add`; shape modifiers. No 2D flat drawing chart yet |
| T3 Curve editing | partly | Drag, insert, delete, corner/smooth, mirror, attachments. No landmark snapping, no offset copy tool |
| T4 Panel fabric and stack | built | 23 fabrics, scanned textures, second colour, effect, sheerness, gradients, prints, linings, swatch picker |
| T5 Cut-out | built | Keyholes, U backs, midriff arches, side cut-outs with finished edges |
| T6 Strap tool | built | Single, crossed, fans, straps over mesh or skin, layer order |
| T7 Edges, trims, bands | built | Elastic, binding, piping, flat tape, bands, mock necks |
| T8 Prints and decals | built | Prints, gradients along a line or direction, logos and lettering as print/foil/holo/glitter/flock |
| T9 Stone generators | built | Rows, fills (random, contour by depth), scatter, rays, motif, lattice, cluster, fringe and rain, lettering. Missing: motif import from SVG or a photo trace, comet brush tool |
| T10 Single stone, eraser | built | Shapes include navette, pear, oval, baguette, pearl, spangle, holo dot |
| T11 Reference tracing | built | Pins, camera solve with warp, look-through, compare, photo point specs, colour pick and match, stone pick-up |
| T12 Look and presentation | built | Studio, grey, gym, arena rigs; glare presets; athlete skin; nine poses; compare, side-by-side, capture |
| T13 Layers and overlays | built | Overlays and linings, linings clipped to the shell |
| T14 Surface detail | partly | Tension wrinkles, gathers, ruching, twist stamps. No embossed strap texture |
| M1-M7 | built | Document and commands, surface addressing, arrangement, flattening, live generators, mirror map, keep-outs |
| M8 Size and pose transfer | built | Sizes child to adult; poses re-skin the arms |
| M9 Live counts | partly | Counts by size and colour; no cost tier |
| M10 Benchmark harness | built | `app/rehearsals` scripts plus `sideBySide`/`compare` |

Not yet audited image by image: the 138-photo pass ("every feature mapped to a tool") is the
remaining half of the P8 coverage audit; the table above is the tool-side view.

[^code]: Rehearsal scripts and designs
[^roadmap]: Moodboard coverage roadmap
[^tools]: Tool space
