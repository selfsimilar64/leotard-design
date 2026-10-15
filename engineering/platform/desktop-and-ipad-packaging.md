---
type: Architecture
title: Packaging three.js as a desktop and iPad app
description: "The owner targets a native desktop and iPad app on three.js. The research covered Electron (fixed Chromium 152), Tauri (system webview, WKWebView on macOS and iOS) and PWAs; Electron does not reach iPad, so the iPad route is an open question."
tags: [platform, packaging, electron, tauri, ipad, desktop]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-04-15T00:00:00Z
sources:
  - id: decision-platform
    resource: /decisions/2026-10-13-native-desktop-and-ipad-target.md
    title: Decision, native desktop and iPad target
  - id: decision-engine
    resource: /decisions/2026-10-15-threejs-over-unreal.md
    title: Decision, three.js over Unreal
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (sections 7 and 8)"
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
  - id: electron
    resource: https://releases.electronjs.org/
    title: Electron releases
  - id: tauri
    resource: https://v2.tauri.app/reference/webview-versions/
    title: Tauri webview versions
  - id: tauri-cli
    resource: https://registry.npmjs.org/@tauri-apps/cli/latest
    title: npm registry, Tauri CLI
  - id: godot-web
    resource: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
    title: Godot docs, exporting for web (PWA notes)
  - id: plasticity
    resource: https://github.com/nkallen/plasticity
    title: nkallen/plasticity repository
  - id: spline-v2
    resource: https://alternativeto.net/news/2026/8/spline-v2-launches-with-rebuilt-3d-editor-ai-agents-webgpu-and-new-desktop-app/
    title: AlternativeTo on Spline v2
  - id: webkit26
    resource: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
    title: WebKit, Safari 26.0
---

# Takeaway

The owner's target is a **native desktop app plus iPad/tablets**; browser prototyping is fine and
share-by-link is not a priority.[^decision-platform] The engine is three.js.[^decision-engine]
So three.js code must ship inside a packaged web runtime. The research (which assumed a browser
product) covered Electron, Tauri and PWAs.[^notes-web][^report] **Electron covers desktop; the iPad
route is not settled by the research.** **[INFERRED]**

# Options found in the research

| Option | Runtime | Desktop | iPad | Notes |
|---|---|---|---|---|
| Electron | Bundled Chromium (44.7.1 ships Chromium 152, 13 Oct 2026) | Windows, macOS, Linux | **No** | One known Chromium everywhere: WebGPU, HDR canvas, low-latency canvas, raw pointer events; a few versions behind Chrome stable (155-156)[^electron][^notes-web] |
| Tauri 2 (CLI 2.12.x) | System webview, none bundled | WebView2 (self-updating Chromium) on Windows; WKWebView on macOS (tied to OS); WebKitGTK on Linux | WKWebView on iOS (tied to OS) | WebGPU on macOS only from macOS 26; Linux WebKitGTK status unverified[^tauri][^tauri-cli][^notes-web] |
| PWA | The browser | Yes | Safari | Offline caching only after first load; browsers may evict cached data[^godot-web] |

Precedents: Plasticity ships as Electron + three.js;[^plasticity] Spline v2 shipped a rebuilt macOS
and Windows desktop app alongside its three.js WebGPU runtime (whether Electron is unstated).[^spline-v2][^notes-web]

# Consequences **[INFERRED]**

- **Desktop:** Electron gives a fixed, current Chromium, so WebGPU and HDR output can be baseline
  on desktop rather than progressive enhancement, and the WebGL 2 fallback matters mainly for old
  GPUs.
- **iPad:** any web-runtime route (Tauri iOS, PWA, or another WKWebView wrapper not covered by the
  research) inherits Safari/WebKit's constraints: WebGPU only on iPadOS 26+, no
  `pointerrawupdate` or desynchronised canvas for pen latency, unknown memory ceilings; see
  [WebGPU availability](/engineering/platform/webgpu-availability.md).[^webkit26] If those bite, the
  research's native alternatives are [Filament](/engineering/platform/filament.md) or a
  [hand-rolled renderer](/engineering/platform/hand-rolled-renderer.md) on iPad, which would split
  the codebase.
- Packaging also changes backend assumptions: designs can be stored locally first, with cloud
  sync optional, since link sharing is not a priority.

# Open questions

- Which iPad wrapper (Tauri iOS, Capacitor-style WKWebView shell, PWA) and whether App Store
  review accepts it. Not researched.
- Measured frame rate and memory of the three.js POC inside WKWebView on a recent iPad. No
  measurements exist anywhere in the sources.[^report]

[^decision-platform]: Decision, native desktop and iPad target
[^decision-engine]: Decision, three.js over Unreal
[^notes-web]: Research notes, web engine options, sections 7-8
[^report]: Research report, engine section
[^electron]: Electron releases
[^tauri]: Tauri webview versions
[^tauri-cli]: npm, Tauri CLI
[^godot-web]: Godot docs, PWA notes
[^plasticity]: Plasticity repository
[^spline-v2]: AlternativeTo, Spline v2
[^webkit26]: WebKit, Safari 26.0
