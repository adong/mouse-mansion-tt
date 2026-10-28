/* TT Mouse Mansion: the rules, with no drawing, in fixed 1/60 s steps (the page, the autopilot and the checks all run these).
   - Mice (Teddy and Tommy in mouse ears) walk along the floors. Walking off a room's end drops you down a shaft onto
     its trampoline: you bounce up and down the shaft, and pressing ← or → gets you off at the next floor you pass on
     that side. On NORMAL a trampoline wears out: come down on it a fifth time in a row and it tears, and you plop onto
     the basement pillow (a life). On EASY it never tears. Getting off onto a floor resets the count.
   - Doors: the door key opens or closes the door next to you. It swings away from you; a cat in its way is bonked
     (dizzy, knocked back). A glowing door also sends a bubble wave along its floor: every cat ahead of it on that floor
     tumbles away and floats off (it comes back later through the roof hatch). Closed doors block mice and cats.
   - Toys: grab every toy to clear the mansion. Two of the same kind in a row is a PAIR bonus.
   - Silly cats come in through the roof hatch and find their way to the nearest mouse along the floors and down and up
     the shafts. A cat touching a mouse on a floor gives him a big hug (a life). Nobody is ever caught in a shaft.
   - 2 players: two mice together. 1 player: call the other brother any time; he opens every door at once and sends
     every cat tumbling, and nothing can hug you while he's here.
   w.sab (the check's sabotages) breaks one rule on purpose so js/check.js can prove it notices. */
(function (root) {
  'use strict';
  const MM = (root.MM = root.MM || {});
  const LV = MM.levels;
  const { FLOOR_Y, WALL, SX, SW, SEGS, TRAMP_Y, APEX_Y, PILLOW_Y } = LV;
  const DT = 1 / 60;
  const PR = 0.34, CR = 0.4; // a mouse's and a cat's half width
  const DOOR_HALF = 0.2, REACH = 1.6, SWING = 2.0, KNOCK = 2.7;
  const CATCH_R = 0.72, TOY_R = 0.7;
  const WAVE_V = 12, WAVE_REACH = 1.3; // the bubble wave's speed, and how far above or below its floor it scoops a cat in a shaft
  const HANG = 0.16, EXIT_EPS = 0.06;
  const READY = 1.5, CLEAR_T = 3.2, HUG_T = 1.6, PLOP_T = 1.7, ARRIVE_T = 0.6, SWEPT_UP = 1.4;
  const B_TREAT = 0.6, B_GO = 1.0, B_OPEN = 1.7, B_END = 2.7; // the brother's visit
  const TREATS = ['🍦', '💧', '🧃', '🍪', '🍉', '🍌'];
  const SCORE = { toy: 300, pair: 1000, bonk: 100, wave: 200, buddyCat: 200, treat: 100, hi5: 50, clear: 1000 };
  const WEAR = 4; // bounces in a row a trampoline can take (NORMAL); the next landing tears it
  const CFG = {
    easy: { lives: 5, walk: 4.2, vspeed: 6.2, cat: 2.1, catUp: 0.12, cats: [2, 2, 3, 3, 3, 3], stun: 4.5, back: 7, wear: false, chase: 6, wander: 3.5 },
    normal: { lives: 3, walk: 4.6, vspeed: 7, cat: 3.0, catUp: 0.18, cats: [3, 3, 4, 4, 4, 5], stun: 3, back: 4.5, wear: true, chase: 11, wander: 1.5 },
  };

  const ev = (w, type, o) => w.events.push(Object.assign({ type }, o));
  const segAt = (x) => SEGS.find((s) => x >= s.x0 - 1e-6 && x <= s.x1 + 1e-6) || null;
  const shaftAt = (x) => SX.findIndex((c) => Math.abs(x - c) <= SW + 1e-6);
  // which segment is on side `side` of shaft k (-1 none: a wall)
  const segBeside = (k, side) => (side > 0 ? (k <= 2 ? k : -1) : k >= 1 ? k - 1 : -1);
  const edgeOf = (k, side) => SX[k] + side * SW; // where the floor starts on that side of shaft k

  function create(o) {
    o = o || {};
    const level = o.level === 'normal' ? 'normal' : 'easy';
    const cfg = CFG[level];
    const who = o.players || ['teddy'];
    const w = {
      level, cfg, two: who.length === 2, t: 0, phase: 'ready', phaseT: 0, li: o.stage || 0, round: 1,
      players: who.map((id, i) => newPlayer(id, i, cfg.lives)), cats: [], doors: [], toys: [], waves: [], tramp: SX.map(() => ({ torn: 0 })),
      queue: 0, spawnT: 0, cid: 0, wid: 0, buddy: null, calls: 0, waveN: 0,
      buddyFor: o.buddyFor || ((id) => (id === 'tommy' ? 'teddy' : 'tommy')), events: [], sab: o.sabotage || null, seed: o.seed || 1, rng: (o.seed || 1) >>> 0,
    };
    loadStage(w, true);
    if (o.go) { w.phase = 'play'; w.phaseT = 0; }
    w.events = [];
    return w;
  }
  function rand(w) { w.rng = (Math.imul(w.rng ^ (w.rng >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0; return (w.rng & 0xffffff) / 0x1000000; }
  function newPlayer(who, i, lives) {
    return { i, who, score: 0, lives, out: false, extra: false, x: 0, y: 0, f: 0, sh: -1, mode: 'ground', vdir: 0, hang: 0, bounces: 0, armed: false, want: 0, face: 1, t: 0, inv: 0, walkT: 0, lastToy: null, toys: 0, safe: false, act: false };
  }
  const startX = (w, p) => (w.two ? (p.i ? 1.5 : -1.5) : -1.5);

  function loadStage(w, first) {
    const L = LV.LEVELS[w.li % LV.LEVELS.length];
    w.round = Math.floor(w.li / LV.LEVELS.length) + 1;
    w.doors = L.doors.map((d, i) => ({ id: i, f: d.f, s: d.s, x: d.x, open: d.open, glow: d.glow, swing: 1, t: 9 }));
    w.toys = L.toys.map((t, i) => ({ id: i, f: t.f, x: t.x, kind: t.kind, got: false }));
    w.cats = [];
    w.waves = [];
    w.tramp.forEach((tr) => (tr.torn = 0));
    w.queue = w.cfg.cats[Math.min(w.li, w.cfg.cats.length - 1)] + (w.round > 1 ? 1 : 0);
    w.spawnT = 0.8;
    for (const p of w.players) {
      if (p.mode === 'hug' || p.mode === 'plop') loseLife(w, p);
      if (p.out) continue;
      placeStart(w, p);
      p.lastToy = null;
    }
    w.phase = 'ready';
    w.phaseT = 0;
    if (!first) ev(w, 'stage', { li: w.li });
  }
  function placeStart(w, p) {
    p.x = startX(w, p); p.y = 0; p.f = 0; p.sh = -1; p.mode = 'ground'; p.vdir = 0; p.bounces = 0; p.armed = false; p.want = 0;
    p.face = p.x < 0 ? 1 : -1;
  }

  // ---------- one step ----------
  function step(w, inputs) {
    w.events = [];
    w.t += DT;
    w.phaseT += DT;
    if (w.buddy) stepBuddy(w);
    if (w.phase === 'ready' && w.phaseT >= READY) { w.phase = 'play'; w.phaseT = 0; ev(w, 'go'); }
    if (w.phase === 'play') spawn(w);
    const live = w.phase === 'play' || w.phase === 'ready';
    w.players.forEach((p, i) => stepPlayer(w, p, w.phase === 'play' && inputs ? (Array.isArray(inputs) ? inputs[i] : i === 0 ? inputs : null) : null, live));
    for (const tr of w.tramp) tr.torn = Math.max(0, tr.torn - DT);
    for (const d of w.doors) d.t += DT;
    stepWaves(w);
    for (const c of w.cats) stepCat(w, c);
    contacts(w);
    if (w.phase === 'play' && w.toys.every((t) => t.got) && w.sab !== 'neverClear') clear(w);
    if (w.phase === 'play' && w.sab === 'clearEarly' && w.toys.filter((t) => !t.got).length <= 1 && w.toys.some((t) => t.got)) clear(w);
    if (w.phase === 'clear' && w.phaseT >= CLEAR_T) { w.li++; loadStage(w); }
    if (w.phase !== 'over' && w.players.every((p) => p.out)) { w.phase = 'over'; w.phaseT = 0; ev(w, 'over'); }
  }
  function clear(w) {
    w.phase = 'clear';
    w.phaseT = 0;
    for (const p of w.players) if (!p.out) addScore(w, p, SCORE.clear);
    for (const c of w.cats) if (c.st === 'walk' || c.st === 'shaft' || c.st === 'stun') { c.st = 'swept'; c.t2 = 0; c.vx = 0; }
    ev(w, 'clear', { li: w.li });
  }

  // ---------- cats come in through the roof hatch ----------
  function spawn(w) {
    if (w.queue <= 0) return;
    w.spawnT -= DT;
    if (w.spawnT > 0) return;
    w.spawnT = 1.6;
    w.queue--;
    addCat(w);
  }
  // the top floor's three hatches; a new cat takes the one farthest from the mice
  const HATCH = [-8.5, 1.8, 8.5];
  function hatchX(w) {
    const ps = w.players.filter((p) => !p.out);
    let best = HATCH[0], bd = -1;
    for (const x of HATCH) {
      const d = ps.length ? Math.min(...ps.map((p) => Math.abs(p.x - x) + Math.abs(p.y - FLOOR_Y[3]))) : 99;
      if (d > bd) { bd = d; best = x; }
    }
    return best;
  }
  function addCat(w, f, x, o) {
    const c = Object.assign({
      id: ++w.cid, st: 'in', f: 3, x: hatchX(w), y: FLOOR_Y[3], sh: -1, dir: 1, vdir: 0, hang: 0, armed: false, plan: null,
      t: 0, t2: 0, stunT: 0, awayT: 0, vx: 0, mood: 'chase', moodT: w.cfg.chase * (0.6 + 0.4 * rand(w)), wx: 0, wf: 0, hue: (w.cid - 1) % 4, hugT: 0, tx: 0,
    }, o || {});
    if (f != null) { c.f = f; c.x = x; c.y = FLOOR_Y[f]; c.st = 'walk'; }
    w.cats.push(c);
    ev(w, 'catIn', { id: c.id, x: c.x, y: c.y });
    return c;
  }
  const catSpeed = (w, c) => w.cfg.cat * (1 + w.cfg.catUp * Math.min(5, w.li)) * (1 + 0.1 * (w.round - 1)) * (c.mood === 'wander' ? 0.8 : 1);

  // ---------- doors ----------
  const closedOn = (w, f) => w.doors.filter((d) => d.f === f && !d.open);
  // walking from x0 toward x1 on floor f: stop at a closed door
  function blockDoors(w, f, x0, x1, r) {
    const b = DOOR_HALF + r;
    for (const d of closedOn(w, f)) {
      if (x0 <= d.x && x1 > d.x - b) x1 = Math.min(x1, d.x - b);
      else if (x0 >= d.x && x1 < d.x + b) x1 = Math.max(x1, d.x + b);
    }
    return x1;
  }
  function nearDoor(w, p) {
    let best = null;
    for (const d of w.doors) {
      if (d.f !== p.f) continue;
      const dx = Math.abs(d.x - p.x);
      if (dx <= REACH && (!best || dx < Math.abs(best.x - p.x))) best = d;
    }
    return best;
  }
  function useDoor(w, p, d) {
    if (d.open) {
      d.open = false;
      d.t = 0;
      // anyone standing in the doorway is nudged to his own side
      for (const q of w.players) if (q.mode === 'ground' && q.f === d.f && Math.abs(q.x - d.x) < DOOR_HALF + PR) q.x = d.x + (q.x < d.x ? -1 : q.x > d.x ? 1 : -d.swing) * (DOOR_HALF + PR + 0.01);
      for (const c of w.cats) if (c.f === d.f && (c.st === 'walk' || c.st === 'stun') && Math.abs(c.x - d.x) < DOOR_HALF + CR) c.x = d.x + (c.x < d.x ? -1 : 1) * (DOOR_HALF + CR + 0.01);
      ev(w, 'doorClose', { id: d.id, f: d.f, x: d.x, i: p ? p.i : -1 });
      return;
    }
    const side = p ? Math.sign(d.x - p.x) || p.face : d.swing;
    openDoor(w, d, side, p);
  }
  function openDoor(w, d, side, p) {
    d.open = true;
    d.swing = side;
    d.t = 0;
    ev(w, 'doorOpen', { id: d.id, f: d.f, x: d.x, swing: side, glow: d.glow, i: p ? p.i : -1 });
    // the door swings away from the mouse: a cat in its way is bonked and knocked back
    let n = 0;
    for (const c of w.cats) {
      if (c.f !== d.f || (c.st !== 'walk' && c.st !== 'stun') || w.sab === 'noBonk') continue;
      const u = (c.x - d.x) * side;
      if (w.sab === 'bonkAll' ? Math.abs(c.x - d.x) > 8 : u < -0.3 || u > SWING) continue;
      bonkCat(w, c, d, side, p);
      n++;
    }
    if (d.glow && p) {
      d.glow = false;
      if (w.sab !== 'noWave') {
        w.waves.push({ id: ++w.wid, f: d.f, x: d.x, dir: side, n: 0, i: p.i, t: 0 });
        ev(w, 'wave', { f: d.f, x: d.x, dir: side, i: p.i });
      }
    }
    return n;
  }
  function bonkCat(w, c, d, side, p) {
    const seg = SEGS[d.s];
    c.st = 'stun';
    c.stunT = w.cfg.stun;
    c.tx = Math.max(seg.x0 + CR, Math.min(seg.x1 - CR, d.x + side * KNOCK));
    c.dir = -side;
    if (p) addScore(w, p, SCORE.bonk);
    ev(w, 'bonk', { id: c.id, x: c.x, y: c.y, i: p ? p.i : -1 });
  }
  function stepWaves(w) {
    for (const wv of w.waves) {
      const x0 = wv.x;
      wv.t += DT;
      wv.x += wv.dir * WAVE_V * DT;
      const lo = Math.min(x0, wv.x) - 0.6, hi = Math.max(x0, wv.x) + 0.6;
      const fy = FLOOR_Y[wv.f];
      for (const c of w.cats) {
        if (c.st === 'away' || c.st === 'swept' || c.st === 'in' || c.st === 'hug') continue;
        const onIt = (c.st === 'walk' || c.st === 'stun') ? c.f === wv.f : c.st === 'shaft' && Math.abs(c.y - fy) < WAVE_REACH;
        if (!onIt || c.x < lo || c.x > hi) continue;
        const pts = SCORE.wave * Math.pow(2, Math.min(4, wv.n));
        wv.n++;
        sweep(w, c, wv.dir);
        const p = w.players[wv.i] || w.players[0];
        addScore(w, p, pts);
        ev(w, 'swept', { id: c.id, x: c.x, y: c.y, pts, i: p.i });
      }
    }
    w.waves = w.waves.filter((wv) => Math.abs(wv.x) < WALL + 0.5);
  }
  // tumble away in a bubble and float off; back through the roof hatch later
  function sweep(w, c, dir) {
    c.st = 'swept';
    c.t2 = 0;
    c.vx = dir * 7;
  }

  // ---------- mice ----------
  function stepPlayer(w, p, inp, live) {
    if (p.out) return;
    p.t += DT;
    p.inv = Math.max(0, p.inv - DT);
    if (p.mode === 'hug' || p.mode === 'plop') {
      if (p.mode === 'plop') p.y = Math.max(PILLOW_Y, p.y - 9 * DT);
      if (p.t >= (p.mode === 'hug' ? HUG_T : PLOP_T)) {
        loseLife(w, p);
        if (!p.out) { placeStart(w, p); p.inv = 2.5; ev(w, 'respawn', { i: p.i }); }
      }
      return;
    }
    let lr = inp ? Math.sign(inp.lr || 0) : 0;
    const act = !!(inp && inp.act);
    if (!live) lr = 0;
    if (lr) p.face = lr;
    if (p.mode === 'ground') {
      const sp = w.cfg.walk;
      let nx = p.x + lr * sp * DT;
      nx = blockDoors(w, p.f, p.x, nx, PR);
      nx = Math.max(-WALL + 0.2, Math.min(WALL - 0.2, nx));
      if (lr) p.walkT += DT;
      p.x = nx;
      if (act && live) {
        const d = nearDoor(w, p);
        if (d) useDoor(w, p, d);
      }
      // off the end of a room: down the shaft
      if (!segAt(p.x)) {
        const k = shaftAt(p.x);
        if (k >= 0) enterShaft(w, p, k);
      }
      return;
    }
    if (p.mode === 'shaft') {
      // ← or → picks the side to get off at the next floor you pass (only a side with a floor counts)
      if (lr && segBeside(p.sh, lr) >= 0 && w.sab !== 'stuckShaft') p.want = lr;
      p.x += Math.max(-6 * DT, Math.min(6 * DT, SX[p.sh] - p.x));
      const res = shaftMove(w, p, w.cfg.vspeed);
      if (res === 'land') {
        p.bounces++;
        const tr = w.tramp[p.sh];
        const tear = (w.cfg.wear && w.sab !== 'noWear') || w.sab === 'wearEasy' ? p.bounces > WEAR : false;
        if (tear) {
          tr.torn = PLOP_T + 0.4;
          p.mode = 'plop';
          p.t = 0;
          p.vdir = 0;
          ev(w, 'tear', { i: p.i, sh: p.sh, x: p.x });
          return;
        }
        ev(w, 'bounce', { i: p.i, sh: p.sh, n: p.bounces, x: p.x, worn: w.cfg.wear ? p.bounces : 0 });
      } else if (res && res.exit) {
        p.want = 0;
        p.bounces = 0;
        ev(w, 'off', { i: p.i, f: p.f, x: p.x });
      }
    }
  }
  function enterShaft(w, o, k) {
    o.mode = 'shaft';
    if ('st' in o) o.st = 'shaft';
    o.sh = k;
    o.vdir = -1;
    o.hang = 0;
    o.armed = false;
    o.want = 0;
    if ('bounces' in o) o.bounces = 0;
    ev(w, 'drop', { who: 'st' in o ? 'cat' : 'mouse', i: o.i, sh: k });
  }
  // up and down a shaft at an even speed (slowing near the top); 'land' on the trampoline, or {exit} onto a floor
  function shaftMove(w, o, v) {
    const y0 = o.y;
    if (o.vdir > 0) {
      const near = Math.min(1, 0.45 + (0.55 * (APEX_Y - o.y)) / 1.4);
      o.y = Math.min(APEX_Y, o.y + v * near * DT);
      if (o.y >= APEX_Y - 1e-6) { o.vdir = 0; o.hang = HANG; }
    } else if (o.vdir === 0) {
      o.hang -= DT;
      if (o.hang <= 0) o.vdir = -1;
    } else {
      const near = Math.min(1, 0.45 + (0.55 * (APEX_Y - o.y)) / 1.4);
      o.y = Math.max(TRAMP_Y, o.y - v * near * DT);
      if (o.y <= TRAMP_Y + 1e-6) { o.vdir = 1; o.armed = true; return 'land'; }
    }
    // getting off: the side picked, and a floor level passed this step
    if (o.armed && o.want) {
      const lo = Math.min(y0, o.y) - EXIT_EPS, hi = Math.max(y0, o.y) + EXIT_EPS;
      for (let f = 0; f < FLOOR_Y.length; f++) {
        if (FLOOR_Y[f] < lo || FLOOR_Y[f] > hi) continue;
        const s = segBeside(o.sh, o.want);
        if (s < 0) continue;
        o.mode = 'ground';
        if ('st' in o) o.st = 'walk';
        o.f = f;
        o.y = FLOOR_Y[f];
        o.x = edgeOf(o.sh, o.want) + o.want * 0.45;
        o.dir = o.want;
        if ('face' in o) o.face = o.want;
        o.vdir = 0;
        o.sh = -1;
        return { exit: true };
      }
    }
    return null;
  }
  function loseLife(w, p) {
    p.lives--;
    p.mode = 'ground';
    if (p.lives <= 0) { p.lives = 0; p.out = true; p.mode = 'out'; ev(w, 'out', { i: p.i, who: p.who }); }
  }
  function addScore(w, p, n) {
    p.score += n;
    if (!p.extra && p.score >= 20000) { p.extra = true; p.lives++; ev(w, 'extraLife', { i: p.i }); }
  }
  function grab(w, t, p) {
    t.got = true;
    p.toys++;
    addScore(w, p, SCORE.toy);
    const pair = w.sab === 'pairAlways' ? true : w.sab === 'noPair' ? false : p.lastToy === t.kind;
    ev(w, 'toy', { i: p.i, kind: t.kind, x: t.x, y: FLOOR_Y[t.f], pair });
    if (pair) {
      addScore(w, p, SCORE.pair);
      ev(w, 'pair', { i: p.i, kind: t.kind, x: t.x, y: FLOOR_Y[t.f] });
      p.lastToy = null;
    } else p.lastToy = t.kind;
  }

  // ---------- the way round the mansion: rooms (floor parts between shafts and closed doors) joined by shafts ----------
  function rooms(w, ignoreDoors) {
    const out = [];
    for (let f = 0; f < FLOOR_Y.length; f++) {
      for (const sg of SEGS) {
        const cuts = ignoreDoors ? [] : w.doors.filter((d) => d.f === f && d.s === sg.s && !d.open).map((d) => d.x).sort((a, b) => a - b);
        let lo = sg.x0;
        for (const cx of cuts.concat([sg.x1])) {
          const hi = cx;
          out.push({ id: out.length, f, s: sg.s, lo, hi, left: lo === sg.x0 ? sg.s : -1, right: hi === sg.x1 ? sg.s + 1 : -1 });
          lo = cx;
        }
      }
    }
    return out;
  }
  function roomAt(rs, f, x) {
    // a point exactly on a closed door belongs to the room on the side it's on
    let best = null;
    for (const r of rs) if (r.f === f && x >= r.lo - 0.5 && x <= r.hi + 0.5) { const d = Math.max(r.lo - x, x - r.hi, 0); if (!best || d < best.d) best = { r, d }; }
    return best && best.r;
  }
  const vcost = (f1, f2) => (FLOOR_Y[f1] - TRAMP_Y + FLOOR_Y[f2] - TRAMP_Y); // down to the trampoline and up again, metres
  // cost (in seconds at walking speed ws and shaft speed vs) from standing at the edge of shaft k in room r to a target
  // targets: [{ r: room, x }]; returns { D: Map 'r:k' -> cost }
  function field(rs, targets, ws, vs) {
    const D = new Map();
    const todo = [];
    const set = (r, k, c) => { const key = r.id + ':' + k; if (!D.has(key) || c < D.get(key) - 1e-9) { D.set(key, c); todo.push([c, r, k]); } };
    for (const tg of targets) {
      for (const [k, side] of [[tg.r.left, 1], [tg.r.right, -1]]) if (k >= 0) set(tg.r, k, Math.abs(tg.x - edgeOf(k, side)) / ws);
    }
    const byShaft = SX.map((_, k) => rs.filter((r) => r.left === k || r.right === k));
    while (todo.length) {
      let bi = 0;
      for (let i = 1; i < todo.length; i++) if (todo[i][0] < todo[bi][0]) bi = i;
      const [c, r, k] = todo.splice(bi, 1)[0];
      if (c > D.get(r.id + ':' + k) + 1e-9) continue;
      // through shaft k to another room on it
      for (const r2 of byShaft[k]) if (r2 !== r) set(r2, k, c + vcost(r.f, r2.f) / vs);
      // walk across room r to its other shaft
      const other = r.left === k ? r.right : r.left;
      if (other >= 0 && other !== k) set(r, other, c + Math.abs(edgeOf(k, r.left === k ? 1 : -1) - edgeOf(other, r.left === other ? 1 : -1)) / ws);
    }
    return D;
  }
  // the best way from (room r, x) on: { walkTo: x } in the same room as a target, or { shaft: k } to walk into
  function route(rs, D, targets, r, x, ws, vs) {
    let best = null;
    for (const tg of targets) if (tg.r === r) { const c = Math.abs(tg.x - x) / ws; if (!best || c < best.c) best = { c, walkTo: tg.x }; }
    for (const [k, side] of [[r.left, 1], [r.right, -1]]) {
      if (k < 0) continue;
      let via = Infinity;
      for (const r2 of rs) if (r2 !== r && (r2.left === k || r2.right === k)) { const d = D.get(r2.id + ':' + k); if (d != null) via = Math.min(via, d + vcost(r.f, r2.f) / vs); }
      const c = Math.abs(x - edgeOf(k, side)) / ws + via;
      if (c < Infinity && (!best || c < best.c)) best = { c, shaft: k, side };
    }
    return best;
  }
  // in shaft k: which floor and side to get off at
  function shaftExit(rs, D, k, vs) {
    let best = null;
    for (const r2 of rs) {
      if (r2.left !== k && r2.right !== k) continue;
      const d = D.get(r2.id + ':' + k);
      if (d == null) continue;
      if (!best || d < best.c) best = { c: d, f: r2.f, side: r2.left === k ? 1 : -1 };
    }
    return best;
  }
  // where cats go: the nearest mouse on a floor; a mouse in a shaft is waited for beside it, on the floor he's nearest
  function catTargets(w, rs, c) {
    const out = [];
    for (const p of w.players) {
      if (p.out || p.mode === 'hug' || p.mode === 'plop') continue;
      if (p.mode === 'ground') { const r = roomAt(rs, p.f, p.x); if (r) out.push({ r, x: p.x, p }); continue; }
      let f = 0;
      for (let q = 1; q < FLOOR_Y.length; q++) if (Math.abs(FLOOR_Y[q] - p.y) < Math.abs(FLOOR_Y[f] - p.y)) f = q;
      for (const side of [-1, 1]) {
        if (segBeside(p.sh, side) < 0) continue;
        const x = edgeOf(p.sh, side) + side * 1.2;
        const r = roomAt(rs, f, x);
        if (r && x >= r.lo && x <= r.hi) out.push({ r, x, p, wait: true });
      }
    }
    return out;
  }

  // ---------- cats ----------
  function stepCat(w, c) {
    c.t += DT;
    const sp = catSpeed(w, c);
    switch (c.st) {
      case 'in': // dropping in through the roof hatch
        c.t2 += DT;
        c.y = FLOOR_Y[3] + Math.max(0, 1.6 * (1 - c.t2 / ARRIVE_T));
        if (c.t2 >= ARRIVE_T) { c.st = 'walk'; c.y = FLOOR_Y[3]; c.f = 3; }
        return;
      case 'hug': c.hugT -= DT; if (c.hugT <= 0) c.st = 'walk'; return;
      case 'stun':
        c.x += Math.max(-9 * DT, Math.min(9 * DT, c.tx - c.x));
        c.stunT -= DT;
        if (c.stunT <= 0) c.st = 'walk';
        return;
      case 'swept':
        c.t2 += DT;
        c.x = Math.max(-WALL - 1, Math.min(WALL + 1, c.x + c.vx * DT));
        c.y += (c.t2 > 0.3 ? 3.2 : 0.6) * DT;
        if (c.t2 >= SWEPT_UP) { c.st = 'away'; c.awayT = w.cfg.back; ev(w, 'gone', { id: c.id }); }
        return;
      case 'away':
        if (w.phase !== 'play') return;
        c.awayT -= DT;
        if (c.awayT <= 0) {
          Object.assign(c, { st: 'in', f: 3, x: hatchX(w), y: FLOOR_Y[3] + 1.6, sh: -1, t2: 0, vdir: 0, plan: null, mood: 'chase', moodT: w.cfg.chase });
          ev(w, 'catIn', { id: c.id, x: c.x, y: c.y });
        }
        return;
    }
    if (w.phase !== 'play') return;
    // a silly cat sometimes forgets the chase and wanders off to a room of its own choosing
    c.moodT -= DT;
    if (c.moodT <= 0 && w.sab !== 'noWander') {
      if (c.mood === 'chase') { c.mood = 'wander'; c.moodT = w.cfg.wander; c.wf = Math.floor(rand(w) * 4); c.wx = SEGS[Math.floor(rand(w) * 3)].x0 + 1 + rand(w) * 3.2; }
      else { c.mood = 'chase'; c.moodT = w.cfg.chase; }
    }
    const rs = rooms(w);
    let targets;
    if (c.mood === 'wander' && w.sab !== 'noWander') { const r = roomAt(rs, c.wf, c.wx); targets = r ? [{ r, x: Math.max(r.lo + 0.4, Math.min(r.hi - 0.4, c.wx)) }] : []; }
    else targets = catTargets(w, rs, c);
    if (w.sab === 'lostCats') targets = [];
    const D = field(rs, targets, sp, w.cfg.vspeed);
    if (c.st === 'walk') {
      const r = roomAt(rs, c.f, c.x);
      let go = 0;
      const rt = r && targets.length ? route(rs, D, targets, r, c.x, sp, w.cfg.vspeed) : null;
      if (rt && rt.walkTo != null) go = Math.abs(rt.walkTo - c.x) > 0.05 ? Math.sign(rt.walkTo - c.x) : 0;
      else if (rt && rt.shaft != null) go = -rt.side; // the shaft is on the far side of its edge
      else go = c.dir; // nowhere to go: pace about
      if (go) c.dir = go;
      let nx = c.x + go * sp * DT;
      const blocked = blockDoors(w, c.f, c.x, nx, CR);
      if (go && Math.abs(blocked - nx) > 1e-6 && !rt) c.dir = -c.dir;
      nx = Math.max(-WALL + 0.2, Math.min(WALL - 0.2, blocked));
      if (rt && rt.walkTo != null && Math.sign(rt.walkTo - nx) !== Math.sign(rt.walkTo - c.x)) nx = rt.walkTo;
      c.x = nx;
      if (!segAt(c.x)) { const k = shaftAt(c.x); if (k >= 0) enterShaft(w, c, k); }
      return;
    }
    if (c.st === 'shaft') {
      c.x += Math.max(-6 * DT, Math.min(6 * DT, SX[c.sh] - c.x));
      const ex = targets.length ? shaftExit(rs, D, c.sh, w.cfg.vspeed) : null;
      // get off at the planned floor: want its side only as that floor comes up
      c.want = 0;
      if (ex && c.armed) {
        const next = nextFloor(c);
        if (next === ex.f) c.want = ex.side;
      } else if (!ex && c.armed && c.t2 > 4) c.want = segBeside(c.sh, 1) >= 0 ? 1 : -1;
      const res = shaftMove(w, c, w.cfg.vspeed);
      if (res === 'land') { c.t2 += 1; ev(w, 'catBounce', { id: c.id, sh: c.sh }); }
      else if (res && res.exit) c.t2 = 0;
    }
  }
  // the floor a body in a shaft passes next
  function nextFloor(o) {
    if (o.vdir > 0) { for (let f = 0; f < FLOOR_Y.length; f++) if (FLOOR_Y[f] >= o.y - EXIT_EPS) return f; return -1; }
    if (o.vdir === 0) return FLOOR_Y.length - 1;
    for (let f = FLOOR_Y.length - 1; f >= 0; f--) if (FLOOR_Y[f] <= o.y + EXIT_EPS) return f;
    return -1;
  }

  // ---------- who touches what ----------
  const shield = (w) => !!(w.buddy && w.buddy.kind === 'doors');
  function contacts(w) {
    for (const p of w.players) {
      if (p.out || p.mode !== 'ground') continue;
      if (w.phase === 'play' || w.phase === 'ready') {
        for (const t of w.toys) if (!t.got && t.f === p.f && Math.abs(t.x - p.x) < TOY_R) grab(w, t, p);
      }
      if (w.phase !== 'play' || p.inv > 0 || p.safe || shield(w) || w.sab === 'harmless') continue;
      for (const c of w.cats) {
        if (c.st !== 'walk' || c.f !== p.f || Math.abs(c.x - p.x) >= CATCH_R) continue;
        p.mode = 'hug';
        p.t = 0;
        c.st = 'hug';
        c.hugT = HUG_T + 0.6;
        ev(w, 'hug', { i: p.i, x: p.x, y: p.y, id: c.id });
        break;
      }
    }
  }

  // ---------- the brother (1 player) or a high five (2 players) ----------
  function call(w) {
    if (w.phase === 'over') return false;
    if (w.two) {
      if (w.buddy) return false;
      w.buddy = { kind: 'hi5', t: 0 };
      for (const p of w.players) if (!p.out) addScore(w, p, SCORE.hi5);
      ev(w, 'hi5');
      return true;
    }
    if (w.buddy) { w.buddy.more++; ev(w, 'buddyMore', { who: w.buddy.who }); return true; }
    const n = w.calls++;
    w.buddy = { kind: 'doors', who: w.buddyFor(w.players[0].who), t: 0, n, treat: TREATS[n % TREATS.length], more: 0, done: 0 };
    ev(w, 'buddyIn', { who: w.buddy.who });
    return true;
  }
  function stepBuddy(w) {
    const bd = w.buddy;
    const t0 = bd.t;
    bd.t += DT;
    const crossed = (at) => t0 < at && bd.t >= at;
    if (bd.kind === 'hi5') { if (bd.t >= 1.4) w.buddy = null; return; }
    if (crossed(B_TREAT) && bd.done === 0) { addScore(w, w.players[0], SCORE.treat); ev(w, 'treat', { e: bd.treat, who: bd.who }); }
    if (crossed(B_OPEN)) {
      bd.done++;
      buddyDoors(w, bd);
    }
    if (bd.t >= B_END) {
      if (bd.more > 0) { bd.more--; bd.t = B_GO; }
      else { w.buddy = null; ev(w, 'buddyOut', { who: bd.who }); }
    }
  }
  // every door at once: each closed one swings open (toward the cats on its floor), then every cat tumbles away
  function buddyDoors(w, bd) {
    if (w.sab === 'lazyBuddy') { ev(w, 'buddyDoors', { who: bd.who, opened: 0, n: 0 }); return; }
    let opened = 0;
    const p = w.players[0];
    for (const d of w.doors) {
      if (d.open) continue;
      const cats = w.cats.filter((c) => c.f === d.f && (c.st === 'walk' || c.st === 'stun'));
      let side = p && p.f === d.f ? Math.sign(d.x - p.x) || 1 : 1;
      if (cats.length && !(p && p.f === d.f)) side = Math.sign(cats.reduce((a, c) => a + (c.x - d.x), 0)) || 1;
      openDoor(w, d, side, null);
      opened++;
    }
    let n = 0;
    for (const c of w.cats) {
      if (c.st === 'away' || c.st === 'swept') continue;
      sweep(w, c, c.x < (p ? p.x : 0) ? -1 : 1);
      addScore(w, p, SCORE.buddyCat);
      n++;
      ev(w, 'swept', { id: c.id, x: c.x, y: c.y, pts: SCORE.buddyCat, i: 0, buddy: true });
    }
    ev(w, 'buddyDoors', { who: bd.who, opened, n });
  }

  // tests: stand mouse i on floor f at x; put him in shaft k at height y going dir
  function put(w, i, f, x) {
    const p = w.players[i || 0];
    Object.assign(p, { x, y: FLOOR_Y[f], f, sh: -1, mode: 'ground', vdir: 0, bounces: 0, armed: false, want: 0, inv: 0, t: 0 });
    return p;
  }
  function putShaft(w, i, k, y, vdir, armed) {
    const p = w.players[i || 0];
    Object.assign(p, { x: SX[k], y, sh: k, mode: 'shaft', vdir: vdir || 1, hang: 0, bounces: 0, armed: armed !== false, want: 0, inv: 0, t: 0 });
    return p;
  }

  MM.sim = {
    DT, PR, CR, REACH, SWING, KNOCK, CATCH_R, TOY_R, WAVE_V, READY, CLEAR_T, HUG_T, PLOP_T, B_TREAT, B_GO, B_OPEN, B_END, SCORE, CFG, TREATS, WEAR, HATCH,
    create, step, call, loadStage, addCat, put, putShaft, rooms, roomAt, field, route, shaftExit, catTargets, nextFloor, segAt, shaftAt, segBeside, edgeOf,
    useDoor, openDoor, nearDoor, catSpeed, vcost,
  };
})(typeof window !== 'undefined' ? window : globalThis);
