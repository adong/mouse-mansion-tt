/* TT Mouse Mansion: the 3D things, chunky toy style. The toy mansion (wallpaper rooms, wooden floors, a roof with
   hatches, a basement with pillows), the trampolines, the doors (and the glowing ones), the toys, the silly cats
   in party hats, the bubble wave, confetti and stars. The brothers wear mouse ears and a tail (Kit.people.build is
   wrapped below for look.mouse). js/game.js places and moves them. */
(function () {
  'use strict';
  const T = THREE, G = Kit.gfx, LV = MM.levels;
  const A = (MM.art = {});
  const { FLOOR_Y, WALL, SX, SW, SEGS, TRAMP_Y, ROOF_Y } = LV;
  const mats = new Map();
  const mat = (color, o) => {
    const k = color + JSON.stringify(o || {});
    if (!mats.has(k)) mats.set(k, G.std(color, o));
    return mats.get(k);
  };
  const box = (w, h, d, m, x, y, z, parent) => G.mesh(new T.BoxGeometry(w, h, d), m, x, y, z, parent, false);
  const ball = (r, m, x, y, z, parent) => G.mesh(new T.SphereGeometry(r, 16, 12), m, x, y, z, parent, false);
  A.WALLPAPER = ['#bff0d8', '#ffd9c2', '#e3d4ff', '#fff2a8'];
  A.STRIPE = ['#ff8fb1', '#36c5f0', '#ffb703', '#7bd94a'];
  A.CAT_COLORS = ['#ff9f43', '#a4b0be', '#c39bff', '#ffd6a5'];
  A.HAT_COLORS = ['#ff3d7f', '#18d4ff', '#7dff5a', '#ffd400'];
  A.WEAR_COLORS = ['#5ee05e', '#c6f04d', '#ffd23d', '#ff9f1c', '#ff5c5c'];

  // ---------- the brothers in mouse ears, with a tail ----------
  const build = Kit.people.build;
  Kit.people.build = function (look) {
    const p = build(look);
    if (!look || !look.mouse) return p;
    const grey = mat('#a9a9bd', { roughness: 0.6 }), pink = mat('#ffb3c7', { roughness: 0.6 });
    // round ears that read from the side too (the brothers walk side-on), and a little pink nose
    for (const sx of [-1, 1]) {
      const ear = ball(0.22, grey, sx * 0.26, 0.4, 0.03, p.head);
      ear.scale.set(1, 1, 0.75);
      const inner = ball(0.14, pink, sx * 0.26, 0.4, -0.08, p.head);
      inner.scale.set(1, 1, 0.6);
    }
    ball(0.06, pink, 0, -0.03, -0.26, p.head);
    box(0.56, 0.06, 0.1, grey, 0, 0.27, 0.02, p.head); // the headband
    const tail = new T.Group();
    tail.position.set(0, -0.05, 0.2);
    p.hips.add(tail);
    let prev = tail;
    for (let i = 0; i < 5; i++) {
      const s = new T.Group();
      s.position.set(0, i ? 0.13 : 0, i ? 0.03 : 0);
      s.rotation.x = -0.45;
      prev.add(s);
      box(0.05, 0.15, 0.05, pink, 0, 0.07, 0, s);
      prev = s;
    }
    tail.rotation.x = 1.3;
    p.tail = tail;
    return p;
  };

  // ---------- painted textures ----------
  const rep = (t, x, y) => { t.repeat.set(x, y); return t; };
  function wallTex(base, accent, kind) {
    const [c, g] = G.makeCanvas(256, 256);
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = accent;
    g.globalAlpha = 0.35;
    if (kind % 2 === 0) for (let x = 0; x < 256; x += 64) g.fillRect(x + 8, 0, 20, 256);
    else for (let y = 16; y < 256; y += 64) for (let x = 16; x < 256; x += 64) { g.beginPath(); g.arc(x + (y % 128 ? 32 : 0), y, 9, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    return rep(G.toTexture(c, true), 7, 1);
  }
  function woodTex() {
    const [c, g] = G.makeCanvas(256, 64);
    g.fillStyle = '#d9a066';
    g.fillRect(0, 0, 256, 64);
    for (let x = 0; x < 256; x += 64) {
      g.fillStyle = x % 128 ? '#cf9459' : '#e3ad74';
      g.fillRect(x, 0, 62, 64);
      g.fillStyle = 'rgba(120,70,30,0.35)';
      g.fillRect(x + 62, 0, 2, 64);
      g.fillRect(x + 20, 22, 18, 3);
    }
    return rep(G.toTexture(c, true), 1, 1);
  }
  function brickTex() {
    const [c, g] = G.makeCanvas(256, 128);
    g.fillStyle = '#9c6b4e';
    g.fillRect(0, 0, 256, 128);
    for (let y = 0; y < 128; y += 32) {
      for (let x = -32; x < 256; x += 64) {
        g.fillStyle = (x + y) % 128 ? '#b5805f' : '#a8735a';
        G.roundRect(g, x + (y % 64 ? 32 : 0) + 3, y + 3, 58, 26, 6);
        g.fill();
      }
    }
    return rep(G.toTexture(c, true), 5, 1.5);
  }
  function roofTex() {
    const [c, g] = G.makeCanvas(256, 128);
    g.fillStyle = '#e8505b';
    g.fillRect(0, 0, 256, 128);
    for (let y = 0; y < 128; y += 32) {
      for (let x = -32; x < 256; x += 32) {
        g.fillStyle = (x / 32 + y / 32) % 2 ? '#ff6b6b' : '#f25f6a';
        g.beginPath();
        g.arc(x + (y % 64 ? 16 : 0) + 16, y + 6, 15, 0, Math.PI);
        g.fill();
      }
    }
    return rep(G.toTexture(c, true), 8, 1);
  }

  // ---------- the mansion ----------
  A.mansion = function (scene) {
    const root = new T.Group();
    scene.add(root);
    // the garden behind and below: grass, a few round trees, clouds
    box(80, 6, 1, mat('#7bd94a', { roughness: 0.9 }), 0, -6, -8, root);
    for (const [x, s] of [[-17, 1.4], [-14, 1], [15, 1.3], [18.5, 0.9]]) {
      box(0.5 * s, 3 * s, 0.5 * s, mat('#8b5a2b'), x, -1.5 + 1.5 * s, -6, root);
      ball(1.6 * s, mat('#3fbf5a', { roughness: 0.9 }), x, -1.5 + 3.4 * s, -6, root);
    }
    // the back walls, one wallpaper per floor
    for (let f = 0; f < 4; f++) {
      const y0 = FLOOR_Y[f], y1 = f < 3 ? FLOOR_Y[f + 1] - 0.32 : ROOF_Y - 0.3;
      const wm = new T.MeshStandardMaterial({ map: wallTex(A.WALLPAPER[f], A.STRIPE[f], f), roughness: 0.9 });
      box(2 * WALL, y1 - y0, 0.2, wm, 0, (y0 + y1) / 2, -1.35, root);
      // a skirting board
      box(2 * WALL, 0.22, 0.1, mat('#ffffff', { roughness: 0.6 }), 0, y0 + 0.11, -1.22, root);
    }
    // the basement: bricks, with the trampolines' pits
    const bm = new T.MeshStandardMaterial({ map: brickTex(), roughness: 0.9 });
    box(2 * WALL + 0.8, 3.1, 0.2, bm, 0, -1.9, -1.35, root);
    box(2 * WALL + 0.8, 0.5, 2.8, mat('#7a5136'), 0, -3.2, 0, root);
    // the shafts: a darker strip on the wall with a rope ladder look, so you can see where you bounce
    const shaftM = mat('#5b6fd6', { roughness: 0.8 });
    const dotM = mat('#ffffff', { roughness: 0.8, emissive: '#ffffff', emissiveIntensity: 0.15 });
    for (const x of SX) {
      box(SW * 2 - 0.1, ROOF_Y + 2.6 - 0.3, 0.06, shaftM, x, (ROOF_Y - 0.3 - 2.6) / 2, -1.22, root);
      for (let y = -2; y < ROOF_Y - 0.6; y += 0.9) box(0.18, 0.18, 0.04, dotM, x, y, -1.17, root);
      // up-and-down arrows at every floor: this gap is where you bounce
      for (let f = 0; f < 4; f++) {
        const e = A.emoji('↕️', 0.8);
        e.material.depthTest = true;
        e.renderOrder = 0;
        e.position.set(x, FLOOR_Y[f] + 1.3, -1.1);
        root.add(e);
      }
    }
    // outer walls and corner posts
    const post = mat('#fff4e0', { roughness: 0.7 });
    for (const sx of [-1, 1]) {
      box(0.5, ROOF_Y + 3.4, 2.8, post, sx * (WALL + 0.25), (ROOF_Y - 3.4) / 2, 0, root);
      for (let f = 0; f < 4; f++) box(0.6, 0.3, 2.9, mat(A.STRIPE[f]), sx * (WALL + 0.25), FLOOR_Y[f] - 0.15, 0, root);
    }
    // the roof: a strip of red tiles with three round hatches (where the cats come in), and a chimney
    const rm = new T.MeshStandardMaterial({ map: roofTex(), roughness: 0.8 });
    box(2 * WALL + 1.6, 0.5, 3, mat('#ffffff'), 0, ROOF_Y - 0.3, 0, root);
    const roof = box(2 * WALL + 2.4, 1.1, 3.2, rm, 0, ROOF_Y + 0.5, -0.1, root);
    roof.rotation.x = -0.06;
    box(1, 1.4, 1, mat('#c0563f'), 7.5, ROOF_Y + 1.3, -0.6, root);
    box(1.2, 0.25, 1.2, mat('#8a3a2a'), 7.5, ROOF_Y + 2.05, -0.6, root);
    A.hatches = MM.sim.HATCH.map((x) => {
      const h = new T.Group();
      h.position.set(x, ROOF_Y + 0.55, 1.5);
      root.add(h);
      const ring = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 0.12, 24), mat('#ffd400'));
      ring.rotation.x = Math.PI / 2;
      h.add(ring);
      const lid = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.14, 24), mat('#3d3b5c'));
      lid.rotation.x = Math.PI / 2;
      lid.position.z = 0.02;
      h.add(lid);
      const paw = A.emoji('🐾', 0.5);
      paw.position.z = 0.15;
      h.add(paw);
      h.userData.lid = lid;
      return h;
    });
    // pictures and windows in the rooms (emoji pictures: cheese, flowers, a rocket...)
    const pics = ['🧀', '🌻', '🚀', '🌈', '🍰', '🐟', '⭐', '🎈', '🧁', '🌙', '🎨', '🍕'];
    let k = 0;
    for (let f = 0; f < 4; f++) {
      for (const sg of SEGS) {
        const cx = (sg.x0 + sg.x1) / 2 + (k % 2 ? 1.3 : -1.3);
        const y = FLOOR_Y[f] + 1.85;
        if (k % 3 === 1) {
          box(1.3, 1.1, 0.08, mat('#ffffff'), cx, y, -1.22, root);
          box(1.1, 0.9, 0.05, mat('#9fd8ff', { emissive: '#9fd8ff', emissiveIntensity: 0.3 }), cx, y, -1.18, root);
          box(0.08, 0.9, 0.06, mat('#ffffff'), cx, y, -1.15, root);
          box(1.1, 0.08, 0.06, mat('#ffffff'), cx, y, -1.15, root);
        } else {
          box(0.95, 0.95, 0.08, mat(A.STRIPE[(k + 1) % 4]), cx, y, -1.22, root);
          box(0.75, 0.75, 0.05, mat('#fffaf0'), cx, y, -1.18, root);
          const e = A.emoji(pics[k % pics.length], 0.55);
          e.material.depthTest = true;
          e.renderOrder = 0;
          e.position.set(cx, y, -1.1);
          root.add(e);
        }
        k++;
      }
    }
    return root;
  };

  // ---------- floors: wooden planks with a coloured edge ----------
  A.floors = function (scene) {
    const wood = new T.MeshStandardMaterial({ map: woodTex(), roughness: 0.75 });
    for (let f = 0; f < 4; f++) {
      for (const sg of SEGS) {
        const w = sg.x1 - sg.x0;
        const m = box(w, 0.3, 2.6, wood, (sg.x0 + sg.x1) / 2, FLOOR_Y[f] - 0.15, 0, scene);
        G.boxUV(m.geometry, w, 0.3, 2.6, 1.6);
        box(w, 0.1, 0.06, mat(A.STRIPE[f]), (sg.x0 + sg.x1) / 2, FLOOR_Y[f] - 0.18, 1.32, scene);
      }
    }
  };

  // ---------- trampolines at the bottom of each shaft ----------
  // its mat sits level with the ground floor, in the gap between the rooms: the next step along the floor
  A.trampoline = function () {
    const g = new T.Group();
    const red = mat('#ff4d6d'), blue = mat('#3d6ad6');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.16, 2.6, 0.16, sx > 0 ? red : blue, sx * 0.68, -1.38, sz * 0.82, g);
    box(1.56, 0.16, 0.16, red, 0, -0.08, 0.86, g);
    box(1.56, 0.16, 0.16, red, 0, -0.08, -0.86, g);
    box(0.16, 0.16, 1.8, blue, -0.72, -0.08, 0, g);
    box(0.16, 0.16, 1.8, blue, 0.72, -0.08, 0, g);
    const matM = new T.MeshStandardMaterial({ color: A.WEAR_COLORS[0], roughness: 0.5, emissive: '#ffffff', emissiveIntensity: 0.08 });
    const mt = box(1.32, 0.1, 1.6, matM, 0, -0.04, 0, g);
    for (let i = 0; i < 5; i++) box(0.05, 0.05, 0.12, mat('#cccccc', { metalness: 0.6, roughness: 0.3 }), -0.5 + i * 0.25, -0.08, 0.78, g);
    // the pillow under it on the basement floor, for a soft landing if it tears
    const pillow = box(1.5, 0.5, 1.6, mat('#ffe1ef', { roughness: 0.9 }), 0, -2.5, 0, g);
    const patch = box(0.5, 0.11, 0.5, mat('#ffffff'), 0, -0.03, 0.2, g);
    patch.visible = false;
    g.userData = { mat: mt, matM, patch, pillow };
    return g;
  };

  // ---------- doors ----------
  A.door = function () {
    const g = new T.Group();
    const frame = mat('#ffffff', { roughness: 0.6 });
    box(0.5, 2.3, 0.2, frame, 0, 1.15, -0.86, g);
    box(0.8, 0.32, 1.92, mat('#ff8fb1', { roughness: 0.6 }), 0, 2.4, 0, g);
    const pivot = new T.Group();
    pivot.position.set(0, 0, -0.78);
    g.add(pivot);
    const pm = new T.MeshStandardMaterial({ color: '#3fa9f5', roughness: 0.55, emissive: '#ffcf33', emissiveIntensity: 0 });
    box(0.5, 2.1, 1.54, pm, 0, 1.06, 0.78, pivot);
    box(0.52, 0.5, 0.5, mat('#ffffff', { roughness: 0.5 }), 0, 1.55, 0.78, pivot);
    box(0.52, 0.12, 1.56, mat('#ffffff', { roughness: 0.5 }), 0, 0.35, 0.78, pivot);
    for (const sx of [-1, 1]) ball(0.1, mat('#ffd400', { metalness: 0.5, roughness: 0.3 }), sx * 0.27, 1.0, 1.3, pivot);
    ball(0.12, mat('#ffd400', { metalness: 0.5, roughness: 0.3 }), 0, 1.0, 1.58, pivot); // the knob you can see from the front
    const glow = new T.Sprite(new T.SpriteMaterial({ map: G.glowTexture(), color: '#ffe066', transparent: true, opacity: 0, depthWrite: false }));
    glow.scale.set(3.2, 3.6, 1);
    glow.position.set(0, 1.15, 0.2);
    g.add(glow);
    const star = A.emoji('✨', 0.6);
    star.position.set(0, 2.7, 0.4);
    g.add(star);
    g.userData = { pivot, pm, glow, star, open: 0 };
    return g;
  };

  // ---------- toys ----------
  A.toy = function (kind) {
    const g = new T.Group();
    const inner = new T.Group();
    g.add(inner);
    if (kind === 'bear') {
      const fur = mat('#b5763c', { roughness: 0.85 }), light = mat('#f3d1a4', { roughness: 0.85 });
      const body = ball(0.24, fur, 0, 0.3, 0, inner); body.scale.set(1, 1.1, 0.9);
      ball(0.19, fur, 0, 0.62, 0, inner);
      for (const sx of [-1, 1]) { ball(0.08, fur, sx * 0.15, 0.78, 0, inner); ball(0.08, fur, sx * 0.2, 0.18, 0.05, inner); ball(0.07, fur, sx * 0.24, 0.42, 0.02, inner); }
      ball(0.08, light, 0, 0.58, 0.16, inner);
      ball(0.03, mat('#2a1a12'), 0, 0.61, 0.23, inner);
      for (const sx of [-1, 1]) ball(0.025, mat('#2a1a12'), sx * 0.07, 0.68, 0.17, inner);
      box(0.22, 0.08, 0.06, mat('#ff3d7f'), 0, 0.47, 0.17, inner);
    } else if (kind === 'robot') {
      const grey = mat('#b8c4d6', { metalness: 0.4, roughness: 0.4 });
      box(0.38, 0.36, 0.3, grey, 0, 0.3, 0, inner);
      box(0.3, 0.26, 0.26, grey, 0, 0.64, 0, inner);
      box(0.16, 0.12, 0.02, mat('#18d4ff', { emissive: '#18d4ff', emissiveIntensity: 0.6 }), 0, 0.33, 0.16, inner);
      for (const sx of [-1, 1]) { ball(0.045, mat('#ffd400', { emissive: '#ffd400', emissiveIntensity: 0.5 }), sx * 0.07, 0.66, 0.14, inner); box(0.08, 0.26, 0.08, grey, sx * 0.24, 0.3, 0, inner); box(0.09, 0.14, 0.09, mat('#5a6577'), sx * 0.1, 0.06, 0, inner); }
      box(0.03, 0.14, 0.03, mat('#5a6577'), 0, 0.84, 0, inner);
      ball(0.05, mat('#ff4d6d'), 0, 0.93, 0, inner);
    } else if (kind === 'train') {
      box(0.5, 0.26, 0.28, mat('#ff4d6d'), 0, 0.27, 0, inner);
      box(0.2, 0.22, 0.3, mat('#3d6ad6'), -0.16, 0.5, 0, inner);
      box(0.24, 0.04, 0.34, mat('#ffd400'), -0.16, 0.62, 0, inner);
      G.mesh(new T.CylinderGeometry(0.06, 0.08, 0.2, 12), mat('#2b2b3a'), 0.14, 0.48, 0, inner, false);
      for (const sx of [-0.16, 0.16]) for (const sz of [-1, 1]) { const wh = G.mesh(new T.CylinderGeometry(0.09, 0.09, 0.05, 14), mat('#ffd400'), sx, 0.12, sz * 0.16, inner, false); wh.rotation.x = Math.PI / 2; }
      box(0.06, 0.1, 0.2, mat('#2b2b3a'), 0.28, 0.2, 0, inner);
    } else if (kind === 'drum') {
      const d = G.mesh(new T.CylinderGeometry(0.27, 0.27, 0.32, 20), mat('#3d6ad6'), 0, 0.3, 0, inner, false);
      d.rotation.x = 0.35;
      const top = G.mesh(new T.CylinderGeometry(0.28, 0.28, 0.04, 20), mat('#ffffff'), 0, 0.17, 0, d, false);
      top.position.y = 0.17;
      G.mesh(new T.TorusGeometry(0.27, 0.03, 6, 20), mat('#ffd400'), 0, -0.15, 0, d, false).rotation.x = Math.PI / 2;
      G.mesh(new T.TorusGeometry(0.27, 0.03, 6, 20), mat('#ffd400'), 0, 0.15, 0, d, false).rotation.x = Math.PI / 2;
      for (const sx of [-1, 1]) {
        const st = box(0.04, 0.4, 0.04, mat('#e3ad74'), sx * 0.12, 0.62, 0.05, inner);
        st.rotation.z = sx * -0.5;
        ball(0.05, mat('#ff4d6d'), sx * 0.03, 0.8, 0.05, inner);
      }
    } else {
      // a kite: a diamond in four colours with a tail of bows
      const cols = ['#ff3d7f', '#ffd400', '#18d4ff', '#7dff5a'];
      const kite = new T.Group();
      kite.position.y = 0.55;
      inner.add(kite);
      cols.forEach((c, i) => {
        const tri = new T.Mesh(new T.ConeGeometry(0.22, 0.32, 3, 1), mat(c, { side: T.DoubleSide }));
        tri.scale.set(1, 1, 0.15);
        tri.rotation.z = (i * Math.PI) / 2;
        tri.position.set(Math.sin((i * Math.PI) / 2) * -0.1, Math.cos((i * Math.PI) / 2) * 0.1, 0);
        kite.add(tri);
      });
      for (let i = 0; i < 3; i++) box(0.1, 0.05, 0.04, mat(cols[i]), Math.sin(i) * 0.05, -0.28 - i * 0.14, 0, kite);
    }
    const glow = new T.Sprite(new T.SpriteMaterial({ map: G.glowTexture(), color: '#fff2a8', transparent: true, opacity: 0.5, depthWrite: false }));
    glow.scale.set(1.3, 1.3, 1);
    glow.position.set(0, 0.45, -0.2);
    g.add(glow);
    g.userData = { inner, glow, kind };
    return g;
  };

  // ---------- the silly cats ----------
  A.cat = function (hue) {
    const g = new T.Group();
    const body = new T.Group();
    g.add(body);
    const fur = mat(A.CAT_COLORS[hue % 4], { roughness: 0.8 }), white = mat('#ffffff', { roughness: 0.6 }), ink = mat('#2a2238');
    const tum = ball(0.38, fur, 0, 0.5, 0, body); tum.scale.set(1.15, 0.95, 0.9);
    ball(0.25, white, 0, 0.45, 0.2, body).scale.set(1, 1, 0.6);
    const head = new T.Group();
    head.position.set(0, 1.0, 0.05);
    body.add(head);
    ball(0.34, fur, 0, 0, 0, head).scale.set(1.15, 0.95, 0.95);
    for (const sx of [-1, 1]) {
      const ear = new T.Mesh(new T.ConeGeometry(0.13, 0.26, 4), fur);
      ear.position.set(sx * 0.22, 0.3, 0);
      ear.rotation.z = sx * -0.35;
      head.add(ear);
      const inner = new T.Mesh(new T.ConeGeometry(0.07, 0.15, 4), mat('#ffb3c7'));
      inner.position.set(sx * 0.21, 0.27, 0.06);
      inner.rotation.z = sx * -0.35;
      head.add(inner);
      const eye = ball(0.11, white, sx * 0.14, 0.05, 0.27, head);
      eye.scale.set(1, 1.15, 0.6);
      ball(0.055, ink, sx * 0.14, 0.04, 0.33, head);
      ball(0.02, white, sx * 0.12, 0.08, 0.36, head);
      for (const dy of [-0.04, 0.03]) { const wh = box(0.32, 0.015, 0.015, ink, sx * 0.34, dy - 0.06, 0.24, head); wh.rotation.z = sx * dy * 3; }
    }
    ball(0.05, mat('#ff6b8b'), 0, -0.06, 0.34, head);
    const smile = new T.Mesh(new T.TorusGeometry(0.07, 0.015, 6, 12, Math.PI), ink);
    smile.position.set(0, -0.12, 0.32);
    smile.rotation.z = Math.PI;
    head.add(smile);
    // a party hat with a pom-pom
    const hat = new T.Mesh(new T.ConeGeometry(0.15, 0.36, 14), mat(A.HAT_COLORS[hue % 4], { roughness: 0.5 }));
    hat.position.set(0.08, 0.42, 0);
    hat.rotation.z = -0.25;
    head.add(hat);
    ball(0.06, white, 0.13, 0.6, 0, head);
    const legs = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const l = new T.Group();
      l.position.set(sx * 0.22, 0.25, sz * 0.13);
      body.add(l);
      ball(0.1, sx > 0 ? fur : fur, 0, -0.12, 0.02, l).scale.set(1, 0.8, 1.2);
      legs.push(l);
    }
    const tail = new T.Group();
    tail.position.set(-0.4, 0.45, -0.1);
    body.add(tail);
    let prev = tail;
    const tailSegs = [];
    for (let i = 0; i < 5; i++) {
      const s = new T.Group();
      s.position.set(i ? -0.12 : 0, i ? 0.03 : 0, 0);
      s.rotation.z = -0.35;
      prev.add(s);
      ball(0.07 - i * 0.004, i === 4 ? white : fur, -0.06, 0, 0, s);
      tailSegs.push(s);
      prev = s;
    }
    const bubble = new T.Mesh(new T.SphereGeometry(0.85, 20, 14), new T.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.2, depthWrite: false }));
    bubble.position.y = 0.65;
    bubble.visible = false;
    g.add(bubble);
    g.userData = { body, head, legs, tail, tailSegs, bubble, hue };
    return g;
  };

  // ---------- the bubble wave ----------
  A.wave = function () {
    const g = new T.Group();
    const m = new T.MeshStandardMaterial({ color: '#bff3ff', emissive: '#9fe8ff', emissiveIntensity: 0.4, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false });
    const bs = [];
    for (let i = 0; i < 12; i++) {
      const b = new T.Mesh(new T.SphereGeometry(0.2 + (i % 3) * 0.1, 12, 10), m);
      b.position.set((i % 2) * 0.35 - 0.2, 0.25 + (i * 0.19) % 2.2, ((i * 0.7) % 1.8) - 0.6);
      g.add(b);
      bs.push(b);
    }
    const sp = A.emoji('💨', 1.2);
    sp.position.set(0, 1.1, 0.6);
    g.add(sp);
    g.userData = { bs, sp };
    return g;
  };

  // ---------- a little cloud for the brother ----------
  A.cloud = function () {
    const g = new T.Group();
    const m = new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#dff4ff', emissiveIntensity: 0.45, roughness: 0.8 });
    [[-0.8, 0, 0.42], [-0.25, 0.12, 0.55], [0.35, 0.08, 0.5], [0.85, -0.02, 0.4], [0.05, -0.1, 0.5]].forEach(([x, y, r]) => {
      const s = new T.Mesh(new T.SphereGeometry(r, 14, 10), m);
      s.position.set(x, y - 0.3, 0);
      s.scale.set(1, 0.7, 0.9);
      g.add(s);
    });
    return g;
  };

  // ---------- confetti: one instanced mesh of little paper squares (from TT Barrel Climb by way of TT Pipe Bonk) ----------
  A.confetti = function (scene, max) {
    max = max || 500;
    const geo = new T.PlaneGeometry(0.16, 0.1);
    const im = new T.InstancedMesh(geo, new T.MeshBasicMaterial({ side: T.DoubleSide }), max);
    im.instanceMatrix.setUsage(T.DynamicDrawUsage);
    im.frustumCulled = false;
    scene.add(im);
    const ps = [];
    const col = new T.Color(), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(1, 1, 1), v = new T.Vector3();
    const COLS = ['#ff3d7f', '#ffd400', '#18d4ff', '#7dff5a', '#ff8a1f', '#c77dff', '#ffffff'];
    for (let i = 0; i < max; i++) { im.setColorAt(i, col.set(COLS[i % COLS.length])); m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); }
    let next = 0;
    return {
      burst(x, y, z, n, power, colors) {
        for (let i = 0; i < n; i++) {
          const k = next++ % max;
          const a = Math.random() * Math.PI * 2, sp = (0.4 + Math.random()) * (power || 4);
          ps[k] = { x, y, z: z || 0.5, vx: Math.cos(a) * sp, vy: Math.abs(Math.sin(a)) * sp + 1.5, vz: (Math.random() - 0.3) * 2, rx: Math.random() * 6, ry: Math.random() * 6, life: 1.6 + Math.random() * 1.2 };
          im.setColorAt(k, col.set(colors ? colors[i % colors.length] : COLS[k % COLS.length]));
        }
        im.instanceColor.needsUpdate = true;
      },
      rain(x0, x1, y, n) {
        for (let i = 0; i < n; i++) {
          const k = next++ % max;
          ps[k] = { x: x0 + Math.random() * (x1 - x0), y: y + Math.random() * 3, z: 0.6 + Math.random(), vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random(), vz: 0, rx: Math.random() * 6, ry: Math.random() * 6, life: 4 + Math.random() * 2 };
          im.setColorAt(k, col.set(COLS[k % COLS.length]));
        }
        im.instanceColor.needsUpdate = true;
      },
      update(dt) {
        for (let k = 0; k < max; k++) {
          const p = ps[k];
          if (!p) continue;
          p.life -= dt;
          if (p.life <= 0) { ps[k] = null; m4.makeScale(0, 0, 0); im.setMatrixAt(k, m4); continue; }
          p.vy -= 6 * dt;
          p.vx *= 1 - 1.2 * dt;
          p.vy = Math.max(p.vy, -2.2);
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          p.rx += dt * 7; p.ry += dt * 5;
          q.setFromEuler(e.set(p.rx, p.ry, 0));
          s.setScalar(Math.min(1, p.life * 2));
          m4.compose(v.set(p.x, p.y, p.z), q, s);
          im.setMatrixAt(k, m4);
        }
        im.instanceMatrix.needsUpdate = true;
      },
      clear() { for (let k = 0; k < max; k++) if (ps[k]) { ps[k] = null; m4.makeScale(0, 0, 0); im.setMatrixAt(k, m4); } im.instanceMatrix.needsUpdate = true; },
    };
  };

  // ---------- spinning stars over a dizzy head, emoji sprites ----------
  A.stars = function () {
    const g = new T.Group();
    const tex = G.emojiTexture('⭐');
    for (let i = 0; i < 5; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: false }));
      s.scale.set(0.3, 0.3, 1);
      g.add(s);
    }
    g.userData.spin = (t) => g.children.forEach((s, i) => { const a = t * 5 + (i / 5) * Math.PI * 2; s.position.set(Math.cos(a) * 0.42, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.42); });
    return g;
  };
  A.emoji = function (e, size) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture(e), depthTest: false }));
    s.scale.set(size || 0.6, size || 0.6, 1);
    s.renderOrder = 5;
    s.userData.e = e;
    return s;
  };
  A.setEmoji = function (s, e) {
    if (s.userData.e === e) return;
    s.material.map = G.emojiTexture(e);
    s.material.needsUpdate = true;
    s.userData.e = e;
  };
})();
