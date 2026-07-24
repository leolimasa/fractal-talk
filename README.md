# Fractals — An Interactive Talk

A pure HTML + CSS + JavaScript presentation about fractals, built on
[Reveal.js](https://revealjs.com/). Everything is a self-contained static
bundle — no build step, no runtime CDN dependencies.

## Running

Serve the folder from any static web server, e.g.:

```bash
python3 -m http.server 8099      # then open http://localhost:8099
# or
npx serve .
```

Open `index.html` through the server (not `file://`, so the vendored
scripts load correctly).

## Navigation

Because the interactive slides capture mouse clicks/scroll, the deck is
driven by the keyboard:

- **→ / ↓ / Enter** — next slide
- **← / ↑** — previous slide

## Slides

| # | Slide | Interaction |
|---|-------|-------------|
| 1 | Title | — |
| 2 | Sierpiński triangle (chaos game) | Click a vertex (A/B/C), click a start point, keep clicking vertices. **Space** auto-runs / pauses (pausing reveals the name + formula). Drag to pan, scroll to zoom. |
| 3 | Mandelbrot set | Scroll to zoom (about the cursor), drag to pan. |
| 4 | Square | Click to fade in `Perimeter = 4`, then `Area = 1`. |
| 5 | Mandelbrot set (again) | Same as #3. |
| 6 | Barnsley fern | Live IFS parameter sliders, drag to pan, scroll to zoom. |
| 7 | Fractals in nature | Procedurally generated SVGs (trees, snowflakes, galaxies, lightning, coastlines, ferns). |

## Structure

```
index.html                 Deck markup + slide sections
css/style.css              Dark theme, overlays, slider panel, layout
js/util.js                 Canvas/pointer/camera helpers
js/sierpinski.js           Chaos-game renderer (2D canvas)
js/mandelbrot.js           WebGL fragment-shader renderer
js/square.js               Unit-square slide
js/barnsley.js             IFS fern + parameter sliders
js/nature.js               Procedural SVG fractal gallery
js/main.js                 Reveal.js init + slide→module controller
vendor/reveal/             Vendored Reveal.js core + black theme
```

## Implementation note

The `slides.md` spec suggested the
[deep-mandelbrot](https://github.com/munrocket/deep-mandelbrot) library for
the Mandelbrot slides. That project is a private, unbundled Svelte
application (it renders itself into `document.body` and isn't published as a
consumable module), so embedding it inside a Reveal slide isn't practical.
Instead the Mandelbrot slides use a self-contained WebGL shader renderer
here that provides the same experience — smooth-colored rendering with
mouse-wheel zoom (about the cursor) and drag-to-pan.

## Image credits

The nature-slide photographs live in `pictures/`. `lightning-fractal.jpg` is
["Large lightning bolt"](https://commons.wikimedia.org/wiki/File:Large_lightning_bolt.jpg)
by **Guilerms**, licensed **CC BY-SA 4.0** (attribution + share-alike required).

## Testing

An end-to-end Playwright suite drives every slide (clicks, spacebar
auto-run, zoom, sliders, navigation) and asserts each fractal actually
renders pixels. See `scratchpad/test.mjs`. It expects a static server on
`http://localhost:8099` and a Chromium binary path in
`scratchpad/chrome-path.txt`.
