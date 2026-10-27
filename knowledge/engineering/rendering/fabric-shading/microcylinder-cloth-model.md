---
type: Technique
title: Microcylinder cloth model (Sadeghi et al. 2013) and its satin parameters
description: "The measured, physically based cloth model behind film-studio satin: each thread is a cylinder with a white surface lobe and an albedo-coloured volume lobe; a fabric is two thread sets whose tangents vary along each float (satin's spread, multi-peak highlight), with masking and reweighting; includes the measured polyester satin charmeuse parameters and what it leaves out for real time."
tags: [rendering, fabric, satin, brdf, research, microcylinder]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T23:30:00Z }
sources:
  - id: sadeghi
    resource: "owner-supplied PDF, C:/Users/mattj/Downloads/2451236.2451240.pdf (not stored in the repo: ACM copyright); DOI 10.1145/2451236.2451240"
    title: "Sadeghi, Bisker, De Deken, Jensen 2013: A Practical Microcylinder Appearance Model for Cloth Rendering. ACM TOG 32(2), article 14"
    author: org:uc-san-diego
  - id: dw
    resource: https://web.archive.org/web/20240222035656/https://research.dreamworks.com/wp-content/uploads/2018/07/clothIS.pdf
    title: "Wang, Xie, Krishnamachari (DreamWorks) 2014: Importance Sampling for a Microcylinder Based Cloth BSDF"
    author: org:dreamworks
---

# Takeaway

**Satin's look comes from very sharp per-thread reflections spread out by the curve of each
float, not from one broad glossy lobe.** In the measured polyester satin charmeuse the flat
(float) threads have a surface lobe only 2.5° wide and a volume lobe 5° wide. The wide,
multi-peaked highlight comes from the float's tangent turning through about ±32° along its
length.[^sadeghi] An anisotropic GGX lobe (what the app uses) smears one smooth lobe instead, so it
can only look glossy-plastic or hazy. That is the failure mode of every satin try so far
([gloss ladder](/engineering/rendering/fabric-shading/photo-match-gloss-ladder.md)).

# Thread scattering (section 4.3)

Angles follow hair conventions (Fig. 9): θ is the longitudinal angle from the plane normal to the
thread tangent t, φ the azimuth in that plane. θh = (θi + θr)/2, θd = (θi − θr)/2, φd = φi − φr.
g(γ, x) is a unit-area Gaussian of width γ.

- Surface reflection: fr,s = Fr(η, ωi) · cos(φd/2) · g(γs, θh). Fresnel uses the angle
  cos⁻¹(cos θd · cos(φd/2)). Uncoloured: it keeps the light's colour.
- Volume scattering: fr,v = F · ((1 − kd) · g(γv, θh) + kd) / (cos θi + cos θr) · A, where
  F = Ft(η, ωi) · Ft(η′, ωr). It is coloured by the albedo A; kd is the isotropic share (high for
  cotton and linen). The Gaussian part is a forward-scattering cone around the same mirror cone as
  the surface lobe, so a thread's *coloured* light also leaves near the mirror direction.
- Thread total: fs = (fr,s + fr,v) / cos²θd.

The paper checked this against threads taken from the charmeuse. A twisted thread fits a rough
surface lobe plus an even wider volume lobe with red-tinted albedo. A flat thread fits a very
narrow surface lobe and a small red-tinted albedo, and shows "a clear separation of a colored
forward scattering lobe and an uncolored specular lobe".[^sadeghi]

# Fabric model (section 5)

- The **smallest patch** of the weave holds two thread sets at right angles, with coverage a1, a2
  (sum 1 if the weave is watertight, plus gaps otherwise).
- Each set has a **tangent curve**: tangent offsets (degrees, tilting the thread out of the
  surface) at control points, with segment lengths. The model averages the thread scattering over
  Nj tangent samples. Constant-slope segments become distinct highlight peaks (three on the
  charmeuse's front, four on its back).
- **Masking** (5.2): M = max(cos φ, 0) for light and view, combined with Ashikhmin's correlation
  term u(φd), a unit-height Gaussian with σ 15-25°. Only between threads of the same direction.
- **Reweighting** (5.3): each tangent sample is weighted by its projected length
  P = max(cos ψ, 0) toward light and view, normalised by
  Q = a1/N1 · ΣP + a2/N2 · ΣP + (1 − a1 − a2)(ωr · n).
- Thread direction on the surface comes from the gradient of the texture UVs (the app has cloth-space
  UVs and a tangent round the body).

# Measured parameters (Table II)

Rows in the paper's order: linen plain, silk crepe de chine, polyester satin charmeuse front,
charmeuse back, silk shot, velvet (matching Fig. 24). γ in degrees.

| Fabric | η | Thread | A | kd | γs | γv | a | Tangent offsets (°) | Lengths |
|---|---|---|---|---|---|---|---|---|---|
| Poly satin charmeuse, front | 1.539 | Flat | (1, 0.37, 0.3) × 0.035 | 0.1 | 2.5 | 5 | 0.9 | −32, −32, −18, 0, 0, 18, 32, 32 | 1.33, 0.66, 2, 2, 2, 0.66, 1.33 |
| | | Twisted | (1, 0.37, 0.3) × 0.2 | 0.7 | 30 | 60 | 0.1 | 0, 0 | 1 |
| Poly satin charmeuse, back | 1.539 | Flat | (1, 0.37, 0.3) × 0.035 | 0.1 | 2.5 | 5 | 0.67 | −30, −30, 30, 30, −5, −5, 5, 5 | 1.33, 1.33, 1.33, 0, 0.67, 0.67, 0.67 |
| | | Twisted | (1, 0.37, 0.3) × 0.2 | 0.7 | 30 | 60 | 0.33 | 0, 0 | 3 |
| Silk crepe de chine | 1.345 | Flat | (1, 0.95, 0.05) × 0.12 | 0.2 | 5 | 10 | 0.75 | −35, −35, 35, 35 | 1, 1, 1 |
| | | Twisted | (1, 0.95, 0.05) × 0.16 | 0.3 | 18 | 32 | 0.25 | 0, 0 | 1 |

The charmeuse's albedo (1, 0.37, 0.3) is its pink dye. **[INFERRED]** The app would substitute the
user's colour (scaled) for it.

# In the app (first version, 2026-10-27)

`satinmicro` ("Satin (thread model)") in `app/src/materials/fabric.js`, shader `MICRO_FRAGMENT`:

- **Environment cone tracing, not per-light.** The floats' lobes are taken as deltas in θ (2.5°
  and 5° against softboxes tens of degrees wide). Each reflection cone's front half is sampled at
  K = 12 directions, each a prefiltered environment lookup (roughness 0.2). The surface term
  becomes 2·Fr·cos(φd/2) and the volume term (1 − kd)·Ft²·A / cos θ. Lights come from the
  environment, so the code runs unchanged in the HDRI studios; in the
  [Softbox studio](/decisions/2026-10-27-softbox-studio-for-satin.md) the reflection room holds
  the softboxes.
- Floats run across the body (T1 = n × the round-the-body tangent). Their tangent curve is the
  charmeuse front, at four samples per segment (28). At two per segment each sample's reflection
  showed as its own thin band: wood-grain stripes.
- Masking with Ashikhmin correlation (σ 20°), reweighting P, and normalisation Q with the cross
  threads at offset 0. Three's own specular is off (`specularIntensity` 0); a token anisotropy
  keeps the tangent frame compiled.
- The diffuse (cross threads, kd, gaps) is the dye x `diffuse`, applied in the shader after a
  scan's recolour. Scaling `m.color` did nothing under a scan.
- Fitted by eye in the Softbox studio, navy and pink: A = 2 (the paper's scale gave white-grey
  shine on navy; 2 turns the bands blue), diffuse 0.2, gain 1.5.

**Status:** on navy it shows soft blue bands across the chest, like GK's video. Light colours
(pink) still read flat, partly because the studio lights from every side. Not yet judged by the
owner. Cost not yet profiled (28 × 12 environment lookups per pixel).

# What the paper does not cover (for this app)

- **Real-time lighting from photographed studios.** The paper integrates over lights (ray tracer;
  a GPU version at about 100 ms per frame for one directional light on a 2013 laptop GPU). The app
  lights with HDRI studios, so each tangent sample's reflection cone needs a prefiltered
  environment lookup. That approximation is ours to design.
- **Knit, not woven.** Leotard stretch satin is a warp knit whose long underlaps play the floats'
  role. **[INFERRED]** The structure carries over; the tangent curve and coverage must be fitted by
  eye to the owner's GK photos, starting from the charmeuse front.
- **Close-ups.** The model is for distant viewing and ignores single threads (the app's scan and
  glints cover close range).
- Masking between perpendicular threads, and light bouncing between threads, are not modelled.

[^sadeghi]: Sadeghi et al. 2013, sections 4.3, 5.1-5.3 and Table II
[^dw]: DreamWorks 2014 talk (same thread terms, adds importance sampling)
