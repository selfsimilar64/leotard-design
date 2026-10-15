---
type: Design Rule
title: Geometric (anatomy-based) rule checks
description: "Which attire limits are tied to anatomical landmarks or measurable areas (sternum, shoulder blade, hip bone, strap width, mark areas) and could be shown as live pass/fail indicators on the 3D body and checked per graded size."
tags: [rules, geometry, compliance, landmarks]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: styles
    resource: /references/research/leotard-styles-and-rules.md
    title: "Research notes: leotard styles and rules (bundle mirror)"
  - id: fit
    resource: /references/research/mannequins-and-leotard-fit.md
    title: "Research notes: mannequins and leotard fit (bundle mirror)"
  - id: report
    resource: /references/research/research-report.md
    title: Research report (bundle mirror), section on named choices and rulebooks
  - id: usag-elite
    resource: https://static.usagym.org/PDFs/Women/Rules/rp/rp_elite.pdf
    title: USA Gymnastics Elite Program Rules & Policies (FIG neckline rule)
    author: org:usa-gymnastics
  - id: usag-rp
    resource: https://static.usagym.org/PDFs/Women/Rules/rp/rulespolicies.pdf
    title: USA Gymnastics 2026-2027 Rules & Policies
    author: org:usa-gymnastics
  - id: fig-clothing
    resource: https://www.gymnastics.sport/publicdir/rules/files/en_Advertising%20Rules%20Competition%20Clothing%20-%20valid%20from%20May%202024.pdf
    title: FIG Rules for Competition Clothing and Advertising
    author: org:fig
  - id: ncaa-rules
    resource: https://nawgj.org/wp-content/uploads/2026/08/2026-27_WomensGym-Rules-Mod-FINAL.pdf
    title: NCAA 2026-27 Women's Gymnastics Rules Modifications
    author: org:ncaa
  - id: gk-9661s
    resource: https://www.gkelite.com/products/9661s
    title: "GK Surge #9661S (FIG and USAG compliant back label)"
    author: org:gk-elite
---

# Takeaway

> Deferred: rule checking is out of scope since 2026-10-13
> ([decision](/decisions/2026-10-13-defer-competition-rules-and-pain-points.md)). This concept
> records what *could* be checked when the feature returns.

Most verified attire limits are **geometric and tied to anatomy** (sternum, shoulder blade, hip
bone) or to **measurable areas** (emblem, logo, advertising). They could therefore be live
pass/fail indicators on the 3D body, and because they are anatomical they must be **checked on
every graded size**, not only the sample size **[INFERRED]**.[^styles][^report] Manufacturers
already design to these lines: GK labels every special-order back as FIG- and USA Gymnastics-compliant.[^gk-9661s]

| Check | Landmark / measure | Limit | Rule set | Verified? |
|---|---|---|---|---|
| Front neckline depth | Sternum (suprasternal notch to xiphoid) | Not below half-way down the sternum | FIG | Yes[^usag-elite] |
| Back neckline depth | Lower line of the shoulder blades | Not below it | FIG | Yes[^usag-elite] |
| Backless test | Bottom and vertical midpoint of the shoulder blade | Opening no more than about 2 in below the blade bottom and no wider than the blade's midpoint; mesh/flesh fill exempts | USA Gymnastics | Yes[^usag-rp] |
| Leg-cut height | Pelvis / hip bone (iliac crest region) | Below it | USA Gymnastics (FIG similar, unverified) | Yes for USAG[^usag-rp] |
| Strap width | Strap cross-section | Not spaghetti (no number); FIG 2 cm unverified | USAG; FIG | Partly |
| Racerback | Back strap topology | Banned | USA Gymnastics | Yes[^usag-rp] |
| Bare midriff | Waist coverage | Banned | USA Gymnastics | Yes[^usag-rp] |
| Sleeve length | Garment parameter | Long or sleeveless | NCAA | Yes[^ncaa-rules] |
| National identification area | Area of flag/name | At least 30 sq cm | FIG | Yes[^fig-clothing] |
| Manufacturer logo area | Bounding rectangle | At most 30 sq cm, one per garment | FIG | Yes[^fig-clothing] |
| Advertising | Area and separation | Two up to 90 sq cm at least 3 cm apart, or one up to 130 sq cm | FIG | Yes[^fig-clothing] |
| Technology mark | Area | At most 10 sq cm | FIG | Yes[^fig-clothing] |
| Text content | Text elements | No athlete name, slogans, motivational words (FIG); names in team font only (NCAA) | FIG / NCAA | Yes[^fig-clothing][^ncaa-rules] |
| Team identity | Compare team members' designs | Identical | NCAA (FIG unverified) | Yes for NCAA[^ncaa-rules] |

**Landmarks needed on the body [INFERRED]:** suprasternal notch and xiphoid (sternum midpoint),
scapula inferior angle and medial/vertical midline, iliac crest or anterior superior iliac spine,
inguinal crease. The mannequin bodies carry rig joints as landmarks; see
[/engineering/geometry/](/engineering/geometry/about.md). Typical design placements that sit inside
these limits are in [how a leotard sits on the body](/domain/sizing/how-a-leotard-sits-on-the-body.md).[^fit]

**Unresolved:** whether nude-lined mesh counts as covered for the FIG depth test; how "hip bone" is
operationalised by judges (no source).[^styles]

[^styles]: Research notes: leotard styles and rules, bundle mirror, sections 4, 9 and 10.
[^fit]: Research notes: mannequins and leotard fit, bundle mirror, section 4.
[^report]: Research report, bundle mirror.
[^usag-elite]: USA Gymnastics Elite Rules & Policies, Competition Rules 4.e.
[^usag-rp]: USA Gymnastics 2026-2027 Rules & Policies, Ch. 2 B.4 p. 2.
[^fig-clothing]: FIG Rules for Competition Clothing and Advertising.
[^ncaa-rules]: NCAA 2026-27 Rules Modifications, Rule 1.10.
[^gk-9661s]: GK Surge #9661S.
