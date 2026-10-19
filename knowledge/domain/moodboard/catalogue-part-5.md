---
type: Catalog
title: "Moodboard catalogue, part 5 (images 79-98)"
description: "Per-image teardown of moodboard images 79-98 in filename order (Screenshot 2026-06-02 105125.png to Screenshot 2026-06-05 113615.png): silhouette, back, panelling, materials, stones, trims, photography and the app capabilities each design demands."
tags: [moodboard, catalogue, reference-designs]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T19:30:00Z }
sources:
  - id: moodboard
    resource: "moodboard/ folder in the project root (138 owner-supplied photos), images 79-98 in filename order"
    title: Owner's moodboard
    author: human:mattj
---

# How to read

Visual teardown by a Claude Code subagent from the photos alone, kept as written.[^moodboard] Every
measurement, count and material call is an estimate from a photo **[UNVERIFIED]**. The synthesis
across all parts is the [design-space taxonomy](/domain/moodboard/design-space-taxonomy.md).

**Conventions**
- "Wearer's left/right" means the athlete's own side. In a front view, wearer's left is image right. In a back view, wearer's left is image left.
- Stone sizes are relative estimates: tiny ≈ ss6, small ≈ ss10–12, medium ≈ ss16–20, large ≈ ss30+. They are judged against the ~1 cm binding widths and body scale.
- The images are low resolution (420–890 px wide). I inspected 2x zoom crops for fine detail.
- Logos (placement need only, not reproduced as content):
  - Most product shots (the 2026-06-02 series) have a circular white "zone" logo at the wearer's left hip.
  - The 2026-06-05 11:35/11:36 pair has an "S" logo made of stones.

Garment groupings:

| Garment | Images |
|---|---|
| A. Red/white/blue flames | 105125 |
| B. Black + coral ombre V, red mesh sleeves, gold trim, cage back | 105141 (front) + 105148 (back) |
| C. Mulberry pink, stone gradient, strap-cage back | 105204 (front) + 105214 (back) |
| D. Periwinkle mesh-front, baroque stone motif | 105235 |
| E. Royal blue seigaiha/fan stone pattern | 105329 (front 3/4) + 105338 (front closeup) |
| F. Cornflower blue, lattice + sunburst mesh wedges | 105356 |
| G. Black asymmetric one-shoulder illusion, keyhole back | 105418 (front) + 105427 (back) |
| H. Black argyle-lattice stone bib | 105521 |
| I. Black + navy line-art print, teal accents, keyhole back with crossed bands | 105547 (front) + 105555 (back) |
| J. Teal filigree bodice, black stone frame | 105611 |
| K. Lilac lace-print, purple foil straps | 105739 |
| L. Sleeveless blue zig-zag, cross-back (casual home photo) | 081228 (front) + 081245 (back) |
| M. Violet, crossed lilac straps | 113509 |
| N. White/black figure-8 keyhole, gold trim (closeup) | 113615 |

---

## 1. Screenshot 2026-06-02 105125.png (Garment A)

1. **View**: front, worn-on-athlete (torso crop, background removed to white). No pair in this batch.
2. **Silhouette**:
   - Sleeves: 3/4. Set-in or raglan is unclear; there is no visible raglan seam and the print runs continuously from body to sleeve.
   - Neckline: mock / high-neck (stand collar ~3 cm).
   - Leg cut: medium-high. No skirt.
3. **Back design**: not visible.
4. **Panelling**:
   - Construction: appears to be a single sublimation-printed body. No construction seams cross the design; the flame edges are crisp print edges, not seams. The collar is a separate band.
   - Colour layout: white upper body (shoulders, upper chest, upper sleeves) changes to navy lower body (from about waist/navel down; on the sleeves, from mid-forearm).
   - Flame boundary: the white/navy boundary is a field of upward-licking flames. Tongues are royal blue, sky/cyan blue and coral-red, layered at different heights. The tallest reach the upper chest and shoulder; on the sleeves some reach the collar.
   - Inverted flame "bib": a separate cluster of red and blue tongues hangs down from the collar at centre front to about the sternum.
   - Curve character: S-curve tongues with sharp tips, layered.
   - Symmetry: roughly mirrored but not exact; it has a hand-drawn feel and is asymmetric in detail.
   - Sleeves carry the same flame band from cuff upward.
5. **Materials**:
   - Body: sublimation print on what is probably smooth tricot, with a soft satin sheen (broad soft highlights on the chest, not wet-look).
   - Colours: white, navy (~#2b3a55), royal blue, cyan blue, coral red.
   - Collar: navy, fully covered in stones.
6. **Embellishment**:
   - Collar: dense fill of mixed small–medium clear and AB stones, ~3 rows deep, stones touching. Some stones look dark; they may be jet or just shadow (unclear).
   - Body: stones follow the flame tongues, as lines along tongue edges and scatter inside the tongues. They concentrate in the red and blue flames.
   - Body density gradient: densest at flame tips and edges on the chest, sparser scatter in the navy lower body, almost none below the navel. Mixed small and medium, clear crystal with AB. Roughly 500–800 stones visible on the front.
   - Sleeves: stones ride the flame tongues in the same way.
7. **Trims**:
   - Collar band (separate, navy).
   - Cuffs and leg openings appear self-fabric turned or bound; no contrast.
   - No zip visible from the front.
8. **Lighting**:
   - Studio softbox, high-key, background removed.
   - Sparkle: small white pinpoint glints with slight grey edges; no starbursts.
   - Fabric: broad soft sheen over the bust and hips.
   - Light compression wrinkles at the underarm and inner elbow.
   - Fabric bridges smoothly between the breasts (no dip).
9. **Hardest aspect**: free-form layered flame artwork that wraps from body onto sleeves, with stones that track the artwork edges. Capabilities needed:
   - Sublimation print layer: vector artwork mapped onto the full garment UV, continuous across sleeve/body seams.
   - Flame / "tongue" brush or shape generator (tapered S-curve strokes, layered colours).
   - Stone placement along an artwork edge (paths derived automatically from print region boundaries), plus scatter fill inside a region.
   - Stone density gradient (dense at top/tips, sparse at bottom).
   - Collar band with dense mixed-size stone fill.
   - Mirror with variation (near-symmetric hand-drawn look).

## 2. Screenshot 2026-06-02 105141.png (Garment B front)

1. **View**: front, worn-on-athlete (collar to upper thigh, left arm raised). **Pair with 105148 (back)**: same red mesh sleeves, gold metallic trim and collar, black body.
2. **Silhouette**:
   - Sleeves: 3/4 raglan; the raglan seam shows as a gold line from neckline to underarm.
   - Neckline: crew, close to mock (gold band ~1.5 cm at the base of the neck).
   - Leg cut: high. No skirt.
3. **Back design**: see 105148.
4. **Panelling**:
   - Body: very dark charcoal/black-green, slightly textured. It may be a printed mesh texture or matte tricot (unclear).
   - Centre-front V panel: full width between the collar's front corners (~12 cm at the neckline), tapering to a sharp point at about the navel/lower abdomen. Sides straight or very slightly curved. Symmetric.
   - V fill: vertical ombre, coral-pink at the bottom to deeper red/raspberry at the neckline. Whether the V is a separate sewn panel or part of a sublimation print is unclear; its edges are crisp and outlined with stones.
   - Sleeves: separate raglan panels in red mesh.
   - Raglan seams: covered by gold metallic binding (~1 cm) from neckline to underarm.
5. **Materials**:
   - Body: dark matte tricot (possibly a sublimated dark texture).
   - V: sublimation ombre (pink to red).
   - Sleeves: red stretch mesh, tinted and semi-sheer; skin reads through as slightly lighter red.
   - Collar, raglan and cuff trims: gold solid metallic foil. The cuff shows some holographic-looking streaks (unclear).
6. **Embellishment**:
   - V edges: a single line of small clear/AB stones along both edges, from neckline to point.
   - Body: radiating rows of stones. Straight rows start at the V edge and fan outward and upward toward the shoulders and sides, like a feather or chevron fan.
     - About 15–20 rows per side, spaced ~1.5–2 cm, each with ~5–15 stones. Small–medium. Mirrored.
     - Colours intermixed: clear crystal, AB, and topaz/light-colorado/gold. Amber-gold tones seem to dominate near the V and clear toward the outside (exact distribution unclear).
   - Collar: one row of small clear stones on the gold band.
   - Sleeves: sparse random scatter of small clear stones, slightly denser toward the cuff.
   - Total visible on front: roughly 400–600.
7. **Trims**: gold metallic collar binding, gold raglan binding, gold cuff band (~2 cm). Leg openings self-finished in black.
8. **Lighting**:
   - Studio, high-key, cutout.
   - Stones read as white/amber pinpoints, with some brighter glints.
   - Body fabric shows a subtle mottled texture (could be compression artefact).
   - Skin through the mesh darkens the red.
   - Small horizontal stretch wrinkles at the waist and crotch.
9. **Hardest aspect**: radiating row pattern anchored to a panel edge. Capabilities needed:
   - Panel tool: V-shaped centre panel defined by neckline width plus an apex point.
   - Vertical ombre fill on a panel.
   - "Row fan" generator: N stone rows starting at points along a path at a given angle, with varying lengths, mirrored.
   - Mixed-colour stone palette per row (random or by position).
   - Contrast metallic gold binding along raglan seams, neckline and cuffs.
   - Tinted semi-sheer mesh sleeve shader with skin show-through.

## 3. Screenshot 2026-06-02 105148.png (Garment B back)

1. **View**: back, worn-on-athlete (upper back to hip). **Pair with 105141.**
2. **Silhouette**: as 105141: 3/4 raglan red mesh sleeves, mock/crew collar.
3. **Back design** (a "cage" back; the key feature):
   - Collar: gold band, closing at centre back with a hook-and-eye (metal hook visible).
   - Open back: a large U-shaped opening, truly open to skin.
     - Runs from the collar down to about the bra line / lower scapula (~18–20 cm below the collar).
     - Full width between the raglan seams at the top, rounded bottom.
     - Edge bound in gold metallic (~1 cm).
   - The raglan seams on the back are also gold-bound, from collar to underarm, and form the outer frame of the opening.
   - Four vertical gold metallic straps (~1–1.2 cm each) drop straight down from the collar band:
     - Two on each side of centre back; the two straps in each pair are ~4–5 cm apart, with an ~8 cm gap at the spine between the inner pair.
     - They pass over the open area, then continue on top of the black back panel (applied over fabric, not open beneath).
     - They end at a horizontal gold waistband (~2.5 cm) at about the waist/lower ribs.
     - The outer straps splay slightly outward toward the bottom; the inner straps are nearly vertical.
     - No crossing. Anchors are the collar (top) and the waistband (bottom).
   - Below the waistband: plain black lower back.
4. **Panelling**: black back body panel (from the U edge to the waistband), black lower back, red mesh sleeves, gold collar, gold straps, gold U-binding, gold waistband, gold cuffs. Symmetric.
5. **Materials**:
   - Gold solid metallic foil; the waistband shows a slightly brushed or holographic streak (unclear).
   - Black matte tricot.
   - Red tinted mesh sleeves.
6. **Embellishment**:
   - A single row of small clear stones on each strap, spaced ~2 cm.
   - A single row on the collar, on both sides of the hook.
   - A row of small stones below the waistband.
   - Sparse scatter on the sleeves, increasing toward the cuff (gradient).
7. **Trims**: gold binding on every edge, hook-and-eye at the collar, gold cuffs ~2 cm.
8. **Lighting**:
   - Studio, high-key, cutout.
   - Gold reads warm yellow with mild specular streaks along the strap length (anisotropic-ish).
   - Skin shows through the mesh sleeves (red darkened).
   - Straps lie flat on the skin over the open area; no gaps visible.
9. **Hardest aspect**: straps that bridge an opening and then continue over fabric. Capabilities needed:
   - Strap generator: start anchor (collar), end anchor (waistband), spacing, width and splay angle; a strap can run over an open area or over fabric.
   - Cut-out / opening tool with an arbitrary U shape and bound edge.
   - Hook-and-eye closure detail at the collar back (small hardware mesh).
   - Stones in a line along a strap at fixed spacing.
   - Gold metallic foil on narrow trims, with anisotropic sheen along the strap direction.

## 4. Screenshot 2026-06-02 105204.png (Garment C front)

1. **View**: front, worn-on-athlete (cutout). **Pair with 105214 (back)**: same mulberry colour, patterned-mesh sleeves, chevron stone rows on the forearms.
2. **Silhouette**: 3/4 raglan sleeves; mock neckline (stand collar ~2.5 cm); leg cut medium-high.
3. **Back design**: see 105214.
4. **Panelling**:
   - Pieces: front body panel (mulberry/raspberry), raglan sleeves in patterned mesh, collar band, solid cuff band (~3 cm). Raglan seams visible as fine lines. Symmetric.
   - Possible underbust seam: the stone border follows two shallow downward arcs meeting at centre front (an "M" / double-scallop line under the bust).
   - The fabric above that line looks very slightly lighter/pinker, but this may be stone reflection. **Unclear whether it is a seam or just the edge of the stone field.**
5. **Materials**:
   - Body: mulberry tricot with a soft satin sheen, possibly a slight shimmer.
   - Sleeves: mulberry stretch mesh with a flocked or printed damask swirl pattern (lace-like texture; NEW term: "patterned/flocked mesh"). Semi-sheer, skin faintly visible.
   - Collar and cuffs: solid mulberry.
6. **Embellishment**:
   - Collar: 3 parallel rows of small clear/AB stones.
   - Bodice: dense scatter with a density gradient.
     - Sparse at the collar/upper chest, denser toward the bust, densest just above the underbust double-scallop.
     - Mixed sizes (tiny to medium), clear + AB, placed randomly and uniformly within each density level.
   - Border: 3–4 rows of stones trace the double-scallop underbust line exactly, forming a border band. The lower body below it is plain.
   - Bodice front total: roughly 700–1000 stones.
   - Sleeves: scatter of small/medium clear stones over the patterned mesh, fairly even (perhaps densest at the shoulder). Near the forearm, 3 rows of stones run around the sleeve in a chevron (V pointing toward the elbow or up the arm; orientation unclear), then the cuff band.
7. **Trims**: self-colour collar and cuff bands; no contrast.
8. **Lighting**:
   - Studio, high-key, cutout.
   - Stones read as dense white pinpoint shimmer; at the highest density they give an overall glitter effect.
   - Soft fabric sheen. Slight wrinkle at the underarm.
9. **Hardest aspect**: a smooth stone density gradient that ends in a precise multi-row border along a curved line. Capabilities needed:
   - Region stone fill with a density map and controllable gradient direction (sparse top, dense bottom).
   - Multi-row stone border along an arbitrary curve (double scallop): N rows with offset spacing.
   - Patterned mesh material (flocked damask on a sheer base): texture + alpha + skin show-through.
   - Ring of stone rows around a sleeve (chevron path on a cylinder).

## 5. Screenshot 2026-06-02 105214.png (Garment C back)

1. **View**: back, worn-on-athlete. **Pair with 105204.**
2. **Silhouette**: as above.
3. **Back design** (a strap cage over illusion mesh):
   - Mock collar with stones; centre-back closure with hook-and-eye at the collar.
   - Keyhole: an inverted teardrop/oval opening, truly open to skin.
     - Runs from the collar down to about mid-scapula / bra line (~15 cm); ~8 cm at its widest.
     - Its edges are formed by the two innermost straps.
   - Yoke: the upper back between the raglan seams is a skin-tone illusion mesh, from the collar to a horizontal seam at about the lower scapula / bra line.
   - Straps over the yoke: 3 solid mulberry straps per side. They drop from the collar in curves that bow outward and then return (barrel shape), and anchor on the horizontal yoke seam.
     - Inner strap ~3 cm wide; it forms the keyhole edge.
     - Middle strap ~1.5 cm.
     - Outer strap ~1.5 cm, next to (or forming) the raglan edge.
     - The gaps between straps are filled with skin-tone mesh, not open. No crossing. Mirrored.
   - Below the yoke seam: solid mulberry back.
4. **Panelling**: collar, skin-tone mesh yoke, 6 applied straps, solid back body, patterned-mesh raglan sleeves, cuff bands.
5. **Materials**:
   - Mulberry satin-sheen tricot.
   - Skin-tone illusion mesh: skin shows almost fully, with a very slight beige tint.
   - Patterned flocked mesh sleeves.
6. **Embellishment**:
   - Collar: 2–3 rows of stones.
   - Below the yoke seam: a chevron of 3 rows of small stones. The apex points up at centre back and the legs run ~12 cm down toward the side seams (~40 stones per row).
   - Sleeves: dense scatter, with 3 chevron rows on the forearm before the cuff.
7. **Trims**: self-binding on the keyhole, hook-and-eye, solid cuff bands.
8. **Lighting**:
   - Studio, high-key.
   - Mesh reads matte, slightly lighter than skin.
   - Straps show a soft sheen along their length.
   - Mesh wrinkles slightly between the straps near the shoulder.
9. **Hardest aspect**: a curved strap cage laid over illusion mesh, with a true keyhole in the middle. Capabilities needed:
   - Strap generator with curved (bowed) paths, per-strap width, mirrored; straps laid over mesh rather than skin.
   - Illusion-mesh panel material (skin-tone, near-invisible).
   - Mixed "open" and "mesh-filled" region flags within one yoke.
   - Chevron multi-row stone path.

## 6. Screenshot 2026-06-02 105235.png (Garment D)

1. **View**: front, worn-on-athlete (cutout, right hand on hip). No pair in this batch.
2. **Silhouette**:
   - Sleeves: 3/4. The join is at the shoulder point, so likely set-in (unclear).
   - Neckline: crew / slightly wide scoop, bound.
   - Leg cut: medium-high.
3. **Back design**: not visible.
4. **Panelling**:
   - Body: the whole front shows a visible mesh texture and looks lighter and slightly translucent. It is likely a periwinkle/denim-blue mesh layer over an opaque lining, or a tricot printed to look like mesh (unclear).
   - Central zone: a darker area runs from the neckline (full neckline width), narrowing to a point at about the sternum/bust line, with the two halves of the motif on either side. It could be a separate panel, a double layer, or shading from the lining (unclear).
   - Sleeves: periwinkle mesh, semi-sheer (skin visible as mauve), ending in a pale lilac-grey cuff band (~3 cm).
5. **Materials**:
   - Body: periwinkle blue mesh over tricot, soft matte.
   - Sleeves: periwinkle tinted mesh; skin shows through moderately.
   - Cuff: pale lilac/silver, possibly shiny/metallic (unclear).
6. **Embellishment** (the dominant feature):
   - A large mirrored baroque/paisley motif drawn entirely in stones. It covers the chest and abdomen, from the shoulders down to a pointed bottom near the navel: an overall shield/heart shape ~35 cm tall.
   - Built from curved lines, teardrops, scroll curls and leaf shapes, each drawn as single rows of stones; some shapes are filled with dots.
   - Three colours: clear crystal, AB, and dark stones (jet / amethyst / garnet tone). The dark stones are used for some lines and curls to create contrast.
   - Sizes: small–medium mixed, with bigger stones at key points.
   - The motif continues onto the sleeves as curls and swirls, getting denser toward the forearm/cuff.
   - Exactly mirrored about centre front. Front total: roughly 1000–1500 stones.
7. **Trims**:
   - Neckline self-bound in periwinkle (the binding is slightly shinier).
   - Cuffs: lilac band.
   - Leg openings: self.
8. **Lighting**:
   - Studio, high-key, cutout.
   - Stones read as pinpoint glints; AB stones show faint warm/cool colour.
   - Dark stones read as dark dots: reflective but low value. It matters that they stay visible as dots.
   - Mesh texture visible as a fine grid.
9. **Hardest aspect**: an intricate, multi-colour, mirrored line-art motif made of stones, extending onto the sleeves. Capabilities needed:
   - Import vector line-art and convert stroke paths to stone rows (with spacing control) and filled shapes to stone fill.
   - Per-path stone colour and size assignment (3+ colours, including dark jet/amethyst).
   - Mirror about centre front, with the motif continuing across body/sleeve seams.
   - Mesh-over-lining material (visible mesh texture on an opaque garment).

## 7. Screenshot 2026-06-02 105329.png (Garment E front, 3/4)

1. **View**: front, slight 3/4, worn-on-athlete (cutout; hand on front of thigh). **Pair with 105338 (closeup of the same garment)**: same royal blue, fan/scale stone pattern, side window.
2. **Silhouette**:
   - Sleeves: 3/4, in royal-blue mesh. They join the body on a racer/halter-cut armhole: the body panel cuts in from the neck toward the underarm, and mesh fills the shoulder and upper arm.
   - Neckline: crew with a wide stone band.
   - Leg cut: high.
3. **Back design**: not visible.
4. **Panelling**:
   - Neckband ~2.5 cm wide.
   - Halter-shaped front bodice, bounded by a stone-covered band (~2.5–3 cm) running from the neckband along the racer armhole down to the underarm/side.
   - Central front panel (chest to waist), carrying the fan pattern.
   - Side window on the wearer's right (image left): a lens/crescent shape.
     - A curved stone-covered band sweeps from the armhole band down to the waistband.
     - It encloses a mesh-filled window (royal blue mesh, skin visible), about 12 cm long × 4 cm high, at the lower ribs/waist.
   - Waistband ~4 cm at the waist (above the navel).
   - Lower body: plain royal blue.
   - Window side: here it is on the wearer's right; 105338 shows a window on the wearer's left. Either there are windows on **both sides** (each photo's pose hides one) or one image is mirrored. **Unclear.**
5. **Materials**:
   - Lower body: royal blue tricot with a soft, slightly shiny sheen.
   - Bands: royal blue with a glittery/metallic shimmer surface (shiny tricot or foil); sparkle shows under the stones.
   - Sleeves: royal blue tinted mesh, sheer (skin shows as dark blue).
   - Centre panel: royal blue. The fan arcs read as slightly lighter blue, possibly printed scale outlines under the stones (unclear).
6. **Embellishment**:
   - Centre panel: a seigaiha / fan-scale pattern.
     - Rows of overlapping fan shapes, ~4 cm wide each. Each fan is a roughly triangular cluster of stones arranged in concentric arcs (a fan wedge).
     - Rows are offset like fish scales, ~6–7 rows from neck to waist.
   - Neckband, armhole bands, window band and waistband: dense mixed-size fill of AB + clear stones (medium–large mixed with small). Scatter spills over the band edges and fades outward (density gradient off the band).
   - Sleeves: sparse scatter of small clear/AB stones. Cuff band ~4 cm dense, with a gradient fading up the forearm.
   - Total on front: roughly 1500+ stones.
7. **Trims**: bands as above; cuffs bound in blue; leg openings self.
8. **Lighting**:
   - Studio, high-key, cutout.
   - Stones show AB colour (pink/gold flecks) at this distance; overall shimmer on the bands.
   - Mesh sleeves read dark blue with the arm silhouette visible.
9. **Hardest aspect**: a tiled stone-cluster pattern (fan/scale) and a curved band that defines a mesh window. Capabilities needed:
   - Stone pattern tiler: a stone-cluster motif repeated in an offset grid within a panel region, clipped to the panel boundary.
   - Band with stones along an arbitrary curve (neck → racer → side), with an edge spill-over gradient.
   - Mesh-filled window enclosed by bands (lens shape) at the side waist.
   - Racer/halter armhole with mesh sleeve infill.

## 8. Screenshot 2026-06-02 105338.png (Garment E closeup)

1. **View**: closeup front (neck to waist), worn-on-athlete. This is a product-page screenshot; the carousel arrows "<" ">" at the left/right edges are UI chrome, ignore them. **Same garment as 105329.**
2. **Silhouette**: crew neck with a ~3 cm stone band; racer-cut body with royal mesh sleeves.
3. **Back design**: not visible.
4. **Panelling** (clearer here):
   - Neckband.
   - Armhole bands on both sides, from the neckband down to the underarm and continuing down the side.
   - Centre panel with the fan pattern.
   - On the wearer's left (image right), a second band curves from the armhole band down toward the waistband, enclosing a mesh window (royal blue mesh, skin visible) at the side of the ribs.
   - Waistband ~3.5 cm.
   - The fan panel's background appears to be a blue mesh-texture fabric (fine grid visible). The fans are formed purely by stones on it; the darker blue between fans is the fabric.
5. **Materials**:
   - Bands: royal blue with a metallic shimmer; the waistband shows a shiny, foil-like speckled sparkle.
   - Centre panel: royal blue mesh texture (or mesh over lining).
   - Sleeves: royal tinted mesh.
6. **Embellishment**:
   - Fans: each ~5 cm wide and ~3 cm tall, made of ~4 concentric arcs of small clear + AB stones. Stone size decreases toward the fan's point. Rows are offset by half a fan.
   - Bands: dense fill of mixed sizes (small–large), AB dominant. Stones are placed randomly but aligned to the band edges, with scatter spilling outside the edges.
   - Sleeves: very sparse small AB stones (~1 per 10 cm²); dense cuff band.
7. **Trims**: bands are bound/applied pieces; neckline bound.
8. **Lighting**:
   - Studio softbox, slightly cool.
   - Strong AB colour fire on the large band stones (pink, green, gold highlights); the smaller fan stones read white/silver.
   - Mesh sleeves show skin as purple-blue; fabric creases at the underarm.
9. **Hardest aspect**: as 105329, plus graduated stone sizes inside each fan motif and AB colour fire at close range. Capabilities needed:
   - Motif editor: define a small stone cluster (positions, sizes) and tile it.
   - AB stone shader with angle-dependent colour fire (needed at closeup).
   - Band "spill" scatter: stones scattered just beyond a band edge, decaying with distance.

## 9. Screenshot 2026-06-02 105356.png (Garment F)

1. **View**: front, slight 3/4, worn-on-athlete (cutout). No pair in this batch.
2. **Silhouette**: 3/4 raglan sleeves; crew neck, black-bound and stone-studded; leg cut high.
3. **Back design**: not visible.
4. **Panelling**:
   - Black binding on the neckline.
   - Solid black strips (~1.5–2 cm) along the raglan seams, from neckline to underarm.
   - Raglan sleeves in sheer black mesh (skin visible as grey-brown), with a black cuff band ~2 cm.
   - Main front: cornflower/steel blue.
   - Sunburst waist feature:
     - On each side at the waist/lower ribs, 2–3 wedge-shaped black mesh inserts, separated by narrow blue fabric "rays".
     - The rays radiate from a point near centre front, just above the navel, out to the side seam.
     - On the image-left side, the wedges span from about the underbust to the waist.
     - Mesh wedges are sheer black (skin shows through dark). Roughly mirrored; both sides are visible with wedges.
   - Side panels: a narrow black panel (possibly mesh) runs along the side from the underarm down, at least on image left (unclear).
   - Lower body: plain blue.
5. **Materials**:
   - Blue: tricot with a soft sheen (light specular on the hip).
   - Black mesh (sleeves, wedges).
   - Black opaque binding and strips.
6. **Embellishment**:
   - Upper chest: a lattice of stone lines. Diagonal lines run from the neckline and cross to form diamonds/X shapes (argyle-like), in small clear/AB stones.
   - Within the lattice: a scatter of jet black stones (black on blue, a distinct contrast choice) mixed with clear. Denser at the centre.
   - Sunburst: single or double rows of stones run along each blue ray, from the central point to the side seam. A cluster of stones sits at the convergence point, and the rays continue upward as a vertical spray of stones into the lattice.
   - Neckline: a row of jet + clear stones on the black binding.
   - Sleeves: sparse scatter of clear stones.
   - Front total: roughly 800–1200.
7. **Trims**: black neck binding, black raglan strips, black cuffs; leg openings self.
8. **Lighting**:
   - Studio, high-key, cutout.
   - Jet stones read as glossy black dots with tiny white highlights; clear stones as white pinpoints, some with a pink AB tint.
9. **Hardest aspect**: radiating mesh wedges (sunburst cut-outs) with stone rays. Capabilities needed:
   - Radial panel generator: a centre point plus N rays to a target edge, alternating mesh and fabric wedges.
   - Stones along ray paths, generated automatically from the radial geometry.
   - Lattice (diamond grid) stone pattern clipped to a region.
   - Jet / coloured stone support (dark stones need correct glossy dark rendering).

## 10. Screenshot 2026-06-02 105418.png (Garment G front)

1. **View**: front, worn-on-athlete (cutout, arms out). **Pair with 105427 (back)**: same asymmetric mesh shoulder with swag stone rows, black body, diagonal waistband.
2. **Silhouette**:
   - Asymmetric sleeves: wearer's right (image left) is a long opaque black sleeve; wearer's left (image right) is a long black mesh sleeve.
   - Neckline: mock / high-neck collar (~3 cm) in shiny black.
   - Asymmetric illusion one-shoulder: the opaque bodice's top edge runs from the collar on the wearer's right diagonally down to the wearer's left underarm. Above it on the wearer's left is black mesh, so it reads as a one-shoulder neckline.
   - Leg cut: high.
3. **Back design**: see 105427.
4. **Panelling**:
   - Collar: shiny black, wet-look.
   - Mesh shoulder/yoke on the wearer's left, from the collar to the diagonal bodice edge, continuous into the mesh sleeve.
   - Draped/ruched bodice: opaque black with gathers. Pleats converge on the bottom-centre of the bodice (gathered into the underbust seam) and also come from the wearer's right shoulder. This ruching is a 3D drape effect.
   - Bodice bottom: a seam just below the bust / at the lower ribs. Beneath it, on the wearer's right, a mesh wedge window (sheer black mesh, skin visible) tapers from ~4 cm at the side to nothing at centre.
   - Waistband: wide (~8–10 cm), from the lower ribs to above the hips, its lower edge dipping toward the wearer's left hip. It wraps round to the back as a diagonal band (see 105427).
   - Lower body: black.
5. **Materials**:
   - Bodice: black with a fine glitter shimmer (sparkle specks visible in the crop): glitter-coated tricot or glitter knit.
   - Collar, waistband and lower body: shiny black (wet-look/metallic-ish), with a broad specular sheen on the hip.
   - Mesh: black, sheer.
6. **Embellishment**:
   - Mesh shoulder: 6–8 parallel swag rows of small clear + AB/pink stones. They run from the collar edge over the shoulder onto the sleeve cap, roughly parallel to the diagonal bodice edge, like draped chains or fringe.
   - Bodice: random scatter of small/tiny stones with a density gradient: dense at the wearer's right shoulder, thinning toward the waist.
   - Opaque sleeve: scatter, denser at the shoulder, sparser toward the wrist.
   - Waistband: 5–6 rows of stones following the band's curve. The top row is a dense double row; the rows below are single, spaced ~1.5 cm.
   - Front total: roughly 700–1000.
7. **Trims**: shiny collar; edges self-finished.
8. **Lighting**:
   - Studio, high-key, cutout.
   - The glitter fabric gives a fine, spread sparkle across the bodice, distinct from the stones' larger pinpoint glints.
   - Shiny black has large soft specular patches.
   - The arm reads dark brown through the black mesh sleeve.
9. **Hardest aspect**: asymmetric illusion neckline, ruched/draped bodice, and a band that spirals from front to back. Capabilities needed:
   - Asymmetric panel layout (no mirroring), with mesh/opaque set per region and material chosen per sleeve.
   - Ruching/gathering effect (NEW): a normal/displacement map of gathers converging on a seam, rendered convincingly without simulation.
   - Parallel-row stone generator along a path ("swag" rows offset from an edge).
   - A wide band that wraps around the torso on a diagonal (one continuous front-to-back panel).
   - A glitter knit shader (fine spread sparkle) next to a wet-look black shader on adjacent panels.

## 11. Screenshot 2026-06-02 105427.png (Garment G back)

1. **View**: back / 3-4 back, worn-on-athlete. **Pair with 105418.**
2. **Silhouette**: as 105418. The wearer's right opaque long sleeve is on image right; the wearer's left mesh is on image left.
3. **Back design**:
   - Mock collar, shiny black, closing at centre back with a small hook/loop.
   - Large round keyhole: truly open, circular to slightly oval, ~15 cm across. Runs from just below the collar to mid-scapula; edge bound in black. The collar strip bridges the top of the keyhole.
   - The mesh shoulder continues across the wearer's left upper back, with the swag stone rows wrapping round from the front.
   - Back bodice: black glitter fabric with scatter stones whose density increases toward its lower edge (densest band at the lower ribs).
   - Lower edge of the back bodice: a diagonal seam. Below it, a sheer black mesh wedge window sits on the wearer's right of centre.
   - Then the wide waistband runs diagonally. It starts high at the wearer's left side and descends toward the wearer's right hip. Its 6–8 stone rows converge toward the wearer's right (fan-shaped rows).
   - Lower back/seat: shiny black, plain.
4. **Panelling**: collar, open keyhole, glitter back bodice, mesh left shoulder/sleeve, opaque right sleeve, mesh wedge, diagonal waistband (wrapping from the front), lower body.
5. **Materials**: as the front; wet-look shine visible on the seat (broad bright specular).
6. **Embellishment**:
   - Scatter with gradient on the bodice and right sleeve.
   - Swag rows on the left mesh shoulder.
   - Converging rows on the waistband (clear + AB/pink, small–medium).
7. **Trims**: bound keyhole, hook closure.
8. **Lighting**: studio, high-key, cutout; strong specular on the shiny lower body; glitter sparkle on the bodice.
9. **Hardest aspect**: converging (non-parallel) stone rows on a diagonal band that wraps round the body, plus the keyhole with collar bridge. Capabilities needed:
   - Row generator where rows fan or converge between two edges (interpolated paths).
   - Keyhole cut-out with a bridging collar strip and closure hardware.
   - Panel boundaries that continue across side seams, front to back.

## 12. Screenshot 2026-06-02 105521.png (Garment H)

1. **View**: 3-4 / side-front, worn-on-athlete (cutout; arm bent behind, torso turned). No pair in this batch.
2. **Silhouette**: long sleeves; crew neckline edged with stones; leg cut high.
3. **Back design**: not visible.
4. **Panelling**:
   - Fabric: appears to be one opaque black fabric (possibly very dark navy). No panel seams visible on the front other than the sleeve joins (set-in or raglan unclear).
   - The design is a stone "bib" on the front: from the neckline and shoulders down to a point at the waist. Its bottom edge is a broad V/chevron with the apex at centre front (~navel). It has a defined stone border.
5. **Materials**: matte black tricot, no significant sheen except a soft one on the sleeve. Black, possibly very dark navy (unclear).
6. **Embellishment** (very high stone count):
   - A diamond lattice (argyle) grid of stone lines fills the bib, cell size ~3 cm. Each diamond has a small 4-stone cross / X motif at its centre.
   - A diagonal band of larger/denser stones crosses the lattice, like a thicker sash within the grid. It is partly visible, running from the neckline area toward the lower right of the image.
   - Near the neckline: rosette/mandala circles (rings of stones with a centre stone, ~3 cm) and floral clusters, forming a necklace-like motif under the collar.
   - Border: a dense band (~1 cm) of small stones outlining the bib edge.
   - Shoulders and upper bib are densest, close to solid fill.
   - Sleeves: random scatter of small clear stones, getting denser toward the wrist (dense cuff region).
   - Mostly clear crystal, some with a warm/AB tint. The bib alone: roughly 2000+.
7. **Trims**: neckline edge outlined by stones; cuffs and legs self-finished.
8. **Lighting**: studio, high-key, cutout. Dense areas read almost as a silver textured fill (overall shimmer); individual pinpoints show in sparse areas.
9. **Hardest aspect**: a very large stone count in a structured grid with a motif in each cell, clipped to a bib shape. Capabilities needed:
   - Grid/lattice generator with per-cell motif placement.
   - Region-shaped clip (bib with a V bottom) and border band.
   - Rosette/ring motif stamp.
   - Performance: thousands of instanced stones at 60 fps (instancing, LOD, possibly baking dense areas to a sparkle texture at distance).

## 13. Screenshot 2026-06-02 105547.png (Garment I front)

1. **View**: front, worn-on-athlete (cutout). **Pair with 105555 (back)**: same print, teal neck binding, teal accents.
2. **Silhouette**: 3/4 raglan sleeves (raglan seam faintly visible on the image-right shoulder); crew neck bound in teal; leg cut medium-high.
3. **Back design**: see 105555.
4. **Panelling**: one printed body plus raglan sleeves. The print covers the bodice and sleeves; below the waist band the lower body is plain black. No extra panels visible on the front.
5. **Materials**:
   - Sublimation print: navy/royal blue ornamental line art on black, in an art-nouveau style. Motifs:
     - scrolls and curls;
     - fans of straight radiating lines;
     - diamond lozenges at centre front;
     - a horizontal border of wave/scroll curls at the waist (a printed "waistband" ~5 cm).
   - Base: black tricot with a soft sheen.
   - Neck binding: teal metallic/glitter.
6. **Embellishment** (the stones highlight the print):
   - Centre-front lozenges: filled with clear stones and teal/emerald/blue-zircon coloured stones.
   - Scroll ends, fan line tips and curls: stones along the lines and at the terminals.
   - Shoulders: arcs of stones over the print.
   - Waist border: 2–3 rows of clear + teal stones along the printed wave band.
   - Sleeves: a dense cluster at the forearm/cuff (clear + teal), fading up the sleeve.
   - Mixed small–medium; 3-colour palette (clear, AB, teal). Front total: roughly 800–1200.
7. **Trims**: teal metallic neckline binding; cuffs self.
8. **Lighting**: studio, high-key, cutout. Stones are bright pinpoints; teal stones read clearly as coloured. The print is matte.
9. **Hardest aspect**: stones registered to a print (aligned to its features). Capabilities needed:
   - Print layer and stone layer in a shared UV space, so stones snap to print features.
   - A "snap stones to artwork lines/points" tool.
   - Coloured stone palette (teal) mixed with clear.

## 14. Screenshot 2026-06-02 105555.png (Garment I back)

1. **View**: back, worn-on-athlete (athlete holding the collar at the nape). **Pair with 105547.**
2. **Silhouette**: as 105547.
3. **Back design**:
   - Collar/neck binding, with a closure at the nape (being held; button or loop unclear).
   - Teardrop keyhole: rounded, wider at the bottom (an inverted drop), truly open. Runs from the neckline to about mid-scapula (~13 cm tall, ~9 cm wide).
   - Keyhole outline: stones form a spiky "sun-ray" halo: a row along the edge plus short rays of 2–4 stones pointing outward all round (a starburst border).
   - Asymmetric teal panel on the wearer's right upper back (image right).
     - It runs from the shoulder/collar region down to the bottom of the keyhole.
     - Its lower edge runs diagonally to a point at centre back, below the keyhole.
     - The rest of the upper back (wearer's left) is black, possibly a slightly sheer mesh-textured black (unclear).
   - Crossed waist bands: at about the waist/lower ribs, two bands (~4 cm) cross at centre back in an X, like a wrap belt overlapping.
     - One is teal and rises from the wearer's left side toward centre-right.
     - The other is black, stone-covered, and descends from the wearer's right side.
   - Lower back/seat: plain black.
4. **Panelling**: black back body, teal asymmetric upper panel, teal and black crossing waist bands, printed raglan sleeves, black lower back.
5. **Materials**:
   - Teal panel and band: shiny teal with a fine speckled sparkle. Probably shiny metallic; could be mystique/metallic foil or glitter-coated tricot.
   - Black body: matte to soft-sheen tricot; the upper back looks slightly mesh-like (unclear).
   - Sleeves: the same navy line-art print.
6. **Embellishment**:
   - Keyhole sunburst halo: ~100 small clear stones.
   - Waist bands: a row of stones with triangular "teeth" (a sawtooth / zig-zag border of stones).
   - Teal panel's diagonal edge: outlined with a row of stones.
   - Sleeves: print highlighted with stones, as on the front.
7. **Trims**: keyhole bound in black; teal neck binding.
8. **Lighting**: studio, high-key, cutout. The teal panel shows a broad soft sheen with fine sparkle (metallic look). Black shows a mild sheen at the seat.
9. **Hardest aspect**: an asymmetric back panel, wrap-crossed bands, and decorative stone borders (rays, sawtooth). Capabilities needed:
   - Border-pattern generator along a path: outward rays and sawtooth/teeth repeats (a stone "brush" with a repeating unit).
   - Overlapping band panels (draw order / overlap of crossing bands).
   - An asymmetric panel on one side of the back.
   - Teal metallic/mystique material.

## 15. Screenshot 2026-06-02 105611.png (Garment J)

1. **View**: front, worn-on-athlete (cutout, hands on hips). No pair in this batch.
2. **Silhouette**: 3/4 raglan sleeves in teal mesh; crew neck with a wide (~3 cm) black stone-covered band; leg cut high.
3. **Back design**: not visible.
4. **Panelling** (symmetric):
   - Neckband: black, with stones.
   - Black framing bands (~2–3 cm, stone-covered) run from the neckband down the racer/raglan line to the underarm, then down each side to the waistband. Together they form a hexagonal frame around the central bodice.
   - Central bodice panel: teal, roughly hexagonal (neck → racer → side → waist).
   - Side panels below the underarm: black, possibly black mesh (unclear).
   - Raglan sleeves: sheer teal tinted mesh, with teal cuff bands ~2.5 cm.
   - Waistband: black, ~5 cm, dense stones.
   - Lower body: black.
5. **Materials**:
   - Teal bodice: teal tricot with a silver/white glitter-printed filigree: symmetric baroque scrolls, hearts and curls, with a small diamond at centre. The lines are silver glitter (glitter print or foil transfer; NEW: "glitter print / glitter heat-transfer"), with small stones interspersed along them.
   - Black bands: black (possibly shiny) with dense stones.
   - Lower body: moderately shiny black (wet-look black or shiny tricot).
   - Sleeves: teal mesh.
6. **Embellishment**:
   - Neckband, frame bands and waistband: dense fill of mixed small/medium clear + AB stones, with scatter spilling off the band edges (gradient).
   - Filigree: small stones dotted along the glitter lines.
   - Sleeves: sparse scatter of small stones. Cuffs: a dense cluster fading up the forearm.
   - Front total: roughly 1200–1600.
7. **Trims**: teal cuff bands; neckband; leg openings self.
8. **Lighting**:
   - Studio, high-key, cutout.
   - The glitter print reads as bright silver lines with fine sparkle; stones read as pinpoints.
   - Arms show clearly through the teal-tinted mesh sleeves.
9. **Hardest aspect**: telling glitter-print filigree apart from stones, and the framed hexagonal bodice. Capabilities needed:
   - Glitter print material channel: printed glitter, i.e. sparkle masked by artwork, flat, with no stone geometry.
   - Framing band tool following a neckline → raglan → side seam path.
   - Stones dotted along artwork lines (snap to print).
   - Band edge spill-over scatter.

## 16. Screenshot 2026-06-02 105739.png (Garment K)

1. **View**: front, slight 3/4, worn-on-athlete (cutout). No pair in this batch.
2. **Silhouette**:
   - Sleeves: 3/4; raglan or set-in is unclear (a foil strip runs along the wearer's right raglan line).
   - Neckline: crew with a stone band.
   - Leg cut: medium-high.
3. **Back design**: not visible.
4. **Panelling** (asymmetric: the straps differ left/right, and a cut-out is visible on one side only):
   - Neckband ~2 cm, covered in AB stones.
   - Purple foil straps (~2.5 cm):
     - (a) from the neckband on the wearer's right (image left), along the raglan line and down the side to the waistband;
     - (b) from the neckband on the wearer's left (image right), diagonally across the upper chest toward the wearer's left side, then curving to form the upper edge of a side cut-out.
   - Side cut-out at the wearer's left waist/lower ribs (image right): a crescent/lens opening bounded by the foil strap above and the waistband below. It reads white/pale: either truly open (showing the background or the inside of the back) or filled with very pale mesh (**unclear**).
   - Bodice and sleeves: printed fabric (see below).
   - Waistband: purple foil, ~4 cm, at the waist.
   - Lower body: plain lilac.
5. **Materials**:
   - Bodice and sleeves: a sublimation print imitating lace. White floral motifs (lilies/hibiscus, leaves, ribbon-like stems) sit over a lilac/white honeycomb/hex net pattern on a lilac ground. It is a printed "lace over mesh" illusion: flat, no real mesh.
   - Straps and waistband: solid metallic foil in purple/violet, very shiny, with strong mirror-like specular streaks.
   - Lower body: lilac tricot with a soft sheen.
6. **Embellishment**:
   - Neckband: dense AB stones.
   - Waistband: scatter of AB stones.
   - Lower body: a density gradient, with dense AB scatter just below the waistband fading out by mid-hip / upper leg line.
   - Sleeves: AB stones gathered at the cuff, fading upward.
   - Bodice: sparse scatter (few stones).
   - Stones small–medium, AB dominant (rainbow fire visible). Front total: roughly 500–700.
7. **Trims**: the foil straps act as trims; neckband; cuffs self.
8. **Lighting**:
   - Studio, high-key, cutout.
   - Foil: sharp bright highlights, shifting from lilac to white to deep violet with curvature (strong specular).
   - AB stones show rainbow/pink-green flecks.
9. **Hardest aspect**: printed lace illusion, mirror-like foil straps, and an asymmetric side cut-out. Capabilities needed:
   - Print library: a lace/hex-net texture usable as a sublimation print.
   - Solid metallic foil shader (high specular, low roughness, tinted reflections) usable on narrow strips.
   - Asymmetric strap/band paths from neckline to waistband.
   - Side cut-out bounded by straps, with an open-vs-mesh flag.
   - Stone gradient fading downward from a band edge.

## 17. Screenshot 2026-06-05 081228.png (Garment L front)

1. **View**: front, worn-on-athlete; a casual phone photo at home (white panelled door behind; hair over the wearer's left shoulder). **Pair with 081245 (back)**: same blue/navy, same session, 17 s apart.
2. **Silhouette**: sleeveless (tank) with wide shoulder straps (~6–7 cm at the shoulder); high, round crew/scoop neckline close to the neck; leg cut high. No skirt.
3. **Back design**: see 081245.
4. **Panelling**:
   - Navy base with a layered zig-zag / lightning / feather-spike design.
   - The shapes are elongated and pointed, like stacked leaves or flame spikes. Each is filled with a light-to-mid blue gradient (sky blue → periwinkle → royal blue), and they overlap in layers.
   - All shapes point toward the wearer's right shoulder (image left, upward) and the neckline. They run diagonally from the wearer's left hip (image lower right) up to the wearer's right shoulder.
   - Coverage: most of the chest, spilling down the wearer's right side to the hip/leg line.
   - Asymmetric diagonal.
   - Most likely a sublimation print: the gradients inside the shapes are smooth and no seams show between shapes. Layered fabric appliqué cannot be ruled out (unclear).
5. **Materials**: shiny tricot (moderate sheen, specular streaks across the lower abdomen and hip) with sublimation print. Colours: navy, royal, periwinkle, sky blue.
6. **Embellishment**:
   - Outline: every spike shape is outlined with a continuous single row of small stones following the sharp V tips. In this light they read pink-lilac; possibly light rose or AB.
   - Sparse scatter of small stones in the navy areas (lower right, near the wearer's left side).
   - Some stones flare red, magenta, white or cyan (colour fire).
   - Front total: roughly 600–900.
7. **Trims**: neckline and armholes self-bound in navy; leg opening self.
8. **Lighting**:
   - Indoor and domestic: dim, likely a phone flash or a single lamp (warm/neutral). Low-res and soft.
   - Sparkle reads as strong coloured point flares (red, pink, cyan, white) with a small bloom. This is the classic flash-on-AB response and very different from the studio images.
   - Fabric shows a broad sheen and stretch across the abdomen; strap edges roll slightly at the armholes.
9. **Hardest aspect**: asymmetric layered spike artwork with stone outlines, and flash-lit colour fire. Capabilities needed:
   - Asymmetric print design tool (no mirror) with gradient-filled shapes.
   - Automatic stone outlines along every edge of the print shapes, including sharp corners (spacing must handle acute tips).
   - Sparkle model with strong dispersion/colour fire and bloom under a camera-flash lighting preset.
   - Lighting presets: "phone flash / domestic", "studio softbox", "arena".

## 18. Screenshot 2026-06-05 081245.png (Garment L back)

1. **View**: back, worn-on-athlete, casual phone photo (white door). **Pair with 081228.**
2. **Silhouette**: sleeveless tank with cross-back straps; leg cut high, medium seat coverage at the back.
3. **Back design**:
   - Straps: two wide straps (~6–7 cm), one from each shoulder.
     - They cross once at the upper back, just below the nape (about C7/T2: high, between the upper scapulae).
     - They then sweep outward and down to anchor at the lower armhole / side seam, at about the bra line.
     - They overlap at the cross; the wearer's right strap appears to be on top (unclear).
     - They appear to be cut as continuations of the front shoulder straps rather than separately attached (unclear).
   - Open back: below the cross, a large truly-open area (skin), ~25 cm wide × ~20 cm tall. It is bounded by the straps at the sides and by the back body's straight, horizontal top edge at about the lower ribs / just above the waist (~T11–T12).
4. **Panelling**: straps (blue gradient) and back body (navy). The straps shade from sky blue at the shoulders to royal blue at the anchors. This could be lighting, but it is likely a genuine print gradient, matching the front palette.
5. **Materials**: shiny tricot; navy back body with a soft sheen; straps sublimated in a blue gradient.
6. **Embellishment**: none visible on the back.
7. **Trims**: strap edges self-bound or turned (a stitched edge line is visible); the top edge of the back body is bound.
8. **Lighting**:
   - Domestic, dim, soft (probably the same lamp or flash), slightly warm.
   - Horizontal compression wrinkles across the lower back (strain where the body bends) and a soft sheen.
   - The straps press slightly into the skin at the cross.
9. **Hardest aspect**: crossing wide straps with an open back. Capabilities needed:
   - Strap generator: wide straps, adjustable cross-point height, anchor points on the armhole/side seam, overlap order.
   - Open-back cut with a straight bound top edge.
   - Gradient along a strap's length.
   - Fabric wrinkle/strain normal maps at the waist when posed.

## 19. Screenshot 2026-06-05 113509.png (Garment M)

1. **View**: front, worn-on-athlete (studio, hands on hips, light grey background, not cut out). Same brand/session as 113615 (stone "S" logo, 66 s apart) but a **different garment**.
2. **Silhouette**: 3/4 raglan sleeves; wide, shallow V-neck (~5 cm deep) bound in contrast lilac; leg cut high.
3. **Back design**: not visible.
4. **Panelling** (symmetric):
   - Purple/violet body.
   - Raglan sleeves in violet mesh, semi-sheer; skin lightens/reddens the purple.
   - Lilac neckline binding; lilac cuff binding (~1.5 cm).
   - Crossed applied straps on the front: two lilac strips (~1.5 cm).
     - One starts at the wearer's right side seam at underbust height, the other at the wearer's left side seam at the same height.
     - Both run diagonally down and cross at centre front at about the waist (above the navel).
     - They continue to the opposite side seams lower down (waist / high hip), forming an X / wrap-belt shape.
     - They are applied on top of the body fabric, not open beneath.
5. **Materials**:
   - Body: violet shiny tricot (moderate sheen, highlights on the abdomen).
   - Straps and binding: shiny lilac/periwinkle, possibly metallic/mystique with a fine shimmer (unclear).
   - Sleeves: violet mesh.
6. **Embellishment**:
   - Chest: mirrored vertical wavy lines of stones. S-curves converge and diverge, creating pointed-arch / ogee / flame-like shapes (a "sound-wave" pattern).
     - About 6 lines per side, in small–medium clear stones (some with an AB/gold tint). Stone size is graded larger toward the centre.
     - The field spans from below the V-neck to the strap X.
   - Straps: a single row of small stones along each strap.
   - Sleeves: concentric arcs of stones on the forearm, fading upward.
   - Logo: a small "S"-shaped stone motif at the wearer's left hip.
   - Front total: roughly 300–500.
7. **Trims**: contrast lilac V-neck binding, contrast cuff binding, contrast applied cross straps.
8. **Lighting**:
   - Studio softbox on grey seamless.
   - Stones read as small white glints, some with a golden/AB tint.
   - The shiny tricot has a broad soft highlight; the fabric bridges smoothly across the chest.
9. **Hardest aspect**: a mirrored wavy-line (ogee) stone pattern, and applied crossing straps on the front. Capabilities needed:
   - Parametric wave-line pattern generator (amplitude, frequency, phase shift per line, mirrored) that outputs stone rows.
   - Applied decorative strap tool: on-fabric straps that cross, anchored at the side seams.
   - Stone logo/monogram stamp.

## 20. Screenshot 2026-06-05 113615.png (Garment N, closeup)

1. **View**: closeup, 3-4 front, worn-on-athlete (studio grey, hair over the wearer's left shoulder). A different garment from 113509, same "S" logo brand.
2. **Silhouette**: long sleeves in black-to-grey ombre mesh; crew / slightly high neckline bound in gold; leg cut not fully visible (likely high).
3. **Back design**: not visible.
4. **Panelling** (complex, asymmetric front):
   - Neckline: gold metallic binding (~1 cm) with AB stones spaced along it.
   - Shoulders: gold strap lines run along the raglan/racer, from the neckline to the underarm on both sides. Each shoulder has two parallel gold lines (~1 cm each) with a ~2–3 cm black strip between them (racer plus raglan double piping), so the upper shoulder reads as black bands framed in gold.
   - White upper bodice panel:
     - Runs from the neckline/racer lines down to a diagonal underbust boundary.
     - On the wearer's right (image left) it ends at about the underbust.
     - On the wearer's left (image right) it extends lower, to the waist/side, where its lower right fades into dark grey through a sublimated white-to-black ombre.
     - A thin princess/side seam is visible on it (image right).
   - Vertical figure-8 (infinity) keyhole, placed slightly to the wearer's right of centre front (image left of centre):
     - Upper lobe: from the neckline down to the sternum/underbust.
     - Lower lobe: from the underbust to above the navel. The lobes pinch where they cross, at underbust level.
     - Outline: a gold metallic band (~1.5 cm) covered in AB stones.
     - Inside both lobes: black-to-grey ombre fabric with gold glitter speckle. The lower part of each lobe turns lighter grey and slightly translucent; whether it is opaque or a glitter mesh showing skin is unclear.
   - Smoky mesh panel: a large, roughly triangular sheer grey/smoke mesh insert between the white bodice's lower edge and the black lower panel. It runs diagonally from the figure-8 crossing toward the wearer's left side seam; skin shows through as warm grey.
   - Black lower panel: black glitter tricot (fine sparkle visible) over the abdomen. Its upper edge runs diagonally from the lower lobe down toward the wearer's left hip.
   - Sleeves: black at the shoulder, fading to grey/translucent (ombre mesh).
5. **Materials**:
   - White matte tricot, with an ombre to black at its lower-left extremity.
   - Gold solid metallic foil trims.
   - Black glitter knit / glitter-coated tricot (lower panel).
   - Smoke-grey mesh.
   - Ombre black-grey glitter fabric inside the lobes.
   - Ombre mesh sleeves.
6. **Embellishment**:
   - Figure-8 outline: a dense double/triple row of medium AB stones on the gold band (~250 stones).
   - White bodice: curved rows radiating out from the figure-8 toward the shoulders and side.
     - Size gradient along each row: largest (~ss20–30) nearest the figure-8, smallest at the far ends.
     - Mixed colours: AB, clear, gold/dorado/topaz, and some dark (jet/hematite) stones; rows alternate colour.
   - Black lower panel: similar size-graded radiating rows (a sunburst) from the lower lobe, in AB + gold + clear.
   - Gold binding: AB stones every ~3 cm.
   - Sleeves: arcs of AB, gold and clear stones.
   - Logo: a stone "S" motif (two loops, ~4 cm) on the lower front.
   - Visible front total: roughly 800–1200.
7. **Trims**: gold metallic binding on the neck, the raglan/racer double lines, and the figure-8 outline.
8. **Lighting**:
   - Soft studio key from front-left, grey backdrop, closeup.
   - AB stones show strong rainbow colour fire (violet, green, gold, magenta facets) and visible faceting.
   - Gold foil shows a warm specular with varying sheen; black glitter shows a fine twinkle.
   - Skin shows through the mesh with a grey tint; the white panel shows soft shading on the bust.
9. **Hardest aspect**: asymmetric diagonal panel layout, the outlined figure-8 keyhole, size-graded multi-colour radiating stone rows, and multiple ombre materials. Capabilities needed:
   - Arbitrary closed-shape panel/outline tool (figure-8) with a stone-covered band along the outline.
   - Asymmetric diagonal panel boundaries across the torso.
   - Radiating row generator with per-row colour alternation and a size gradient along each row.
   - Ombre on mesh (opacity + colour gradient) and ombre on glitter fabric.
   - AB stone shader with visible facets and dispersion at closeup distance.
   - Double parallel piping/strap lines along the raglan.

---

## Batch summary

### Recurring patterns
- **3/4 raglan sleeves in tinted stretch mesh** appear on 13 of the 14 garments (only L is sleeveless). They carry sparse scatter stones and a **dense cuff cluster fading up the forearm**. Mesh tints seen: red, mulberry patterned, periwinkle, royal, black, teal, violet, black→grey ombre.
- **Bands carrying dense stones** (neckband, racer/raglan bands, waistband), with stones **spilling past the band edges** in a decaying scatter: B (collar), E, I, J, K.
- **Stone density gradients** are everywhere:
  - top-sparse → bottom-dense (C);
  - shoulder-dense → waist-sparse (G);
  - dense at a band, fading downward (K);
  - dense at the cuff, fading up (most sleeves).
- **Stones registered to printed artwork**: outlining print shapes (A flames, L spikes) or dotted along print lines (I line-art, J glitter filigree).
- **Radiating / fanned stone rows** from a panel edge or a point: B, F (rays), G (converging rows), N (with size gradient).
- **Back openings**:
  - U-open cage (B);
  - strap cage over illusion mesh with a keyhole (C);
  - round keyhole (G);
  - teardrop keyhole with a ray halo (I);
  - open cross-back (L).
  Most have a **mock collar with hook-and-eye/loop closure** bridging the top of the opening.
- **Contrast metallic trims/binding**: gold (B, N), purple foil (K), teal (I), lilac (M).
- **A waist band at the natural waist** separating a decorated bodice from a plain lower body: E, G, I, J, K, plus M's crossed straps.
- **A plain lower body** below the waist, with no stones or only a short fade, is almost universal.

### Rare / unique features in this batch
- **Ruched/gathered draped bodice** (G): 3D fabric gathering.
- **Asymmetric illusion one-shoulder**, with one mesh sleeve and one opaque sleeve (G).
- **Strap cages**: straps over open skin that continue over fabric (B); curved strap cage over illusion mesh (C).
- **Figure-8 outlined keyhole** with glitter-ombre infill (N).
- **Grid/tile-based stone layouts**: seigaiha fan-scale tiling (E) and argyle lattice with cell motifs (H).
- **Sunburst black-mesh wedges** radiating from centre front (F).
- **Printed lace-over-honeycomb illusion** (K) and **flocked/patterned mesh** sleeves (C).
- **Glitter-print filigree** (J): printed glitter, distinct from stones.
- **Jet/dark and teal coloured stones** mixed into clear/AB (D, F, I, N).
- **Stone sawtooth "teeth" and ray-halo borders** (I back).
- **Crossed wrap bands** at the back waist (I) and applied crossed straps on the front (M).
- The only **sleeveless cross-back** design (L). It is also the only **casual domestic flash photo** pair, and shows strong coloured crystal flares.

### Top 10 capabilities this batch demands
1. **Stone placement engine with multiple generators.** It needs:
   - region fill with a controllable **density map/gradient**;
   - single and multi-row placement **along a path**;
   - **edge spill-over scatter**;
   - **radiating/converging row fans**, with per-row length and colour and a **size gradient along a row**.
   It must handle thousands of stones per garment at 60 fps (GPU instancing, LOD, baked sparkle at distance).
2. **Stone motif and tiling system.** Define a small stone cluster (fan, rosette, X, "S" logo), stamp it, or **tile it in offset/lattice grids** clipped to a panel shape (E seigaiha, H argyle).
3. **Vector artwork → stones.** Import or draw line-art/filigree and convert strokes to stone rows and fills. **Snap stones to print features** (print shape outlines, line terminals); stones and print share UV space.
4. **Free-form panel boundary tool** on the 3D body:
   - curves, sharp Vs, diagonals, figure-8 and other closed shapes, wedges;
   - bands that **wrap front-to-back** across side seams;
   - **full asymmetry**, plus mirroring (exact and "mirror with variation").
5. **Openings and mesh infill.**
   - Cut-outs: U-back, round/teardrop keyholes, side windows, radial wedges.
   - A per-region **open vs mesh-filled** flag.
   - Mesh materials with tint and **skin show-through**: skin-tone illusion, black, coloured, **ombre mesh**, **patterned/flocked mesh**.
6. **Strap/band generator.**
   - Straps from collar to waistband: parallel, splayed, or bowed/curved.
   - **Crossing straps** with overlap order and adjustable cross height (L).
   - **Applied straps over fabric** (B lower back, M front X).
   - Overlapping wrap bands (I) and double parallel piping (N).
7. **Sublimation print layer.** Gradients/ombre on panels and straps, layered gradient-filled shapes, line-art, lace/honeycomb illusion prints, all continuous across sleeve/body seams.
8. **Material library with distinct shaders.**
   - Matte/satin tricot and wet-look shiny black.
   - **Solid metallic foil** in gold, purple and teal, with sharp anisotropic streaks on narrow strips.
   - **Glitter knit/glitter-coated** fabric (fine twinkle) and **glitter print** (masked sparkle).
   - Mesh variants.
9. **Crystal shader set and lighting presets.**
   - Stones: clear; **AB with angle-dependent rainbow fire and visible facets at closeup**; coloured (teal, topaz/gold, rose); **jet/dark stones** that stay readable as glossy dots.
   - **Lighting presets**: studio softbox high-key, grey studio, and domestic/phone-flash with strong coloured flares and bloom.
10. **Trim and closure details, plus fabric surface effects.**
    - Contrast/metallic binding on neck, raglan, cuffs and keyhole edges.
    - Mock collars with **hook-and-eye/loop hardware** bridging back openings.
    - **Surface deformation maps** without cloth simulation: ruching/gathers (G) and pose-driven compression wrinkles (L).

[^moodboard]: Owner's moodboard, images 79-98
