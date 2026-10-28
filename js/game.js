/* TT Mouse Mansion: the page. The Three.js scene with a fixed arcade camera, the HUD and screens, keys and touch, the
   brother who pops in and opens every door, the celebrations, and the window.game test hooks.
   The rules are js/sim.js (fixed 1/60 s steps); the 3D things are js/art.js; sounds are js/sfx.js. */
(function () {
  'use strict';
  const T = THREE, S = MM.sim, A = MM.art, SFX = MM.sfx, LV = MM.levels;
  const $ = (id) => document.getElementById(id);
  const PI = Math.PI, DT = S.DT;
  const KEY = 'mouseMansionTT.v1';
  const NAME = (id) => (Kit.roster.get(id) || { name: id.toUpperCase() }).name;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const SCALE = 0.56; // the kit's people are 2 m tall; the mice here are about 1.1 m
  const CAT_SCALE = 0.86;
  const TOY_E = { bear: '🧸', robot: '🤖', train: '🚂', drum: '🥁', kite: '🪁' };
  const FRIENDS = { easy: [['foxy', 6000], ['froggy', 3000]], normal: [['foxy', 12000], ['froggy', 7000]] };
  const Z_MOUSE = 0.35, Z_CAT = 0.1;

  const store = {
    d: {},
    load() {
      try { this.d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { this.d = {}; }
      this.d.top = this.d.top || {};
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) { /* private mode: fine */ } },
    table(level) {
      const t = (this.d.top[level] || []).slice();
      for (const [who, score] of FRIENDS[level]) if (!t.some((r) => r.who === who && r.cpu)) t.push({ who, score, cpu: true });
      return t.sort((a, b) => b.score - a.score).slice(0, 6);
    },
    add(level, who, score) {
      if (!score) return null;
      const row = { who, score, at: Date.now() + Math.random() };
      const mine = (this.d.top[level] || []).concat([row]).sort((a, b) => b.score - a.score).slice(0, 5);
      this.d.top[level] = mine;
      this.save();
      return mine.includes(row) ? row : null;
    },
  };

  const G = {
    screen: 'loading', w: null, demo: false, paused: false, hold: false, autoPause: true,
    keys: {}, taps: [{}, {}], touch: [{ l: 0, r: 0 }, { l: 0, r: 0 }], actBuf: [0, 0], acc: 0, time: 0,
    players: 1, who: 'teddy', level: 'easy', sab: null, botInp: null, botK: 0,
    scene2: null, overT: 0, newRows: [], frame: 0, k: 1, landT: [9, 9, 9, 9], hatchT: [9, 9, 9], cheerT: 0,
  };
  let renderer, scene, cam, confetti, treat, last = 0;
  const people = {};
  let portraits = {};
  const tramps = [], doorMs = [], toyMs = new Map(), catMs = new Map(), waveMs = [];
  const catPool = [[], [], [], []];
  const props = {}; // per brother: stars, ball, peace, glow, bubble, hearts
  const v3 = new T.Vector3();
  const mouseLook = (id) => Object.assign({}, Kit.roster.get(id).look, { mouse: true });

  // ---------- start-up ----------
  function boot() {
    renderer = new T.WebGLRenderer({ canvas: $('game'), antialias: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(2, Math.max(1, devicePixelRatio || 1)));
    scene = new T.Scene();
    scene.background = new T.Color('#9fd8ff');
    cam = new T.PerspectiveCamera(30, 1, 1, 400);
    scene.add(new T.HemisphereLight('#ffffff', '#c9b6f0', 0.85));
    const sun = new T.DirectionalLight('#fff4dd', 0.75);
    sun.position.set(-8, 20, 30);
    scene.add(sun);
    A.mansion(scene);
    A.floors(scene);
    for (let k = 0; k < 4; k++) {
      const t = A.trampoline();
      t.position.set(LV.SX[k], LV.TRAMP_Y, 0);
      scene.add(t);
      tramps.push(t);
    }
    confetti = A.confetti(scene, 700);
    for (const id of ['teddy', 'tommy', 'foxy', 'froggy']) {
      const r = Kit.roster.get(id);
      const mouse = id === 'teddy' || id === 'tommy';
      const p = Kit.people.build(mouse ? mouseLook(id) : r.look);
      p.root.scale.setScalar(SCALE * (mouse ? 1 : 0.9));
      p.root.visible = false;
      scene.add(p.root);
      people[id] = p;
    }
    for (const id of ['teddy', 'tommy']) {
      const o = (props[id] = {});
      o.stars = A.stars();
      o.ball = A.emoji('🏀', 0.4);
      o.peace = A.emoji('✌️', 0.45);
      o.hearts = A.emoji('💕', 0.7);
      o.glow = new T.Sprite(new T.SpriteMaterial({ map: Kit.gfx.glowTexture(), color: '#fff2a8', transparent: true, opacity: 0.55, depthWrite: false }));
      o.glow.scale.set(2, 2.4, 1);
      o.bubble = new T.Mesh(new T.SphereGeometry(1, 20, 14), new T.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.2, depthWrite: false }));
      o.bubble.scale.setScalar(0.85);
      o.mini = A.cloud();
      o.mini.scale.setScalar(0.5);
      for (const k of ['stars', 'ball', 'peace', 'hearts', 'glow', 'bubble', 'mini']) { o[k].visible = false; scene.add(o[k]); }
    }
    treat = A.emoji('🍦', 0.5);
    treat.visible = false;
    scene.add(treat);
    portraits = Kit.portraits(['teddy', 'tommy', 'foxy', 'froggy'].map((id) => Object.assign({}, Kit.roster.get(id), id === 'teddy' || id === 'tommy' ? { look: mouseLook(id) } : {})), { size: 128 });
    store.load();
    const o = store.d.opts || {};
    if (o.players === 2) G.players = 2;
    if (o.who === 'tommy') G.who = 'tommy';
    if (o.level === 'normal') G.level = 'normal';
    setupUI();
    addEventListener('resize', fit);
    showTitle();
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
  }

  // ---------- the fixed arcade camera: the whole mansion fits the free part of the page ----------
  const BOX = { x0: -11.9, x1: 11.9, y0: -3.0, y1: 12.4 };
  function fit() {
    const W = innerWidth, H = innerHeight;
    renderer.setSize(W, H, false);
    const short = H <= 460, narrow = W <= 520;
    const top = short ? 48 : narrow ? 56 : 66;
    const bw = BOX.x1 - BOX.x0, bh = BOX.y1 - BOX.y0;
    const kOf = (m) => Math.min(Math.max(50, W - m[0] - m[1]) / bw, Math.max(50, H - m[2] - m[3]) / bh);
    let m = [58, 10, top, 6];
    if (document.body.classList.contains('touch') && G.screen === 'play') {
      // the pads sit in the bottom corners: keep the mansion beside them or above them, whichever is bigger
      const box = (sel) => {
        const rs = [...document.querySelectorAll(sel + ' button')].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect());
        return rs.length ? { left: Math.min(...rs.map((r) => r.left)), right: Math.max(...rs.map((r) => r.right)), top: Math.min(...rs.map((r) => r.top)) } : { left: W, right: 0, top: H };
      };
      const lp = box('.lpad'), rp = box('.rpad');
      const side = [Math.max(58, lp.right + 8), Math.max(10, W - rp.left + 8), top, 6];
      const below = [58, 10, top, Math.max(H - lp.top, H - rp.top) + 8];
      m = kOf(side) >= kOf(below) ? side : below;
    }
    const k = kOf(m);
    const sw = W - m[0] - m[1], sh = H - m[2] - m[3];
    const viewH = H / k;
    const D = viewH / 2 / Math.tan((cam.fov * PI) / 360);
    const offX = m[0] + sw / 2 - W / 2, offY = m[2] + sh / 2 - H / 2;
    const cx = (BOX.x0 + BOX.x1) / 2 - offX / k, cy = (BOX.y0 + BOX.y1) / 2 + offY / k;
    cam.aspect = W / H;
    cam.position.set(cx, cy, D);
    cam.near = Math.max(1, D * 0.4);
    cam.far = D + 120;
    cam.lookAt(cx, cy, 0);
    cam.updateProjectionMatrix();
    G.k = k;
    G.margins = m;
  }
  function toScreen(x, y, z) {
    v3.set(x, y, z || 0).project(cam);
    return [(v3.x * 0.5 + 0.5) * innerWidth, (-v3.y * 0.5 + 0.5) * innerHeight];
  }

  // ---------- games ----------
  function newWorld(demo) {
    const who = demo ? ['teddy'] : G.players === 2 ? ['teddy', 'tommy'] : [G.who];
    const w = S.create({ level: demo ? 'easy' : G.level, players: who, seed: (Math.random() * 1e9) | 0, buddyFor: (id) => Kit.roster.buddyFor(id), sabotage: G.sab === 'stuckShaft' && !demo ? G.sab : null });
    if (demo) w.players[0].safe = true;
    return w;
  }
  function play() {
    Kit.sound.init();
    store.d.opts = { players: G.players, who: G.who, level: G.level };
    store.save();
    G.w = newWorld(false);
    G.demo = false;
    G.paused = false;
    G.overT = 0;
    G.scene2 = null;
    resetInput();
    G.acc = 0;
    confetti.clear();
    clearPops();
    document.body.classList.toggle('two', G.w.two);
    showScreen('play');
    setupBud();
    big(stageName(), 'GRAB EVERY TOY!');
    Kit.sound.music('play');
  }
  function resetInput() {
    G.keys = {};
    G.taps = [{}, {}];
    G.touch = [{ l: 0, r: 0 }, { l: 0, r: 0 }];
    G.actBuf = [0, 0];
    document.querySelectorAll('#touch .down').forEach((b) => b.classList.remove('down'));
  }
  function setupBud() {
    const w = G.w;
    const who = w.two ? null : Kit.roster.buddyFor(w.players[0].who);
    const img = w.two ? portraits.tommy : portraits[who];
    $('budBtn').querySelector('img').src = img || '';
    document.querySelector('.tb.call img').src = img || '';
    setText($('budLbl'), w.two ? 'HIGH FIVE' : `CALL ${NAME(who)}`);
    setText(document.querySelector('.tb.call small'), w.two ? '✋' : 'CALL');
  }
  function call() {
    if (!G.w || G.demo || G.screen !== 'play' || G.paused) return false;
    const ok = S.call(G.w);
    if (ok) handleEvents(G.w.events.splice(0));
    return ok;
  }
  const stageName = () => (G.w ? `MANSION ${G.w.li + 1}` : '');

  // ---------- screens ----------
  function showScreen(id) {
    G.screen = id;
    for (const s of ['title', 'pause', 'results']) $(s).classList.toggle('hidden', s !== id);
    $('hud').classList.toggle('hidden', id === 'title' || id === 'results');
    $('touch').classList.toggle('hidden', id !== 'play');
    $('menuMute').classList.toggle('hidden', id === 'play' || id === 'pause');
    document.body.classList.toggle('title', id === 'title');
    if (id !== 'play' && id !== 'pause') { $('bigmsg').classList.remove('show'); $('toast').classList.remove('show'); clearPops(); }
    fit();
  }
  function showTitle() {
    G.w = newWorld(true);
    G.demo = true;
    G.paused = false;
    G.scene2 = null;
    confetti.clear();
    clearPops();
    document.body.classList.remove('two');
    showScreen('title');
    refreshTitle();
    Kit.sound.music('title');
  }
  function refreshTitle() {
    document.querySelectorAll('[data-players]').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.players === G.players)));
    document.querySelectorAll('[data-who]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.who === G.who)));
    document.querySelectorAll('[data-level]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.level === G.level)));
    $('whoRow').classList.toggle('off', G.players === 2);
    const top = store.table(G.level)[0];
    setText($('titleHi'), `HI-SCORE ${fmt(top.score)} · ${NAME(top.who)}`);
  }
  function setOpt(k, v) {
    G[k] = v;
    SFX.click();
    refreshTitle();
  }
  function pause() {
    if (G.screen !== 'play' || G.paused) return;
    G.paused = true;
    showScreen('pause');
    Kit.sound.music('pause');
  }
  function resume() {
    if (!G.paused) return;
    G.paused = false;
    resetInput();
    showScreen('play');
    Kit.sound.music('play');
  }
  function showResults() {
    const w = G.w;
    const ps = w.players;
    const bestScore = Math.max(...ps.map((p) => p.score));
    G.newRows = ps.map((p) => store.add(w.level, p.who, p.score)).filter(Boolean);
    setText($('resTitle'), ps.length === 2 ? 'GREAT TEAMWORK!' : 'GREAT BOUNCING!');
    const pl = ps[0];
    setText($('resSub'), ps.length === 2 ? `${NAME(ps[0].who)} ${fmt(ps[0].score)} · ${NAME(ps[1].who)} ${fmt(ps[1].score)}` : `${fmt(pl.score)} points · mansion ${w.li + 1}`);
    const rows = store.table(w.level);
    const tb = $('resTable');
    tb.innerHTML = '';
    const cap = document.createElement('caption');
    cap.textContent = w.level === 'easy' ? '🐣 TOP MICE' : '🔥 TOP MICE';
    tb.appendChild(cap);
    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      if (G.newRows.some((n) => n.at === r.at && n.who === r.who && n.score === r.score)) tr.className = 'me';
      tr.innerHTML = `<td class="rk">${i + 1}</td><td class="who"><img alt="" src="${portraits[r.who] || ''}"><span>${NAME(r.who)}</span></td><td class="pts">${fmt(r.score)}</td>`;
      tb.appendChild(tr);
    });
    const best = $('resBest');
    const isTop = G.newRows.some((n) => rows[0] && n.score === rows[0].score && n.who === rows[0].who && n.at === rows[0].at);
    setText(best, isTop ? '⭐ NEW HI-SCORE!' : G.newRows.length ? '⭐ ON THE BOARD!' : '');
    best.classList.toggle('new', G.newRows.length > 0);
    // both brothers celebrate, the top scorer in the middle
    const order = ps.slice().sort((a, b) => b.score - a.score).map((p) => p.who);
    G.scene2 = { kind: 'win', who: order, t: 0, best: bestScore };
    showScreen('results');
    Kit.sound.music('over');
  }

  // ---------- keys and touch ----------
  // 1 player: every walk and door key moves him. 2 players: Teddy A D W, Tommy ← → ↑.
  const ONE = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
  const ACT1 = ['Space', 'ArrowUp', 'KeyW', 'KeyJ', 'KeyK', 'KeyX', 'ArrowDown', 'KeyS'];
  const TWO = { KeyA: [0, 'l'], KeyD: [0, 'r'], ArrowLeft: [1, 'l'], ArrowRight: [1, 'r'] };
  const ACT2 = { KeyW: 0, Space: 0, KeyF: 0, KeyS: 0, ArrowUp: 1, ArrowDown: 1, KeyL: 1, Slash: 1 };
  function held(i, d) {
    const two = G.w && G.w.two;
    for (const c in G.keys) {
      if (!G.keys[c]) continue;
      if (two ? TWO[c] && TWO[c][0] === i && TWO[c][1] === d : i === 0 && ONE[c] === d) return true;
    }
    return !!(G.touch[i][d] || G.taps[i][d]);
  }
  function readInput() {
    const out = [0, 1].map((i) => {
      let lr = (held(i, 'r') ? 1 : 0) - (held(i, 'l') ? 1 : 0);
      if (G.sab === 'mirror') lr = -lr; // the play check's own sabotages
      const act = G.actBuf[i] > 0;
      G.actBuf[i] = 0;
      return { lr, act };
    });
    G.taps = [{}, {}];
    return out;
  }
  function actKey(c) {
    if (G.w && G.w.two) return c in ACT2 ? ACT2[c] : -1;
    return ACT1.includes(c) ? 0 : -1;
  }
  function setupUI() {
    const logo = () => {
      const zh = Kit.lang.is('zh');
      $('logoText').textContent = zh ? MM.ZH : MM.TITLE;
      $('logoSub').textContent = zh ? MM.TITLE : '';
    };
    $('tagline').textContent = MM.TAGLINE;
    logo();
    Kit.lang.onChange(logo);
    document.querySelectorAll('[data-who] img').forEach((im) => (im.src = portraits[im.parentNode.dataset.who] || ''));
    document.querySelectorAll('[data-players]').forEach((b) => b.addEventListener('click', () => setOpt('players', +b.dataset.players)));
    document.querySelectorAll('[data-who]').forEach((b) => b.addEventListener('click', () => setOpt('who', b.dataset.who)));
    document.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => setOpt('level', b.dataset.level)));
    $('startBtn').addEventListener('click', play);
    $('pauseBtn').addEventListener('click', pause);
    $('resumeBtn').addEventListener('click', resume);
    $('quitBtn').addEventListener('click', showTitle);
    $('againBtn').addEventListener('click', play);
    $('menuBtn').addEventListener('click', showTitle);
    $('budBtn').addEventListener('click', call);
    const syncMute = () => document.querySelectorAll('.muteBtn').forEach((b) => (b.textContent = Kit.sound.isMuted() ? '🔇' : '🔊'));
    document.querySelectorAll('.muteBtn').forEach((b) => b.addEventListener('click', () => { Kit.sound.init(); Kit.sound.toggleMute(); syncMute(); }));
    Kit.sound.onMute(syncMute);
    syncMute();

    addEventListener('pointerdown', (e) => {
      Kit.sound.init();
      if (e.pointerType === 'touch' && !document.body.classList.contains('touch')) {
        document.body.classList.add('touch');
        fit();
      }
    }, true);
    if (matchMedia('(hover: none) and (pointer: coarse)').matches || /[?&]touch=1/.test(location.search)) document.body.classList.add('touch');

    addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      Kit.sound.init();
      const c = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) e.preventDefault();
      if (c === 'KeyM' && !e.repeat) { Kit.sound.toggleMute(); syncMute(); return; }
      if (G.screen === 'title') {
        if (e.repeat) return;
        if (c === 'Digit1') setOpt('players', 1);
        else if (c === 'Digit2') setOpt('players', 2);
        else if (c === 'KeyE') setOpt('level', 'easy');
        else if (c === 'KeyN') setOpt('level', 'normal');
        else if ((c === 'KeyC' || c === 'ArrowLeft' || c === 'ArrowRight') && G.players === 1) setOpt('who', G.who === 'teddy' ? 'tommy' : 'teddy');
        else if (c === 'Enter' || c === 'Space') play();
        return;
      }
      if (G.screen === 'results') {
        if (e.repeat) return;
        if (c === 'Enter' || c === 'Space') play();
        else if (c === 'Escape' || c === 'KeyQ') showTitle();
        return;
      }
      if (G.paused) {
        if (e.repeat) return;
        if (c === 'KeyP' || c === 'Escape' || c === 'Space' || c === 'Enter') resume();
        else if (c === 'KeyQ') showTitle();
        return;
      }
      if (G.screen === 'play') {
        if ((c === 'KeyP' || c === 'Escape') && !e.repeat) return pause();
        if ((c === 'KeyT' || (c === 'Enter' && !G.w.two) || c === 'NumpadEnter') && !e.repeat) { call(); return; }
        const j = actKey(c);
        if (j >= 0) { if (!e.repeat) G.actBuf[j] = 1; return; }
        G.keys[c] = true;
        // a tap shorter than a frame still moves
        if (G.w.two) { if (TWO[c]) G.taps[TWO[c][0]][TWO[c][1]] = true; } else if (ONE[c]) G.taps[0][ONE[c]] = true;
      }
    });
    addEventListener('keyup', (e) => { G.keys[e.code] = false; });
    addEventListener('blur', () => { G.keys = {}; G.touch = [{ l: 0, r: 0 }, { l: 0, r: 0 }]; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && G.autoPause && G.screen === 'play' && !G.paused) pause();
      if (document.hidden) Kit.sound.suspend();
      else Kit.sound.resume();
    });

    // touch: ◀ ▶ 🚪 for each brother, and the brother's face
    const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch (err) { /* a test's pointer: fine */ } };
    document.querySelectorAll('#touch [data-a]').forEach((b) => {
      const a = b.dataset.a, i = +(b.dataset.p || 0);
      const on = (v) => {
        b.classList.toggle('down', v);
        if (a === 'call') { if (v) call(); return; }
        if (a === 'j') { if (v) G.actBuf[i] = 1; return; }
        G.touch[i][a] = v ? 1 : 0;
        if (v) G.taps[i][a] = true;
      };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); capture(b, e); on(true); });
      b.addEventListener('pointerup', () => on(false));
      b.addEventListener('pointercancel', () => on(false));
      b.addEventListener('lostpointercapture', () => on(false));
    });
  }

  // ---------- each frame ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0, (now - (last || now)) / 1000));
    last = now;
    if (!G.hold) advance(dt);
    draw();
  }
  function advance(dt) {
    G.time += dt;
    G.frame++;
    const w = G.w;
    if (!w) return;
    const frozen = G.paused || G.screen === 'pause';
    if (!frozen) {
      G.acc = Math.min(G.acc + dt, 0.25);
      while (G.acc >= DT - 1e-9) {
        G.acc -= DT;
        tick();
      }
      visuals(dt);
    }
  }
  function tick() {
    const w = G.w;
    let inp;
    if (G.demo) {
      if (G.botK++ % 3 === 0 || !G.botInp) G.botInp = MM.bot.decide(w, 0);
      else G.botInp = { lr: G.botInp.lr, act: false };
      inp = [G.botInp];
    } else if (G.screen === 'play') inp = readInput();
    else inp = null;
    S.step(w, inp);
    handleEvents(w.events);
    if (G.demo) {
      if (w.phase === 'over' || w.t > 240) G.w = newWorld(true);
    } else if (w.phase === 'over' && G.screen === 'play') {
      G.overT += DT;
      if (G.overT > 2.2) showResults();
    }
  }

  // ---------- what the rules said happened ----------
  function handleEvents(evs) {
    const w = G.w;
    const loud = !G.demo;
    const snd = (f, ...a) => { if (loud) f(...a); };
    const P = (i) => w.players[i] || w.players[0];
    for (const e of evs) {
      switch (e.type) {
        case 'go': snd(SFX.go); big('GO!', 'GRAB EVERY TOY!'); break;
        case 'stage': big(stageName(), 'GRAB EVERY TOY!'); break;
        case 'drop': if (e.who === 'mouse') snd(SFX.drop); break;
        case 'bounce':
          G.landT[e.sh] = 0;
          if (e.worn >= S.WEAR) { snd(SFX.worn); pop(e.x, LV.TRAMP_Y + 1.6, 'LAST BOUNCE!', 'ouch'); }
          else snd(SFX.boing, e.n);
          break;
        case 'catBounce': G.landT[e.sh] = 0; break;
        case 'tear': snd(SFX.tear); pop(e.x, LV.TRAMP_Y + 1.4, 'RIIIP! PLOP!', 'ouch'); break;
        case 'off': snd(SFX.off); break;
        case 'doorOpen': snd(SFX.doorOpen); break;
        case 'doorClose': snd(SFX.doorClose); break;
        case 'bonk': snd(SFX.bonk); pop(e.x, e.y + 1.5, 'BONK! +100', 'big'); break;
        case 'wave': snd(SFX.wave); pop(e.x + e.dir * 1.5, LV.FLOOR_Y[e.f] + 2.2, 'BUBBLE WAVE!', 'cool'); break;
        case 'swept': snd(SFX.swept, e.pts / 200); if (!e.buddy) pop(e.x, e.y + 1.6, `WHEEE! +${fmt(e.pts)}`, 'cool'); confetti.burst(e.x, e.y + 0.8, 0.4, 10, 2.5, ['#bff3ff', '#ffffff', '#ff8fb1']); break;
        case 'toy': snd(SFX.toy); pop(e.x, e.y + 1.4, `${TOY_E[e.kind]} +${S.SCORE.toy}`); confetti.burst(e.x, e.y + 0.6, 0.4, 14, 2.5, ['#ffd400', '#fff3a0', '#ff8fb1']); break;
        case 'pair': snd(SFX.pair); pop(e.x, e.y + 2.2, `PAIR! ${TOY_E[e.kind]}${TOY_E[e.kind]} +${fmt(S.SCORE.pair)}`, 'big'); confetti.burst(e.x, e.y + 1, 0.5, 30, 4); G.cheerT = 1.4; break;
        case 'catIn': snd(SFX.catIn); { const h = A.hatches.findIndex((q) => Math.abs(q.position.x - e.x) < 0.2); if (h >= 0) G.hatchT[h] = 0; } break;
        case 'hug': snd(SFX.hug); pop(e.x, e.y + 1.6, 'HUGGY HUG!', 'ouch'); break;
        case 'respawn': snd(SFX.respawn); break;
        case 'buddyIn': snd(SFX.buddy); confetti.burst(P(0).x - P(0).face, P(0).y + 1, 0.6, 16, 2.5, ['#ffffff', '#bff3ff']); break;
        case 'buddyMore': pop(P(0).x, P(0).y + 2.4, 'ONE MORE TIME!', 'cool'); break;
        case 'treat': snd(SFX.treat); pop(P(0).x, P(0).y + 1.7, `${e.e} +100`); break;
        case 'buddyDoors':
          snd(SFX.doorsAll);
          toast(`${NAME(e.who)} SAYS: DOORS OPEN!`);
          for (const d of w.doors) confetti.burst(d.x, LV.FLOOR_Y[d.f] + 1.4, 0.4, 8, 2.5, ['#ffd400', '#ffffff', '#18d4ff']);
          break;
        case 'hi5': snd(SFX.hi5); pop((P(0).x + P(1).x) / 2, Math.max(P(0).y, P(1).y) + 1.9, 'HIGH FIVE! ✋ +50', 'big'); confetti.burst(P(0).x, P(0).y + 1.2, 0.6, 20, 3.5); confetti.burst(P(1).x, P(1).y + 1.2, 0.6, 20, 3.5); break;
        case 'extraLife': snd(SFX.life); pop(P(e.i).x, P(e.i).y + 1.8, 'EXTRA LIFE!', 'big'); break;
        case 'clear':
          snd(SFX.clear);
          big('MANSION CLEAR!', 'EVERY TOY FOUND!');
          for (const p of w.players) if (!p.out) confetti.burst(p.x, p.y + 1.2, 0.6, 40, 5);
          confetti.rain(-10, 10, 12, 60);
          break;
        case 'out': if (w.two) toast(`${NAME(e.who)} IS OUT OF LIVES`); break;
        case 'over': snd(SFX.gameOver); big('GAME OVER'); break;
      }
    }
  }

  // ---------- pops, toasts, big words (page text, so 中文 works by itself) ----------
  function pop(x, y, text, cls) {
    if (G.demo) return;
    const [sx, sy] = toScreen(x, y, 0.5);
    const d = document.createElement('div');
    d.className = 'pop' + (cls ? ' ' + cls : '');
    d.textContent = text;
    d.style.left = Math.max(40, Math.min(innerWidth - 40, sx)) + 'px';
    d.style.top = Math.max(60, sy) + 'px';
    $('pops').appendChild(d);
    setTimeout(() => d.remove(), 1300);
  }
  function clearPops() { $('pops').innerHTML = ''; }
  let toastTimer = 0;
  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  let bigTimer = 0;
  function big(text, small) {
    if (G.demo) return;
    const b = $('bigmsg');
    b.innerHTML = '';
    b.appendChild(document.createTextNode(text));
    if (small) { const s = document.createElement('small'); s.textContent = small; b.appendChild(s); }
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(bigTimer);
    bigTimer = setTimeout(() => b.classList.remove('show'), 1400);
  }
  function setText(el, s) {
    if (!el || el._t === s) return;
    el._t = s;
    el.textContent = s;
  }

  // ---------- drawing the world ----------
  const FACE_R = -1.95, FACE_L = 1.95; // side-on, a little toward the camera
  const turn = (cur, want, k) => cur + (((want - cur + PI * 3) % (PI * 2)) - PI) * k;
  function signature(who, n) {
    const sig = (Kit.roster.get(who) || {}).signature || ['wave'];
    return sig[(n || 0) % sig.length];
  }
  function visuals(dt) {
    const k = 1 - Math.exp(-16 * dt);
    G.cheerT = Math.max(0, G.cheerT - dt);
    if (G.scene2) G.scene2.t += dt;
    trampolines(dt);
    doors(dt, k);
    toys(dt);
    cats(dt, k);
    waves(dt);
    hatches(dt);
    brothers(dt, k);
    buddy(dt, k);
    spectators(dt, k);
    confetti.update(dt);
    const sc = G.scene2;
    if (sc && sc.kind === 'win' && Math.floor(sc.t * 2) !== Math.floor((sc.t - dt) * 2)) confetti.rain(-7, 7, 11, 30);
    hud();
  }

  function trampolines(dt) {
    const w = G.w;
    for (let k = 0; k < 4; k++) {
      const t = tramps[k], u = t.userData;
      G.landT[k] += dt;
      // how worn: the most bounces in a row of a mouse in this shaft (EASY: always fresh)
      let n = 0;
      for (const p of w.players) if (!p.out && p.mode === 'shaft' && p.sh === k) n = Math.max(n, p.bounces);
      const torn = w.tramp[k].torn > 0;
      u.matM.color.set(A.WEAR_COLORS[w.cfg.wear ? Math.min(4, n) : 0]);
      u.mat.visible = !torn || w.tramp[k].torn < 0.4;
      u.patch.visible = torn && w.tramp[k].torn < 0.4;
      const lt = G.landT[k];
      const sq = lt < 0.35 ? Math.sin((lt / 0.35) * PI) * (1 - lt / 0.35) : 0;
      u.mat.position.y = -0.04 - sq * 0.35;
    }
  }
  function doors(dt, k) {
    const w = G.w;
    while (doorMs.length < w.doors.length) { const m = A.door(); scene.add(m); doorMs.push(m); }
    doorMs.forEach((m, i) => {
      const d = w.doors[i];
      m.visible = !!d;
      if (!d) return;
      const u = m.userData;
      m.position.set(d.x, LV.FLOOR_Y[d.f], 0);
      const want = d.open ? 1 : 0;
      u.open += (want - u.open) * Math.min(1, k * 1.6);
      if (d.t < 0.02) u.open = want ? 0.15 : 0.85; // a snappy swing
      u.pivot.rotation.y = d.swing * u.open * (PI / 2);
      const glow = d.glow ? 0.6 + Math.sin(G.time * 6) * 0.3 : 0;
      u.pm.emissiveIntensity = glow * 0.8;
      u.pm.color.set(d.glow ? '#ffe08a' : '#3fa9f5');
      u.glow.material.opacity = glow * 0.8;
      u.star.visible = d.glow;
      u.star.material.rotation = Math.sin(G.time * 3) * 0.4;
    });
  }
  function toys(dt) {
    const w = G.w;
    const seen = new Set();
    for (const t of w.toys) {
      const key = G.w.li + ':' + t.id;
      let m = toyMs.get(key);
      if (!m) { m = A.toy(t.kind); scene.add(m); toyMs.set(key, m); }
      seen.add(key);
      m.visible = !t.got && t.f < 4;
      if (!m.visible) continue;
      m.position.set(t.x, LV.FLOOR_Y[t.f] + 0.05 + Math.abs(Math.sin(G.time * 2.4 + t.id)) * 0.12, 0.25);
      m.userData.inner.rotation.y = Math.sin(G.time * 1.6 + t.id) * 0.6;
    }
    for (const [key, m] of toyMs) if (!seen.has(key)) { scene.remove(m); toyMs.delete(key); }
  }
  function cats(dt, k) {
    const w = G.w;
    const seen = new Set();
    for (const c of w.cats) {
      let m = catMs.get(c.id);
      if (!m) { m = catPool[c.hue].pop() || A.cat(c.hue); if (!m.parent) scene.add(m); catMs.set(c.id, m); m.userData.stars = m.userData.stars || A.stars(); m.add(m.userData.stars); }
      seen.add(c.id);
      const u = m.userData;
      m.visible = c.st !== 'away';
      u.bubble.visible = c.st === 'swept';
      u.stars.visible = c.st === 'stun';
      const t = G.time + c.id;
      let x = c.x, y = c.y, rz = 0, ry = c.dir * 0.75, sx = 1, sy = 1;
      const walking = c.st === 'walk' && w.phase === 'play';
      u.legs.forEach((l, i) => (l.rotation.x = walking ? Math.sin(t * 12 + i * 1.6) * 0.6 : 0));
      u.tailSegs.forEach((s, i) => (s.rotation.z = -0.35 + Math.sin(t * 4 + i * 0.7) * 0.18));
      u.body.position.y = walking ? Math.abs(Math.sin(t * 12)) * 0.06 : 0;
      if (c.st === 'shaft') { u.legs.forEach((l, i) => (l.rotation.x = (i % 2 ? 1 : -1) * 0.7)); ry = 0; }
      if (c.st === 'stun') { rz = Math.sin(t * 9) * 0.25; ry = 0; u.stars.position.set(0, 1.55, 0); u.stars.userData.spin(G.time); }
      if (c.st === 'swept') { rz = c.t2 * 9; ry = 0; y += 0.2; }
      if (c.st === 'hug') { ry = 0; sx = 1 + Math.sin(t * 14) * 0.08; sy = 1 - Math.sin(t * 14) * 0.08; }
      if (c.st === 'in') ry = 0;
      m.position.set(x, y, Z_CAT);
      m.rotation.y = turn(m.rotation.y, ry, Math.min(1, k));
      u.body.rotation.z = rz;
      u.bubble.rotation.z = rz * 0.2;
      m.scale.set(CAT_SCALE * sx, CAT_SCALE * sy, CAT_SCALE);
    }
    for (const [id, m] of catMs) if (!seen.has(id)) { m.visible = false; catMs.delete(id); catPool[m.userData.hue].push(m); }
  }
  function waves(dt) {
    const w = G.w;
    while (waveMs.length < w.waves.length) { const m = A.wave(); scene.add(m); waveMs.push(m); }
    waveMs.forEach((m, i) => {
      const wv = w.waves[i];
      m.visible = !!wv;
      if (!wv) return;
      m.position.set(wv.x, LV.FLOOR_Y[wv.f], 0.4);
      m.userData.bs.forEach((b, j) => (b.position.y = 0.25 + ((j * 0.19 + G.time * 1.2) % 2.2)));
      m.userData.sp.material.rotation = wv.dir > 0 ? 0 : PI;
    });
  }
  function hatches(dt) {
    A.hatches.forEach((h, i) => {
      G.hatchT[i] += dt;
      const o = G.hatchT[i] < 0.8 ? Math.sin((G.hatchT[i] / 0.8) * PI) : 0;
      h.userData.lid.position.y = o * 0.9;
    });
  }

  function brothers(dt, k) {
    const w = G.w, sc = G.scene2;
    const shown = new Set();
    for (const id of ['teddy', 'tommy']) for (const kk of ['stars', 'ball', 'peace', 'hearts', 'glow', 'bubble', 'mini']) props[id][kk].visible = false;
    if (sc && sc.kind === 'win') return winPose(sc, dt, k);
    for (const p of w.players) {
      if (p.out) continue;
      const P = people[p.who], o = props[p.who];
      shown.add(p.who);
      P.root.visible = true;
      let x = p.x, y = p.y, mode = 'stand', ph = 0, want = p.face > 0 ? FACE_R : FACE_L;
      const cheering = w.phase === 'clear';
      if (p.mode === 'ground') {
        if (p.walkT !== P.lastWalk && w.phase === 'play') { mode = 'run'; ph = p.walkT * 12; }
        P.lastWalk = p.walkT;
      } else if (p.mode === 'shaft') {
        mode = p.vdir > 0 ? 'jumpshot' : 'jump';
        want = PI;
        if (p.want) want = p.want > 0 ? FACE_R : FACE_L;
      }
      if (cheering && p.mode === 'ground') { mode = signature(p.who, w.li); ph = G.time * 8; want = PI; }
      if (w.buddy && w.buddy.kind === 'hi5' && w.buddy.t < 0.9) { mode = 'give'; want = p.i ? FACE_L : FACE_R; }
      if (p.mode === 'hug' || p.mode === 'plop') {
        // a cuddle (or a soft plop onto the pillow), then a bubble floats him back to the start
        const e = p.t, T1 = p.mode === 'hug' ? 0.8 : 0.9, T2 = p.mode === 'hug' ? S.HUG_T : S.PLOP_T;
        mode = p.mode === 'hug' ? 'wave' : 'fall';
        want = PI;
        if (e > T1) {
          const u = Math.min(1, (e - T1) / (T2 - T1));
          const tx = w.two ? (p.i ? 1.5 : -1.5) : -1.5;
          x = p.x + (tx - p.x) * u;
          y = p.y + (0 - p.y) * u + Math.sin(u * PI) * 1.4;
          o.bubble.visible = true;
          o.bubble.position.set(x, y + 0.55, Z_MOUSE + 0.2);
        } else if (p.mode === 'hug') {
          o.hearts.visible = true;
          o.hearts.position.set(x, y + 1.6 + e * 0.6, Z_MOUSE + 0.4);
        } else {
          o.stars.visible = true;
          P.head.getWorldPosition(v3);
          o.stars.position.set(v3.x, v3.y + 0.25, v3.z);
          o.stars.userData.spin(G.time);
        }
      }
      P.root.position.set(x, y, Z_MOUSE);
      P.root.scale.setScalar(SCALE);
      P.root.rotation.y = turn(P.root.rotation.y, want, Math.min(1, k * 1.5));
      Kit.people.pose(P, ph, mode, k);
      P.rig.position.y = 0;
      if (P.tail) P.tail.rotation.z = Math.sin(G.time * 5) * 0.3;
      if (cheering && (mode === 'jumpshot' || mode === 'peace')) sigProps(P, o, mode);
      if (p.inv > 0 && p.mode === 'ground') { o.glow.visible = true; o.glow.position.set(x, y + 0.6, Z_MOUSE - 0.1); o.glow.material.opacity = 0.35 + Math.sin(G.time * 10) * 0.15; }
    }
    for (const id of ['teddy', 'tommy']) if (!shown.has(id) && !(w.buddy && w.buddy.who === id)) people[id].root.visible = false;
  }
  function sigProps(P, o, mode) {
    if (mode === 'jumpshot') {
      P.root.position.y += Math.abs(Math.sin(G.time * 4)) * 0.4;
      o.ball.visible = true;
      Kit.people.handWorld(P, 1, v3);
      o.ball.position.set(v3.x, v3.y + 0.25 + Math.max(0, Math.sin(G.time * 4)) * 0.8, v3.z + 0.2);
    } else if (mode === 'peace') {
      o.peace.visible = true;
      P.head.getWorldPosition(v3);
      o.peace.position.set(v3.x + 0.45, v3.y + 0.3 + Math.sin(G.time * 5) * 0.06, v3.z + 0.3);
    }
  }
  function winPose(sc, dt, k) {
    // the brothers on the ground floor doing their signature moves, the top scorer in the middle
    const ids = sc.who;
    ids.forEach((id, i) => {
      const P = people[id];
      P.root.visible = true;
      P.root.position.set(ids.length === 2 ? (i ? 1.6 : -0.4) : 0, 0, 1.0);
      P.root.scale.setScalar(SCALE * (i ? 1 : 1.15));
      P.root.rotation.y = PI;
      const mode = signature(id, Math.floor(sc.t / 2.5));
      Kit.people.pose(P, G.time * 8, mode, k);
      P.rig.position.y = 0;
      sigProps(P, props[id], mode);
    });
    for (const id of ['teddy', 'tommy']) if (!ids.includes(id)) people[id].root.visible = false;
  }

  function buddy(dt, k) {
    const w = G.w, bd = w.buddy;
    treat.visible = false;
    if (!bd || bd.kind !== 'doors' || (G.scene2 && G.scene2.kind === 'win')) return;
    const p = w.players[0];
    const B = people[bd.who], o = props[bd.who];
    const r = Kit.roster.get(bd.who) || {};
    const s = SCALE * (r.buddyScale || 0.8);
    const t = bd.t;
    B.root.visible = true;
    const side = -(p.face || 1);
    const hx = Math.max(-10.6, Math.min(10.6, p.x + side * 1.0)), hy = p.y + 0.4;
    const mx = 0, my = LV.FLOOR_Y[2] + 0.4; // the middle of the mansion, where everyone can see him
    let x, y, mode, want = PI, grow = 1;
    if (t < S.B_GO && bd.done === 0) {
      x = hx; y = hy + Math.sin(G.time * 3) * 0.06;
      grow = Math.min(1, t * 5);
      mode = t < 0.55 ? signature(bd.who, bd.n) : 'give';
    } else if (t < S.B_OPEN) {
      // flies on his little cloud up to the top of the mansion
      const u = Math.min(1, (t - S.B_GO) / (S.B_OPEN - 0.15 - S.B_GO));
      const fx = bd.done ? mx : hx, fy = bd.done ? my : hy;
      x = fx + (mx - fx) * u;
      y = fy + (my - fy) * u + Math.sin(u * PI) * 1.0;
      mode = 'jump';
    } else {
      // arms up: every door flies open
      x = mx; y = my + Math.sin(G.time * 4) * 0.08;
      mode = bd.who === 'tommy' ? 'peace' : 'jumpshot';
      if (t > S.B_END - 0.25 && !bd.more) grow = Math.max(0.01, (S.B_END - t) / 0.25);
    }
    B.root.scale.setScalar(Math.max(0.01, s * grow));
    B.root.position.set(x, y, 0.9);
    B.root.rotation.y = turn(B.root.rotation.y, want, Math.min(1, k * 1.5));
    Kit.people.pose(B, G.time * 8, mode, k);
    B.rig.position.y = 0;
    if (t < 0.55 && bd.done === 0) sigProps(B, o, mode);
    else if (t >= S.B_OPEN) sigProps(B, o, mode);
    o.mini.visible = true;
    o.mini.position.set(x, y + 0.05, 0.9);
    o.mini.scale.setScalar(0.5 * grow);
    if (t >= 0.55 && t < 0.9 && bd.done === 0) {
      const u = (t - 0.55) / 0.35;
      treat.visible = true;
      A.setEmoji(treat, bd.treat);
      treat.position.set(hx + (p.x - hx) * u, hy + 1 + Math.sin(u * PI) * 0.8 + (p.y + 0.9 - hy - 1) * u, 0.9);
    }
  }

  function spectators(dt, k) {
    const w = G.w;
    const happy = G.cheerT > 0 || w.phase === 'clear' || (G.scene2 && G.scene2.kind === 'win');
    [['foxy', -10.3], ['froggy', 10.3]].forEach(([id, x], i) => {
      const P = people[id];
      P.root.visible = true;
      const y = LV.ROOF_Y + 1.05;
      P.root.position.set(x, y + (happy ? Math.abs(Math.sin(G.time * 7 + i)) * 0.25 : 0), 0.4);
      P.root.rotation.y = PI + (x < 0 ? -0.5 : 0.5);
      Kit.people.pose(P, G.time * 7, happy ? 'wave' : 'stand', k);
      P.rig.position.y = 0;
    });
  }

  // ---------- HUD ----------
  function hud() {
    const w = G.w;
    if (!w || G.demo) return;
    const top = store.table(w.level)[0].score;
    for (let i = 0; i < 2; i++) {
      const box = $('hudP' + i);
      const pl = w.players[i];
      box.style.display = pl ? '' : 'none';
      if (!pl) continue;
      setText(box.querySelector('.lbl'), NAME(pl.who));
      setText(box.querySelector('.sc'), fmt(pl.score));
      setText(box.querySelector('.lives'), pl.out ? '—' : pl.lives > 6 ? `❤️ ×${pl.lives}` : '❤️'.repeat(Math.max(0, pl.lives)));
    }
    setText($('hudHi'), fmt(Math.max(top, ...w.players.map((p) => p.score))));
    setText($('hudStage'), stageName());
    const left = w.toys.filter((t) => !t.got);
    setText($('hudToyN'), String(left.length));
    setText($('hudKinds'), left.map((t) => TOY_E[t.kind]).join(''));
    const on = !!w.buddy;
    $('budBtn').classList.toggle('on', on);
    document.querySelector('.tb.call').classList.toggle('on', on);
  }

  function draw() {
    renderer.render(scene, cam);
  }

  // ---------- test hooks ----------
  function state() {
    const w = G.w;
    if (!w) return { screen: G.screen };
    const ps = w.players.map((p) => {
      const [sx, sy] = toScreen(p.x, p.y + 0.55, Z_MOUSE);
      return { who: p.who, x: +p.x.toFixed(3), y: +p.y.toFixed(3), mode: p.mode, f: p.f, sh: p.sh, want: p.want, bounces: p.bounces, face: p.face, sx: Math.round(sx), sy: Math.round(sy), score: p.score, lives: p.lives, out: p.out, inv: +p.inv.toFixed(2) };
    });
    return {
      screen: G.screen, paused: G.paused, demo: G.demo, phase: w.phase, li: w.li, level: w.level, two: w.two,
      p: ps[0], players: ps, cats: w.cats.map((c) => ({ id: c.id, st: c.st, f: c.f, x: +c.x.toFixed(2), y: +c.y.toFixed(2) })),
      doors: w.doors.map((d) => ({ f: d.f, x: d.x, open: d.open, glow: d.glow, swing: d.swing })), toysLeft: w.toys.filter((t) => !t.got).length,
      buddy: w.buddy && { kind: w.buddy.kind, who: w.buddy.who, t: +w.buddy.t.toFixed(2), more: w.buddy.more },
      muted: Kit.sound.isMuted(), sfx: Object.assign({}, SFX.log), lang: Kit.lang.get(), touch: document.body.classList.contains('touch'),
    };
  }
  window.game = {
    start(o) {
      o = o || {};
      if (o.players) G.players = o.players;
      if (o.who) G.who = o.who;
      if (o.level) G.level = o.level;
      play();
      if (o.stage != null) { G.w.li = o.stage; S.loadStage(G.w); G.w.events = []; big(stageName(), 'GRAB EVERY TOY!'); }
      if (o.go) { G.w.phase = 'play'; G.w.phaseT = 0; }
      return state();
    },
    step(secs, o) {
      const n = Math.max(1, Math.round((secs || DT) / DT));
      for (let i = 0; i < n; i++) advance(DT);
      if (!o || o.draw !== false) draw();
      return state();
    },
    state,
    hold(v) { G.hold = v !== false; return G.hold; },
    call,
    pause, resume, showTitle, showResults,
    check: (only) => MM.check.run(only),
    checkFail: () => MM.check.fail(),
    // stand mouse i on floor f at x, or put him in shaft k (tests): the rules stay the real ones
    put(i, f, x) { S.put(G.w, i, f, x); return state(); },
    putShaft(i, k, y, vdir) { S.putShaft(G.w, i, k, y, vdir, true); return state(); },
    // no cats and none to come (tests that only look at moving); the mansion stays on
    quiet() { G.w.cats = []; G.w.queue = 0; G.w.waves = []; return state(); },
    cat(f, x, o) { return S.addCat(G.w, f, x, o); },
    sabotage(s) { G.sab = s || null; return G.sab; },
    toScreen,
    world: () => G.w,
    G,
    info() { draw(); const r = renderer.info.render; let meshes = 0; scene.traverseVisible((ob) => { if (ob.isMesh || ob.isSprite) meshes++; }); return { calls: r.calls, triangles: r.triangles, meshes, pixelRatio: renderer.getPixelRatio() }; },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
