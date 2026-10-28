/* TT Mouse Mansion: the toy mansion and its six layouts. Shared by the rules (js/sim.js), the art (js/art.js), the
   autopilot (js/bot.js) and the checks. Units are metres; x runs -11..11 (walls), y is up, the ground floor is y = 0.
   - Four floors, each cut into three rooms (segments A, B, C) by four trampoline shafts: one at each wall and two
     inside. A shaft goes down past the ground floor to its trampoline in the basement.
   - A door can stand in the middle of a segment: closed it blocks the way, opened it swings away from the mouse who
     opened it. A glowing door also sends a bubble wave along its floor.
   - Toys: five kinds, two of each, on the floors. */
(function (root) {
  'use strict';
  const MM = (root.MM = root.MM || {});
  const FLOOR_Y = [0, 3, 6, 9];
  const WALL = 11;
  const SX = [-10.2, -3.4, 3.4, 10.2]; // the shafts' middles
  const SW = 0.8; // a shaft's half width
  // the segments between the shafts: segment s has shaft s on its left and shaft s + 1 on its right
  const SEGS = [
    { s: 0, x0: SX[0] + SW, x1: SX[1] - SW },
    { s: 1, x0: SX[1] + SW, x1: SX[2] - SW },
    { s: 2, x0: SX[2] + SW, x1: SX[3] - SW },
  ];
  const DOOR_X = [-6.8, 0, 6.8];
  const KINDS = ['bear', 'robot', 'train', 'drum', 'kite'];
  // toy spots in a segment that has a door in its middle: [segment, which side of the door]
  const SPOT = { A: -8.5, a: -5.1, B: -1.6, b: 1.6, C: 5.1, c: 8.5 };
  // doors: 'fS' + state: f floor, S segment (A B C), state o open, c closed, g glowing (closed)
  // toys: 'fS' spot letter + kind initial (b bear, r robot, t train, d drum, k kite)
  const LAYOUTS = [
    { doors: ['1Bc', '2Ac', '2Cg', '3Bc', '0Co'], toys: ['0Ab', '0cb', '1Ar', '1cr', '2bt', '2At', '3Cd', '3ad', '1Bk', '3Ak'] },
    { doors: ['1Ac', '1Cc', '2Bg', '3Ac', '3Cc'], toys: ['0Ar', '3cr', '1ab', '1Cb', '2At', '2ct', '3Bd', '0cd', '2Bk', '3ak'] },
    { doors: ['0Ac', '1Bg', '2Cc', '3Ac', '2Ao', '3Cc'], toys: ['3Ab', '3cb', '0Ad', '2cd', '1Ak', '1ck', '2Ar', '0Cr', '1bt', '3Bt'] },
    { doors: ['0Cc', '1Ac', '1Cg', '2Bc', '3Bg'], toys: ['2Ab', '0cb', '1ad', '3cd', '0ak', '2ck', '3Ar', '1Cr', '2bt', '3Bt'] },
    { doors: ['0Ag', '1Bc', '2Ac', '2Cc', '3Bc', '1Co'], toys: ['1Ab', '3Cb', '0ct', '2Bt', '3ar', '2cr', '1Bd', '0Ad', '3Ak', '2ak'] },
    { doors: ['0Cg', '1Ac', '1Cc', '2Bg', '3Ac', '3Cc'], toys: ['0Ar', '0cr', '1Ab', '1cb', '2Bd', '2At', '2ct', '3bd', '3Ak', '3ck'] },
  ];
  const SEG_OF = { A: 0, B: 1, C: 2 };
  const KIND_OF = { b: 'bear', r: 'robot', t: 'train', d: 'drum', k: 'kite' };
  const LEVELS = LAYOUTS.map((L) => ({
    doors: L.doors.map((d) => ({ f: +d[0], s: SEG_OF[d[1]], x: DOOR_X[SEG_OF[d[1]]], open: d[2] === 'o', glow: d[2] === 'g' })),
    toys: L.toys.map((t) => ({ f: +t[0], x: SPOT[t[1]], kind: KIND_OF[t[2]] })),
  }));
  MM.levels = {
    FLOOR_Y, WALL, SX, SW, SEGS, DOOR_X, KINDS, LEVELS,
    TRAMP_Y: -0.9, // a trampoline's top: the shafts go down past the ground floor into the basement
    APEX_Y: 9.65, // a bounce tops out just over the top floor
    PILLOW_Y: -2.3, // a torn trampoline drops you onto the basement pillow
    ROOF_Y: 11.2,
  };
})(typeof window !== 'undefined' ? window : globalThis);
