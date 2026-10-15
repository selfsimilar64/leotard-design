---
type: Domain Concept
title: Negative ease
description: "Leotard pieces are cut smaller than the body; published reductions range from 0-10% to about 15-22% of width and 0-11% of length, there is no standard, and the figure must be set per fabric (and so per panel)."
tags: [construction, patternmaking, ease, stretch, sizing]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: watkins
    resource: http://nopr.niscpr.res.in/bitstream/123456789/13231/1/IJFTR%2036%284%29%20366-379.pdf
    title: "Watkins 2011, Indian J. Fibre & Textile Research 36:366-379"
  - id: mueller
    resource: https://www.muellerundsohn.com/en/wp-json/wp/v2/posts/204
    title: "Müller & Sohn, Pattern Cutting for Body Fashion (Rundschau 2/2015, page dated 12 Jun 2022)"
    author: org:mueller-und-sohn
  - id: dpm-blocks
    resource: https://dresspatternmaking.com/blog/stretch-basics-for-patternmaking-2-blocks
    title: "Dresspatternmaking.com, Stretch Basics 2"
    author: org:dresspatternmaking
  - id: dpm-width
    resource: https://dresspatternmaking.com/blog/reduction-in-width-for-stretch-blocks
    title: "Dresspatternmaking.com, Reduction in Width"
    author: org:dresspatternmaking
  - id: mood
    resource: https://www.moodfabrics.com/blog/?p=9524
    title: Mood Fabrics compression-leggings worksheet (snippet only)
    author: org:mood-fabrics
  - id: porter-alter
    resource: https://spandexsimplified.com/basic-pattern-alterations/
    title: "Spandex Simplified, Basic Pattern Alterations, 16 Jan 2021"
    author: org:spandex-simplified
  - id: jalie-3901
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_3901.pdf?v=1605550698
    title: Jalie 3901 size/yardage sheet
    author: org:jalie
  - id: jalie-2792
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_2792.pdf
    title: Jalie 2792 envelope back
    author: org:jalie
  - id: treasurie
    resource: https://blog.treasurie.com/how-to-make-a-leotard/
    title: Treasurie leotard sew-along
    author: org:treasurie
  - id: peekaboo
    resource: https://peekaboopatternshop.com/leotard-patterns
    title: Peek-a-Boo Pattern Shop leotard patterns
    author: org:peek-a-boo
  - id: gk-fit
    resource: https://www.gkelite.com/pages/gk-gym-the-gk-fit
    title: "GK Elite, The GK Fit"
    author: org:gk-elite
  - id: gk-sizing
    resource: https://gkelite.azureedge.net/images/static/gkforms/gk-gymnastics-womens-sizing-measuring-instruction.pdf
    title: GK women's sizing instructions
    author: org:gk-elite
  - id: chalkbucket
    resource: https://chalkbucket.com/threads/tips-for-making-a-leotard.44234/
    title: "ChalkBucket, Tips for making a leotard, Jan-Feb 2014"
    author: org:chalkbucket
  - id: clo-flatten
    resource: https://support.clo3d.com/hc/en-us/articles/115008890627-Flatten
    title: CLO Help Center, Flatten
    author: org:clo
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 1, 2 and 10"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 4"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**There is no agreed industry standard for leotard negative ease.** Published reductions range from
0–10% of girth (home-sewing rules) through about 15–22% of width and 0–11% of length (German trade
press and the one quantitative CAD method found), and every source says the figure must be set per
fabric by stretch-testing and fitting. No leotard manufacturer publishes its own figure.[^pc-notes]
The software must therefore hold stretch as a property of each fabric, compute separate width and
length factors per panel, and let the manufacturer override them.

# What negative ease is

Stretch garments are cut smaller than the body and rely on fabric extension for the final size. The
conventional route: take a woven block, remove ease and darts, true the outline, then shrink it
proportionally in width and length by a subjectively chosen stretch percentage; alternatives are
draping the stretch fabric on a stand or using a smaller-size block.[^watkins][^pc-notes] Knit blocks
are dartless and carry zero ease at the "stable knit" level; each stretch category needs its own
block.[^dpm-blocks][^pc-notes] Patterns drawn directly on a 3D avatar (CLO's Flatten) come out with
no ease at all; users add it by slash-and-spread or by modifying the avatar first.[^clo-flatten][^gg-notes]

# Published reduction figures (sources disagree)

| Source | Width / girth reduction | Length reduction | Context |
|---|---|---|---|
| Müller & Sohn (trade press)[^mueller] | about 15–20% | 0–5% | high-stretch / four-way-stretch bodywear |
| Watkins 2011 worked example[^watkins] | ×0.78 (≈22% narrower) | ×0.89 (≈11% shorter) | poly/elastane sport knit, 56% course, 20% wale, 40% bias stretch under 250 g; adult; 60:40 girth:length |
| Pratt & West, reported by Watkins[^watkins] | 20% off all circumferences | typically 20–25% | medical pressure garments; authors say it needs subjective adjustment |
| Dresspatternmaking (unnamed textbook)[^dpm-blocks] | 0% stable (18–25% stretch), 2% moderate (26–50%), 3% stretchy (51–75%), 5% super-stretchy (76–100%) | none given; four-way garments such as leotards need a further length reduction | home sewing |
| Dresspatternmaking (second article)[^dpm-width] | 2%, 3%, 5%, 10% for the same categories | none given | conflicts with its own first article |
| Mood Fabrics leggings worksheet[^mood] | 10% default | — | leggings, snippet only **[UNVERIFIED]** |

All rows via the research note.[^pc-notes] Müller & Sohn's rule of thumb: "10% stretch = scale
1:0.9", width and length scaled separately.[^mueller] A leotard-specialist author (Porter) gives no
percentage at all: start from the pattern's size chart, make a practice garment in a fabric of the
same weight and stretch, size down in width only if needed, and do not size down in length unless
measurements say so.[^porter-alter][^pc-notes]

The method most suitable for computation is [Watkins' stretch-reduction method](/domain/construction/watkins-stretch-reduction-method.md).

# Why it must be per fabric, and per panel

- **Fabrics differ a lot.** Measured stretch in five poly/elastane sport knits (180–260 g, 12–20%
  elastane): course 18–56%, wale 10–32%, bias 14–57%.[^watkins][^pc-notes] Plain lycra is stretchier
  than shiny foil fabrics, and a fabric slightly less stretchy than the pattern assumes throws the
  sizing off.[^chalkbucket][^pc-notes] Some fabrics lose length when stretched in width.[^mueller][^pc-notes]
- **Mixed-material garments:** Müller & Sohn draft to body measurements with no deduction, then
  reduce each piece by its own material's stretch factor.[^mueller][^pc-notes] Brands mix mesh, foil
  and velvet in one garment, so **[INFERRED]** reduction factors belong to each panel (its fabric
  assignment), with seam lengths re-trued between neighbouring panels after scaling.
- **Pattern minimum stretch gauges:** Jalie 3901 requires at least 50% stretch in both directions
  and prints a "fabric should stretch to here" ruler; Jalie 2792 required 70% four-way (2007 envelope)
  while its current listing says 60%; Treasurie at least 75%; Peek-a-Boo 50–75% with about 80/20
  nylon/spandex.[^jalie-3901][^jalie-2792][^treasurie][^peekaboo][^pc-notes]
- **Factory practice:** GK stretch-tests every incoming roll four ways by hand and returns failing
  rolls; full-time fit specialists and live models check each style, fabric and custom design.[^gk-fit][^pc-notes]
  GK states fit and feel vary significantly with fabric type and embellishment, yet keeps one
  body-measurement size chart.[^gk-sizing][^pc-notes]
- **Length cannot be recovered by stretch:** stretch absorbs small width errors but not torso-length
  errors, so oversizing for growth is discouraged.[^peekaboo][^pc-notes]
- **Small radii need less reduction:** pressure = tension / radius (Laplace), so wrists, ankles and
  small children get less reduction for the same pressure.[^watkins][^pc-notes] **[INFERRED]** A
  uniform percentage therefore over-compresses child sizes and arms; ease may need to vary by size
  and body region.[^gg-notes]
- **No numeric correction exists** for foil, velvet, mesh, heavy stoning or overlays; the practical
  encoding is the per-panel stretch-derived factor, not a size bump.[^pc-notes]

# What the software should hold **[INFERRED]**

- A fabric record with stretch % in course, wale and both biases at a stated load; computed X and Y
  factors per fabric (Watkins as documented default), overridable by the manufacturer.
- Published examples bracket outputs at roughly ×0.78–0.95 in width and ×0.89–1.00 in length.
- Long/short torso as a one-size length grade (see [grading](/domain/construction/grading-across-sizes.md)).
- How the factors are applied to flattened pieces: [stretch compensation](/engineering/geometry/stretch-compensation.md).

[^watkins]: Watkins 2011, Indian Journal of Fibre & Textile Research.
[^mueller]: Müller & Sohn, Pattern Cutting for Body Fashion.
[^dpm-blocks]: Dresspatternmaking.com, Stretch Basics 2.
[^dpm-width]: Dresspatternmaking.com, Reduction in Width for stretch blocks.
[^mood]: Mood Fabrics blog (snippet only).
[^porter-alter]: Spandex Simplified, Basic Pattern Alterations.
[^jalie-3901]: Jalie 3901 size/yardage sheet.
[^jalie-2792]: Jalie 2792 envelope back.
[^treasurie]: Treasurie leotard sew-along.
[^peekaboo]: Peek-a-Boo Pattern Shop.
[^gk-fit]: GK Elite, The GK Fit.
[^gk-sizing]: GK women's sizing instructions.
[^chalkbucket]: ChalkBucket forum thread, 2014.
[^clo-flatten]: CLO Help Center, Flatten.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
