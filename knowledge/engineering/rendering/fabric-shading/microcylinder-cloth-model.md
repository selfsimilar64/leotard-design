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
| Silk shot (row e) | 1.345 | Dir 1 | (0.1, 1, 0.4) × 0.2 | 0.1 | 4 | 8 | 0.86 | −25, −25, 25, 25 | 1.33, 2.67, 1.33 |
| | | Dir 2 | (1, 0, 0.1) × 0.6 | 0.1 | 5 | 10 | 0.14 | 0, 0 | 1 |

Row e (read from the PDF's text layer, whose columns are slightly misaligned) is a two-colour fabric
in Pont and Koenderink's sense: green one way, red the other.

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

**Stripes and cost (owner, 2026-10-27).** The owner liked the look but saw many stripes and a
slow app. The stripes came from the sampling, not the lighting. Each of the 28 tangent samples ×
12 cone directions was a sharp lookup (roughness 0.1-0.2), so every sample drew its own copy of
each softbox's edge as a line. That was 336 lookups per pixel: 33.7 ms a frame against 14.4 ms
with Stretch satin (1280 × 1000, Softbox studio, GTX 1650). Now: one lookup at each tangent
segment's centre (7), and K = 6 cone directions. Each lookup is blurred to cover the gap to its
neighbours: roughness = max(0.1, 0.9 × the segment's turn in radians, 0.25), since in three's
prefiltered environment roughness is roughly the blur's angle in radians. The cost is 16.2 ms (about
2 ms over Stretch satin) with no stripes. A least blur of 0.15 showed the softboxes as blotches;
0.35 lost definition.

**Reverted the same day (owner).** The blurred 7 × 6 variant is undone: its effect on fidelity is
unknown, and the look must be settled at full quality first. The full sampling (28 × 12,
roughness 0.2, about 35 ms) is back, stripes included. The 7 × 6 numbers stay here for the later
optimisation phase. Next steps: [HDRI plan](/engineering/rendering/fabric-shading/microcylinder-satin-hdri-plan.md).

**Paper-exact version (owner, 2026-10-27, later): "use the mathematical model as presented",
no by-eye tuning; the owner will prompt any.** What had been fitted by eye and is now gone: A = 2
(paper 0.035), gain 1.5 (none in the paper), a separate three.js diffuse at 0.2 of the dye (the
model has none), and a lookup blur of 0.2 (the model's lobe widths now set it). Now:

- Both thread sets with Table II row c exactly: floats A = colour x 0.035, kd 0.1, γs 2.5°,
  γv 5°, a 0.9, the published tangent curve; cross threads A = colour x 0.2, kd 0.7, γs 30°,
  γv 60°, a 0.1, offset 0; η 1.539; exact dielectric Fresnel.
- The floats' Gaussian lobes are deltas in θ, read through lookups blurred to the lobe's own
  width. A GGX prefilter at α = r² matches a Gaussian of width γ by half-width at α = 1.84γ, so
  r = 0.28 and 0.40. The broad terms (cross threads, both kd shares) are integrated by quadrature
  over θ (8) and φ (12) with lookups at r = 0.5 to prefilter the integrand; the floats' kd share
  at each segment's centre.
- No other light: three's diffuse is zeroed and its specular off.

**Choices the paper does not make (stated, not tuned):** (1) the albedo for a user's colour: the
paper measured one pink, (1, 0.37, 0.3) x 0.035 / x 0.2, so the piece's linear colour replaces
(1, 0.37, 0.3). (2) Which way the floats run on the body (across the round-the-body tangent). (3)
Direct lights and occlusion are not in the model and are left out. (4) Ft(η, ωi)·Ft(η′, ωr) is
taken as Ft², at one angle.

**Result:** consistent in the Softbox studio and the White loft (no wash-out in the HDRI). Very
dark: navy near black with a grey-white sheen, pink a dark dusky rose, because the published
albedos are low. No stripes are visible: the model's own lobe widths blur the lookups more than
0.2 did. 76 ms a frame at 1280 × 1000 (GTX 1650), from about 35.

**Colour and direct lights (owner, 2026-10-27).** Full red came out dark and muted. There were
three causes: the table's albedos are tiny in our light units; the colour leaves near the mirror
direction alongside the white surface shine; and the satin ignored the studios' direct lights.
The owner chose "both together":

- **Energy scale** (`micro.scale` 14.6). The table's albedos are relative to the authors' lights
  and exposure, so their magnitude is set by energy. In a uniformly white room (radiance 1, no
  lights; float render target, no tone mapping) a white dye must return all the light. Measured at
  the table's values: 0.121 white plus 0.060 coloured at a normal view; 0.115 + 0.059 at 30°;
  0.130 + 0.058 at 60°; 0.178 + 0.051 at 75°; 0.081 + 0.048 at 60° across. Scale =
  (1 − 0.121) / 0.060 = 14.6, the least over the measured angles. Check after: white 0.997 at
  normal, 0.971 at 60°, 0.785 at 60° across; full red (0.997, 0.121, 0.121), i.e. full red
  under a white shine. The floats-to-cross-threads ratio is kept, so the cross threads' albedo
  is 2.9 (above 1 per thread; the fabric as a whole stays at or below 1).
- **Direct lights.** `RE_Direct_Physical` is hooked (`LIGHTS_MICRO`) so point, spot and
  directional lights (an HDRI rig's key with its shadow, the glint lights) light the satin
  through the full thread functions at every tangent sample (`microPoint`): cheap.
- **Softbox area lights are not hooked.** `microRect` integrates a box the way the environment
  is integrated (cone and quadrature, ray-rectangle tests). At about 1,400 thread evaluations per
  box per pixel, six boxes froze the app for seconds a frame; the owner's open tab disappeared
  from the browser during it. The hook is empty pending the owner's choice; the boxes still reach
  the satin through the reflection room, which holds them. **[INFERRED]** Every other material
  sees each box twice (area light and reflection room); the satin now sees it once.

Result: red reads as bright, saturated red satin with flowing bands in the Softbox studio, the
two-light studio and the White loft, at about the same brightness as matte red in the same light.
70 ms a frame at 1280 × 1000.

**Showcase (2026-10-27).** The owner chose to leave the softbox area lights off for now. A 12-colour
sheet in the White loft studio (plain tank, all panels `satinmicro`, teen mannequin, A-pose,
camera [0.3, 1.06, 1.75] → [0, 0.98, 0], fov 30). The room's turn was chosen by measurement:
the standard deviation of luminance over the satin's pixels (royal blue #2a4fd0, 300 × 420)
across 0-330° in 30° steps, refined near the peak. That gave std 32.4 at **248°** (32.2 at 240°,
31.0 at 30°, minimum 8.8 at 150°). Captures `app/captures/satin-micro/show-*.png`. Every colour,
pastels and white included, keeps visible banding.

**Controls and two-colour satin (owner, 2026-10-27).** The owner asked for four of the paper's
parameters as controls, plus a shot (two-colour) satin. A panel's `satin: { gs, gv, kd, eta }`
(`panel.set`) overrides the floats' values; unset keys keep the table's. The cross threads keep
row c, except that η is shared.
- **UI** (`SatinControls`, `inspect-garment.jsx`), shown for any fabric with `micro`:
  - Highlight sharpness = 2.5° / γs (0.25-4×).
  - Colour glow width = γv / 5° (0.25-6×).
  - Milkiness = kd (0-100%).
  - Sheen strength = η (1.2-2.2), shown as face-on reflectance ((η−1)/(η+1))², 4.5% at 1.539.
  - A Reset button sets `satin: null`.
- **Energy scale per setting.** `microScale` (`fabric.js`) recomputes the white-room scale for each
  setting. It runs `microFurnace`, a JS transliteration of `MICRO_FRAGMENT` with every lookup set
  to 1 and the shader's sample counts. It is cached and takes about 9 ms the first time.
  - At the table's values it gives **14.63**, reproducing the GPU-measured 14.6, so the default is
    unchanged.
  - γs and γv do not change it, because the narrow lobes are deltas.
  - kd 0 gives 13.9, kd 1 gives 28.7, η 1.2 gives 15.1, η 2.2 gives 12.9.
  - **Keep `microFurnace` in step with the shader.**
- **Two colours:** the floats take the piece's colour and the cross threads take `colour2`, or the
  `second` choice unless it is Tone-on-tone. This is the paper's shot structure on the charmeuse
  weave. The cross threads carry most of the light seen face-on (a2·kd·A2 is about 0.2 against
  the floats' 0.05), so **the second colour fills the body and the first shows in the highlight
  bands and at the edges**.
- **Renders** (royal blue, White loft 248°): `app/captures/satin-micro/satin-controls.jpg`.
  - Sharpness 4× (γs 0.6°) brings back contour stripes: the lookups get sharper than the 28 × 12
    cone sampling can resolve.
  - Glow width and milkiness are subtle in this soft room.
  - Sheen 14% turns the satin pale and silvery; 0.8% makes it deep and saturated.

**Cost breakdown (2026-10-27).** GTX 1650, 1071 × 1274 canvas, plain tank in satin, White loft,
3 direct lights. Measured by toggling uniforms (`uMicro`, kd = 0, all lengths 0) and timing
render + readPixels:

| Configuration | Frame time |
|---|---|
| Whole frame | about 70-77 ms |
| Satin off | 6 ms |
| Floats' kd share off | 43 ms |
| Floats off (cross threads and lights only) | 11 ms |

So of the roughly 65 ms the satin costs:
- Floats' kd share (7 segments × 96 quadrature lookups): **about 30 ms**.
- Floats' narrow cones (28 tangents × 12 directions × 2 lookups), with their direct-light terms:
  **about 30 ms**.
- Cross threads (96 lookups): about 5 ms.

Optimisation candidates. None is done yet: the owner chooses (no simplifying the
look while it is being dialled in).

- **Lossless:**
  1. **Constant segments.** The charmeuse curve has three flat segments (−32→−32, 0→0, 32→32),
     whose 4 tangent samples are identical. Evaluate each once with weight 4: 12 fewer of the 28
     narrow evaluations (−43% of that term), in `MICRO_FRAGMENT` and `microPoint`. Not
     `microFurnace`, which must stay a transliteration, though the result is equal.
  2. **Env-space hoisting.** `microEnv` transforms every direction by `viewMatrix` and
     `envMapRotation`. Transform t, nl and bl once per tangent and combine in env space. Also
     tabulate the constant cos/sin of φ_k and θ_j.
- **Approximations** (measure each against the current output as reference):
  3. Floats' kd share by fewer quadrature nodes, or one wide lookup per segment (it is a smooth,
     diffuse-like term).
  4. Fewer cone directions on the narrow cones.
  5. Still-camera refinement: cheap while moving, full quality when still.

**Optimisation results (owner chose 1, 2, then 3 at several levels; 2026-10-28).**

How it was measured:
- `render()` plus a 1-pixel `readPixels`, median of 10-25 frames.
- Fixed 1071 × 1274 buffer at pixel ratio 1, camera [0.3, 1.06, 1.75] → [0, 0.98, 0], White loft at 248°.
- Variants were **A/B-interleaved in one page**: runtime uniforms, or a temporary `#define` per level.

**Pitfall:** `location.reload()` in the preview pane can silently not reload. One page ran stale
code for 11 minutes. Check `performance.timeOrigin` or the compiled shader source
(`gl.getShaderSource`) before trusting a timing, and restart the preview server for a new build.

1. **Constant segments: kept, lossless, 70 → 61.4 ms.**
   - The skip lives in the existing 28-sample loop: `continue` on j > 0 when o0 == o1, weight × 4.
     It is in `MICRO_FRAGMENT` and `microPoint`.
   - Control: nudging the offsets apart by 1e-6 rad disables the skip at runtime, and the time goes
     back to 70 ms.
   - Against the original render, the satin is unchanged. The only differing pixels are on the skin
     and floor (shadow noise between runs).
2. **Env-space hoisting: rejected, about 9 ms slower** (79.6 against 70 without the skip).
   - Constant cos/sin tables (indexed `const float[]`) were also tried. The first load hung for over
     45 s, so they were dropped.
   - Note: compiling the satin program takes about 8-9 s on this machine. A design switching to it
     stalls for that long the first time.
3. **Floats' kd share at fewer nodes (`MICRO_Q.KD`; QR = 0.5·sqrt(φ spacing / 15°)).** Each level
   is compared with level 0 at 720 × 1000; differences are 0-255 per channel over the satin pixels.

   | Level | NT × NP | QR | Frame | Mean diff, pink / blue / softbox | Worst |
   |---|---|---|---|---|---|
   | 0 | 8 × 12 | 0.50 | 62.2 ms | reference | |
   | 1 | 6 × 8 | 0.61 | 49.3 ms | 0.10 / 0.05 | 1 |
   | 2 | 4 × 6 | 0.71 | 42.3 ms | 0.17 / 0.10 / 0.04 | 1 |
   | 3 | 3 × 4 | 0.87 | 39.1 ms | 0.30 / 0.19 | 1 |
   | 4 | 2 × 3 | 1.00 | 36.4 ms | 0.26 / 0.18 / 0.09 | 1 |

   - The energy scale moves at most 0.2% across levels (14.634 → 14.658).
   - Switching the kd share off entirely gives about 34.5 ms, so level 4 leaves about 2 ms in it.
   - Sheet: `app/captures/satin-micro/opt/satin-kd-levels.jpg`.
   - **Kept at level 0 until the owner picks.** `MICRO_Q` is shared with `microFurnace`, so picking
     a level is one edit.

**Further options, tested and reverted; none applied (owner: test, measure, report; 2026-10-28).**

How it was tested:
- Temporary `#define` switches on the satin materials (`m.defines`), all compiled in one fresh page.
- Timing **paired**: base and variant back to back, alternating order, 5 rounds, median of the
  differences. Single readings drifted ±5 ms between rounds (the base read 61-74 ms with GPU
  warmth); paired differences repeated within about 1 ms.
- Fidelity: 720 × 1000 captures against base, max channel difference over the satin's pixels.
  Looks: White loft royal blue and pale pink, two-light softbox royal blue.

Remaining cost (removing each part): kd share about 31 ms, narrow cones (highlight bands) about
18 ms, cross threads about 6 ms, direct lights about 5 ms.

| Option | Paired Δ frame | Worst diff (/255) | Verdict |
|---|---|---|---|
| Cull lights below the surface (`dot(wi, n) <= 0` in `microPoint`; exactly zero by masking) | −2.7 ms | 0 | lossless |
| Early `dot(wi, n)` skip in the cone loops | +0.8 ms | 0 | no gain |
| Non-unrolled loops (bounds + int(uniform 0)) | +1.1 ms | 0 | compile −1.2 s |
| Lights collected, then one `microPoint` loop after the light loop (one copy instead of one per light) | −0.6 ms | 0 | **compile 9.4 → 7.1 s** |
| Single-mip lookups (nearest mip, not the blend of two) | −6.1 ms | 2-4 | fidelity-safe |
| 3 samples per sloped segment (4 now) | −3.4 ms | 1-2 | fidelity-safe |
| kd share 2 × 3 (level 4 above) | −31 ms | 1 | fidelity-safe |
| Narrow cone K 8 (12 now) | −5.2 ms | 9-11 | small visible risk |
| Narrow cone K 6 | −8.1 ms | 26-28 (stripes, 22% of pixels > 2) | degrades |
| Cross threads 4 × 6 | −4.7 ms | 6-8 (24-28% > 2) | degrades slightly |
| Cross threads 2 × 3 | −6.0 ms | 25-30 | degrades |

**All fidelity-safe options together** (light cull, single mip, 3 per sloped segment, kd 2 × 3,
light loop, non-unrolled loops):
- −34.9 ms paired, about 27 ms a frame against 62.
- Compile 6.0 s against 9.4 s (uncached; a random `#define` nonce defeats the browser's shader
  cache).
- Worst 2 (loft) and 4 (softbox) of 255; 0.003% of pixels over 2.
- Uncached compile alone: light loop 7.1 s, non-unrolled 8.2 s, both 6.6 s.
- Sheet: `app/captures/satin-micro/opt2/satin-speed-options.jpg`.

Not tested:
- Still-camera refinement.
- Half-resolution satin shading.
- Dedicated prefiltered maps at the exact lobe widths (one fetch per lookup, which single-mip
  approximates).

Per-option sheets (render plus ×16 difference, three looks, and a 2× close-up):
`app/captures/satin-micro/opt2/all-options-*.jpg`. Every capture carries a speckle at the armholes
and crotch even where the shader is identical by construction (light cull); those pixels are left
out of the sheets' numbers.

**In the app for the owner to try (2026-10-28).** Two more picker materials beside Satin (thread
model), same parameters and energy scale, only the sampling differs. `micro.speed` selects
`MICRO_SPEED` (material defines; fabric.js lists each switch with its measured cost):
- `satinfast`, "Satin fast": the fidelity-safe set above.
- `satinfastest`, "Satin fastest": the safe set plus cone K 6 and cross threads 2 × 3, the
  fastest setting of each look-changing option. Expect contour stripes and a tone shift in the
  White loft (see the per-option sheets).
- microFurnace stays at `MICRO_Q` for all three, so the scale matches the full model (the fidelity
  tests above used the same scale).
- Checked in the test server: both compile with no console errors and render the
  satin. Frame times were not re-measured (the owner was using the test tab); the paired numbers
  above stand. The combined fastest set was never timed: expected about 27 − 8 − 6 ≈ 13-15 ms.

**Testing pitfalls:**
- The browser caches compiled shaders by source, so repeat compiles take about 0.5 s; use a nonce.
- A hidden pane throttles the page's timers, so captures stall.
- One page hot-reloaded store modules mid-test ("Command doc.set defined twice") and drew nothing
  (1.4 ms frames): restart the server.

**Earlier status (by-eye version):** on navy it showed soft blue bands across the chest, like GK's video. Light colours
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
