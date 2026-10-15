---
type: Technique
title: Observer and glare model
description: "The star-shaped flare of a rhinestone is made mostly by the eye or camera, not the stone; render radiometrically to an HDR buffer, then apply a named, selectable observer preset (naked eye in arena, broadcast camera, phone photo, studio with star filter), each a documented glare kernel plus exposure and tone curve."
tags: [rendering, glare, bloom, observer, camera]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
    author: claude-code/claude-opus-5-5
  - id: spencer1995
    resource: https://doi.org/10.1145/218380.218466
    title: "Spencer et al., Physically-based glare effects for digital images, SIGGRAPH 1995"
    author: org:acm
  - id: ritschel2009
    resource: https://doi.org/10.1111/j.1467-8659.2009.01357.x
    title: "Ritschel et al., Temporal Glare, CGF 2009"
    author: org:wiley
  - id: hullin2011
    resource: https://doi.org/10.1145/2010324.1965003
    title: "Hullin et al., Physically-based real-time lens flare rendering, TOG 2011"
    author: org:acm
  - id: wiki-spike
    resource: https://en.wikipedia.org/wiki/Diffraction_spike
    title: Wikipedia, Diffraction spike
    author: org:wikipedia
  - id: ue-bloom
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/bloom-in-unreal-engine
    title: "Epic, Bloom (UE 5.8)"
    author: org:epic-games
  - id: chrome-129
    resource: https://developer.chrome.com/blog/new-in-webgpu-129
    title: "Chrome, What's new in WebGPU 129"
    author: org:google
---

# Takeaway

**The perceived "star" of a rhinestone is created mostly by the imaging system**, not the stone:
aperture blades and lens bloom in a camera, the eye's own optics in person.[^wiki-spike][^report]
Since designers compare against photographs and broadcast footage, compute light physically up to the
HDR buffer and then apply a **named, selectable observer** (naked eye, broadcast camera, phone photo).
This is a **product decision worth making early**, because it defines what "accurate" is judged
against.[^report][^srr] It fits the owner's "appears correct" target
([decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md)).

# Facts

- Glare in eye and camera: Spencer et al. 1995 (physically based glare);[^spencer1995] Ritschel et al.
  2009 (eye-anatomy-based, GPU real-time, time-varying glare; psychophysics: glare raises perceived
  brightness and dynamic glare is often preferred);[^ritschel2009] Hullin et al. 2011 (real-time lens
  flare).[^hullin2011]
- Spikes: a stopped-down iris forms a polygon and each edge gives a pair of opposite spikes — an even
  blade count gives as many spikes as blades, an odd count twice as many; in the eye, eyelashes, lid
  edges and lens sutures give shimmering spikes; cross-screen "star" filters create them deliberately.[^wiki-spike]
- Unreal convolution bloom uses a kernel image of how a camera or eye scatters a point source
  (energy-conserving, costly); classic bloom does not produce streaks or flares.[^ue-bloom]
- HDR displays can show sparkle above paper white in WebGPU (Chrome 129).[^chrome-129]

# Observer presets

**[INFERRED]** (research-note proposal):[^srr]

| Preset | Glare | Notes |
|---|---|---|
| Naked eye in arena | Ciliary corona / needle pattern fluctuating in time, small bloom (Spencer, Ritschel) | Dynamic |
| Broadcast camera | Aperture diffraction spikes (count from blade number), sensor/lens bloom, clipping to white with a coloured rim | What TV viewers see |
| Phone photo | Small-aperture spikes, strong bloom, aggressive tone curve | What parents and coaches share |
| Studio photo with star filter | Deliberate star pattern | Catalogue look |

Implementation: convolve the sparse sparkle layer with a point-spread kernel — a small streak filter in
2–3 directions or an FFT/kernel-image convolution — restricted to that layer to keep cost low; apply
per channel before tone mapping ([temporal stability and HDR](/engineering/rendering/sparkle/sparkle-temporal-stability-and-hdr.md));
each preset documents kernel, exposure and tone curve. On HDR displays less exaggerated glare is needed.

Gaps: no measured eye/camera PSFs for this use; no evidence on how broadcast gymnastics is shot (star
filters, shutter, iris).[^srr]

[^srr]: Research notes: real-time sparkle rendering, section 6 (in-bundle mirror)
[^report]: Research report, lighting and observer section (in-bundle mirror)
[^spencer1995]: Spencer et al. 1995
[^ritschel2009]: Ritschel et al. 2009
[^hullin2011]: Hullin et al. 2011
[^wiki-spike]: Wikipedia, Diffraction spike
[^ue-bloom]: Epic bloom docs
[^chrome-129]: Chrome WebGPU 129 notes
