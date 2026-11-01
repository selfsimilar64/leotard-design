# Software interaction precedents: how design tools construct and divide shapes and garments

Evidence tags used on every finding: **[doc]** official documentation or paper I read in full or in the relevant part; **[snippet]** search-result text only, because the page refused direct fetch (support.clo3d.com, support.marvelousdesigner.com, helpx.adobe.com, Autodesk, creativepro, support.shapr3d.com all returned HTTP 403; help.style3d.com returned 404); **[forum]** user or staff forum post; **[vendor]** vendor marketing; **[single]** only one source found. Researched 2026-10-31. All 40 allowed searches used. Findings are paraphrased, with one direct quote from an outside source, in section 5. Anything under "Inferences" is my reasoning, not a sourced fact. Project facts referred to come from `knowledge/engineering/architecture/construction-model.md`, `knowledge/engineering/app/studio-interface.md`, `knowledge/engineering/architecture/mirror-toggle.md` and `knowledge/engineering/ux/*.md`.

## 1. Fashion CAD: internal lines, tracing, layer cloning, drawing on the avatar, 2026 sketch features, seams and folds, learning curve

### Takeaway
Every fashion CAD family uses one grammar (draw lines, select a closed set, convert), and existing outlines count only when the user selects them, which is exactly the labour the owner objects to; the nearest thing to the candidate is Flatten (point at a closed shape on the avatar, press Enter), which depends on hover and a keyboard. Learning complaints target the pattern-first model as a whole, and no source isolates which features designers avoid.

### Cited Findings
**Tracing a new piece from lines**
- CLO's Trace (2D toolbar or 2D Pattern menu) acts on lines already selected: marquee or pick Baselines, Internal Lines or Outlines, right-click, then choose `Trace as a Pattern` or `Trace as an Internal Shape`. The line ends must adjoin; with more than three intersecting lines selected, the shape they form is what gets traced. [snippet] — [CLO Trace](https://support.clo3d.com/hc/en-us/articles/115012381528-Trace)
- Reported Trace failures: a points-too-close error, and internal lines from DXF imports that do not quite connect. [snippet, single] — [CLO Trace, older article](https://support.clo3d.com/hc/en-us/articles/115000307728)
- Marvelous Designer (MD) has a parallel article on extracting internal lines into internal shapes or patterns. [snippet] — [MD Trace](https://support.marvelousdesigner.com/hc/en-us/articles/47358298214681-6-2D-Pattern-Editing-Trace)
- A tailoring walkthrough offsets a pattern outline into an internal line (100 mm in its example) and then cuts it out as a separate explicit step. [snippet, single] — [SIGGRAPH blog](https://blog.siggraph.org/?p=14847)
- MD has no equivalent of CLO's `Clone as Reference Line`, per a staff reply; the suggested workaround is copy-pasting internal lines. [snippet, forum] — [MD community](https://support.marvelousdesigner.com/hc/ja/community/posts/48267471804569/comments/48267485476249)

**Layer cloning**
- `Layer Clone (Over)` places a copy over the original with its outlines and internal lines automatically sewn to the original; `Layer Clone (Under)` is positioned for double-layered parts such as padding, collars and cuffs. [snippet] — [CLO Layer Clone](https://support.clo3d.com/hc/en-us/articles/115012378408-Layer-Clone-Over)

**Drawing on the avatar and converting**
- Flatten extracts only closed shapes. The user hovers until the shape highlights, presses Enter for a separate pattern, and Shift+Enter merges adjacent selected surfaces. New patterns get the default fabric and sewing lines are set automatically between adjacent patterns. [snippet] — [MD Flatten](https://support.marvelousdesigner.com/hc/en-us/articles/47358340247193-Flatten), [CLO Flatten](https://support.clo3d.com/hc/en-us/articles/115012223847-Flatten)
- Patterns flattened from the avatar come out with no ease; users work around it with slash-and-spread or by enlarging the avatar. [snippet, forum] — [CLO community](https://support.clo3d.com/hc/es/community/posts/360051917533-How-To-Flatten-A-Pattern-With-Ease-Already-Incorporated)
- CLO 2026.0 `Sketch on Avatar`: a Sketch window opens from the 3D Pen (Avatar) group; the view locks to front or back with zoom only; there is an eraser, a symmetry option across the avatar's centre axis, a conversion preview and `Convert to 3D Pen`, which switches to the edit tool. Confirms the project's notes. [snippet] — [CLO New in 2026.0](https://support.clo3d.com/hc/en-us/articles/55461410696345)
- A third-party summary frames Sketch on Avatar as early silhouette exploration ahead of detailed pattern work, and describes CLO 2026.0 gluing as fill, brush or sticker-style attachment aimed at pockets and labels. [single, reseller-style blog] — [Binary Cloth](https://binarycloth.com/clo-2026-new-features-fashion-brands/)
- MD 2026.0 (15 Apr 2026) 3D Pencil: same locked view; sketching front and back then flattening sews the sides automatically, though the article cautions this does not make every garment a one-click job. — [Digital Production](https://digitalproduction.com/2026/04/15/marvelous-designer-2026-0-adds-3d-pencil-and-lacing/)
- MD 2026.1 (24 Aug 2026): Brush Pinching paints folds freehand; Seamline Rip, experimental, separates at seams and adds fraying. — [CG Channel](https://www.cgchannel.com/2026/08/clo-virtual-fashion-releases-marvelous-designer-2026-1/)

**Seams and folds**
- CLO fold angle is a per-internal-line value from 0 to 360 degrees with 180 meaning flat, plus `Fold Rendering` and `Fold Arrangement`. [snippet] — [CLO article](https://support.clo3d.com/hc/en-us/articles/115000414507)
- Staff say the sewing line type cannot be changed when two internal lines are sewn together (to limit bulk); a user reports that sewing an internal line to an outline forces `Turned`. [snippet, forum] — [CLO: sew internal line](https://support.clo3d.com/hc/en-us/community/posts/360000624247-how-to-sew-internal-line), [CLO: turned seam](https://support.clo3d.com/hc/pt-br/community/posts/1500000000242-Can-t-change-seam-from-turned-to-custom-angle)
- A double fold is built by hand from two internal lines at 360 degrees plus extra sewing relationships. [snippet, forum] — [CLO community](https://support.clo3d.com/hc/ko/community/posts/900002284126-perfect-double-fold)

**Browzwear VStitcher and Style3D**
- VStitcher's Pen draws lines and shapes in 2D or 3D, but garment pieces only in 2D. A shape is lines enclosing a space, closed by hovering on the last point until the cursor changes and clicking. [doc] — [Pen Tool Overview](https://help.browzwear.com/hc/en-us/articles/4921558026265)
- VStitcher's help lists Magnetic Trace, Snap to Intersection, Joining Internal Lines, Closed Cut Mark Shapes (titles only; no article title clearly covers making a piece from lines on a piece). [doc, titles only] — [Editing Lines collection](https://help.browzwear.com/en/collections/17211810-editing-lines)
- VStitcher 2026.2 (30 Jul 2026) added multi-fold (2D window only), notches and grainlines, and lists no new 3D drawing or cutting. [doc] — [release notes](https://help.browzwear.com/en/articles/16111588-vstitcher-2026-2-release-notes)
- Style3D Studio Flatten: draw on the avatar with the Pen (Ctrl adds curve points, Shift constrains); lines must not intersect; pick edges with Edit Pattern or double-click for a whole closed loop, then Enter. [snippet, single] — [Style3D help](https://help.style3d.com/studio/en/c2c8/5869/3f4f/68f8/)

**Learning curve**
- London study (8 interviews, designers and digital specialists): hardware from about GBP 2,000 and software proficiency of roughly 6 to 12 months (conference abstract); steep curves, scarce mid-level training, and workflow misalignment for pattern-first designers (journal abstract, 2026). Abstracts only. — [Martin and Seo, IFFTI 2025](https://ualresearchonline.arts.ac.uk/id/eprint/24804/), [Martin and Seo, IJSFT 2026](https://ualresearchonline.arts.ac.uk/id/eprint/26648/)
- **Contradicts the project's figure:** `professional-fashion-cad.md` cites one third-party estimate of 4 to 8 weeks to productive use. The two figures measure different things and each is a single source, so treat the range as weeks to reach basic output and months to reach proficiency.
- CLO itself says pace varies with practice and project complexity. [snippet] — [CLO support](https://support.clo3d.com/hc/en-us/articles/115013367048-How-long-will-it-take-me-to-learn-CLO)
- Reviews name the curve as tough or as the main complaint, with training said to skip fine detail. [snippet, low authority] — [G2](https://www.g2.com/sellers/clo-virtual-fashion), [SaaSworthy](https://www.saasworthy.com/product/clo-3d-fashion/reviews)
- A newcomer thread reports being unable to get started at all. [snippet, forum] — [CLO community](https://support.clo3d.com/hc/ko/community/posts/360034764654-finding-it-impossible-to-get-started-SOS-i-have-no-idea-how-to-use-this)
- A 2024 MA project integrating CLO into a teaching course notes a learning curve alongside gains in student skill and creativity. Abstract only. — [Shetabi, UNL](https://digitalcommons.unl.edu/textilesdiss/22)
- A 2025 MA thesis asks whether CLO lets aspirants work professionally without traditional training; its abstract gives aims, not results. — [Herring, Lindenwood](https://digitalcommons.lindenwood.edu/theses/1242)

### Inferences
- The owner's complaint describes CLO's Trace nearly exactly: two outlines and two new internal lines must all be selected, and the result is a new pattern that must then be placed and sewn. I could not verify this in the app, and the docs are snippets only.
- The 2026 sketch features add a freehand layer in front of an older flatten step (the CLO flatten article IDs predate 2026). The note in `sketch-panels-on-body.md` that two tools "added exactly this in 2026" slightly overstates: what is new is the sketch layer. Neither source shows sketch lines reusing an existing garment's seams, so the owner's case is probably still unsolved there.
- Flatten contributes three ideas worth keeping: auto-sewing between neighbours, one key to merge adjacent regions, and no need to name edges. Its hover-then-Enter commit has no touch equivalent.
- Style3D's no-intersections rule marks the limit of a loop-tracing model. A planar-map model (section 5) has no such limit.
- The no-ease complaint does not bite for a skin-tight leotard. DressUp (section 7) made the same observation in the other direction: flattening without ease is acceptable for stretch cloth.

### Gaps
- The CLO, MD and Style3D manuals could not be read directly, so tool names and rules rest on snippets. Not established: whether a traced pattern keeps any link to its source lines; whether Flatten can use a garment's existing seams; how CLO's M:N or free sewing behaves (no article surfaced); how VStitcher turns a closed shape into a separate piece.
- No source isolates specific features that designers avoid. The evidence available concerns the whole pattern-first model (section 9).

## 2. Region-based vector tools: picking regions formed by existing lines, gaps, previews

### Takeaway
Treating enclosed regions as first-class objects, with no tracing, is proven across two decades of illustration tools, and tap-to-fill already works on iPad. The tools differ on pre-selection, on whether results stay live, and on near-miss lines, where gap settings are a rescue for hand-drawn art that users find fiddly.

### Cited Findings
| Tool (version or date) | Pre-selection | Lines that do not meet | Preview | Result |
|---|---|---|---|---|
| Illustrator Shape Builder | Yes, select overlapping shapes | Gap Detection off by default, with adjustable gap length needing trial and error; open filled paths can be treated as closed [snippet] — [Adobe help](https://helpx.adobe.com/illustrator/desktop/draw-shapes-and-paths/draw-shapes/combine-shapes-with-shape-builder-tool.html), [CreativePro](https://creativepro.com/setting-illustrators-shape-builder-options) | Regions highlight as the pointer passes, optionally as a mesh fill; plus and minus signs at the cursor — [Online Tech Tips](https://www.online-tech-tips.com/how-to-use-adobe-illustrators-shape-builder-tool/) | New merged path; Adobe's tutorial contrasts permanent results with shape modes that keep originals editable — [Adobe tutorial](https://www.adobe.com/learn/illustrator/web/combine-simple-shapes-to-make-complex-shapes?red=a) |
| Illustrator Live Paint (paper 2007) | Yes, must first make a Live Paint group — [Illustrator How](https://illustratorhow.com/live-paint-bucket/) | Gap Options: paint stops at small, medium, large or custom, with a count of gaps and a coloured preview; gaps can be closed with inserted unpainted paths [snippet] — [Adobe help](https://helpx.adobe.com/ro/illustrator/desktop/paint-and-fill/learn-painting-basics/find-and-close-gaps-in-live-paint-groups.html) | A prohibit sign where a region cannot be filled — [Illustrator How](https://illustratorhow.com/live-paint-bucket/) | Live; see section 5 |
| CorelDRAW Smart Fill (help for 2020 and 2021) | No; click inside an area. Clicking outside any enclosed area builds an object from everything on the page — [Corel 2021 help](https://product.corel.com/help/CorelDRAW/540111147/CorelDRAW-en/CorelDRAW-Apply-fills-to-areas.html) | Help pages for about 2015, 2020, 2021 and Mac require full enclosure and mention no tolerance; a snippet from an unidentified version describes a gap tolerance that temporarily repositions endpoints, and an Adobe user thread also refers to one [snippet, conflicting] — [Corel, about 2015](https://product.corel.com/help/CorelDRAW/540229932/Main/EN/Documentation/CorelDRAW-Applying-fills-to-areas.html), [Corel 2020](https://product.corel.com/help/CorelDRAW/540111137/Main/EN/Documentation/CorelDRAW-Apply-fills-to-areas.html), [Adobe thread](https://community.adobe.com/t5/illustrator-discussions/how-to-find-gap-tolerance-which-is-in-coreldraw-in-illustrator/m-p/11370310) | None documented | Independent new object on top; the fill survives deleting the source lines — [Corel](https://product.corel.com/help/CorelDRAW/540238885/Main/EN/Documentation/CorelDRAW-Creating-objects-from-enclosed-areas.html) |
| Inkscape Shape Builder (1.3) | Yes: overlapping shapes or one self-intersecting path | Not discussed | Canvas switches to outlines of the selection and hides everything else; blue adds, pink removes | Enter or switching tool accepts, Esc cancels; **any segment not touched is removed** — [Inkscape 1.3 notes](https://wiki.inkscape.org/wiki/Release_notes/1.3) |
| Figma vector networks (9 Feb 2016) | Inside one vector layer | Fill shows only on closed shapes [forum] — [Figma forum, 2025](https://forum.figma.com/suggest-a-feature-11/apply-fill-on-an-open-vector-shape-39257) | Enclosed space fills automatically; the paint bucket toggles any enclosed region — [Wallace](https://madebyevan.com/figma/introducing-vector-networks/) | Belongs to the network |
| Figma shape builder (help page undated) | Yes, select layers and enter vector edit | Not discussed | Hover over regions; drag merges, a click extracts one region to its own layer, Option or Alt click removes | Explicitly destructive; undo or version history is the only way back — [Figma help](https://help.figma.com/hc/en-us/articles/31616004109847-Create-custom-shapes-with-the-shape-builder-tool) |
| Affinity Designer 2 Vector Flood Fill | No. On iPad, tap an area with nothing selected; dragging floods several adjacent areas — [iPad help](https://affinity.help/designer2ipad/en-US.lproj/pages/ObjectControl/floodingAreas.html) | Fully enclosed only; a concave area from open curves fails unless another curve crosses it; no tolerance documented — [Flooding areas](https://affinity.help/designer2/en-US.lproj/pages/ObjectControl/floodingAreas.html) | None documented | New shape, inserted inside or between existing shapes — [tool page](https://affinity.help/designer2/en-US.lproj/pages/Tools/tools_vectorFloodFill.html) |
| Affinity Designer 2 Shape Builder | Yes | Not discussed | Freehand, straight-line or marquee drag | Add replaces originals, Create keeps them, Delete removes areas — [tool page](https://affinity.help/designer2/en-US.lproj/pages/Tools/tools_shapeBuilder.html) |
| Procreate ColorDrop (raster, for comparison) | No; drag the colour onto the art | Holding after the drag opens a threshold set by sliding, shown as a blue bar | The handbook does not state a live fill preview | Raster fill — [handbook](https://help.procreate.com/procreate/handbook/colors/colors-interface) |

Other findings:
- Figma's author reports that having people cut holes by working on negative space proved hard to understand, and that the region toggle is what finally worked. Winding rules were unpredictable because curve direction is invisible. [single, vendor author] — [Wallace, 2016](https://madebyevan.com/figma/introducing-vector-networks/)
- A forum post names an Aug 24, 2026 Figma update, "Erase and drag to fill for vector editing", that changed the paint bucket; the release notes page I could read did not show it. Treat as unverified. [forum, single] — [Figma forum](https://forum.figma.com/report-a-problem-6/paint-on-image-vectors-now-switches-to-crop-custom-57252), [release notes](https://www.figma.com/release-notes/)
- A user calls Affinity's flood fill fast because it fills straight away with no prior designation step; a rival vendor's staff note that it joins neighbouring regions of the same fill. [forum, undated] — [VectorStyler forum](https://vectorstyler.com/forum/post/17767)
- Complaints: a user with brush-stroke art found small and large gap settings made no difference (Oct 2021; experts replied that Live Paint does not support brush strokes) [forum] — [Adobe community](https://community.adobe.com/t5/illustrator-discussions/live-paint-bucket-fill-tool-not-working-within-closed-paths/m-p/14373402). Paint leaks into the background through outline gaps larger than the settings bridge; the advice is to draw invisible lines across the gaps and merge them in (Mar 2017) [forum] — [Adobe community](https://community.adobe.com/t5/illustrator-discussions/inked-drawing-gets-colored-with-background/m-p/8866663). Enabling gap detection can slow large groups [snippet] — [Adobe help](https://helpx.adobe.com/ro/illustrator/desktop/paint-and-fill/learn-painting-basics/find-and-close-gaps-in-live-paint-groups.html).
- Curved work is a known weak spot: cutting with Shape Builder or Pathfinder left hairline gaps even with identical copies (July 2019, still reported April 2024, no fix in the thread), and a long curve handle was suspected of producing bumps (Feb 2024). [forum] — [Adobe gap thread](https://community.adobe.com/questions-652/shape-builder-pathfinder-gap-error-767446), [Adobe curve thread](https://community.adobe.com/t5/illustrator-discussions/adobe-illustration-2023-problem-with-shape-builder-tool-and-curved-shapes/m-p/14423604)
- Illustrator on iPad lists Shape Builder tools [snippet] — [Adobe iPad help](https://helpx.adobe.com/illustrator/ipad/draw-and-edit-objects/draw-edit-shapes-ipad.html), but had no gap detection as of Jan 2021 per a reply marked correct [forum, old] — [Adobe community](https://community.adobe.com/questions-660/can-you-build-organic-shapes-and-detect-gaps-in-ipad-illustrator-app-590284).
- Linearity Curve documents a Scissors tool and no knife [doc] — [Linearity editing tools](https://www.linearity.io/academy/curve/ipad/user-guide/vector-editing/editing-tools/); a third-party review credits it with a visual Shape Builder [snippet, single] — [La Fabrique du Net](https://www.lafabriquedunet.fr/logiciel/linearity-curve).

### Inferences
- The pre-selection step exists because desktop illustrations hold many unrelated objects. A leotard has one set of lines, so pre-selection adds nothing here.
- Gap settings mostly repair art the tool did not draw. We own the line tool, so near-misses should be prevented at draw time, with gap logic kept as a fallback only if ever needed.
- Inkscape's rule that untouched segments vanish, and Figma's explicit destructive warning, are what to avoid. A pick must never alter unpicked regions.
- Curved Boolean artefacts are a warning for leotard lines, which are nearly all curves. Plate edges should reuse the seam's own samples rather than recompute an intersection. This is a design inference and needs checking against `strokeRegions`.
- Affinity's iPad behaviour (tap with no selection, drag across to include neighbours) is the closest touch precedent for the pick. Figma's toggle suggests tapping again to remove a region from the pick.

### Gaps
- Adobe's own pages refused fetch, so details rest on third-party articles and snippets. I could not verify the hover highlight Live Paint Bucket is commonly described as showing, or the behaviour of Illustrator's Shaper tool.
- Not documented in what I read: what happens to a Figma region fill when its points move or are deleted; current iPad gap detection in Illustrator; whether Corel's gap tolerance exists in current versions.

## 3. Line-divides-face tools: SketchUp and direct modellers such as Shapr3D, and why they are considered easy

### Takeaway
SketchUp's rule (a line across a face splits it, erasing the line heals it, the tool stays on) is the plainest version of the candidate, with a reputation for ease that is almost entirely anecdotal and a documented failure when a tiny gap or off-plane edge gives no face and no explanation. Parametric and direct CAD add region shading that doubles as a closure check, but make users project existing edges first, which is the same labour as tracing seams.

### Cited Findings
**SketchUp**
- A line whose two ends lie on a face's edges divides it into smaller faces; lines that cross an existing line or arc also split. Removing the dividing line heals the face into one. [doc] — [SketchUp help](https://help.sketchup.com/en/sketchup/dividing-splitting-and-exploding-lines-and-faces)
- Joined lines form a face. Erasing an edge also removes its adjacent face; redrawing the line restores it. [doc] — [SketchUp drawing basics](https://help.sketchup.com/en/sketchup/introducing-drawing-basics-and-concepts)
- Tools persist: the line tool keeps drawing until a new line or another tool. Inferences (endpoint, midpoint, intersection, axis, parallel) guide placement in colour, and pausing over a point makes the tool favour it. The same page warns that a line can look on-plane until the view is orbited. [doc] — [same page](https://help.sketchup.com/en/sketchup/introducing-drawing-basics-and-concepts)
- Why it is called easy: the vendor credits a compact toolset with an inference system instead of a large command set [snippet, vendor] — [user guide](https://courses.washington.edu/udpddp/User_Guide_EN_WIN.pdf). An O'Reilly book describes the inference engine working behind the scenes [snippet] — [O'Reilly](https://www.oreilly.com/library/view/google-sketchup-the/9780596804060/ch04.html). A hobbyist calls push and pull simpler than other programs [snippet] — [I Like To Make Stuff](https://iliketomakestuff.com/getting-started-with-sketchup-its-easy/).
- Research thin: a 2008 talk compared SketchUp with AutoCAD, 3ds Max and Maya to examine why novices find it easier (site certificate error; abstract line only) [snippet] — [Huang, L3D](https://l3d.cs.colorado.edu/l3d/calendar/2008.03.19-Huang.html); a study of one undergraduate covers push-pull techniques [snippet] — [Uygan and Turgut](https://avesis.ogu.edu.tr/yayin/4fc54afb-e98c-45a9-bd53-84268777d132/solving-net-related-problems-with-sketchup-an-undergraduate-students-emerging-instrumented-techniques-regarding-push-pull-tool).
- Failures: an edge that will not split a face usually means a gap in the edges, an off-plane edge, overruns past endpoints, or endpoints that differ by tiny amounts; diagnosis needs zooming, vertex labels or drawing test edges across the face. [forum, Oct 2020] — [SketchUp forum](https://forums.sketchup.com/t/edge-not-separating-faces/138704)
- Stray hidden segments also block faces. One commenter had nearly given up on SketchUp over this and asked for a tool that flags the bad edges; another spent an hour on a simple shape. [Mar 2010] — [Fine Woodworking](https://finewoodworking.com/2010/03/14/why-cant-i-get-a-face)

**Shapr3D (iPad, direct modelling)**
- Fingers handle the view and the Pencil creates. A Pencil tap on a face selects it and offers a suitable operation; a double tap selects the body. Tools adapt to the selection: one face offers offset, move, extrude or cut, and adding an edge narrows to revolve or loft. Four toolbars still sit on the left by default. (Reviews of Jun and Sep 2020.) — [DEVELOP3D](https://develop3d.com/reviews/review-shapr3d-ipad-parasoild-modelling/), [AEC Magazine](https://aecmag.com/technology/review-shapr3d/)
- The reviewer finds the gestures mostly intuitive but warns that users without direct-modelling grounding are unlikely to make sense of it. — [DEVELOP3D](https://develop3d.com/reviews/review-shapr3d-ipad-parasoild-modelling/)
- Picking a closed sketch profile takes the user straight into Extrude. [snippet] — [Shapr3D Extrude](https://support.shapr3d.com/hc/en-us/articles/26649987200796)
- A closed loop shows a shaded fill. No shading usually means a tiny gap, or that the lines are construction lines, which look similar and form no region until converted. [forum, Jul 2023] — [Shapr3D forum](https://discourse.shapr3d.com/t/convert-a-sketches-lines-of-this-type-to-be-able-to-extrude-it/26977)
- Body edges off the sketch plane must be projected before they can close a region; one user gave up and redrew the outline by hand. [snippet, forum] — [Shapr3D forum](https://discourse.shapr3d.com/t/projecting-a-closed-sketch-from-body-edges/3921)
- Touch complaints are in section 4.

**Fusion and Onshape (parametric sketch regions)**
- Fusion needs a watertight profile and tiny gaps break it; endpoints that look joined may not be coincident. [snippet, forum; exact thread-to-claim mapping unverified] — [Autodesk forum](https://forums.autodesk.com/t5/fusion-support-forum/sketch-won-t-produce-a-face-that-can-be-extruded/m-p/8261120/highlight/true), [Autodesk blog](https://www.autodesk.com/products/fusion-360/blog/quick-tip-unselectable-sketch-profile/)
- Forum advice for using existing body edges is to project them into the sketch so the profile can close; one reply says to delete a projected curve and project the whole body. [snippet, forum; exact mapping unverified] — [Autodesk forum](https://forums.autodesk.com/t5/fusion-support-forum/extrude-error/m-p/11274026)

### Inferences
- Ease evidence is reputational. The defensible reasons are few concepts, immediate visible results, persistent tools and inference that makes precision automatic. I found no controlled study establishing them.
- One of SketchUp's two main failures, off-plane edges, largely cannot happen to us because every line is projected onto the body. The other, the near-miss at a seam, remains.
- SketchUp's automatic split is right for a seam and wrong for an overlay: `construction-model.md` says an overlay never cuts the shell. The CAD sketch is the better precedent for overlays, because lines define regions without changing the solid until a feature uses a region.
- CAD's need to project existing edges is the same burden as tracing seams. The candidate's real advantage is that seams count automatically, which is the owner's request.
- Shaded fill as a closure signal is the cheapest useful borrowing. A region that lights up says the line landed, and needs no hover.
- Shapr3D's construction-line confusion warns against a look-alike line type that forms no regions.

### Gaps
- No rigorous study of SketchUp learnability was readable. No Shapr3D documentation on splitting a face with a line was reachable (support pages 403). SketchUp's small-face limits were not checked.

## 4. Modes and tool models: tool rail or contextual, noun-verb or verb-noun, spring-loaded modes, iPad practice, Pencil hover

### Takeaway
Theory favours object-first selection, yet its strongest advocate accepts modes for brush-like tools when the mode is shown where the user is looking, and iPad tools in practice keep a visible home for creation verbs, use contextual lists for modification, and assign roles by input type (Pencil creates, finger navigates). I found no controlled evidence comparing a tool rail with tab-launched or contextual tools, and hover is optional hardware that Apple says must not trigger actions.

### Cited Findings
**Theory**
- Tesler (ACM interactions, Jul-Aug 2012): when the verb comes first the system must enter a mode to wait for the object; when the object comes first the command can run at once. His error-recovery argument: a wrong selection is fixed by selecting again and a wrong command by undo. In tests, people who had never used a computer learned his near-modeless editor in about five minutes. Measured speed (Roberts and Moran, 1981, as he reports it): experienced Gypsy users beat NLS. — [Tesler 2012](https://trisquel.info/files/larry_tesler_modeless_copy_paste.pdf)
- Tesler's limit: he accepts modes in graphics editors when they fit a metaphor like picking up a brush and the current mode is displayed where the user is almost certain to be looking. — [Tesler 2012](https://trisquel.info/files/larry_tesler_modeless_copy_paste.pdf)
- Notes on Raskin's The Humane Interface (a course summary, not the book): noun-verb is inherently less modal since selecting content needs no cancel gesture; painting palettes are a recognised exception where verb-noun works better; quasimodes held by the body cause few mode errors but can become hand-twisters; transient modes cause fewer errors than lasting ones; monotony (one gesture per effect) helps habits form; adaptive interfaces hinder habits. [secondary] — [Brown CS notes](https://cs.brown.edu/courses/csci0920/2005/bell.raskin.pdf)
- NN/g (Laubheimer, 14 Apr 2019): modes are justified when features outnumber input types; show the active mode with at least two indicators, such as background and cursor; avoid modes where mistakes lose data; quasimodes prevent many slips but are less discoverable and less efficient for long stretches; modes can hide features. — [NN/g](https://www.nngroup.com/articles/modes/)
- Buxton's three-state model (INTERACT 1990): out of range, tracking, dragging. A touch surface senses only contact or none, so it cannot offer both tracking and dragging without an extra signal such as a key or pressure threshold. Lifting the finger can serve as selection but cannot carry motion; timeouts limit speed; giving a touch screen a tracking symbol surrenders direct dragging. — [Buxton 1990](https://billbuxton.com/3state.html)

**Rail or no rail**
- Figma UI3 (blog, 1 Oct 2024): after beta, floating side panels were reattached because they cramped the canvas, distracted, and slowed heavy users, with speed named as the deciding value; toolbars stayed floating at the bottom. — [Figma blog](https://www.figma.com/blog/our-approach-to-designing-ui3/)
- Forum feedback Jul-Oct 2024 includes people preferring the toolbar at the top, wanting to hide or move it, and asking to revert. [forum, snippet] — [Figma forum](https://forum.figma.com/share-your-feedback-26/ui3-feedback-3058/index6.html)
- Project state: no tool rail since 2026-10-29; Select is the default, and tools start from their tab or a key, with a mode bar stating what a click does. — `knowledge/engineering/app/studio-interface.md`

**iPad practice: tool selection and modifiers without a keyboard**
| App | Tool model | Modifier replacement | Source |
|---|---|---|---|
| Procreate | Gesture controls are remappable, with conflict warnings and adjustable hold delays; QuickMenu is off by default | Draw and hold to snap a stroke to a shape (a second-finger tap can also trigger the snap); Modify button plus touch combinations; squeeze assignable, with haptics (Pencil Pro, Procreate 5.3.10+) | [gestures](https://help.procreate.com/procreate/handbook/interface-gestures/gestures), [prefs 5.4, snippet](https://help.procreate.com/procreate/handbook/5.4/actions/actions-preferences), [Pencil Pro](https://help.procreate.com/articles/LA4SAi-apple-pencil-pro-procreate) |
| Shapr3D | Toolbars plus lists that adapt to the selection | Pencil tap-and-hold then move stands in for Shift (found only in a user thread, Jan 2025) | [AEC Magazine](https://aecmag.com/technology/review-shapr3d/), [forum](https://discourse.shapr3d.com/t/why-is-it-so-hard-to-use-shapr3d-on-an-ipad/35986) |
| Nomad Sculpt | Customisable shortcut bar and floating toolbars; a Gesture matrix assigns camera, sculpt, gizmo, material pick and object select to finger, stylus or mouse | Tap toggles and hold is temporary, called sticky keys behaviour; a long press on Mask starts a stroke in SelMask and reverts when the stroke ends | [Nomad interface](https://nomadsculpt.com/manual/interface) |
| Affinity Designer iPad | Not covered in the pages read | On-screen Command Controller or hardware keyboard | [iPad help](https://affinity.help/designer2ipad/en-US.lproj/pages/ObjectControl/floodingAreas.html) |
| Linearity Curve | Toolbar plus an Inspector whose sections follow selection or tool | Hold a second finger to lock aspect or snap to 45 and 90 degrees; extra fingers change pen handle behaviour; double-tap the end node to finish a path | [gestures](https://www.linearity.io/academy/curve/ipad/user-guide/shortcuts-and-gestures/tools-gestures), [interface](https://linearity.io/academy/curve/ipad/user-guide/workspace/interface) |
| Illustrator iPad | Not covered in the pages read | Floating Touch Shortcut: hold the centre for a primary action, slide to the edge for a secondary; double-tap locks it [snippet] | [Adobe](https://helpx.adobe.com/illustrator/using/touch-shortcuts-gestures.html) |
| SketchUp iPad | Main toolbar plus expanded toolset | Two-finger undo, three-finger redo; one-finger tap mappable to Select, double tap enters a group, triple tap selects connected geometry; long-press inference lock was planned in Sep 2022, with a May 2024 follow-up unanswered | [getting started](https://help.sketchup.com/en/sketchup-ipad/getting-started), [forum](https://forums.sketchup.com/t/tapping-with-1-or-more-fingers-for-tool-modifiers-and-inferences/208672) |

**Touch failures**
- Selection against drawing: on Shapr3D, small Pencil movements on touch-down were read as drawing, so selection failed; a user with tremor abandoned the iPad; another needed several attempts per line and later disabled most Pencil Pro settings. [forum, Dec 2023 to Jan 2025] — [Shapr3D forum](https://discourse.shapr3d.com/t/apple-pencil-selection-on-ipad/29270)
- After selecting a sketch on iPad the line tool activates, so picking lines risks drawing; the user found the Mac better for dimensioning because no drawing tool is active there; staff replied that there is no separate dimensioning mode. [forum, May 2022] — [Shapr3D forum](https://discourse.shapr3d.com/t/select-tool-ipad-pro/19449)
- No Shift key, so tutorials do not transfer, and a multi-select gesture had to be learned from another user. [forum, Jan 2025] — [Shapr3D forum](https://discourse.shapr3d.com/t/why-is-it-so-hard-to-use-shapr3d-on-an-ipad/35986)

**Apple Pencil hover and previewing**
- Apple's guidance (read 2026-10-31): hover predicts what a touch will do; keep previews stable as the Pencil moves; do not start actions from hover because it is imprecise; apply hover previews to Pencil rather than other pointers to avoid confusing feedback. Squeeze is a discrete, non-destructive action, its UI shown near the tip, and users may remap it. Double tap should honour the user's setting and not modify content by default. Barrel roll should change only the mark. — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble)
- Hover requires iPadOS 16.1+ and specific hardware; SketchUp lists iPad Pro M4 and iPad Air M2 with Pencil Pro or USB-C, and iPad Pro M2 with Pencil 2 or USB-C. — [Apple UIKit](https://developer.apple.com/documentation/uikit/adopting-hover-support-for-apple-pencil), [SketchUp iPad](https://help.sketchup.com/en/sketchup-ipad/getting-started)
- SketchUp iPad offers two drawing modes. Just Draw: touch, drag, lift, recommended for beginners. Click-Move-Click: light dragging previews inferences and a hard press, confirmed by a filling green circle, starts and ends operations. Hover reveals inferences before drawing. — [SketchUp iPad](https://help.sketchup.com/en/sketchup-ipad/getting-started)
- Nomad's Gesture matrix can limit finger drags to camera while the stylus sculpts. — [Nomad interface](https://nomadsculpt.com/manual/interface)

### Inferences
- The owner's instinct against a rail is not contradicted, but no comparable iPad tool removes the visible home for creation verbs entirely. Contextual lists serve modification; creation still has a button somewhere. The Shape tab is that home, so the concern is distance, not absence: on a touch screen with no keys the tab is the only route, and it is away from the drawing hand. A single Draw control on the stage, or Pencil contact itself starting a line, would close that distance.
- Keeping drawing as a mode is defensible under Tesler's own exception, provided the indicator is where the eyes are. The mode bar at the top of the stage is one indicator; the region tints on the body can be the second that NN/g asks for, and they sit at the point of attention. A cursor badge is unavailable on touch.
- Figma's lesson is about speed and canvas room rather than rails as such, so it does not transfer directly.
- Input type as mode (Pencil draws, finger views and taps) gives modelessness at no cost when a Pencil is present. It confirms the plan in `frictionless-design-flow.md`. Finger-only use still needs the tool state.
- A spring-loaded hold fits one rare need such as free-drawing without snap. Linearity's stacked finger holds show how quickly this stops being discoverable.
- Pressure-as-hover (Click-Move-Click) is not a starting point; SketchUp itself steers beginners away from it.
- Shapr3D's jitter reports imply that a tap needs a generous movement threshold, and that tremor is a real accessibility case.

### Gaps
- No controlled study of rail against contextual tools for 3D creative work was found, and no data on how long non-engineers take to find tab-launched tools.
- Raskin's book text itself was not available, only notes. Potter, Weldon and Shneiderman's take-off selection work could not be verified; Buxton's analysis of lift-to-select stands in for it.
- Procreate's Pencil-specific hover behaviour was not documented on the pages read.

## 5. Live or parametric editing against destructive editing: keeping a region tied to its lines

### Takeaway
There are four policies: freeze (Shape Builder, Smart Fill, Trace), re-derive by heuristics (Live Paint), re-resolve and flag failure (Fusion, Onshape), and regenerate from the geometry itself (SketchUp). Live Paint's published method (stable line identities plus which side of each line a region lies on) is directly reusable, and its authors found that no rule can always be right, so predictability and visible reasons matter more than cleverness.

### Cited Findings
**Live Paint (Asente, Schuster, Pettit, ACM TOG 26(3), 2007; Adobe)**
- Paths stay whole while regions and edges are derived; earlier planar-map systems (MapSketch, TicTacToon, Flash, Pathfinder) broke paths at intersections or forbade edits. — [paper](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf)
- On each change the system builds a new map and paints it from the old one. Paths have identifiers that persist; each region's context is every bordering path, which side of it the region lies on, and the covered stretch of that path. — [paper](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf)
- Rules: a new path dividing a region gives both parts the old fill; removing an open path merges regions and the largest old region's fill wins (not applied to closed paths, where it was unintuitive); unchanged context keeps its fill. Matching prefers fewest misses, then most hits, then boundary coverage, then parametric distance, which stops fills jumping across paths. — [paper](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf)
- The problem is ill-posed: with a circle cut by a line and two fills, moving the line off the circle has no right answer, and different users expect different results. The authors therefore aim for a reasonable result the user can understand. Moving a path does not always mean its regions should move. — [paper](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf)
- No memory: the result depends only on the current state and the edit, which they credit with predictability. — [paper](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf)
- Validation: experienced users felt results were unexpected about 2% of the time (98% correct), with the caveat that they knew how to avoid problem cases. Inexperienced users had higher error rates, but no more corrective undoing than with traditional tools. Test users grasped planar editing quickly while still expecting closed paths to stack as usual, which forced a dedicated closed-path rule. — [paper](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf)
- Largest failure class: art that looks stacked but is made of open paths (such as a rectangle from four crossing lines), since stacking semantics can only apply to closed paths. Also: interwoven shapes, scribbly self-crossing paths and thin rectangles. — [paper](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf)
- Gaps are found dynamically on each change and can move as the art changes; gap segments divide nothing in matching and never take a stroke. — [paper](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf)
- Scale: 1,154 paths and 8,388 regions was essentially unusable because of complexity rather than speed; users normally split complex art into simple, overlapping, non-interacting layers. Tiny edges and slivers from inexact intersections are a recognised problem for any planar system; merging them into neighbours and offering ranked choices are proposed but unbuilt. — [paper](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf)

**Onshape (parametric; 2015 thread, staff replies)**
- Sketch patches are identified by their bounding curves; when topology changes, references resolve to the best match among adjacent patches. Adding to an earlier sketch produced unexpected voids. Staff called the behaviour hard to reason about and a problem they now recognised. Workaround: reference the whole sketch rather than a region. [forum, staff] — [thread 1116](https://forum.onshape.com/discussion/1116/anyone-else-having-unexpected-things-happen-to-solids-when-adding-entities-to-a-previous-sketch), [comments](https://forum.onshape.com/discussion/comment/6779/)
- A user asked for the matching heuristic to be documented: "Complex is fine. Magic is problematic." (traveler_hauptman, Onshape forum, 2015) — [thread 1116](https://forum.onshape.com/discussion/1116/anyone-else-having-unexpected-things-happen-to-solids-when-adding-entities-to-a-previous-sketch)
- Later advice remains to edit the feature and re-add the lost region. [snippet, forum] — [Onshape forum](https://forum.onshape.com/discussion/21126/onshape-issues-with-linear-pattern-one-of-the-pattern-objects-disappears-after-completing-the-sketch)

**Fusion**
- A sketch edit can alter or remove a profile an extrude uses; in one report the extrude turned yellow after its profile went missing, with profile shading also switched off. The fix given is to edit the feature and reselect the profile. [snippet, forum; exact mapping unverified] — [Autodesk forum](https://forums.autodesk.com/t5/fusion-support-forum/error-in-extrude-after-changing-sketch-dimensions/m-p/10925899/highlight/true)

**Frozen results**
- Figma's shape builder and Inkscape's are destructive by statement or effect (section 2). Smart Fill objects survive deletion of their source curves — [Corel](https://product.corel.com/help/CorelDRAW/540238885/Main/EN/Documentation/CorelDRAW-Creating-objects-from-enclosed-areas.html). Affinity's Shape Builder gives the choice by mode (Add or Create) — [Affinity](https://affinity.help/designer2/en-US.lproj/pages/Tools/tools_shapeBuilder.html).
- SketchUp has no separate region, so erasing the line heals and erasing an edge removes the face. — [SketchUp](https://help.sketchup.com/en/sketchup/introducing-drawing-basics-and-concepts)

**Project state**
- An overlay records its shell lines as `bounds`; moving them moves it; deleting a bound line deletes the overlay (`dropOverlaysOn`), reported only in the impact of a silhouette change. — `knowledge/engineering/architecture/construction-model.md`

### Inferences
- A plate is a region with a material, so Live Paint's model transfers almost directly. Store each plate as a set of (line id, side), plus its own lines. On any line edit, re-derive and match by that record, with misses outranking hits so a plate cannot jump across a seam.
- The owner's plate should follow its seams when they move, so a live link is correct. Freezing would break the acceptance check in `frictionless-design-flow.md` that seam edits re-flow bound work.
- Deleting a bounding seam is the ill-posed case, and silent cascade deletion is the harshest answer. Three candidates: grow the plate to the next line out (Live Paint's merge); keep the plate's shape by turning that stretch into its own line (Corel-style survival, and physically sensible since the plate is real cloth); or refuse and explain. I favour keeping the shape and saying so with a notice, since a designer rarely means to lose a piece. Needs owner judgement.
- A new line across a plate on the shell layer should not divide it, because overlays sit on their own layer. Live Paint's observation that people separate complex art into non-interacting layers supports the project's per-overlay layers.
- Follow Onshape's correction rather than its first attempt: when a region cannot be resolved, show it and ask for a re-pick, as Fusion does, rather than resolving it silently.
- The no-memory rule is worth adopting: a plate pulled apart and rejoined need not recover an old state; undo handles that.

### Gaps
- Not readable: how CLO keeps or loses the link between a traced pattern and its source; Fusion's own documentation; any study of how non-engineers understand region identity. Live Paint's validation is unpublished in detail and comes from its authors at Adobe.

## 6. Mirror and symmetry: presentation and reliability when an operation crosses the plane

### Takeaway
Reliability comes from four parts that strong tools combine: a visible plane, snapping or a barrier close to it, a rule for work that crosses, and a repair command; painting tools make symmetry global and live, while pattern tools make it a link between pieces. The candidate suits symmetry because regions come from lines and their mirror images together, but a thin sliver at the centre, when a line stops just outside the snap distance, deserves testing.

### Cited Findings
| Tool | Presentation | Crossing or near the plane | Repair | Source |
|---|---|---|---|---|
| Procreate | Thin guide lines over the art; vertical is the default; drawing in one segment repeats live; Drawing Assist on by default; mirror or rotational | Not documented | None documented | [handbook](https://help.procreate.com/procreate/handbook/guides/guides-symmetry) |
| Nomad Sculpt | Global Sym button showing Local or World; planes drawn on the model; transform tools keep their own state | Some brushes behave imperfectly near planes | Mirroring copies one side to the other, with direction from the viewport and masks to protect; Split and Mirror cuts and welds and is destructive | [manual](https://nomadsculpt.com/manual/symmetry.html) |
| ZBrush | Global toggle (already in project notes) | Points near the plane that do not weld leave a seam; a tiny axis offset gives asymmetry; drag points across and the weld cuts them off [forum] | Mirror and Weld, one way, negative to positive by default | [ZBrushCentral](https://www.zbrushcentral.com/t/how-to-fix-the-topology-issue-like-this-one/349552), [Novedge](https://novedge.com/blogs/design-news/zbrush-tip-restore-bilateral-symmetry-with-mirror-and-weld-in-zbrush), [Polycount](https://polycount.com/discussion/comment/2642113) |
| Blender 5.2 | Live modifier, can be applied | Clipping stops vertices crossing and holds them on the plane; Merge snaps vertices within a distance onto the plane; Bisect cuts geometry that already crosses | Reapply; Bisect | [manual](https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/mirror.html) |
| CLO | Pieces: Clone Pattern with Linked Editing, with or without sewing; Remove Linked Editing is a right-click action; internal lines can be unlinked while the piece stays linked. 3D Pencil: a symmetry option [snippet] | Not documented | Unlink | [Clone](https://support.clo3d.com/hc/en-us/articles/115012333407-Clone-Pattern-with-Linked-Editing-Symmetry-Pattern), [Linked Editing](https://support.clo3d.com/hc/en-us/articles/115000354528-Linked-Editing), [New in 2026.0](https://support.clo3d.com/hc/en-us/articles/55461410696345) |
| Style3D | Symmetric clone with seam; Remove Linked Editing [snippet] | Not documented | Unlink | [Style3D](https://help.style3d.com/studio/en/c2c8/5869/0792/ebff/daa2/1036) |
| Turquin 2007, DressUp 2012 | Optional symmetry mode; front and back modes defaulting to both; a toggle | Not discussed | None | [Turquin](https://cs.brown.edu/~jhughes/papers/Turquin-ASI-2007/paper.pdf), [DressUp](https://www.jst.go.jp/erato/igarashi/projects/dressup/dressup_tei2012.pdf) |

- A CLO user reports that removing linked editing at piece level did not clear unwanted linking between lines within one piece, such as armhole and dart edges. [snippet, forum, single] — [CLO community](https://support.clo3d.com/hc/ja/community/posts/900003232863-How-to-unlink-pattern-unrelated-lines)
- Automatic pattern making treats seam symmetry as a tailoring constraint. — [Pietroni et al. 2022](https://igl.ethz.ch/projects/computational-patternmaking/)
- Project state: one global toggle; a line within 6 mm of or crossing the centre is one part, and the preview shows no copy, which makes the rule visible. Confirms the comparison in `mirror-toggle.md` (global for painting and sculpting, links for pattern tools). — `knowledge/engineering/architecture/mirror-toggle.md`

### Inferences
- The project's 6 mm rule corresponds to Blender's Merge distance. Blender adds two things worth comparing: Clipping (a hard stop at the plane) and a visible, user-set distance.
- Regions should be computed from each line plus its mirror image, so a line ending on the centre forms one continuous edge and the region across the centre is one piece. This fits the one-part rule without extra logic.
- Predicted failure: a line ending just outside 6 mm leaves a thin strip between it and its mirror image. Live Paint's sliver warning applies. A check to run: drag an endpoint from 0 to 15 mm off centre and watch the regions. Snapping endpoints to the centre when Mirror is on, and flagging near-centre stops in the preview, should close it.
- Tap on a region highlights its partner too, which matches the Hover rule in `studio-interface.md`. Touch needs the same in the selection state because it has no hover.
- A repair command (make this side match the other) exists in sculpting tools and has no equivalent in the Mirror toggle design, where a split is permanent except by undo. Worth considering if accidental splits occur, since the project already flags that risk.

### Gaps
- No documentation states what Procreate or CLO's 3D Pencil do when a stroke crosses the axis. Fusion's symmetry was not reachable (Autodesk 403). No usability evidence on mirror reliability with non-engineers was found.

## 7. Academic work on sketch-based garment design and pattern making from 3D

### Takeaway
The closest academic precedents are two small systems that had people draw on a mannequin, one with five users and one with a designer who co-authored the paper; they support drawing as the primary act and show novices need line smoothing and guides. Newer work centres on generation and reconstruction, and I found no study that evaluates region picking or seam division with fashion designers.

### Cited Findings
- **Turquin, Wither, Boissieux, Cani, Hughes (IEEE CG&A, Jan-Feb 2007; earlier version 2004).** The user sketches garment outlines over the character; distance from silhouette to body infers the 3D shape, ignoring physical constraints. The authors deliberately minimise modifier keys, buttons and modes: one button, contour and folding mode sets, front/back/both defaulting to both, optional symmetry; scribbling removes a line. A collaborating designer built the featured wardrobe in under an hour. — [paper](https://cs.brown.edu/~jhughes/papers/Turquin-ASI-2007/paper.pdf), [2004](https://cs.brown.edu/~jhughes/papers/Cani-SGF-2004/paper.pdf)
- That designer's sidebar: other 3D tools presuppose pattern-making knowledge, pattern-making is usually a separate job, the sketch interface asks only for drawing, and instant results let her move quickly between sketch and garment. She is a co-author and a single voice, so this is testimony and not a study. — [paper](https://cs.brown.edu/~jhughes/papers/Turquin-ASI-2007/paper.pdf)
- **DressUp (Wibowo, Sakamoto, Mitani, Igarashi; TEI 2012).** Tracked cutting and surface tools on a physical mannequin. A cut can be a loop or an unconnected line, and an unconnected line is extended automatically to the nearest cloth border; the user chooses whether a cut removes fabric or just inserts a seam; symmetry toggles. Lines are projected to the surface and smoothed. Flattening assumes stretch fabric, judged good enough for prototyping. — [paper](https://www.jst.go.jp/erato/igarashi/projects/dressup/dressup_tei2012.pdf)
- DressUp user study (5 people: 3 little sewing experience, 1 hobbyist, 1 with a clothing line): novices struggled with freehand drawing, prompting smoothing and guides; all found drawing harder without the physical mannequin; experienced users preferred no guides while novices felt more confident with them; both groups preferred the system over traditional methods, casual users for ownership, designers because pattern-making is tedious. Very small and informal. — [paper](https://www.jst.go.jp/erato/igarashi/projects/dressup/dressup_tei2012.pdf)
- **Robson, Maharik, Sheffer, Carr (2011).** Interprets 2D sketches using body context; the user study compared the believability of outputs, not usability. — [UBC](https://www.cs.ubc.ca/labs/imager/tr/2011/ContextAwareGarments/)
- **Bartle et al. (SIGGRAPH 2016).** Designers edit in 3D and the system computes patterns that reproduce the look under simulation, removing manual 2D edits; includes expert and amateur critiques (details not retrieved). — [UBC](https://www.cs.ubc.ca/labs/imager/tr/2016/PhysicsDrivenPatternAdjustment/)
- **Wang, Ceylan, Popovic, Mitra (2018).** Fold sketches estimate garment and body parameters at interactive rates and users edit the parameters; qualitative user study (not retrieved). The abstract calls traditional draping demanding of time and experience. — [arXiv](https://arxiv.org/abs/1806.11335)
- **Pietroni et al. (ACM TOG 41(4), SIGGRAPH 2022).** Automatically segments a 3D garment into patches whose boundaries become seams, tested on skintight and loose garments; handles seam symmetry, darts and grain; fast enough for designers to iterate. — [IGL](https://igl.ethz.ch/projects/computational-patternmaking/), [UTS](https://opus.lib.uts.edu.au/handle/10453/159497)
- **WasteBanned (Zhang, Mueller, Bernstein, Schulz, Leake; UIST 2024).** Formative work plus a tool for zero-waste design, where editing one region necessarily affects neighbouring panels; designers adapted patterns to bodies and added variation. Abstract only. — [Adobe Research](https://research.adobe.com/publication/wastebanned-supporting-zero-waste-fashion-design-with-linked-edits)
- **From Air to Wear (arXiv May 2025).** VR 3D sketch to garment. Fifteen designers from a 3D printing company rated controllability 6.45 and usefulness 6.62 out of 7, against 2.52 and 2.49 for a 2D sketch baseline. Not fashion designers, and the novice target group was not tested. — [arXiv](https://arxiv.org/html/2505.09998v1)
- **ChatGarment (CVPR 2025).** LLM estimates, generates and edits parametric patterns from images, sketches or dialogue; no user study mentioned on the abstract page. — [arXiv](https://arxiv.org/abs/2412.17811)

### Inferences
- DressUp's rule (an open line extends to the nearest border; decide afterwards between removal and seam) is the only garment precedent I found for the owner's grammar. It decides the verb after the line, which is noun-verb, and supports the design in section 10.
- Its novice findings argue for strong smoothing and for snap targets acting as digital guides. The physical mannequin finding suggests that orbiting and landmark guides matter, though it does not transfer directly to a screen.
- Evidence points toward drawing rather than pattern operations, but it comes from small and partly self-reported work. It is suggestive and cannot settle the question.

### Gaps
- ACM Digital Library was not used. The search for CHI, UIST and SIGGRAPH Asia 2023-2026 surfaced only WasteBanned and generative papers, so absence reflects limited search as well as possible scarcity. Unread leads named in DressUp: Wang et al., Computer-Aided Design 2009 (contour and style curves, aimed at industry users); Decaudin et al. 2006; Umetani et al., Sensitive Couture 2011.

## 8. Consumer garment tools and games

### Takeaway
Approachable garment tools make construction easy by removing it, offering catalogues and template parts, and none found exposes lines forming regions. They do offer a useful selection grammar: click the thing, then style it, with a question only when the target is ambiguous.

### Cited Findings
- Dressmaker (Steam, released 21 Sep 2026): the project's notes stand (catalogue parts, per-panel fabric, free rearrangement, AutoSew mod). No new evidence on whether players can draft their own patterns. — `knowledge/engineering/ux/dressmaker-build-loop.md`
- Tailornova: smart templates pitched as instant and single-click, a customisable 3D fit model, flats and made-to-measure patterns; $49 a month (date not stated). Beginner praise is from testimonials. [vendor] — [Tailornova](https://tailornova.com/)
- A 2018 review describes building from measurements and choosing length, neckline, closure and sleeves, with illustrated instructions. [snippet, old] — [Threads](https://www.threadsmagazine.com/2018/08/15/custom-patternmaking-services-web-extra)
- One aggregator shows a single rating of 2.0 out of 5, too few to mean anything. [snippet] — [SoftwareSuggest](https://www.softwaresuggest.com/us/pattern-making-software)
- Sims 3 Create-a-Style: a Build Mode tool; click the object; up to four pattern slots, each with up to four colour slots; drag a pattern or colour onto an object or another pattern; a pop-up asks which channel to overwrite when more than one applies; some parts, such as roofs, cannot be styled. Partly closes the project's stated gap. [single, tutorial] — [Mod The Sims](https://modthesims.info/article.php?p=3932645)

### Inferences
- Region drawing is beyond what consumer tools attempt, so the Silhouette catalogue should stay the fast path and drawing the deeper tool. This confirms `consumer-garment-creators.md`.
- Dragging a swatch onto a target gives continuous contact, so highlighting under the finger works without hover. It suits touch as a second route to pick and assign a region at once.
- The pop-up only on ambiguity is a good model: a tap that has one meaning acts, and a tap with two meanings asks.

### Gaps
- No Tailornova usability reviews were found. Whether Sims 4 dropped the tool rests on the Wikipedia statement already in the project; my search did not independently confirm it.

## 9. What fashion designers find intuitive, and what they want from 3D tools

### Takeaway
Direct evidence is weak: qualitative work consistently finds that 2D drawing stays the designer's creative centre, that 3D is often a specialist role, and that pattern-first thinkers find 3D tools misaligned. I found no study that directly measures preference between Illustrator flats and 3D, or that tests region or line operations with fashion designers.

### Cited Findings
- 2D CAD served as a key creative tool in longitudinal case studies, and 3D work was judged to need a new tier of specialist CAD designers. [snippet, 2008] — [Wallace, Salford](https://salford-repository.worktribe.com/output/1336934/a-study-of-3d-cad-and-implications-for-training-and-skills-in-the-fashion-industry)
- Argues the regular designer is not necessarily equipped or productive in virtual 3D, and that the software creates a role combining 2D illustration style with prototyping. [snippet] — [The Future Figured, MMU](https://e-space.mmu.ac.uk/629687/3/The%20Future%20Figured%20-%20Submission%20Bloomsbury_%2031%2005%2021.pdf)
- Two interviews found technophobia, upfront cost and training as main barriers. [snippet, very small] — [Sayem, MMU](https://fashioninstitute.mmu.ac.uk/assets/uploads/2019/07/71-Virtual-fashion-ID-a-reality-check-Abu-Sadat-Muhammed-Sayem.pdf)
- Designers adopt 3D mainly for efficiency and creative exploration; pattern-first designers face misalignment; small designers work hybrid, physical and digital. The authors call their sample indicative only. — [Martin and Seo 2026](https://ualresearchonline.arts.ac.uk/id/eprint/26648/)
- A study of nine designers finds mid-to-late-career designers must absorb complex tools while working. [snippet] — [Yates, ITAA 2025](https://www.iastatedigitalpress.com/itaa/article/id/21950/)
- Survey: perceived usefulness associates with intention to use 3D simulated software. [snippet] — [ITAA 2022](https://www.iastatedigitalpress.com/itaa/article/id/15784/)
- Vendor views: designers mix software, with Adobe tools for concept work and a recognised learning curve around simulation and pattern construction [vendor] — [Style3D blog](https://www.style3d.com/blog/what-3d-fashion-software-do-fashion-designers-use/); implementation meets resistance even where Adobe tools are in use [vendor, snippet] — [CLO notice](https://www.clo3d.com/en/resources/notices/86); Adobe's 2023 report surveyed 423 professionals [vendor, snippet] — [Adobe 3D Trends](https://www.adobe.com/content/dam/cc/us/en/cct/shared/Adobe_3DTrendsReport_ENGLISH.pdf).
- Consumer perception, not designer preference: 440 Chinese women rated 3D virtual clothing slightly closer to real garments than 2D flats, and fit judgments differed. — [Wang, Kwon, Kim 2020](https://pure.ewha.ac.kr/en/publications/a-comparison-on-clothing-appearance-of-2d-flat-sketch-3d-virtual-/)
- A designer's testimony and a five-person study favour drawing over pattern operations (section 7). — [Turquin](https://cs.brown.edu/~jhughes/papers/Turquin-ASI-2007/paper.pdf), [DressUp](https://www.jst.go.jp/erato/igarashi/projects/dressup/dressup_tei2012.pdf)

### Inferences
- This supports the synced 2D flat in `frictionless-design-flow.md`, because flats are the habit designers bring. Drawing the two plate lines on a flat should feed the same regions.
- Designers who already use Illustrator may know Live Paint or Shape Builder, which would make region picking familiar. No source confirms these tools are used in fashion flats, so this is a lead for the owner's own contacts to test.
- The whole premise rests on thin evidence. A hands-on test with three to five designers would likely teach more than further reading.

### Gaps
- No survey on Illustrator flats against 3D; no data on which CLO operations designers skip; no evaluation of on-body seam drawing with professionals beyond DressUp. Gymnastics or dancewear designers specifically were not found in any study.

## 10. Testing the candidate: draw lines, the app shows the regions, a click picks a region

### Takeaway
The candidate's core is right and removes both things the owner objects to (seams count without tracing, and nothing is cut until a region is chosen), but as worded it fails or says nothing on near-miss lines, when the pick must happen, what a line means before the pick, later edits, slivers, and touch without hover. A workable version keeps the tool on across several lines, shows regions as tints at all times in the tool, treats a tap as a reversible pick, and ties plates to lines by identity and side.

### Cited Findings
| Step | Evidence for | Evidence of failure | Source |
|---|---|---|---|
| Existing lines count without tracing | Live Paint, Figma, Smart Fill and Flood Fill all derive regions from any lines; test users grasped planar editing quickly | CAD needs projection first and users redraw; CLO and Style3D need the edges selected | [Asente](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf), [Shapr3D](https://discourse.shapr3d.com/t/projecting-a-closed-sketch-from-body-edges/3921), [CLO](https://support.clo3d.com/hc/en-us/articles/115012381528-Trace) |
| Lines that do not quite meet | Inference points guide line ends onto existing geometry; DressUp extends open ends to the nearest border | Tiny gaps give no region and little explanation; users lose hours; gap settings confuse | [SketchUp](https://help.sketchup.com/en/sketchup/introducing-drawing-basics-and-concepts), [DressUp](https://www.jst.go.jp/erato/igarashi/projects/dressup/dressup_tei2012.pdf), [Fine Woodworking](https://finewoodworking.com/2010/03/14/why-cant-i-get-a-face), [Adobe](https://community.adobe.com/t5/illustrator-discussions/live-paint-bucket-fill-tool-not-working-within-closed-paths/m-p/14373402) |
| Showing regions | Shaded fill signals closure in Shapr3D; Figma fills automatically; Inkscape strips the view to outlines | Hidden shading or look-alike construction lines confuse; too many paths is unusable | [Shapr3D](https://discourse.shapr3d.com/t/convert-a-sketches-lines-of-this-type-to-be-able-to-extrude-it/26977), [Wallace](https://madebyevan.com/figma/introducing-vector-networks/), [Inkscape](https://wiki.inkscape.org/wiki/Release_notes/1.3), [Asente](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf) |
| One click picks | Affinity taps with no selection; Shapr3D picks a profile and enters the operation; Tesler: reselecting is the cheap fix | Slivers; plates spanning cells need merging (drag or Shift+Enter elsewhere); tap read as draw on Shapr3D | [Affinity](https://affinity.help/designer2ipad/en-US.lproj/pages/ObjectControl/floodingAreas.html), [Shapr3D](https://support.shapr3d.com/hc/en-us/articles/26649987200796), [Tesler](https://trisquel.info/files/larry_tesler_modeless_copy_paste.pdf), [MD](https://support.marvelousdesigner.com/hc/en-us/articles/47358340247193-Flatten), [Shapr3D forum](https://discourse.shapr3d.com/t/apple-pencil-selection-on-ipad/29270) |
| What a line is | CAD sketch lines leave the solid alone; Live Paint leaves paths whole; DressUp asks removal or seam after the cut | SketchUp's automatic split would cut the shell, the owner's complaint; the largest Live Paint failure is stacking expected from open paths | [SketchUp](https://help.sketchup.com/en/sketchup/dividing-splitting-and-exploding-lines-and-faces), [Asente](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf), [DressUp](https://www.jst.go.jp/erato/igarashi/projects/dressup/dressup_tei2012.pdf) |
| Later edits | Live Paint about 98% expected with experienced users, using stable ids and sides | Ill-posed by nature; Onshape's silent re-resolve confused users; Fusion needs a re-pick | [Asente](https://perso.lisn.upsaclay.fr/mbl/FundHCI/papers/Asente-SIGGRAPH07.pdf), [Onshape](https://forum.onshape.com/discussion/comment/6779/), [Fusion](https://forums.autodesk.com/t5/fusion-support-forum/error-in-extrude-after-changing-sketch-dimensions/m-p/10925899/highlight/true) |
| No hover | Selection can stand in for preview; lift or contact can commit; Apple says hover must not act anyway | Touch has only two states; hover hardware is limited; Flatten and VStitcher closure rely on hover and keys | [Buxton](https://billbuxton.com/3state.html), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble), [SketchUp iPad](https://help.sketchup.com/en/sketchup-ipad/getting-started), [VStitcher](https://help.browzwear.com/hc/en-us/articles/4921558026265) |

Project facts this test relies on (documentation and code read, app not run):
- The overlay tool today takes one line whose two ends lie on other lines, computes regions without changing the document, and then asks for the pick; an outline started in the open still works as before. — `knowledge/engineering/architecture/construction-model.md`
- Hover in Select shows exactly what a click would choose, for mouse and Pencil; touch has no hover; one finger draws or places in tools and two fingers turn and zoom. — `knowledge/engineering/app/studio-interface.md`
- In code, a line begun on a line goes straight into choosing when it reaches the next line, and the pick then adds the overlay and returns to Select, so a second line cannot be added first. — `app/src/ui/tools.js:545-547, 570-577, 585-595`
- A press in a drawing tool acts on pointer-down (`down` calls `penClick`), including the region pick (`chooseSide`). The region preview and the rubber band to the next point both update on pointer move. On touch there is no move before contact, so as written a finger's pick commits on touch-down with no region preview, and the next span shows only after the tap. — `app/src/ui/tools.js:283, 393-397, 529, 585`
- Line snapping uses an 8 px radius, and Select treats 5 px of movement as turning rather than a click. — `app/src/ui/tools.js:531, 411`

### Inferences
**Diagnosis of the owner's case.** The code confirms the pick is forced straight after the first line. A plate with two new edges therefore needs either two cuts or a traced outline. The fix is a matter of sequence: keep the tool on until the user taps, as SketchUp keeps its line tool on. Line one lands and the regions re-tint, line two lands and they re-tint, then a tap picks. The count is two lines and one tap, and no seam is traced or cut.

**Proposed grammar, to be prototyped.**
1. One act: draw. A line ending near a line snaps to it visibly. Regions re-tint when it lands, which also shows it closed.
2. A tap inside a region picks it. The tool stays on until a tap or Done, and no pick is ever demanded. The rule that separates a pick from a placed point is under "The click-to-place conflict" below.
3. Region first, verb after, with one entry shortcut:
   - Started from Add a plate: a tap commits at once, one undo step, and undo returns to the lines with nothing lost.
   - Started from plain Draw: a tap selects and offers Plate, Separate piece, Cut out.
   - Lines not used by a plate become seams when the tool ends, as they do now, so a seam needs no extra step. Lines used by a plate become its edges and the shell stays whole.
4. Tap again on another region to add it, tap a picked one to remove it; adjacent cells merge into one plate. Dragging across regions, as Illustrator and Affinity allow, is not available in this tool because one finger draws or places there.

This has two forms of different risk. The smaller change keeps two entry verbs, seam (cuts as it lands) and plate (cuts nothing). The larger one has a single Draw and no entry verb. Tesler's argument favours the single tool because the wrong verb is cheap to change, while SketchUp's appeal favours an immediate visible effect. I would build the smaller one first, because it answers the complaint directly, and test the larger on the owner.

**Line meaning.** Avoid a visible draft line type. Shapr3D's construction lines show the confusion a look-alike type causes, and a two-phase sketch-then-feature flow is what makes CAD feel like engineering. The line should look like a line at once, and only its use decides what it becomes.

**On a touch screen with no hover.** Each desktop hover duty needs a replacement:
- What can I pick: always-on region tints while in the tool, hidden with the existing lines switch. A faint wash per region is one option, so the design stays readable.
- Exactly which region and its mirror: shown by the tap, because selection is reversible and free. Mouse and Pencil hover remain a bonus showing the same thing a moment sooner, in line with the existing Hover rule. Today a finger's pick commits on touch-down with nothing shown first, so this is the first thing to change for touch. Acting on lift instead of pointer-down lets the region light during contact and lets the finger slide off to cancel (Buxton's lift transition).
- Where the next point and span will land: shown during contact, since contact is a state touch does have. Place points on lift rather than on press, so touch-down shows the point and span, a drag adjusts them and lift confirms. This replaces the rubber band that only hover drives now. It is the touch equivalent of SketchUp's Just Draw. Highlight the snap target under the moving end and magnetise it. Hover on supported Pencils adds this before contact, as in SketchUp.
- Commit: a tap, with undo as the safety net, and no confirmation dialog. NN/g advises using confirmations sparingly and Tesler's error model covers it.
- Tap against drag: use a generous movement tolerance (to be tuned; 5 px in Select today is small for a hand on a tablet, and should be tested with a shaky hand as the Shapr3D reports suggest). With a Pencil present, Pencil draws and finger taps pick and turn, by a Nomad-style input matrix, which avoids the ambiguity altogether.
- Small cells under a finger: two-finger zoom already works in tools. Tapping the same spot could cycle between overlapping candidates. Worth testing with cells below the 36 to 44 px touch targets noted in `studio-interface.md`.
- Assign in one motion: drag a fabric swatch onto a region, with the region lit under the finger and commit on lift (ColorDrop and Create-a-Style precedents), noting that the finger hides what it is over.
- Optional accelerators, never required: Pencil squeeze for a palette near the tip (Apple's guidance), second-finger hold for free-drawing without snap (Linearity, Nomad).

**The click-to-place conflict.** Lines in this app are drawn by placing points, so a tap also means add a point. Workable rule: while a line is in progress a tap adds a point; with no line in progress a tap on a line or within snap distance starts one, and a tap inside a region picks it. Lines that start in the open then need another start, such as a press-drag or a Pencil stroke. This conflict is the largest open interaction risk in the candidate. It should be prototyped early.

**Other failure handling.**
- Near-miss: snap at draw time with a generous radius; extend an open end to the nearest line after lift, as DressUp does; if a line still lands nowhere, leave it visibly unclosed and say so in the mode bar rather than showing nothing, which is the SketchUp failure.
- Overruns and slivers: trim line ends that pass a seam by a small distance; absorb very thin regions, or at least do not offer them as picks; check the centre case in section 6.
- Later edits: section 5. Follow the seam on move; never lose a plate silently on delete.
- Discoverability: the mode bar needs a live prompt that changes with state (draw the new edges; tap the area you want), since nothing else teaches this, and Resnick's self-revealing principle in `creativity-tool-principles.md` applies. The Flatten and VStitcher hover cues only work for people who have read the manual.
- Occlusion: a region wrapping behind the body needs its hidden part hinted. The existing faint edge for what runs behind the body covers this. Offer the view turn on pick as with `prefs.followCamera`.
- Where regions are the wrong tool: a free appliqué still needs a closed loop in the open, and an edge that should stop short of a seam needs its own line. Keep both. A magnetic outline (VStitcher lists Magnetic Trace) could later serve plates that follow part of a seam loosely, but it is not the owner's request.

**Paradigm answer to the owner.** The evidence supports "lines first, then choose the area", held in a tool that stays on, with the tool started from a visible place rather than a permanent rail. It is SketchUp's persistence, CAD's non-cutting lines, Live Paint's identity rules and iPad flood fill's tap, on a body. The overhaul's removal of the rail stands, with one change worth testing: putting Draw on the stage, because on a touch screen the tab is the only route today.

**Tests that would validate this** (proposed acceptance checks, in the style of `frictionless-design-flow.md`):
1. The owner's plate takes exactly two lines and one tap, with Mirror on and no extra steps for the second side.
2. The shell's piece count is unchanged by the plate, and undo returns to the two lines.
3. An endpoint released within the snap radius of a seam closes; one released outside says so.
4. Regions re-tint on the frame the line lands.
5. Moving either bounding seam moves the plate; deleting one has a stated result and a notice.
6. Every step works on an iPad with no hover, using finger only and using Pencil only.
7. A tap with a few millimetres of jitter still registers as a tap.
8. A line ending 0 to 15 mm from centre never creates an unreachable sliver.
9. Three to five designers complete the plate unaided from the mode-bar prompt. DressUp's five-person format is the precedent.

### Gaps
- None of the evidence tests region picking on a 3D body with non-engineers, so all of the above transfers from 2D tools, CAD and small garment systems. Occlusion, grazing-angle picks and regions wrapping the body have no direct precedent beyond the locked views in CLO and MD and rotation in DressUp.
- Whether designers read an overlay plate as a region at all, or instinctively want to outline it, is unknown. Live Paint's finding that people expect stacking from a shape that looks stacked suggests some will try to outline it, so the free-outline route must stay obvious.
- Tap tolerance, snap radius and sliver threshold need measurement on the real app; no source gives numbers for a body-scale garment.
