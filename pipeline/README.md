# Mannequin pipeline

`build_mannequins.py` bakes the four mannequin bodies used by `poc-threejs` from the CC0
MakeHuman base mesh, through the MPFB 2 extension installed in the portable Blender under
`tools/`. Output goes to `poc-threejs/public/mannequins/` (about 3.3 MB, committed with the POC so
the app runs without Blender).

```bash
cd tools/blender-4.5.14-windows-x64
./blender.exe -b --python ../../pipeline/build_mannequins.py
```

Runs headless in about 10 s and prints one `BUILT` line per body, then `DONE`.

## What it does, per body

1. `HumanService.create_human` with MakeHuman macros: female, age from `BODIES[].years`
   (mapped onto MakeHuman's 1/11/25/90-year slider breakpoints), lean athletic build
   (`muscle`, `weight`), `proportions=1`, `firmness=0.4`, cup size per age.
2. Adds the `default` rig and poses the arms to a mannequin stance: upper arm 13° from vertical,
   elbow bent 14° forward (`UPPER_DIR`, `ELBOW_BEND`).
3. Applies the mask modifier (drops helper geometry: eyes, teeth, tights/skirt helpers) and the
   armature (bakes the pose).
4. "Mannequinises": head-bone vertices are deleted and replaced by an egg (`egg_sphere`, built
   vertex by vertex so its order is identical every run); hands smoothed; the bust is replaced by
   a fitted quadratic dome within 3 cm of the apex (MakeHuman's dense nipple ring survives
   ordinary smoothing); a light Taubin smooth all over.
5. One Catmull-Clark level, then quads split on a fixed diagonal. Blender's own triangulator
   picks diagonals by shape, which gave each body a different triangle list; do not use it.
6. Uniform scale to `BODIES[].stature` (MakeHuman's height slider also reshapes the body, so it
   is left at 0.5), convert to three.js axes (y up, +z front) and write the files.

The script raises if any body's triangle list differs from the first one. The app depends on
every body being the same mesh (vertex i = the same anatomical point), because the leotard is
defined once on the reference body (`REF = 'young'` in `poc-threejs/src/body.js`) and carried to
the others.

## Output format

- `manifest.json`: vertex and index counts, part names, and per body: key, label, years, stature,
  file, landmarks (rig joint positions after posing, metres, three.js axes).
- `shared.bin`: `Uint32` triangle indices, then 8 bytes per vertex of part weights 0..255 in the
  order of `manifest.parts`: shoulder, upperarm, forearm, upperleg, lowerleg, head (egg), hand,
  spare. Weights are the rig's skinning weights; `body.js` uses them for the armhole seam, the
  arm parameter, the dress-form cuts and the lift solve.
- `<key>.bin`: `Float32` xyz per vertex.

## Changing things

- New body (size, age, build): add an entry to `BODIES`, rebuild. The app lists bodies from the
  manifest, so no app change is needed. Body statures follow
  `research_notes/mannequins_and_leotard_fit.md`.
- Anything that changes topology (subdivision level, egg resolution, what gets deleted) changes
  every vertex index. The app's region fields are evaluated per vertex at runtime, so they follow
  automatically, but the reference-body constants in `body.js` (necklines, leg line, swoosh,
  dress-form tape heights) assume the current reference body's shape and may need re-tuning.
- Changing the reference body itself (`young`) moves every design line; re-check them in the app.
