/* Square slide — a unit square; each click fades in a measurement. */
class Square {
  constructor(canvas, lines) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.lines = lines; // [perimeterEl, areaEl]
    this.active = false;
    this.canvas.addEventListener("click", () => this.onClick());
  }

  start() {
    this.active = true;
    this.step = 0;
    this.lines.forEach((l) => FT.hide(l));
    this.render();
  }
  stop() {
    this.active = false;
  }

  onClick() {
    if (!this.active) return;
    if (this.step < this.lines.length) {
      FT.show(this.lines[this.step]);
      this.step++;
    }
  }

  render() {
    FT.fitCanvas(this.canvas);
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, w, h);

    const side = Math.min(w, h) * 0.42;
    const x = w / 2 - side / 2;
    const y = h / 2 - side / 2;

    ctx.strokeStyle = "#7cf7d0";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, side, side);
    ctx.fillStyle = "rgba(124,247,208,0.06)";
    ctx.fillRect(x, y, side, side);

    // Side labels "1".
    const fs = Math.max(16, side * 0.09);
    ctx.font = `${fs}px "SFMono-Regular", monospace`;
    ctx.fillStyle = "#e9e9f2";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("1", x + side / 2, y - fs * 0.9); // top
    ctx.fillText("1", x + side / 2, y + side + fs * 0.9); // bottom
    ctx.fillText("1", x - fs * 0.9, y + side / 2); // left
    ctx.fillText("1", x + side + fs * 0.9, y + side / 2); // right
  }
}
