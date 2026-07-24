/* Shared utilities for the fractal slides. */
const FT = {
  /* Resize a canvas to fill the viewport, honoring devicePixelRatio.
     Returns true if the backing size changed. */
  fitCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      return true;
    }
    return false;
  },

  /* Pointer position in backing-store (canvas) pixels. */
  pointerPos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy,
    };
  },

  show(el) {
    if (el) el.classList.add("visible");
  },
  hide(el) {
    if (el) el.classList.remove("visible");
  },

  /* A simple pan/zoom camera mapping world <-> screen coordinates.
     screen = world * scale + offset  */
  makeCamera(scale, offX, offY) {
    return {
      scale,
      ox: offX,
      oy: offY,
      toScreen(wx, wy) {
        return { x: wx * this.scale + this.ox, y: wy * this.scale + this.oy };
      },
      toWorld(sx, sy) {
        return { x: (sx - this.ox) / this.scale, y: (sy - this.oy) / this.scale };
      },
      /* Zoom keeping the world point under (sx, sy) fixed on screen. */
      zoomAt(sx, sy, factor) {
        const w = this.toWorld(sx, sy);
        this.scale *= factor;
        this.ox = sx - w.x * this.scale;
        this.oy = sy - w.y * this.scale;
      },
      panBy(dx, dy) {
        this.ox += dx;
        this.oy += dy;
      },
    };
  },
};
