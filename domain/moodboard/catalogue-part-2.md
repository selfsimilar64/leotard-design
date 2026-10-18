---
type: Catalog
title: "Moodboard catalogue, part 2 (images 21-38)"
description: "Per-image teardown of moodboard images 21-38 in filename order (DAPHNE_BACK.jpg to IMG_4527.jpg): silhouette, back, panelling, materials, stones, trims, photography and the app capabilities each design demands."
tags: [moodboard, catalogue, reference-designs]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T19:30:00Z }
sources:
  - id: moodboard
    resource: "moodboard/ folder in the project root (138 owner-supplied photos), images 21-38 in filename order"
    title: Owner's moodboard
    author: human:mattj
---

# How to read

Visual teardown by a Claude Code subagent from the photos alone, kept as written.[^moodboard] Every
measurement, count and material call is an estimate from a photo **[UNVERIFIED]**. The synthesis
across all parts is the [design-space taxonomy](/domain/moodboard/design-space-taxonomy.md).

Conventions: "wearer's left/right" is anatomical. "Image-left/right" is the picture's left/right. In a front view image-left = wearer's right; in a back view image-left = wearer's left. Stone sizes are relative estimates (tiny ≈ ss6, small ≈ ss10, medium ≈ ss16, large ≈ ss20, xl ≈ ss30+). Stone counts are rough estimates from what is visible.

Garment pairs and families in this batch:
- **Pair A:** DAPHNE_BACK + DAPHNE_FRONT (same garment: pink lace + navy, Quatro "Ruby Evans" line).
- **Pair B:** ella-back + ella-front (same garment: navy foil + navy mesh, asymmetric sleeves).
- **Pair C:** export-image_1dfae2a5 (back) + export-image_b630e14b (front) (same garment: red + black mesh, 3/4 sleeves).
- **Brand family "pink-backdrop / triple-swirl logo":** export-image_1b9abe01, export-image_1dfae2a5, export-image_b630e14b, IMG_4465 (same embroidered triple-swirl hip logo).
- **Brand family "Quatro":** DAPHNE_*, e49647c7, ecf4f1f7, f035dc11 (printed "Quatro" hip logo, white studio).
- **Phone / candid / competition shots** (lower quality, useful for real-world lighting reference): IMG_4141, IMG_4465, IMG_4467, IMG_4468, IMG_4470, IMG_4477, IMG_4527.

---

## 1. DAPHNE_BACK.jpg

1. **File / view:** DAPHNE_BACK.jpg — back, worn-on-athlete (adult model), cropped shoulders to upper thigh. Pair A with DAPHNE_FRONT.jpg. A "…ODIFIED" retouch label overlay bottom-left (not part of the garment).
2. **Silhouette:** sleeveless, tank (wide-ish shoulder straps ~5–6 cm at the shoulder top). Back neckline: deep V. Leg cut: medium (back view shows full-seat coverage, leg line rises to about the hip crease at the side). No skirt.
3. **Back design:** Wrap/cross-over back built from two overlapping lace pieces.
   - Each shoulder strap's inner edge (navy-bound) descends as the edge of a deep V neckline. The two edges meet and **cross once at about T8–T9 (just below the lower tips of the scapulae)**, centre back.
   - After crossing, each edge continues diagonally to the opposite side: the edge from the wearer's right shoulder runs down-left to the wearer's left side at about lower-rib/waist level; the edge from the left shoulder runs to the right side similarly.
   - Each lace piece has a navy-bound **lower edge** too. These two lower edges cross again at centre back ~3–4 cm above the waist seam, forming a **second, lower X**.
   - Below the lower X there is a small **open slit/triangle (truly open, skin visible)** between the X and the waist seam, about 8–10 cm wide, ~2–3 cm tall.
   - At the wearer's left side (image-left) the lower bound edge separates from the body as a ~1 cm **strap over a side cut-out** (open, skin visible), roughly 4–6 cm long, at lower-rib level. The front view shows the matching cut-out on the other side. So the side cut-outs are where the wrap pieces' lower edges pass as free straps.
   - Overlap: where the two lace pieces overlap (a diagonal band across the mid-back), the lace looks denser/more opaque pink. Faint grey-blue lines visible *through* the lace are the bound edges of the under-layer piece, seen through the top layer.
   - Straps are cut-in (part of the lace pieces), not separate elastic straps. All edges have ~0.8–1 cm navy binding.
4. **Fabric sectioning / panelling:** Back has about 3 visible fabric pieces: two lace wrap pieces (upper back, mirrored, overlapping) and one navy lower-back/brief piece. **Waist seam:** straight horizontal at the natural waist, side seam to side seam, covered by navy binding. Lace wrap edges: straight diagonals, mirrored (symmetric X). The lace pieces wrap from the front over the shoulders (the shoulders are lace on the front too).
5. **Materials per panel:**
   - Upper back: **lace** — pink/blush lace with a white floral/scroll motif (roses, vines, curls). Semi-sheer: skin tone shows through as a warm pink. Double layer where the pieces overlap is more opaque.
   - Lower back/brief: navy **shiny tricot** (moderate sheen, smooth broad highlights; not full wet-look).
   - Binding: navy (looks like the same navy tricot).
6. **Embellishment:** none visible on the back. No crystals.
7. **Trims & edges:** navy contrast binding (~0.8–1 cm) on the armholes, the V neckline/wrap edges, the lower wrap edges, the side-cut-out straps, the waist seam (applied over the seam), and the leg openings (navy on navy, reads as a slightly darker rolled edge).
8. **Lighting & photography:** studio, soft even frontal light, pure white background (cut-out e-commerce). Fabric specular: broad soft sheen on the navy seat with gentle highlights following the glute curvature; light compression wrinkles where the brief meets the leg. Lace shows the skin through it with a pink tint; the overlap reads more opaque. No sparkle.
9. **Hardest aspect / required capabilities:**
   - The hardest part is the two overlapping wrap pieces with see-through layering (the under-layer's edges are visible through the top lace).
   - **Overlapping panel layers** (a panel lying on top of another panel rather than tiled), with correct alpha compositing of semi-sheer lace over lace over skin.
   - **Lace material:** a tileable lace texture with an opacity map, tintable lining colour, and skin show-through.
   - **Wrap/cross-back generator:** panel edges that cross at a chosen spine height, continue to the opposite side, and turn into free straps over side cut-outs.
   - **Cut-outs** (open holes in the shell) at the sides and at the centre back above the waist.
   - **Contrast binding on every edge**, including binding applied over a seam.

## 2. DAPHNE_FRONT.jpg

1. **File / view:** DAPHNE_FRONT.jpg — front, worn-on-athlete, cropped chin to upper thigh. Pair A with DAPHNE_BACK.jpg.
2. **Silhouette:** sleeveless tank; **high crew/jewel neckline** (sits at the base of the neck). Leg cut: high (front leg line rises to about the hip bone). No skirt.
3. **Back design:** see DAPHNE_BACK. On the front, at the wearer's left waist (image-right) there is a small side cut-out (~3 cm tall) bridged by a navy-bound strap: the wrap edge from the back coming around to the front.
4. **Fabric sectioning / panelling:** about 5 front panels.
   - **Centre front panel (pink):** a shield/inverted-pentagon shape. Its top runs along the neckline. Its sides run down from the neckline-shoulder junction, roughly parallel to the armholes about 3–4 cm inside them, to the side waist. Then two straight edges form a **sharp V** that converges to a point at centre front at the waist seam (about navel level). The V edges are navy-bound.
   - **Shoulder/armhole lace strips:** narrow lace visible between the pink panel and the armhole binding at the upper shoulder on both sides (most visible at the image-left shoulder top and the image-right upper armhole). These are the lace back-wrap pieces coming over the shoulder.
   - **Two lace triangles:** below each V edge, between the V and the horizontal waist seam, from the side seam to the centre point (mirrored). The lace here is semi-sheer and the skin is clearly visible.
   - **Navy brief panel:** below a straight horizontal waist seam (navy-bound) at about navel level.
   - The design is symmetric apart from the hip logo.
5. **Materials per panel:**
   - Centre panel: pale pink **matte tricot** (very slight sheen; reads almost matte).
   - Lace areas: pink/blush **lace** with a white/pink floral motif, semi-sheer over skin.
   - Brief: navy **shiny tricot** (moderate sheen).
   - Logo: "Ruby Evans" script signature + small heart + "Quatro", pale pink, printed or heat-transfer, on the wearer's left hip (image-right).
6. **Embellishment:** crystals on the pink centre panel only.
   - **Motif:** a large **bow** outlined in stones at the upper chest: two loops spreading to either side (image-left loop larger, extending to the left armhole area), a knot near the upper centre-left, and two ribbon tails descending diagonally (one toward the lower image-left, one toward the centre). The outline uses dark sapphire/royal-blue stones.
   - **Radiating dotted lines / burst:** dotted lines fan outward and downward from the bow, filling the panel like a firework/starburst.
   - **Colour gradient by stone:** dark sapphire (outline), light sapphire/light blue, aquamarine-ish, and clear/AB. Lines often grade from dark blue to light blue to clear along their length (an **ombre colour gradient of stones**).
   - **Density gradient:** dense at the upper chest and along the panel's image-left edge near the armhole (an outline row of stones following the panel edge); sparse scatter toward the V point at the waist.
   - Sizes: mostly small (ss10–ss12), with some tiny (ss6) mixed in, and a few medium in the outlines.
   - Coverage: roughly 15–30 stones per 10 cm² in the dense areas, 2–5 in the sparse areas. Total visible on the front is estimated at 600–900.
7. **Trims & edges:** navy contrast binding (~0.8 cm) on the neckline, armholes, V edges and waist seam; navy leg finish. Side cut-out strap is navy-bound.
8. **Lighting & photography:** studio softbox, white cut-out background. Crystals read as coloured dots with small pinpoint glints, no starbursts. The pink tricot reads matte with soft shading. Navy has a broad soft sheen. The lace shows warm skin through it. The fabric lies smoothly across the bust with no visible bridging gap.
9. **Hardest aspect / required capabilities:**
   - The hardest part is the representational crystal motif (the bow) with a multi-colour stone gradient along each line.
   - **Path-based stone placement:** stones along freehand curves with per-path colour gradients (dark → light → clear).
   - **Motif import:** place an SVG/vector motif (the bow) as stone outlines.
   - **Burst/radial line generator** with a density fade toward a target edge.
   - **Edge-following stone row** (an outline of the panel edge, offset inward).
   - **Sharp V panel boundary** to a centre point, mirrored.
   - **Lace panel** with skin show-through, adjacent to opaque tricot.
   - **Logo/text decal** (print layer) on the hip.

## 3. e49647c75448fede7874c982d312520d.jpg

1. **File / view:** front closeup, worn-on-athlete (child), cropped neck to upper thigh, white/light grey background. No pair found in this batch. Quatro family ("GmF Quatro" hip logo).
2. **Silhouette:** sleeveless with **cut-in racer/halter-style armholes** (the armhole goes in toward the neck, leaving narrow shoulders). **High neck** with a ~1.5–2 cm self-fabric band collar. Leg cut: medium-high. No skirt.
3. **Back design:** not visible.
4. **Fabric sectioning / panelling:** about 6 front panels, symmetric (mirrored).
   - **Mesh yoke / centre V:** mesh from the neck band down the centre front as a narrowing V/lancet whose point reaches the waist seam at centre front.
   - **Two shiny bust panels:** each is a **leaf/lancet (pointed-oval) shape**. The inner edge is a gentle convex curve from the upper chest near the armhole/neck junction down to the waist seam at centre front (sharing the centre point with the mesh V). The outer edge is a gentle curve from the same top point down the side, ending at the waist seam ~3–4 cm inside the side seam. The seams are topstitched (visible stitching line).
   - **Two side mesh panels:** narrow mesh strips between each bust panel's outer edge and the armhole/side seam, from the armpit down to the waist.
   - **Waist seam:** straight horizontal at about the lower-rib/natural-waist level.
   - **Lower body panel:** shiny, one piece below the waist seam.
5. **Materials per panel:**
   - Main fabric: dusty-mauve/rose-lilac **shiny tricot (wet-look/satin-look)**, with strong broad white highlights.
   - Mesh: matching mauve **tinted stretch mesh-illusion**, low-to-medium sheerness (skin colour shows through faintly; reads as a slightly lighter, flatter mauve).
   - Logo: "GmF Quatro" white/silver print on the wearer's left hip.
6. **Embellishment:** all **AB crystals** (clear with pink/green/blue aurora borealis fire).
   - **Neck "necklace":** a row of small round stones just below the neck band, with **hanging vertical drops** below it: columns of 2–3 stones ending in a **pear/teardrop-shaped stone** (~5×8 mm), graduated longer toward the centre. This is a chandelier/fringe pattern spanning the mesh yoke from shoulder to shoulder.
   - **Centre mesh:** a sparse vertical column of paired pear stones and small rounds descending the centre V, roughly 6–8 clusters.
   - **Bust panels:** about 8–10 parallel curved lines of small–medium rounds (ss10–ss16) following the leaf shape, like a feather or flame, converging toward the bottom centre point. Mirrored left/right. Lines are denser near the outer edge.
   - **Waist seam:** one row of small stones directly on the seam, with a **fringe band** below it: vertical columns of 2–3 stones (small round, then medium round, then pear drop) hanging down ~3–4 cm, evenly spaced ~1.2 cm apart across the full front.
   - Estimated total visible: 450–600. Mixed shapes: round + pear.
7. **Trims & edges:** self-fabric shiny binding at the neck band and armholes; the leg finish appears self-fabric. Topstitched seams on the panel boundaries.
8. **Lighting & photography:** studio softbox, light background. Very strong broad specular on the wet-look panels (bust panels and stomach show large bright soft highlights, typical of satin-look lycra). The mesh is flatter and less reflective. Pear stones show strong facet glints; AB stones show colour fire (green/pink). The fabric bridges smoothly between the bust panels with no gap.
9. **Hardest aspect / required capabilities:**
   - The hardest part is the fringe/drop stone patterns with non-round stone shapes (pear drops), oriented downward.
   - **Non-round stone shapes** (pear/teardrop, with orientation) in the stone library.
   - **"Fringe band" pattern generator:** a seam-following row plus hanging columns of N stones with a size/shape sequence and a length envelope.
   - **Curve-parallel line fill:** N lines offset inside a panel, following its edge.
   - **Mirrored placement** across the centre front.
   - **Leaf/lancet panel shapes** with a shared apex.
   - **Mesh tinted to match the base colour**, with low show-through.
   - **Wet-look shader** with strong broad highlights.
   - **AB coating** on stones (thin-film dispersion colour).

## 4. ecf4f1f768c88c692141f99443787318.jpg

1. **File / view:** front, worn-on-athlete, cropped neck to upper thigh, white background. Quatro family. No pair in this batch.
2. **Silhouette:** **3/4 sleeves** (the wearer's left sleeve ends at mid-forearm; the wearer's right arm is raised and its sleeve is visible to just past the elbow). Neckline: scoop/round crew (moderately high). Leg cut: high. No skirt.
3. **Back design:** not visible.
4. **Fabric sectioning / panelling:** strongly **asymmetric diagonal swoosh** composition, about 6 bodice pieces. Bands run from the wearer's left shoulder down to the wearer's right side.
   - **(a) Nude mesh yoke:** over the wearer's right shoulder/upper chest, continuous with the wearer's right sleeve.
   - **(b) Dark bronze foil swoosh panel:** a curved crescent from near the centre-front neckline (wearer's right of centre) sweeping across the wearer's right upper chest and down to the wearer's right side at about underbust/lower-rib level. Upper edge: gently curved. Lower edge: **S-curve**.
   - **(c) Narrow nude mesh stripe:** ~3–4 cm wide, running from the neckline at the wearer's left shoulder diagonally down to the wearer's right side at about underbust level. It is a curved (S-curve) diagonal, parallel to (b).
   - **(d) Pale gold foil main panel:** covers the wearer's left upper chest and the entire lower bodice down to the waist seam. Its upper boundary is the diagonal stripe (c); it extends over the wearer's left shoulder to the sleeve.
   - **(e) Waist seam:** roughly horizontal, slightly curved, at the natural waist.
   - **(f) Brief:** antique bronze/old-gold foil, below the waist.
   - **Sleeves:** the wearer's right sleeve is nude/skin-tone mesh. The wearer's left sleeve appears to be a more saturated gold/ochre (likely gold-tinted mesh or a gold matte fabric; skin barely shows). Possibly asymmetric sleeve colours — partly unclear, as lighting may contribute.
5. **Materials per panel:**
   - (a), (c): **skin-tone stretch mesh-illusion**, high show-through, matched to the model's skin (reads nearly as skin).
   - (b): dark bronze/olive-brown **foil (mystique-like, fine sparkle grain)**.
   - (d): pale gold/champagne **foil on yellow tricot** (shimmering, soft gold highlights; reads like light "mystique" or satin foil).
   - (f): antique gold/bronze **glitter-grain metallic foil**. Strong metallic sheen with a visibly sparkly fine grain (**NEW: glitter-foil / sparkle-grain metallic**, distinct from smooth solid foil). Broad bright highlights on the abdomen and hip.
   - Wearer's left sleeve: gold-tinted mesh or matte gold (unclear).
   - Logo: "Quatro" white, wearer's left hip.
6. **Embellishment:**
   - **Bronze swoosh (b):** **dense fill** of mixed sizes (ss10–ss20, some larger) of clear + AB stones, with some aqua/teal-looking stones (likely AB fire or aquamarine). Roughly 30–50 per 10 cm².
   - **Gold panel (d):** **density gradient** — dense along the upper diagonal seam (just below stripe c), fading to a sparse scatter toward the waist. Mixed sizes, clear/AB.
   - **Mesh yoke and sleeves:** sparse random scatter of tiny/small stones. The wearer's left sleeve cuff has a **dense border band** (~4–5 cm) at the hem, fading upward.
   - Estimated total visible: 900–1300.
7. **Trims & edges:** dark bronze foil binding at the neckline; bronze piping on the seam between stripe (c) and the gold panel; thin bronze binding at the leg openings; sleeve hem finish (self).
8. **Lighting & photography:** studio softbox, white background. The foils show broad bright highlights (gold panel at the upper chest, brief at the hip/abdomen) with sparkle grain inside the highlights. Crystals show pinpoint glints with blue/teal AB fire. Slight compression wrinkles at the waist seam/side.
9. **Hardest aspect / required capabilities:**
   - The hardest part is the asymmetric S-curve swoosh bands crossing the body diagonally, with three different metallic foils plus skin-tone mesh, and a stone-density gradient anchored to a seam.
   - **Freehand curved panel boundaries** across the front, over the shoulder and into the sleeve (asymmetric, not mirrored).
   - **Parallel offset boundary** (stripe of constant width following a curve).
   - **Multiple metallic foil presets** (pale gold, dark bronze, glitter-grain antique gold) with grain/flake normal noise.
   - **Skin-tone mesh** that matches the avatar's skin.
   - **Per-sleeve material assignment** (asymmetric sleeves).
   - **Density gradient driven by distance from a chosen seam.**
   - **Cuff band** stone pattern.

## 5. ella-back.jpg

1. **File / view:** back, worn-on-athlete, low resolution (433×510). Pair B with ella-front.jpg.
2. **Silhouette:** **long sleeves, asymmetric**: the wearer's left sleeve (image-left in this back view) is navy mesh; the wearer's right sleeve is navy foil. **High neck** with a band collar. Leg cut: unclear (cropped; appears medium).
3. **Back design:**
   - **Round/oval keyhole open back:** truly open, from just below the neck band to about mid-scapula. About 9–10 cm wide and 10–12 cm tall, with a smooth rounded bottom. Navy foil binding around it.
   - At the nape the neck band closes above the keyhole; a small skin/flesh-coloured element at the top is probably a clasp or hook (unclear).
   - No straps.
4. **Fabric sectioning / panelling:** asymmetric, about 6 back pieces.
   - **Mesh region:** the wearer's left upper back/shoulder is mesh, continuous with the mesh sleeve. Its inner boundary runs from the keyhole edge down. It forms an upper **swoosh**: a tapering curved band from the wearer's left side/armhole, rising across the back to a point at the wearer's right mid-back (~T7).
   - **Foil band:** a curved band with crystals separates the two mesh swooshes.
   - **Second mesh swoosh:** a lens/swoosh from the wearer's left side at about the lower ribs, rising and tapering to a point at the wearer's right side at about the waist.
   - **Foil lower back/brief.**
   - Swoosh edges: gently curved, tapering to sharp points (crescent/blade shapes).
5. **Materials per panel:**
   - Main: navy/royal-blue **solid metallic foil** (strong electric-blue highlights on a navy base; very reflective).
   - Mesh: navy/black-tinted **stretch mesh**, medium show-through (skin reads darkened).
6. **Embellishment:**
   - Clear crystals, possibly some AB; mixed tiny to medium.
   - Bands of stones follow each mesh swoosh edge on the foil side: dense at the edge, fading away from it.
   - A line of stones along the wearer's left keyhole/shoulder edge.
   - A row of stones along the back neck band.
   - Several stones show 4–6-point starburst glints (photographic star effect or strong point light).
   - Estimated visible: 250–400.
7. **Trims & edges:** foil binding at the keyhole and neck band; sleeve hems unclear.
8. **Lighting & photography:** studio, white background. The foil shows broad high-contrast specular patches (bright electric blue on the upper back/shoulder and seat). The mesh shows skin as a darkened tone. Stones read as pinpoint glints plus some starbursts.
9. **Hardest aspect / required capabilities:**
   - The hardest part is blade-shaped mesh swooshes that taper to points and cross the back asymmetrically, linked to the sleeve.
   - **Tapered crescent/blade panel tool** (two curves meeting at sharp points).
   - **Keyhole cut-out generator** (oval/round, with binding).
   - **Asymmetric sleeve materials.**
   - **Edge-anchored stone density fade.**
   - **High-reflectance foil shader** with a coloured specular.

## 6. ella-front.jpg

1. **File / view:** front, worn-on-athlete, low resolution (418×490). Pair B with ella-back.jpg.
2. **Silhouette:** long sleeves. The wearer's right sleeve (image-left) is navy foil; the wearer's left sleeve (image-right) is navy mesh. **High crew/mock neck** with a band collar. Leg cut: medium-high.
3. **Back design:** see ella-back.
4. **Fabric sectioning / panelling:** asymmetric, about 5 front pieces.
   - **Upper mesh swoosh:** a blade/lens running from a sharp point at the wearer's right upper chest (just below the collar, near the right shoulder) widening across the upper chest to the wearer's left shoulder/armhole, where it merges with the mesh sleeve and yoke.
   - **Foil bust band:** with dense crystals.
   - **Lower mesh swoosh:** a blade from a point at the wearer's right side at about the lower ribs/waist, widening diagonally up toward the wearer's left side at about the underbust.
   - **Foil lower body/brief.**
   - Curve character: asymmetric diagonal, gently curved, blade tips.
5. **Materials per panel:** navy/royal **solid metallic foil**; navy **mesh** (medium show-through; skin reads dark blue-grey).
6. **Embellishment:**
   - **Neck band:** fully covered in 2–3 rows of clear stones (a collar border band).
   - **Foil bands:** dense along the swoosh edges, then a scatter fade toward the foil interior. Clear/AB, tiny–medium.
   - **Below the lower swoosh:** a dense band fading downward to the hip.
   - **Motif:** a small **snowflake/six-arm star** of stones (~2–3 cm) on the wearer's left hip (could be the brand logo).
   - Some starburst glints.
   - Estimated visible: 400–600.
7. **Trims & edges:** foil band collar; other finishes unclear at this resolution.
8. **Lighting & photography:** studio, white background. Strong blue foil highlights (left sleeve, abdomen). The mesh sleeve shows the arm faintly. Starburst glints on several stones.
9. **Hardest aspect / required capabilities:** same as ella-back, plus:
   - **Front-back-continuous asymmetric design** (sleeve plus yoke mesh region spanning front, shoulder and back).
   - **Collar covered with stones** (fill a narrow band region).
   - **Small motif stamp** (snowflake).

## 7. export-image_1b9abe01-c9dd-463c-9044-caefb18875ff.jpg

1. **File / view:** front, worn-on-athlete (adult), cropped neck to upper thigh, pink seamless background. Brand family "triple-swirl logo". No back pair found in this batch.
2. **Silhouette:** sleeveless tank (straps ~5 cm at the shoulder). **High round crew neck.** Leg cut: high. No skirt.
3. **Back design:** not visible.
4. **Fabric sectioning / panelling:** symmetric, about 6 pieces.
   - **Shoulder yokes (×2):** black mesh wedges over the top of each shoulder, from the neckline to the armhole, ~4–6 cm deep, with the lower edge running diagonally from the neckline down to the front armhole. Black piping marks the lower edge.
   - **Centre-front vertical strip:** black mesh ~4–5 cm wide, straight, from the neckline to the waist band.
   - **Waist band:** black mesh, ~5 cm tall, straight horizontal at the natural waist, side seam to side seam. Together with the centre strip it forms a "T" (inverted "⊥").
   - **Two bodice panels** (left and right of the centre strip) and the **lower body/brief**, all in teal foil.
5. **Materials per panel:**
   - Main: cerulean/teal-blue base with a green-aqua iridescent foil overlay. The highlights shift to aqua/green (colour shift with angle). Fine sparkle grain. Classify as **mystique / iridescent foil (NEW: duochrome iridescent foil — blue base, green highlight)**.
   - Black **stretch mesh**: medium-dark tint; skin shows through dimly.
   - Logo: white embroidered triple-swirl on the wearer's left hip (**NEW: embroidery** as a logo method).
6. **Embellishment:** all small AB/clear stones (~ss8–ss10, uniform size).
   - **Centre strip:** two parallel vertical columns of stones along its full length (~1.5 cm apart).
   - **Waist band:** two parallel horizontal rows across the full width.
   - **Shoulder yokes:** dense random scatter.
   - **Bodice:** about 6–7 **curved single-stone lines per side** that fan out from near the centre strip at the upper chest, arc outward over the bust, and curve back in toward the waist band. Like rib/feather lines or a radiating fan; mirrored left/right. Lines stop just above the waist band.
   - Estimated total visible: 600–800.
7. **Trims & edges:** black binding on the neckline and armholes; black piping on the yoke edges; mesh bands bound or edged in black. The leg finish is self (teal).
8. **Lighting & photography:** studio softbox, pink seamless background. The foil shows bright aqua-green specular patches on the bust and below the bust, with a sparkly grain inside the highlights; elsewhere it is deep blue. Stones read as small white/rainbow dots with pinpoint glints. Slight horizontal stretch wrinkles at the waist band.
9. **Hardest aspect / required capabilities:**
   - The hardest part is the iridescent/duochrome foil colour shift and the mirrored curved stone-line fan.
   - **Duochrome/iridescent foil shader** (view-dependent hue shift: base hue at normal, shifted hue at the specular peak) with flake grain.
   - **Straight band panels** (vertical strip, waist band) with exact widths.
   - **Mirrored curved stone-line set** (draw one line, mirror it, and array with offset/morph).
   - **Stone rows inside a band** (N parallel rows centred in a strip).
   - **Embroidered logo decal** (raised thread look).

## 8. export-image_1dfae2a5-7ca3-4f89-9a6e-f1ed1c3eda21.jpg

1. **File / view:** back, worn-on-athlete (teen/adult), full back view head to thigh, pink seamless background. Pair C with export-image_b630e14b (front). Triple-swirl family.
2. **Silhouette:** **3/4 sleeves**, black mesh on both arms (end below the elbow). **High neck** with a red band collar (~2 cm) closed at the nape with a **clear plastic hook/clasp**. Leg cut: high (back coverage moderate, high-cut at the side).
3. **Back design** (a close crop was inspected):
   - **Black mesh yoke** across the upper back and both shoulders, continuous with the sleeves.
   - **Large open keyhole:** a rounded-rectangle/U-shaped opening below the collar, ~12–14 cm wide, from below the collar to about T6–T7. Its lower and side edges are the **red bodice's U-shaped top edge** (black-bound); its upper edge is the collar/yoke.
   - **Two flat black straps** (~2–2.5 cm, matte tricot) cross once inside the opening:
     - **Strap A:** starts at the yoke edge near the collar on the wearer's left (image-left). It runs down and to the image-right across the opening, crosses the red bodice as an applied band, and ends at the wearer's right side at about armpit/upper-rib level.
     - **Strap B:** starts at the collar on the wearer's right of the clasp. It runs steeply down and to the image-left through the bottom of the opening (the cross point is just above the opening's bottom), continues across the red bodice as an applied band, and ends at the wearer's left side at about lower-rib level.
     - The straps are separate pieces (they float over the opening), anchored to the collar/yoke at the top and becoming applied bands on the bodice below.
   - **Inverted-V seam (chevron):** from the bottom centre of the keyhole, a black-bound seam runs down-left to the wearer's left side seam (~waist) and down-right to the wearer's right side seam (~lower ribs). It is slightly asymmetric because of the arm pose. The result is a layered chevron arrangement of black lines below the opening.
4. **Fabric sectioning / panelling:** about 5–6 back pieces: collar; mesh yoke; upper red bodice pieces (between the keyhole and the chevron); lower red back/brief; straps. The black lines are straight to gently curved and nearly mirrored, with the strap crossing adding asymmetry.
5. **Materials per panel:**
   - Red: tomato/coral-red **matte tricot** (low sheen; soft diffuse shading).
   - Black **stretch mesh**: medium-dark; skin shows through as dark grey-tan.
   - Straps and bindings: black matte tricot.
   - Clasp: clear plastic.
6. **Embellishment:** clear/AB stones, tiny–medium mixed.
   - **Collar:** a row of stones around the collar band.
   - **Mesh yoke:** sparse scatter.
   - **Red bodice below the chevron lines:** **border bands** of 3–5 rows hugging each black line, with a **density fade** downward/outward (dense rows then scattered stones). This produces a chevron of sparkle.
   - **Sleeves:** vertical **"rain" streaks** — dashed lines of 4–12 small stones running along the arm axis, randomly staggered. Plus a **dense cuff band** (3–4 rows, ~4 cm) at each sleeve hem.
   - Estimated total visible on the back: 700–1000.
7. **Trims & edges:** black binding on the keyhole/bodice edges and the chevron seams; red collar band; clear clasp; leg openings self-finished (red).
8. **Lighting & photography:** studio softbox, pink seamless background. The matte red shows soft gradation. The mesh shows the arm silhouette clearly through it. The stones show strong AB colour fire (pink/blue/green) and pinpoint glints. Visible wrinkle folds on the raised-arm sleeve.
9. **Hardest aspect / required capabilities:**
   - The hardest part is the layered strap/keyhole structure: floating straps over an opening that turn into applied bands on the bodice.
   - **Strap tool:** straps that can float over cut-outs and continue as appliqué bands on the surface (one entity, two modes).
   - **Keyhole cut-out** whose edge is a panel boundary.
   - **Collar with clasp hardware** (small mesh/accessory asset).
   - **Seam-hugging border band** stone generator (N rows plus fade).
   - **"Rain streak" stone pattern** (random dashed lines aligned to a direction field, e.g. along the sleeve).
   - **Cuff band** pattern.
   - **Matte tricot shader** with soft sheen, plus a dark mesh shader.

## 9. export-image_b630e14b-e112-4e83-a991-3cad63bade07.jpg

1. **File / view:** front 3/4, worn-on-athlete, cropped below the chin to the upper thigh, pink seamless background. Pair C with export-image_1dfae2a5 (back).
2. **Silhouette:** 3/4 sleeves of black mesh (the wearer's right arm is raised and partly visible; the wearer's left sleeve ends below the elbow). High neck with a red band collar. Leg cut: high.
3. **Back design:** see export-image_1dfae2a5.
4. **Fabric sectioning / panelling:** asymmetric.
   - **Black mesh yoke** over the wearer's right shoulder (image-left), continuous with the sleeve.
   - **Black mesh crescent** across the upper chest just below the collar, from the wearer's right shoulder tapering toward the centre/left (a thin lens).
   - **Black mesh blade:** on the wearer's left upper chest, from the armhole/shoulder seam tapering to a sharp point at about the bust-apex level near mid-chest (a crescent wedge pointing diagonally down toward the centre).
   - **Red main body:** one large piece from the collar to the brief (no waist seam visible).
5. **Materials per panel:** red **matte tricot**; black **mesh**; the collar is red tricot.
6. **Embellishment:** a large **diagonal comet/meteor sweep** from the wearer's left shoulder down to the wearer's right hip.
   - **Main sweep:** a dense curved band of stones arcing from the wearer's left upper chest/armhole down and across to the wearer's right lower abdomen/hip. The tail is fragmented into streaks.
   - **Streak lines:** many short and long parallel diagonal lines of single small stones fill the upper bodice (direction: down-left), like rain/speed lines.
   - **Drip/fringe under the sweep:** larger **navette/marquise** (pointed oval, ~4×8 to 5×10 mm) and **pear** stones hang below the main arc in short downward-pointing columns ("drips").
   - **Mixed sizes:** tiny ss6 to large ss20 rounds, plus navettes and pears; AB/clear.
   - **Collar:** a row of stones; also dense stones at the upper chest just under the collar.
   - **Sleeve:** vertical rain streaks plus a dense cuff band (3–4 rows) at the wearer's left sleeve hem.
   - **Mesh blade:** dense fill of stones.
   - Estimated total visible: 1200–1800 (the most heavily stoned image in the batch).
   - Logo: white embroidered triple-swirl on the wearer's left hip.
7. **Trims & edges:** collar band; mesh edges appear bound in black; leg openings self-finished.
8. **Lighting & photography:** studio softbox, pink background. Strong AB fire; pinpoint glints with a few small starbursts. The matte red shows soft shading. Stones over the mesh read clearly against the dark background.
9. **Hardest aspect / required capabilities:**
   - The hardest part is the large free-form comet sweep: density along a curved spine, streaks aligned to a flow direction, and mixed-shape drip stones oriented along that flow.
   - **Flow-field/brush stone painting:** paint a stroke and stones fill it with a density profile across the stroke and fading along its length; stone orientation follows the stroke direction.
   - **Streak generator** (dashed lines parallel to a direction).
   - **Navette/marquise and pear shapes** with per-stone rotation.
   - **Blade/crescent mesh inserts.**
   - **Asymmetric design workflow** (no mirroring).

## 10. f035dc111ee9b4990169179705fa4682.jpg

1. **File / view:** front, worn-on-athlete, cropped neck to upper thigh, white background. Quatro family ("Quatro" silver hip logo). No pair.
2. **Silhouette:** sleeveless tank (straps ~5 cm). Neckline: **shallow V/scoop** (wide, slightly V-pointed at centre). Leg cut: high. No skirt.
3. **Back design:** not visible.
4. **Fabric sectioning / panelling:** symmetric, about 5 regions.
   - **White yoke:** over both shoulders and the upper chest. Its lower edge is a **V**: from each front armhole (wearer's right at the armpit/front-shoulder, wearer's left at the front shoulder) down to a point at the sternum, about 8–10 cm below the neckline.
   - **Silver X:** two **silver bands (~1 cm)** start at each shoulder/armhole along the yoke's V edge, **cross at the sternum point**, and continue diagonally to the opposite waist sides (each ends at the side seam at the natural waist). This is a straight **X**.
   - **Silver arch (lower):** a curved band from the wearer's right side waist (where X arm B ends) arcing upward to a **pointed cusp at centre front** (~5 cm above the waist, below the sternum crossing), then down to the wearer's left side waist. The curves are concave (gothic-arch/ogee-ish "∧"). It forms a **diamond/heart-shaped central panel** bounded by the two lower X arms (above) and the arch (below).
   - **Navy regions:** side panels (between the X arms and the armholes/sides), the central diamond, and the lower body below the arch.
   - The silver bands look like **appliqué strips or wide piping** sewn over the seams.
5. **Materials per panel:**
   - Yoke: white **shiny tricot** (smooth satin sheen; possibly faint shimmer).
   - Body: navy **shiny tricot (wet-look)**, deep navy with broad blue-white highlights. A faint fine sparkle might suggest mystique — unclear.
   - Bands: **silver metallic/glitter foil** strips (sparkly fine grain).
   - Logo: "Quatro" printed in silver, wearer's left hip.
6. **Embellishment:** clear/AB, tiny to medium mixed.
   - **White yoke:** a radiating fan of dotted lines spreading from the V point upward toward the neckline, with a density gradient (dense near the point, sparse at the neckline).
   - **Side navy panels:** scatter that is dense near the upper armhole/X-arm edges and fades downward and outward (some radiating lines).
   - **Central diamond:** dense along both X arms and the arch, fading toward the diamond centre (a V of dense stones).
   - **Below the arch:** a **single dotted row** paralleling the arch ~2 cm below it, from side to side (an echo line).
   - Estimated total visible: 700–1000.
7. **Trims & edges:** white binding at the neckline and armholes (continuing on the navy side panels as white binding); silver bands over the seams; leg openings navy self.
8. **Lighting & photography:** studio softbox, white background. The navy shows broad sheen patches (bust, side). The silver strips sparkle. Pinpoint glints on the stones.
9. **Hardest aspect / required capabilities:**
   - The hardest part is a crisp geometric X plus arch layout where the trim bands are their own material layered over the seams.
   - **Trim/appliqué band tool:** a band of set width following any seam or path, with its own material (silver foil), including crossing bands.
   - **Seam snapping:** bands snap to panel boundaries; panel boundaries made of lines plus arcs with a cusp.
   - **Echo/offset stone line** parallel to a seam.
   - **Region-bounded density gradient** (dense at the boundary, sparse in the interior).

## 11. gem-black-pre-order-delivery-from-april-th- (1).jpg

1. **File / view:** back 3/4 view (back-side), worn-on-athlete, very low resolution (246×406), white background. The filename says "gem black", but the garment shown is a mint floral print (the filename likely refers to a product listing; it does not match the colourway shown). No pair in this batch.
2. **Silhouette:** sleeveless; **racerback-style straps** (narrow). Leg cut: medium-high. No skirt.
3. **Back design:**
   - **Two shoulder straps** (~2.5–3 cm) come in toward the spine and **cross/twist once** at the upper back (about T2–T3), forming an X.
   - Below the X, the straps re-open into a **teardrop keyhole** (truly open, skin visible), ~5 cm wide by 6–7 cm tall, ending at about mid-scapula, where the back bodice resumes.
   - The cross looks like a twisted-strap detail (the straps appear to wrap around each other; unclear at this resolution).
   - **Mesh band:** a horizontal **mint mesh band** (~8–10 cm tall) across the back from about the lower scapula/bra line to the waist, side seam to side seam (it may wrap to the front; unclear). The skin is clearly visible through it.
4. **Fabric sectioning / panelling:** about 4 visible pieces: upper back print (with straps); mesh band; lower back/brief print; possibly a separate strap piece. Seams are straight horizontal at the top and bottom of the band.
5. **Materials per panel:**
   - Print: **sublimation print**, small-scale **ditsy floral** (pink, red, magenta, purple, blue and yellow flowers with green leaves) on a mint/aqua ground. Matte or low sheen (unclear).
   - Band: mint/aqua **tinted stretch mesh**, medium-high show-through.
6. **Embellishment:** none visible (resolution too low to rule out tiny stones).
7. **Trims & edges:** self-fabric (printed) binding on the straps, keyhole and leg; details unclear.
8. **Lighting & photography:** studio, white background, soft; low resolution and slightly blurred. The mesh shows the skin underneath.
9. **Hardest aspect / required capabilities:**
   - The hardest part is the twisted crossed straps with a teardrop keyhole below, plus a scaled all-over floral print.
   - **Strap generator with a twist/cross** at a chosen spine height.
   - **Teardrop keyhole.**
   - **All-over print fill** with a scale control and seamless tiling across panels (print continuity across seams is optional).
   - **Horizontal mesh band.**

## 12. IMG_4141.PNG

1. **File / view:** front, worn-on-athlete (child), phone video screenshot (636×922, compressed). Gym setting.
2. **Silhouette:** sleeveless with **cut-in racer/halter armholes** (narrow shoulders). **High scoop/round neck.** Leg cut: medium. No skirt.
3. **Back design:** not visible. (Pale pink straps visible at the shoulders behind may be a sports bra underneath — unclear.)
4. **Fabric sectioning / panelling:** complex wrap bodice with cut-outs.
   - **Centre mesh lens:** a **vesica/almond (pointed ellipse)** mesh insert at the sternum, ~9 cm wide by 20 cm tall, from about 4 cm below the neckline down to about the underbust. Its edges are navy-bound.
   - **Bodice side panels:** wrap around the lens; ombre lilac → blue fabric.
   - **Diagonal wrap band:** a band (~6 cm) sweeps from the wearer's right side (image-left) under the bust, curving down across the centre beneath the lens, toward the wearer's left waist. It looks like a sash crossing behind/under the waist band (wrap illusion).
   - **Waist band:** navy, ~5 cm, straight horizontal at about lower-rib level, side to side, densely stoned.
   - **Side cut-outs (open):** triangular openings at each side between the bodice's lower edge and the waist band, ~5 cm.
   - **Midriff cut-out (open):** a large **half-oval/arch** opening below the waist band, exposing the navel area, ~14 cm wide, ~6–7 cm tall at the centre. Its lower edge is a navy-bound arch. The bodice and brief connect only at the sides.
   - **Brief:** lower panel.
5. **Materials per panel:**
   - Bodice: **sublimation ombre/gradient**, diagonal from light lilac/lavender (wearer's right upper chest, image-left) to periwinkle/royal blue (wearer's left and lower). The base looks like shiny tricot (moderate sheen).
   - Brief: periwinkle/blue shiny tricot, darkening toward navy at the crotch (possibly also gradient).
   - Mesh lens: navy/black **mesh**, medium show-through.
   - Waist band and bindings: navy tricot.
6. **Embellishment:** clear stones (read as white dots), tiny–small (ss6–ss10).
   - **Bodice:** uniform random scatter with a density gradient: denser over the blue areas (wearer's left upper chest) and around the lens; sparser over the lilac.
   - **Mesh lens:** even scatter.
   - **Lens border:** a single outline row of stones.
   - **Waist band:** dense grid of about 4–5 rows.
   - Estimated total visible: 700–1000.
7. **Trims & edges:** navy binding at the neck, armholes, lens edges, cut-out edges and band.
8. **Lighting & photography:** **gym fluorescent overhead** plus mixed daylight; phone camera. Low contrast. Stones read as white dots with few glints. The fabric shows broad soft highlights. Useful real-world reference: under flat gym light, sparkle is subdued compared with studio shots.
9. **Hardest aspect / required capabilities:**
   - The hardest part is multiple open cut-outs (sides plus an arch midriff) that structurally split the bodice from the brief, combined with a wrap-band illusion and a diagonal ombre print.
   - **Arbitrary cut-out shapes** (arch, triangle) whose edges get binding automatically.
   - **Topology:** a garment that is connected only at the sides (the cut-out removes the front midriff).
   - **Vesica/lens insert tool.**
   - **Gradient (ombre) fill** with angle and colour stops.
   - **Stone grid fill inside a band.**
   - **Lighting preset: "gym fluorescent".**

## 13. IMG_4465.jpg

1. **File / view:** front, worn-on-athlete, competition/arena photo (428×547, blurry, compressed). Triple-swirl family (embroidered triple-swirl logo on the wearer's left hip).
2. **Silhouette:** long sleeves (at least the wearer's left sleeve is visible to the wrist area; sleeve fabric appears the same royal blue, possibly slightly sheer at the upper arm — unclear). **High neck / mock.** Leg cut: high.
3. **Back design:** not visible.
4. **Fabric sectioning / panelling:** no clear seams visible on the front; it appears to be **one main body fabric**. Sleeves possibly mesh (unclear). The design is carried entirely by crystals.
5. **Materials per panel:** royal/cobalt blue. It has a soft, deep, low-sheen look — possibly **stretch velvet** or matte tricot (unclear at this resolution).
6. **Embellishment:**
   - **"Fountain/peacock fan":** many curved lines of stones radiate upward and outward from a **convergence point at the centre front waist** (about navel level), spreading across the chest to both shoulders. Lines are denser and longer at the centre. Roughly symmetric.
   - **Waist band:** a **curved band (shallow U/V dipping to the centre convergence point)** of 3–5 dense rows from side to side, fading downward.
   - **Neckline/yoke:** a row along the collar and an arc of stones at the upper chest (necklace).
   - **Shoulder/upper sleeve:** lines continue onto the shoulders.
   - Colours: clear + AB, with some stones showing yellow/green/aqua (possibly coloured stones or AB fire — unclear). Mixed small–large, with larger stones near the convergence point.
   - Estimated total: 1000–1500.
7. **Trims & edges:** not resolvable.
8. **Lighting & photography:** **arena spotlights** (competition floor, beige background). Strong **starburst flares** (4–8-point stars) on many stones and **colour fire** (yellow, green, blue). Overall the bodice appears to shimmer. This is a key reference for "sparkle under competition lighting" — stones bloom and flare far more than in studio shots.
9. **Hardest aspect / required capabilities:**
   - The hardest part is a radial stone-line fan converging on one point, with realistic arena-light flaring at 60 fps.
   - **Radial/converging line generator** (lines from a focal point, with length/spread controls).
   - **Curved band** (dipped waist band).
   - **Crystal glint post-effect:** bloom plus starburst streaks driven by per-stone specular, plus dispersion colour fire.
   - **Lighting preset: "arena spot".**
   - **Velvet shader** (if it is velvet).

## 14. IMG_4467.jpg

1. **File / view:** front, worn-on-athlete (teen), phone photo at home (bedroom, ballet barre/conditioning equipment visible). 630×852.
2. **Silhouette:** sleeveless with **cut-in racer/halter armholes**. **High neck** with a pale-pink band collar (~2 cm). Leg cut: high. No skirt.
3. **Back design:** not visible.
4. **Fabric sectioning / panelling:** symmetric, about 4 pieces.
   - **Centre mesh V:** pale pink mesh, a V from the full width of the neck band down to a point at about bust-apex level at centre front.
   - **Underbust "Y":** from the V point, two **straight trim lines** run diagonally down and outward to each side seam at about underbust level, forming an inverted V / "Y" with the V edges.
   - **Main body:** hot pink. There are probably separate upper-bodice and lower-body pieces divided by the underbust lines (seams covered by trim).
5. **Materials per panel:**
   - Main: hot/bubblegum pink **shiny tricot** (moderate sheen). Some sparkle could be mystique foil-dot rather than stones — the glints look like individual stones, but this is unclear at this resolution.
   - Mesh: pale pink **tinted mesh**, medium show-through.
   - Trims: pale pink binding/piping, possibly with tiny stones on top.
6. **Embellishment:** very dense all-over scatter of tiny–small clear/AB stones (ss6–ss10). Faint radiating line structure from the V point outward over the bust. Density gradient: densest on the upper bodice and around the V, fading downward to the hips, with a sparse scatter on the mesh. Estimated total: 800–1200.
7. **Trims & edges:** pale pink contrast binding at the collar and armholes; pale pink trim on the V edges and underbust lines.
8. **Lighting & photography:** indoor diffuse daylight plus room light; phone camera. Stones read as pale pink/white dots. Little flare.
9. **Hardest aspect / required capabilities:**
   - The hardest part is dense fine scatter with a smooth vertical density fade.
   - **Density-map painting** (gradient or brushed density mask) driving a random scatter with a minimum spacing (Poisson disk).
   - **V mesh insert** linked to a cut-in halter neck.
   - **Contrast piping lines** on seams.
   - **Lighting preset: "indoor daylight / phone".**

## 15. IMG_4468.jpg

1. **File / view:** front 3/4, worn-on-athlete, dramatic **low-key photo** (black background, single hard key light from the upper image-left). 604×867.
2. **Silhouette:** long sleeves of black mesh (the wearer's left arm is raised). **High mock neck.** Leg cut: high.
3. **Back design:** not visible.
4. **Fabric sectioning / panelling:** symmetric, about 7 pieces.
   - **Black mesh yoke:** upper chest and shoulders, continuous with the sleeves.
   - **Emerald centre panel:** a **shield/V** from the yoke's lower edge (at about bust-top level, spanning from armhole to armhole) narrowing to a sharp point at centre front at about the waist/navel. Its outer boundaries are gently curved.
   - **Two black divider strips:** ~1 cm, inside the emerald panel, curving from the yoke edge down and converging toward the bottom point. They split the emerald into a narrow centre V and two side lobes, giving a **three-section emerald shield**.
   - **Black side panels and lower body/brief.**
5. **Materials per panel:**
   - Centre: emerald/jade green **glitter-coated tricot** or mystique (very fine sparkle grain, glittery).
   - Body: black **shiny tricot** (smooth, with sharp-ish highlights on the hip).
   - Yoke and sleeves: black **mesh**, medium-high sheerness (skin visible).
6. **Embellishment:** clear/AB, mostly small–medium; very prominent in this lighting.
   - **Yoke "spider web / lattice":** lines radiating from the neckline and crossed by concentric scalloped rows, forming a web/necklace lattice over the mesh yoke.
   - **Panel outlines:** single and double rows of stones outline every panel edge (the shield edges, both divider strips, the yoke edge).
   - **Emerald side lobes:** scattered stones.
   - **Art-deco stepped motifs:** a **stepped/zig-zag "Greek key" line** outlined in stones on the black at the wearer's left hip, and stepped square motifs on the yoke at the wearer's left shoulder.
   - **Neck:** a small **cross-shaped stone motif** (possibly a pendant/necklace; unclear).
   - Estimated total visible: 600–900.
7. **Trims & edges:** black dividers (piping or bands); collar finish unclear.
8. **Lighting & photography:** **single hard spotlight, black background** (theatrical). Stones produce sharp pinpoint glints with some colour fire. The emerald glitter sparkles densely. The black fabric shows narrow sharp highlights along the hip curvature. Most of the garment falls into deep shadow — a good test for specular-only readability.
9. **Hardest aspect / required capabilities:**
   - The hardest part is the outline-everything stone style plus a geometric web lattice and art-deco stepped motifs.
   - **Auto-outline:** place a stone row (single or double, with offset) on any panel boundary.
   - **Web/lattice generator** (radial lines plus concentric scallops).
   - **Polyline motif tool** (stepped/zig-zag, straight segments with right angles).
   - **Divider strips inside a panel.**
   - **Glitter-coated tricot shader** (dense micro-flake).
   - **Lighting preset: "low-key spot".**

## 16. IMG_4470.jpg

1. **File / view:** front, worn-on-athlete (child), phone photo indoors at home (kitchen/bathroom). 937×1020.
2. **Silhouette:** **3/4 sleeves** (end just below the elbow) with black cuffs. **High crew neck** with a crystal band. Leg cut: high. No skirt.
3. **Back design:** not visible.
4. **Fabric sectioning / panelling:** possibly mostly **all-over sublimation** rather than separate panels (the surfaces look flat and printed).
   - **Raglan-like yoke boundary:** the black centre chest region is a rounded shape whose edges curve from the neck out and down to the underarms. The lavender shoulder caps continue into the sleeves (raglan look).
   - **Woven ribbon zone:** an inverted-shield region from the side waists/lower ribs whose top edge rises to a V at centre front (~sternum/upper abdomen) and whose bottom tapers to a V point at the lower abdomen (just above the crotch top).
   - **Black brief.**
   - Symmetric.
5. **Materials per panel:**
   - **Sublimation print:** interwoven diagonal ribbons in a basketweave/lattice, rendered with an over-under illusion. Each ribbon has a soft gradient from teal/turquoise to lavender to blue, on black.
   - **Sleeves:** printed diagonal plaid-like stripes in teal, lavender and black.
   - **Upper chest:** black.
   - Base fabric looks matte to low-sheen tricot.
6. **Embellishment:** clear, tiny–small.
   - **Upper chest black area:** dense near-uniform scatter (~grid-like), slightly denser toward the bottom.
   - **Ribbon edges:** stone lines **outline every ribbon edge**, following the printed design.
   - **Shield/V border:** a row outlining it.
   - **Sleeves:** stone lines along the stripe edges, plus cuff rows.
   - **Collar:** covered.
   - **Logos:** rhinestone script/initials logo (unreadable, maybe "SP"/"JSP") on both hips — a **rhinestone text** motif.
   - Estimated total: 1500+.
7. **Trims & edges:** black cuffs/hems; collar band.
8. **Lighting & photography:** indoor mixed light, phone. Stones read as white dots; little flare. The printed gradients are clearly visible.
9. **Hardest aspect / required capabilities:**
   - The hardest part is stones that must align exactly with printed artwork (ribbon edges), across a raglan yoke.
   - **Print-aware stone placement:** trace print edges (vector import, then stone paths).
   - **Woven/lattice print generator** (ribbons with over-under and per-ribbon gradients) or SVG print import.
   - **Raglan sleeve seam option.**
   - **Rhinestone text/logo tool** (font to stone path).

## 17. IMG_4477.jpg

1. **File / view:** front, worn-on-athlete, competition arena (podium "3" and boards in the background). 844×692, phone photo.
2. **Silhouette:** **elbow-length/3-4 sleeves** (end at about the elbow). **Mock/high neck** with a black collar band. Leg cut: high.
3. **Back design:** not visible.
4. **Fabric sectioning / panelling:**
   - **Bodice plus sleeves:** probably one sublimated piece.
   - **Waist seam:** horizontal at the natural waist, marked by a crystal band.
   - **Brief:** black.
5. **Materials per panel:**
   - **Bodice:** **sublimation ombre** — black at the upper chest and collar, glowing to a **chartreuse/lime yellow-green band** across the mid-chest/bust, then back to black at the waist (a horizontal "glow" band). The sleeves are similar: lime glow at the upper arm/elbow area fading to black at the shoulder.
   - **Brief:** black **stretch velvet (crushed)** — mottled light/dark patches typical of crushed velvet pile.
   - Logo: white three-ring logo on the wearer's left hip.
6. **Embellishment:**
   - **Geometric lattice:** lines of small stones forming a triangle/isometric grid over the bodice glow area, with **6-point star/snowflake bursts** (made of stones) at many nodes. Also on the sleeves.
   - **Upper chest band:** a dense horizontal band (~3 cm) across the chest and shoulders below the collar, with a scatter fading upward to the neck.
   - **Waist band:** 2–3 rows on the waist seam.
   - **Sleeve cuffs:** 2–3 rows, plus one parallel line above.
   - Clear/AB, tiny–medium.
   - Estimated total: 1000–1400.
7. **Trims & edges:** black collar; the sleeve hems look self-finished.
8. **Lighting & photography:** **arena lighting**, phone. Some stones produce strong starburst flares; there is visible colour fire. The velvet brief shows mottled sheen and darker crush patches.
9. **Hardest aspect / required capabilities:**
   - The hardest part is a geometric lattice-with-stars stone pattern laid over a soft ombre, plus a crushed velvet brief.
   - **Geometric grid pattern generator** (triangle/hex/diamond lattice clipped to a region, with motif stamps at nodes).
   - **Ombre band** (black → lime → black) as a gradient with multiple stops.
   - **Crushed velvet shader** (pile direction noise, sheen at grazing angles, mottling).
   - **Mixed fabric across a seam** (printed bodice, velvet brief).

## 18. IMG_4527.jpg

1. **File / view:** front, worn-on-athlete (arms raised), competition setting, spectators in the background. 496×752, blurry.
2. **Silhouette:** **long sleeves** of black sheer mesh. **High mock neck.** Leg cut: high.
3. **Back design:** not visible.
4. **Fabric sectioning / panelling:** symmetric base with an asymmetric sash.
   - **Black mesh yoke and sleeves:** the upper chest yoke appears mesh.
   - **Bodice:** dark gunmetal/navy-black.
   - **Diagonal sash/wrap band:** ~8–10 cm wide, from the wearer's left shoulder (image-right) diagonally down across the chest to the wearer's right side/waist. It appears to be a separate black band (possibly with a draped or pleated look; unclear).
   - **Waist seam:** straight horizontal.
   - **Brief:** black.
5. **Materials per panel:**
   - Bodice: dark slate/navy-black **shiny tricot or foil**, with broad grey-silver highlights (possibly a black mystique; unclear).
   - Sash and brief: black, matte to low sheen.
   - Sleeves: black mesh with high show-through.
6. **Embellishment:** **gold** stones (gold/topaz or "aurum"-coated crystals — the only gold-coloured stones in this batch).
   - **Sash:** many short diagonal gold dashes (elongated stones or bugle beads, or short lines of 2–3 small stones; unclear) laid in rows parallel to the sash, like streaks.
   - **Bodice:** a **diamond (argyle) lattice** of single gold stone lines across the bodice, with **fan/burst clusters** (V-shaped sprays) at the lattice intersections.
   - **Waist band:** dense rows (3–4) of gold stones on the seam, with **hanging fringe columns** below.
   - **Hip motif:** an 8-point star outline (two overlapping squares) in gold stones on the wearer's left hip (probably the brand logo).
   - **Mesh yoke:** scatter.
   - Estimated total: 900–1300.
7. **Trims & edges:** unclear.
8. **Lighting & photography:** arena overhead light; blurry phone shot. Gold stones read as warm glints. The bodice shows broad sheen highlights.
9. **Hardest aspect / required capabilities:**
   - The hardest part is a diagonal sash layered over an argyle stone lattice, with elongated gold stones aligned to the sash.
   - **Overlay band/sash panel** crossing the body diagonally (appliqué on top of the base panels).
   - **Diamond lattice generator** with node stamps.
   - **Coloured/metallic stone coatings** (gold/aurum).
   - **Elongated stone or bugle-bead shapes** with orientation.
   - **Fringe band.**

---

# Batch summary

## Recurring patterns
- **Mesh as a design element in nearly every garment** (14 of 18 images): skin-tone, tinted-to-match, navy/black. Used for yokes, sleeves, V/lens inserts, swoosh/blade inserts, and horizontal bands. Show-through ranges from almost invisible (tinted mauve) to near-skin (nude mesh).
- **High necks dominate:** mock/band collars (ella, red pair, 4465, 4467, 4468, 4470, 4477, 4527, e49647, 1b9abe01, DAPHNE). The collar is often fully stoned.
- **Waist band / waist seam as a sparkle line:** a horizontal or dipped band of 2–5 rows of stones, often with a fringe/drip hanging below it (e49647, 1b9abe01, 4141, 4465, 4477, 4527).
- **Stone density gradients anchored to seams:** dense hugging a seam or edge, fading into the panel. This is the default crystal "language" across the brands.
- **Radiating/fan line patterns:** curved single-stone lines fanning from a point or edge (DAPHNE_FRONT, e49647, 1b9abe01, f035, 4465, 4467).
- **Asymmetric diagonal swooshes** from one shoulder to the opposite hip (ecf4, ella pair, b630, 4527), often tied to **asymmetric sleeves** (ella pair: one foil, one mesh; ecf4: possibly nude vs gold).
- **Sleeve cuff bands plus "rain" streaks** on mesh sleeves (red pair, ecf4, 4477).
- **Contrast binding/piping on every edge** (DAPHNE, f035 silver bands, 1b9abe01 black, 4467 pale pink).
- **Embroidered or printed hip logos** in almost every product shot (a decal layer is needed).

## Rare or unique features in this batch
- **Overlapping semi-sheer lace wrap pieces** with visible under-layer edges (DAPHNE_BACK) — the only true layered-panel back in the batch.
- **Floating straps that become applied bands** over a keyhole, plus a **clear plastic collar clasp** (1dfae2a5).
- **Arch-shaped midriff cut-out** that separates the bodice from the brief except at the sides (4141).
- **Woven-ribbon sublimation print with stones tracing the print** (4470).
- **Geometric triangle lattice with 6-point stone stars**, over a black→lime ombre, with a **crushed velvet brief** (4477).
- **Art-deco stepped motifs and a web lattice** (4468).
- **Gold stones and an argyle lattice with a diagonal sash** (4527).
- **Representational motif (bow)** with **multi-colour stone ombre** (DAPHNE_FRONT).
- **Pear and navette stone shapes** in fringe/drip arrangements (e49647, b630).
- **Duochrome iridescent foil** (blue → green, 1b9abe01) and **glitter-grain antique-gold foil** (ecf4).
- **Ditsy floral all-over print with twisted crossed straps** (gem-black).

## Top 10 capabilities this batch demands
1. **Freehand panel-boundary authoring on the 3D body:** curves, S-curves, sharp V and cusp points, blade/lens shapes tapering to points. Boundaries can cross the shoulder into sleeves and run front↔back. Supports both mirrored and fully asymmetric designs.
2. **Seam-anchored stone generators:** outline rows (single/double, offset), border bands of N rows, and density fades by distance from a chosen seam or edge. This one capability covers most of the crystal work in the batch.
3. **Path- and brush-based stone placement:** stones along freehand curves (with per-path size and colour gradients), radial/converging fans, streak/"rain" fields, comet-style brush strokes with flow-aligned orientation, and mirroring/arraying of line sets.
4. **Pattern generators:** fringe/drip bands, cuff and collar bands, grid/row fills inside a band, geometric lattices (triangle, diamond, web) with node motif stamps, and Poisson-disk random scatter driven by a paintable density map.
5. **A stone library beyond round:** round sizes ss6–ss30, pear, navette/marquise and elongated/bugle shapes, with per-stone rotation. Coatings: clear, AB, coloured (sapphire, light blue, gold), plus multi-colour gradients.
6. **Crystal rendering at 60 fps:** a faceted/glint shader with AB thin-film colour and dispersion fire, plus a screen-space bloom/starburst glint pass. It must read correctly from soft studio light (pinpoint glints) up to arena spotlights (large starbursts). Instancing is needed for 1,000–2,000 stones.
7. **Mesh material:** tint colour plus opacity/show-through control, including a skin-tone mesh that matches the avatar. It must render the skin underneath, with correct layering over other panels and over lace.
8. **Fabric shader presets:** matte tricot, wet-look/satin tricot, solid metallic foil (coloured specular), duochrome iridescent foil, glitter-grain foil / glitter-coated tricot (micro-flake), stretch velvet including crushed velvet, and lace (tileable texture with an alpha/opacity map).
9. **Openings and straps:** keyholes (round, teardrop, rounded-rectangle), arbitrary cut-outs (side triangles, midriff arch), wrap/cross-back edges, and a strap tool (crossing, twisting, floating over openings, turning into applied bands). Binding is applied automatically to every new edge, and the garment topology must allow front pieces that connect only at the sides.
10. **Surface/print layers and trims:** sublimation fills (multi-stop and angled ombre, all-over tiled prints, SVG/vector artwork import with stones snapping to print edges), contrast binding and piping, appliqué bands that follow seams with their own material (silver foil X), overlay panels (sash, lace wrap), logo/text decals (print, embroidery, rhinestone text) and small hardware (clasp).

## Lighting presets suggested by this batch
Studio softbox on white, studio on pink seamless, gym fluorescent (flat, low sparkle), indoor phone daylight, arena spotlight (strong starbursts), and low-key single spot on black.

[^moodboard]: Owner's moodboard, images 21-38
