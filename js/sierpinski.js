/* Sierpiński triangle — chaos game.
   FSM:
     'vertex'  : waiting for the first vertex click
     'start'   : waiting for the starting point click
     'iterate' : each vertex click adds a midpoint; SPACE auto-runs

   Points accumulate on the main canvas. Each connecting line is drawn on a
   transient overlay canvas where it stays fully visible for 3s, then fades. */
const SIER_LINE_HOLD = 3000; // ms fully visible
const SIER_LINE_FADE = 900; // ms fade-out
const SIER_LINE_MAX = 800; // cap concurrent transient lines
const SIER_CLICK_DEADZONE = 6; // CSS px before a press becomes a pan

class Sierpinski {
  constructor(canvas, lineCanvas, overlay) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.lineCanvas = lineCanvas;
    this.lctx = lineCanvas.getContext("2d");
    this.overlay = overlay; // name/formula element
    this.active = false;

    // Equilateral triangle in world space (y points down, matching canvas).
    this.vertices = [
      { name: "A", x: 0, y: -1 },
      { name: "B", x: -0.8660254, y: 0.5 },
      { name: "C", x: 0.8660254, y: 0.5 },
    ];

    this._bind();
  }

  _bind() {
    const c = this.canvas;
    this._onDown = (e) => this.onDown(e);
    this._onMove = (e) => this.onMove(e);
    this._onUp = (e) => this.onUp(e);
    this._onWheel = (e) => this.onWheel(e);
    c.addEventListener("mousedown", this._onDown);
    window.addEventListener("mousemove", this._onMove);
    window.addEventListener("mouseup", this._onUp);
    c.addEventListener("wheel", this._onWheel, { passive: false });
  }

  _scaleFactor() {
    return this.canvas.width / this.canvas.clientWidth; // backing px per CSS px
  }

  reset() {
    FT.fitCanvas(this.canvas);
    FT.fitCanvas(this.lineCanvas);
    const w = this.canvas.width;
    const h = this.canvas.height;
    const s = Math.min(w, h) * 0.34;
    this.cam = FT.makeCamera(s, w / 2, h / 2);
    this.points = []; // world-space points
    this.lines = []; // transient world-space lines {a, b, born}
    this.current = null; // current world point P
    this.selectedVertex = null;
    this.phase = "vertex";
    this.running = false;
    this.paused = false;
    this.drag = null;
    FT.hide(this.overlay);
    this.render();
    this.lctx.clearRect(0, 0, this.lineCanvas.width, this.lineCanvas.height);
  }

  start() {
    this.active = true;
    this.lineCanvas.classList.add("on");
    this.reset();
    this._loop();
  }

  stop() {
    this.active = false;
    this.running = false;
    this.lineCanvas.classList.remove("on");
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  resize() {
    if (!this.active) return;
    // Keep points/lines (world coords) but refit the camera to the new size.
    const oldW = this.canvas.width;
    FT.fitCanvas(this.canvas);
    FT.fitCanvas(this.lineCanvas);
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (this.cam && oldW) {
      // Recenter proportionally so the view stays put.
      this.cam.ox = (this.cam.ox / oldW) * w;
      this.cam.oy = (this.cam.oy / oldW) * w;
    }
    this.render();
  }

  /* ---- input ---- */
  vertexAt(sx, sy) {
    const thresh = 28 * this._scaleFactor();
    for (const v of this.vertices) {
      const p = this.cam.toScreen(v.x, v.y);
      if (Math.hypot(p.x - sx, p.y - sy) < thresh) return v;
    }
    return null;
  }

  onDown(e) {
    if (!this.active) return;
    this.drag = {
      cx0: e.clientX,
      cy0: e.clientY,
      lastCX: e.clientX,
      lastCY: e.clientY,
      dragging: false,
    };
  }

  onMove(e) {
    if (!this.active || !this.drag) return;
    const d = this.drag;
    const dist = Math.hypot(e.clientX - d.cx0, e.clientY - d.cy0);
    if (!d.dragging && dist > SIER_CLICK_DEADZONE) d.dragging = true;
    if (d.dragging) {
      const sf = this._scaleFactor();
      this.cam.panBy((e.clientX - d.lastCX) * sf, (e.clientY - d.lastCY) * sf);
      this.render();
    }
    d.lastCX = e.clientX;
    d.lastCY = e.clientY;
  }

  onUp(e) {
    if (!this.active || !this.drag) return;
    const wasClick = !this.drag.dragging;
    this.drag = null;
    if (wasClick) {
      const p = FT.pointerPos(this.canvas, e);
      this.handleClick(p.x, p.y);
    }
  }

  handleClick(sx, sy) {
    const v = this.vertexAt(sx, sy);
    if (this.phase === "vertex") {
      if (v) {
        this.selectedVertex = v;
        this.phase = "start";
      }
    } else if (this.phase === "start") {
      // The click sets the starting point; step halfway toward the vertex.
      this.current = this.cam.toWorld(sx, sy);
      this.step(this.selectedVertex);
      this.phase = "iterate";
    } else if (this.phase === "iterate") {
      if (v) this.step(v);
    }
    this.render(); // refresh points + selected-vertex highlight
  }

  onWheel(e) {
    if (!this.active) return;
    e.preventDefault();
    const p = FT.pointerPos(this.canvas, e);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    this.cam.zoomAt(p.x, p.y, factor);
    this.render();
  }

  /* Space bar toggles auto-run; pausing reveals the name + formula. */
  toggleAuto() {
    if (!this.active) return;
    if (this.phase === "vertex" || this.phase === "start") {
      // Nothing seeded yet — start from the centroid.
      this.selectedVertex = this.vertices[0];
      this.current = { x: 0, y: 0.0 };
      this.phase = "iterate";
    }
    this.running = !this.running;
    if (this.running) {
      this.paused = false;
      FT.hide(this.overlay);
    } else {
      this.paused = true;
      FT.show(this.overlay);
    }
  }

  /* One chaos-game step toward vertex v. */
  step(v) {
    if (!this.current) return;
    const np = {
      x: (this.current.x + v.x) / 2,
      y: (this.current.y + v.y) / 2,
    };
    this.points.push(np);
    if (this.points.length > 200000) this.points.shift();
    // Record the connecting line for the transient (hold-then-fade) overlay.
    // The line spans the full segment from the current point to the chosen
    // vertex; the new midpoint `np` lies on it.
    this.lines.push({ a: { x: v.x, y: v.y }, b: this.current, born: performance.now() });
    if (this.lines.length > SIER_LINE_MAX) this.lines.shift();
    this.drawPoint(np);
    this.current = np;
    this.selectedVertex = v;
  }

  drawPoint(wp) {
    const s = this.cam.toScreen(wp.x, wp.y);
    const ctx = this.ctx;
    const t = Math.min(1, this.points.length / 4000);
    ctx.fillStyle = `hsl(${160 + t * 40}, 85%, ${60 + t * 10}%)`;
    ctx.fillRect(s.x - 1, s.y - 1, 2.2, 2.2);
  }

  /* Draw the transient lines (3s hold, then fade) + the current-point marker. */
  drawLines() {
    const ctx = this.lctx;
    ctx.clearRect(0, 0, this.lineCanvas.width, this.lineCanvas.height);
    const now = performance.now();
    const kept = [];
    for (const L of this.lines) {
      const age = now - L.born;
      if (age > SIER_LINE_HOLD + SIER_LINE_FADE) continue; // fully faded
      kept.push(L);
      const alpha = age < SIER_LINE_HOLD ? 1 : 1 - (age - SIER_LINE_HOLD) / SIER_LINE_FADE;
      const a = this.cam.toScreen(L.a.x, L.a.y);
      const b = this.cam.toScreen(L.b.x, L.b.y);
      ctx.strokeStyle = `rgba(124,247,208,${(alpha * 0.85).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    this.lines = kept;

    if (this.current) {
      const p = this.cam.toScreen(this.current.x, this.current.y);
      ctx.strokeStyle = "#7cf7d0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _loop() {
    if (!this.active) return;
    if (this.running) {
      for (let i = 0; i < 12; i++) {
        const v = this.vertices[(Math.random() * 3) | 0];
        this.step(v);
      }
    }
    this.drawLines();
    this._raf = requestAnimationFrame(() => this._loop());
  }

  /* Full redraw of the points layer (triangle, labels, all points). */
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, w, h);

    // Triangle edges.
    ctx.strokeStyle = "rgba(157,180,255,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this.vertices.forEach((v, i) => {
      const p = this.cam.toScreen(v.x, v.y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();

    // Existing points.
    for (const wp of this.points) this.drawPoint(wp);

    // Vertices + labels.
    ctx.font = `${18 * this._scaleFactor()}px sans-serif`;
    ctx.textAlign = "center";
    for (const v of this.vertices) {
      const p = this.cam.toScreen(v.x, v.y);
      const sel = this.selectedVertex === v;
      ctx.fillStyle = sel ? "#7cf7d0" : "#9db4ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, sel ? 9 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e9e9f2";
      const off = v.y < 0 ? -16 : 22;
      ctx.fillText(v.name, p.x, p.y + off);
    }
  }
}
