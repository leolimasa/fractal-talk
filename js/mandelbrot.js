/* Mandelbrot set — WebGL renderer with perturbation-theory deep zoom.

   Naive iteration in 32-bit floats pixelates once the view is smaller than
   float precision (~1e-5). To go deeper we use perturbation theory:

     - A single high-precision REFERENCE orbit X_n is computed on the CPU in
       JavaScript doubles from the view centre c0 (X_0 = 0, X_{n+1}=X_n^2+c0).
     - Each pixel c = c0 + dc is iterated as a small DELTA e_n = z_n - X_n:
           e_{n+1} = 2 X_n e_n + e_n^2 + dc,   z_n = X_n + e_n
       dc and e stay tiny (~ the view scale) so 32-bit floats suffice.
     - Zhuoran's REBASING keeps one reference valid across the whole image:
       whenever |z| < |e| (or we run off the end of the reference), reset the
       running delta to the full z and restart the reference index at 0. This
       removes the glitches that plain single-reference perturbation produces.

   The reference orbit (doubles) is what carries the precision, so the usable
   zoom depth jumps from ~1e-5 to ~1e-13. Beyond that the reference itself
   would need arbitrary-precision arithmetic (a further extension). */
class Mandelbrot {
  constructor(canvas, overlay) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.active = false;
    const opts = { preserveDrawingBuffer: true, antialias: false };
    this.gl =
      canvas.getContext("webgl", opts) ||
      canvas.getContext("experimental-webgl", opts);
    this.floatOK = !!this.gl.getExtension("OES_texture_float");
    this._initGL();
    this._bind();
    this.resetView();
  }

  resetView() {
    this.center = [-0.5, 0.0]; // JS doubles — the source of precision
    this.scale = 3.2; // world units across the smaller viewport dimension
  }

  maxIterForScale() {
    const cap = this.floatOK ? 3000 : 1000;
    return Math.min(
      cap,
      Math.floor(160 + 240 * Math.max(0, Math.log2(3.2 / this.scale)))
    );
  }

  _initGL() {
    const gl = this.gl;
    const vs = `
      attribute vec2 pos;
      void main() { gl_Position = vec4(pos, 0.0, 1.0); }
    `;

    const palette = `
      vec3 palette(float t) {
        vec3 a = vec3(0.5, 0.5, 0.55);
        vec3 b = vec3(0.5, 0.5, 0.45);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.20, 0.42, 0.66);
        return a + b * cos(6.2831853 * (c * t + d));
      }
      vec3 shade(int iter, float zz) {
        // Smooth (fractional) iteration count -> repeating colour bands.
        float sm = float(iter) + 1.0 - log2(0.5 * log2(zz));
        return palette(sm * 0.021 + 0.5);
      }
    `;

    // --- Perturbation shader (reads the reference orbit from a float texture) ---
    const fsPerturb = `
      precision highp float;
      uniform vec2 u_res;
      uniform float u_scale;
      uniform sampler2D u_ref;  // reference orbit X_n packed as (x, y) per texel
      uniform float u_texW;
      uniform int u_refLen;
      uniform int u_maxIter;
      ${palette}
      vec2 cmul(vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
      }
      vec2 getRef(int m) {
        return texture2D(u_ref, vec2((float(m) + 0.5) / u_texW, 0.5)).xy;
      }
      const int MAXREF = 3000;
      void main() {
        float m0 = min(u_res.x, u_res.y);
        vec2 dc = (gl_FragCoord.xy - 0.5 * u_res) / m0 * u_scale; // c - c0
        vec2 e = vec2(0.0); // delta z, e_0 = 0
        int m = 0;          // reference index
        int iter = 0;
        vec2 z = vec2(0.0);
        for (int i = 0; i < MAXREF; i++) {
          if (iter >= u_maxIter) break;
          vec2 X = getRef(m);
          z = X + e;
          if (dot(z, z) > 256.0) break;
          e = cmul(2.0 * X, e) + cmul(e, e) + dc;
          m += 1;
          iter += 1;
          vec2 zn = getRef(m) + e;
          if (m >= u_refLen || dot(zn, zn) < dot(e, e)) {
            e = zn; // rebase onto the full orbit value
            m = 0;
          }
        }
        if (iter >= u_maxIter) gl_FragColor = vec4(0.02, 0.02, 0.07, 1.0);
        else gl_FragColor = vec4(shade(iter, dot(z, z)), 1.0);
      }
    `;

    // --- Fallback direct shader (used only if float textures are absent) ---
    const fsDirect = `
      precision highp float;
      uniform vec2 u_res;
      uniform vec2 u_center;
      uniform float u_scale;
      uniform int u_maxIter;
      ${palette}
      void main() {
        float m = min(u_res.x, u_res.y);
        vec2 c = u_center + (gl_FragCoord.xy - 0.5 * u_res) / m * u_scale;
        vec2 z = vec2(0.0);
        int iter = 0;
        const int MAX = 1000;
        for (int i = 0; i < MAX; i++) {
          if (i >= u_maxIter) break;
          z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
          if (dot(z, z) > 256.0) break;
          iter++;
        }
        if (iter >= u_maxIter) gl_FragColor = vec4(0.02, 0.02, 0.07, 1.0);
        else gl_FragColor = vec4(shade(iter, dot(z, z)), 1.0);
      }
    `;

    // Shared fullscreen-quad buffer.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const setupAttrib = (prog) => {
      const loc = gl.getAttribLocation(prog, "pos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    };

    if (this.floatOK) {
      this.prog = this._program(vs, fsPerturb);
      gl.useProgram(this.prog);
      setupAttrib(this.prog);
      this.u = {
        res: gl.getUniformLocation(this.prog, "u_res"),
        scale: gl.getUniformLocation(this.prog, "u_scale"),
        ref: gl.getUniformLocation(this.prog, "u_ref"),
        texW: gl.getUniformLocation(this.prog, "u_texW"),
        refLen: gl.getUniformLocation(this.prog, "u_refLen"),
        maxIter: gl.getUniformLocation(this.prog, "u_maxIter"),
      };
      // Reference-orbit texture (width set per-frame).
      this.refTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.refTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    } else {
      this.prog = this._program(vs, fsDirect);
      gl.useProgram(this.prog);
      setupAttrib(this.prog);
      this.u = {
        res: gl.getUniformLocation(this.prog, "u_res"),
        center: gl.getUniformLocation(this.prog, "u_center"),
        scale: gl.getUniformLocation(this.prog, "u_scale"),
        maxIter: gl.getUniformLocation(this.prog, "u_maxIter"),
      };
    }
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

  /* Compute the reference orbit X_n in doubles and upload it as a texture. */
  _computeReference(maxIter) {
    const gl = this.gl;
    const cx = this.center[0];
    const cy = this.center[1];
    const data = new Float32Array(maxIter * 4);
    let zx = 0;
    let zy = 0;
    let n = 0;
    for (; n < maxIter; n++) {
      data[n * 4] = zx; // X_n stored at index n
      data[n * 4 + 1] = zy;
      const x2 = zx * zx;
      const y2 = zy * zy;
      if (x2 + y2 > 1e6) {
        n++;
        break;
      } // reference escaped
      const nzx = x2 - y2 + cx;
      const nzy = 2 * zx * zy + cy;
      zx = nzx;
      zy = nzy;
    }
    this.refLen = n;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.refTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      n,
      1,
      0,
      gl.RGBA,
      gl.FLOAT,
      data.subarray(0, n * 4)
    );
    this.refTexW = n;
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
    this.center[0] -= ((p.x - this.drag.x) / m) * this.scale;
    this.center[1] += ((p.y - this.drag.y) / m) * this.scale; // canvas y down
    this.drag = { x: p.x, y: p.y };
    this.render();
  }

  onWheel(e) {
    if (!this.active) return;
    e.preventDefault();
    const p = FT.pointerPos(this.canvas, e);
    const m = Math.min(this.canvas.width, this.canvas.height);
    const wx = this.center[0] + ((p.x - 0.5 * this.canvas.width) / m) * this.scale;
    const wy = this.center[1] - ((p.y - 0.5 * this.canvas.height) / m) * this.scale;
    this.scale *= e.deltaY < 0 ? 1 / 1.15 : 1.15;
    this.center[0] = wx - ((p.x - 0.5 * this.canvas.width) / m) * this.scale;
    this.center[1] = wy + ((p.y - 0.5 * this.canvas.height) / m) * this.scale;
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
    gl.uniform1f(this.u.scale, this.scale);
    const maxIter = this.maxIterForScale();
    gl.uniform1i(this.u.maxIter, maxIter);

    if (this.floatOK) {
      this._computeReference(maxIter);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.refTex);
      gl.uniform1i(this.u.ref, 0);
      gl.uniform1f(this.u.texW, this.refTexW);
      gl.uniform1i(this.u.refLen, this.refLen);
    } else {
      gl.uniform2f(this.u.center, this.center[0], this.center[1]);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
