/* Jigsaw: a jigsaw puzzle where every piece keeps playing its part of a video. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const canvas = $('table');
  const ctx = canvas.getContext('2d');
  const hitCtx = document.createElement('canvas').getContext('2d');
  const frame = document.createElement('canvas');
  const fctx = frame.getContext('2d');

  const clipSel = $('clip'), countSel = $('count'), speedSel = $('speed'), scrub = $('scrub');

  const BW = 1000; // board width in world units
  const COUNTS = [12, 24, 48, 100, 200, 300, 500];
  const SPEEDS = [0.25, 0.5, 1, 1.5, 2];
  const STEP = 1 / 30;
  const LIBRARY = Array.isArray(window.VIDEO_LIBRARY) ? window.VIDEO_LIBRARY : [];
  const DEFAULT_CLIP = 'lib:Mandelbrot Dive.mp4';

  const st = {
    src: null, time: 0, playing: true, speed: 1, dirty: true,
    ghost: false, sound: true,
    pieces: [], order: [], groups: new Set(),
    cols: 0, rows: 0, pw: 0, ph: 0, unit: 0, margin: 0, bh: BW * 9 / 16,
    table: { x: 0, y: 0, w: 1, h: 1 },
    view: { s: 1, x: 0, y: 0, fit: 1 }, dpr: 1, W: 0, H: 0,
    drag: null, pinch: null, pointers: new Map(), scrubbing: false,
    started: 0, ended: 0, moves: 0, solved: false, tween: null,
    outline: 1, confetti: [], key: null,
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('jigsaw.' + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('jigsaw.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  /* ---------------- Sources: built-in clips and videos ---------------- */

  const videos = new Map(); // key -> { video, name }
  let userVideoCount = 0;

  function fillSelects() {
    const builtIn = document.createElement('optgroup');
    builtIn.label = 'Built-in clips';
    for (const [key, clip] of Object.entries(window.CLIPS)) builtIn.append(new Option(clip.name, key));
    clipSel.append(builtIn);
    if (LIBRARY.length) {
      const lib = document.createElement('optgroup');
      lib.label = 'Videos folder';
      for (const v of LIBRARY) lib.append(new Option(v.title || v.file, 'lib:' + v.file));
      clipSel.append(lib);
    }
    for (const n of COUNTS) countSel.append(new Option(String(n), String(n)));
    for (const s of SPEEDS) speedSel.append(new Option(s + '×', String(s)));
    speedSel.value = '1';

    // ?clip=reef&pieces=100 overrides the remembered settings.
    const saved = store.get('settings') || {};
    const params = new URLSearchParams(location.search);
    if (params.has('clip')) saved.clip = params.get('clip');
    if (params.has('pieces')) saved.count = +params.get('pieces');
    const has = (key) => [...clipSel.options].some((o) => o.value === key);
    const fallback = has(DEFAULT_CLIP) ? DEFAULT_CLIP : 'sunset';
    clipSel.value = saved.clip && has(saved.clip) ? saved.clip : fallback;
    countSel.value = COUNTS.includes(saved.count) ? String(saved.count) : '24';
    st.sound = saved.sound !== false;
    $('sound').setAttribute('aria-pressed', String(st.sound));
  }

  function saveSettings() {
    const clip = clipSel.value.startsWith('user:') ? undefined : clipSel.value;
    store.set('settings', { clip, count: +countSel.value, sound: st.sound });
  }

  function openVideo(key, url, name) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.addEventListener('loadeddata', () => {
        videos.set(key, { video, name });
        resolve();
      }, { once: true });
      video.addEventListener('error', () => reject(new Error(`Couldn't play “${name}” in this browser.`)), { once: true });
      video.src = url;
    });
  }

  // Switches to the selected source, loading it first if it is a video.
  async function selectSource(key) {
    if (st.src && st.src.type === 'video') st.src.video.pause();
    if (key.startsWith('lib:') && !videos.has(key)) {
      const item = LIBRARY.find((v) => v.file === key.slice(4));
      toast('Loading video…', 0);
      try {
        await openVideo(key, 'videos/' + encodeURIComponent(item.file), item.title || item.file);
      } catch (err) {
        toast(err.message);
        clipSel.value = 'sunset';
        return selectSource('sunset');
      }
      toast('');
    }
    if (videos.has(key)) {
      const { video, name } = videos.get(key);
      const scale = Math.min(1, 1280 / video.videoWidth);
      frame.width = Math.max(2, Math.round(video.videoWidth * scale));
      frame.height = Math.max(2, Math.round(video.videoHeight * scale));
      st.src = { type: 'video', key, video, name };
      video.currentTime = 0;
      video.playbackRate = st.speed;
      if (st.playing) video.play().catch(() => setPlaying(false));
    } else {
      st.src = { type: 'clip', key, clip: window.CLIPS[key] };
      frame.width = 960;
      frame.height = 540;
      st.time = 0;
    }
    st.dirty = true;
  }

  async function addUserVideo(file) {
    if (!file || !/^video\//.test(file.type)) {
      toast('That file is not a video.');
      return;
    }
    const key = 'user:' + ++userVideoCount;
    toast('Loading video…', 0);
    try {
      await openVideo(key, URL.createObjectURL(file), file.name);
    } catch (err) {
      toast(err.message);
      return;
    }
    toast('');
    let group = clipSel.querySelector('optgroup[data-user]');
    if (!group) {
      group = document.createElement('optgroup');
      group.label = 'Your videos';
      group.dataset.user = '1';
      clipSel.append(group);
    }
    const label = file.name.length > 28 ? file.name.slice(0, 25) + '…' : file.name;
    group.append(new Option(label, key));
    clipSel.value = key;
    await selectSource(key);
    newPuzzle();
  }

  function duration() {
    const s = st.src;
    if (!s) return 0;
    if (s.type === 'clip') return s.clip.duration;
    return isFinite(s.video.duration) ? s.video.duration : 0;
  }

  function currentTime() {
    return st.src.type === 'clip' ? st.time : st.src.video.currentTime;
  }

  function seek(t) {
    const d = duration();
    if (!d) return;
    t = ((t % d) + d) % d;
    if (st.src.type === 'clip') st.time = t;
    else st.src.video.currentTime = t;
    st.dirty = true;
  }

  function step(dir) {
    setPlaying(false);
    seek(currentTime() + dir * STEP);
  }

  function setPlaying(on) {
    st.playing = on;
    if (st.src && st.src.type === 'video') {
      if (on) st.src.video.play().catch(() => {});
      else st.src.video.pause();
    }
    $('play').innerHTML = on ? ICONS.pause : ICONS.play;
    $('play').title = on ? 'Pause (Space)' : 'Play (Space)';
  }

  function setSpeed(s) {
    st.speed = s;
    if (st.src && st.src.type === 'video') st.src.video.playbackRate = s;
  }

  function renderFrame(dt) {
    const s = st.src;
    if (!s) return;
    if (s.type === 'clip') {
      if (st.playing) st.time = (st.time + dt * st.speed) % s.clip.duration;
      else if (!st.dirty) return;
      fctx.save();
      s.clip.draw(fctx, frame.width, frame.height, st.time, st.time / s.clip.duration);
      fctx.restore();
    } else if (s.video.readyState >= 2) {
      fctx.drawImage(s.video, 0, 0, frame.width, frame.height);
    }
    st.dirty = false;
  }

  /* ---------------- Puzzle setup ---------------- */

  function newPuzzle() {
    const n = +countSel.value;
    const aspect = frame.width / frame.height;
    st.bh = BW / aspect;
    const { cols, rows } = gridFor(n, aspect);
    const geo = window.Pieces.build(cols, rows, BW, st.bh, (Math.random() * 1e9) | 0);
    Object.assign(st, { cols, rows, pw: geo.pw, ph: geo.ph, unit: geo.unit, margin: geo.margin });

    st.pieces = geo.pieces;
    st.groups = new Set();
    for (const p of st.pieces) makeGroup([p]);
    st.order = st.pieces.slice().sort(() => Math.random() - 0.5);

    Object.assign(st, { solved: false, tween: null, started: 0, ended: 0, moves: 0, outline: 1, confetti: [], drag: null });
    st.key = st.src.type === 'clip' || st.src.key.startsWith('lib:') ? `${clipName()}:${st.pieces.length}` : null;
    layoutTable();
    scatter([...st.groups]);
    fitView();
    $('win').hidden = true;
    $('hint').classList.remove('gone');
    updateProgress();
    saveSettings();
  }

  // Picks a grid close to n pieces whose cells are close to square.
  function gridFor(n, aspect) {
    let best = null;
    for (let rows = 2; rows <= n / 2; rows++) {
      for (const cols of [Math.floor(n / rows), Math.ceil(n / rows)]) {
        if (cols < 2) continue;
        const cost = (Math.abs(cols * rows - n) / n) * 3 + Math.abs(Math.log((aspect * rows) / cols)) * 0.6;
        if (!best || cost < best.cost) best = { cols, rows, cost };
      }
    }
    return best;
  }

  function clipName() {
    return st.src.type === 'clip' ? st.src.key : st.src.name;
  }

  function makeGroup(pieces) {
    const g = { ox: 0, oy: 0, pieces, locked: false, box: null };
    for (const p of pieces) p.g = g;
    measure(g);
    st.groups.add(g);
    return g;
  }

  // Bounding box of the group's cells, in board coordinates.
  function measure(g) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of g.pieces) {
      x0 = Math.min(x0, p.cx);
      y0 = Math.min(y0, p.cy);
      x1 = Math.max(x1, p.cx + st.pw);
      y1 = Math.max(y1, p.cy + st.ph);
    }
    g.box = { x0, y0, x1, y1 };
  }

  // The table is the area around the board where loose pieces lie.
  function layoutTable() {
    const aspect = st.W && st.H ? st.W / st.H : 16 / 10;
    const area = BW * st.bh * 4.2;
    let tw = Math.sqrt(area * aspect), th = tw / aspect;
    tw = Math.max(tw, BW * 1.3);
    th = Math.max(th, st.bh * 1.3);
    st.table = { x: (BW - tw) / 2, y: (st.bh - th) / 2, w: tw, h: th };
  }

  function scatter(groups) {
    const t = st.table, m = st.margin;
    for (const g of groups) {
      if (g.locked) continue;
      const bw = g.box.x1 - g.box.x0, bh = g.box.y1 - g.box.y0;
      let x = 0, y = 0;
      for (let i = 0; i < 40; i++) {
        x = t.x + m + Math.random() * Math.max(0, t.w - bw - 2 * m);
        y = t.y + m + Math.random() * Math.max(0, t.h - bh - 2 * m);
        const onBoard = x < BW + m && x + bw > -m && y < st.bh + m && y + bh > -m;
        if (!onBoard) break;
      }
      g.ox = x - g.box.x0;
      g.oy = y - g.box.y0;
    }
  }

  function scatterLoose() {
    if (st.solved) return;
    const loose = [...st.groups].filter((g) => !g.locked);
    scatter(loose);
    sfx.shuffle();
  }

  /* ---------------- View ---------------- */

  function resize() {
    const r = stage.getBoundingClientRect();
    st.dpr = Math.min(window.devicePixelRatio || 1, 2);
    st.W = r.width;
    st.H = r.height;
    canvas.width = Math.max(1, Math.round(r.width * st.dpr));
    canvas.height = Math.max(1, Math.round(r.height * st.dpr));
    if (st.pieces.length) fitView();
  }

  function fitView() {
    const t = st.table, pad = 12;
    const s = Math.min((st.W - pad * 2) / t.w, (st.H - pad * 2) / t.h);
    st.view = { s, fit: s, x: (st.W - t.w * s) / 2 - t.x * s, y: (st.H - t.h * s) / 2 - t.y * s };
  }

  function zoomAt(sx, sy, factor) {
    const v = st.view;
    const s = clamp(v.s * factor, v.fit * 0.5, v.fit * 8);
    const wx = (sx - v.x) / v.s, wy = (sy - v.y) / v.s;
    v.s = s;
    v.x = sx - wx * s;
    v.y = sy - wy * s;
  }

  function toWorld(pt) {
    const v = st.view;
    return { x: (pt.x - v.x) / v.s, y: (pt.y - v.y) / v.s };
  }

  /* ---------------- Interaction ---------------- */

  function hitTest(wx, wy) {
    const m = st.margin;
    for (let i = st.order.length - 1; i >= 0; i--) {
      const p = st.order[i];
      if (p.g.locked) continue;
      const lx = wx - p.cx - p.g.ox, ly = wy - p.cy - p.g.oy;
      if (lx < -m || ly < -m || lx > st.pw + m || ly > st.ph + m) continue;
      if (hitCtx.isPointInPath(p.path, lx, ly)) return p;
    }
    return null;
  }

  function toFront(g) {
    st.order = st.order.filter((p) => p.g !== g).concat(g.pieces);
  }

  function moveGroupTo(g, ox, oy) {
    const t = st.table;
    g.ox = clamp(ox, t.x - g.box.x0, t.x + t.w - g.box.x1);
    g.oy = clamp(oy, t.y - g.box.y0, t.y + t.h - g.box.y1);
  }

  // Joins g with any matching neighbours and locks it to the board when close.
  function snap(g) {
    const tol = st.unit * 0.28, tol2 = tol * tol;
    let result = null, again = true;
    while (again) {
      again = false;
      if (!g.locked && g.ox * g.ox + g.oy * g.oy < tol2) {
        g.ox = 0;
        g.oy = 0;
        g.locked = true;
        result = 'board';
        again = true;
        continue;
      }
      search: for (const p of g.pieces) {
        for (const q of p.nb) {
          const h = q.g;
          if (h === g) continue;
          const dx = h.ox - g.ox, dy = h.oy - g.oy;
          if (dx * dx + dy * dy < tol2) {
            if (!g.locked) {
              g.ox = h.ox;
              g.oy = h.oy;
            }
            g.locked = g.locked || h.locked;
            for (const r of h.pieces) {
              r.g = g;
              g.pieces.push(r);
            }
            st.groups.delete(h);
            measure(g);
            if (!result) result = 'join';
            again = true;
            break search;
          }
        }
      }
    }
    toFront(g);
    return result;
  }

  function finishDrag() {
    const g = st.drag.g;
    st.drag = null;
    st.moves++;
    const result = snap(g);
    if (result === 'board') sfx.lock();
    else if (result === 'join') sfx.join();
    else sfx.drop();
    updateProgress();
    if (st.groups.size === 1 && !st.solved && !st.tween) {
      const only = st.groups.values().next().value;
      if (only.locked) win();
      else st.tween = { g: only, fx: only.ox, fy: only.oy, t0: performance.now() };
    }
  }

  function localPoint(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function pinchInfo() {
    const [a, b] = [...st.pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button > 1) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    const pt = localPoint(e);
    st.pointers.set(e.pointerId, pt);

    if (st.pointers.size === 2) {
      if (st.drag && st.drag.type === 'piece') finishDrag();
      st.drag = null;
      const { d, mid } = pinchInfo();
      st.pinch = { d, s: st.view.s, world: toWorld(mid) };
      return;
    }
    if (st.pointers.size > 2) return;

    const w = toWorld(pt);
    const p = e.button === 0 && !st.solved && !st.tween ? hitTest(w.x, w.y) : null;
    if (p) {
      toFront(p.g);
      st.drag = { type: 'piece', id: e.pointerId, g: p.g, gx: p.g.ox - w.x, gy: p.g.oy - w.y };
      if (!st.started) st.started = performance.now();
      $('hint').classList.add('gone');
      canvas.style.cursor = 'grabbing';
    } else {
      st.drag = { type: 'pan', id: e.pointerId, x: pt.x, y: pt.y, vx: st.view.x, vy: st.view.y };
      canvas.style.cursor = 'move';
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const pt = localPoint(e);
    if (st.pointers.has(e.pointerId)) st.pointers.set(e.pointerId, pt);

    if (st.pinch && st.pointers.size >= 2) {
      const { d, mid } = pinchInfo();
      const v = st.view;
      v.s = clamp((st.pinch.s * d) / st.pinch.d, v.fit * 0.5, v.fit * 8);
      v.x = mid.x - st.pinch.world.x * v.s;
      v.y = mid.y - st.pinch.world.y * v.s;
      return;
    }

    const d = st.drag;
    if (!d) {
      if (e.pointerType === 'mouse') {
        const w = toWorld(pt);
        canvas.style.cursor = !st.solved && hitTest(w.x, w.y) ? 'grab' : 'default';
      }
      return;
    }
    if (d.id !== e.pointerId) return;
    if (d.type === 'piece') {
      const w = toWorld(pt);
      moveGroupTo(d.g, w.x + d.gx, w.y + d.gy);
    } else {
      st.view.x = d.vx + pt.x - d.x;
      st.view.y = d.vy + pt.y - d.y;
    }
  });

  function endPointer(e) {
    st.pointers.delete(e.pointerId);
    if (st.pinch) {
      if (st.pointers.size < 2) st.pinch = null;
      return;
    }
    const d = st.drag;
    if (d && d.id === e.pointerId) {
      if (d.type === 'piece') finishDrag();
      st.drag = null;
      canvas.style.cursor = 'default';
    }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const pt = localPoint(e);
    const delta = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
    zoomAt(pt.x, pt.y, Math.exp(-delta * 0.0015));
  }, { passive: false });

  /* ---------------- Drawing ---------------- */

  function draw() {
    const v = st.view, dpr = st.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!st.pieces.length) return;
    ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.x, dpr * v.y);

    const t = st.table;
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.beginPath();
    ctx.roundRect(t.x, t.y, t.w, t.h, 28);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(0, 0, BW, st.bh);
    if (st.ghost) {
      ctx.globalAlpha = 0.3;
      ctx.drawImage(frame, 0, 0, BW, st.bh);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5 / v.s;
    ctx.strokeRect(0, 0, BW, st.bh);

    const view = { x0: -v.x / v.s, y0: -v.y / v.s };
    view.x1 = view.x0 + st.W / v.s;
    view.y1 = view.y0 + st.H / v.s;
    const lifted = st.drag && st.drag.type === 'piece' ? st.drag.g : st.tween ? st.tween.g : null;

    // Once solved, the pieces fade into one seamless picture with no cut lines.
    const seamless = st.solved ? 1 - st.outline : 0;
    if (seamless < 1) {
      for (const p of st.order) if (p.g.locked && p.g !== lifted) drawPiece(p, view, 0.35);
      for (const p of st.order) if (!p.g.locked && p.g !== lifted) drawPiece(p, view, 1);
      if (lifted) {
        for (const p of lifted.pieces) drawShadow(p);
        for (const p of lifted.pieces) drawPiece(p, view, 1);
      }
    }
    if (seamless > 0) {
      ctx.globalAlpha = seamless;
      ctx.drawImage(frame, 0, 0, BW, st.bh);
      ctx.globalAlpha = 1;
    }

    drawConfetti();
  }

  function drawShadow(p) {
    ctx.save();
    ctx.translate(p.cx + p.g.ox, p.cy + p.g.oy);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 16 * st.dpr;
    ctx.shadowOffsetY = 6 * st.dpr;
    ctx.fillStyle = '#000';
    ctx.fill(p.path);
    ctx.restore();
  }

  function drawPiece(p, view, outlineAlpha) {
    const m = st.margin, x = p.cx + p.g.ox, y = p.cy + p.g.oy;
    if (x + st.pw + m < view.x0 || x - m > view.x1 || y + st.ph + m < view.y0 || y - m > view.y1) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.save();
    ctx.clip(p.path);
    const fs = frame.width / BW;
    const x0 = Math.max(0, p.cx - m), y0 = Math.max(0, p.cy - m);
    const x1 = Math.min(BW, p.cx + st.pw + m), y1 = Math.min(st.bh, p.cy + st.ph + m);
    ctx.drawImage(frame, x0 * fs, y0 * fs, (x1 - x0) * fs, (y1 - y0) * fs, x0 - p.cx, y0 - p.cy, x1 - x0, y1 - y0);
    ctx.restore();

    const a = outlineAlpha * st.outline;
    if (a > 0.01) {
      ctx.globalAlpha = a;
      ctx.lineWidth = 1.3 / st.view.s;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.stroke(p.path);
    }
    ctx.restore();
  }

  /* ---------------- Winning ---------------- */

  function win() {
    st.solved = true;
    st.ended = performance.now();
    const secs = st.started ? (st.ended - st.started) / 1000 : 0;
    let line = `${st.pieces.length} pieces · ${fmt(secs)} · ${st.moves} moves`;
    if (st.key) {
      const best = store.get('best.' + st.key);
      if (!best || secs < best) {
        store.set('best.' + st.key, secs);
        if (best) line += ' · new best!';
      } else {
        line += ` · best ${fmt(best)}`;
      }
    }
    $('winText').textContent = line;
    setPlaying(true);
    sfx.win();
    burst();
    updateProgress();
    setTimeout(() => { if (st.solved) $('win').hidden = false; }, 700);
  }

  function burst() {
    const colors = ['#ffb35c', '#ff6f91', '#7bdff2', '#c77dff', '#06d6a0', '#ffd23f'];
    for (let i = 0; i < 180; i++) {
      st.confetti.push({
        x: Math.random() * st.W, y: -20 - Math.random() * st.H * 0.4,
        vx: (Math.random() - 0.5) * 120, vy: 80 + Math.random() * 160,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 10,
        s: 5 + Math.random() * 6, c: colors[i % colors.length],
      });
    }
  }

  function updateConfetti(dt) {
    for (const c of st.confetti) {
      c.vy += 200 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.r += c.vr * dt;
    }
    st.confetti = st.confetti.filter((c) => c.y < st.H + 30);
  }

  function drawConfetti() {
    if (!st.confetti.length) return;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    for (const c of st.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.r);
      ctx.fillStyle = c.c;
      ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2);
      ctx.restore();
    }
  }

  /* ---------------- Sound ---------------- */

  const sfx = (() => {
    let ac = null;
    function audio() {
      if (!st.sound) return null;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ac) ac = new AC();
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function tone(freq, at, dur, type, vol) {
      const a = audio();
      if (!a) return;
      const t = a.currentTime + at;
      const o = a.createOscillator(), g = a.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + dur);
    }
    return {
      drop: () => tone(170, 0, 0.06, 'triangle', 0.06),
      join: () => { tone(520, 0, 0.09, 'triangle', 0.12); tone(780, 0.05, 0.12, 'triangle', 0.1); },
      lock: () => { tone(660, 0, 0.1, 'sine', 0.14); tone(990, 0.06, 0.18, 'sine', 0.12); },
      shuffle: () => { for (let i = 0; i < 5; i++) tone(200 + Math.random() * 300, i * 0.03, 0.05, 'triangle', 0.05); },
      win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, 0.35, 'triangle', 0.13)),
    };
  })();

  /* ---------------- UI ---------------- */

  const ICONS = {
    play: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 4.5v15l12.5-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>',
  };

  let toastTimer = 0;
  function toast(msg, ms = 3000) {
    const el = $('toast');
    clearTimeout(toastTimer);
    el.textContent = msg;
    el.hidden = !msg;
    if (msg && ms) toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  }

  function updateProgress() {
    const n = st.pieces.length;
    let placed = 0;
    for (const g of st.groups) if (g.locked) placed += g.pieces.length;
    $('progress').textContent = `${placed} / ${n} placed`;
  }

  let lastUi = '';
  function updateUi() {
    const secs = st.started ? ((st.ended || performance.now()) - st.started) / 1000 : 0;
    const d = duration(), t = st.src ? currentTime() : 0;
    const ui = `${fmt(secs)}|${t.toFixed(1)}|${d}`;
    if (ui === lastUi) return;
    lastUi = ui;
    $('timer').textContent = fmt(secs);
    $('time').textContent = d ? `${t.toFixed(1)} / ${d.toFixed(1)}s` : '';
    if (!st.scrubbing && d) scrub.value = String(Math.round((t / d) * 1000));
  }

  function toggleGhost() {
    st.ghost = !st.ghost;
    $('ghost').setAttribute('aria-pressed', String(st.ghost));
  }

  clipSel.addEventListener('change', async () => {
    await selectSource(clipSel.value);
    newPuzzle();
  });
  countSel.addEventListener('change', newPuzzle);
  speedSel.addEventListener('change', () => setSpeed(+speedSel.value));
  $('new').addEventListener('click', newPuzzle);
  $('again').addEventListener('click', newPuzzle);
  $('admire').addEventListener('click', () => { $('win').hidden = true; });
  $('upload').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', (e) => {
    addUserVideo(e.target.files[0]);
    e.target.value = '';
  });
  $('play').addEventListener('click', () => setPlaying(!st.playing));
  $('back').addEventListener('click', () => step(-1));
  $('fwd').addEventListener('click', () => step(1));
  $('ghost').addEventListener('click', toggleGhost);
  $('scatter').addEventListener('click', scatterLoose);
  $('fit').addEventListener('click', fitView);
  $('sound').addEventListener('click', () => {
    st.sound = !st.sound;
    $('sound').setAttribute('aria-pressed', String(st.sound));
    saveSettings();
  });

  scrub.addEventListener('pointerdown', () => { st.scrubbing = true; });
  scrub.addEventListener('input', () => seek((+scrub.value / 1000) * duration()));
  scrub.addEventListener('change', () => { st.scrubbing = false; });
  window.addEventListener('pointerup', () => { st.scrubbing = false; });

  // Mouse clicks shouldn't leave buttons focused, so Space keeps meaning play/pause.
  $('bar').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b && e.detail > 0) b.blur();
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof Element && e.target.matches('input, select, textarea')) return;
    switch (e.key) {
      case ' ': e.preventDefault(); setPlaying(!st.playing); break;
      case 'ArrowLeft': e.preventDefault(); step(-1); break;
      case 'ArrowRight': e.preventDefault(); step(1); break;
      case 'g': case 'G': toggleGhost(); break;
      case 'f': case 'F': fitView(); break;
      case 's': case 'S': scatterLoose(); break;
      case 'n': case 'N': newPuzzle(); break;
      case '+': case '=': zoomAt(st.W / 2, st.H / 2, 1.25); break;
      case '-': zoomAt(st.W / 2, st.H / 2, 0.8); break;
      default: return;
    }
  });

  // Drag a video file anywhere onto the page.
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    if (![...e.dataTransfer.types].includes('Files')) return;
    dragDepth++;
    $('drop').classList.add('on');
  });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) $('drop').classList.remove('on');
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    $('drop').classList.remove('on');
    if (e.dataTransfer.files.length) addUserVideo(e.dataTransfer.files[0]);
  });

  /* ---------------- Main loop ---------------- */

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    renderFrame(dt);

    if (st.tween) {
      const k = Math.min(1, (now - st.tween.t0) / 700), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      st.tween.g.ox = st.tween.fx * (1 - e);
      st.tween.g.oy = st.tween.fy * (1 - e);
      if (k === 1) {
        st.tween.g.locked = true;
        st.tween = null;
        win();
      }
    }
    if (st.solved && st.outline > 0) st.outline = Math.max(0, st.outline - dt * 0.8);
    updateConfetti(dt);
    draw();
    updateUi();
    requestAnimationFrame(loop);
  }

  async function start() {
    fillSelects();
    resize();
    new ResizeObserver(resize).observe(stage);
    setPlaying(true);
    await selectSource(clipSel.value);
    newPuzzle();
    requestAnimationFrame(loop);
  }

  if (location.hash === '#debug') window.jigsaw = { st, snap, finishDrag, win };
  start();
})();
