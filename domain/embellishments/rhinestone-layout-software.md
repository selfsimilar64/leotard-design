---
type: Domain Concept
title: Rhinestone layout software baseline
description: "Existing rhinestone tools (Sierra Hotfix Era, TRW Design Wizard, Silhouette Studio, Inkscape/Ink-Stitch) are 2D and built for flat transfers; their verified features (path and area fills, mixed sizes, overlap marking, single-stone edit, pricing, machine export) are the baseline a 3D leotard tool must match."
tags: [software, competitor, rhinestone, layout, baseline]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: ecs
    resource: /references/research/embellishments-crystals-sequins.md
    title: "Research notes: embellishments, crystals and sequins"
    author: claude-code/claude-opus-5-5
  - id: sierra
    resource: https://www.sierra-software.com/
    title: Sierra Software
    author: org:sierra-software
  - id: sierra-hfe
    resource: https://www.sierra-software.com/Sites/Products/HotfixEra/HotfixEra.aspx
    title: Sierra Hotfix Era product page
    author: org:sierra-software
  - id: edutech-stitchera
    resource: https://edutechwiki.unige.ch/en/Stitch_Era_-_creating_hot_fix_designs
    title: EduTech Wiki, Stitch Era hotfix designs
    author: org:edutech-wiki
  - id: aasp-hfe
    resource: https://aaprintsupplyco.com/products/hotfix-era-software
    title: All American Print Supply, Hotfix Era listing
    author: org:all-american-print-supply
  - id: coldesi-designera
    resource: https://shop.coldesi.com/blogs/news/hotfix-era-and-stitch-era-liberty-software-the-design-era-suite
    title: ColDesi, Hotfix Era and Stitch Era Liberty
    author: org:coldesi
  - id: coldesi-cams
    resource: https://shop.coldesi.com/products/cams-1v-6p-cams-1v-6p
    title: ColDesi CAMS 1V-6P
    author: org:coldesi
  - id: trw-wizard
    resource: https://www.therhinestoneworld.com/trw-design-wizard-2026-software
    title: TRW Design Wizard Pro 2026
    author: org:the-rhinestone-world
  - id: trw-tutorial
    resource: https://www.therhinestoneworld.com/using-line-adjustable-fonts-tutorial
    title: TRW line-adjustable fonts tutorial
    author: org:the-rhinestone-world
  - id: silhouette-2014
    resource: https://www.silhouetteschoolblog.com/2014/07/how-to-make-custom-rhinestone-designs.html
    title: Silhouette School, 14 Jul 2014
    author: org:silhouette-school
  - id: silhouette-2017
    resource: https://www.silhouetteschoolblog.com/2017/10/make-realistic-rhinstone-mock-ups-silhouette-studio.html
    title: Silhouette School, Oct 2017
    author: org:silhouette-school
  - id: silhouette-america
    resource: https://www.silhouetteamerica.com/software
    title: Silhouette America software
    author: org:silhouette-america
  - id: swingdesign
    resource: https://swingdesign.com/products/silhouette-studio-designer-edition-plus-emailed
    title: Swing Design, Silhouette Studio Designer Edition Plus
    author: org:swing-design
  - id: edutech-inkstitch
    resource: https://edutechwiki.unige.ch/en/InkStitch_-_hotfix
    title: EduTech Wiki, Ink/Stitch hotfix
    author: org:edutech-wiki
  - id: ru-cricut
    resource: https://rhinestonesu.com/blog/how-to-make-rhinestone-transfers-with-cricut-or-silhouette/
    title: Rhinestones Unlimited, transfers with Cricut or Silhouette
    author: org:rhinestones-unlimited
  - id: macromonster
    resource: https://macromonster.com/product/ecut-for-coreldraw-1-installation/
    title: MacroMonster, eCut for CorelDRAW
    author: org:macromonster
  - id: signmax
    resource: https://signmax.ca/index.aspx
    title: Signmax, WinPCSIGN
    author: org:signmax
  - id: gk-blog-2026
    resource: https://blog.gkelite.com/how-to-personalize-team-leotards-gymnastics-gear/
    title: GK blog, 10 Sep 2026
    author: org:gk-elite
  - id: gk-awestruck
    resource: https://www.gkelite.com/products/yhkv
    title: "GK #9654S Awestruck"
    author: org:gk-elite
  - id: foley
    resource: https://foley.com/?p=108824
    title: Foley & Lardner, 14 Aug 2024
    author: org:foley-lardner
---

# Takeaway

Every existing rhinestone tool is **2D and built for flat T-shirt transfers**: it converts vector
paths and shapes into rows or fills of circles at a chosen stone size, flags overlaps, and outputs a
cut template or a setting-machine file. None handles a stretched 3D garment.[^ecs] Their verified
feature set is the **baseline to match**; 3D placement is what would be new.

# Tools

**Sierra Hotfix Era** (standalone; also inside Stitch Era / Design Era) — the engine bundled with
production machines:
- "Advanced design software for the creation of hotfix motifs with rhinestone, sequin and spangle";
  Standard and Plus, perpetual or subscription.[^sierra]
- Digitising by points (arcs/Béziers), hands-free digitising, auto-tracing raster, vector conversion;
  fills uniform (several), concentric, flat, flexible, "textures and more"; highlights stones that
  overlap or are too close; simulation view; pre-digitised and TrueType fonts; vectoriser; stencils
  for vinyl cutters/lasers and files for rhinestone and sequin machines.[^sierra-hfe]
- In use: "Single Hotfix Fill" and "Assorted Hotfix Fill"; Uniform, Hexagonal, Flexible, Flat, "HF
  inner ring fill"; distance between stones and from borders; "Manual hotfix" single-stone add plus
  move/delete edit mode; overlap warning with "Solve overlap"; bead palette with user-defined beads;
  one SVG per bead type; cutting margin ≈+0.3 mm radius; SVG/DXF output.[^edutech-stitchera]
- Older sequin tools: "Sequins in a path", grid, radial, linear, flexible fills, "Variable Spacing
  effects", "Auto-borders on areas"; exports to AASP-300 and Graphtec CE5000/CE6000 (Windows XP–7
  era listing, US$400–700, discontinued).[^aasp-hfe]
- Works with most plotters/cutters (.plt), CAMS machines and ProSpangle; "Design Era" combines it
  with Stitch Era Liberty embroidery.[^coldesi-designera] Current bundles need Windows 10/11 64-bit.[^coldesi-cams]

**TRW Design Wizard Pro 2026** (CorelDRAW add-on, subscription) — **[UNVERIFIED]**, search summaries
only: Island Fill, Path Fill, Hatch Fill, Scatter Effects, Contour, Knock-Out Design Creator, Mock-Up
Creator, Advanced Pricing Calculator;[^trw-wizard] "Mark top overlapping stones red", "Select Same
Size", "Stone Outline with Contour", single-line stone text.[^trw-tutorial]

**Silhouette Studio** (V5.0.539): Designer Edition "Edge" converts cut lines to stones; linear and
radial fills; 6ss/10ss/16ss; spacing slider; "Release Rhinestones" makes each stone movable; single
click adds stones; freehand trail tool.[^silhouette-2014][^silhouette-america] Designer Edition Plus
"Advanced Rhinestone": custom stone shapes, "photo-realistic preview", path/fill/individual placement,
combining stones into patterns, spacing and orientation; cut line per stone; upgrade US$24.99.[^swingdesign][^silhouette-2017]

**Inkscape + Ink/Stitch** (free): tiled clones for regular fills, "Distribute along path", contour/
tatami fills as guides, spray tool with "No overlap", density maps ("probably the best once you get
the hang of it"); pattern fills rejected because circles distort; no stone counting.[^edutech-inkstitch]

**Others**: Cricut Design Space has no dedicated tool (one circle per stone, time-consuming);[^ru-cricut]
eCut for CorelDRAW v7.4.12.58 (Jul 2026, US$69.95; rhinestone function not confirmed);[^macromonster]
WinPCSIGN still listed as 2018 editions.[^signmax]

**GK UDesign™/UDesign360**: a 3D studio to view a special-order design and choose "color, fabric and
embellishment combination"; "jewel placement" questions go to a sales rep; placement is done in-house
with "a computer-aided design program".[^gk-blog-2026][^gk-awestruck][^foley] **[INFERRED]** a
configurator over preset jewel patterns, not a free stone editor.[^ecs]

# Feature baseline for our brushes

**[INFERRED]**:[^ecs]

1. Path brush: stone size, centre spacing or gap, offset rows, start/end fitting.
2. Outline-with-contour (border stones plus inset rows).
3. Area fills: grid, hex, contour/concentric, radial, linear hatch at an angle, flexible, random
   scatter with no-overlap distance and a density map.
4. Assorted (mixed size/colour) fills.
5. Per-stone add/move/delete after "releasing" a fill.
6. Overlap/too-close highlighting with one-click resolve.
7. Knock-out of one element from another.
8. Stone palette with custom stone definitions.
9. Stone counts per size/colour and a price calculator.
10. Realistic preview.
11. Export per stone type for templates (SVG/DXF/PLT with hole margin) and for setting machines.

What none does (our value): placement on a 3D body with pattern-piece mapping, stretch spacing
compensation ([trap](/domain/embellishments/stretch-spacing-trap.md)), seam/elastic keep-outs, split
into machine field vs hand-set accents ([rules](/domain/embellishments/stone-placement-rules.md)),
physically based sparkle preview under arena lighting.[^ecs]

Not examined: Digital Art Solutions/Stone Stencil, SmartCut, Easy Stone, OOBling Pro, Roland R-Wear
Studio, CorelDRAW rStones, Illustrator plug-ins, Sure Cuts A Lot, Wilcom/Pulse/Tajima sequin tools;
machine file formats; 3D garment CAD rhinestone tools (covered in part in
[/references/research/existing-tools-and-ux-mechanics.md](/references/research/existing-tools-and-ux-mechanics.md)).[^ecs]

[^ecs]: Research notes: embellishments, crystals and sequins, section 10 (in-bundle mirror)
[^sierra]: Sierra Software home (manufacturer)
[^sierra-hfe]: Sierra Hotfix Era product page (manufacturer)
[^edutech-stitchera]: EduTech Wiki, Stitch Era hotfix (hobbyist)
[^aasp-hfe]: All American Print Supply listing (retailer, discontinued)
[^coldesi-designera]: ColDesi, Design Era suite (retailer)
[^coldesi-cams]: ColDesi CAMS 1V-6P (retailer)
[^trw-wizard]: TRW Design Wizard Pro 2026 (search summary only)
[^trw-tutorial]: TRW tutorial (search summary only)
[^silhouette-2014]: Silhouette School 2014
[^silhouette-2017]: Silhouette School 2017
[^silhouette-america]: Silhouette America software page
[^swingdesign]: Swing Design (retailer)
[^edutech-inkstitch]: EduTech Wiki, Ink/Stitch hotfix (hobbyist)
[^ru-cricut]: Rhinestones Unlimited, Cricut/Silhouette (retailer)
[^macromonster]: MacroMonster eCut page
[^signmax]: Signmax
[^gk-blog-2026]: GK blog, 10 Sep 2026
[^gk-awestruck]: GK Awestruck
[^foley]: Foley & Lardner, 14 Aug 2024
