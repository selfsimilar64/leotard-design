---
type: Decision
title: "Draw first, decide how it sews"
description: "Owner direction of 2026-10-31: create the conditions for effortless, arbitrary designs that reflect real leotard technique. The drawing tools share one grammar (lines land, the areas they enclose light up, a tap picks one), a line can use existing seams without tracing them, and how a thing is made stays a separate choice."
tags: [decision, ux, tools, construction, overlay]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-31T23:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-31 (Claude Code session)
    title: "Simply create the conditions that will allow the user to effortlessly and intuitively create arbitrary designs"
    author: human:mattj
  - id: report
    resource: /references/research/techniques-and-workflow-report.md
    title: "Research report: Draw first, decide how it sews"
---

# Decision

The drawing tools follow [one grammar](/engineering/ux/one-drawing-grammar.md): lines land, the areas they enclose light
up, a tap picks an area. Existing seams count as edges automatically, so nothing is traced. The left tool rail stays
removed for now.

# Context

The owner, rebuilding a reference design, asked for an overlay to be defined all at once: "I just want to draw the two
vertical lines, and somehow choose or automatically accumulate the shared seams into the loop." They then set the
standard: "Simply create the conditions that will allow the user to effortlessly and intuitively create arbitrary designs
that reflect the actual techniques used in leotard design."[^owner]

Research found that treating enclosed areas as things to pick is proven in 2D illustration (Live Paint, Affinity Flood
Fill) and untested on a 3D body, and that fashion CAD asks for the tracing the owner objected to.[^report] An earlier
recommendation in this session, a small visible tool rail, was withdrawn on that evidence: the rail's removal is not
contradicted, though the iPad tools that could be read keep a visible home for creation, so a Draw control on the stage
is worth testing.[^report]

# Consequences / how to apply

- **Two starting commands for now**, seam (cuts as it lands) and overlay (cuts nothing), as the smaller of the two forms the research describes. A single Draw whose lines become seams when the tool ends is the larger form, to be tested later.[^report]
- **With Mirror on, a line touching the centre is a half-line**, not one part; it meets its own mirror image at the centre. This replaces the 2026-10-30 rule in [the Mirror toggle](/engineering/architecture/mirror-toggle.md) for lines being drawn, because that rule silently dropped a plate's second side.
- **A new plate has its own material**, so choosing its fabric cannot change the piece it is sewn on.
- **Refining the 2026-10-31 construction decision:** a shape sewn on top leaves the base whole at cutting; what is finished may differ, since makers often trim beneath it ([builds](/domain/construction/builds-for-one-look.md)).

# Revisit if

- Designers given the plate task instinctively outline instead of picking an area, or a tap's two meanings (add a point, pick an area) prove confusing.
- The owner wants a single Draw command, or a working designer says the choice of build is made differently ([open question](/product/questions/how-designers-choose-a-build.md)).

[^owner]: Owner's messages, 2026-10-31
[^report]: Research report, Draw first, decide how it sews
