# NOCTIS — The City Is Asleep

A premium, minimal, single-page scrollytelling website for **NOCTIS**, a fictional electric luxury vehicle brand.

> *"A city in total blackout at night where the car's light is the only light in the world. Quiet, expensive and precise: huge empty space, few words, perfect motion."*

---

## ⚡ Key Highlights

- **Pure Vanilla Stack**: Built with plain HTML, CSS, and vanilla JavaScript only. Zero frameworks, zero build tools, zero npm packages, and zero external JS libraries.
- **Scroll-Scrubbed Canvas Engine**: High-performance frame sequence player rendered entirely on `<canvas>` with device pixel ratio scaling (capped at 2), sub-frame lerp interpolation (`lerpSpeed: 0.15`), and nearest-frame caching fallback for zero flicker.
- **Strict Architectural Minimalism**:
  - Zero gradients (no linear, radial, conic, or text gradients).
  - Zero glassmorphism (no blur, no backdrop-filter, no frosted glass).
  - Flat solid tones (`#07080A` asphalt, `#121418` graphite, `#EDEAE4` bone, `#CFE3FF` xenon, `#E1251B` taillight) and 1px hairlines.
- **Custom Headlight Cursor**: Desktop-only 6px solid xenon dot inside a 28px hairline ring that smoothly morphs into a 44×2px light blade over interactive elements.
- **Word-by-Word Reveal**: Engineering manifesto text smoothly lights up word-by-word with scroll progression.
- **Interactive Vehicle Lineup**: 5-slide hover accordion with debounced state transitions, specs, color swatches, and keyboard navigation.

---

## 📁 Repository Structure

```text
├── assets/
│   ├── cars/                 # 5 studio lineup images (gt-e, s, x, r, one in WebP)
│   └── frames/
│       ├── hero/             # 600 joined 1600px desktop hero frames (WebP)
│       ├── hero-mobile/      # 600 mobile 960px hero frames (WebP)
│       ├── dismantle/        # 200 desktop dismantle frames (WebP)
│       └── dismantle-mobile/ # 200 mobile dismantle frames (WebP)
├── config.js                 # Central configuration for frame counts, telemetry, chapters, callouts
├── index.html                # Semantic HTML5 markup
├── styles.css                # Pure design token styles and layout
├── main.js                   # Canvas scrollytelling engine and interactions
└── README.md
```

---

## 🚀 Running Locally

The site requires no compilation or package installations. Run with any static HTTP server:

### Option 1: Python
```bash
python -m http.server 8080
```

### Option 2: VS Code Live Server
Right-click `index.html` and select **"Open with Live Server"**.

Visit `http://localhost:8080` in your browser.
