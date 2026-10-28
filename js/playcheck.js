/* TT Mouse Mansion: the play check with real keys and taps, in the page: game.playCheck().
   Everything here presses keys with real keydown/keyup events on window and taps the touch buttons with pointer
   events, so it goes through the same input code a kid's fingers do (never the autopilot). Time moves with
   game.step, which runs the same frame code as the browser's own frames. Positions are read on the screen.
   - direction: → moves right and ← moves left on screen, on all 6 mansions and all 4 floors and 3 rooms, for Teddy,
     Tommy and both brothers in 2 players (each with his own keys, and only his), with keys and with the touch buttons.
   - shafts: walking off a floor drops you onto the trampoline; in every shaft → gets you off on the right of the
     screen and ← on the left, keys and touch, on every mansion; toward a wall you keep bouncing.
   - getting on, the way Alan plays: holding → (or ←) and walking into every shaft from 1 m away, on every floor and
     both sides of every shaft, on every mansion, puts you on the trampoline bouncing (never across it); the same with
     tapped keys, a held touch button and ↓; then a fresh press gets you off on that side.
   - doors: the door key (and 🚪) opens the door next to you and bonks the cat in front of it.
   - nothing leaves him stuck: a key held through pause, a lost window, a cancelled touch, a door closed on him, a hug,
     a torn trampoline, the brother's visit, the next mansion, and a "keyboard kid" mashing keys on every mansion.
   - in a shaft, ← or → hops him off that way right away, going up or coming down, at any height.
   game.playCheck('mirror'), game.playCheck('stuckShaft'), game.playCheck('holdThrough') (the old walk-across
   trampolines) and game.playCheck('waitFloor') (the old wait-for-the-next-floor) prove the check fails. */
(function () {
  'use strict';
  const LV = MM.levels;
  const NAMES = { ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', Space: ' ', KeyT: 't', KeyP: 'p', KeyA: 'a', KeyD: 'd', KeyW: 'w', KeyS: 's', KeyF: 'f', KeyM: 'm' };
  const key = (code, down) => dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: NAMES[code] || code, bubbles: true, cancelable: true }));
  const step = (s) => game.step(s, { draw: false });
  const st = () => game.state();
  const pl = (i) => st().players[i || 0];
  function press(code, secs) {
    key(code, true);
    step(secs);
    key(code, false);
    step(1 / 60);
  }
  const button = (p, a) => [...document.querySelectorAll(`#touch [data-a="${a}"]`)].find((b) => (a === 'call' || +b.dataset.p === p) && b.offsetParent);
  function tap(p, a, secs, cancel) {
    const el = button(p, a);
    if (!el) return false;
    const o = { pointerId: 20 + p * 3 + 'lrj'.indexOf(a), bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: p === 0 };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    step(secs);
    el.dispatchEvent(new PointerEvent(cancel ? 'pointercancel' : 'pointerup', o));
    step(1 / 60);
    return true;
  }
  function fresh(stage, o) {
    game.start(Object.assign({ stage, go: true, level: 'easy', players: 1, who: 'teddy' }, o || {}));
    game.quiet();
    if (!o || !o.toys) game.world().toys.forEach((t) => (t.f = 9)); // toys out of reach: walking about never clears the mansion
    return st();
  }
  const openAll = () => game.world().doors.forEach((d) => (d.open = true));
  // the middle of each room (doors open, so a 1 m walk either way stays in the room)
  const ROOMS = [-6.8, 0, 6.8];
  // wait in a shaft until he gets off (or give up)
  function untilOff(i, secs) {
    const busy = () => pl(i).mode === 'shaft' || pl(i).mode === 'hop';
    for (let t = 0; t < secs; t += 0.05) { if (!busy()) return true; step(0.05); }
    return !busy();
  }

  function run(sab) {
    const results = [];
    const ok = (name, pass, info) => results.push({ name, ok: !!pass, info });
    const wasHold = game.G.hold;
    game.hold(true);
    const hadTouch = document.body.classList.contains('touch');
    game.sabotage(sab || null);
    try {
      // ---------- walking: every mansion, floor and room, each brother, keys and touch ----------
      const setups = [['teddy', 1, 0, ['ArrowRight', 'ArrowLeft', 'Space']], ['teddy', 1, 0, ['KeyD', 'KeyA', 'KeyW']], ['tommy', 1, 0, ['ArrowRight', 'ArrowLeft', 'ArrowUp']],
        ['teddy', 2, 0, ['KeyD', 'KeyA', 'KeyW']], ['teddy', 2, 1, ['ArrowRight', 'ArrowLeft', 'ArrowUp']]];
      for (let stage = 0; stage < 6; stage++) {
        for (const [who, players, i, keys] of setups) {
          for (const how of ['keys', 'touch']) {
            if (how === 'touch' && keys[0] === 'KeyD' && players === 1) continue;
            document.body.classList.toggle('touch', how === 'touch');
            fresh(stage, { who, players });
            openAll();
            const tag = `${players === 2 ? '2P ' + pl(i).who : who} mansion ${stage + 1} ${how}${how === 'keys' ? ' ' + keys[0] : ''}`;
            const bad = [];
            for (let f = 0; f < 4; f++) {
              for (const x of ROOMS) {
                game.put(i, f, x);
                if (players === 2) game.put(1 - i, (f + 2) % 4, x);
                step(0.05);
                let a = pl(i);
                const o0 = players === 2 ? pl(1 - i) : null;
                if (how === 'keys') press(keys[0], 0.25); else tap(i, 'r', 0.25);
                let b = pl(i);
                const right = b.sx - a.sx > 15 && b.x > a.x && b.mode === 'ground';
                const otherStill = !o0 || Math.abs(pl(1 - i).x - o0.x) < 0.01;
                game.put(i, f, x);
                step(0.05);
                a = pl(i);
                if (how === 'keys') press(keys[1], 0.25); else tap(i, 'l', 0.25);
                b = pl(i);
                const left = b.sx - a.sx < -15 && b.x < a.x && b.mode === 'ground';
                if (!right || !left || !otherStill) bad.push(`floor ${f} x ${x}: → ${right ? 'right' : 'WRONG'}, ← ${left ? 'left' : 'WRONG'}${otherStill ? '' : ', moved his brother too'}`);
              }
            }
            ok(`walk ${tag}`, !bad.length, bad.length ? bad.slice(0, 3).join('; ') : '→ right and ← left in all 12 rooms');
          }
        }
      }

      // ---------- shafts: → off on the right, ← off on the left, on every mansion, keys and touch ----------
      for (let stage = 0; stage < 6; stage++) {
        for (const [players, i, R, L] of [[1, 0, 'ArrowRight', 'ArrowLeft'], [2, 0, 'KeyD', 'KeyA'], [2, 1, 'ArrowRight', 'ArrowLeft']]) {
          for (const how of ['keys', 'touch']) {
            document.body.classList.toggle('touch', how === 'touch');
            fresh(stage, { players });
            openAll();
            const bad = [];
            for (let k = 0; k < 4; k++) {
              for (const s of [1, -1]) {
                game.putShaft(i, k, 2.2, 1);
                step(0.05);
                const sx0 = game.toScreen(LV.SX[k], 1.5, 0.35)[0];
                if (how === 'keys') press(s > 0 ? R : L, 0.08); else tap(i, s > 0 ? 'r' : 'l', 0.08);
                const off = untilOff(i, 4);
                const b = pl(i);
                const wall = (k === 0 && s < 0) || (k === 3 && s > 0);
                if (wall) { if (off) bad.push(`shaft ${k} ${s > 0 ? '→' : '←'}: got off through the wall`); continue; }
                const side = Math.sign(b.sx - sx0);
                if (!off || side !== s || b.f !== 1) bad.push(`shaft ${k} ${s > 0 ? '→' : '←'}: ${off ? `off on the ${side > 0 ? 'right' : 'left'} at floor ${b.f}` : 'never got off'}`);
              }
            }
            ok(`shafts ${players === 2 ? '2P ' + pl(i).who : '1P'} mansion ${stage + 1} ${how}`, !bad.length, bad.length ? bad.slice(0, 3).join('; ') : 'every shaft: → off on the right, ← off on the left, never through a wall');
          }
        }
      }
      document.body.classList.toggle('touch', hadTouch);

      // ---------- getting on a trampoline the way Alan plays: hold → (or ←) and walk into every shaft ----------
      // From 1 m away on every floor, on both sides of every shaft, on every mansion: he must end up on the trampoline
      // bouncing (up the screen, in the shaft, never past it and never off while the key is down); then a fresh press
      // gets him off at the next floor on that side. Keys held, keys tapped, touch held, and ↓.
      const sim = MM.sim;
      const walkOn = (i, f, k, side, how, R, L) => {
        const into = -side, dirKey = into > 0 ? R : L, btn = into > 0 ? 'r' : 'l';
        game.put(i, f, sim.edgeOf(k, side) + side * 1.0);
        step(0.05);
        const sy0 = pl(i).sy, shaftSx = game.toScreen(LV.SX[k], 1, 0.35)[0];
        let lowSy = sy0, upSy = 1e9, bounced = false, off = false, seenIn = false;
        const el = how === 'touch' ? button(i, btn) : null;
        const o = { pointerId: 40 + i, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true };
        if (how === 'hold') key(dirKey, true);
        else if (how === 'touch') el.dispatchEvent(new PointerEvent('pointerdown', o));
        else if (how === 'down') press(i ? 'ArrowDown' : (st().two ? 'KeyS' : 'ArrowDown'), 0.05);
        for (let t = 0; t < 4; t += 0.05) {
          if (how === 'tap' && !seenIn && Math.round(t / 0.05) % 3 === 0) { key(dirKey, true); step(0.05); key(dirKey, false); continue; }
          step(0.05);
          const q = pl(i);
          if (q.mode === 'shaft') seenIn = true;
          if (seenIn && q.mode === 'ground') off = true;
          if (q.bounces > 0) bounced = true;
          if (!bounced) lowSy = Math.max(lowSy, q.sy); else upSy = Math.min(upSy, q.sy);
        }
        const q = pl(i);
        // on the trampoline: in the shaft, it bounced him, and he went back up the screen from the bottom
        const onIt = q.mode === 'shaft' && bounced && !off && lowSy - upSy > 40 && Math.abs(q.sx - shaftSx) < 25;
        if (how === 'hold') key(dirKey, false);
        else if (how === 'touch') el.dispatchEvent(new PointerEvent('pointerup', o));
        step(0.1);
        // a fresh press toward a side with a floor: off at the next floor, on that side of the screen
        const go = sim.segBeside(k, into) >= 0 ? into : -into;
        if (how === 'touch') tap(i, go > 0 ? 'r' : 'l', 0.08); else press(go > 0 ? R : L, 0.08);
        const gotOff = untilOff(i, 5);
        const b = pl(i);
        const offOk = gotOff && Math.sign(b.sx - shaftSx) === go;
        return { onIt, offOk, info: `${q.mode}${bounced ? ', bounced' : ''}${off ? ', WENT ACROSS' : ''}, back up ${upSy < 1e9 ? lowSy - upSy : 0} px; then ${gotOff ? 'off on the ' + (Math.sign(b.sx - shaftSx) > 0 ? 'right' : 'left') : 'never off'}` };
      };
      const ways = [['hold', [0, 1, 2, 3, 4, 5]], ['tap', [0, 3]], ['touch', [0, 5]], ['down', [0, 2, 4]]];
      for (const [how, stages] of ways) {
        for (const stage of stages) {
          for (const [players, i, R, L] of [[1, 0, 'ArrowRight', 'ArrowLeft'], [2, 1, 'ArrowRight', 'ArrowLeft'], [2, 0, 'KeyD', 'KeyA']]) {
            if (players === 2 && how !== 'hold' && how !== 'touch') continue;
            document.body.classList.toggle('touch', how === 'touch');
            fresh(stage, { players, level: stage % 2 ? 'normal' : 'easy' });
            openAll();
            if (players === 2) game.put(1 - i, 3, 0);
            const bad = [];
            let n = 0;
            for (let f = 0; f < 4; f++) {
              for (let k = 0; k < 4; k++) {
                for (const side of [-1, 1]) {
                  if (sim.segBeside(k, side) < 0) continue;
                  const r = walkOn(i, f, k, side, how, R, L);
                  n++;
                  if (!r.onIt || !r.offOk) bad.push(`floor ${f} shaft ${k} from the ${side > 0 ? 'right' : 'left'}: ${r.info}`);
                }
              }
            }
            ok(`get on ${how} ${players === 2 ? '2P ' + pl(i).who : '1P'} mansion ${stage + 1}`, !bad.length, bad.length ? bad.slice(0, 3).join('; ') : `${n} walks into a shaft: on the trampoline and bouncing every time, then off on the side pressed`);
          }
        }
      }
      document.body.classList.toggle('touch', hadTouch);

      // ← or → while bouncing, going up or coming down, at any height: he goes that way on screen right away
      for (const [players, i, R, L, how] of [[1, 0, 'ArrowRight', 'ArrowLeft', 'keys'], [1, 0, 'ArrowRight', 'ArrowLeft', 'touch'], [2, 0, 'KeyD', 'KeyA', 'keys'], [2, 1, 'ArrowRight', 'ArrowLeft', 'keys']]) {
        document.body.classList.toggle('touch', how === 'touch');
        const bad = [];
        let n = 0;
        for (let stage = 0; stage < 6; stage++) {
          fresh(stage, { players });
          openAll();
          for (let k = 0; k < 4; k++) {
            for (const s of [1, -1]) {
              if (sim.segBeside(k, s) < 0) continue;
              for (const y of [1.5, 4.5, 7.4]) {
                for (const vdir of [1, -1]) {
                  game.putShaft(i, k, y, vdir);
                  step(0.02);
                  const a = pl(i);
                  if (how === 'touch') tap(i, s > 0 ? 'r' : 'l', 0.05); else press(s > 0 ? R : L, 0.05);
                  step(0.05);
                  const b = pl(i);
                  n++;
                  const moved = (b.sx - a.sx) * s;
                  untilOff(i, 2);
                  const c = pl(i);
                  if (moved < 12 || c.mode !== 'ground' || Math.sign(c.sx - a.sx) !== s) bad.push(`mansion ${stage + 1} shaft ${k} at ${y} m going ${vdir > 0 ? 'up' : 'down'}, ${s > 0 ? '→' : '←'}: moved ${Math.round(moved)} px that way in 0.12 s, then ${c.mode}`);
                }
              }
            }
          }
        }
        ok(`press in a shaft ${players === 2 ? '2P ' + (i ? 'Tommy' : 'Teddy') : '1P'} ${how}`, !bad.length, bad.length ? bad.slice(0, 3).join('; ') : `${n} presses at heights between the floors, going up and down: he starts hopping off that way within 0.12 s, every time`);
      }
      document.body.classList.toggle('touch', hadTouch);

      // walking off a floor drops him down the shaft onto its trampoline, and he bounces back up
      {
        fresh(0);
        openAll();
        game.put(0, 2, -5.0);
        key('ArrowRight', true);
        for (let t = 0; t < 1 && pl().mode === 'ground'; t += 1 / 60) step(1 / 60);
        key('ArrowRight', false);
        let low = 99, bounced = false;
        for (let t = 0; t < 3; t += 0.05) { step(0.05); low = Math.min(low, pl().y); if (pl().bounces > 0) bounced = true; }
        ok('walk into a shaft', pl().mode === 'shaft' && low < LV.TRAMP_Y + 0.1 && bounced, `${pl().mode}, lowest ${low.toFixed(2)}, bounced ${bounced}`);
      }

      // ---------- doors with the real door key and the 🚪 button ----------
      for (const how of ['keys', 'touch']) {
        document.body.classList.toggle('touch', how === 'touch');
        fresh(0);
        const w = game.world();
        const d = w.doors.find((q) => q.f === 1 && q.s === 1);
        d.open = false;
        game.put(0, 1, d.x - 0.9);
        game.world().players[0].inv = 99;
        const c = game.cat(1, d.x + 0.9, { mood: 'chase', moodT: 1e9 });
        w.cfg = Object.assign({}, w.cfg, { cat: 0 });
        if (how === 'keys') press('Space', 0.05); else tap(0, 'j', 0.05);
        step(0.2);
        const bonked = c.st === 'stun';
        const opened = d.open;
        if (how === 'keys') press('ArrowUp', 0.05); else tap(0, 'j', 0.05);
        ok(`door ${how}`, opened && bonked && !d.open, `opened ${opened}, cat ${bonked ? 'bonked' : c.st}, closed again ${!d.open}`);
      }
      document.body.classList.toggle('touch', hadTouch);

      // ---------- nothing leaves him stuck ----------
      const canWalk = (i) => {
        const a = pl(i || 0);
        const R = st().two ? (i ? 'ArrowRight' : 'KeyD') : 'ArrowRight', L = st().two ? (i ? 'ArrowLeft' : 'KeyA') : 'ArrowLeft';
        press(R, 0.2);
        const b = pl(i || 0);
        press(L, 0.2);
        const c = pl(i || 0);
        return b.x > a.x + 0.3 && c.x < b.x - 0.3;
      };
      // a key held through pause: he doesn't walk on by himself after
      fresh(0); openAll(); game.put(0, 0, -1.5);
      key('ArrowRight', true); step(0.1);
      press('KeyP', 0.05); key('ArrowRight', false); step(0.3); press('KeyP', 0.05);
      let x0 = pl().x; step(0.5);
      ok('stuck: key held through pause', st().screen === 'play' && Math.abs(pl().x - x0) < 0.01 && canWalk(), `after resume he moved ${(pl().x - x0).toFixed(2)} m by himself`);
      // the window lost while a key is down
      fresh(0); openAll(); game.put(0, 0, -1.5);
      key('ArrowRight', true); step(0.1); dispatchEvent(new Event('blur')); key('ArrowRight', false);
      x0 = pl().x; step(0.5);
      ok('stuck: window lost', Math.abs(pl().x - x0) < 0.01 && canWalk(), 'stops when the window goes, walks after');
      // a cancelled touch
      document.body.classList.add('touch');
      fresh(0); openAll(); game.put(0, 0, -1.5);
      tap(0, 'r', 0.1, true);
      x0 = pl().x; step(0.5);
      ok('stuck: cancelled touch', Math.abs(pl().x - x0) < 0.01, 'a cancelled ▶ lets go');
      document.body.classList.toggle('touch', hadTouch);
      // a door closed on him while he stands in the doorway
      fresh(0);
      { const d = game.world().doors.find((q) => q.f === 1 && q.s === 1); d.open = true; game.put(0, 1, d.x); press('Space', 0.05);
        const nx = pl().x, away = nx < d.x ? 'ArrowLeft' : 'ArrowRight', back = nx < d.x ? 'ArrowRight' : 'ArrowLeft';
        press(away, 0.2); const ax = pl().x; press(back, 0.2);
        ok('stuck: door closed on him', !d.open && Math.abs(nx - d.x) > 0.3 && Math.abs(ax - nx) > 0.5 && Math.abs(pl().x - nx) < 0.05, `nudged to ${nx.toFixed(2)}, walked away to ${ax.toFixed(2)} and back to the door ${pl().x.toFixed(2)}`); }
      // hugged by a cat
      fresh(0); game.put(0, 0, -1.5); game.cat(0, -0.5, { mood: 'chase', moodT: 1e9 });
      for (let t = 0; t < 2 && pl().mode !== 'hug'; t += 0.05) step(0.05);
      const hugged = pl().mode === 'hug';
      game.quiet(); step(2);
      ok('stuck: after a hug', hugged && pl().mode === 'ground' && canWalk(), `hugged ${hugged}, then ${pl().mode}`);
      // a torn trampoline (NORMAL)
      fresh(0, { level: 'normal' }); openAll(); game.putShaft(0, 1, 0, -1);
      for (let t = 0; t < 20 && pl().mode === 'shaft'; t += 0.1) step(0.1);
      const plopped = pl().mode === 'plop';
      step(2.2);
      ok('stuck: after a torn trampoline', plopped && pl().mode === 'ground' && canWalk(), `plopped ${plopped}, then ${pl().mode}`);
      // during and after the brother's visit
      fresh(0); openAll(); game.put(0, 0, -1.5);
      press('KeyT', 0.05);
      const during = canWalk();
      step(3);
      ok('stuck: brother visit', st().buddy === null && during && canWalk(), `walks during ${during} and after`);
      // the next mansion
      fresh(0, { toys: true }); game.world().toys.forEach((t) => (t.got = true)); step(5);
      ok('stuck: next mansion', st().li === 1 && st().phase === 'play' && canWalk(), `mansion ${st().li + 1} ${st().phase}`);
      // the keyboard kid: mashing keys on every mansion, cats and all; never stuck for long
      for (let stage = 0; stage < 6; stage++) {
        game.start({ stage, go: true, level: stage % 2 ? 'normal' : 'easy', players: 1 });
        const ks = ['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp', 'KeyA', 'KeyD'];
        let worst = 0, still = 0, lastX = pl().x, lastY = pl().y, rng = stage * 7 + 3;
        const down = new Set();
        for (let t = 0; t < 40; t += 0.1) {
          rng = (rng * 1103515245 + 12345) & 0x7fffffff;
          const k = ks[rng % ks.length];
          if (down.has(k)) { key(k, false); down.delete(k); } else { key(k, true); down.add(k); }
          step(0.1);
          const p = pl();
          if (Math.abs(p.x - lastX) < 1e-3 && Math.abs(p.y - lastY) < 1e-3 && (down.has('ArrowLeft') || down.has('ArrowRight') || down.has('KeyA') || down.has('KeyD')) && p.mode === 'ground') still += 0.1; else still = 0;
          worst = Math.max(worst, still);
          lastX = p.x; lastY = p.y;
          if (st().phase === 'over') break;
        }
        down.forEach((k) => key(k, false));
        ok(`keyboard kid mansion ${stage + 1}`, worst < 3, `longest time standing still with a walk key down: ${worst.toFixed(1)} s (a closed door or the wall)`);
      }
    } catch (e) {
      ok('threw', false, String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
    } finally {
      game.sabotage(null);
      document.body.classList.toggle('touch', hadTouch);
      game.showTitle();
      game.hold(wasHold);
    }
    const failed = results.filter((r) => !r.ok).map((r) => `${r.name}: ${r.info}`);
    return { ok: !failed.length, total: results.length, failed, results };
  }
  game.playCheck = run;
})();
