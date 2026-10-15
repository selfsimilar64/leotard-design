---
type: Technique
title: Geometry libraries and porting cost
description: "The mature geometry-processing libraries (geometry-central MIT, libigl MPL-2.0, pmp-library MIT; CGAL GPL/commercial) are C++; no production-grade JS/WASM or Rust equivalent was verified, so the needed kernel must be compiled to WASM or hand-written."
tags: [geometry, libraries, licensing, wasm, porting]
stale_after: 2027-10-15T00:00:00Z
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: gc
    resource: https://github.com/nmwsharp/geometry-central
    title: geometry-central repository and docs
    author: org:geometry-central
  - id: potpourri
    resource: https://github.com/nmwsharp/potpourri3d
    title: potpourri3d
  - id: libigl
    resource: https://libigl.github.io/license/
    title: libigl licence
    author: org:libigl
  - id: cgal
    resource: https://www.cgal.org/license.html
    title: CGAL licence
    author: org:cgal
  - id: pmp
    resource: https://github.com/pmp-library/pmp-library
    title: pmp-library
  - id: gpjs
    resource: https://github.com/GeometryCollective/geometry-processing-js
    title: geometry-processing-js
  - id: meshlib
    resource: https://github.com/MeshInspector/MeshLib
    title: MeshLib
  - id: bvh
    resource: https://github.com/gkjohnson/three-mesh-bvh
    title: three-mesh-bvh
  - id: openabf
    resource: https://github.com/educelab/OpenABF
    title: OpenABF
  - id: xatlas
    resource: https://github.com/jpcy/xatlas
    title: xatlas
  - id: clipper2
    resource: https://github.com/AngusJohnson/Clipper2
    title: Clipper2
  - id: bff
    resource: https://github.com/GeometryCollective/boundary-first-flattening
    title: Boundary First Flattening
  - id: g3sharp
    resource: https://github.com/gradientspace/geometry3Sharp
    title: geometry3Sharp
  - id: baby-shark
    resource: https://github.com/dima634/baby_shark
    title: baby_shark (Rust)
  - id: parry
    resource: https://github.com/dimforge/parry
    title: parry (Rust)
  - id: swn
    resource: https://github.com/nzfeng/SWN
    title: Surface winding numbers code
  - id: report
    resource: /references/research/research-report.md
    title: "Research report (in-bundle mirror)"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), sections 3, 4 and 5"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**The geometry toolkit exists as mature open-source C++ (geometry-central and libigl cover nearly every
algorithm needed under permissive licences), but not in ready-made form for the web or Rust; porting or
rewriting the small kernel actually needed is real work whichever engine is chosen.**[^report][^gg-notes]
Avoid CGAL unless buying a commercial licence.

# Library table

| Library | Licence | Language / platform | Relevant contents |
|---|---|---|---|
| geometry-central[^gc] | MIT | C++ (Eigen, CMake; CI Linux/macOS/Windows) | halfedge mesh, intrinsic triangulations, heat / vector heat / signed heat, flip geodesics, geodesic tracing, BFF, Poisson-disk surface sampling, GCVT, stripes |
| potpourri3d[^potpourri] | MIT | Python bindings to geometry-central | heat, signed heat, fast marching, vector heat/log map, flip geodesics, tracing |
| libigl[^libigl] | MPL-2.0 core; optional modules pull CGAL, TetGen, CoMISo (copyleft) and Triangle (unusual/commercial) | C++ | SLIM reference implementation (`igl/slim.h`) |
| CGAL[^cgal] | kernel LGPL; most algorithms GPL v3+; commercial from GeometryFactory | C++ | parameterisation menu, Seam_mesh |
| pmp-library[^pmp] | MIT | C++; documented cross-compilation to JavaScript, browser demo | remeshing, smoothing, curvature, geodesic distances, hole filling, parameterisation |
| geometry-processing-js[^gpjs] | MIT | pure JS + Eigen via Emscripten (asm.js), three.js viewers | teaching / demos |
| MeshLib[^meshlib] | source-available; commercial licence required | C++ with C, C#, Python, JS/WASM APIs | booleans, offsets, projection |
| three-mesh-bvh[^bvh] | MIT | JS (three.js) | BVH raycast, closest point, refit, skinned, WebGPU |
| OpenABF[^openabf] | Apache-2.0 | header-only C++17 (Eigen) | ABF++, angle-based LSCM, hierarchical LSCM |
| xatlas[^xatlas] | MIT | C++11, Python bindings | atlas segmentation, parameterisation, packing |
| Clipper2[^clipper2] | Boost | C++/C#/Delphi; WASM, TypeScript, Rust ports | polygon booleans and offsets (seam allowance) |
| BFF app[^bff] | MIT | C++ (SuiteSparse) | boundary-first flattening |
| geometry3Sharp[^g3sharp] | Boost | C# (.NET 8 update in progress) | curve insertion, exp-map local param |
| SWN[^swn] | MIT, but main branch needs Gurobi | C++ | surface winding numbers |
| baby_shark; parry[^baby-shark][^parry] | MIT; Apache-2.0 | Rust | remeshing/booleans; collision queries — no geodesics or parameterisation |

All via the research note.[^gg-notes] Unverified: maintained WASM builds or npm packages of
geometry-central or libigl; sparse-solver performance in WASM; Rust heat-method or LSCM implementations.[^gg-notes]

# Platform strategy **[INFERRED]**

- **Native:** geometry-central + libigl.
- **Browser:** compile the C++ stack to WASM (pmp-library documents JS cross-compilation;
  geometry-processing-js shows Eigen under Emscripten) or hand-implement the small kernel: halfedge mesh,
  BVH, geodesic tracing, Dijkstra/flip geodesics, one sparse Cholesky solve for LSCM/ARAP.
- **Rust:** would mean writing geodesics and parameterisation or binding C++.

Engine choice context: see [/engineering/](/engineering/about.md).

[^gc]: geometry-central.
[^potpourri]: potpourri3d.
[^libigl]: libigl licence.
[^cgal]: CGAL licence.
[^pmp]: pmp-library.
[^gpjs]: geometry-processing-js.
[^meshlib]: MeshLib.
[^bvh]: three-mesh-bvh.
[^openabf]: OpenABF.
[^xatlas]: xatlas.
[^clipper2]: Clipper2.
[^bff]: Boundary First Flattening.
[^g3sharp]: geometry3Sharp.
[^swn]: Surface winding numbers.
[^baby-shark]: baby_shark.
[^parry]: parry.
[^report]: Research report (in-bundle mirror).
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
