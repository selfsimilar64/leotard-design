---
type: Playbook
title: Bundle conventions
description: How knowledge is written, organised, attributed and checked in this OKF v0.2 bundle; read before adding or editing any concept.
tags: [meta, conventions, okf]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:00:00Z }
sources:
  - id: okf-spec
    resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
    title: Open Knowledge Format v0.2 specification
    author: team:googlecloudplatform
  - id: owner-2026-10-15
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: Instruction to keep all project knowledge in OKF
    author: human:mattj
---

# Purpose

This directory is the single home for everything the leotard design project knows: product
intent, user decisions, domain facts, engineering architecture and research findings. It follows
the Open Knowledge Format v0.2,[^okf-spec] as the product owner asked on 2026-10-15.[^owner-2026-10-15]
Code lives in the sibling project folders (`poc-threejs/`, `pipeline/`); the long-form research
notes and the report stay where they are (`research_notes/`, `reports/`) and are mirrored here as
`Reference` concepts under [/references/](/references/about.md).

**Rule for every session and agent:** when you learn, decide or build something worth keeping,
record it here in the same change, then run the checker and regenerate the indexes (see *Tooling*).

# Layout

| Directory | Holds | Typical types |
|---|---|---|
| `/product/` | Vision, personas, role-based capabilities, requirements, roadmap, open questions | `Product Vision`, `Persona`, `Requirement`, `Roadmap`, `Open Question` |
| `/decisions/` | One file per decision, named `YYYY-MM-DD-short-slug.md` | `Decision` |
| `/domain/` | Facts about leotards and their trade, independent of our software: fabrics, embellishments, garment anatomy and styles, construction, sizing, rules, market | `Domain Concept`, `Catalog`, `Design Rule`, `Process` |
| `/engineering/` | How our software works or should work: architecture, data model, rendering, geometry, pipeline, environment | `Architecture`, `Component`, `Technique`, `Data Model`, `Environment` |
| `/references/` | Mirrors of material outside the bundle (research notes, report, specs), so `sources` can point inside the bundle | `Reference` |

Every directory has an `about.md` (`type: Section`) whose `description` becomes that directory's
blurb in its parent `index.md`. `index.md` and `log.md` are reserved (SPEC §3.1).

# Concept documents

- **One idea per file**, named in `kebab-case.md`. Prefer several small linked concepts to one
  long one. A concept should be readable alone.
- **Lead with the takeaway** in the first paragraph, then structure (headings, tables, lists).
- **Separate fact from inference.** Mark claims that are our own reasoning or design, not found in
  a source, with **[INFERRED]**. Mark unverified or single-source claims with **[UNVERIFIED]**.
- **Links** between concepts use bundle-absolute paths: `[fabric stack](/domain/fabrics/fabric-stack.md)`.
  Linking to a concept that does not exist yet is allowed (SPEC §6.1) and marks knowledge to write.
- **Code references** use project-relative paths in backticks, e.g. `poc-threejs/src/body.js`,
  with a function or constant name rather than a line number where possible (line numbers rot).

## Required and recommended frontmatter

```yaml
---
type: Domain Concept                 # REQUIRED. Use the vocabulary below where it fits.
title: Mystique (foil-dot) fabric
description: One sentence; it becomes the index entry and search snippet.
tags: [fabric, foil]
status: stable                       # draft | stable | deprecated (absent = stable)
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:00:00Z }
verified: { by: human:mattj, at: 2026-10-16T09:00:00Z }   # only when that actor really checked it
stale_after: 2027-10-15T00:00:00Z    # for time-sensitive facts: prices, catalogues, engine status
sources:
  - id: gk-cat-127
    resource: https://...            # URL, /bundle/path.md, or a scope descriptor
    title: GK Elite 2026-27 catalogue p.127
    author: org:gk-elite
---
```

`title`, `description` and `generated` are house-required (the checker warns without them).

## Type vocabulary

Use these before inventing new ones: `Product Vision`, `Persona`, `Requirement`, `Roadmap`,
`Open Question`, `Decision`, `Domain Concept`, `Catalog` (tabular reference data such as stone
sizes or colour lists), `Design Rule` (a constraint the software checks or enforces), `Process`
(a real-world workflow such as factory production order), `Architecture`, `Component` (a code
module), `Data Model`, `Technique` (a rendering or geometry method), `Environment`, `Playbook`,
`Reference`, `Section`.

## Actors (SPEC §7)

- `claude-code/<model-id>` for Claude Code sessions, e.g. `claude-code/claude-opus-5-5`.
- `human:mattj` for the product owner. Only the owner's own review justifies a `human:` entry in
  `verified`. Recording what the owner *said* in a conversation is `generated` by the agent with
  the conversation as a source, not `verified` by the owner.
- `process:<id>` for scripts, e.g. `process:okf-check`.
- Source `author` values may also use `org:<name>` or `team:<name>`.

## Provenance

- Every factual concept carries `sources`. Cite claims with footnotes whose label is a
  `sources[].id`: `Mystique dominates competition bodies.[^gk-blog]` and at the end
  `[^gk-blog]: GK Elite blog on leotard fabrics`.
- When a fact came from our research notes, cite both the original URL (as found in the note)
  and the note's mirror under `/references/research/`, so lineage stays inside the bundle.
- Owner statements cite a scope descriptor such as
  `conversation with the product owner, 2026-10-15 (Claude Code session)`.

## Decisions

A `Decision` concept records: **Decision** (one sentence), **Context**, **Consequences / how to
apply**, and **Revisit if**. Never delete a superseded decision: set `status: deprecated`, add
`superseded_by: /decisions/<file>.md`, and link forward from its body.

## Frontmatter subset

No YAML library is assumed. Keep frontmatter within this subset, which `scripts/okf.py` parses:
plain or quoted scalars; flow lists `[a, b]`; flow maps `{ by: x, at: y }`; block lists whose
items are scalars, flow maps or one-level block maps (`- id: x` then indented `resource: y`); and
one-level block maps. **Quote any scalar containing `: `** (colon-space) or starting with
`[`, `{`, `'`, `"`. No multi-line strings, anchors or nested block maps deeper than one level.

# Tooling

Run from the bundle root (`knowledge/`):

```bash
python scripts/okf.py check
python scripts/okf.py index
```

`check` enforces SPEC §11 conformance (errors) and the house rules above (warnings: missing
recommended keys, broken links, footnotes without a source, stale concepts). `index` rewrites
every `index.md`; never edit those by hand. After a meaningful change, add a dated entry to the
root [log](/log.md) and commit. Since 2026-10-18 the bundle is part of the project repository
(`knowledge/` inside `selfsimilar64/leotard-design` on GitHub, private), with its earlier history
folded in; commit from the project root.
