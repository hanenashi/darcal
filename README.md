# https://hanenashi.github.io/darcal/

## TL;DR
Darcal is a single-page, browser-only calendar maker. Drag/resize the calendar block, tweak fonts and spacing, preview a full year, then export **12 SVGs in a ZIP**—no install, no backend.

## What it does
- Live SVG calendar for any year/month, A-series/B-series/custom sizes (mm).
- Language presets (EN/CZ/JA), weekday first-day toggle, short/long names.
- Draggable + resizable **settings window**; position/size persist.
- Pan/zoom canvas (mouse drag, wheel; touch drag, pinch). **+ / −** keys zoom.
- Drag/resize the calendar block with guides and handles (mm HUD).
- One-click **ZIP export** (12 months).

## Use it
1. Open the URL above.
2. Click **Settings** (or press **O**) and adjust year, size, fonts, spacing.
3. Drag the calendar block on the page to position/size it.
4. Pan/zoom the canvas to inspect details.
5. Click **Generate All** → preview window → **Download ZIP (12 SVG)**.

## Controls
- **Pan**: drag empty background (desktop); one-finger drag (touch).
- **Zoom**: mouse wheel (cursor-centered), **+ / −** keys, two-finger pinch.
- **Settings**: click **Settings**, press **O**, or drag the window by its header.
- **Reset view**: ⤾ button in the settings header.
- **Calendar block**: drag inside the guide; resize via corner/edge handles.

## Tips
- Settings/window position and view are saved in `localStorage`.
- If ZIP download doesn’t trigger, allow pop-ups for the site.
- SVGs use millimeters in `width/height` and a pixel `viewBox` for DTP friendliness.

## Tech
- Vanilla HTML/CSS/JS, inline SVG generation.
- ZIP via [JSZip CDN].
- No build step or server; runs on GitHub Pages.

## Dev (local)
```bash
# clone and run a simple static server
git clone https://github.com/hanenashi/darcal.git
cd darcal
# any static server works; examples:
python -m http.server 8000
# then open http://localhost:8000/
```

## License
TBD.
