---
type: Domain Concept
title: Teamwear configurators and configurator platforms
description: "owayo, Spized and white-label platforms (Kit Builder, Zakeke, Expivi, Threekit) follow one pattern for sublimated jerseys: template, zone colours, logos and names, 3D preview, human check, print-ready file. None handles leotards or physical embellishment."
tags: [market, configurator, teamwear, competitors]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-10-15T00:00:00Z
sources:
  - id: notes-tools
    resource: /references/research/existing-tools-and-ux-mechanics.md
    title: "Research notes: existing tools and UX mechanics (section 4)"
  - id: owayo
    resource: https://www.owayo.com/teamsport/lp/design-custom-tennis-jerseys-us.htm
    title: owayo 3D Designer
  - id: owayo-tt
    resource: https://owayo.com/sports/tabletennis-us.htm
    title: owayo table tennis (search snippet)
  - id: spized
    resource: https://www.spized.com/en
    title: Spized
  - id: smart-dato
    resource: https://www.smart-dato.com/en/services/3d-product-configurator
    title: Smart Dato 3D product configurator
  - id: kitbuilder
    resource: https://www.kitbuilder.com/
    title: Kit Builder
  - id: kitbuilder-pricing
    resource: https://www.kitbuilder.com/pricing
    title: Kit Builder pricing
  - id: zakeke
    resource: https://www.zakeke.com/
    title: Zakeke
  - id: zakeke-price
    resource: https://www.zakeke.com/?p=32919
    title: Zakeke comparison page (search snippet)
  - id: capterra-zakeke
    resource: https://www.capterra.com/p/162400/Zakeke/pricing/
    title: Capterra Zakeke pricing (search snippet)
  - id: threekit
    resource: https://www.threekit.com/
    title: Threekit
  - id: expivi
    resource: https://www.expivi.com/
    title: Expivi
  - id: g2-expivi
    resource: https://www.g2.com/products/expivi-3d-product-configurator/pricing
    title: G2 Expivi pricing (search snippet)
  - id: reality-atlas
    resource: https://www.reality-atlas.com/blog/best-3d-product-configurator-companies
    title: Reality Atlas configurator roundup (14 Jul 2026)
  - id: brikl
    resource: https://www.brikl.com/
    title: Brikl
  - id: style3d
    resource: https://www.style3d.com/
    title: Style3D
---

# Takeaway

Custom teamwear is a mature configurator category, all built around **sublimated jerseys**:
template, recolour zones, add logos, names and numbers, preview in 3D, human quality check,
print-ready file.[^notes-tools] None found covers leotards, embellishment, mesh layering or panel
construction, so adopting an off-the-shelf configurator would reproduce what GK, Sylvia P and
Quatro already have ([brand design studios](/domain/market/brand-design-studios.md)).[^notes-tools]

# Vendors

| Vendor | Kind | Notable facts |
|---|---|---|
| owayo (Germany) | Brand, free "3D Designer" | "Hundreds of Templates and Colors"; inscriptions included; reorders "1 to 1000"; designers check before production;[^owayo] final PDF sent for approval (snippet)[^owayo-tt] |
| Spized (Germany) | Brand, 3D configurator | "over 700 templates or start from scratch"; logos, names, numbers, sponsors; share; free sample set; e.g. football shirt €49.90 each for 20 vs €67.90 for one; no gymnastics.[^spized] Built by agency Smart Dato ("Real-time 3D rendering in any browser", prototypes in 4-8 weeks)[^smart-dato] |
| Kit Builder (UK) | White-label platform | Real-time 3D; brand palettes and **locked colours**; text/logos with align/resize/rotate/lock; **roster import for batch personalisation**; "Automatically generate print-ready, multi-sized files per item in every order"; Shopify/WooCommerce/BigCommerce/Wix and REST API; SVG artwork[^kitbuilder] |
| Kit Builder pricing | | Professional £195/month (quote form); eCommerce Professional £294/month; Print Production and Enterprise on request (Illustrator plugin in print tier); 3D models bought or bespoke-modelled[^kitbuilder-pricing] |
| Zakeke (Italy) | Platform | Visual customiser with "validated, production-ready output"; 3D configurator "with rule-based logic"; AI Agent Studio; virtual try-on; "25,000+ Brands"[^zakeke] Entry from EUR 59/month (own page) or $29.90 usage-based (Capterra), snippets[^zakeke-price][^capterra-zakeke] |
| Expivi (Netherlands) | Platform | Made-to-order manufacturers; real-time 3D and AR; "Design to Print"; modular configurator where "Drag modules in; only valid ones snap together."[^expivi] Enterprise from $500/month; average implementation 9 months (G2 snippet)[^g2-expivi] |
| Threekit (US) | Platform | Now "The AI-Native CPQ Built for Manufacturers"; no apparel customers named[^threekit] |
| Others | | Roundup lists Treeview, Threekit, Emersya, Zakeke, Hapticmedia, Cylindo, Expivi, Roomle, VNTANA; enterprise platforms are "five and six figure annual contracts"; VNTANA targets fashion and footwear[^reality-atlas] |
| Brikl | Ordering platform | Bulk orders and stores, 3.5% commission; no 3D designer[^brikl] |

Style3D lists "custom teamwear" among its solution areas.[^style3d] No vendor states its
rendering library, and none was found supporting instanced 3D embellishments.[^notes-tools]

# Ideas worth carrying over

- **[INFERRED]** Locked brand palettes, batch personalisation from a roster, automatic production
  files per size, share links and a human check before production.[^notes-tools] Locked palettes
  and limited options are a direct precedent for a restricted
  [coach view](/product/personas/coach-and-gym-owner.md); per-size production files for the
  [seamstress view](/product/personas/seamstress.md).
- **[INFERRED]** Expivi's "only valid ones snap together" rule is the right model for piece
  assembly: offer only combinations that can physically be made.[^notes-tools]
- **[INFERRED]** These tools treat the garment as flat artwork on a fixed model, with no concept of
  physical embellishment, mesh over skin or panel construction, the defining features of a
  competition leotard.[^notes-tools]

[^notes-tools]: Research notes, existing tools and UX mechanics, section 4
[^owayo]: owayo 3D Designer page
[^owayo-tt]: owayo table tennis, search snippet
[^spized]: Spized
[^smart-dato]: Smart Dato
[^kitbuilder]: Kit Builder
[^kitbuilder-pricing]: Kit Builder pricing
[^zakeke]: Zakeke
[^zakeke-price]: Zakeke comparison page, snippet
[^capterra-zakeke]: Capterra, snippet
[^threekit]: Threekit
[^expivi]: Expivi
[^g2-expivi]: G2, snippet
[^reality-atlas]: Reality Atlas, 14 Jul 2026
[^brikl]: Brikl
[^style3d]: Style3D
