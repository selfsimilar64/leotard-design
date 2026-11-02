# Reference fit in Newton's Style3D solver

An offline reference, not part of the app. It runs the `young` high-cut leotard on the `young` body in a heavier open-source cloth solver, starting from our fit, and measures which physics changes the fit. It compares models, not reality. Nothing here touches `pipeline/wrap_block.py`. Results go in `research_notes/Tight garment fit solver audit/reference_simulator_results.md`.

## Files

- `garment.py`: whole garment from our resolved cells (same mesh and flat points as ours), the raw skin, and every fit measure.
- `solver.py`: `SolverStyle3D` plus edge elastic (stock Style3D has no spring force in its step), optional Poisson coupling, optional our free-compression rule. The last two are our patches, not stock.
- `run.py`: one run. All settings and their sources are in `DEFAULTS`.
- `experiments.py`: the run list. Finished runs are skipped, so it can be restarted.
- `report.py`: tables and the two baseline images.
- `requirements.txt`: exact versions, Python 3.13.3. Newton 1.7.0, warp-lang 1.19.0, CUDA 13.1 driver, GTX 1650.

## Commands (Git Bash)

```
R=<scratch folder>   # .../scratchpad/reference
py -3.13 -m venv $R/venv
$R/venv/Scripts/pip install -r pipeline/reference/requirements.txt
mkdir -p $R/inputs $R/out
cp assets/blocks/body-young.json app/captures/wrap-body-young.json app/captures/wrap-body-young-high-resolved.json $R/inputs/
$R/venv/Scripts/python pipeline/reference/garment.py $R/inputs      # checks the mesh, writes inputs/raw_skin.npy
$R/venv/Scripts/python pipeline/reference/run.py $R/inputs $R/out baseline
$R/venv/Scripts/python pipeline/reference/experiments.py $R/inputs $R/out
$R/venv/Scripts/python pipeline/reference/report.py $R/inputs $R/out --images
```

The baseline takes about 6 minutes for 10 simulated seconds. Inputs are snapshotted so that a re-fit by someone else cannot change a running comparison.

## Set-up choices that affect the numbers

- Collider: raw skin, the a-pose cage through the app's Catmull-Clark stencil (`pipeline/g9.py cc_stencil`). The `lifted` run uses the garment surface instead.
- Contact query distance is 30 mm, not the force range: with a short query, a particle that gets inside the body feels nothing and stays there.
- Self-contact is off. On, the untangling force fired on our start state with forces up to about 11 N.
- Friction regularisation is 1 mm/s, so friction runs creep slowly under load and never fully stop. Read the end speed with that in mind.
