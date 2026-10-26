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
