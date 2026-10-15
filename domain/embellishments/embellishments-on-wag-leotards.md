---
type: Domain Concept
title: Embellishments on WAG competition leotards
description: "Overview: competition leotards carry heat-applied flat-back crystals first, hole-less spangles second, plus nailheads, pearls, appliqué and embroidery; trade vocabulary and the object types the app should model."
tags: [embellishment, crystal, spangle, terminology]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: ecs
    resource: /references/research/embellishments-crystals-sequins.md
    title: "Research notes: embellishments, crystals and sequins"
    author: claude-code/claude-opus-5-5
  - id: gk-stock
    resource: https://www.gkelite.com/collections/gk-stock-collection
    title: GK Elite stock collection
    author: org:gk-elite
  - id: gk-resilient
    resource: https://www.gkelite.com/products/qxli
    title: "GK Resilient Competition Leotard #4947S"
    author: org:gk-elite
  - id: gk-illuminated
    resource: https://www.gkelite.com/products/real
    title: "GK Illuminated Competition Leotard #7659"
    author: org:gk-elite
  - id: gk-distinguished
    resource: https://www.gkelite.com/products/lcmr
    title: "GK Distinguished Competition Leotard #7681S"
    author: org:gk-elite
  - id: foley
    resource: https://foley.com/?p=108824
    title: Foley & Lardner, 14 Aug 2024
    author: org:foley-lardner
  - id: nam
    resource: https://nam.org/?p=31672
    title: NAM, 30 Jul 2024 (citing The Washington Post)
    author: org:nam
  - id: sylviap-nia
    resource: https://teamwear.sylviap.com.au/products/nia-dennis-leotard-3q-sleeve
    title: Sylvia P teamwear, Nia Dennis leotard
    author: org:sylvia-p
  - id: snowflake
    resource: https://www.snowflakedesigns.com/gymnastics-competition-leotards.html
    title: Snowflake Designs competition leotards
    author: org:snowflake-designs
  - id: cgn-2026-02
    resource: https://collegegymnews.com/2026/02/18/leotard-rankings-week-7-7/
    title: College Gym News, 18 Feb 2026
    author: org:college-gym-news
  - id: edutech-hotfix
    resource: https://edutechwiki.unige.ch/en/Hotfix_stone
    title: EduTech Wiki, Hotfix stone
    author: org:edutech-wiki
  - id: coldesi-spangle
    resource: https://shop.coldesi.com/blogs/news/what-are-spangle-transfers
    title: ColDesi, What are spangle transfers
    author: org:coldesi
  - id: wiki-sequin
    resource: https://en.wikipedia.org/wiki/Sequin
    title: Wikipedia, Sequin
    author: org:wikipedia
  - id: preciosa-manual
    resource: https://www.preciosa-eshop.com/user/related_files/preciosa-hotfix-application-manual-complete-en-2.pdf
    title: Preciosa Hotfix Application Manual (PDF, 2019)
    author: org:preciosa
---

# Takeaway

On competition women's artistic gymnastics (WAG) leotards the dominant embellishment is the
**heat-applied flat-back crystal**: CAD layout, a machine that sets stones onto heat-transfer film,
a heat press, and hand placement with tweezers for larger stones and pearls.[^foley][^nam][^ecs]
Second come **spangles** (hole-less heat-applied discs) for team names and logos. Every piece of
WAG process evidence found is heat transfer; sew-on stones, cup chain, banding, sewn sequins and
sequin fabric appear only in dance, skating and rhythmic sources.[^ecs]

# Object types the app should model

**[INFERRED]** (research-note inference, not a sourced fact):[^ecs]

| Object | Kind | Concept |
|---|---|---|
| Round hotfix crystal (several grades) | Placed element | [anatomy](/domain/embellishments/flat-back-crystal-anatomy.md), [sizes](/domain/embellishments/stone-sizes.md), [grades](/domain/embellishments/crystal-brands-and-grades.md) |
| Shaped hotfix crystal | Placed element (mostly hand-set accents) | [shapes](/domain/embellishments/stone-shapes.md) |
| Hotfix pearl | Placed accent | [other embellishments](/domain/embellishments/other-embellishments.md) |
| Nailhead / rhinestud | Placed element | [other embellishments](/domain/embellishments/other-embellishments.md) |
| Spangle (hole-less disc) | Placed element | [spangles and sequins](/domain/embellishments/spangles-and-sequins.md) |
| Appliqué, embroidery, foil/glitter print | Surface layers | [other embellishments](/domain/embellishments/other-embellishments.md) |

Secondary library entries (dance/skating techniques): sew-on stones, cup chain/banding, sewn
sequins, sequin fabric.[^ecs]

# Vocabulary by maker

- **GK Elite** (market leader, USA Gymnastics' Olympic supplier): "crystals"/"jewels", pattern codes
  `T####`/`TS####`/`J####`, "shaped jewels", "nailheads", "spanglez™", "sequinz™", embroidery,
  imprinting.[^gk-stock][^gk-illuminated][^gk-distinguished][^ecs] Pages name "brilliance crystals"
  vs "clear crystals". **[INFERRED]** brilliance probably = AB-type iridescent, clear = plain
  Crystal; T/TS codes probably heat-transfer motif numbers and J codes jewel-pattern numbers
  (unconfirmed).[^ecs]
- GK states team names and logos can be ordered "in crystals, spanglez™, or embroidery on select
  locations"; "Sequinz cannot be applied to Velvet"; foil (Mystique) and hologram fabrics "will
  dull slightly in jeweled areas due to heat application"; "DryTech may shrink when heat is
  applied".[^gk-resilient][^ecs]
- **[UNVERIFIED]** GK "Premium" crystals with "4x the facets of the Standard Crystal and 2.5x the
  brilliance" vs "Standard": search-summary only; nine direct GK page fetches did not show this
  wording.[^ecs] See [brands and grades](/domain/embellishments/crystal-brands-and-grades.md).
- **Sylvia P** (Australia): crystal tiers "Logo Only", "Light", "Heavy", "Showpiece", each in
  "Standard" or "Swarovski®".[^sylviap-nia]
- **Snowflake Designs**: "rhinestone" ("Rhinestone & Deco Leotards").[^snowflake]
- **NCAA commentary**: "rhinestones", "stones", "stoning"/"stoned logo", "sparkles", "jewels",
  "beaded neckline".[^cgn-2026-02]

# Definitions

- Hotfix = decorations (rhinestones, rhinestuds, nailheads) with a faceted front, a flat usually
  foil-backed back and a glue layer that melts into the fabric.[^edutech-hotfix]
- Spangle (decoration trade) = "a sequin without the hole in the middle"; hotfix sequins still have
  a hole.[^coldesi-spangle] Costuming usage differs: sequin = centre hole, spangle = hole at the
  top, paillette = large and flat.[^wiki-sequin]
- Preciosa's component taxonomy: flat-back stones (no-hotfix / hotfix / sew-on), nacre pearls, cup
  chains, plastic and metal bandings, crystal net, hotfix transfers, crystal sheet.[^preciosa-manual]

# What is avoided and why

- Weight: a ~10,000-crystal Olympic leotard weighs about a pound because of the crystals (see
  [counts](/domain/embellishments/crystal-counts-and-tiers.md)).[^ecs]
- Fabric restrictions on heat application (velvet, foil, mesh): see
  [placement rules](/domain/embellishments/stone-placement-rules.md).
- **[INFERRED]** Sewn items are probably avoided for snagging on apparatus and hair, stiffness
  across stretch and hand-labour cost; no source states which embellishments WAG makers refuse,
  and no rule text limiting crystals was found (FIG 2025–2028 attire article not retrieved).[^ecs]

Related: [/domain/fabrics/](/domain/fabrics/about.md), [/domain/construction/](/domain/construction/about.md),
[professional designer persona](/product/personas/professional-designer.md).

[^ecs]: Research notes: embellishments, crystals and sequins, section 1 (in-bundle mirror)
[^gk-stock]: GK Elite stock collection
[^gk-resilient]: GK Resilient #4947S product page
[^gk-illuminated]: GK Illuminated #7659 product page
[^gk-distinguished]: GK Distinguished #7681S product page
[^foley]: Foley & Lardner, 14 Aug 2024
[^nam]: NAM, 30 Jul 2024
[^sylviap-nia]: Sylvia P Nia Dennis leotard page
[^snowflake]: Snowflake Designs competition leotards
[^cgn-2026-02]: College Gym News, 18 Feb 2026
[^edutech-hotfix]: EduTech Wiki, Hotfix stone (hobbyist source)
[^coldesi-spangle]: ColDesi, What are spangle transfers (retailer)
[^wiki-sequin]: Wikipedia, Sequin
[^preciosa-manual]: Preciosa Hotfix Application Manual (manufacturer)
