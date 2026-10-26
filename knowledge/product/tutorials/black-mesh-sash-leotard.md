---
type: Playbook
title: "Tutorial: a black mesh-and-crystal leotard, step by step"
description: "A first walkthrough of the designer app for a new user: rebuild a black 3/4-sleeve leotard with a peaked mesh yoke, a diagonal crystal seam from the yoke's apex to the waist, a mesh wedge tapering across the front and a reversed wedge across the back, a keyhole under a straight bound bandeau seam, scattered stones and a hip logo; learning the Shape pane, the piece pane (materials, colour, sheerness), the Draw line tool with ends attached to seams, the Stones and Logo tools, edge finishes, hiding lines, posing and saving."
tags: [app, tutorial, walkthrough, mesh, keyhole, stones, recreation-test]
status: draft
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-26T22:00:00Z }
sources:
  - id: photos
    resource: "two product photos supplied by the owner on 2026-10-26 (front and back of a black 3/4-sleeve leotard with a peaked mesh yoke, a diagonal crystal seam, a tapering mesh wedge front and back, a keyhole back); not stored in the repository"
    title: Reference photos
    author: human:mattj
  - id: walkthrough
    resource: "Claude Code session, 2026-10-26: every step below was performed in the running app (branch build/designer-app), the lines placed by the pen's own snapping at the positions described; the result is app/designs/Tutorial black mesh sash.json"
    title: Walkthrough in the app
    author: claude-code/claude-fable-5-1
  - id: ui
    resource: "app/src/ui/tools.js, ui/Inspector.jsx, ui/inspect-garment.jsx, ui/inspect-stones.jsx, ui/inspect-decals.jsx, ui/Shell.jsx"
    title: The interface this tutorial describes
    author: claude-code/claude-fable-5-1
---

# What you will build

Read the two photos first, because the shapes are what this tutorial is about.[^photos]

- **Front, upper torso.** Sheer black mesh covers the shoulders and the top of the chest. Its
  lower edge is not a curve: it is two straight diagonals meeting at an **apex** just under the
  neckline, a little to the model's right of centre. The left diagonal is short and steep and
  reaches the sleeve seam near the armpit; the right one is longer and reaches the other sleeve
  seam about two thirds of the way down from the shoulder. The apex is packed with crystals that
  thin out downwards.
- **The diagonal seam.** From that apex a crystal row runs down and to the model's right, all the
  way to the waist, with black fabric on both sides. It is a seam between two black bodice pieces.
- **The front wedge.** A triangle of mesh at the waist: wide at the model's left side (about ten
  centimetres tall at the side seam), tapering to a point at the model's right side, exactly where
  the diagonal seam arrives. Both edges carry a crystal row.
- **Back.** Mesh across the upper back with a teardrop keyhole bound in black. The mesh ends on a
  straight **bandeau seam** across the shoulder blades, finished with glossy black tape and no
  stones. Below it the wedge appears again, the other way round: wide at the model's right side,
  tapering to a point at the model's left, both edges in crystals.
- **Everywhere.** Three-quarter mesh sleeves with a scatter that thickens to a dense band at the
  cuffs; a light scatter over the bodice; glossy black binding at the neck, keyhole and cuffs; a
  small glitter logo on the left hip.

The stones will not land exactly where the photo has them and they do not need to. What must match
by the end is every piece of fabric, its material and where it sits. The finished version is in
the app already: open the **Start from** pane and pick **Tutorial black mesh sash** under *A
finished design* whenever you want to compare.[^walkthrough]

**Left and right** mean the model's own left and right, as if you were wearing the leotard. When
she faces you, her left is on your right. **Heights** on the torso are given as fractions of the
way from the armpit down to the crotch, because that is easy to judge on screen.

# 1. Find your way around

Start the app (`npm --prefix app run dev`, then open the address it prints). It opens on a plain
blue tank leotard on a realistic model.

- **Top bar**: the design's name (click it to type a new one), **New**, **Save**, undo and redo,
  **Pattern** (the flat pattern pieces) and the settings cog.
- **Tool rail** on the left: **Move**, **Draw line**, **Strap**, **Stones**, **One stone**,
  **Eraser**, **Logo / text**, and **Hide lines**. Each has a key: V, P, S, G, 1, D, L and H.
- **The model** in the middle. With the Move tool: drag with the left mouse button to turn her,
  roll the wheel to zoom, drag with the right button to slide the view. In every other tool the
  left button draws or places, so turn with the **right** button instead.
- **The panel** on the right. With nothing selected it shows the whole design: *Start from*,
  *Shape*, *Model* and *Scene*. Click a piece of fabric or a line and the panel shows that part
  instead; press **Esc** or click empty background to go back. *Parts of this design* at the
  bottom lists every piece, line and stone group by name, and a click there selects it.

Undo is **Ctrl+Z**, redo **Ctrl+Y**. Every step below can be undone, so experiment freely.

# 2. The basic shape

Click **New**. You get the plain tank: crew neck, closed back, high leg.

In the **Shape** pane each row is one element and each tile one option. Pick:

- **Back**: **Keyhole**. A teardrop opening appears below the neck at the back.
- **Sleeves**: **3/4**.

Leave **Neckline** on *Crew* and **Leg** on *High*. A pick changes only that element; if it would
remove something you added later, the pane says so and asks first.

# 3. Materials and colours

Click a piece with the **Move** tool (a click, not a drag) and its pane opens.

1. Click the **front**. **Colour**: the first swatch, black. **Gradient**: **None** (the plain
   tank starts with a blue fade).
2. Turn the model round and click the **back**. Black.
3. Click a **sleeve**; both change together, they are one mirrored piece. In the material row
   click **Stretch mesh**. Black. Gradient None. Drag the **Sheerness** slider that appears to
   about **35 %**.

**Done** at the top of the pane, or Esc, closes it.

# 4. The front yoke edge: an apex and two diagonals

You draw the lower edge of the mesh yoke; the app cuts the front along it.

1. Face the model from the front and zoom in on the torso.
2. Choose **Draw line** (P). In its options set **Mirror** to **One side**. This matters: a line
   drawn off-centre is otherwise copied to the other side as a mirror image, which this design
   must not have.
3. Click on the **right sleeve seam** just above the armpit. A click within a few pixels of an
   existing line snaps the point onto it and keeps it attached; attached points show as corners.
4. **Shift-click** the apex: about two centimetres below the neckline, a little to the model's
   right of the centre. Shift makes a sharp corner instead of a smooth curve.
5. Click on the **left sleeve seam** about two thirds of the way down from the shoulder to the
   armpit. Ending on a line finishes the line.

You should see two straight segments meeting at a point under the neck. Switch to **Move** (V),
click the piece above the line and give it **Stretch mesh**, black, sheerness 35 %.

If a click meant for a seam did not attach (the point is round, not a corner, and the piece does
not split), undo and click again a touch closer to the line. If the line went to both sides, you
forgot *Mirror: One side*. **Enter** finishes an open line, **Backspace** removes the last
point, **Esc** throws the line away.

# 5. The front wedge: two lines between the side seams

The side seams are reachable from the **front** view, from the armpit all the way down. (They
are not reachable from the back or the sides, where the hanging arms cover them.)

**Upper edge.** Still in Draw line, from the front:

1. Click on the **left side seam** about a quarter of the way down from the armpit.
2. Click once across the belly, a little lower.
3. Click on the **right side seam** at the waist, a little under half-way down. That is the
   wedge's point.

**Lower edge.**

1. Click on the **left side seam** about half-way down, ten centimetres below the upper edge.
2. Click once across the belly.
3. Click on the **right side seam** one to two centimetres below the upper edge's end, so the
   two lines almost meet.

With **Move**, click the strip between them and make it **Stretch mesh**, black, sheerness 35 %.

# 6. The diagonal seam

1. In **Draw line**, click on the yoke edge exactly at its apex; the first point snaps onto the
   yoke line.
2. Click once about half-way down, a little to the model's right, so the seam bows slightly.
3. Click on the wedge's upper edge just before its point. The line ends there, attached.

The bodice is now two black pieces either side of the seam. Leave both black; the seam will carry
a crystal row.

# 7. The back

Turn the model round.

**The bandeau seam.** In Draw line, click on the **sleeve seam at one armpit**, then Shift-click
two corners just below the bottom of the keyhole, a few centimetres apart, then click on the
**sleeve seam at the other armpit**. The seam runs straight from the armpits and flattens under
the keyhole. With Move, click the upper back and make it **Stretch mesh**, black, 35 %.

**The back wedge** is wide at the model's **right** side and pointed at her left.

*Upper edge:* its wide end sits a fifth of the way down the right side seam, where the arm hides
the seam from behind. So start it from the **front**: face the model, click on the right side
seam just below the armpit, then turn her round (right-button drag) and click once across the
back a little lower, then click on the **left side seam** at hip height, a little under half-way
down, which is reachable from the back.

*Lower edge:* the same way: from the front, click on the right side seam a third of the way
down; turn round; one point across the back; end on the left side seam one centimetre below the
upper edge's end.

With Move, click the strip between them and make it **Stretch mesh**, black, 35 %.

Press **H** at any time to hide the editing lines and see the fabric alone; H again brings them
back. You should now be able to turn the model and see every shape from the photos.

# 8. Crystals

Pick **Stones** (G). Its options sit at the top of the panel: stone colour (*Crystal AB*, the
clear aurora-borealis stone of the photo), size, cut, rows, offset from the line, spacing and the
fill pattern. A click on a **line** lays rows along it; a click on a **piece** fills it.

**Rows.** Set **Rows** to 2 and click the yoke edge. Set Rows back to 1 and click the diagonal
seam, the front wedge's upper and lower edges, and (from the back) the back wedge's two edges.
Nothing on the bandeau seam: in the photo it carries tape, not stones.

**Scatter.** Size *ss8*; click each of the two black bodice pieces in turn. Each click gives a
full pavé, far too dense. The new generator's settings appear below the tool options: type **6**
in its **gap** field and press Tab, and the stones spread into a light scatter. Spacing is in
stone widths; the slider stops at 3 but the field takes any number.

**Sleeves.** Size *ss6*, click a sleeve, set its **gap** to **4**.

**Cuffs.** Rows 3, size *ss10*, drag **From line** to about **−20 mm**, click the cuff edge of
a sleeve. Three rows appear round both cuffs a short way up from the edge. Why −20: the slider
moves rows to one side of the line or the other, and on a cuff the negative side is up the
sleeve; stones also keep about 13 mm clear of a finished edge, so a row placed nearer is dropped
and the generator shows **(0)**. If you see a (0), move *From line* further or the other way.

**The apex pavé** (optional). The dense fan at the apex that fades downwards is the one thing
the interface cannot draw yet. The finished design has it from a script command, a scatter that
fades with distance from the apex, listed at the end. Without it the design still reads
correctly.

**Changing stones later.** Click any row or fill (or pick it under *Parts of this design*) to
change its stone, size, rows, gap or seed, to **Release** it into single stones, or to
**Delete** it. **One stone** places single stones; **Eraser** clears stones under a brush.

# 9. The logo

Pick **Logo / text** (L). Type a single letter (it stands in for the maker's mark), set **Look**
to **Glitter** and **Width** to about **45 mm**, then click the left hip, below the wedge. Click
the logo later to change its text, font, look, colour, width or angle.

# 10. Edges and seams

1. With **Move**, click the **neckline**. In its **Finish** section set **Finish** to **Contrast
   binding**, **Fabric** *Shiny tricot*, and the **Colour** well to black.
2. The same for the **keyhole** edge (from the back) and a **cuff** (both cuffs change).
3. Click the **bandeau seam** and set its Finish to **Flat tape**, shiny, black.

The yoke edge, the diagonal and the wedge edges stay plain seams under their stones.

# 11. Look at it, pose it, save it

- **H** hides the lines. Turn the model and zoom in on the stones.
- **Model** pane: pick another pose and the leotard follows; **Mannequin stance** brings her
  back. Draw and edit in the mannequin stance, where the seams are easiest to reach.
- **Scene** pane: another studio, the **Brightness** slider; under *More settings*, **Crystal
  glare** adds catalogue sparkle.
- Click the name in the top bar, type a name, **Save** (Ctrl+S). The design joins *A finished
  design* with a picture, and lives in `app/designs/`.
- **Pattern** shows the flattened pieces beside the model, with a button for the printable PDF.

# What this design taught you

| You did | The tool |
|---|---|
| Picked the back and sleeves | Shape pane: one element at a time, the rest kept |
| Coloured pieces, made them mesh, set sheerness | Click a piece, piece pane |
| Drew a peaked edge and a diagonal seam ending on other seams | Draw line, snapping ends, Shift for corners, *Mirror: One side* |
| Drew wedges between the side seams, front and back | Draw line from the view where the seam is visible, turning mid-line |
| Rows, scatters, dense cuffs | Stones tool on a line or a piece; the generator's settings afterwards |
| A logo | Logo / text tool |
| Binding and tape | Click a line, Finish section |
| Preview, pose, save | Hide lines (H), Model pane, Save |

# Where the app falls short of the photo

- The small clear hook at the top of the keyhole is not in the interface (script command
  `hardware.add` only).
- The apex pavé and the cuff fade are gradients of stone density; the interface gives even
  scatters and rows. The finished design uses, on each bodice piece,
  `stones.add { kind: 'scatter', on: { panel }, params: { from: { curve: <yoke edge>, t: 0.45 },
  near: 0.85, far: 0, distance: 0.06 } }`.
- Side seams are covered by the arms from the back and the sides in the mannequin stance; draw
  from the front, or turn while drawing, as section 7 does.
- Our keyhole is longer than the photo's, so the bandeau seam has to flatten under it rather than
  run dead straight.

[^photos]: Reference photos
[^walkthrough]: Walkthrough in the app
[^ui]: The interface this tutorial describes
