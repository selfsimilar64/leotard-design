---
type: Decision
title: A pattern's stones are kept apart by the parallel rule
description: "Owner direction of 2026-11-04: the parallel rule (no overlaps within a pattern, decided every frame, same stones as the old one-by-one check) is the look and the default. Supersedes 'stones may overlap' for patterns; the live preview stays the design, and two groups may still overlap each other."
tags: [decision, stones, procedural, patterns, gpu, spacing]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T23:45:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-04 (Claude Code session)
    title: "The parallel rule looks most like our older system, no overlaps, runs fast: make it the look"
    author: human:mattj
  - id: overlap
    resource: /decisions/2026-11-04-stones-may-overlap.md
    title: Stones may overlap; the live preview is the design
  - id: peaks
    resource: /engineering/architecture/parallel-stone-spacing.md
    title: Stones kept apart by a parallel rule
  - id: plan
    resource: /product/roadmap/webgpu-and-stone-engine-plan.md
    title: WebGPU renderer and one GPU stone engine (plan), decision 3 and Phase 0.3
---

# Decision

Shown the three versions side by side (the old one-by-one check, stones that overlap, and the parallel rule), the owner
chose the parallel rule as the look: it "looks most like our older system, no overlaps, runs fast".[^owner] It is now on
by default (`render/engine.js` stoneCtx `peaks: true`; `stones/pattern.js` keepPattern runs it unless `opts.peaks` is
`false`). This supersedes [stones may overlap](/decisions/2026-11-04-stones-may-overlap.md) for patterns.[^overlap]

# Context

The overlap decision dropped the clearance check so that what a drag shows is the result and the stones could be placed
on the GPU. The parallel rule keeps both of those: every candidate is decided from the candidates alone (an order and a
conflict list worked out when they are drawn), in rounds that a shader can run, and the rounds end with exactly the stones
the old sequential check kept.[^peaks]

# Consequences

- **Within one pattern, no two stones come closer than 0.92 of touching** (a scatter, clusters, stardust, galaxy: their
  `gap`), the stones a design hangs on (joints, nodes, a scatter's big stones) kept first. Where a design asks for more
  than fits, stones drop out rather than overlap.
- **The live preview is still the design**: the rule runs on every frame of a drag, so nothing changes on release.
- **Scatters keep their gap by the rule**: the share-thinning by size (each size keeping the blue-noise tile's first
  points) only applies with the rule off.
- **Two groups may still overlap each other**: the rule works within a pattern. One rule across groups is an open
  question for the owner.[^plan]
- Cost: the conflict list is worked out when candidates are drawn (a spacing or size change, not a move); now a
  typed-array grid, per size class on mixed scatters. The GPU stone engine runs the same rule as compute (plan, Phase 3).

# Revisit if

The rule's rounds become the slow part at 100 000 stones on the GPU, or the owner wants stones of different groups
kept apart too.

[^owner]: Conversation with the product owner, 2026-11-04.
[^overlap]: Stones may overlap; the live preview is the design.
[^peaks]: Stones kept apart by a parallel rule.
[^plan]: WebGPU renderer and one GPU stone engine (plan).
