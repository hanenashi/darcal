# https://hanenashi.github.io/darcal/

**Darcal** is a browser-only calendar maker. Drag/resize the calendar block, tweak fonts & spacing, then export **12 SVGs in a ZIP**. No installs. No backend.

## TL;DR
Open the link → click **Settings** → set year/size/fonts → drag the calendar into place → **Generate All** → **Download ZIP**.

## Handy bits
- **Pan**: drag background (touch: one-finger).  **Zoom**: mouse wheel, **+ / −**, pinch.
- **Settings**: button or **O**. Draggable/resizable; position persists.
- **Rulers & guides**: toggle in Settings. Millimeter grid vibes.
- **Holidays**: load `holidays.json` (supports per-region or flat map).

## Dev (local)
```bash
python -m http.server 8000
# then open http://localhost:8000/
