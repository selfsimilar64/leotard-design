# How Sylvia P's Studio SP works, and what it means for us

*Written 24 October 2026 after opening the Kamira leotard in Studio SP and examining it. The detailed
technical record is in the knowledge folder: `knowledge/domain/market/studio-sp-teardown.md`.*

## The short version

Studio SP isn't a 3D engine Sylvia P built. It is **Sketchfab**, a public 3D-model hosting site,
embedded in their shop page. A web agency called Glasshouse Digital wrote a modest layer of code
that tells the Sketchfab viewer which parts to show and which colours to paint them. All of the
visual quality comes from careful preparation of each 3D model, done ahead of time, not from
clever rendering.

## How it's put together

- **One frozen 3D model per leotard style.** Each style was draped once in a fashion-simulation
  program and saved as a fixed shape. That shape can't change, which is why the shape can never
  be edited and why there are so many presets instead.
- **No body.** The leotard floats on its own (a "ghost mannequin" look). To make the sheer mesh
  read as mesh over skin, they paint the inside lining a skin colour whenever a mesh fabric is
  chosen. It's a neat cheat.
- **Five parts per leotard**: lower body, upper body, mesh overlay, belt, crystals. You step
  through them one at a time, or click on the leotard to jump to a part.
- **A handful of fabric recipes, hundreds of colours.** There are only nine underlying looks
  (matte, wet look, mystique, three kinds of mesh, two printed, crystal), each recoloured into
  350 colourways in total. The fabric textures are tiny, repeating images.
- **Crystals are fixed patterns.** "Heavy", "light" and "logo only" are three pre-placed
  arrangements switched on and off. You pick a stone colour, never a position.
- **The shine is generic.** Mystique is simply "shiny with a speckle texture", and every crystal
  shares one repeating sparkle image. There's no stone-by-stone glint.

## Nice touches worth borrowing

1. When you select a part, the camera glides to it and the part **briefly glows white**, so it's
   obvious what you're editing.
2. When nobody touches it, the leotard **sways gently** side to side, and it stops as soon as you
   grab it.
3. A **design summary** lists every part's fabric and colour in one place.
4. **Share link**: the whole design fits into a web link that reopens it exactly.
5. **Enquire** automatically takes a front and a back picture at fixed angles and sends them with
   the colour codes and price to Sylvia P's team.

## What it means for our app

- **Our visuals already aim well above theirs.** We have a real body, poses, studio lighting,
  individual sparkling stones and a proper mystique foil. Their tool shows that a respected brand
  sells custom work from something simpler, which is reassuring for the "appears correct" goal.
- **Their limitation is our opening.** Every new cut means an artist re-drapes and re-uploads a
  model. Our app lets people change the cut itself.
- **Good ideas for the coach view**: the glow-on-select, the camera move to the selected part, the
  summary list, the idle sway and the share link would all be cheap for us to add.

## What we did and didn't take

We read their page code and asked the viewer what it contains, which is information any browser
receives. We did **not** download or save any of their models, textures or code into our project.
