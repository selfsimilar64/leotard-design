# Sports-bra bust by taut cloth (prototype, 2026-10-25)

Prototype scripts behind [decision 2026-10-25-sports-bra-cloth-bust](../../../knowledge/decisions/2026-10-25-sports-bra-cloth-bust.md).
Not wired into `bodies.py` yet: they read a-pose cages baked by `bake_variant.py` into
`pipeline/daz/out/bust-cloth/<body>-<suffix>/` and write renders to the current folder.

- `bake_variant.py <suffix> <bodies> morph=value ...`: Daz a-pose cage with morph overrides (0 removes one).
- `cloth_proto.py`: `prepare` (lift, a soft upward shift over the breast), `band` (the bra's
  footprint: free weight 0..1), `subdiv`; `simulate` is the abandoned Blender cloth run (`cloth_sim.py`, not kept).
- `cloth_pbd.py`: `drape` (our position-based taut membrane: tension-only springs shortened by
  `shrink`, 3D collision with the subdivided skin, held at the band's edge) and `transfer` (band
  skin onto the cloth, relaxed along it, faded by the free weight).
- `bust_proto.py`: shared helpers (figure weights, OBJ writer, Blender render, image grids) and the
  abandoned height-field attempt `compress`.
- `sweep.py`, `run3.py`: the comparison runs shown to the owner.

Chosen settings (owner): Daz BreastsFlatten 0.25, BreastsIn-Out 1.0, lift 2 cm, cloth
`drape(shrink=0.5, iters=1500, stiff=1.0, hard_pin=True, off=1.0)`, `band()` defaults
(10 cm below to 4 cm above the breast, 110 degrees round, 8 / 4 cm soft edges), `transfer()` defaults.

## Seat: the gluteal cleft (prototype, 2026-10-25, cleft only by owner's choice)

- `seat_proto.py`: `landmarks` (crotch point; cleft top where the midline sits >3 mm behind the
  cheeks), `region` (a strip along the cleft, narrower at the bottom so the crease under the
  cheeks is left alone, back of the crotch only), `drape_grid` (a fresh regular grid cloth laid on
  the skin's envelope seen from behind and 30 degrees below, so no wall material sits in the
  cleft; tension 4x across vs along), `run_grid` (thigh skin kept still: `leg_keep`).
- `seatrun.py out bodies "{name: kwargs}" title`: comparison runs.
- Current settings: `run_grid(P, along=0.25, front=1.0, front_soft=3.0, w_lo=1.5, w_hi=4.5, w_soft=2.5, top_soft=6.0, leg_keep=0.3)`.
- 2026-10-25 later: `drape_grid(cling=...)` draws the cloth onto the skin against its tension, so
  it dips smoothly into the cleft (older teen, cleft 1.5-3.7 cm deep: cling 0 -> 0.4-1.0 cm dip,
  0.002 -> 1.2-1.9, 0.005 -> 1.3-2.2, 0.01 -> 1.4-2.5; the tension ratio `along` barely matters).
  `embed` (fold-free Tutte layout of the band's skin on the cloth, `t_in` 0.15) removes the midline
  hairline, which was the two walls' skin sheared onto the cloth; `untangle` and `fill` were tries.
  Owner's target (moodboard back views): fabric sits a little into the cleft, smoothly, cheeks read separate.
- Owner chose cling 0.002. Spurs where the seat met the gusset were skin just behind the crotch
  dragged 2-4.6 cm back onto the cloth: `front=-3.0` (the band ends 3 cm behind the crotch point)
  removes them. Settings now: `along=0.25, front=-3.0, front_soft=3.0, w_lo=1.5, w_hi=4.5,
  w_soft=2.5, top_soft=6.0, leg_keep=0.3, embed=True, t_in=0.15, cling=0.002`.
- Poses (`poses_seat.py`): carrying the a-pose change into a pose (`posecarry.carry`, offsets
  turned with each neighbourhood) pleats the opened cleft in the split leap, stag jump and lunge.
  Draping each baked pose instead (`run_posed`: a-pose band, posed mesh rigidly fitted to the
  a-pose pelvis, `per_pose=True`) is clean in standing, kneeling, lunge and split leap; the stag
  jump (one leg raised, seat twisted) keeps a dark crumple beside the cleft. Tried for it and
  dropped: cloth kept off the thighs (`leg_cloth`), a narrower band, a view following the seat's
  normal (`follow`, worse everywhere). Not baked: per-pose drapes would replace a single morph.

## Seat in poses: artifact hunt (2026-10-26)

Owner: get rid of the artifacts on all bodies and poses; judge on normal-shaded renders
(`render_blender.py` `shade: normal`), the owner's eyes are the final say. Tools: `diag.score`
(creases > 20 degrees, flipped and squashed triangles the change added; it also counts folds hidden
inside the closed cleft, so it filters, the renders decide), `sweep_score.py`, `vis.py` (normal
sheets, `bottom` zooms on the cleft's lower end), `clothvis.py` (the cloth alone).
Findings, older teen, poses draped per pose (`run_posed`):
- Knots sat in the bottom 2 cm of the cleft. Starting the cloth higher (`bot`) or ending it further
  from the crotch (`front`) only lowered the score by removing the effect (cleft came back).
- Smoothing the skin's displacement: same, the cleft came back.
- In the stag jump and kneeling the cloth itself was broken: cells bridging a thigh in front of
  the seat in the starting view. `jump` cuts the grid where the depth jumps and a thigh is involved,
  holding the cut edge.
- Skin onto cloth: nearest point + `embed` (fold-free layout) rippled the wall seen edge-on in the
  stag jump; `settle_smooth` (one sparse solve: thin-plate smoothness + pull to the cloth) is clean
  there but brings the midline line back; `settle_slide` (pull only onto the cloth's surface,
  point-to-plane, the skin slides along it) is clean in stag jump, kneeling and lunge.
- The line left was a groove in the cloth: cling towards the nearest skin pulls the cloth over the
  slot into it. `cling_mode='pressure'` (an even pressure along the cloth's normal) sags smoothly;
  0.001 gives the depth of skin cling 0.002.
- Best so far (B2): `jump=1.0, cling=0.001, cling_mode='pressure', smooth_settle=True, slide=True,
  lam=5.0, mu=0.05` with the KW in `diag.py`.
- B3 = B2 + `cut_mode='edge', cut_core=0.5` (the grid is cut wherever its depth jumps outside the
  cleft's core, not only at a thigh). `fullrun.sh`: all 8 bodies x 31 poses, normal sheets in
  `app/captures/bust-cloth/seat-all-poses/`. Reviewed by eye: clean on all bodies and poses except a
  faint crease beside the cleft in the floor split (young, adult, petite) and a thin sliver in the
  9-year-old's stag jump; the 6-year-old's cleft is too shallow for the band to change much.

## Bust in poses (2026-10-26)

`bake_bust_poses.py` bakes the owner's starting shape (flatten 0.25, in-out 1.0) in the a-pose and
12 Daz poses; `bustposes.py` drapes the bust once in the a-pose and carries the change into each
pose (`posecarry.carry`, as a Daz morph would be). Normal-shaded sheets for teen, older teen,
young and adult in `app/captures/bust-cloth/bust-poses/`: no tears, creases or folds in any pose;
the merged, lifted shape holds in upright poses. In inverted and lying poses Daz's own breast
bones still move the bust, so some separation returns there (as in the body today).
