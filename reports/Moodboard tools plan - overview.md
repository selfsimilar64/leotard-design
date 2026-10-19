# Building every moodboard leotard in the app — overview

*18 October 2026. Written for you; the detailed engineering version lives in the knowledge base
(links at the end).*

## The short version

I studied all 138 moodboard photos (about 105 different leotards). The variety you pointed out is
real, but it is concentrated: almost every leotard has **its own panel lines**, **its own crystal
layout**, and every back view is **a different back**. Everything else — sleeve lengths, necklines,
fabric families, edge finishes, hip logos — comes from a small vocabulary that repeats across brands.

So the app needs two kinds of tools. A **free-hand core**: drawing lines on the body, building straps
and openings, laying out stones. Free-hand matters most here, because presets can't cover these
designs. Around that core sit **pick-from-a-list tools** for everything that repeats. The app also
needs to look like a **studio photo on a real athlete**, because that is what nearly every moodboard
image is. That is the biggest realism gap today, and it is cheap to close within 60 fps.

The plan has nine phases. Each one ends by rebuilding real moodboard designs. The last phase is a
rehearsal using the exact procedure I'll use for your test. Nothing has been built yet, as you asked.

---

## 1. What tools are needed

Fourteen tools, in the order a designer would reach for them.

| | Tool | What it lets the designer do | Moodboard example |
|---|---|---|---|
| 1 | **Starting shapes** | Pick a base: tank, cap, 3/4 or long sleeve; crew, scoop, V, mock or high neck; leg height; back style. Everything stays editable | Every design |
| 2 | **Pen on the body** | Draw any seam or panel line on the 3D body or on a flat front/back sketch: S-curves, sweethearts, chevrons, flames that end in points, wrap-arounds. Lines can be made scalloped, zig-zag or wavy | The flame panels and nested chevrons in the Quatro designs |
| 3 | **Line editing** | Drag points (they slide over the body), add corners, mirror on or off, make parallel copies | — |
| 4 | **Fabric per panel** | Drag a fabric onto any panel. Covers every fabric family seen, from mystique and wet look to oil-slick foil, liquid hologram, lace and crushed velvet. Mesh shows the skin or a lining beneath, and one click swaps the whole colourway | Tone-on-tone plum mesh (N3) |
| 5 | **Cut-outs** | Remove any area; its edge is finished automatically | Midriff arch cut-out (IMG_4141) |
| 6 | **Straps** | Draw a strap from edge to edge: crossings, ladders, cages, fans, wrap-arounds, straps over mesh or skin | The six-strap fan back (Sparkle Dream) and the cage back (Nejahkaki) |
| 7 | **Edges and trims** | Click any edge or seam to add contrast binding, piping, a mock-neck or collar band, or cuffs. Also clasps, hooks and zips | The navy binding on every edge of DAPHNE |
| 8 | **Prints and logos** | Gradients, artwork, printed lace, logos and lettering as print, foil or embroidery | Ombre bodices; hip logos |
| 9 | **Stone layouts** | Describe the layout in the trade's own terms: rows along a seam, outline, fill, fade from this line, rays and fans, rain, curtains, trellis, motifs from artwork, lettering, fringe drops, comet sweeps. Stones can grade in colour and size. Layouts stay linked to their lines: move a seam and its stones follow | Crystal rain fading from clear to sapphire (113858) |
| 10 | **Single stones and eraser** | Place or remove individual stones, including shaped stones (pear, navette), pearls and sequins | Pear-drop fringes |
| 11 | **Trace a photo** | Drop in a photo, mark a few body points, and the app lines the photo up with the 3D body. You draw straight over it, pick colours from it, and can even pick up stone positions from it | — |
| 12 | **Lighting and presentation** | Studio, gym and arena lighting; star-filter sparkle; athlete or mannequin; poses; side-by-side compare with a photo | Hands-on-hips studio shots |
| 13 | **Layers** | Pieces that lie over other pieces: lace wrap pieces, crossover fronts, sashes, appliqué. Lining shapes that show through mesh | DAPHNE's overlapping lace back; TREILLE's lining under mesh |
| 14 | **Surface detail** | Gathers, ruching, a twisted knot, natural tension wrinkles | The gathered bodices in the set |

## 2. What has to happen behind the scenes

These are what make the tools trustworthy rather than fiddly.

- **A design is a saved file.** Everything can be undone and redone. A design opens on every body
  size and pose.
- **Lines become real panels.** Each panel is a true piece with exact edges. Thin straps and piping
  stay crisp, and each panel can be laid flat as a pattern piece for the seamstress.
- **Layouts stay alive.** Stone rows, trims and fades are recipes tied to their lines, not frozen
  dots, so editing a seam re-flows everything attached to it.
- **Mirroring is built in.** You design once for both sides, and break symmetry only where you want.
- **Built-in good habits.** Stones automatically keep off edges and straps and never overlap. A live
  stone count and cost tier are always visible.
- **Every tool can also be driven by command.** This is what lets me take your test using the same
  tools a designer has.

## 3. How to make it frictionless

- **Never start from a blank.** Start from the nearest base shape.
- **Draw where you think.** Draw on the 3D body or on a flat sketch beside it; both update together.
  On iPad, the pencil draws and fingers turn the model.
- **Draw a line, get a panel.** Ending a line on another line closes the panel automatically.
  Snapping to the body's key points (centre front, side seam, waist, bust) is on by default.
- **Click anything, get the right options.** A panel offers fabrics and "cut out". A seam offers
  binding, piping and "two rows of stones along it". A strap offers width and fabric.
- **Speak the trade's language.** Stones are laid out as "rows along", "fade from here to there",
  "trellis" or "fan" — never one dot at a time unless you want to.
- **Nothing is final.** Every decision can be changed later, and the change ripples through.
- **No pop-up dialogs** in the draw → fabric → decorate loop.

## 4. Making it look real, still at 60 fps

Today the app renders in a dark generic room on a white mannequin. The moodboard is almost all bright
studio photos on real skin. That mismatch is why crystals look grey instead of silvery and why shiny
fabrics lack the broad highlights in the photos.

In order of impact:

1. **Real photo-studio lighting.** Large soft lights and a white or grey backdrop, reflected in the
   crystals and foils. This is the single biggest gain.
2. **Crystals that read like the photos.** Bright with dark facets; mixed colours and shapes in one
   layout; optional star-filter sparkle like the brand shots.
3. **Soft shadows and contact shading**, so straps, bands and arms sit on the body.
4. **An athlete skin option.** Most mesh in the moodboard is mesh over skin.
5. **Mesh that behaves like mesh.** Darker at the edges, more open where stretched, seam lines faintly
   visible through it.
6. **Real lace and printed artwork** laid out on each panel the way fabric is cut.
7. **Seams, slight tension wrinkles and the missing fabric looks** (oil-slick, liquid hologram,
   crushed velvet).
8. **A "still photo" mode.** When nothing moves, the image sharpens itself for comparisons and
   screenshots.

The app currently takes about 6 ms per frame on your laptop. 60 fps allows about 16 ms, and the plan
keeps the total under 14 ms, re-measured at every phase.

## 5. What you could give me

Ranked by how much each would move the result. The first four matter most.

1. **Swatch photos of your real fabrics** (about 1–2 hours with a phone and a desk lamp). Each
   fabric needs a flat photo with a colour card, a raking-lamp photo, a short video turning it under
   one lamp, a backlit photo for mesh and lace, and a stretched photo.
2. **A strip of real stones** (each size; clear, AB and a couple of colours), photographed the same
   way.
3. **Your photo studio:** a photo of the lights taken from where the model stands, plus a 360° photo
   from the same spot. This lets the app copy your studio exactly.
4. **3–5 real leotards photographed** front, back, side and close-up in that studio. These become
   honest scoring material.
5. Your actual lace scans, print artwork and logos.
6. Two or three real pattern sets.
7. Your fabric colour cards and stone palette.
8. Your fit model or dress-form measurements.

**Update, 18 October:** you can provide ready-made scanned fabrics from VMOD (vmod.xyz). The app
will import them as follows.

- **Format.** Download the **Blender** version of each fabric. Put it in its own folder under
  `assets/textures/vmod/` and note how big one tile is in real life, for example 10 × 10 cm.
- **Fit with the plan.** The plan already lays fabric out per panel at real size, which is exactly
  what these textures need. No change of direction is required.
- **What they will and won't replace.**
  - They will make lace, mesh, weave and print look real.
  - Glitter, foil and hologram sparkle still comes from the app's own effects, because a flat glitter
    picture stops sparkling as the body turns. The textures tell those effects where the glitter
    sits and how big it is.
- **Licence caution.** VMOD's terms look fine for your own renders. They do not clearly allow
  shipping their textures inside an app that other people install, so ask VMOD before the fabrics
  go out to designers or clubs.

## 6. The plan

| Phase | What gets built | Proven by rebuilding |
|---|---|---|
| P0 | A proper app shell: save files, undo, real panels and menus instead of the test sliders | Today's six looks reload identically |
| P1 | Drawing lines on the body and flat sketch, real panels, fabrics laid out per panel, flat pattern pieces and a printable PDF | Panelling of three moodboard designs |
| P2 | Cut-outs, straps, trims, collars, hardware, layered pieces | The strap backs and layered backs |
| P3 | Full fabric library, lace, prints, logos, studio lighting, athlete skin | Fabrics side by side with their photos |
| P4 | Stone tools I: rows, outlines, fills, fades, shaped stones, counts | Three stone layouts and a 4,000-stone design |
| P5 | Stone tools II: rays, rain, trellis, motifs, lettering, fringes; crystal realism and star sparkle | The motif-heavy designs |
| P6 | Photo tracing and side-by-side compare | Traced lines within 5 mm of the photo |
| P7 | Poses (hands on hips, arms down…), shadows, wrinkles, gathers | Every benchmark in its photo's pose |
| P8 | Full rehearsal on all 13 benchmark designs; you score them; fix the gaps | Your sign-off, then the test |

The **13 benchmark designs** were picked so that together they touch everything the moodboard
contains. Among them are DAPHNE (front and back), Anika, N3, TREILLE Ocean, Nejahkaki, the Sparkle
Dream fan-strap back, the asymmetric black mesh design, the hologram ladder-back team leotard, the
navy crystal-rain design, and the 4,000-stone diamond design.

## 7. How I'll take your test

1. Load your photo and line it up with the body.
2. Match the body size, skin and pose.
3. Pick the nearest base shape and trace the lines.
4. Assign fabrics, picking colours from the photo.
5. Add cut-outs, straps and trims.
6. Lay out the stones zone by zone.
7. Match the lighting and sparkle style.
8. Compare at the photo's own camera angle, and refine for at least three rounds.

I'll hand back renders from the photo's angle, plus front, back and side, and the design file.
Throughout, I'll use the same tools a designer would, driven by command rather than by mouse.

## Questions for you (answered 18 October)

You answered: the test gives front and back photos; showing it on the mannequin is fine; there's no
time limit; driving the app's tools by command is fine. You can't supply the swatch, stone or
studio photos; scanned VMOD fabrics stand in for the fabric references.

The original questions were:

- **Test conditions.** Will the test be one photo, or front and back? Should the result sit on a
  realistic athlete body or on the mannequin? Is there a time limit?
- **Driving the tools by command.** Is it acceptable for me to drive the app's tools by command
  rather than by mouse? It's the same tools either way.
- **Fidelity inputs.** Can you supply items 1–4 from section 5 before Phase 3? That is when they
  start to pay off.

---

**Detailed records (for agents and future sessions), in `knowledge/`:**
- Tool list: `product/requirements/tool-space-for-moodboard.md`
- Plan: `product/roadmap/moodboard-coverage-roadmap.md`
- Design file format: `engineering/architecture/design-document-model.md`
- App structure: `engineering/architecture/editor-architecture.md`
- Design flow: `engineering/ux/frictionless-design-flow.md`
- Realism and frame budget: `engineering/rendering/realism-upgrades-at-60fps.md`
- What you could provide: `product/questions/fidelity-inputs-from-owner.md`
- Moodboard teardown: `domain/moodboard/design-space-taxonomy.md`, plus `catalogue-part-1.md` to
  `catalogue-part-7.md` (every image)
