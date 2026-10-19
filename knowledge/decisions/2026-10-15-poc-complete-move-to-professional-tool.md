---
type: Decision
title: "POC complete; build a professional, role-based tool"
description: "The proof of concept is considered finished; the next phase develops it into a professional tool for gyms and coaches, designers and seamstresses, each with a different view."
tags: [scope, roles, roadmap]
status: stable
decided: 2026-10-15
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: "Direction for the next phase"
    author: human:mattj
---

# Decision

The proof of concept (`poc-threejs/`) is considered **finished**. The next phase develops it into
a **professional tool** used by seamstresses, designers and gyms, where not every capability is
exposed to every user.[^owner]

# What the owner described

- **Gym owners and coaches** do not need sewing components; they want to design a leotard. They
  may need a much more limited set of controls that select from pre-made assets or designs while
  still allowing significant customisation.
- **Professional designers** may want to change the shape of the leotard itself: create a new back
  pattern with hand-placed straps, cut out parts of the leotard, replace sections with mesh,
  create a different neckline, and so on.
- **Seamstresses** want to see the final design as its flattened components, with measurements
  and markings.

# Consequences / how to apply

- See the [product vision](/product/vision.md), the three personas under
  [/product/personas/](/product/personas/about.md) and the
  [role capability matrix](/product/role-capabilities.md).
- The POC's garment is defined in code (analytic region fields in `poc-threejs/src/body.js`); a
  designer-editable shape and a flattened pattern output need the garment to become data. See
  [POC-to-product gap](/engineering/architecture/poc-to-product-gap.md).

[^owner]: Product owner, 2026-10-15
