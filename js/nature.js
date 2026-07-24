/* Nature slide — self-contained SVG illustrations of natural fractals. */
const Nature = {
  built: false,

  build(grid) {
    if (this.built) return;
    this.built = true;
    const cards = [
      { svg: this.tree(), cap: "Trees — recursive branching" },
      { svg: this.snowflake(), cap: "Snowflakes — Koch symmetry" },
      { svg: this.galaxy(), cap: "Galaxies — logarithmic spirals" },
      { svg: this.lightning(), cap: "Lightning — branching discharge" },
      { svg: this.coastline(), cap: "Coastlines — rough at every scale" },
      { svg: this.fern(), cap: "Ferns — self-similar fronds" },
    ];
    cards.forEach((c) => {
      const div = document.createElement("div");
      div.className = "nature-card";
      div.innerHTML = c.svg + `<div class="caption">${c.cap}</div>`;
      grid.appendChild(div);
    });
  },

  reveal(grid) {
    const cards = grid.querySelectorAll(".nature-card");
    cards.forEach((c, i) => setTimeout(() => c.classList.add("visible"), 120 * i));
  },

  _svg(inner) {
    return `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  },

  tree() {
    let paths = "";
    const branch = (x, y, len, ang, depth) => {
      if (depth === 0 || len < 2) return;
      const x2 = x + Math.cos(ang) * len;
      const y2 = y + Math.sin(ang) * len;
      const hue = 120 + depth * 8;
      paths += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(
        1
      )}" y2="${y2.toFixed(1)}" stroke="hsl(${hue},60%,55%)" stroke-width="${(
        depth * 0.5
      ).toFixed(1)}" stroke-linecap="round"/>`;
      branch(x2, y2, len * 0.72, ang - 0.5, depth - 1);
      branch(x2, y2, len * 0.72, ang + 0.5, depth - 1);
    };
    branch(100, 148, 34, -Math.PI / 2, 9);
    return this._svg(paths);
  },

  snowflake() {
    const koch = (ax, ay, bx, by, d) => {
      if (d === 0) return [[ax, ay, bx, by]];
      const dx = (bx - ax) / 3,
        dy = (by - ay) / 3;
      const p1 = [ax + dx, ay + dy];
      const p2 = [ax + 2 * dx, ay + 2 * dy];
      const ang = Math.atan2(by - ay, bx - ax) - Math.PI / 3;
      const len = Math.hypot(dx, dy);
      const px = p1[0] + Math.cos(ang) * len;
      const py = p1[1] + Math.sin(ang) * len;
      return [
        ...koch(ax, ay, p1[0], p1[1], d - 1),
        ...koch(p1[0], p1[1], px, py, d - 1),
        ...koch(px, py, p2[0], p2[1], d - 1),
        ...koch(p2[0], p2[1], bx, by, d - 1),
      ];
    };
    const cx = 100,
      cy = 78,
      R = 52;
    const verts = [0, 1, 2].map((i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
      return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    });
    let segs = [];
    for (let i = 0; i < 3; i++)
      segs = segs.concat(koch(...verts[i], ...verts[(i + 1) % 3], 3));
    const path = segs
      .map((s, i) => (i === 0 ? `M${s[0]},${s[1]} L${s[2]},${s[3]}` : `L${s[2]},${s[3]}`))
      .join(" ");
    return this._svg(
      `<path d="${path} Z" fill="none" stroke="#9db4ff" stroke-width="1"/>`
    );
  },

  galaxy() {
    let dots = `<circle cx="100" cy="75" r="6" fill="#fff8e0"/>`;
    for (let arm = 0; arm < 2; arm++) {
      const off = arm * Math.PI;
      for (let t = 0; t < 90; t++) {
        const a = t * 0.16 + off;
        const r = 2.2 * Math.exp(0.19 * t * 0.16 * 3.5);
        if (r > 74) break;
        const x = 100 + r * Math.cos(a);
        const y = 75 + r * Math.sin(a) * 0.62;
        const op = (1 - t / 90).toFixed(2);
        dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(
          1.6 -
          t / 120
        ).toFixed(1)}" fill="#bcd4ff" opacity="${op}"/>`;
      }
    }
    return this._svg(`<rect width="200" height="150" fill="#05060f"/>${dots}`);
  },

  lightning() {
    // Midpoint-displacement bolt with a couple of branches.
    const bolt = (x1, y1, x2, y2, disp, depth, width) => {
      if (depth === 0) {
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(
          1
        )}" y2="${y2.toFixed(1)}" stroke="#cfe0ff" stroke-width="${width}" stroke-linecap="round"/>`;
      }
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * disp;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * disp * 0.3;
      let out =
        bolt(x1, y1, mx, my, disp / 2, depth - 1, width) +
        bolt(mx, my, x2, y2, disp / 2, depth - 1, width);
      if (depth === 4 && Math.random() < 0.8) {
        out += bolt(mx, my, mx + 26 * (Math.random() - 0.5), my + 34, disp / 2, 2, width * 0.6);
      }
      return out;
    };
    return this._svg(
      `<rect width="200" height="150" fill="#070912"/>` +
        bolt(100, 4, 96, 146, 60, 5, 1.8)
    );
  },

  coastline() {
    // 1-D midpoint displacement -> jagged coast.
    let pts = [
      [4, 90],
      [196, 100],
    ];
    let disp = 46;
    for (let it = 0; it < 6; it++) {
      const np = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i],
          b = pts[i + 1];
        np.push(a);
        np.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (Math.random() - 0.5) * disp]);
      }
      np.push(pts[pts.length - 1]);
      pts = np;
      disp *= 0.55;
    }
    const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const fill = `4,150 ${line} 196,150`;
    return this._svg(
      `<rect width="200" height="150" fill="#08131a"/>` +
        `<polygon points="${fill}" fill="rgba(124,247,208,0.18)"/>` +
        `<polyline points="${line}" fill="none" stroke="#7cf7d0" stroke-width="1.4"/>`
    );
  },

  fern() {
    // A quick low-count Barnsley fern rendered to SVG.
    let x = 0,
      y = 0,
      dots = "";
    for (let i = 0; i < 1600; i++) {
      const r = Math.random();
      let nx, ny;
      if (r < 0.01) {
        nx = 0;
        ny = 0.16 * y;
      } else if (r < 0.86) {
        nx = 0.85 * x + 0.04 * y;
        ny = -0.04 * x + 0.85 * y + 1.6;
      } else if (r < 0.93) {
        nx = 0.2 * x - 0.26 * y;
        ny = 0.23 * x + 0.22 * y + 1.6;
      } else {
        nx = -0.15 * x + 0.28 * y;
        ny = 0.26 * x + 0.24 * y + 0.44;
      }
      x = nx;
      y = ny;
      if (i > 20) {
        const px = 100 + x * 17;
        const py = 148 - y * 13.5;
        dots += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="0.5" fill="#57d98a"/>`;
      }
    }
    return this._svg(`<rect width="200" height="150" fill="#06110b"/>${dots}`);
  },
};
