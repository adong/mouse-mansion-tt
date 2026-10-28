/* TT Mouse Mansion: the autopilot. It plays the title-screen demo and the checks' "every mansion can be cleared" soak.
   It picks the toy that's quickest to reach (the same room-and-shaft map the cats use, doors counted as open), walks
   there, opens a closed door in its way, and in a shaft presses the side of its floor as he bounces past it.
   It never reads keys. */
(function (root) {
  'use strict';
  const MM = (root.MM = root.MM || {});
  const S = () => MM.sim;
  const mems = new WeakMap();
  function mem(w, i) {
    let m = mems.get(w);
    if (!m) mems.set(w, (m = [{ actT: 0 }, { actT: 0 }]));
    return m[i];
  }
  function decide(w, i) {
    const p = w.players[i];
    const out = { lr: 0, act: false };
    if (!p || p.out || w.phase !== 'play') return out;
    const left = w.toys.filter((t) => !t.got);
    if (!left.length) return out;
    const sim = S();
    const rs = sim.rooms(w, true);
    const ws = w.cfg.walk, vs = w.cfg.vspeed;
    const targets = left.map((t) => ({ r: sim.roomAt(rs, t.f, t.x), x: t.x })).filter((t) => t.r);
    const D = sim.field(rs, targets, ws, vs);
    const m = mem(w, i);
    m.actT = Math.max(0, m.actT - sim.DT);
    if (p.mode === 'ground') {
      const r = sim.roomAt(rs, p.f, p.x);
      const rt = r && sim.route(rs, D, targets, r, p.x, ws, vs);
      if (!rt) return out;
      const tx = rt.walkTo != null ? rt.walkTo : sim.edgeOf(rt.shaft, rt.side) - rt.side;
      const dir = Math.abs(tx - p.x) > 0.02 ? Math.sign(tx - p.x) : 0;
      out.lr = dir;
      // a closed door in the way: open it (one press, then wait for it)
      const d = w.doors.find((q) => q.f === p.f && !q.open && (q.x - p.x) * dir > 0 && Math.abs(q.x - p.x) <= sim.REACH * 0.9 && (tx - q.x) * dir > 0);
      if (d && m.actT <= 0) { out.act = true; m.actT = 0.3; }
      return out;
    }
    if (p.mode === 'shaft' && p.armed) {
      const ex = sim.shaftExit(rs, D, p.sh, vs);
      if (ex && Math.abs(p.y - MM.levels.FLOOR_Y[ex.f]) < 0.9) out.lr = ex.side; // close to his floor: hop off
    }
    return out;
  }
  MM.bot = { decide };
})(typeof window !== 'undefined' ? window : globalThis);
