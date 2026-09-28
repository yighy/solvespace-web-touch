// Touch and Android fixes for the SolveSpace web edition.

// Escape: the Android back gesture (and a hardware Esc key, which Android turns into
// "back") sends Escape to SolveSpace instead of leaving the page.
(() => {
  if (window.__ssEsc) return;
  window.__ssEsc = 1;
  const N = 20; // history entries kept in reserve, i.e. consecutive Escapes without touching
  let depth = 0;
  const esc = () => {
    const c = document.getElementById('canvas0') || document.body;
    ['keydown', 'keyup'].forEach(type => {
      const e = new KeyboardEvent(type, { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true });
      Object.defineProperty(e, 'keyCode', { get: () => 27 });
      Object.defineProperty(e, 'which', { get: () => 27 });
      c.dispatchEvent(e);
    });
  };
  // Chrome skips history entries added without a user gesture, so refill on each interaction.
  const refill = () => { while (depth < N) { depth++; history.pushState({ ssEsc: depth }, ''); } };
  addEventListener('pointerdown', e => { if (e.isTrusted) refill(); }, true);
  addEventListener('keydown', e => { if (e.isTrusted) refill(); }, true);
  addEventListener('popstate', e => { depth = (e.state && e.state.ssEsc) || 0; esc(); });
  // Safety net: ask before leaving if the reserve runs out.
  addEventListener('beforeunload', e => { e.preventDefault(); e.returnValue = ''; });
})();

// Touch: one-finger gestures behave like a mouse (two and three fingers are left to
// SolveSpace), and a long press is a right click, with a finger as well as a mouse/trackpad.
(() => {
  if (window.__ssTouch) return;
  window.__ssTouch = 1;
  const TAP = 10, LONG = 500, DBL = 350;
  // mode: 0 = idle, 1 = one-finger gesture (handled here), 2 = multi-finger (SolveSpace), 3 = end of multi (ignored)
  let mode = 0, cv, sx, sy, lx, ly, drag = false, longT = null, longDone = false, lastTap = 0, ltx = 0, lty = 0;
  const fire = (type, x, y, button, buttons, t = cv, m = {}) => t.dispatchEvent(new MouseEvent(type, {
    bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y,
    button, buttons, detail: type === 'dblclick' ? 2 : 1, ...m }));
  const block = e => { e.preventDefault(); e.stopImmediatePropagation(); };
  const isCv = t => t && t.tagName === 'CANVAS' && /^canvas\d+$/.test(t.id);

  const start = e => {
    if (mode === 0) {
      if (e.touches.length !== 1 || !isCv(e.target)) return;
      mode = 1; cv = e.target;
      const t = e.touches[0];
      sx = lx = t.clientX; sy = ly = t.clientY;
      drag = false; longDone = false;
      block(e);
      fire('mousemove', sx, sy, 0, 0); // hover: SolveSpace only updates the hovered item on motion
      longT = setTimeout(() => {       // long press = right click
        longT = null;
        if (mode !== 1 || drag) return;
        longDone = true;
        if (navigator.vibrate) navigator.vibrate(30);
        fire('mousedown', sx, sy, 2, 2);
        fire('mouseup', sx, sy, 2, 0);
      }, LONG);
    } else if (mode === 1) {           // second finger: hand over to SolveSpace
      clearTimeout(longT);
      if (drag) fire('mouseup', lx, ly, 0, 0);
      mode = 2;
    } else if (mode === 3) {
      block(e);
    }
  };

  const move = e => {
    if (mode === 1) {
      block(e);
      if (longDone) return;
      const t = e.touches[0];
      lx = t.clientX; ly = t.clientY;
      if (!drag && Math.hypot(lx - sx, ly - sy) > TAP) {
        drag = true;
        clearTimeout(longT);
        fire('mousedown', sx, sy, 0, 1);
      }
      if (drag) fire('mousemove', lx, ly, 0, 1);
    } else if (mode === 3) {
      block(e);
    }
  };

  const end = e => {
    if (mode === 1) {
      block(e);
      clearTimeout(longT);
      if (drag) {
        // SolveSpace drops motion events received before it has repainted, so resend the
        // final position two frames later to make sure it is taken into account.
        // Release first (completes a selection rectangle or a point drag), then one extra
        // press with no release: SolveSpace places a tool's next point (rectangle, line,
        // circle...) on press. A release after it would clear the selection when the
        // finger is lifted over empty space.
        const x = lx, y = ly, t = cv;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          fire('mousemove', x, y, 0, 1, t);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            fire('mouseup', x, y, 0, 0, t);
            fire('mousedown', x, y, 0, 1, t);
          }));
        }));
      } else if (!longDone && e.type === 'touchend') {
        fire('mousedown', sx, sy, 0, 1);
        fire('mouseup', sx, sy, 0, 0);
        fire('click', sx, sy, 0, 0);     // closes open menus, like a real click
        const now = Date.now();
        if (now - lastTap < DBL && Math.hypot(sx - ltx, sy - lty) < 25) {
          fire('dblclick', sx, sy, 0, 0);
          lastTap = 0;
        } else {
          lastTap = now; ltx = sx; lty = sy;
        }
      }
      mode = e.touches.length ? 3 : 0;
    } else if (mode === 2) {           // first finger lifted: SolveSpace gets the end, ignore the rest
      mode = e.touches.length ? 3 : 0;
    } else if (mode === 3) {
      block(e);
      if (!e.touches.length) mode = 0;
    }
  };

  // Mouse / trackpad: left button held still = right click.
  // The real press is held back until we know whether it is a click, a drag or a long press.
  let mp = null, skipClick = false; // mp.s: 0 = pending, 1 = drag (real events), 2 = long press done
  addEventListener('mousedown', e => {
    if (!e.isTrusted || e.button !== 0 || !isCv(e.target)) return;
    skipClick = false;
    block(e);
    const p = mp = { t: e.target, x: e.clientX, y: e.clientY, s: 0,
      m: { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey } };
    p.timer = setTimeout(() => {
      if (mp !== p || p.s) return;
      p.s = 2;
      if (navigator.vibrate) navigator.vibrate(30);
      fire('mousedown', p.x, p.y, 2, 2, p.t, p.m);
      fire('mouseup', p.x, p.y, 2, 0, p.t, p.m);
    }, LONG);
  }, true);
  addEventListener('mousemove', e => {
    if (!e.isTrusted || !mp) return;
    if (mp.s === 2) return block(e);
    if (mp.s === 0) {
      if (Math.hypot(e.clientX - mp.x, e.clientY - mp.y) <= TAP) return block(e);
      clearTimeout(mp.timer);
      mp.s = 1;
      fire('mousedown', mp.x, mp.y, 0, 1, mp.t, mp.m); // real motion events follow as usual
    }
  }, true);
  addEventListener('mouseup', e => {
    if (!e.isTrusted || e.button !== 0 || !mp) return;
    const p = mp;
    mp = null;
    clearTimeout(p.timer);
    if (p.s === 0) {
      block(e);
      fire('mousedown', p.x, p.y, 0, 1, p.t, p.m);
      fire('mouseup', p.x, p.y, 0, 0, p.t, p.m);
    } else if (p.s === 2) {
      block(e);
      skipClick = true; // otherwise the browser's "click" would close the menu right away
    }
  }, true);
  addEventListener('click', e => {
    if (skipClick && e.isTrusted) { skipClick = false; block(e); }
  }, true);

  const o = { capture: true, passive: false };
  addEventListener('touchstart', start, o);
  addEventListener('touchmove', move, o);
  addEventListener('touchend', end, o);
  addEventListener('touchcancel', end, o);
})();
