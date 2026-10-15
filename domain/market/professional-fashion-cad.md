---
type: Domain Concept
title: Professional 3D fashion CAD
description: "CLO, Marvelous Designer, Browzwear VStitcher, Style3D and Optitex share one pattern-first, cloth-simulation model with weeks of learning and no purpose-built rhinestone tooling; useful as an export target, not as a competitor for fast decorative design."
tags: [market, competitors, fashion-cad, clo, browzwear]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-10-15T00:00:00Z
sources:
  - id: notes-tools
    resource: /references/research/existing-tools-and-ux-mechanics.md
    title: "Research notes: existing tools and UX mechanics (section 5)"
  - id: notes-native
    resource: /references/research/native-engine-options.md
    title: "Research notes: native engine options (section 8, fashion tools)"
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
  - id: clo-pricing
    resource: https://clo3d.com/pricing
    title: CLO pricing
    author: org:clo-virtual-fashion
  - id: clo-support-cost
    resource: https://support.clo3d.com/hc/en-us/articles/115012815487-How-much-does-CLO-cost
    title: CLO support, how much does CLO cost (search snippet)
  - id: clo-news
    resource: https://clo3d.com/en/resources/notices/1374
    title: CLO 2026.0 newsroom notice (search snippet)
  - id: cgchannel-md
    resource: https://www.cgchannel.com/?p=178281
    title: CG Channel on Marvelous Designer 2026.1 (24 Aug 2026)
  - id: dp-md
    resource: https://digitalproduction.com/2026/04/15/marvelous-designer-2026-0-adds-3d-pencil-and-lacing/
    title: Digital Production on Marvelous Designer 2026.0 (15 Apr 2026)
  - id: md-student
    resource: https://tirto.id/marvelous-designer-expands-student-plan-adds-limited-three-month-free-offer-hzsc
    title: Report on Marvelous Designer student plan change (search snippet)
  - id: md-site
    resource: https://www.marvelousdesigner.com/
    title: Marvelous Designer
  - id: bw-pricing
    resource: https://browzwear.com/blog/browzwear-pricing-plan
    title: Browzwear pricing plan post (9 Feb 2026)
  - id: bw-notes
    resource: https://help.browzwear.com/en/articles/16111588-vstitcher-2026-2-release-notes
    title: VStitcher 2026.2 release notes (search snippet)
  - id: bw-vstitcher
    resource: https://browzwear.com/products/v-stitcher
    title: Browzwear VStitcher product page
  - id: style3d
    resource: https://www.style3d.com/
    title: Style3D
  - id: optitex
    resource: https://optitex.com/
    title: Optitex
  - id: techyorker
    resource: https://techyorker.com/products/clo-3d/
    title: Techyorker CLO 3D listing
  - id: ki-syndikat
    resource: https://www.ki-syndikat.de/tools/clo-3d/
    title: KI-Syndikat CLO 3D review (checked 13 Jun 2026)
  - id: eighty-lv
    resource: https://80.lv/articles/new-marvelous-designer-update-lets-artists-rip-pinch-shape-fabric-like-never-before/
    title: 80.lv on Marvelous Designer 2026.1 (24 Aug 2026)
  - id: clo-rhinestone
    resource: https://support.clo3d.com/hc/en-us/community/posts/16324669191065-Rhinestone-placement
    title: "CLO community thread: Rhinestone placement (search snippet; HTTP 403)"
  - id: clo-obj-topstitch
    resource: https://support.clo3d.com/hc/ko/community/posts/900002294646-Custom-OBJ-as-TOPSTITCH
    title: "CLO community: Custom OBJ as topstitch (search snippet)"
  - id: clo-trim
    resource: https://support.clo3d.com/hc/en-us/articles/360051846314
    title: CLO Trim Guide (search snippet; HTTP 403)
  - id: clo-material-type
    resource: https://support.clo3d.com/hc/en-us/articles/115015998728-Material-Type
    title: CLO material type article (cited in report)
---

# Takeaway

The professional tools all share one model: **draw or import 2D pattern pieces, sew them
virtually, simulate the cloth on an avatar**. That demands pattern-making knowledge and weeks of
learning, and none has a purpose-built bulk rhinestone tool.[^notes-tools] They excel at accurate,
graded, production-ready patterns, which makes them a plausible **export target** for a
manufacturer's pipeline rather than something to replicate.[^notes-tools]

# Versions and pricing (2026)

| Tool | Current version | Pricing |
|---|---|---|
| CLO | 2026.0: "28 new features", including sketching garments on the avatar and converting to patterns, automatic points of measure and grading, fabric-specific strain maps, lacing, gluing pieces (snippet)[^clo-news] | Student $25/month; Individual $50/month; yearly "Save 25%"; Enterprise custom.[^clo-pricing] Individual plan $450/year and barred to any legal entity with two or more employees (snippet)[^clo-support-cost] |
| Marvelous Designer (also CLO Virtual Fashion) | 2026.1 (24 Aug 2026): Brush Pinching, experimental Seamline Rip, Metal GPU simulation on macOS. 2026.0 (15 Apr 2026): 3D Pencil, Lacing, toon materials[^cgchannel-md][^dp-md] | Personal $39/month or $280/year; Enterprise $199/month or $2,000/year per seat; Indie tier by request (2+ staff, under $500,000/year); rental only.[^cgchannel-md] Student $99 one-time (Apr 2026), reportedly $8.25/month from July 2026 (snippet)[^md-student] |
| Browzwear VStitcher | 2026.2 (30 Jul 2026): editable grainlines and notches, multi-fold, sublimation improvements for vector artwork (snippet)[^bw-notes] | Freelancer $75/month or $750/year; Freelancer Plus $150/month or $1,500/year; Teams $3,950 per user per year (up to three); Enterprise custom[^bw-pricing] |
| Style3D (Studio, Atelier, Fabric, Cloud, Simulator, AI) | Not stated | No public pricing; demo[^style3d] |
| Optitex (2D/3D Pattern Design, Marker, 3D for Illustrator) | Not stated | No public pricing; demo[^optitex] |

# Workflow

- CLO edits patterns in a 2D window and drapes in 3D, with grading, print layout with fabric
  consumption, tech packs and DXF/OBJ/FBX export.[^techyorker] 2D edits update the 3D simulation
  live; garments can be animated on a moving avatar, which suits sportswear and dancewear.[^ki-syndikat]
- Marvelous Designer: "stitching together virtual 2D pattern pieces, then drape them over an
  animated character", aimed at games, VFX and animation.[^cgchannel-md][^md-site] Its 3D Pencil
  sketches on the avatar (view locked front or back) and converts sketches to pattern lines;
  sketching front and back then flattening sews the sides automatically.[^dp-md]
- VStitcher: 2D drafting and 3D draping, avatars, grading, tension maps, tech packs; vendor claims
  50% fewer physical samples.[^bw-vstitcher] Style3D markets AI-driven simulation "design to
  production" and lists custom teamwear as a solution area;[^style3d] Optitex markets
  interoperable 2D/3D, grading and automatic nesting.[^optitex]
- Why direct shaping tools were added to Marvelous Designer: simulation answers "how fabric would
  behave", but artists often need "How does the artist want it to behave?"[^eighty-lv]
- Rendering stacks are not named by any vendor; Style3D ships an Unreal cloth plugin.[^notes-native]

# Learning curve

One third-party estimate: a newcomer to 3D needs **4-8 weeks** to become productive in CLO, a
steeper curve than classic 2D CAD.[^ki-syndikat] No reviews were retrievable for the others.

# Rhinestones and embellishment

- CLO users place crystals by workaround: a custom OBJ repeated as a topstitch (moderator advice
  over the Button tool). Reported defects: stones distort on curved or diagonal lines and the last
  stone in a row comes out much wider ("Smooth" or manual line edits suggested); mirror-pasted
  stones rotate sideways or upside down everywhere except centre front, no confirmed fix.
  (Snippet; thread returned HTTP 403.)[^clo-rhinestone] Users build the repeating object in Blender.[^clo-obj-topstitch]
- CLO's Trim Guide covers "Sequins as Topstitching, Sequins as Buttons, Beads, Rivets, Buttons,
  Rhinestones, Eyelets" (snippet; HTTP 403).[^clo-trim]
- The report adds that CLO's glitter and gem materials appear only in its offline renderer, and
  that a scan of the 962 article titles in CLO's help centre and 965 in Browzwear's found none
  about rhinestones, sequins, crystals or embellishment.[^clo-material-type][^report]
  **Tension:** the Trim Guide snippet above does list rhinestones, so "no help article" means no
  *title*, not no coverage.
- Nothing either way for Marvelous Designer, VStitcher, Style3D or Optitex; absence reflects thin
  sources, not confirmed absence.[^notes-tools]

# Inferences

- **[INFERRED]** Poor fit for fast decorative leotard design because: the entry point is a 2D
  pattern; drape simulation matters little for a skin-tight garment; crystals are a defect-prone
  workaround and 1,500+ stones would be authored line by line; 4-8 weeks to learn; CLO's
  individual licence excludes companies of two or more.[^notes-tools]
- **[INFERRED]** Good fit as a hand-off: graded patterns, sublimation artwork placement, strain
  maps, avatars in motion. A leotard tool could export to a manufacturer's CLO/VStitcher pipeline,
  which bears on the [seamstress view](/product/personas/seamstress.md).[^notes-tools]
- The CLO thread's failures are acceptance tests for our stone tools; see
  [procedural stone strokes](/engineering/ux/procedural-stone-strokes.md). The sketch-on-avatar
  idea is in [sketching panels on the body](/engineering/ux/sketch-panels-on-body.md).
- **[UNVERIFIED]** lead: CLO has a block-based "Modular Configurator" assembling garments from
  pre-made pattern blocks, directly relevant to piece assembly.[^notes-tools]

[^notes-tools]: Research notes, existing tools and UX mechanics, section 5
[^notes-native]: Research notes, native engine options, section 8
[^report]: Research report, "No tool examined..." section
[^clo-pricing]: CLO pricing page
[^clo-support-cost]: CLO support article, search snippet
[^clo-news]: CLO newsroom, search snippet
[^cgchannel-md]: CG Channel, 24 Aug 2026
[^dp-md]: Digital Production, 15 Apr 2026
[^md-student]: Student plan report, search snippet
[^md-site]: Marvelous Designer site
[^bw-pricing]: Browzwear pricing post, 9 Feb 2026
[^bw-notes]: VStitcher 2026.2 notes, search snippet
[^bw-vstitcher]: Browzwear VStitcher page
[^style3d]: Style3D site
[^optitex]: Optitex site
[^techyorker]: Techyorker CLO listing
[^ki-syndikat]: KI-Syndikat CLO review
[^eighty-lv]: 80.lv, 24 Aug 2026
[^clo-rhinestone]: CLO community thread, Rhinestone placement
[^clo-obj-topstitch]: CLO community, custom OBJ as topstitch
[^clo-trim]: CLO Trim Guide
[^clo-material-type]: CLO material type article
