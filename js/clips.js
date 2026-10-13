/* Built-in clips, drawn in code so the game works without any video files.
   draw(ctx, w, h, t, p) renders time t (seconds), where p is loop progress 0..1.
   Everything moves in whole cycles per loop, so each clip loops seamlessly. */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const wrap = (v) => v - Math.floor(v);
  const rng = window.Pieces.rng;

  function ellipse(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
  }

  /* ---------- Sunset Sea ---------- */
  function sunset() {
    const r = rng(11);
    const clouds = Array.from({ length: 8 }, (_, i) => ({
      x: i / 8 + r() * 0.1, y: 0.06 + r() * 0.3, s: 0.5 + r(), a: 0.35 + r() * 0.4,
    }));
    const birds = Array.from({ length: 6 }, () => ({
      x: r(), y: 0.14 + r() * 0.18, s: 4 + r() * 5, f: 14 + ((r() * 8) | 0), ph: r(),
    }));

    return {
      name: 'Sunset Sea',
      duration: 16,
      draw(ctx, w, h, t, p) {
        const hz = h * 0.56;
        let g = ctx.createLinearGradient(0, 0, 0, hz);
        g.addColorStop(0, '#1d1b4f');
        g.addColorStop(0.45, '#7b2f7a');
        g.addColorStop(0.8, '#f0566a');
        g.addColorStop(1, '#ffb35c');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, hz);

        // Sun with glow and retro stripes
        const sx = w * 0.64, sy = hz - h * 0.06 + Math.sin(TAU * p) * h * 0.012, sr = h * 0.12;
        g = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 5);
        g.addColorStop(0, 'rgba(255,214,140,0.65)');
        g.addColorStop(1, 'rgba(255,214,140,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, hz);
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, TAU);
        ctx.clip();
        g = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
        g.addColorStop(0, '#fff3b0');
        g.addColorStop(1, '#ff9a4d');
        ctx.fillStyle = g;
        ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
        ctx.fillStyle = 'rgba(240,86,106,0.9)';
        for (let i = 0; i < 4; i++) ctx.fillRect(sx - sr, sy + sr * (0.15 + i * 0.22), sr * 2, 2 + i * 2);
        ctx.restore();

        for (const c of clouds) {
          const x = wrap(c.x + p) * (w + 400) - 200, y = c.y * h, s = c.s * 60;
          ctx.fillStyle = `rgba(70,32,90,${c.a})`;
          ellipse(ctx, x, y, s * 1.6, s * 0.28);
          ellipse(ctx, x - s * 0.6, y + s * 0.08, s, s * 0.22);
          ellipse(ctx, x + s * 0.7, y + s * 0.1, s * 1.1, s * 0.2);
          ctx.fillStyle = `rgba(255,150,130,${c.a * 0.5})`;
          ellipse(ctx, x, y + s * 0.18, s * 1.3, s * 0.07);
        }

        ctx.strokeStyle = 'rgba(40,20,50,0.85)';
        ctx.lineWidth = 2;
        for (const b of birds) {
          const x = wrap(b.x - p) * (w + 100) - 50, y = b.y * h + Math.sin(TAU * (p * 3 + b.ph)) * 8;
          const wing = Math.sin(TAU * (p * b.f + b.ph)) * b.s * 0.7;
          ctx.beginPath();
          ctx.moveTo(x - b.s, y - wing);
          ctx.lineTo(x, y);
          ctx.lineTo(x + b.s, y - wing);
          ctx.stroke();
        }

        // Island with a lighthouse sweeping its beam
        ctx.fillStyle = '#2b1236';
        ctx.beginPath();
        ctx.moveTo(0, hz);
        ctx.lineTo(0, hz - h * 0.07);
        ctx.quadraticCurveTo(w * 0.08, hz - h * 0.12, w * 0.17, hz - h * 0.05);
        ctx.quadraticCurveTo(w * 0.24, hz - h * 0.02, w * 0.3, hz);
        ctx.fill();
        const lx = w * 0.1, ly = hz - h * 0.2;
        ctx.fillRect(lx - 7, ly, 14, h * 0.1);
        const beam = Math.cos(TAU * p * 2);
        ctx.fillStyle = 'rgba(255,240,180,0.22)';
        ctx.beginPath();
        ctx.moveTo(lx, ly + 2);
        ctx.lineTo(lx + beam * w * 0.4, ly - 22);
        ctx.lineTo(lx + beam * w * 0.4, ly + 26);
        ctx.fill();
        ctx.fillStyle = beam > 0 ? '#fff4c2' : '#e8c070';
        ctx.fillRect(lx - 6, ly - 8, 12, 9);
        ctx.fillStyle = '#2b1236';
        ctx.fillRect(lx - 8, ly - 12, 16, 4);

        // Sea
        g = ctx.createLinearGradient(0, hz, 0, h);
        g.addColorStop(0, '#ff9f74');
        g.addColorStop(0.2, '#b2437a');
        g.addColorStop(0.6, '#4a1d5e');
        g.addColorStop(1, '#1b0c33');
        ctx.fillStyle = g;
        ctx.fillRect(0, hz, w, h - hz);

        for (let i = 0; i < 46; i++) {
          const f = i / 46, y = hz + Math.pow(f, 1.3) * (h - hz);
          const ww = sr * (0.5 + f * 1.4) * (0.55 + 0.45 * Math.sin(TAU * (p * 4 + i * 0.37)));
          const off = Math.sin(TAU * (p * 2 + i * 0.21)) * 6 * f;
          ctx.fillStyle = `rgba(255,220,150,${0.6 * (1 - f)})`;
          ctx.fillRect(sx - ww / 2 + off, y, ww, 2 + f * 3);
        }

        for (let i = 0; i < 16; i++) {
          const f = (i + 1) / 16, y0 = hz + Math.pow(f, 1.6) * (h - hz);
          const amp = 1 + f * 7, len = 50 + f * 220, k = (i % 3) + 1, dir = i % 2 ? 1 : -1;
          ctx.strokeStyle = `rgba(255,190,200,${0.08 + f * 0.18})`;
          ctx.lineWidth = 1 + f * 2.5;
          ctx.beginPath();
          for (let x = -10; x <= w + 10; x += 10) {
            const y = y0 + Math.sin((x / len) * TAU + dir * TAU * p * k + i) * amp;
            if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        // Sailboat
        const bx = wrap(0.2 + p) * (w + 300) - 150, by = hz + (h - hz) * 0.42 + Math.sin(TAU * p * 5) * 4;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(Math.sin(TAU * p * 5 + 1) * 0.05);
        ctx.fillStyle = '#24102e';
        ctx.beginPath();
        ctx.moveTo(-60, 0);
        ctx.lineTo(60, 0);
        ctx.lineTo(44, 18);
        ctx.lineTo(-46, 18);
        ctx.fill();
        ctx.fillRect(-2, -110, 4, 110);
        g = ctx.createLinearGradient(0, -104, 0, 0);
        g.addColorStop(0, '#ffe2cc');
        g.addColorStop(1, '#f08a8a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(4, -104);
        ctx.lineTo(4, -6);
        ctx.lineTo(56, -6);
        ctx.fill();
        ctx.fillStyle = '#f7b7a3';
        ctx.beginPath();
        ctx.moveTo(-4, -96);
        ctx.lineTo(-4, -8);
        ctx.lineTo(-50, -8);
        ctx.fill();
        ctx.restore();
      },
    };
  }

  /* ---------- Night Traffic ---------- */
  function city() {
    const r = rng(23);
    const stars = Array.from({ length: 90 }, () => ({
      x: r(), y: r() * 0.5, s: r() * 1.6 + 0.4, k: 1 + ((r() * 4) | 0), ph: r(),
    }));
    function skyline(seed, minH, maxH, minW, maxW) {
      const q = rng(seed), list = [];
      for (let x = -0.02; x < 1.02;) {
        const bw = minW + q() * (maxW - minW);
        const bh = minH + q() * (maxH - minH);
        const wc = Math.max(2, Math.round((bw * 960) / 20)), wr = Math.max(3, Math.round((bh * 540) / 22));
        const wins = [];
        for (let i = 0; i < wc * wr; i++) {
          wins.push({ lit: q() < 0.45, flick: q() < 0.08, k: 1 + ((q() * 3) | 0), ph: q() });
        }
        list.push({ x, bw, bh, wc, wr, wins, antenna: q() < 0.3 });
        x += bw + q() * 0.012;
      }
      return list;
    }
    const back = skyline(5, 0.3, 0.55, 0.05, 0.1);
    const front = skyline(9, 0.15, 0.42, 0.07, 0.13);
    const colors = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8ecae6', '#c77dff', '#f1faee'];
    const laneA = [0, 1, 2, 3].map((i) => ({ x: i / 4 + r() * 0.08, c: colors[(r() * colors.length) | 0], L: 70 + r() * 20 }));
    const laneB = [0, 1, 2].map((i) => ({ x: i / 3 + r() * 0.1, c: colors[(r() * colors.length) | 0], L: 95 + r() * 25 }));

    function car(ctx, x, y, dir, color, L) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      const g = ctx.createLinearGradient(L * 0.45, 0, L * 2.1, 0);
      g.addColorStop(0, 'rgba(255,240,200,0.4)');
      g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(L * 0.45, -L * 0.15);
      ctx.lineTo(L * 2.1, -L * 0.3);
      ctx.lineTo(L * 2.1, L * 0.12);
      ctx.lineTo(L * 0.45, -L * 0.08);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-L / 2, -L * 0.24, L, L * 0.19, L * 0.05);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-L * 0.3, -L * 0.23);
      ctx.lineTo(-L * 0.18, -L * 0.38);
      ctx.lineTo(L * 0.14, -L * 0.38);
      ctx.lineTo(L * 0.28, -L * 0.23);
      ctx.fill();
      ctx.fillStyle = 'rgba(160,200,235,0.65)';
      ctx.beginPath();
      ctx.moveTo(-L * 0.24, -L * 0.24);
      ctx.lineTo(-L * 0.15, -L * 0.34);
      ctx.lineTo(-L * 0.02, -L * 0.34);
      ctx.lineTo(-L * 0.02, -L * 0.24);
      ctx.moveTo(L * 0.02, -L * 0.24);
      ctx.lineTo(L * 0.02, -L * 0.34);
      ctx.lineTo(L * 0.12, -L * 0.34);
      ctx.lineTo(L * 0.22, -L * 0.24);
      ctx.fill();
      ctx.fillStyle = '#0b0b10';
      ellipse(ctx, -L * 0.28, -L * 0.05, L * 0.09, L * 0.09);
      ellipse(ctx, L * 0.28, -L * 0.05, L * 0.09, L * 0.09);
      ctx.fillStyle = '#fff6d0';
      ctx.fillRect(L * 0.46, -L * 0.19, L * 0.04, L * 0.05);
      ctx.fillStyle = '#ff3040';
      ctx.fillRect(-L * 0.5, -L * 0.19, L * 0.03, L * 0.05);
      ctx.restore();
    }

    return {
      name: 'Night Traffic',
      duration: 12,
      draw(ctx, w, h, t, p) {
        const ground = h * 0.74;
        let g = ctx.createLinearGradient(0, 0, 0, ground);
        g.addColorStop(0, '#070b1f');
        g.addColorStop(0.6, '#1b2457');
        g.addColorStop(1, '#5a3a78');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, ground);

        for (const s of stars) {
          ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.75 * Math.abs(Math.sin(TAU * (p * s.k + s.ph)))})`;
          ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
        }

        const mx = w * 0.82, my = h * 0.16, mr = h * 0.07;
        g = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 4);
        g.addColorStop(0, 'rgba(240,235,200,0.35)');
        g.addColorStop(1, 'rgba(240,235,200,0)');
        ctx.fillStyle = g;
        ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
        ctx.fillStyle = '#f3efd2';
        ellipse(ctx, mx, my, mr, mr);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ellipse(ctx, mx - mr * 0.3, my - mr * 0.2, mr * 0.25, mr * 0.25);
        ellipse(ctx, mx + mr * 0.35, my + mr * 0.3, mr * 0.18, mr * 0.18);

        // Plane with blinking light
        const px = wrap(0.3 + p) * (w + 100) - 50, py = h * 0.1;
        ctx.fillStyle = '#fff';
        ctx.fillRect(px, py, 3, 2);
        if (Math.sin(TAU * p * 12) > 0.5) {
          ctx.fillStyle = '#ff4040';
          ellipse(ctx, px - 6, py + 1, 2.5, 2.5);
        }

        for (const b of back) {
          const bx = b.x * w, bw = b.bw * w, bh = b.bh * h;
          ctx.fillStyle = '#151b3d';
          ctx.fillRect(bx, ground - bh, bw, bh);
          if (b.antenna) {
            ctx.fillRect(bx + bw / 2 - 1, ground - bh - 24, 2, 24);
            if (Math.sin(TAU * p * 3 + b.x * 10) > 0) {
              ctx.fillStyle = '#ff3b3b';
              ellipse(ctx, bx + bw / 2, ground - bh - 25, 2.5, 2.5);
            }
          }
        }

        front.forEach((b, i) => {
          const bx = b.x * w, bw = b.bw * w, bh = b.bh * h, top = ground - bh;
          ctx.fillStyle = '#212955';
          ctx.fillRect(bx, top, bw, bh);
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(bx, top, 3, bh);
          const cw = bw / b.wc, rh = bh / b.wr;
          b.wins.forEach((win, j) => {
            const cx = j % b.wc, cy = (j / b.wc) | 0;
            let lit = win.lit;
            if (win.flick && Math.sin(TAU * (p * win.k + win.ph)) > 0.3) lit = !lit;
            ctx.fillStyle = lit ? (j % 3 ? '#ffd27a' : '#ffb85c') : '#2b3466';
            ctx.fillRect(bx + cx * cw + cw * 0.25, top + cy * rh + rh * 0.3, cw * 0.5, rh * 0.45);
          });
          if (i === 3) {
            const hue = (p * 720) % 360;
            ctx.save();
            ctx.shadowColor = `hsl(${hue},100%,60%)`;
            ctx.shadowBlur = 18;
            ctx.strokeStyle = `hsl(${hue},100%,65%)`;
            ctx.lineWidth = 3;
            ctx.strokeRect(bx + 6, top + 10, bw - 12, 34);
            ctx.fillStyle = `hsl(${(hue + 180) % 360},100%,70%)`;
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('NOODLES', bx + bw / 2, top + 28, bw - 20);
            ctx.restore();
          }
        });

        ctx.fillStyle = '#2a2d3d';
        ctx.fillRect(0, ground, w, h * 0.04);
        ctx.fillStyle = '#15161f';
        ctx.fillRect(0, ground + h * 0.04, w, h);
        ctx.fillStyle = '#c9b458';
        for (let x = 0; x < w; x += 70) ctx.fillRect(x, h * 0.885, 34, 3);

        for (const f of [0.12, 0.37, 0.62, 0.87]) {
          const x = f * w, top = ground - h * 0.2;
          g = ctx.createLinearGradient(0, top, 0, h);
          g.addColorStop(0, 'rgba(255,210,130,0.28)');
          g.addColorStop(1, 'rgba(255,210,130,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x + 18, top + 4);
          ctx.lineTo(x + 90, h);
          ctx.lineTo(x - 54, h);
          ctx.fill();
          ctx.fillStyle = '#3b3f52';
          ctx.fillRect(x - 2, top, 4, ground - top + h * 0.02);
          ctx.fillRect(x, top, 20, 3);
          ctx.fillStyle = '#ffe1a0';
          ctx.fillRect(x + 12, top + 3, 12, 4);
        }

        for (const c of laneA) car(ctx, wrap(c.x + p) * (w + 300) - 150, h * 0.86, 1, c.c, c.L);
        for (const c of laneB) car(ctx, wrap(c.x - p * 2) * (w + 300) - 150, h * 0.97, -1, c.c, c.L);
      },
    };
  }

  /* ---------- Coral Reef ---------- */
  function reef() {
    const r = rng(37);
    const palettes = [
      ['#ff8a3d', '#fff3e6'], ['#ffd23f', '#3a86ff'], ['#e63946', '#f1faee'],
      ['#7bdff2', '#2b2d42'], ['#c77dff', '#ffd6ff'], ['#06d6a0', '#073b4c'],
    ];
    const fish = Array.from({ length: 10 }, (_, i) => ({
      x: r(), dir: r() < 0.5 ? 1 : -1, k: 1 + ((r() * 2) | 0), y: 0.12 + r() * 0.6,
      amp: 6 + r() * 18, m: 1 + ((r() * 3) | 0), ph: r(), size: 26 + r() * 40,
      pal: palettes[i % palettes.length], stripes: r() < 0.5,
    }));
    const bubbles = Array.from({ length: 36 }, () => ({ x: r(), y: r(), k: 1 + ((r() * 3) | 0), s: 1.5 + r() * 4, ph: r() }));
    const weeds = Array.from({ length: 11 }, (_, i) => ({ x: (i + r() * 0.6) / 11, hgt: 0.2 + r() * 0.3, ph: r(), c: r() < 0.5 ? '#2f9e44' : '#5cb85c' }));
    const corals = Array.from({ length: 7 }, () => ({ x: r(), s: 18 + r() * 26, c: ['#ff6f91', '#ff9671', '#ffc75f', '#d65db1'][(r() * 4) | 0], seed: (r() * 1e6) | 0 }));
    const pebbles = Array.from({ length: 50 }, () => ({ x: r(), y: r(), s: 2 + r() * 5, c: r() < 0.5 ? '#9c7a45' : '#c9a66b' }));
    const sandY = (x, h) => h * 0.84 + Math.sin(x * 0.012 + 1) * h * 0.02 + Math.sin(x * 0.031) * h * 0.008;

    function fishShape(ctx, x, y, dir, L, pal, stripes, wag) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      ctx.fillStyle = pal[0];
      ctx.beginPath();
      ctx.moveTo(-L * 0.4, 0);
      ctx.lineTo(-L * 0.78, -L * 0.28 + wag * L * 0.12);
      ctx.lineTo(-L * 0.68, wag * L * 0.12);
      ctx.lineTo(-L * 0.78, L * 0.28 + wag * L * 0.12);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-L * 0.15, -L * 0.2);
      ctx.quadraticCurveTo(0, -L * 0.48, L * 0.18, -L * 0.2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, L * 0.5, L * 0.26, 0, 0, TAU);
      ctx.fill();
      if (stripes) {
        ctx.save();
        ctx.clip();
        ctx.fillStyle = pal[1];
        ctx.fillRect(-L * 0.18, -L, L * 0.09, L * 2);
        ctx.fillRect(L * 0.08, -L, L * 0.09, L * 2);
        ctx.restore();
      }
      ctx.fillStyle = '#fff';
      ellipse(ctx, L * 0.28, -L * 0.05, L * 0.07, L * 0.07);
      ctx.fillStyle = '#111';
      ellipse(ctx, L * 0.3, -L * 0.05, L * 0.035, L * 0.035);
      ctx.restore();
    }

    return {
      name: 'Coral Reef',
      duration: 14,
      draw(ctx, w, h, t, p) {
        let g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#2ec4d6');
        g.addColorStop(0.4, '#0b7fab');
        g.addColorStop(1, '#05294d');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        for (let i = 0; i < 7; i++) {
          const x0 = (i / 6) * w + Math.sin(TAU * (p + i * 0.17)) * 40;
          ctx.beginPath();
          ctx.moveTo(x0 - 18, 0);
          ctx.lineTo(x0 + 30, 0);
          ctx.lineTo(x0 + 150, h);
          ctx.lineTo(x0 + 40, h);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 2;
        for (let j = 0; j < 3; j++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 12) {
            const y = 8 + j * 14 + Math.sin(x * 0.03 + TAU * p * (j + 1)) * 4;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        // Seaweed (behind the sand line, swaying)
        for (const s of weeds) {
          let x = s.x * w, y = sandY(x, h) + 6, a = -Math.PI / 2;
          const seg = (s.hgt * h) / 8;
          ctx.strokeStyle = s.c;
          ctx.lineCap = 'round';
          for (let j = 0; j < 8; j++) {
            a += Math.sin(TAU * (p * 2 + s.ph) - j * 0.5) * 0.12;
            const nx = x + Math.cos(a) * seg, ny = y + Math.sin(a) * seg;
            ctx.lineWidth = 10 - j;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nx, ny);
            ctx.stroke();
            x = nx;
            y = ny;
          }
        }

        g = ctx.createLinearGradient(0, h * 0.8, 0, h);
        g.addColorStop(0, '#e8c98f');
        g.addColorStop(1, '#a8844f');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 10) ctx.lineTo(x, sandY(x, h));
        ctx.lineTo(w, h);
        ctx.fill();
        for (const b of pebbles) {
          const x = b.x * w;
          ctx.fillStyle = b.c;
          ellipse(ctx, x, sandY(x, h) + 8 + b.y * (h * 0.12), b.s, b.s * 0.6);
        }

        for (const c of corals) {
          const q = rng(c.seed), x = c.x * w, y = sandY(x, h) + 4;
          ctx.fillStyle = c.c;
          for (let i = 0; i < 7; i++) {
            const pulse = 1 + 0.08 * Math.sin(TAU * (p * 2 + i * 0.3));
            ellipse(ctx, x + (q() - 0.5) * c.s * 1.6, y - q() * c.s * 1.4, c.s * 0.35 * pulse, c.s * 0.35 * pulse);
          }
        }

        // Treasure chest that opens and closes
        const tx = w * 0.72, ty = sandY(tx, h) + 2, open = Math.max(0, Math.sin(TAU * p * 2));
        if (open > 0.05) {
          g = ctx.createRadialGradient(tx, ty - 26, 4, tx, ty - 26, 80 * open);
          g.addColorStop(0, 'rgba(255,220,90,0.7)');
          g.addColorStop(1, 'rgba(255,220,90,0)');
          ctx.fillStyle = g;
          ctx.fillRect(tx - 90, ty - 120, 180, 140);
        }
        ctx.fillStyle = '#7a4b22';
        ctx.fillRect(tx - 34, ty - 30, 68, 30);
        ctx.fillStyle = '#e0b040';
        ctx.fillRect(tx - 34, ty - 18, 68, 4);
        ctx.save();
        ctx.translate(tx - 34, ty - 30);
        ctx.rotate(-open * 0.9);
        ctx.fillStyle = '#8b5a2b';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(68, 0);
        ctx.quadraticCurveTo(68, -20, 34, -22);
        ctx.quadraticCurveTo(0, -20, 0, 0);
        ctx.fill();
        ctx.restore();

        for (const f of fish) {
          const x = wrap(f.x + f.dir * p * f.k) * (w + 220) - 110;
          const y = f.y * h + Math.sin(TAU * (p * f.m + f.ph)) * f.amp;
          fishShape(ctx, x, y, f.dir, f.size, f.pal, f.stripes, Math.sin(TAU * (p * 24 + f.ph)));
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.2;
        for (const b of bubbles) {
          const x = b.x * w + Math.sin(TAU * (p * 3 + b.ph)) * 6;
          const y = h * 0.95 - wrap(b.y + p * b.k) * h * 1.05;
          ctx.beginPath();
          ctx.arc(x, y, b.s, 0, TAU);
          ctx.stroke();
        }
      },
    };
  }

  /* ---------- Neon Bloom ---------- */
  function neon() {
    const mountains = (() => {
      const q = rng(51), pts = [];
      for (let i = 0; i <= 24; i++) pts.push([i / 24, 0.04 + q() * 0.1 + (Math.abs(i - 12) / 12) * 0.08]);
      return pts;
    })();

    function polygon(ctx, x, y, n, rad, rot) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = rot + (i * TAU) / n;
        ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.closePath();
    }

    return {
      name: 'Neon Bloom',
      duration: 10,
      draw(ctx, w, h, t, p) {
        const cx = w / 2, cy = h * 0.42, hz = h * 0.64;
        ctx.fillStyle = '#07030f';
        ctx.fillRect(0, 0, w, h);
        let g = ctx.createRadialGradient(cx, cy, 10, cx, cy, h * 0.7);
        g.addColorStop(0, `hsla(${(p * 360) % 360},80%,30%,0.6)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        // Synthwave floor
        g = ctx.createLinearGradient(0, hz, 0, h);
        g.addColorStop(0, '#2a0a3d');
        g.addColorStop(1, '#12051f');
        ctx.fillStyle = g;
        ctx.fillRect(0, hz, w, h - hz);
        ctx.strokeStyle = 'rgba(255,60,220,0.55)';
        ctx.lineWidth = 1.5;
        for (let i = -12; i <= 12; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * 20, hz);
          ctx.lineTo(cx + i * 140, h);
          ctx.stroke();
        }
        for (let i = 0; i < 12; i++) {
          const f = wrap(i / 12 + p * 2), y = hz + (h - hz) * Math.pow(f, 2.2);
          ctx.strokeStyle = `rgba(255,60,220,${0.2 + f * 0.6})`;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        ctx.fillStyle = '#1a0830';
        ctx.beginPath();
        ctx.moveTo(0, hz);
        for (const [x, y] of mountains) ctx.lineTo(x * w, hz - y * h * (x < 0.3 || x > 0.7 ? 1.3 : 0.4));
        ctx.lineTo(w, hz);
        ctx.fill();

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
          const f = wrap(p + i / 6);
          ctx.strokeStyle = `hsla(${(i * 50 + p * 360) % 360},100%,60%,${1 - f})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, 10 + f * h * 0.6, 0, TAU);
          ctx.stroke();
        }
        for (let L = 0; L < 4; L++) {
          const n = 5 + L * 2, rot = TAU * p * (L % 2 ? 1 : -1);
          const len = h * (0.1 + L * 0.07) * (1 + 0.12 * Math.sin(TAU * p * 2 + L));
          ctx.fillStyle = `hsla(${(L * 70 + p * 360) % 360},100%,60%,0.33)`;
          for (let j = 0; j < n; j++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rot + (j * TAU) / n);
            ellipse(ctx, len * 0.5, 0, len * 0.5, len * 0.14);
            ctx.restore();
          }
        }
        for (let i = 0; i < 20; i++) {
          for (let tr = 0; tr < 7; tr++) {
            const q = p - tr * 0.004;
            const x = cx + w * 0.38 * Math.sin(TAU * (q * 2 + i / 20));
            const y = cy + h * 0.3 * Math.sin(TAU * (q * 3 + i / 20) + 0.5);
            ctx.fillStyle = `hsla(${(i * 18 + p * 360) % 360},100%,65%,${0.9 - tr * 0.12})`;
            ellipse(ctx, x, y, 4.5 - tr * 0.5, 4.5 - tr * 0.5);
          }
        }
        ctx.globalCompositeOperation = 'source-over';

        // A different spinning shape in each corner
        const corners = [[70, 70, 3, 20], [w - 70, 70, 4, 140], [70, h - 70, 5, 200], [w - 70, h - 70, 6, 60]];
        corners.forEach(([x, y, n, hue], i) => {
          ctx.strokeStyle = `hsl(${hue},100%,62%)`;
          ctx.lineWidth = 4;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 14;
          polygon(ctx, x, y, n, 42, TAU * p * (i % 2 ? 1 : -1));
          ctx.stroke();
          polygon(ctx, x, y, n, 22, -TAU * p * (i % 2 ? 1 : -1));
          ctx.stroke();
        });
        ctx.shadowBlur = 0;
      },
    };
  }

  window.CLIPS = { sunset: sunset(), city: city(), reef: reef(), neon: neon() };
})();
