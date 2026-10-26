---
type: Playbook
title: "Tutorial: a black mesh-and-crystal leotard, step by step"
description: "A first walkthrough of the designer app for a new user: rebuild a black 3/4-sleeve leotard with a mesh yoke, a keyhole back, a mesh sash band outlined in crystals, scattered stones and a hip logo, learning the Shape pane, the piece pane (materials, colour, sheerness), the Draw line tool, the Stones and Logo tools, edge finishes, hiding lines, posing and saving."
tags: [app, tutorial, walkthrough, mesh, keyhole, stones, recreation-test]
status: draft
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-26T20:00:00Z }
sources:
  - id: photos
    resource: "two product photos supplied by the owner on 2026-10-26 (front and back of a black 3/4-sleeve leotard with mesh yoke, keyhole back, diagonal mesh sash and crystal rows); not stored in the repository"
    title: Reference photos
    author: human:mattj
  - id: walkthrough
    resource: "Claude Code session, 2026-10-26: every step below was performed in the running app (branch build/designer-app) and the result saved as app/designs/Tutorial black mesh sash.json"
    title: Walkthrough in the app
    author: claude-code/claude-fable-5-1
  - id: ui
    resource: "app/src/ui/tools.js, ui/Inspector.jsx, ui/inspect-garment.jsx, ui/inspect-stones.jsx, ui/inspect-decals.jsx, ui/Shell.jsx"
    title: The interface this tutorial describes
    author: claude-code/claude-fable-5-1
---

# What you will build

A black long-line leotard with three-quarter mesh sleeves, a sheer mesh yoke across the shoulders
and upper chest, a keyhole back, a sash-like band of mesh that runs round the waist, crystal rows
along every mesh edge, a light scatter of crystals over the bodice and sleeves, dense crystal cuffs
and a small glitter logo on the hip. The finished version is in the app already: open the
**Start from** pane and pick **Tutorial black mesh sash** under *A finished design* whenever you
want to compare your work with the target.[^walkthrough]

The stones will not land in the same places as the photo and they do not need to. What should
match by the end is the shape of every piece of fabric, the materials, and where everything sits.

By the end you will have used every basic tool: the Shape pane, the piece pane (material, colour,
sheerness), the Draw line tool with attached ends and closed loops, the Stones tool for rows and
fills, the Logo tool, edge finishes, hiding the editing lines, posing the model and saving.

**Left and right.** Throughout, *left* and *right* mean the model's own left and right, as if you
were wearing the leotard. When the model faces you, her left is on your right.

# 1. Find your way around

Start the app (`npm --prefix app run dev`, then open the address it prints). It opens on a plain
blue tank leotard on a realistic model.

- **Top bar**: the design's name (click it to type a new one), **New**, **Save**, undo and redo,
  **Pattern** (shows the flat pattern pieces) and the settings cog.
- **Tool rail** on the left: **Move**, **Draw line**, **Strap**, **Stones**, **One stone**,
  **Eraser**, **Logo / text**, and **Hide lines**. Each has a key: V, P, S, G, 1, D, L and H.
- **The model** in the middle. With the Move tool: drag with the left mouse button to turn her,
  roll the wheel to zoom, drag with the right button to slide the view. In every other tool the
  left button draws or places, so turn with the **right** button instead.
- **The panel** on the right. With nothing selected it shows the whole design: *Start from*,
  *Shape*, *Model* and *Scene*. Click a piece of fabric or a line and the panel shows that part
  instead; press **Esc** or click empty background to go back to the whole design.

Undo is **Ctrl+Z**, redo **Ctrl+Y**. Every step below can be undone, so experiment freely.

# 2. The basic shape

Click **New** in the top bar. You get the plain tank: crew neck, closed back, high leg.

In the **Shape** pane, each row is one element of the leotard and each tile one option. Pick:

- **Back**: **Keyhole**. A teardrop opening appears below the neck at the back.
- **Sleeves**: **3/4**. Sleeves grow to just below the elbow.

Leave **Neckline** on *Crew* and **Leg** on *High*. Each pick changes only that element; if a
change would remove something you added later (stones on a line that goes, a piece in an opening),
the pane says so and asks before doing it.

# 3. Materials and colours

Every piece of fabric has its own material and colour. Click a piece with the **Move** tool (a
click, not a drag) and its pane opens.

1. Click the **front** of the leotard. In the pane: the **Material** row shows *Matte lycra*
   already chosen; in **Colour**, click the first swatch, black. Under **Gradient**, click
   **None** (the plain tank starts with a fade from royal to navy, which you do not want).
2. Turn the model round (left-drag) and click the **back**. Black again.
3. Click a **sleeve**. Both sleeves change together, because the sleeves are one mirrored piece.
   Scroll the material row sideways (or just look further along it) and click **Stretch mesh**.
   Colour black. **Gradient: None**. A **Sheerness** slider appears for mesh: drag it to about
   **35 %** so the skin shows through as in the photo.

Click **Done** (top of the pane) or press Esc when you are finished with a piece.

# 4. The front yoke: your first drawn line

The mesh across the upper chest has an asymmetric lower edge: high at the right shoulder, sweeping
down to the left armpit. You draw that edge; the app cuts the front into two pieces along it.

1. Face the model from the front and zoom in on the torso (wheel).
2. Choose **Draw line** (key P). Its options appear at the top of the panel. Set **Mirror** to
   **One side**. This matters: a line drawn off-centre is otherwise copied to the other side as a
   mirror image, which is right for symmetric designs and wrong for this one.
3. Click on the **sleeve seam** at the right shoulder, a little below the shoulder point. When
   you click within a few pixels of an existing line, the new point snaps onto it and stays
   attached, so the seam will meet the sleeve exactly. Attached points are drawn as corners.
4. Click twice across the upper chest to shape the curve (these are smooth points; hold Shift
   for a sharp corner instead).
5. Click on the **sleeve seam** on the left side, a little above the armpit. Ending on another
   line finishes the line automatically.

If the last click does not land on a line, the line stays open: press **Enter** to finish it as
it is, **Backspace** to remove the last point, or **Esc** to throw it away and start again.

The front now has a new piece above the line. Switch to **Move** (V), click that upper piece and
give it **Stretch mesh**, black, sheerness about 35 %. The lower piece keeps its matte black.

**Tip.** If the new line went to both sides, you forgot *Mirror: One side*. Undo (Ctrl+Z), set
it, and draw again.

# 5. The back yoke and keyhole

Turn to the back. The upper back is mesh too, with the keyhole in it, and the mesh ends on a
seam just below the keyhole.

1. Still in **Draw line**, click on the sleeve seam at the **right armpit**, then a point on the
   centre back just below the keyhole, then on the sleeve seam at the **left armpit**. The seam
   dips gently under the keyhole.
2. Switch to **Move**, click the new upper-back piece, **Stretch mesh**, black, sheerness 35 %.

**Why the armpits and not the side seams?** In the standing pose the arms hang in front of the
side seams, so a click at waist height on the side of the body lands on the arm, not on the seam.
The sleeve seams are always reachable. Both yoke seams in this design end on them.

# 6. The sash band: two loops round the body

The band of mesh round the waist is wide under the left bust, narrows towards the right hip, and
carries on round the back. Its two edges are two closed loops drawn round the whole body.

For the **upper edge**:

1. From the front, in **Draw line**, click under the left bust (just inside the side of the
   body, not on the silhouette), then on the centre front a little lower, then towards the right
   hip.
2. Turn the model round with the **right** mouse button (the left button places points while
   you are drawing). On the back, click near the right side at hip height, the centre back a
   little higher, and near the left side higher still.
3. Turn back to the front and click on the **first point**. Clicking the first point closes the
   loop and finishes it.

Draw the **lower edge** the same way, about 3 cm lower at the left side and 1 cm lower at the
right hip, so the band tapers.

Three things to watch:

- Keep every click clear of existing lines. A click on a line ends the line you are drawing (that
  is how you attach ends on purpose); here you want a free loop.
- Keep the band below the armpits. A point too close to the armpit lets the loop wander onto the
  sleeve.
- The two loops must not cross each other.

The arrangement now has a band piece on the front and one on the back. With **Move**, click each
and set **Stretch mesh**, black, sheerness 35 %. Press **H** at any time to hide the editing lines
and see the fabric alone; press it again to bring them back.

# 7. Crystals

Pick **Stones** (key G). Its options sit at the top of the panel: stone colour (*Crystal AB* is
the clear aurora-borealis stone of the photo), size, cut, rows, offset from the line, spacing,
and the fill pattern. A click on a **line** lays rows along it; a click on a **piece** fills it.

**Rows along every mesh edge.** Leave size *ss12* and *Rows 1*. Click the front yoke seam, the
back yoke seam, the band's upper edge and the band's lower edge, one click each. A row on a loop
runs all the way round, so one click per loop is enough.

**Scatter over the bodice.** Set **Size** to *ss8* and click the black bodice (between the yoke
and the band). You get a full pavé, far too dense. The new generator's settings appear below the
tool options: in the **gap** field type **6** and press Tab. The stones spread out to a light
scatter. (Spacing is in stone widths; the tool's own slider stops at 3, the field takes any
number.)

**Scatter on the sleeves.** Size *ss6*, click a sleeve, then set its **gap** to **4**.

**Dense cuffs.** Set **Rows** to 3, **Size** *ss10*, and drag **From line** to about **−20 mm**.
Click the cuff edge of a sleeve. Three rows appear round both cuffs, a short way up from the
edge.

Why −20 mm: the slider moves the rows to one side of the line or the other, and on a cuff the
negative side is up the sleeve. Stones also keep clear of a finished edge (about 13 mm next to a
turned elastic), so a row placed closer than that is dropped and the generator shows **(0)**
stones. If you ever see a (0), move *From line* further from the edge or to the other side.

**Changing stones later.** Click any row or fill with the Move tool (or pick it under *Parts of
this design* at the bottom of the panel) to change its stone, size, rows, gap or seed, to
**Release** it into single stones you can erase one by one, or to **Delete** it. **One stone**
places single stones; **Eraser** clears stones under a brush while the generators stay live.

# 8. The logo

Pick **Logo / text** (key L). In its options type the text (a single letter in *Segoe Script*
stands in for the maker's mark), set **Look** to **Glitter** and **Width** to about **45 mm**,
then click on the left hip. The logo is placed and the tool goes back to Move. Click the logo
later to change its text, font, look, colour, width or angle.

# 9. Edges and seams

The photo's necklines, keyhole and cuffs are finished with a glossy black binding, and the mesh
yoke seams carry a narrow glossy tape.

1. With **Move**, click the **neckline**. The line's pane opens with a **Finish** section. Set
   **Finish** to **Contrast binding**, **Fabric** to *Shiny tricot* and the **Colour** well to
   black.
2. Do the same for the **keyhole** edge (from the back) and a **cuff** (both cuffs change).
3. Click the **front yoke seam** and set its Finish to **Flat tape**, shiny, black. Same for the
   back yoke seam.

Opening edges offer *Turned elastic* (the default), *Contrast binding* or *Raw*; seams offer
*Plain*, *Piping* or *Flat tape*.

# 10. Look at it, pose it, save it

- Press **H** to hide the lines. Turn the model, zoom in on the stones.
- In the **Model** pane pick another pose, for example **Standing, presenting**; the leotard
  follows the body. Pick **Mannequin stance** to come back. Draw and edit in the mannequin stance;
  it is the pose the lines are easiest to reach in.
- In the **Scene** pane try another studio and the **Brightness** slider. Under *More settings*,
  **Crystal glare** adds the star sparkle of a catalogue photo.
- Click the name in the top bar, type a name, and click **Save** (or Ctrl+S). The design appears
  in the *Start from* pane under *A finished design*, with a picture, and in `app/designs/`.
- **Pattern** in the top bar shows the flattened pieces beside the model, with a button for the
  printable PDF.

# What this design taught you

| You did | The tool |
|---|---|
| Picked the back and sleeves | Shape pane: one element at a time, everything else kept |
| Coloured pieces, made them mesh, set sheerness | Click a piece, piece pane |
| Drew seams that end on other seams | Draw line, snapping ends, *Mirror: One side* |
| Drew loops round the body | Draw line, turning while drawing, closing on the first point |
| Rows, scatters, dense cuffs | Stones tool on a line or a piece; the generator's settings afterwards |
| A logo | Logo / text tool |
| Binding and tape | Click a line, Finish section |
| Preview, pose, save | Hide lines (H), Model pane, Save |

# Where the app falls short of the photo

- The small clear hook at the top of the keyhole is not in the interface yet (it exists as a
  script command only).
- The photo's cuff crystals fade gradually up the sleeve. A fade that follows a line is a script
  command (`stones.add` with `kind: 'scatter'`); the interface gives you an even scatter plus
  rows at the cuff, which reads close enough.
- Side seams are hard to click while the arms hang beside the body; end lines on the sleeve
  seams or draw closed loops instead.

[^photos]: Reference photos
[^walkthrough]: Walkthrough in the app
[^ui]: The interface this tutorial describes
