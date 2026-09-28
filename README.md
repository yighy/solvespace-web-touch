# SolveSpace Web Touch

A copy of the [official SolveSpace web edition](https://solvespace.com/webver/solvespace.html)
that can be installed as an app on Android (icon, fullscreen, offline) and works with touch.

**Open:** https://yighy.github.io/solvespace-web-touch/
then, in Chrome, menu ⋮ → **Add to Home screen** / **Install app**.

## What it adds to the official version

- **Escape**: the Android back gesture and a keyboard's Esc key send Escape to
  SolveSpace (deselect, cancel a tool) instead of leaving the app.
- **One finger = a mouse**:
  - tap = click (exactly where the finger is), double tap = double click;
  - drag = mouse drag (move a point, selection rectangle); while drawing (rectangle,
    line, circle…), lifting the finger places the point;
  - long press (0.5 s) = right click (context menu).
- **Two and three fingers**: unchanged (zoom, moving the view).
- **Mouse / trackpad**: left button held still for 0.5 s = right click.

All of this is in [`android.js`](android.js).

## How it works

The SolveSpace web edition uses threads (`SharedArrayBuffer`), which require the
`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers. GitHub Pages cannot
send custom headers, so the [`sw.js`](sw.js) service worker adds them (the page reloads
once on the very first visit). It also caches the files for offline use.

## Updating SolveSpace

```powershell
powershell -ExecutionPolicy Bypass -File update.ps1
```

The script downloads the official files again, regenerates `index.html` and bumps the
cache version so the installed app updates. Then commit + push.

## License

SolveSpace is free software under the GPLv3 ([COPYING.txt](COPYING.txt)).
The `solvespace.*`, `solvespaceui.*` and `filemanagerui.js` files are the unmodified
official web edition; the source code is at https://github.com/solvespace/solvespace.
The additions in this repository are under the same license.
