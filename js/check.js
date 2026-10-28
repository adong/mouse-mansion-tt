/* TT Mouse Mansion: the headless check of the brief's rules, on the real rules in js/sim.js (no drawing).
   Runs in node (node tools/check.js) and in the page (game.check()).
   - trampolines: every shaft bounces you up past the top floor and back; ← or → gets you off at the next floor on
     that side (a wall side never); on NORMAL the fifth landing in a row tears it (a plop, a life), getting off resets
     the count; on EASY it never tears.
   - doors: opening any door of any mansion bonks the cat in front of it (dizzy, knocked back) and not one behind the
     mouse, one 4 m past the door or one on another floor; a closed door stops cats and mice; a glowing door's wave
     tumbles every cat ahead of it on its floor, and none behind it or on other floors.
   - pairs: two toys of the same kind in a row are a PAIR bonus; two different kinds are not.
   - stageEnds: a mansion ends when every toy is collected, not one toy sooner, and the next one loads.
   - catsFindWay: on every mansion, a cat from each room finds a mouse waiting in any other room, along the floors and
     down and up the shafts, closed doors and all.
   - plus hugs (only on floors), the companion (unlimited; opens every door and tumbles every cat), nothing stuck, and
     the autopilot clearing all 6 mansions on EASY and NORMAL.
   fail() turns on one sabotage at a time (w.sab in js/sim.js) and each must be caught by its check. */
(function (root) {
  'use strict';
  const MM = (root.MM = root.MM || {});
  const S = () => MM.sim;
  const LV = () => MM.levels;
  const FY = () => MM.levels.FLOOR_Y;

  function world(o) {
    const w = S().create(Object.assign({ level: 'easy', seed: 5, go: true }, o || {}));
    w.queue = 0; // no cats come in by themselves: each check adds its own
    return w;
  }
  function run(w, inp, n, each) {
    const evs = [];
    for (let i = 0; i < n; i++) {
      S().step(w, typeof inp === 'function' ? inp(w, i) : inp);
      evs.push(...w.events);
      if (each && each(w, i) === false) break;
    }
    return evs;
  }
  // a cat that stays put (until a check lets it walk)
  function cat(w, f, x, o) {
    const c = S().addCat(w, f, x, Object.assign({ mood: 'chase', moodT: 1e9 }, o || {}));
    return c;
  }
  const sitStill = (w) => { w.cfg = Object.assign({}, w.cfg, { cat: 0 }); };
  const DOORS = () => LV().LEVELS.flatMap((L, li) => L.doors.map((d, di) => ({ li, di, d })));

  const checks = {
    trampolines(sab) {
      const bad = [];
      const info = [];
      for (const level of ['easy', 'normal']) {
        for (let k = 0; k < 4; k++) {
          // walk off a room into shaft k, then just bounce
          const w = world({ level, sabotage: sab });
          const p = w.players[0];
          const side = k === 0 ? 1 : -1; // stand on the floor beside the shaft and walk in
          S().put(w, 0, 2, S().edgeOf(k, side) + side * 0.5);
          let top = -9, low = 9, tears = 0, lands = 0;
          const evs = run(w, (ww) => ({ lr: p.mode === 'ground' ? -side : 0 }), 60 * 40, (ww) => {
            if (p.mode === 'shaft') { top = Math.max(top, p.y); low = Math.min(low, p.y); }
            if (ww.events.some((e) => e.type === 'tear')) tears++;
            lands += ww.events.filter((e) => e.type === 'bounce').length;
            return p.mode !== 'plop' && p.mode !== 'hug';
          });
          const wearOn = level === 'normal';
          if (top < FY()[3] + 0.3 || low > LV().TRAMP_Y + 0.05) bad.push(`${level} shaft ${k}: bounced only ${low.toFixed(1)}..${top.toFixed(1)}`);
          if (wearOn && (lands !== S().WEAR || !tears || p.mode !== 'plop')) bad.push(`normal shaft ${k}: ${lands} bounces, tore ${tears}, now ${p.mode}`);
          if (!wearOn && (tears || lands < 8)) bad.push(`easy shaft ${k}: ${lands} bounces in 40 s, tore ${tears}`);
          if (wearOn && p.mode === 'plop') {
            const lives = p.lives;
            run(w, {}, Math.ceil(S().PLOP_T * 60) + 4);
            if (p.lives !== lives - 1 || p.mode !== 'ground' || p.f !== 0) bad.push(`after the plop: lives ${lives}→${p.lives}, ${p.mode} on floor ${p.f}`);
          }
          // getting off: each side that has a floor, at the next floor passed going up
          for (const s of [-1, 1]) {
            const w2 = world({ level, sabotage: sab });
            const q = S().putShaft(w2, 0, k, 1.2, 1, true);
            run(w2, (ww, i) => ({ lr: i < 3 ? s : 0 }), 60 * 3, () => q.mode === 'shaft');
            const can = S().segBeside(k, s) >= 0;
            if (can && (q.mode !== 'ground' || q.f !== 1 || Math.sign(q.x - LV().SX[k]) !== s)) bad.push(`${level} shaft ${k} ${s > 0 ? '→' : '←'}: ${q.mode} on floor ${q.f} at ${q.x.toFixed(1)} (wanted floor 1 on that side)`);
            if (!can && q.mode !== 'shaft') bad.push(`${level} shaft ${k}: got off through the wall`);
          }
        }
        // getting off resets the count: 3 bounces, off, back in, 4 more: no tear
        const w = world({ level, sabotage: sab });
        const p = S().putShaft(w, 0, 1, 0.5, -1, false);
        let n = 0;
        run(w, {}, 60 * 30, (ww) => { n += ww.events.filter((e) => e.type === 'bounce').length; return n < 3; });
        run(w, (ww) => ({ lr: S().nextFloor(p) === 0 ? 1 : 0 }), 60 * 8, () => p.mode === 'shaft');
        const off = p.mode === 'ground';
        run(w, { lr: -1 }, 30, () => p.mode === 'ground');
        let n2 = 0, torn = false;
        run(w, {}, 60 * 30, (ww) => { n2 += ww.events.filter((e) => e.type === 'bounce').length; torn = torn || ww.events.some((e) => e.type === 'tear'); return n2 < 4 && !torn; });
        if (!off || torn || n2 < 4) bad.push(`${level}: getting off didn't reset the count (off ${off}, ${n2} more bounces, tore ${torn})`);
        info.push(level === 'normal' ? 'NORMAL: 4 bounces, the 5th landing tears it (a plop, a life)' : 'EASY: never tears');
      }
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : `every shaft bounces past the top floor and lets you off on either side with a floor at the next floor; ${info.join('; ')}; getting off resets it` };
    },

    doors(sab) {
      const bad = [];
      let n = 0;
      for (const { li, di, d } of DOORS()) {
        for (const from of [-1, 1]) {
          const w = world({ stage: li, sabotage: sab });
          sitStill(w);
          w.doors.forEach((q) => (q.open = false, q.glow = false));
          const door = w.doors[di];
          const sg = LV().SEGS[d.s];
          S().put(w, 0, d.f, d.x + from * 0.9);
          const front = cat(w, d.f, d.x - from * 0.9);
          const behind = cat(w, d.f, Math.max(sg.x0 + 0.3, Math.min(sg.x1 - 0.3, d.x + from * 2.2)));
          const far = cat(w, (d.f + 1) % 4, d.x - from * 0.9);
          w.players[0].inv = 99;
          run(w, (ww, i) => ({ act: i === 0 }), 2);
          run(w, {}, 20);
          n++;
          const pushed = (front.x - d.x) * -from;
          if (!door.open || door.swing !== -from) bad.push(`mansion ${li + 1} door ${di}: open ${door.open}, swing ${door.swing}`);
          if (front.st !== 'stun' || pushed < 1.5) bad.push(`mansion ${li + 1} door ${di} from ${from > 0 ? 'the right' : 'the left'}: the cat in front is ${front.st}, ${pushed.toFixed(1)} m past the door`);
          if (behind.st !== 'walk' || far.st !== 'walk') bad.push(`mansion ${li + 1} door ${di}: the cat behind the mouse is ${behind.st}, on the next floor ${far.st}`);
          // a cat 4 m past the door is not bonked (where there's room)
          const xFar = d.x - from * 4;
          if (xFar > sg.x0 + 0.3 && xFar < sg.x1 - 0.3) {
            const w2 = world({ stage: li, sabotage: sab });
            sitStill(w2);
            w2.doors.forEach((q) => (q.open = false, q.glow = false));
            S().put(w2, 0, d.f, d.x + from * 0.9);
            const c2 = cat(w2, d.f, xFar);
            w2.players[0].inv = 99;
            run(w2, (ww, i) => ({ act: i === 0 }), 2);
            if (c2.st !== 'walk') bad.push(`mansion ${li + 1} door ${di}: a cat 4 m past the door was bonked`);
          }
        }
      }
      // closed doors stop cats and mice
      const w = world({ sabotage: sab });
      w.doors.forEach((q) => (q.open = false));
      const d = w.doors.find((q) => q.f === 1 && q.s === 1);
      S().put(w, 0, 1, d.x - 1.5);
      const c = cat(w, 1, d.x + 1.5);
      run(w, { lr: 1 }, 120);
      if (w.players[0].x > d.x - 0.3 || c.x < d.x + 0.3) bad.push(`a closed door let through: mouse at ${w.players[0].x.toFixed(2)}, cat at ${c.x.toFixed(2)} (door ${d.x})`);
      // the glowing door's wave
      let waves = 0;
      for (const { li, di, d: gd } of DOORS().filter((q) => q.d.glow)) {
        for (const from of [-1, 1]) {
          const w2 = world({ stage: li, sabotage: sab });
          sitStill(w2);
          const g = w2.doors[di];
          S().put(w2, 0, gd.f, gd.x + from * 0.9);
          w2.players[0].inv = 99;
          const dir = -from;
          // cats ahead of it on its floor, in every room up to the wall (other doors open so the floor is clear)
          w2.doors.forEach((q) => { if (q !== g) q.open = true; });
          const ahead = [], spared = [];
          for (let x = gd.x + dir * 2.6; Math.abs(x) < LV().WALL - 0.5; x += dir * 2.3) if (S().segAt(x)) ahead.push(cat(w2, gd.f, x));
          spared.push(cat(w2, gd.f, gd.x + from * 2.4 > LV().SEGS[gd.s].x1 - 0.3 || gd.x + from * 2.4 < LV().SEGS[gd.s].x0 + 0.3 ? gd.x + from * 1.6 : gd.x + from * 2.4));
          spared.push(cat(w2, (gd.f + 2) % 4, gd.x + dir * 2.6));
          run(w2, (ww, i) => ({ act: i === 0 }), 60 * 2.5);
          waves++;
          const got = ahead.filter((q) => q.st === 'swept' || q.st === 'away').length;
          const hit = spared.filter((q) => q.st === 'swept' || q.st === 'away').length;
          if (got !== ahead.length || hit) bad.push(`mansion ${li + 1} glowing door ${di} opened ${dir > 0 ? '→' : '←'}: ${got}/${ahead.length} cats ahead tumbled, ${hit} that should be spared`);
        }
      }
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : `${n} door openings (every door of all 6 mansions, from both sides): the cat in front bonked, none behind, 4 m past or upstairs; closed doors stop cats and mice; ${waves} glowing-door waves tumble every cat ahead on the floor and nobody else` };
    },

    pairs(sab) {
      const bad = [];
      const go = (kinds) => {
        const w = world({ sabotage: sab });
        w.toys = kinds.map((k, i) => ({ id: i, f: 0, x: [-8.5, -5.1, -1.6, 1.6, 5.1][i], kind: k, got: false })).concat([{ id: 9, f: 3, x: 8.5, kind: 'kite', got: false }]);
        const p = w.players[0];
        const evs = [];
        for (const t of w.toys.slice(0, kinds.length)) { S().put(w, 0, t.f, t.x); evs.push(...run(w, {}, 1)); }
        return { p, pairs: evs.filter((e) => e.type === 'pair').length, toys: evs.filter((e) => e.type === 'toy').length };
      };
      const a = go(['bear', 'bear']);
      if (a.pairs !== 1 || a.p.score !== 2 * S().SCORE.toy + S().SCORE.pair) bad.push(`bear, bear: ${a.pairs} pairs, ${a.p.score} points`);
      const b = go(['bear', 'robot']);
      if (b.pairs !== 0 || b.p.score !== 2 * S().SCORE.toy) bad.push(`bear, robot: ${b.pairs} pairs, ${b.p.score} points`);
      const c = go(['bear', 'robot', 'robot', 'drum']);
      if (c.pairs !== 1) bad.push(`bear, robot, robot, drum: ${c.pairs} pairs`);
      const d = go(['train', 'train', 'train']);
      if (d.pairs !== 1) bad.push(`three trains: ${d.pairs} pairs (a pair, then a fresh start)`);
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : `two of a kind in a row: +${S().SCORE.pair}; different kinds: no bonus; a third one starts a new pair` };
    },

    stageEnds(sab) {
      const bad = [];
      for (let li = 0; li < 6; li++) {
        const w = world({ stage: li, sabotage: sab });
        w.players[0].safe = true;
        const toys = w.toys.slice();
        for (const t of toys.slice(0, -1)) { S().put(w, 0, t.f, t.x); run(w, {}, 1); }
        run(w, {}, 30);
        if (w.phase !== 'play' || toys.filter((t) => !t.got).length !== 1) bad.push(`mansion ${li + 1} with one toy left: ${w.phase}`);
        const last = toys[toys.length - 1];
        S().put(w, 0, last.f, last.x);
        run(w, {}, 2);
        if (w.phase !== 'clear') bad.push(`mansion ${li + 1} with every toy collected: ${w.phase}`);
        run(w, {}, Math.ceil(S().CLEAR_T * 60) + 2);
        if (w.li !== li + 1 || w.toys.some((t) => t.got) || w.phase !== 'ready') bad.push(`mansion ${li + 1}: next is ${w.li + 1} (${w.phase})`);
      }
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : 'all 6 mansions end when the last toy is collected, not one sooner, and the next mansion loads' };
    },

    catsFindWay(sab) {
      const bad = [];
      let n = 0, worst = 0;
      const spots = [];
      for (let f = 0; f < 4; f++) for (const x of [-8.5, -1.6, 8.5]) spots.push([f, x]);
      for (let li = 0; li < 6; li++) {
        for (let a = 0; a < spots.length; a += 3) {
          for (let b = 0; b < spots.length; b++) {
            if (a === b) continue;
            const w = world({ level: 'normal', stage: li, sabotage: sab });
            const [cf, cx] = spots[a], [mf, mx] = spots[b];
            S().put(w, 0, mf, mx);
            const c = cat(w, cf, cx);
            let t = 0;
            run(w, {}, 60 * 40, (ww) => { t = ww.t; return !ww.events.some((e) => e.type === 'hug'); });
            n++;
            if (c.st !== 'hug') bad.push(`mansion ${li + 1}: a cat from floor ${cf} at ${cx} never reached the mouse on floor ${mf} at ${mx} (it's ${c.st} on floor ${c.f} at ${c.x.toFixed(1)})`);
            else worst = Math.max(worst, t);
            if (bad.length > 4) break;
          }
        }
      }
      return { ok: !bad.length, info: bad.length ? bad.slice(0, 5).join('; ') : `${n} chases on all 6 mansions (closed doors as they start): every cat reached the mouse, the slowest in ${worst.toFixed(1)} s` };
    },

    hugs(sab) {
      const bad = [];
      for (const level of ['easy', 'normal']) {
        const w = world({ level, sabotage: sab });
        const p = S().put(w, 0, 2, -1.6);
        const lives = p.lives;
        cat(w, 2, 1.6);
        const evs = run(w, {}, 60 * 3, (ww) => !ww.events.some((e) => e.type === 'hug'));
        if (!evs.some((e) => e.type === 'hug') || p.mode !== 'hug') bad.push(`${level}: a cat walking into the mouse didn't hug him (${p.mode})`);
        run(w, {}, Math.ceil(S().HUG_T * 60) + 3);
        if (p.lives !== lives - 1 || p.mode !== 'ground' || p.inv <= 0) bad.push(`${level}: after the hug lives ${lives}→${p.lives}, ${p.mode}`);
        // in a shaft nobody gets hugged, even with a cat in there with him
        const w2 = world({ level, sabotage: sab });
        const q = S().putShaft(w2, 0, 1, 2, 1, true);
        const c2 = cat(w2, 0, -2.2);
        S().put(w2, 0, 0, 0); Object.assign(q, { mode: 'shaft', sh: 1, x: LV().SX[1], y: 2 });
        c2.st = 'shaft'; c2.sh = 1; c2.x = LV().SX[1]; c2.y = 2; c2.vdir = 1;
        const e2 = run(w2, {}, 60 * 2);
        if (e2.some((e) => e.type === 'hug')) bad.push(`${level}: hugged in a shaft`);
      }
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : 'a cat touching a mouse on a floor hugs him (a life, then back at the start, safe for a moment); never in a shaft' };
    },

    companion(sab) {
      const bad = [];
      const w = world({ level: 'normal', sabotage: sab });
      const p = S().put(w, 0, 0, -1.5);
      w.doors.forEach((d) => (d.open = false));
      const cats = [cat(w, 3, 8.5), cat(w, 2, -8.5), cat(w, 1, 5.1), cat(w, 0, 8.5)];
      S().call(w);
      let shielded = true;
      const evs = run(w, {}, Math.ceil(S().B_END * 60) + 5, (ww) => { if (ww.buddy && !(p.inv > 0 || ww.buddy.kind === 'doors')) shielded = false; });
      const shut = w.doors.filter((d) => !d.open).length;
      const tumbled = cats.filter((c) => c.st === 'swept' || c.st === 'away').length;
      if (shut || tumbled !== cats.length || !evs.some((e) => e.type === 'treat')) bad.push(`after one call: ${shut} doors still shut, ${tumbled}/${cats.length} cats tumbled, treat ${evs.some((e) => e.type === 'treat')}`);
      if (w.buddy) bad.push('he never left');
      // again and again: unlimited; a cat walking into the mouse while he's here can't hug
      let calls = 0;
      for (let k = 0; k < 6; k++) {
        w.doors.forEach((d) => (d.open = false));
        const c = cat(w, 0, 0.5);
        if (S().call(w)) calls++;
        const e = run(w, {}, Math.ceil(S().B_END * 60) + 5);
        if (e.some((x) => x.type === 'hug')) bad.push(`call ${k + 2}: hugged while the brother was here`);
        if (w.doors.some((d) => !d.open) || !(c.st === 'swept' || c.st === 'away')) bad.push(`call ${k + 2}: doors ${w.doors.filter((d) => !d.open).length} shut, cat ${c.st}`);
      }
      // the cats come back later through the roof hatch
      const before = w.cats.filter((c) => c.st === 'walk').length;
      run(w, {}, 60 * (w.cfg.back + 3));
      const back = w.cats.filter((c) => c.st === 'walk' || c.st === 'in' || c.st === 'shaft' || c.st === 'hug').length;
      if (back <= before) bad.push(`tumbled cats never came back (${back})`);
      // 2 players: a high five instead
      const w2 = world({ players: ['teddy', 'tommy'], sabotage: sab });
      S().call(w2);
      const e2 = run(w2, {}, 10);
      if (!w2.buddy || w2.buddy.kind !== 'hi5' || e2.some((e) => e.type === 'buddyDoors')) bad.push('2 players: no high five');
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : `${calls + 1} calls in a row all worked: he opens every door, every cat tumbles away (and comes back later), a treat, no hugs while he's here; 2 players: a high five` };
    },

    notStuck(sab) {
      const bad = [];
      const moves = (w, i) => {
        const p = w.players[i || 0];
        const x0 = p.x;
        run(w, { lr: 1 }, 20);
        const r = p.x;
        run(w, { lr: -1 }, 40);
        return r > x0 + 0.3 && p.x < r - 0.3;
      };
      // a door closed on a mouse standing in the doorway
      const w = world({ sabotage: sab });
      const d = w.doors.find((q) => q.f === 1 && q.s === 1);
      d.open = true;
      const p = S().put(w, 0, 1, d.x);
      S().useDoor(w, p, d);
      const xs = p.x;
      run(w, { lr: Math.sign(xs - d.x) }, 20);
      const away = p.x;
      run(w, { lr: Math.sign(d.x - xs) }, 20);
      if (d.open || Math.abs(xs - d.x) < 0.4 || Math.abs(away - xs) < 0.5 || Math.abs(p.x - xs) > 0.05) bad.push(`door closed on him: nudged to ${xs.toFixed(2)}, walked away to ${away.toFixed(2)} and back to ${p.x.toFixed(2)}`);
      // bouncing at the wall: pressing toward the wall keeps bouncing, the other way gets off
      for (const [k, s] of [[0, 1], [3, -1]]) {
        const w2 = world({ sabotage: sab });
        const q = S().putShaft(w2, 0, k, 2, 1, true);
        run(w2, { lr: -s }, 60 * 3);
        const still = q.mode === 'shaft';
        run(w2, { lr: s }, 60 * 4, () => q.mode === 'shaft');
        if (!still || q.mode !== 'ground') bad.push(`shaft ${k} at the wall: ${still ? 'bounced' : 'got off through the wall'}, then ${q.mode}`);
      }
      // a hug, a plop, a cleared mansion: walking again afterwards
      for (const how of ['hug', 'plop', 'clear']) {
        const w3 = world({ level: 'normal', sabotage: sab });
        const q = w3.players[0];
        if (how === 'clear') { w3.toys.forEach((t) => (t.got = true)); run(w3, {}, Math.ceil((S().CLEAR_T + S().READY) * 60) + 10); }
        else { q.mode = how; q.t = 0; run(w3, {}, Math.ceil((how === 'hug' ? S().HUG_T : S().PLOP_T) * 60) + 4); }
        if (q.mode !== 'ground' || !moves(w3)) bad.push(`after a ${how}: ${q.mode}, can't walk`);
      }
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : 'a door closed on him, the wall side of a shaft, a hug, a plop and a new mansion never leave him stuck' };
    },

    autopilot(sab) {
      const bad = [];
      const info = [];
      for (const level of ['easy', 'normal']) {
        for (const seed of [1, 2]) {
          const w = S().create({ level, seed, sabotage: sab });
          w.players[0].safe = true; // the soak checks that every mansion can be cleared, not the autopilot's dodging
          let li = 0, t0 = 0, worst = 0;
          for (let i = 0; i < 60 * 60 * 12 && w.li < 6; i++) {
            S().step(w, [MM.bot.decide(w, 0)]);
            if (w.li !== li) { worst = Math.max(worst, w.t - t0); li = w.li; t0 = w.t; }
            if (w.t - t0 > 150) break;
          }
          if (w.li < 6) bad.push(`${level} seed ${seed}: stuck in mansion ${w.li + 1} (${w.toys.filter((t) => !t.got).length} toys left)`);
          else info.push(`${level}/${seed} ${Math.round(w.t)} s (longest ${Math.round(worst)} s)`);
        }
      }
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : `the autopilot clears all 6 mansions: ${info.join(', ')}` };
    },
  };

  // each sabotage must be caught by its check
  const SABOTAGE = [
    ['noWear', 'trampolines', 'trampolines never tear on NORMAL'],
    ['wearEasy', 'trampolines', 'trampolines tear on EASY too'],
    ['stuckShaft', 'trampolines', 'you can never get off a trampoline'],
    ['noBonk', 'doors', 'doors bonk nobody'],
    ['bonkAll', 'doors', 'a door bonks every cat on the floor'],
    ['noWave', 'doors', 'glowing doors send no wave'],
    ['noPair', 'pairs', 'pairs earn nothing'],
    ['pairAlways', 'pairs', 'any two toys are a pair'],
    ['neverClear', 'stageEnds', 'a mansion never ends'],
    ['clearEarly', 'stageEnds', 'a mansion ends one toy early'],
    ['lostCats', 'catsFindWay', 'cats just pace about'],
    ['harmless', 'hugs', 'cats never hug'],
    ['lazyBuddy', 'companion', 'the brother opens nothing'],
  ];

  function runAll(only) {
    const results = [];
    for (const name of Object.keys(checks)) {
      if (only && !only.includes(name)) continue;
      let r;
      try { r = checks[name](null); } catch (e) { r = { ok: false, info: 'threw ' + (e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e) }; }
      results.push({ name, ok: r.ok, info: r.info });
    }
    return { ok: results.every((r) => r.ok), results, failed: results.filter((r) => !r.ok).map((r) => r.name) };
  }
  function fail() {
    const caught = SABOTAGE.map(([sab, check, what]) => {
      let r;
      try { r = checks[check](sab); } catch (e) { r = { ok: false, info: 'threw ' + e }; }
      return { sabotage: sab, what, check, caught: !r.ok, failed: [r.info] };
    });
    return { ok: caught.every((c) => c.caught), caught };
  }
  MM.check = { run: runAll, fail, checks, SABOTAGE };
})(typeof window !== 'undefined' ? window : globalThis);
