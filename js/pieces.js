/* Jigsaw piece geometry.
   Every shared edge is generated once, so neighbouring pieces fit exactly. */
(function () {
  'use strict';

  function rng(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // One tab as cubic segments, in units of the piece size. Each row is
  // [c1 along, c1 out, c2 along, c2 out, end along, end out], relative to the tab centre.
  const TAB = [
    [-0.07, 0, -0.04, 0.05, -0.07, 0.1],
    [-0.12, 0.17, -0.08, 0.25, 0, 0.25],
    [0.08, 0.25, 0.12, 0.17, 0.07, 0.1],
    [0.04, 0.05, 0.07, 0, 0.17, 0],
  ];

  // An edge is a start point plus cubic segments [c1x, c1y, c2x, c2y, ex, ey].
  // sign 0 = flat border, +1 / -1 = tab pointing to either side.
  function makeEdge(ax, ay, bx, by, sign, unit, r) {
    const segs = [];
    if (sign) {
      const len = Math.hypot(bx - ax, by - ay);
      const dx = (bx - ax) / len, dy = (by - ay) / len;
      const nx = -dy * sign, ny = dx * sign;
      const c = len * (0.5 + (r() - 0.5) * 0.12);
      const k = unit * (0.9 + r() * 0.2);
      const P = (along, out) => [
        ax + dx * (c + along * k) + nx * out * k,
        ay + dy * (c + along * k) + ny * out * k,
      ];
      const [s0x, s0y] = P(-0.17, 0);
      segs.push([ax, ay, s0x, s0y, s0x, s0y]);
      for (const t of TAB) segs.push([...P(t[0], t[1]), ...P(t[2], t[3]), ...P(t[4], t[5])]);
      const last = segs[segs.length - 1];
      segs.push([last[4], last[5], bx, by, bx, by]);
    } else {
      segs.push([ax, ay, bx, by, bx, by]);
    }
    return { sx: ax, sy: ay, ex: bx, ey: by, segs };
  }

  function reverse(e) {
    const segs = [];
    for (let i = e.segs.length - 1; i >= 0; i--) {
      const s = e.segs[i];
      const prev = i > 0 ? e.segs[i - 1] : null;
      segs.push([s[2], s[3], s[0], s[1], prev ? prev[4] : e.sx, prev ? prev[5] : e.sy]);
    }
    return { sx: e.ex, sy: e.ey, ex: e.sx, ey: e.sy, segs };
  }

  /* Cuts a width x height board into cols x rows pieces.
     Each piece gets a Path2D in local coordinates (cell top-left at 0,0). */
  function build(cols, rows, width, height, seed) {
    const r = rng(seed);
    const pw = width / cols, ph = height / rows, unit = Math.min(pw, ph);
    const flip = () => (r() < 0.5 ? -1 : 1);

    const H = [], V = [];
    for (let y = 0; y <= rows; y++) {
      H[y] = [];
      for (let x = 0; x < cols; x++) {
        const sign = y === 0 || y === rows ? 0 : flip();
        H[y][x] = makeEdge(x * pw, y * ph, (x + 1) * pw, y * ph, sign, unit, r);
      }
    }
    for (let y = 0; y < rows; y++) {
      V[y] = [];
      for (let x = 0; x <= cols; x++) {
        const sign = x === 0 || x === cols ? 0 : flip();
        V[y][x] = makeEdge(x * pw, y * ph, x * pw, (y + 1) * ph, sign, unit, r);
      }
    }

    const pieces = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = x * pw, cy = y * ph;
        const edges = [H[y][x], V[y][x + 1], reverse(H[y + 1][x]), reverse(V[y][x])];
        const path = new Path2D();
        path.moveTo(edges[0].sx - cx, edges[0].sy - cy);
        for (const e of edges) {
          for (const s of e.segs) {
            path.bezierCurveTo(s[0] - cx, s[1] - cy, s[2] - cx, s[3] - cy, s[4] - cx, s[5] - cy);
          }
        }
        path.closePath();
        pieces.push({ row: y, col: x, cx, cy, path, nb: [], g: null });
      }
    }

    for (const p of pieces) {
      const at = (x, y) => pieces[y * cols + x];
      if (p.col > 0) p.nb.push(at(p.col - 1, p.row));
      if (p.col < cols - 1) p.nb.push(at(p.col + 1, p.row));
      if (p.row > 0) p.nb.push(at(p.col, p.row - 1));
      if (p.row < rows - 1) p.nb.push(at(p.col, p.row + 1));
    }

    return { pw, ph, unit, margin: unit * 0.3, pieces };
  }

  window.Pieces = { build, rng };
})();
