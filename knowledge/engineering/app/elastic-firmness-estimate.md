---
type: Engineering Note
title: How firm leotard elastic is against the fabric (estimate)
description: "Search of 2026-11-11 for the pull of 3/8 in swim elastic against leotard fabric, to set the fit's elastic firmness: no maker publishes force data for either narrow elastic or tricot in usable form; from rubber swim elastic's size (9.5-10 x 0.5-0.8 mm) and natural rubber's stress at 100% stretch (about 0.7-1 MPa) the elastic pulls about 3-8 N per unit stretch (up to about 16 N at small stretch); Carvico's tricots pull about 300-800 N/m at their test stretch. So the elastic is as stiff as 4-27 mm of fabric, more where the fabric is softer at small stretch, plus about 10 mm for the turned hem: firm 1-2 most likely, 3-4 at the stiff end."
tags: [elastic, fabric, mechanics, fit, estimate]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T15:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-11 (Claude Code session)
    title: "What do you think is the firmness multiplier of an actual band versus the fabric in real life? ... see if you can find any more information online ... otherwise we'll just go by eye."
    author: human:mattj
  - id: core-swim
    resource: https://corefabricstore.com/products/natural-rubber-swim-elastic
    title: Core Fabric Store, natural rubber swim elastic (10 mm, 0.5 mm thick)
    author: org:core-fabric-store
  - id: core-textured
    resource: https://corefabricstore.com/products/textured-natural-rubber-swim-elastic
    title: Core Fabric Store, textured natural rubber swim elastic (10 mm, 0.8 mm thick)
    author: org:core-fabric-store
  - id: nr-m100
    resource: https://pmc.ncbi.nlm.nih.gov/articles/PMC4780003/table/t2
    title: A natural rubber sample's tensile modulus at 100% strain, 0.71 +/- 0.04 MPa (table of a PMC study)
  - id: astm-d4964
    resource: https://www.universalgripco.com/astm-d4964
    title: ASTM D4964 elastic fabric loop tension test (the standard such data would come from)
  - id: stretch
    resource: /domain/fabrics/stretch-properties.md
    title: "Stretch properties: Carvico tricots under 3.6 kg on a 100 x 50 mm strip"
  - id: code
    resource: "pipeline/wrap_block.py ELASTIC_WIDTH (20 mm); app/src/render/fitted.js option firm"
    title: The fit's elastic stiffness
---

# Takeaway

**Real 3/8 in swim elastic on a leotard is most likely 1-2 times the fit's current elastic firmness, 3-4 times at the stiff
end** (thick rubber elastic on a soft fabric). No published force data for narrow elastic or leotard tricot was found; this is
worked out from the elastic's size and rubber's stiffness. **[INFERRED]** The owner chose to go by eye between 2, 3 and 4 times.[^owner]

# The fit's elastic

`wrap_block.ELASTIC_WIDTH` 20 mm: each span pulls as hard as a 20 mm wide strip of the fabric would, the fabric's stretch modulus being
the energy's unit; `firm` multiplies it.[^code] So firm F means the elastic is as stiff as 20 F mm of fabric.

# Estimate (2026-11-11)

- **Elastic.** Rubber swim elastic is sold 9.5-10 mm wide and 0.5-0.8 mm thick.[^core-swim][^core-textured] Natural rubber's stress
  at 100% stretch is about 0.7 MPa in one measured sample;[^nr-m100] 0.7-1 MPa as a range **[INFERRED]**. Force per unit stretch:
  4.75-8 mm^2 x 0.7-1 MPa = about 3-8 N; rubber is stiffer at small stretch (about twice), so up to about 16 N there. Braided and
  knitted elastics (polyester round latex threads) were not found with force data either.[^astm-d4964]
- **Fabric.** Carvico's tricots stretch 85-140% across and 135-230% along under 35 N on a 50 mm strip:[^stretch] 700 N/m over that
  stretch, about 300-800 N/m per unit stretch. Knits are softer at the 15-30% a leotard works at (loops straighten before the yarn
  stretches), so lower there **[INFERRED]**; the fit's own note gives 100-400 N/m.
- **Ratio.** 3-8 N against 300-800 N/m: 4-27 mm of fabric; against softer fabric at working stretch, up to about 80 mm. The turned hem
  doubles the fabric over the elastic's width, about 10 mm more, and the stitching stiffens it a little. Most likely 20-40 mm: **firm
  1-2**; 60-80 mm (**firm 3-4**) needs the thick elastic and the soft end of the fabric.

# What would settle it

A maker's data sheet giving force at stretch (ASTM D4964 for elastic, a strip test for the fabric), or a home measurement (a known
weight hung from a measured length of each). The owner ruled out physical testing for now.

[^owner]: Conversation with the product owner, 2026-11-11.
[^core-swim]: Core Fabric Store, natural rubber swim elastic.
[^core-textured]: Core Fabric Store, textured natural rubber swim elastic.
[^nr-m100]: PMC study table, natural rubber at 100% strain.
[^astm-d4964]: ASTM D4964 elastic fabric loop tension test.
[^stretch]: Stretch properties (Carvico data sheets).
[^code]: The fit's elastic stiffness in code.
