/* TT Mouse Mansion: sound effects, all synth through Kit.sound (so the page's one mute switch covers them).
   MM.sfx.log counts every effect played, so tests can check sound in code while muted. */
(function () {
  'use strict';
  const S = Kit.sound;
  const log = {};
  const note = (name, fn) => (...a) => { log[name] = (log[name] || 0) + 1; fn(...a); };
  const spring = (f, vol, at) => { S.tone({ type: 'sine', f, to: f * 2.4, dur: 0.12, vol, at: at || 0 }); S.tone({ type: 'sine', f: f * 2.4, to: f * 1.3, dur: 0.2, vol: vol * 0.7, at: (at || 0) + 0.12 }); };
  const meow = (f, vol, at) => { S.tone({ type: 'triangle', f, to: f * 1.5, dur: 0.12, vol, at: at || 0, lp: 2400 }); S.tone({ type: 'triangle', f: f * 1.5, to: f * 0.9, dur: 0.22, vol: vol * 0.9, at: (at || 0) + 0.12, lp: 2000 }); };
  MM.sfx = {
    log,
    boing: note('boing', (n) => spring(200 + (n || 0) * 40, 0.12)),
    worn: note('worn', () => { spring(150, 0.1); S.tone({ type: 'square', f: 300, to: 260, dur: 0.12, vol: 0.05, at: 0.1, lp: 1200 }); }),
    tear: note('tear', () => { S.hiss({ f: 3000, to: 600, filter: 'bandpass', q: 2, dur: 0.35, vol: 0.12 }); S.tone({ type: 'sine', f: 500, to: 120, dur: 0.6, vol: 0.12, at: 0.15 }); }),
    plop: note('plop', () => S.tone({ type: 'sine', f: 180, to: 90, dur: 0.25, vol: 0.14 })),
    off: note('off', () => S.tone({ type: 'sine', f: 520, to: 700, dur: 0.06, vol: 0.06 })),
    drop: note('drop', () => S.tone({ type: 'sine', f: 600, to: 300, dur: 0.18, vol: 0.05 })),
    doorOpen: note('doorOpen', () => { S.tone({ type: 'square', f: 220, to: 330, dur: 0.08, vol: 0.06, lp: 1400 }); S.hiss({ f: 1200, to: 400, dur: 0.18, vol: 0.05 }); }),
    doorClose: note('doorClose', () => { S.tone({ type: 'square', f: 160, to: 120, dur: 0.07, vol: 0.08, lp: 900 }); S.bump(); }),
    bonk: note('bonk', () => { S.tone({ type: 'triangle', f: 700, to: 250, dur: 0.15, vol: 0.13 }); meow(500, 0.07, 0.15); }),
    wave: note('wave', () => { S.hiss({ f: 400, to: 2400, filter: 'bandpass', q: 1, dur: 0.7, vol: 0.12 }); for (let i = 0; i < 5; i++) S.tone({ type: 'sine', f: 600 + i * 150, to: 1200 + i * 150, dur: 0.08, vol: 0.05, at: i * 0.09 }); }),
    swept: note('swept', (n) => { meow(700 + (n || 0) * 60, 0.07); S.tone({ type: 'sine', f: 900, to: 1600, dur: 0.25, vol: 0.05, at: 0.2 }); }),
    toy: note('toy', () => S.coin(3)),
    pair: note('pair', () => [784, 988, 1175, 1568].forEach((f, i) => S.tone({ type: 'triangle', f, dur: 0.12, vol: 0.1, at: i * 0.08 }))),
    catIn: note('catIn', () => meow(420, 0.07)),
    hug: note('hug', () => { meow(380, 0.1); for (let i = 0; i < 4; i++) S.tone({ type: 'sine', f: 900 - i * 120, to: 1000 - i * 120, dur: 0.12, vol: 0.05, at: 0.3 + i * 0.13 }); }),
    respawn: note('respawn', () => [1047, 1319, 1568].forEach((f, i) => S.tone({ type: 'triangle', f, dur: 0.12, vol: 0.07, at: i * 0.08 }))),
    clear: note('clear', () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => S.tone({ type: 'triangle', f, dur: 0.22, vol: 0.13, at: i * 0.12 }))),
    buddy: note('buddy', () => { S.tone({ f: 400, to: 900, dur: 0.15, vol: 0.12 }); S.hiss({ f: 2000, to: 500, dur: 0.25, vol: 0.08 }); }),
    doorsAll: note('doorsAll', () => { for (let i = 0; i < 6; i++) S.tone({ type: 'square', f: 220 + i * 40, to: 330 + i * 40, dur: 0.08, vol: 0.05, at: i * 0.05, lp: 1400 }); S.hiss({ f: 400, to: 2400, filter: 'bandpass', q: 1, dur: 0.6, vol: 0.1, at: 0.2 }); }),
    treat: note('treat', () => S.coin(4)),
    hi5: note('hi5', () => { S.hiss({ filter: 'bandpass', f: 1800, dur: 0.08, vol: 0.25, q: 1 }); S.tone({ f: 880, to: 1320, dur: 0.15, vol: 0.08, at: 0.05 }); }),
    life: note('life', () => [784, 988, 1175, 1568].forEach((f, i) => S.tone({ type: 'square', f, dur: 0.1, vol: 0.06, at: i * 0.09 }))),
    go: note('go', () => { S.tone({ type: 'square', f: 660, dur: 0.1, vol: 0.07 }); S.tone({ type: 'square', f: 990, dur: 0.18, vol: 0.07, at: 0.12 }); }),
    gameOver: note('gameOver', () => [523, 440, 392, 523].forEach((f, i) => S.tone({ type: 'triangle', f, dur: 0.25, vol: 0.12, at: i * 0.2 }))),
    click: note('click', () => S.click()),
  };
})();
