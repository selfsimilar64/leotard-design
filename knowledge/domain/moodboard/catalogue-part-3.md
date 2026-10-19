---
type: Catalog
title: "Moodboard catalogue, part 3 (images 39-58)"
description: "Per-image teardown of moodboard images 39-58 in filename order (It-Was-All-A-Dream-Leotard-01.jpg to Scherm_afbeelding2026-03-13om16.44.33.png): silhouette, back, panelling, materials, stones, trims, photography and the app capabilities each design demands."
tags: [moodboard, catalogue, reference-designs]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T19:30:00Z }
sources:
  - id: moodboard
    resource: "moodboard/ folder in the project root (138 owner-supplied photos), images 39-58 in filename order"
    title: Owner's moodboard
    author: human:mattj
---

# How to read

Visual teardown by a Claude Code subagent from the photos alone, kept as written.[^moodboard] Every
measurement, count and material call is an estimate from a photo **[UNVERIFIED]**. The synthesis
across all parts is the [design-space taxonomy](/domain/moodboard/design-space-taxonomy.md).

Conventions: "wearer's L/R" means the athlete's own left/right; on a front view, wearer's L is on the viewer's right. Stone sizes are relative estimates (ss6 tiny … ss30 large). "Unclear" means not resolvable from the image (many files in this batch are low resolution, about 300–500 px; I upscaled crops to inspect them, but fine detail is still interpretation).

**Garment groups (same physical garment):**
- G1 "It Was All A Dream" (Dulcy Sp brand print): `It-Was-All-A-Dream-Leotard-01/02/03` (front / back / 3-4 side closeup).
- G2 Marissa: `marissa-front` + `marissa-back`.
- G3 Reese: `reesecompleotardfront` + `reeseback`.
- G4 Silver-Linea blue zig-zag: `new-collection-silver-linea-fashion-.jpg` (front) + `(1)` (closeup of the same garment).
- G5 Navy sunburst: `Scherm_afbeelding2026-03-13om11.03.18` (front) + `om11.03.33` (back). The timestamps are 15 s apart, the same colourway, and the same moon-and-stars logo.
- `Nejahkaki_10` is one image containing both the back and the front of the same garment.

**Likely same brand, different garments:**
- Laura + Reese share a crystal snowflake hip logo and the same cut-out white-background photo style. Marissa (star logo, same photo style) may be the same brand: unclear.
- Silver-Linea `(2)`, `-.jpg`/`(1)` and `platino-25 (1)` share a crystal spiral-rose hip logo. `(3)` (white) has no rose that I can clearly see, but has the same backdrop and lighting.
- Scherm 11.03.x, 14.48.14 and 16.44.33 share a crescent-moon-plus-3-stars hip logo.

---

## 1. It-Was-All-A-Dream-Leotard-01.jpg

1. **File / view:** `It-Was-All-A-Dream-Leotard-01.jpg`, front, worn-on-athlete (cropped at chin and mid-thigh). Same garment as -02 (back) and -03 (side closeup).
2. **Silhouette:** sleeveless, with a tank/racer-ish armhole cut moderately inward toward the neck. Neckline: high-neck / mock (a band sits at the base of the neck). Leg cut: medium-high. No skirt.
3. **Back design:** see -02.
4. **Panelling:** three main zones on the front.
   - (a) Neck band: a separate band about 3 cm tall around the base of the neck. It is a continuous ring, joined at the back with a clasp.
   - (b) Upper bodice: from the neck band and armholes down to a horizontal seam just above the natural waist, at roughly lower-rib level and about 5 cm above the navel. The seam is straight, with a very slight upward curve toward the sides. Inside this bodice, a sweetheart-shaped boundary divides the fabric: it dips to a point at the centre front between the breasts (about 2 cm above the underbust) and rises over each bust to the armhole front. Above that boundary the base reads darker (dark grey/brown); below it the base has a pink-violet foil shimmer. The lace print is continuous across the boundary, so this is most likely one printed fabric with foil applied in the sweetheart region, or a mesh-over-foil layering. Unclear which.
   - (c) Lower body (brief): one burgundy panel from the waist seam to the leg openings.
   - Symmetric. The bodice wraps continuously to the back via the side seams.
5. **Materials:**
   - Neck band, armhole binding and lower body: burgundy/plum shiny tricot with moderate sheen and a broad soft highlight (not wet-look).
   - Upper bodice: sublimation print of floral lace (lavender-violet lace motifs with a fine net/hex background texture printed in), combined with mystique foil-dot / iridescent foil in pink-magenta-violet over the sweetheart region (fine sparkle, colour shifting pink to violet). Above the sweetheart the ground is dark, and could be semi-sheer black/dark mesh with skin dimly showing (its warm brownish-grey tone suggests skin), or simply a darker print. Unclear.
   - Brand logo "Dulcy Sp" with a heart, in white script, printed on the wearer's R hip front (viewer left), about 8 cm wide.
6. **Embellishment:** a band of flat, round, silver-white dots just below the waist seam, with a holographic sheen (pink/green rainbow visible in -03). They look flat (no facets, no fire), so they are probably hologram heat-transfer foil dots or flat hotfix "nailheads"/hologram sequins, rather than faceted crystals. Unclear.
   - Pattern: density gradient, densest directly under the seam (2–3 rows almost touching, mixed medium and large dots about 4–6 mm), fading over about 10–12 cm downward into sparse small dots (about 2–3 mm).
   - Coverage: the full circumference of the waist (it continues on the back). Roughly 60–80 dots on the front.
   - Mixed sizes: large near the seam, small far from it.
7. **Trims & edges:** neck band (separate, about 3 cm). Armholes have burgundy self/contrast binding about 1 cm wide against the lace. The leg openings have a clean turned/elastic edge in burgundy. No piping, bows or zips.
8. **Lighting:** studio softbox, very even, on a white/light grey seamless background. The foil reads as a fine glittery shimmer with pinpoint pink highlights. The lower tricot shows a broad, soft sheen. Over the bust the foil highlight brightens on the convex surfaces. Fabric bridges flat between the breasts, with no hollow following. Small horizontal compression wrinkles at the waist seam.
9. **Hardest aspect:** the lace print layered with a region-masked foil (the sweetheart-shaped foil area under a continuous print), plus the flat holographic dots.
   - **Capabilities:**
     - Sublimation print layer (tileable lace texture), with scale and rotation per panel.
     - Region mask inside a panel (a sweetheart curve) that switches the base material between foil and dark/semi-sheer under the same print.
     - Mystique / iridescent foil shader (pink-to-violet angle shift).
     - Flat hologram dot/sequin element (non-faceted disc with a diffraction tint), distinct from crystals.
     - Stone/dot density gradient band anchored to a seam, with size decreasing with distance.
     - Printed text/logo decal placement.
     - Mock/high-neck band generator.

## 2. It-Was-All-A-Dream-Leotard-02.jpg

1. **File / view:** back, worn-on-athlete. Same garment as -01/-03.
2. **Silhouette:** as -01. The back leg line is moderate (standard competition coverage, not cheeky).
3. **Back design:** a teardrop/keyhole opening at centre back. It starts at the neck band (the band is closed above it by a clear plastic hook/clasp about 2.5 cm wide) and drops to about the upper/mid scapula. It is about 12–13 cm tall and about 6–7 cm wide at its widest point near the bottom, rounded at the bottom and narrowing toward the top. Truly open (skin), with a burgundy binding about 1 cm wide around its edge. There are no straps. The rest of the upper back is the same lace-print bodice.
4. **Panelling:** the back bodice has the same lace print. As on the front, a boundary splits a darker upper zone from a foil-shimmer lower zone. On the back the boundary is a gently curved line roughly horizontal at mid-scapula level, dipping slightly at centre back (about 8 cm below the keyhole bottom). The waist seam is straight and horizontal at the same height as the front, about 5 cm above the natural waist. Below it is the burgundy brief. Symmetric.
5. **Materials:** as -01. The upper back's darker zone has a grey-brown tone with lace visible on top, consistent with semi-sheer dark mesh showing skin. Unclear, but more likely than on the front. The lower bodice shows pink-violet foil shimmer.
6. **Embellishment:** the same flat holographic dot gradient below the waist seam, continuing all around the body. About 70 dots on the back, densest at the seam. Some dots show a rainbow (iridescent) tint.
7. **Trims & edges:** the keyhole has burgundy binding. The neck band closes with a clear plastic hook (visible). Armhole bindings are burgundy.
8. **Lighting:** studio softbox, white background. The lower tricot shows broad soft specular highlights over the glutes. The foil sparkles in the lower bodice; the upper back is flatter.
9. **Hardest aspect:** the keyhole with a back-neck closure, and the material boundary curve across the back.
   - **Capabilities:**
     - Keyhole/teardrop cut-out tool at centre back (parameters: top width, bottom width, depth, roundness), with automatic binding.
     - Back-neck closure hardware (clear hook) as a small mesh/decal.
     - Material-zone boundary curves that continue from front to back across the side seams.
     - Seam-anchored dot gradient that wraps around the full circumference.

## 3. It-Was-All-A-Dream-Leotard-03.jpg

1. **File / view:** 3-4 side closeup of the front/side (wearer's R side, from shoulder to upper thigh). Same garment as -01/-02.
2. **Silhouette:** sleeveless. The high-neck band is visible (about 3 cm). The armhole is cut in fairly deeply toward the shoulder. Medium-high leg.
3. **Back design:** not visible.
4. **Panelling:** this view confirms the side seam runs vertically from armpit to leg. The waist seam is horizontal across the side and continuous around the body. The sweetheart boundary on the front is visible as a darker upper zone (net texture visible, appearing slightly sheer/dark) and a foil zone below.
5. **Materials:** closeup detail.
   - The foil zone has a fine iridescent mystique-like texture: tiny pinpoint sparkles in magenta and violet, like a hologram foil dot.
   - The lace print sits on top: lavender lace motifs (flowers, leaves) plus a reptile/hex net texture in the background.
   - The upper-chest zone is dark grey-black with a visible net texture. The edge of the transition is irregular and soft (follows the lace motif edges?), not a hard line. Unclear.
   - The burgundy tricot below has a smooth moderate sheen.
6. **Embellishment:** the flat dots are clearly flat discs with a holographic rainbow sheen (pink/green/silver), about 3–6 mm, in mixed sizes. The densest rows (about 3 rows) are at the seam, then scatter down about 12 cm, with the smallest dots furthest away. The "Dulcy Sp" white printed logo sits on the R hip/front side.
7. **Trims & edges:** armhole binding about 8 mm in burgundy, with a visible coverstitch. The leg opening has a clean elastic finish.
8. **Lighting:** studio softbox, white. The foil highlight is a broad diffuse sparkly sheen over the bust and ribs. The dots catch light as uniform white-silver flats with a slight rainbow.
9. **Hardest aspect:** the multi-layer look (foil plus printed lace plus net texture), and the soft-edged foil mask.
   - **Capabilities:**
     - Layered material stack per panel: base (foil/mystique), print overlay with alpha, optional mesh transmission.
     - Soft or feathered mask edges for material zones.
     - Fine sparkle normal/glint map for mystique foil at 60 fps.

## 4. lauraleotardfront.jpg

1. **File / view:** front, worn-on-athlete (crop: chin to upper thigh, hands on hips). Low resolution (494×496). There is no back view in this batch. Probably the same brand as Reese (snowflake logo).
2. **Silhouette:** long sleeves to the wrist, with a narrow solid cuff band about 1.5–2 cm. Neckline: crew, with a self-fabric neck band about 1.5 cm. Raglan construction. Leg cut medium-high.
3. **Back design:** not visible.
4. **Panelling (front):**
   - Raglan mesh panels: navy mesh triangles run from the neckband along the raglan seam to the underarm, joining into navy mesh sleeves. On the front of the shoulder the mesh forms a triangle (from the neck to the shoulder point to the armpit) bounded by the raglan seam.
   - Main bodice: navy solid, from the raglan seams to the waist X.
   - Waist X: two lime bands about 3.5–4 cm wide cross at the centre front about 3 cm above the navel. Band A runs from the wearer's R side seam at lower-rib level down to the wearer's L side seam at upper-hip level; band B is its mirror. The crossing is a clean overlap (one band laid over the other; the over/under order is unclear). The bands are straight diagonals, slightly curved by body shape.
   - Side triangles: at each side, between the two bands (point toward the centre front, base at the side seam), a navy mesh insert shows skin.
   - Lower triangle (below the X, pointing up) and the brief: navy solid.
   - Symmetric (mirrored).
5. **Materials:**
   - Body: navy matte tricot (very low sheen).
   - Sleeves and raglan yoke: navy stretch mesh with moderate skin show-through (skin reads as grey-mauve).
   - X bands: lime/neon yellow glitter-coated tricot or lime mystique (fine glitter grain visible, bright specular).
   - Side triangles: navy mesh.
6. **Embellishment:**
   - Chest chevrons: 4 nested V-chevron lines of yellow/citrine stones (small, ss10-ish), apexes at the centre front, spanning from armpit to armpit. Between them is a fill of clear/AB stones in mixed sizes. The density is highest in the middle chevron bands (larger stones, about ss16–20, roughly 30–40 per 10 cm²) and sparser near the neckline (about 10 per 10 cm²).
   - The upper chest above the chevrons has a light uniform scatter of tiny stones.
   - Sleeves: a uniform scatter of tiny clear stones over the whole mesh sleeve (about 10–15 per 10 cm²). On the outer forearm/elbow there are 2–3 diagonal yellow stone lines forming chevrons (V pointing toward the elbow/outward), with a denser clear scatter beside them.
   - Side mesh triangles: filled with clear stones and outlined in yellow.
   - Wearer's L hip: a small crystal snowflake/flower motif about 3 cm.
   - Total: several hundred, likely 600–900 stones visible on the front. Unclear.
7. **Trims & edges:** self neckband; solid navy wrist cuffs about 1.5 cm; clean leg edges. The X bands have no contrast edging.
8. **Lighting:** studio softbox, white cut-out background. The stones read as pinpoint white glints with little visible colour fire (resolution limits this). The lime bands show a bright, slightly granular glitter highlight. The navy tricot is flat.
9. **Hardest aspect:** the chevron stone patterns with nested lines plus a fill, and the crossed bands over mesh triangles.
   - **Capabilities:**
     - Raglan sleeve construction with mesh yoke panels.
     - Band/strap overlay tool: straight bands across the body, crossing with an over/under order, clipped at side seams.
     - Automatic panel creation from band intersections (the triangles between bands become separately assignable panels, e.g. mesh).
     - Parametric chevron stone line generator (count, spacing, apex position, stone colour per line).
     - Region fill between two guide lines, with a density/size gradient.
     - Pattern mirroring across the centre front; also sleeve-local patterns.

## 5. marissa-back.jpg

1. **File / view:** back, worn-on-athlete (crop: neck to upper thigh). Pair of marissa-front.
2. **Silhouette:** long sleeves, raglan (the mesh sleeve runs up to the neckline on the back). Back neckline: scoop, about 10–12 cm deep at centre back (to roughly the upper scapula), with a smooth U-curve. Leg cut medium.
3. **Back design:** a scoop back only. No keyhole, cut-outs or straps. Fully closed below the scoop.
4. **Panelling:** a single body fabric front and back (no visible waist seam; the stone band at the waist appears to be on continuous fabric, though a seam beneath the stones cannot be ruled out). Raglan seams from the neckline to the underarm. Mesh sleeves. Symmetric.
5. **Materials:**
   - Body: purple solid metallic foil (or foil/mystique), very high gloss, wet-look, with broad bright highlights over the glutes and back. It reads almost like liquid metal.
   - Sleeves: purple tinted mesh with moderate skin show-through (skin reads pinkish-violet).
6. **Embellishment (all clear crystal, small, about ss10–16):**
   - (a) A neckline zone: a uniform-ish scatter following the scoop, denser at the edge, about 5–7 cm wide.
   - (b) An argyle/diamond lattice: diagonal lines 2–3 stones wide cross to form about 3 rows of diamonds, each diamond about 5–6 cm across, spanning the back from side to side, between the shoulder-blade level and the waist band.
   - (c) A waist band: a dense grid of about 4–5 horizontal rows of stones, about 3 cm tall, horizontal and straight, running around the whole body.
   - The lower back/seat is plain.
   - Back count roughly 500–700 stones.
7. **Trims & edges:** self-bound scoop neckline. Mesh sleeves to the wrist (cuff finish not visible). Clean leg edges.
8. **Lighting:** studio softbox, white cut-out background. Strong specular highlights on the foil: large, bright, slightly streaky blobs on curved areas (buttocks, scapula). Stones give pinpoint glints, with a few starburst flares in the neckline area. The foil has slight wrinkles at the lower back/waist.
9. **Hardest aspect:** the extreme gloss of the metallic foil, together with a dense regular lattice of stones that must stay clean on a curved body.
   - **Capabilities:**
     - High-gloss metallic foil shader (very low roughness, coloured specular).
     - Argyle/diamond-lattice stone pattern generator (line width in stones, cell size, orientation, bounding region).
     - Rows/grid border-band generator (n rows, spacing, follows a horizontal body line).
     - Neckline-following scatter (density falloff from an edge).
     - Starburst glint post-effect.

## 6. marissa-front.jpg

1. **File / view:** front 3-4 (body turned slightly to the wearer's L), worn-on-athlete. Pair of marissa-back.
2. **Silhouette:** long raglan mesh sleeves; scoop/crew neckline (a shallow scoop, about 5 cm below the collarbones); medium-high leg.
3. **Back design:** see marissa-back.
4. **Panelling:** one body fabric; raglan seams; mesh sleeves. Symmetric. No visible waist seam.
5. **Materials:** purple solid metallic foil (very high gloss) for the body; purple tinted mesh for the sleeves.
6. **Embellishment (clear crystals, small):**
   - Top zone (from the neckline to about bust height): a stepped "pixel" pattern of vertical stone columns forming staircase-like blocks, i.e. the top edges of the diamonds rendered as stepped verticals, denser near the neckline. It reads like a pixelated gradient.
   - Middle: an argyle lattice of about 3 rows of diamonds spanning the chest to the underbust. The lines are 2–3 stones wide.
   - Underbust/waist: a horizontal band of about 4 rows of stones (about 3 cm), straight, around the body.
   - Wearer's L hip: a crystal star motif about 3 cm (a 6-point or snowflake-star).
   - Front count roughly 600–800.
7. **Trims & edges:** self-bound neckline; clean leg edges.
8. **Lighting:** studio softbox; large soft-edged hot highlights on the foil over the bust, abdomen and hip. Stones show white pinpoint glints with occasional starbursts.
9. **Hardest aspect:** the stepped/pixelated stone gradient blended into a lattice.
   - **Capabilities:**
     - Grid-snapped stone placement (vertical columns, stepped heights) as a pattern primitive.
     - Lattice generator.
     - Row band.
     - Star motif stamp.
     - Foil shader.

## 7. N3_DSC1064.jpg

1. **File / view:** front, worn-on-athlete (crop: chin to upper thigh). Standalone (no back in this batch).
2. **Silhouette:** long sleeves to the wrist, with a solid plum cuff band about 2 cm. Neckline: crew, with a plum binding about 1 cm plus a crystal band. Set-in sleeves (the sleeve seam appears to be at the shoulder point; the mesh yoke and sleeve are visually continuous, so unclear). Leg cut medium-high.
3. **Back design:** not visible.
4. **Panelling (front, asymmetric):**
   - Mesh yoke: plum mesh covers the upper chest and shoulders down to the bust tops, and the sleeves.
   - Solid bodice: plum solid fabric from the bust to the lower ribs. It is split by a mesh stripe about 4–5 cm wide that runs as an S-curve. The stripe starts at the neckline on the wearer's L near the neck (viewer right, about 3 cm from the neckband), sweeps down and to the wearer's R across the sternum and the wearer's R lower bust, and exits at the wearer's R side seam at about waist height. This creates two solid lobes.
     - The upper lobe is on the wearer's R upper chest. Its top edge is a gently curved line from the wearer's R armpit up and over to near the centre neck, meeting the stripe.
     - The lower lobe is the larger area on the wearer's L chest and centre torso. Its top edge curves from the wearer's L armpit over the bust to the stripe.
   - Waist: below the bodice, two horizontal mesh bands (each about 2.5–3 cm) separated by a solid plum strip about 1.5 cm. They are gently curved, rising slightly toward the wearer's L side (viewer right), and roughly parallel.
   - Lower: a solid plum brief.
   - Asymmetric diagonal / S-curve design.
5. **Materials:**
   - Solid panels: plum/burgundy matte-to-satin tricot (low-moderate sheen).
   - Mesh: plum-tinted stretch mesh, moderately sheer; the skin reads mauve. More skin shows on the sleeves (flat areas) than over the bust.
   - Hip logo: a white embroidered or printed triskele/triple spiral on the wearer's L hip, about 4 cm.
6. **Embellishment (AB crystals, mixed small/medium; strong AB colour fire with pink/blue/green glints):**
   - Neckband: 2–3 rows of stones around the neck.
   - Outline rows: 2–3 rows along every solid-panel edge, i.e. the lobe top edges, both edges of the S-stripe, and both edges of each waist mesh band (about 30+ stones per 10 cm of edge).
   - Solid bodice: a random uniform scatter of mixed sizes (about 8–12 per 10 cm²).
   - Mesh yoke: a sparse scatter (about 2–4 per 10 cm²).
   - Sleeves: a sparse scatter. Near the wrist there are 4–5 horizontal rows of stones forming a cuff band (about 5 cm), plus a size/density gradient fading upward.
   - The lower brief has no stones except the row along the top edge.
   - Total front about 800–1200.
7. **Trims & edges:** plum neck binding; solid cuff bands at the wrists (plum, slightly shiny); clean leg edges.
8. **Lighting:** an indoor interior (green walls, striped armchairs, carpet), soft ambient/window light, possibly with a fill flash. The AB stones show distinct colour fire as pinpoint pink/blue/cyan sparkles. The fabric has a soft, broad, low sheen. The mesh over the bust shows the skin gradient. The solid fabric bridges flat across the sternum. Slight wrinkles at the elbows on the mesh sleeves.
9. **Hardest aspect:** the asymmetric S-curve mesh stripe dividing the bodice, with outline rows on both edges.
   - **Capabilities:**
     - Draw an arbitrary curved band (stripe) across the front from the neckline to the side seam that cuts panels and is assignable as mesh.
     - Asymmetric (non-mirrored) design mode.
     - Edge-following stone rows (n rows, offset from the edge, applied to both sides of a band).
     - Parallel banded inserts (stacked mesh/solid strips).
     - AB crystal shader with dispersion-like colour glints.
     - Sleeve cuff stone rows with a fade gradient.
     - Embroidered logo decal (thread-relief look).

## 8. Nejahkaki_10.png

1. **File / view:** a composite of the back (left figure) and front (right figure), worn-on-athlete, hands on hips; the same garment shown twice. Cut-out on white.
2. **Silhouette:** sleeveless (tank), with wide shoulder coverage. Front neckline: V, a moderate V about 8–10 cm deep. Leg cut: high (front leg line fairly high on the hip). No skirt.
3. **Back design (precise, from the upscaled crop):**
   - Back neckline: a V, formed by a dark green band about 2.5 cm wide that runs from each shoulder top diagonally inward. The two bands meet at centre back at about the upper-scapula level, about 10 cm below the neck base, and continue as a single central spine strap.
   - Central spine strap: dark green, about 3 cm wide, running vertically from the V junction down to a horizontal back band. It flares into a Y at the top where the two neckline bands join.
   - Horizontal back band: dark green, about 4 cm wide, at lower-scapula/bra-line level, running side to side between the two mint side panels. It is gently curved, arching slightly upward at the centre.
   - Diagonal mint straps: two per side, each about 1.5 cm wide.
     - Upper pair: from the side panel at about the armpit/upper-scapula level, angling down-inward to the spine at mid-scapula.
     - Lower pair: from the spine at about mid-scapula, angling down-outward to the side panel just above the horizontal band.
     - The upper and lower straps on each side meet the spine at the same point, forming a ">" / "<" shape on each side (a sideways V). Together they read as an X centred on the spine.
     - They are separate strap pieces, sewn on.
   - Side panels: mint, from the armhole down to the horizontal band, wrapping from the front. Their inner edge is curved.
   - Open areas: all spaces between the straps are truly open (skin), not mesh-filled. There are 4 triangular openings in the upper back plus one large open window below the horizontal band (about 6–8 cm tall, from the band to the waist).
   - Waist band: mint, about 3 cm, horizontal, at the natural waist. It is the top edge of the brief.
   - Brief: dark green metallic below the waist band.
4. **Panelling (front):**
   - V neck band: dark green, about 3 cm wide, following the V.
   - Bodice: mint, from the neckline/armholes down to a deep chevron. The bodice bottom edge is a V pointing down at the centre front, about 4–6 cm below the navel, rising to the side seams at about waist height. (Sharp V / chevron.)
   - Chevron bands: two parallel bands following the chevron, a dark green band (about 2.5 cm) above a mint band (about 2.5 cm).
   - Lower: a dark green metallic brief.
   - Armholes: bound in dark green.
   - Symmetric.
5. **Materials:**
   - Bodice: mint/sage green tricot with a sparse silver hologram foil sparkle (fine glints on the bust; "glitter-coated / foil-dot"). It appears mostly matte with sparkle highlights in places. Unclear whether these are foil dots or merely reflections of the stones.
   - Bands and brief: dark green (forest/bottle) wet-look metallic foil, high gloss, with streaky bright highlights on the back brief; the bands look the same.
   - Mint bands and straps: mint, shinier, maybe metallic mint foil.
6. **Embellishment:**
   - Front bodice: crystal lines in AB/clear (small, about ss10–16) forming a large geometric argyle/diamond outline. Diagonal lines cross the bodice to form diamonds about 8–10 cm, with a central vertical "X" over the sternum, and additional angled lines toward the armholes (somewhat like a gem facet diagram). These are single-stone or two-stone lines plus a light scatter.
   - Bands: the dark green bands carry a single row of AB stones, about 1.5 cm apart. The mint bands carry a single row of dark (jet/emerald/hematite) stones, about 1.5 cm apart (a contrasting colour on each band).
   - Back straps: the mint straps carry a single centred row of dark stones, about 1 cm apart. The dark spine and horizontal band carry a single or double row of AB/violet-glinting stones, about 1.2 cm apart.
   - Side panels: a light scatter.
   - Hip: a possible crystal motif on the wearer's L hip (a faint outline, possibly a heart or initials). Unclear.
7. **Trims & edges:** contrast dark green bindings on the armholes and V-neck (the V neck band is wider, a design band). All strap edges are clean-finished. The leg edges are dark green.
8. **Lighting:** studio, white background, flash/softbox. The metallic green has very bright specular streaks (hot spots on the buttocks, anisotropic-looking streaks following the fabric stretch). Stones show violet/pink AB glints. The open back shows skin and the spine/scapula musculature. The straps sit flat with slight tension.
9. **Hardest aspect:** the multi-strap open back with a Y spine, sideways V straps, a horizontal bridge band and true openings, plus a single row of stones centred along each strap.
   - **Capabilities:**
     - Strap-network editor for the back: nodes (shoulder points, spine junction, side-panel anchors) connected by straps of chosen width, with true openings between them.
     - Spine strap with a Y-junction.
     - Bridge band across the back.
     - Stones centred along a strap path at fixed spacing, with a colour per strap.
     - Chevron/V seam at the front waist with parallel offset bands.
     - Wet-look metallic shader with anisotropic stretch highlights.
     - Geometric line-art stone pattern (lines between arbitrary points on the bodice).

## 9. new-collection-silver-linea-fashion- (1).jpg

1. **File / view:** closeup of the front-wearer's R side of the bust/chest (crop: neck to just below the waist seam, wearer's R arm on the hip). Same garment as `new-collection-silver-linea-fashion-.jpg` (G4).
2. **Silhouette:** visible: long-ish mesh sleeve ending in a cuff (a 3/4 sleeve, per the main image). Crew neckline with a band.
3. **Back design:** not visible.
4. **Panelling (visible portion):**
   - A royal-blue mesh yoke over the upper chest and shoulder, continuing into the sleeve.
   - A bust "cup" panel: a solid shape covering the bust. Its top edge is a curve from the armhole front up and over the bust apex, then down steeply into the centre front, where it meets the mirrored cup at the bottom of a mesh V. The cup bottom edge merges into the midriff panel.
   - A midriff panel: a darker glitter fabric between the cup and the waist seam.
   - A waist seam, horizontal, at the natural waist.
   - The brief below.
5. **Materials:**
   - Mesh: royal-blue stretch mesh, skin visible as blue-violet.
   - Cup panel: royal-blue metallic/mystique with a fine sparkle.
   - Midriff: dark navy with dense silver micro-glitter (glitter-coated tricot / dark mystique, a "starry" look). The cup panel looks brighter blue; the midriff darker with more visible silver specks.
   - Brief: royal-blue metallic foil (wet-look).
   - Neck and cuff bands: blue hologram/glitter foil (a speckled multi-blue sparkle).
6. **Embellishment:**
   - Inside the cup: a zig-zag "mountain/lightning" motif. Two parallel zig-zag lines of medium clear stones (about ss16–20) with peaks pointing up, spanning the cup width. Sapphire-blue medium stones are interspersed at the vertices.
   - Cup edge: an outline row of mixed clear stones, 1–2 rows, with a gradient of scattered clear stones spilling down from the cup's lower boundary into the midriff.
   - Mesh yoke: a dense uniform scatter of tiny clear stones (ss6–10, about 20–30 per 10 cm²), with blue stones mixed in near the cup edge.
   - Neck band: a row of larger clear stones alternating with blue.
   - Cuff: stones on the hologram cuff band.
   - Below the waist seam: a sparse scatter of clear and blue stones (density gradient fading down about 5 cm).
7. **Trims & edges:** a glitter-foil neck band about 1.5 cm and a glitter-foil cuff band about 2–3 cm.
8. **Lighting:** studio softbox, white/pale pink background. Stones give bright white pinpoints with a few flares. The glitter midriff shows a dense field of tiny glints. The foil brief shows a sharp bright highlight. The mesh shows the skin's colour through blue.
9. **Hardest aspect:** distinguishing three different blue sparkle fabrics (mystique cup, glitter midriff, glitter-foil trim) next to each other, plus a stone zig-zag motif inside a curved panel.
   - **Capabilities:**
     - Several sparkle materials with different glint densities, sizes and colours (micro-glitter vs foil-dot vs hologram).
     - Motif stroke tool: polyline/zig-zag stone lines constrained to a panel, with mixed colours at vertices.
     - Stone spill gradient from a panel edge.

## 10. new-collection-silver-linea-fashion- (2).jpg

1. **File / view:** 3-4 front (body turned to the wearer's L, hip pushed out), worn-on-athlete, cropped at the chin. 314×314, low resolution. Same brand as G4 (rose logo); a different garment.
2. **Silhouette:** 3/4 sleeves (ending just below the elbow, about mid-forearm), royal-blue mesh. Neckline: high crew/mock, with a blue glitter-foil band about 2 cm. Leg cut medium-high.
3. **Back design:** not visible.
4. **Panelling (asymmetric):**
   - Mesh yoke: blue mesh covers the shoulders, the wearer's L upper chest and the sleeves.
   - Main bodice panel: a glitter/sparkle blue panel shaped roughly like a tilted parallelogram. Its top edge runs diagonally from near the wearer's R shoulder/neckline (viewer left, about 5 cm below the neck) down to the wearer's L armpit/side (viewer right). Its sides follow the side seams. Its lower edge is irregular (described below).
   - Mesh cut-out insets:
     - (a) On the wearer's R side waist (viewer left): a mesh triangle/curved wedge between the bodice and the brief, from the side seam at about lower-rib level inward to about the mid-waist.
     - (b) On the wearer's L side waist (viewer right, lower): a curved mesh wedge from about the centre front waist out to the side seam at hip level.
   - Brief panel: solid royal-blue shiny, with a curved top edge. It rises on the wearer's R hip (viewer left) toward the waist, dips toward the centre front, and continues down-right. Scalloped/wavy.
   - Asymmetric diagonal.
5. **Materials:**
   - Bodice: royal-blue glitter-coated tricot or blue mystique (a dense fine sparkle texture visible even at low resolution).
   - Brief: royal-blue shiny tricot or metallic foil (smooth, with bright specular).
   - Mesh: royal-blue, sheer.
   - Bands: blue hologram glitter foil.
6. **Embellishment:**
   - (a) A burst/fan motif: about 8–10 curved lines of clear stones (small-medium) radiate from a dense cluster point near the wearer's L upper chest (viewer right, under the collarbone), sweeping down-left like a comet or feather fan, each line about 6–10 cm long.
   - (b) An elongated teardrop/oval of densely filled dark stones (jet/hematite/dark-blue, tiny), about 4 × 10 cm, running down the centre front from the burst toward the waist, outlined with a row of clear stones and a clear scatter around it ("comet head and tail").
   - (c) Outline rows of clear stones along every panel edge (bodice top, mesh-inset edges, brief top edge), 1–2 rows.
   - (d) A spiral-rose crystal motif, about 4–5 cm, on the wearer's R hip (on the brief).
   - The sleeves look plain (no stones visible at this resolution).
7. **Trims & edges:** glitter-foil neck band and cuff bands about 1.5 cm; clean leg edges.
8. **Lighting:** studio softbox, white background. The sparkle bodice reads as a fine grainy shimmer. The brief shows a broad highlight. Low resolution limits the stone read.
9. **Hardest aspect:** the asymmetric panel layout with wedge-shaped mesh insets, and the radiating curved-line burst plus the dark-stone fill motif.
   - **Capabilities:**
     - Freeform asymmetric panel boundaries (arbitrary splines).
     - Mesh inset panels between other panels.
     - Radiating curved-line stone burst (origin point, number of rays, curvature, length jitter).
     - Dense fill of a closed region with tiny dark stones (jet/hematite material).
     - Rose/spiral motif stamp.

## 11. new-collection-silver-linea-fashion- (3).jpg

1. **File / view:** front, worn-on-athlete (crop: chin to upper thigh, the wearer's L arm raised). 239×357, very low resolution. Same backdrop as G4; probably the same brand.
2. **Silhouette:** long or 3/4 sleeves in white mesh (sheer; the length is unclear because the raised arm is cropped). Neckline: crew, with a white binding carrying a stone row. Leg cut: high.
3. **Back design:** not visible.
4. **Panelling:**
   - Mesh yoke: white/skin mesh from the neckline to the bust top, continuing into the sleeves.
   - Bust "bandeau twist": two fan-shaped panels, one per breast. Each starts wide at the armhole/side bust and narrows toward the centre front, where both meet in a twist/knot just below the sternum, about at underbust level. The upper edge curves from the armpit over the bust to the knot; the lower edge curves from the side underbust down to the knot. They appear to be gathered/ruched or pleated: radiating parallel ridges (about 10 per side) converge toward the knot, with stones lining the grooves. Whether these are real tucks/ruching or a stone-line effect on flat fabric is unclear, but the ridges look three-dimensional. (NEW: ruched/pleated twist-knot bust panel.)
   - Below the bust: a central column of fabric from the knot down to the brief, about 10–12 cm wide at the waist.
   - Side cut-outs: large D-shaped/oval cut-outs on each side of the waist, from just below the bandeau down to the hip (about 12 cm tall). They are filled with skin-tone mesh (illusion), so they read as open skin.
   - Brief: from the hips down.
   - Symmetric.
5. **Materials:**
   - Bandeau: white matte or satin tricot (bright white).
   - Body/column and brief: silver-white hologram foil (a fine sparkle with a faint rainbow; a "white mystique/hologram").
   - Cut-outs: skin-tone stretch mesh-illusion (high show-through, nearly invisible).
   - Yoke and sleeves: white or skin-tone mesh. The sleeves look white (cool white tint over the skin).
6. **Embellishment:**
   - Bandeau: radiating curved rows of small clear/silver stones, about 10 rows per side, converging at the knot. They follow the pleat lines.
   - Bandeau edges: an outline row (about 2 rows).
   - Cut-out edges: rows of stones along the edges of the cut-outs (single/double), plus a light scatter on the column.
   - Neck band: a stone row.
   - Possibly a crystal motif on the wearer's R hip (a faint shape; unclear).
7. **Trims & edges:** white neck binding; clean leg edges.
8. **Lighting:** studio softbox, white/pink background, high-key (near overexposed). The white hologram reads as a fine grey-white speckle. Stones are hard to separate from the fabric.
9. **Hardest aspect:** the 3D twisted/ruched bust panel (geometry, not just texture), and the white-on-white material separation.
   - **Capabilities:**
     - Ruching/pleat displacement or a normal-map effect on a panel, with radiating fold lines converging to a point (NEW).
     - A "knot" decoration at a panel convergence.
     - Large side cut-outs filled with skin-tone illusion mesh.
     - Stones following fold lines.
     - A white hologram shader that stays distinguishable from white matte under high-key lighting.

## 12. new-collection-silver-linea-fashion-.jpg

1. **File / view:** front, worn-on-athlete, hands on hips (crop: chin to thigh). Main view of G4; (1) is its closeup.
2. **Silhouette:** 3/4 sleeves (ending a few cm below the elbow), royal-blue mesh. Neckline: crew, with a glitter-foil band about 1.5 cm and stones. Leg cut medium-high. Symmetric.
3. **Back design:** not visible.
4. **Panelling:**
   - Mesh yoke: from the neckline and shoulders down to the bust cups, including a deep mesh V at the centre front. The V runs from the neckline to a point about 2–3 cm above the underbust/midriff-panel boundary (a sweetheart-style plunge between the cups).
   - Bust cups (2): the top edge is an S-curve from the armhole front, rising slightly over the upper bust, then descending steeply to the centre front V point. Mirrored.
   - Midriff: a dark glitter panel from below the cups to the waist seam. Its boundary with the cups is roughly an underbust curve; the transition may be a gradient of fabric. The cups and midriff may be one fabric with the cups lighter; unclear.
   - Waist seam: horizontal and straight at the natural waist.
   - Brief: royal-blue metallic foil.
5. **Materials:**
   - Mesh: royal blue.
   - Cups: royal-blue mystique/metallic (brighter blue).
   - Midriff: dark blue with dense silver micro-glitter (could also be a dark hologram foil).
   - Brief: royal-blue solid metallic foil (very glossy, bright white specular on the abdomen and hip).
   - Bands: blue glitter/hologram foil.
6. **Embellishment:**
   - Each cup: a zig-zag "crown" motif of two parallel zig-zag stone lines (clear, medium) with blue stones at the vertices.
   - Cup edges: an outline in clear stones.
   - Mesh yoke and sleeves: a dense uniform scatter of tiny clear stones over the whole mesh area (about 20–30 per 10 cm²). The sleeves are fully scattered to the cuffs.
   - Centre V: a gradient scatter (denser near the cup edges).
   - Below the waist seam: a density-gradient scatter of clear and blue stones (dense at the seam, sparse about 5 cm below).
   - Wearer's R hip: a spiral-rose motif about 4 cm.
   - Total visible: likely 1000+ stones (the sleeves dominate).
7. **Trims & edges:** glitter-foil neck band and cuffs.
8. **Lighting:** studio softbox, white background. The foil brief shows strong broad highlights. The mesh shows the skin as blue-violet. The midriff glitter shows a dense glint field.
9. **Hardest aspect:** the full-sleeve dense micro-stone scatter (many instances) plus mirrored motifs, and a plunging mesh V between the cups.
   - **Capabilities:**
     - Instanced stone rendering for over 1000 stones at 60 fps.
     - Uniform scatter over mesh panels including the sleeves.
     - Mirrored motif stamp (zig-zag) per cup.
     - Plunge V mesh insert between the bust panels.
     - Seam-anchored gradient below the waist.
     - Sparkle materials (see (1)).

## 13. platino-25 (1).jpg

1. **File / view:** front, worn-on-athlete, at an event press wall (black backdrop with a "SIGOA" logo). Low resolution (306×417). The same rose logo as the Silver-Linea items suggests the same maker. A teammate in a matching mesh sleeve is visible at the right edge.
2. **Silhouette:** long sleeves to the wrist, navy mesh, with a crystal-covered cuff band about 2 cm. Neckline: crew (a high round neck), with a narrow band and stones. Leg cut medium-high.
3. **Back design:** not visible.
4. **Panelling:**
   - Mesh yoke: navy mesh over the upper chest and shoulders.
   - The solid metallic bodice forms upward-pointing flame/feather "tongues". From the waist, several pointed lobes rise up the chest: a broad lobe over the wearer's R bust (viewer left) peaking near the shoulder, and 3–4 narrower flame tongues across the centre and the wearer's L (viewer right) reaching the collarbone area. Between the tongues the mesh (skin) shows through, so the tongue boundaries are S-curved, flame-like, pointed tips.
   - The design looks asymmetric: the tongues are taller and more numerous on the wearer's L.
   - Lower body: solid metallic navy brief.
   - No horizontal waist seam is visible.
5. **Materials:**
   - Bodice and brief: navy/royal solid metallic foil (very glossy; bright cobalt highlights on the bust).
   - Yoke and sleeves: navy mesh, moderately sheer.
6. **Embellishment (clear and AB, mixed small/medium, with a few red/pink glints, possibly AB fire or coloured stones; unclear):**
   - Outline: stones along the edges of the flame tongues (a single line, about 1–2 rows), drawn as long sweeping strokes.
   - Inside the wearer's L tongues: dense filled areas.
   - A "drip" gradient: below the tongues, toward the waist and the wearer's L hip, a cascade of stones dripping downward in columns, fading into the brief at about hip level.
   - Mesh yoke: a dense uniform scatter. Sleeves: a uniform scatter.
   - Cuffs: densely set with stones.
   - Wearer's R hip: a spiral-rose motif, about 5 cm.
7. **Trims & edges:** a crystal cuff band; a narrow neck binding with stones.
8. **Lighting:** event/press-wall photography with on-camera flash or bright frontal light against a black background. The flash makes the stones read as strong pinpoint glints with some colour fire. The metallic foil shows a strong flash-induced specular on the bust. Mid-blue saturation.
9. **Hardest aspect:** the flame-shaped bodice/mesh boundaries combined with a downward stone drip gradient.
   - **Capabilities:**
     - Freeform spline panel boundaries with pointed tips (a flame/feather shape library).
     - Asymmetric layout.
     - Stone "drip/cascade" gradient (columns of stones, density decreasing downward, jittered).
     - Stroke-along-edge stones.
     - Flash lighting preset for renderer calibration.

## 14. platino-25.jpg

1. **File / view:** front 3-4, worn-on-athlete in competition (floor or beam routine pose; head thrown back, one arm raised, one arm extended). The arena is in the background (vault table, bleachers). Motion blur and noise. Different garment from platino-25 (1).
2. **Silhouette:** long sleeves to the wrist, black mesh, with a crystal cuff band. Neckline: crew, with a gold/champagne crystal band (dense stones). Leg cut medium-high.
3. **Back design:** not visible.
4. **Panelling:**
   - Mesh yoke: black mesh from the neck across the shoulders to the upper bust, also forming a central V/diamond. The black centre-front region runs from the neckline down between the breasts to an elongated point at about the underbust. It may be mesh (skin dimly visible) or solid black; unclear.
   - Two silver panels (one per side) covering each bust. Each is roughly a trapezoid whose inner edge borders the centre black diamond and whose outer edge follows the side seam. The lower edge runs diagonally down toward the centre waist.
   - Below the bust, at the centre front, the black region forms a downward-pointing V into the silver panels and then reconnects to the black brief. The result is an "X/diamond" interplay: the silver panels converge toward the centre waist, where a black diamond with dense stones sits.
   - A black mesh inset at the wearer's L side waist (viewer right), a dark sheer wedge between the silver panel and the brief.
   - Lower: a black brief.
   - Roughly symmetric, except perhaps the side mesh inset (only one side is visible).
5. **Materials:**
   - Silver panels: silver metallic foil/hologram (mirror-like, with a large bright yellow-white specular hot spot; possibly hologram silver).
   - Black brief: black velvet or matte tricot (deep black with low specular; slight sheen at the hip). Unclear.
   - Mesh: black mesh.
6. **Embellishment:**
   - Dense fills of stones along the inner edges of the silver panels, bordering the black centre diamond. These read as a gradient band about 3–5 cm wide of mixed jet/AB/silver stones, densest at the edge.
   - At the centre waist: a dense diamond-shaped cluster.
   - Along the lower edges of the silver panels: rows plus a gradient scatter fading into the black brief.
   - Sleeves: a uniform scatter of tiny silver/clear stones.
   - Cuffs: a dense band.
   - Neckline: a gold/champagne stone band.
7. **Trims & edges:** a crystal neckline band and crystal cuff bands.
8. **Lighting:** arena lighting (overhead sports lights, warm). Motion and image noise. The silver foil blows out to a near-white hot spot. Stones read as small glints, lower contrast than in studio shots. The mesh sleeves show skin as a dark grey. A real-world competition reference.
9. **Hardest aspect:** the large mirror-like silver foil panels under arena lights (the risk of blowing out), plus dense edge-hugging stone gradients.
   - **Capabilities:**
     - Mirror-silver foil/hologram shader with tone-mapping that handles hot spots.
     - Arena lighting preset (overhead warm spots).
     - Edge-hugging dense gradient band (density as a function of distance from a panel edge).
     - Gold/champagne crystal colour.
     - Velvet/black fabric shader that stays distinguishable from mesh.

## 15. reeseback.jpg

1. **File / view:** back, worn-on-athlete (crop: neck to upper thigh). Pair of reesecompleotardfront.
2. **Silhouette:** long sleeves to the wrist (black mesh, with a solid black cuff about 1.5 cm). High back neck (crew height) with a closure. Leg cut medium.
3. **Back design (precise):**
   - Keyhole: a large round/oval opening from the back-neck band down to about mid-scapula, about 11 cm tall and about 9–10 cm wide, nearly circular at the bottom. It is truly open and bound in black (about 8 mm). Above it, the neckband closes with a clear plastic hook/clasp.
   - Upper back: a black mesh panel (skin visible as warm brown/olive), from the shoulders to a shallow V-shaped hem at about waist level (about 2 cm above the natural waist). The V has a gentle centre dip.
   - Straps (black shiny bands about 1.5–2 cm wide, studded with stones, appliquéd onto the mesh, not open):
     - Strap 1: from the top of the wearer's L shoulder (near the neck/armhole junction), running diagonally down and inward, crossing the centre back at X1 (lower scapula level, about 4 cm below the keyhole bottom), and continuing to the wearer's R side at about lower-rib level.
     - Strap 2: mirrors strap 1 (from the R shoulder to the L side).
     - Straps 3 and 4: a second, lower X. They run from each side at about the level where straps 1–2 end, cross at centre back at X2 (about 6 cm below X1), and end at the opposite side lower down.
     - The overall effect is "two stacked X's", like lacing. The lower X is flatter (a shallower angle).
     - The strap ends anchor at the black side panels.
   - All areas between the straps are mesh-filled (illusion), not open, apart from the keyhole.
4. **Panelling:**
   - Upper back mesh panel (described above).
   - Lower back: a red panel from the mesh V-hem to the leg openings (seat).
   - Black side panels: about 6–8 cm wide, vertical, from the armpit to the leg opening. They wrap from the front: the same black panels seen on the front sides.
   - Symmetric.
5. **Materials:**
   - Red panel: red metallic, with a mottled crushed appearance on the back (darker blotches); possibly stretch velvet foil / crushed foil, or a metallic with an uneven finish. On the front it reads as smooth glossy metallic. Unclear: possibly velvet foil (NEW candidate).
   - Side panels and straps: black wet-look shiny tricot (high gloss).
   - Upper back and sleeves: black mesh, sheer.
6. **Embellishment:**
   - Straps: densely set with mixed clear/AB stones across the strap width (about 2–3 stones across, small-medium, mixed sizes) along their whole length.
   - Sleeves: a wavy S-curve band of stones on the outer forearm, from about the elbow to the wrist. It is about 2 cm wide, mixed sizes, follows a sinuous path (2–3 undulations), and is mirrored on both arms.
   - Lower back red: no stones.
7. **Trims & edges:** black binding on the keyhole; a clear neck clasp; black cuffs; clean leg edges.
8. **Lighting:** studio softbox, white background. The black wet-look has bright edge highlights. Stones give pinpoint white glints with occasional AB colour. The mesh shows the skin as olive-brown (a black-mesh tint).
9. **Hardest aspect:** crossing appliqué straps over a mesh panel, plus a keyhole, plus the sleeve wave motif.
   - **Capabilities:**
     - Strap generator for straps laid on a panel (appliqué), with crossing patterns (stacked X's, defined by shoulder/side anchor points and crossing heights).
     - Stones filling a strap.
     - A round keyhole tool with a closure.
     - Wave/sinusoidal path stone band on the sleeves, mirrored across the arms.
     - Velvet-foil or crushed-metallic shader (NEW).

## 16. reesecompleotardfront.jpg

1. **File / view:** front, worn-on-athlete. Pair of reeseback.
2. **Silhouette:** long sleeves with black mesh and black cuffs. Neckline: crew, with a black binding about 1 cm. Set-in sleeves (the sleeve seam is at the shoulder point). Leg cut medium-high.
3. **Back design:** see reeseback.
4. **Panelling (front):**
   - Mesh yoke: black mesh from the neckline to the upper chest (about 10 cm deep at the centre), extending to the shoulders.
   - Front X straps: two black shiny bands about 2 cm wide with stones. Each runs from the shoulder/armhole top on one side diagonally down to cross just below the neckline at the centre front (about 5 cm below the neckband), then continues to the opposite front armhole/side panel top at about armpit level. They form a wide shallow X across the upper chest, on top of the mesh.
   - A small mesh diamond/V at the centre front: below the X crossing, a mesh triangle points down into the red panel, about 6 cm deep. The red panel's top edge is sweetheart-like, with a V notch at the centre.
   - Red centre panel: from that upper edge (curving over each bust to meet the black side panels near the armpit), down the torso to the leg openings. Its side boundaries are curved princess lines: wide at the bust, narrowing at the waist (hourglass inward curve), and widening again toward the hip and leg opening.
   - Black side panels: from the armpit to the leg opening, widest at the waist (where the red narrows), wrapping to the back.
   - Symmetric.
5. **Materials:**
   - Red: red metallic foil / glossy wet-look red, with a smooth bright red specular over the bust and abdomen. Faint concentric ripple bands are visible on the abdomen, most likely a moiré artefact of image scaling or of a fine fabric texture; unclear.
   - Sides and straps: black wet-look tricot.
   - Mesh: black.
6. **Embellishment:**
   - Red panel: a scatter density gradient of clear/AB stones (small-medium), densest at the top (sweetheart edge and bust, about 25–30 per 10 cm²), fading to zero at about navel level.
   - Straps: stone-filled.
   - Sleeves: wavy S-curve stone bands on the outer forearms (as on the back).
   - Wearer's L hip (on the black side panel): a crystal snowflake about 3 cm.
   - Front count roughly 500–700.
7. **Trims & edges:** black neck binding and black cuffs.
8. **Lighting:** studio softbox, white background. The red foil has a broad hot highlight on the bust and abdomen. The black wet-look shows a strong highlight streak down the side panel (anisotropic-looking vertical streaks following the body contour). The stones give white pinpoints with an AB tint.
9. **Hardest aspect:** the hourglass princess-line colour blocking, straps over mesh, and a top-to-waist stone fade.
   - **Capabilities:**
     - Princess/hourglass side-panel tool (contrast side panels whose width is controllable at bust, waist and hip).
     - Front strap X over the mesh yoke.
     - Vertical density gradient fill (top-dense to bottom-zero) clipped to a panel.
     - Snowflake motif stamp.
     - Wet-look shader with streak highlights.

## 17. Scherm_afbeelding2026-03-13om11.03.18.png

1. **File / view:** front, worn-on-athlete (crop: chin to upper thigh; the wearer's L hand on the hip). Pair of om11.03.33 (back).
2. **Silhouette:** 3/4 sleeves (ending just below the elbow), solid navy. Raglan construction. Neckline: crew, with a navy band about 1.5 cm covered in 2–3 rows of AB stones. Leg cut medium-high.
3. **Back design:** see om11.03.33.
4. **Panelling (front):**
   - Raglan sleeves in solid navy, with a small navy mesh insert at the top of each shoulder. It is triangular, along the raglan seam near the neck, about 8 cm long.
   - Upper chest mesh yoke: a V-shaped mesh area from the neckband down to a point at about the bust-apex level. Its upper edge is the neckband, extending to the raglan seams; its lower edges go diagonally from the raglan seam/armhole front down to the centre. In effect an inverted triangle.
   - Sternum diamond: a separate elongated mesh diamond/kite at the centre front, from just below the yoke's V point to about 3 cm above the waist band, about 6 cm wide and 12 cm tall. It may connect to the yoke at its top point; unclear.
   - Bust panels: solid navy on each side between the yoke, the diamond and the waist band.
   - Waist mesh band: a horizontal mesh band at the natural waist, about 4–6 cm tall, pinched at the centre front like a bow-tie or hourglass. The upper boundary dips down toward the centre and the lower boundary rises up toward the centre, so the band is narrowest (about 2 cm) at the centre front and wider (about 6 cm) at the sides. Possibly two crossing curved mesh strips; the effect continues on the back.
   - Lower: a solid navy brief.
   - Symmetric.
5. **Materials:**
   - Body: navy shiny tricot / lycra satin (moderate-high sheen, smooth satin highlights; not foil).
   - Mesh: navy, moderately sheer (skin reads mauve-grey).
6. **Embellishment (AB crystals, mixed sizes ss6–ss20; strong AB colour fire):**
   - Sunburst lines: about 6–8 radiating lines of stones on each bust panel, emanating from the sternum diamond outward and upward toward the shoulders and armpits. The lines are slightly curved (like a fan), each a single row with larger stones near the origin.
   - Lines around the waist band: radiating lines spreading upward from the waist band (forming a fan on the lower bodice) and downward onto the brief top (a short fan below).
   - Outline rows: 2–3 rows along the yoke edges, around the diamond, and along both edges of the waist band.
   - Gradient fills near the outlines.
   - Yoke mesh: a scatter, denser near the neck.
   - Sleeves: 3–4 parallel lines of stones along the raglan seam down the outer arm to the elbow, plus 2–3 rows at the sleeve hem.
   - Wearer's L hip: a crescent moon plus 3 stars motif in crystal/white, about 4 cm.
   - Front count about 800–1200.
7. **Trims & edges:** a stone-covered neckband; self-hemmed sleeve ends with stones; clean leg edges.
8. **Lighting:** studio softbox, white background. The satin tricot shows a soft broad sheen, brighter on the bust curves. The AB stones show pronounced rainbow fire (pink, green, blue pinpoints), the best AB reference in this batch. Mesh over the sternum shows the hollow between the breasts. The diamond mesh lies across the hollow (bridges), not tucked in.
9. **Hardest aspect:** the radiating sunburst stone lines originating from panel edges (fan rays), the pinched bow-tie waist band, and AB fire.
   - **Capabilities:**
     - Radiating ray generator (origin as a point or a curve, number of rays, spread angle, curvature, length, stone size taper).
     - Bow-tie/hourglass band shape (a band whose height varies along its length).
     - Floating mesh diamond insert.
     - Small shoulder mesh insert on the raglan.
     - Parallel lines following the raglan seam.
     - AB crystal shader.

## 18. Scherm_afbeelding2026-03-13om11.03.33.png

1. **File / view:** back, worn-on-athlete, hands on hips, full back view from head to thigh. Pair of om11.03.18.
2. **Silhouette:** 3/4 raglan sleeves in solid navy, with mesh inserts at the shoulder tops (back side). High back neck. Medium leg (moderate back coverage).
3. **Back design (precise):**
   - Back-neck band: about 1.5 cm, with AB stones, closed by a clear plastic "H"-shaped hook clasp (about 3 cm).
   - Keyhole: a large opening from the neckband to about mid-scapula, about 13 cm tall and about 12 cm wide. Its shape is an inverted heart/shield: the sides curve outward from the neck, then the bottom edge is a shallow V with its point at centre back (a sweetheart-shaped bottom). Truly open, bound in navy.
   - Raglan seams on the back run from the neckband to the underarm. Along them, 4–5 parallel lines of stones fan from the neck area toward the underarm, tapering in length.
   - Below the keyhole: a V-shaped gradient of AB stones, densest at the keyhole bottom edge and tapering down to a point about 8 cm below.
   - Back waist band: a mesh band at the natural waist, as on the front: hourglass/bow-tie, with crossing curved stone lines forming a shallow X at centre back. It is mesh-filled, not open.
   - No straps.
4. **Panelling:** raglan sleeves; shoulder mesh triangles (on the back, a narrower mesh wedge along the top of the raglan seam toward the shoulder point); the back bodice in solid navy; the waist mesh band; the brief. Symmetric.
5. **Materials:** navy shiny satin tricot (strong satin sheen on the sleeves and seat; broad highlights on the buttocks and upper arms). Navy mesh.
6. **Embellishment:**
   - Lines along the raglan seams.
   - The keyhole-bottom gradient.
   - Waist band: rows on both edges, plus fan lines radiating upward and downward from the band (up to about 8 cm), densest near the band.
   - Sleeves: rows near the hem.
   - Back count about 500–700.
7. **Trims & edges:** keyhole binding; the clear H clasp; sleeve hems.
8. **Lighting:** studio softbox, white background. The satin shows smooth broad specular highlights on the glutes, the upper arms and the scapula. There are fine stretch wrinkles at the lower back/waist and at the elbow creases.
9. **Hardest aspect:** the sweetheart-bottom keyhole with a gradient spilling from it, and stone lines that follow seams on curved raglan geometry.
   - **Capabilities:**
     - A keyhole shape editor (inverted heart/shield with a V-point bottom).
     - A gradient spilling from a cut-out edge in a V shape.
     - Seam-parallel stone lines (offset curves of a seam, n lines, tapering).
     - Front-to-back continuity of the waist band and its stone pattern.
     - A satin tricot shader (moderate roughness, broad highlights).

## 19. Scherm_afbeelding2026-03-13om14.48.14.png

1. **File / view:** front, worn-on-athlete, arms out to the sides (crop: chin to thigh). The same brand as Scherm 11.03.x (moon-stars logo); a different garment.
2. **Silhouette:** long sleeves to the wrist, solid black. Raglan construction. Neckline: a wide crew/shallow scoop, self-bound. Leg cut medium-high. Symmetric.
3. **Back design:** not visible.
4. **Panelling (front):**
   - Bodice: black, with narrow insert strips about 1–1.5 cm wide that appear dark-translucent (likely mesh or illusion strips; the skin tone is faintly visible as dark brown).
     - An X: two strips run from the upper raglan seam/shoulder front on each side diagonally down, cross at the sternum (about mid-bust height), and continue to the opposite side at underbust/lower-rib level.
     - Underbust: two more strips curve from each side seam under the bust toward the centre, joining the X's lower arms (forming a chevron/W under the bust). Unclear exactly how they connect.
     - The strips divide the bodice into solid black regions: an upper-centre triangle (from the neck to the X crossing), two side bust triangles, a lower-centre region, and lower side regions.
   - Bodice bottom edge: a sharp V/chevron pointing down at the centre front to about 3 cm below the navel, rising to the side seams at the waist.
   - Below: the black brief.
   - Sleeves: around the mid-forearm there is a dark band, possibly a mesh strip about 2 cm wrapping the arm diagonally, edged with stones. Unclear.
5. **Materials:**
   - Bodice solid regions: black shiny tricot / wet-look (noticeable specular highlights on the bust).
   - Brief and sleeves: black matte-to-low-sheen tricot (the brief looks deeper and flatter black; possibly velvet, unclear).
   - Strips: black mesh.
6. **Embellishment (AB crystals, mixed small/medium, with cyan/green AB colour visible):**
   - Rows lining both edges of every mesh strip (single rows).
   - A fan of stone rays on the lower bodice, converging at the bottom V point: about 8 rays fanning upward like an inverted sunburst toward the underbust strips.
   - Side gradients: dense scatter at both sides of the bust (near the armpit/side seams), fading inward (a strong density gradient, about 40 per 10 cm² at the sides).
   - Upper-centre triangle: a gradient from the neck downward.
   - Bodice bottom V edge: a dense outline row.
   - Sleeves: a scatter at the shoulders, rows at the forearm band, and a dense scatter at the wrists fading upward.
   - Wearer's L hip: a crescent moon plus stars motif.
   - Front count about 1000+.
7. **Trims & edges:** self-bound neckline; plain sleeve hems; clean leg edges.
8. **Lighting:** studio softbox, white background. The wet-look bust shows sharp bright highlights. The AB stones show cyan-green colour fire, more visible against black. The matte black brief shows almost no highlight.
9. **Hardest aspect:** narrow mesh strip inserts that cut the bodice into many panels, and a converging fan of stones into the V point, all on black (contrast-dependent).
   - **Capabilities:**
     - Narrow strip-insert tool (a stroke along a path that becomes a mesh channel splitting panels).
     - Chevron bodice hem.
     - Converging ray fan to a point.
     - Edge-distance density gradients.
     - Black-on-black material differentiation (wet-look vs matte vs mesh).
     - A sleeve band insert.

## 20. Scherm_afbeelding2026-03-13om16.44.33.png

1. **File / view:** front, worn-on-athlete, hands on hips (crop: neck to thigh). The same brand (moon-stars logo); a different garment.
2. **Silhouette:** long sleeves to the wrist, solid gunmetal. Raglan construction. Neckline: crew, with a self binding about 1 cm. Leg cut medium. Symmetric.
3. **Back design:** not visible.
4. **Panelling (front):**
   - Hourglass mesh: two mesh triangles meet tip to tip at the centre front.
     - Upper triangle: its base spans the neckline between the raglan seams; its sides go diagonally down to a point at about mid-bust height on the centre front (between the breasts).
     - Lower triangle: from that point, its sides go diagonally down-outward to the waist seam, with its base on the waist seam spanning about 60% of the waist width.
     - The pattern reads as a vertical bow-tie / "X" in mesh.
   - Bust panels: solid gunmetal triangles on each side (from the raglan seam/armhole down to the waist), between the mesh triangles.
   - Waist seam and band: a horizontal seam at the natural waist, with a solid band about 4 cm (or a decorative zone directly on the brief).
   - Brief: solid gunmetal.
5. **Materials:**
   - Body and sleeves: gunmetal/slate blue-grey shiny tricot with a metallic sheen (satin-metallic; smooth broad highlights on the shoulders and bust; not foil-dot).
   - Mesh: grey-tinted, quite sheer (skin reads mauve/grey-pink).
6. **Embellishment (AB/clear, mixed small/medium):**
   - Upper mesh triangle: vertical almond/ogive (pointed arch) shaped curved lines. About 3 pairs of curved lines bowing outward form lens shapes, with stones in single rows.
   - Lower mesh triangle: a diamond lattice of single-row lines.
   - Bust panels: radiating, slightly curved lines (about 6–8) fanning from the mesh boundary out to the side/armpit, densest near the mesh edge, then fading.
   - Waist band: 2 straight rows at the top. Below them, a swag/garland pattern: rows dip into V points at the centre front and at regular intervals, like a drape. The V points hang down onto the brief about 4–5 cm below the waist.
   - Sleeves: wavy/arched lines of stones on the upper arms and forearms (curving arcs), plus a scatter.
   - Wearer's L hip: a crescent moon plus 3 stars.
   - Front count about 900–1200.
7. **Trims & edges:** a self neck binding; plain cuffs; clean leg edges.
8. **Lighting:** studio softbox, white background. The metallic-satin sheen is bright on the shoulders and upper arms (broad soft highlights). The AB stones show a pale rainbow. The mesh triangle at the sternum bridges across the hollow; the skin is visible.
9. **Hardest aspect:** the hourglass mesh triangles plus multiple stone line-art patterns (ogive arcs, lattice, rays, swags) layered region by region.
   - **Capabilities:**
     - Triangle/polygon mesh inserts meeting at a point.
     - A library of stone line patterns (ogive/lens arcs, lattice, rays, swag/garland with V drops) clipped to panel regions.
     - Swag garland generator along a band (period, drop depth, rows).
     - Arm-local pattern placement.
     - A metallic satin shader.

---

## Batch summary

### Recurring patterns
1. **Mesh (illusion) is everywhere.** 18 of 20 images use stretch mesh: as sleeves (11 garments), upper-chest yokes, raglan shoulder triangles, cut-out fills, waist bands, narrow strips and plunge Vs. Tints include navy, purple, plum, royal blue, black, grey and skin-tone. The skin always reads through as a tinted, darker, desaturated version, and is more transparent where the mesh is stretched flat (sleeves) than over curves.
2. **Long or 3/4 sleeves dominate.** 15 of 20 images show sleeved garments; only G1 and Nejahkaki are sleeveless. Raglan construction is very common (Laura, Marissa, all four Scherm images). Cuffs are either self-hemmed, a solid band, or a glitter-foil or crystal band.
3. **Crew / high necks.** Almost all are crew or high/mock necks. The only exception is Nejahkaki's V-neck. Back keyholes closed with a clear plastic hook (G1, Reese, Scherm 11.03.33) are a recurring construction.
4. **Waist-seam-anchored stone gradients.** Dense at the seam and fading away (G1, G4, Laura, Reese, Scherm images), plus edge-hugging gradients along panel borders.
5. **Outline rows along every panel edge.** 1–3 rows; near-universal (N3, Silver-Linea, Scherm, platino, Nejahkaki).
6. **Geometric stone line-art.** Chevrons (Laura), argyle lattices (Marissa, Nejahkaki, Scherm 16.44), radiating rays/sunbursts (Scherm 11.03 and 14.48, Silver-Linea (2)), ogive arcs and swag garlands (Scherm 16.44), zig-zag crowns (G4), and waves on the sleeves (Reese, Scherm 16.44).
7. **Small hip logo motifs** in crystal or print: snowflake, star, spiral-rose, triskele, moon-and-stars, the "Dulcy Sp" script. These are almost always on the wearer's L hip; G4, platino and the Silver-Linea items use the wearer's R hip.
8. **High-gloss metallic foil briefs/bodies** (Marissa, Nejahkaki, G4, platino (1), Reese red) alongside satin tricot (Scherm) and matte tricot (Laura, N3). Glossy metallics commonly sit next to sheer mesh.
9. **AB crystals** are the default stone, with clear as second. Coloured stones are rarer: yellow (Laura), sapphire (G4), jet/hematite (Silver-Linea (2), Nejahkaki, platino), and gold/champagne (platino-25).

### Rare / unique features in this batch
- **Printed lace plus a region-masked foil** (G1). The only print-based design in this batch.
- **Flat holographic dots or sequins instead of faceted stones** (G1).
- **A 3D ruched/pleated twist-knot bandeau** over the bust (Silver-Linea (3)). Requires geometric fold detail; NEW.
- **A true open-back strap network** with a Y spine strap, sideways V straps and a bridge band (Nejahkaki). The only truly open strap back here. Reese's straps are appliquéd over mesh.
- **Asymmetric designs**: the S-curve mesh stripe (N3), a diagonal panel with a burst motif (Silver-Linea (2)), flame tongues (platino (1)).
- **Flame/feather pointed panel shapes** with a stone "drip" cascade (platino (1)).
- **Narrow mesh strip inserts** forming an X plus underbust lines (Scherm 14.48).
- **A pinched bow-tie mesh waist band** wrapping front to back (Scherm 11.03).
- **Large side-waist cut-outs filled with skin-tone mesh** (Silver-Linea (3)).
- **Possible velvet-foil / crushed red metallic** (Reese, back view). NEW candidate material.
- **A stepped/pixel stone gradient** (Marissa front).
- **Real competition (arena) and press-wall (flash) lighting** (platino-25, platino-25 (1)). Useful renderer calibration targets beyond the studio shots.

### Top 10 capabilities this batch demands
1. **Freeform panel-boundary editor on the body.** Arbitrary splines including S-curves, pointed flame tips, sweethearts, chevrons, plunge Vs and polygon/triangle inserts. It needs symmetric and asymmetric modes, and boundaries that continue across side seams from front to back.
2. **Mesh/illusion material with tint and skin show-through.** Opacity varying with stretch, applicable to any panel, strip, cut-out fill, yoke or sleeve. Skin-tone, black, navy, purple, grey and white variants.
3. **Band, strap and strip tool.** Paths with width, used as (a) appliqué straps over another panel (the Reese X's, Laura's crossing bands), (b) true open-back straps forming a network with nodes (the Nejahkaki Y spine and sideways V's), and (c) narrow mesh channels that split panels (Scherm 14.48, the N3 stripe). It needs crossing order, automatic panel creation at intersections, and variable-width bands (the bow-tie).
4. **Cut-out and keyhole tool** with shape presets: teardrop, round, inverted-heart/V-bottom, side-waist D. It needs automatic binding, an open or mesh-filled option, and a back-neck closure hardware decal (the clear hook).
5. **Stone pattern generators.** Edge outline rows (n rows, offset, on both sides of bands); seam-parallel line sets; chevrons; argyle lattices; radiating rays/sunbursts from a point or curve; ogive arcs; swag garlands; zig-zags; sine waves along limb paths; stepped/pixel grids. All of them must clip to a panel region and support mirroring.
6. **Density and size gradient fields for scatter.** Gradients as a function of distance from a seam, edge or point; directional drips and cascades; uniform scatter over large areas such as full sleeves; stone sizes that shrink with distance.
7. **Instanced crystal rendering at scale** (1000–2000 stones per garment is common here, mostly on sleeves and yokes). It needs an AB crystal shader with rainbow colour fire, clear/coloured/jet/hematite/gold variants, and a starburst glint effect, all within 60 fps.
8. **Fabric shader set**, in particular:
   - high-gloss metallic foil (purple, green, blue, silver mirror) with anisotropic stretch streaks;
   - satin/shiny tricot (navy, gunmetal);
   - matte tricot;
   - mystique foil-dot and micro-glitter (several distinct sparkle densities on adjacent panels);
   - hologram foil (silver-white, blue);
   - black wet-look vs matte black differentiation;
   - a candidate velvet foil.
9. **Layered material stack per panel**: base material, a sublimation print overlay (lace texture), soft-edged region masks that switch the base inside a panel, and decals for logos and text (print or embroidery). Required for G1-type designs.
10. **Motif stamps and non-stone embellishment**: crystal motifs (snowflake, star, rose, moon-and-stars, flower), flat hologram dots/sequins as a distinct element type, and geometric 3D detail for ruching/pleats converging to a knot (normal/displacement-based). Also lighting presets for calibration: studio softbox, on-camera flash, arena overhead.

[^moodboard]: Owner's moodboard, images 39-58
