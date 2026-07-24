/* Mandelbrot set — WebGL fragment-shader renderer.
   Wheel to zoom (about the cursor), drag to pan. Smooth-iteration coloring. */
class Mandelbrot {
  constructor(canvas, overlay) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.active = false;
    const opts = { preserveDrawingBuffer: true, antialias: false };
    this.gl =
      canvas.getContext("webgl", opts) ||
      canvas.getContext("experimental-webgl", opts);
    this._initGL();
    this._bind();
    this.resetView();
  }

  resetView() {
    this.center = [-0.5, 0.0];
    this.scale = 3.2; // world units across the smaller viewport dimension
  }

  _initGL() {
    const gl = this.gl;
    const vs = `
      attribute vec2 pos;
      void main() { gl_Position = vec4(pos, 0.0, 1.0); }
    `;
    const fs = `
      precision highp float;
      uniform vec2 u_res;
      uniform vec2 u_center;
      uniform float u_scale;   // world units per min-dimension
      uniform int u_maxIter;
      vec3 palette(float t) {
        // Smooth cosine palette (dark blue -> teal -> gold -> white).
        vec3 a = vec3(0.5, 0.5, 0.55);
        vec3 b = vec3(0.5, 0.5, 0.45);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.20, 0.42, 0.66);
        return a + b * cos(6.2831853 * (c * t + d));
      }
      void main() {
        float m = min(u_res.x, u_res.y);
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / m * u_scale;
        vec2 c = u_center + uv;
        vec2 z = vec2(0.0);
        int iter = 0;
        const int MAX = 1000;
        for (int i = 0; i < MAX; i++) {
          if (i >= u_maxIter) break;
          z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
          if (dot(z, z) > 256.0) break;
          iter++;
        }
        if (iter >= u_maxIter) {
          gl_FragColor = vec4(0.02, 0.02, 0.07, 1.0);
        } else {
          // Smooth iteration count.
          float sm = float(iter) - log2(log2(dot(z, z))) + 4.0;
          float t = sm / float(u_maxIter);
          gl_FragColor = vec4(palette(sqrt(t) * 2.0 + 0.5), 1.0);
        }
      }
    `;
    const prog = this._program(vs, fs);
    this.prog = prog;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {
      res: gl.getUniformLocation(prog, "u_res"),
      center: gl.getUniformLocation(prog, "u_center"),
      scale: gl.getUniformLocation(prog, "u_scale"),
      maxIter: gl.getUniformLocation(prog, "u_maxIter"),
    };
  }

  _program(vsrc, fsrc) {
    const gl = this.gl;
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vsrc));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(p));
    return p;
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
    const m = Math.min(this.canvas.width, this.canvas.height);
    const dx = (p.x - this.drag.x) / m * this.scale;
    const dy = (p.y - this.drag.y) / m * this.scale;
    this.center[0] -= dx;
    this.center[1] += dy; // canvas y is down; world y is up
    this.drag = { x: p.x, y: p.y };
    this.render();
  }

  onWheel(e) {
    if (!this.active) return;
    e.preventDefault();
    const p = FT.pointerPos(this.canvas, e);
    const m = Math.min(this.canvas.width, this.canvas.height);
    // World point under the cursor.
    const wx = this.center[0] + (p.x - 0.5 * this.canvas.width) / m * this.scale;
    const wy = this.center[1] - (p.y - 0.5 * this.canvas.height) / m * this.scale;
    const factor = e.deltaY < 0 ? 1 / 1.15 : 1.15;
    this.scale *= factor;
    // Keep the cursor's world point fixed.
    this.center[0] = wx - (p.x - 0.5 * this.canvas.width) / m * this.scale;
    this.center[1] = wy + (p.y - 0.5 * this.canvas.height) / m * this.scale;
    this.render();
  }

  start() {
    this.active = true;
    this.resetView();
    this.render();
  }
  stop() {
    this.active = false;
  }

  render() {
    const gl = this.gl;
    FT.fitCanvas(this.canvas);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.prog);
    gl.uniform2f(this.u.res, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.center, this.center[0], this.center[1]);
    gl.uniform1f(this.u.scale, this.scale);
    // More iterations as we zoom in.
    const maxIter = Math.min(
      1000,
      Math.floor(120 + 55 * Math.max(0, Math.log2(3.2 / this.scale)))
    );
    gl.uniform1i(this.u.maxIter, maxIter);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
