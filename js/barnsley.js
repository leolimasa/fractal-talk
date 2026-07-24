/* Barnsley fern — iterated function system with live parameter sliders.
   Points are plotted in fern space (x, y) then mapped through a uniform
   pan/zoom camera (with y flipped so the fern stands upright). */
class Barnsley {
  constructor(canvas, panel, slidersEl, resetBtn, overlay) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.panel = panel;
    this.slidersEl = slidersEl;
    this.resetBtn = resetBtn;
    this.overlay = overlay;
    this.active = false;

    this.defaults = {
      f1: { a: 0, b: 0, c: 0, d: 0.16, e: 0, f: 0, p: 0.01 },
      f2: { a: 0.85, b: 0.04, c: -0.04, d: 0.85, e: 0, f: 1.6, p: 0.85 },
      f3: { a: 0.2, b: -0.26, c: 0.23, d: 0.22, e: 0, f: 1.6, p: 0.07 },
      f4: { a: -0.15, b: 0.28, c: 0.26, d: 0.24, e: 0, f: 0.44, p: 0.07 },
    };

    this.sliderDefs = [
      { fn: "f2", k: "a", label: "f₂ a (stem scale x)", min: 0.5, max: 1.0, step: 0.01 },
      { fn: "f2", k: "b", label: "f₂ b (shear)", min: -0.3, max: 0.3, step: 0.01 },
      { fn: "f2", k: "c", label: "f₂ c (bend)", min: -0.3, max: 0.3, step: 0.01 },
      { fn: "f2", k: "d", label: "f₂ d (stem scale y)", min: 0.5, max: 1.0, step: 0.01 },
      { fn: "f3", k: "c", label: "f₃ c (leaflet twist)", min: 0.0, max: 0.5, step: 0.01 },
      { fn: "f4", k: "a", label: "f₄ a (left leaflet)", min: -0.4, max: 0.2, step: 0.01 },
    ];

    this._buildSliders();
    this.resetBtn.addEventListener("click", () => this._resetParams());
    this._bind();
  }

  _clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  _buildSliders() {
    this.params = this._clone(this.defaults);
    this.slidersEl.innerHTML = "";
    this.inputs = {};
    for (const d of this.sliderDefs) {
      const row = document.createElement("div");
      row.className = "slider-row interactive-ui";
      const id = `sl-${d.fn}-${d.k}`;
      row.innerHTML = `
        <label for="${id}">${d.label}<span class="val" id="${id}-val"></span></label>
        <input type="range" id="${id}" min="${d.min}" max="${d.max}" step="${d.step}" />
      `;
      this.slidersEl.appendChild(row);
      const input = row.querySelector("input");
      const val = row.querySelector(".val");
      const key = `${d.fn}.${d.k}`;
      this.inputs[key] = { input, val };
      const sync = () => {
        this.params[d.fn][d.k] = parseFloat(input.value);
        val.textContent = parseFloat(input.value).toFixed(2);
        this._restart();
      };
      input.addEventListener("input", sync);
    }
    this._syncInputs();
  }

  _syncInputs() {
    for (const d of this.sliderDefs) {
      const { input, val } = this.inputs[`${d.fn}.${d.k}`];
      const v = this.params[d.fn][d.k];
      input.value = v;
      val.textContent = v.toFixed(2);
    }
  }

  _resetParams() {
    this.params = this._clone(this.defaults);
    this._syncInputs();
    this._restart();
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
    c.addEventListener("mousedown", (e) => this.onDown(e));
    window.addEventListener("mousemove", (e) => this.onMove(e));
    window.addEventListener("mouseup", () => (this.drag = null));
  }

  onDown(e) {
    if (!this.active) return;
    const p = FT.pointerPos(this.canvas, e);
    this.drag = { x: p.x, y: p.y };
  }
  onMove(e) {
    if (!this.active || !this.drag) return;
    const p = FT.pointerPos(this.canvas, e);
    this.cam.panBy(p.x - this.drag.x, p.y - this.drag.y);
    this.drag = { x: p.x, y: p.y };
    this._restart();
  }
  onWheel(e) {
    if (!this.active) return;
    e.preventDefault();
    const p = FT.pointerPos(this.canvas, e);
    this.cam.zoomAt(p.x, p.y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    this._restart();
  }

  _fitCamera() {
    FT.fitCanvas(this.canvas);
    const W = this.canvas.width;
    const H = this.canvas.height;
    // Fern spans x∈[-2.5,2.5], y∈[0,10]; plotted as world (x, -y).
    const scale = Math.min(W / 5.6, H / 10.6);
    this.cam = FT.makeCamera(scale, W / 2, H / 2 + 5 * scale);
  }

  start() {
    this.active = true;
    this._fitCamera();
    FT.show(this.panel);
    FT.show(this.overlay);
    this._restart();
    this._loop();
  }
  stop() {
    this.active = false;
    FT.hide(this.panel);
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _restart() {
    const ctx = this.ctx;
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.px = 0;
    this.py = 0;
    this.count = 0;
    this.target = 140000;
  }

  _next() {
    const r = Math.random();
    const p = this.params;
    let t;
    if (r < p.f1.p) t = p.f1;
    else if (r < p.f1.p + p.f2.p) t = p.f2;
    else if (r < p.f1.p + p.f2.p + p.f3.p) t = p.f3;
    else t = p.f4;
    const nx = t.a * this.px + t.b * this.py + t.e;
    const ny = t.c * this.px + t.d * this.py + t.f;
    this.px = nx;
    this.py = ny;
  }

  _loop() {
    if (!this.active) return;
    if (this.count < this.target) {
      const ctx = this.ctx;
      const dpr = this.canvas.width / this.canvas.clientWidth;
      for (let i = 0; i < 3000 && this.count < this.target; i++) {
        this._next();
        this.count++;
        if (this.count < 20) continue; // let the orbit settle
        const s = this.cam.toScreen(this.px, -this.py);
        const g = Math.min(255, 140 + (this.py / 10) * 100);
        ctx.fillStyle = `rgba(${Math.floor(60 + this.py * 6)}, ${Math.floor(
          g
        )}, ${Math.floor(90 + this.px * 12)}, 0.9)`;
        ctx.fillRect(s.x, s.y, dpr, dpr);
      }
    }
    this._raf = requestAnimationFrame(() => this._loop());
  }
}
