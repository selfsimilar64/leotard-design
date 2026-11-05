---
type: Domain Concept
title: Clothing pressure and comfort
description: "Published comfort limits for garment pressure on the body (swimsuits, leotards, girdles, sports compression): about 0.5-1 kPa (4-7.5 mmHg) is comfortable on the trunk, about 2 kPa (15 mmHg) tolerated at straps and waistbands, about 4 kPa (30 mmHg, near capillary pressure) too tight anywhere; usable to flag tightness from the fit solver's strain."
tags: [construction, fit, pressure, comfort, compression, validation]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T12:00:00Z }
sources:
  - id: itoh
    resource: https://www.shinshu-u.ac.jp/faculty/textiles/db/seeds/pages/75677/en.php
    title: "Itoh, Nakagawa, Tsutsumi, clothing pressure of swimsuits, leotards and spats, Descente Sports Science vol. 15 (year not given)"
  - id: xiong-tao
    resource: https://pmc.ncbi.nlm.nih.gov/articles/PMC6404358
    title: "Xiong & Tao, Compression Garments for Medical Therapy and Sports, Polymers 2018;10(6):663, doi 10.3390/polym10060663"
  - id: chan-fan
    resource: https://doi.org/10.1108/09556220210424215
    title: "Chan & Fan, girdle pressure, IJCST 2002;14:100-110"
  - id: kim-lee
    resource: https://doi.org/10.5805/SFTI.2019.21.4.459
    title: "Kim & Lee, sports compression pressure, Korean Fashion & Textile Research J. 2019;21(4):459-467"
  - id: hattori
    resource: https://kaken.nii.ac.jp/grant/KAKENHI-PROJECT-12680101
    title: "Hattori, waistband comfort pressure, KAKENHI 12680101 (2000-2002)"
---

# Takeaway

**A leotard should press about 0.5-1 kPa (4-7.5 mmHg) on the trunk; about 2 kPa is tolerated at
straps and edges; about 4 kPa is too tight anywhere.** The only leotard-specific study found puts
comfort at 5-10 gf/cm² inside swimsuits, leotards and spats and about 20 gf/cm² at straps and
waistbands.[^itoh] Conversions: 1 kPa = 7.50 mmHg; 1 gf/cm² = 0.098 kPa.

| Limit | Value | Where | Source |
|---|---|---|---|
| Comfortable | 0.49-0.98 kPa (3.7-7.4 mmHg) | Abdomen, hip, thigh in swimsuits, leotards, spats | [^itoh] |
| Tolerated | about 1.96 kPa (14.7 mmHg) | Shoulder strap, waistband | [^itoh] |
| Swimsuit comfort affected above | chest 8.6, waist 2.7, abdomen 4.2 mmHg | Women's swimsuit | Xu, Liu & Wu 2012, via [^xiong-tao] |
| Trunk compression | below about 7.5 mmHg; high shoulder and groin pressure reduces skin blood flow | Swimsuit | Morooka et al. 2001, via [^xiong-tao] |
| Girdle acceptable | side 11.5, hip 4.5, waist 6.5 mmHg | Girdle | [^chan-fan] |
| Waistband comfortable | 0.5-1 kPa | Waistline (excluding centre back) | [^hattori] |
| Preferred sports compression | 0.67-1.82 kPa | Legs | [^kim-lee] |
| Discomfort | 5.88-9.80 kPa; capillary pressure about 4.3 kPa | Whole body | Denton 1972, via [^xiong-tao] |

Second-hand figures (via the Xiong & Tao review) and sensor differences (air-pack, Kikuhime, FEM)
make these bands, not exact limits. No groin- or leg-elastic-specific leotard limit was found.

# Use in the app **[INFERRED]**

Pressure on a convex surface is about tension divided by radius of curvature (Laplace), so the
fit solver's fabric tension and the body's curvature give a pressure map. Suggested flags: trunk
above about 1 kPa "firm", above 2 kPa "tight" except at straps and edges, above 4 kPa "too tight"
anywhere. The solver's current medians (1-3.5 mmHg) sit inside
the comfortable band ([fit-solver realism audit](/engineering/app/fit-solver-realism-audit.md)). Whether to show such flags is an owner decision. See also
[fit failures in wear](/domain/construction/fit-failures-in-wear.md) and the
[yardsticks](/domain/construction/real-leotard-yardsticks.md).

[^itoh]: Itoh, Nakagawa, Tsutsumi, Descente Sports Science vol. 15.
[^xiong-tao]: Xiong & Tao 2018, Polymers 10(6):663.
[^chan-fan]: Chan & Fan 2002, IJCST 14:100-110.
[^kim-lee]: Kim & Lee 2019, Korean Fashion & Textile Research J. 21(4):459-467.
[^hattori]: Hattori, KAKENHI 12680101.
