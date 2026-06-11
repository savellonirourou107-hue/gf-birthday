/**
 * cake-scene.js — 三维蛋糕场景模块 (自包含 ES Module)
 * 双层蛋糕 / 蜡烛火焰 / 星空流星 / 许愿纸折千纸鹤 / 吹蜡烛 / 彩带
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ═══ 工具函数 ═══
const rand = (min, max) => Math.random() * (max - min) + min;
const eio = t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
const eoc = t => 1 - Math.pow(1 - t, 3);
const circle = (n, r, y = 0) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return { x: Math.cos(a) * r, y, z: Math.sin(a) * r };
});
const bezier = (t, p0, p1, p2, p3) => {
  const u = 1 - t, uu = u * u, tt = t * t;
  return p0.clone().multiplyScalar(uu * u)
    .add(p1.clone().multiplyScalar(3 * uu * t))
    .add(p2.clone().multiplyScalar(3 * u * tt))
    .add(p3.clone().multiplyScalar(tt * t));
};

// ═══ CakeScene ═══
export class CakeScene {
  constructor() {
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.controls = null;
    this.clock = new THREE.Clock();
    this.animId = null;
    this.flameGroup = [];
    this.flamePhases = Array.from({ length: 20 }, () => Math.random() * Math.PI * 2);
    this.stars = null;
    this.shootingStars = [];
    this.nextShootingStar = 0;
    this.wishPaper = null;
    this.wishPaperBaseVerts = null;
    this.paperAnimState = null;
    this.craneGroup = null;
    this.craneParts = [];
    this.confettiParticles = [];
    this.container = null;
  }

  // ─── init ───
  init(container) {
    this.container = container;
    const [w, h] = [container.clientWidth, container.clientHeight];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0a1a');
    this.scene.fog = new THREE.FogExp2('#0a0a1a', 0.00015);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(3, 2.5, 5);
    this.camera.lookAt(0, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.2, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 9;
    this.controls.maxPolarAngle = Math.PI * 0.65;
    this.controls.minPolarAngle = 0.3;
    this.controls.update();

    this._setupLights();
    this._createTable();
    this._createCake();
    this._createCandles();
    this._createStarfield();
  }

  _setupLights() {
    this.scene.add(new THREE.AmbientLight('#fff5e6', 0.7));
    this.scene.add(new THREE.HemisphereLight('#8899cc', '#443322', 0.6));
    this.candleGlowLight = new THREE.PointLight('#ff9933', 2.5, 6, 1.5);
    this.candleGlowLight.position.set(0, 1.6, 0);
    this.candleGlowLight.castShadow = true;
    this.candleGlowLight.shadow.mapSize.width = 512;
    this.candleGlowLight.shadow.mapSize.height = 512;
    this.candleGlowLight.shadow.camera.near = 0.1;
    this.candleGlowLight.shadow.camera.far = 20;
    this.scene.add(this.candleGlowLight);
  }

  // ─── 桌子 ───
  _createTable() {
    const g = new THREE.Group();
    const tm = new THREE.MeshStandardMaterial({ color: '#8B5E3C', roughness: 0.7, metalness: 0.05 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 3), tm);
    top.position.y = -0.075; top.castShadow = top.receiveShadow = true; g.add(top);

    const lm = new THREE.MeshStandardMaterial({ color: '#6B3F2A', roughness: 0.75, metalness: 0.05 });
    const lg = new THREE.CylinderGeometry(0.08, 0.1, 1.5, 16);
    [[-1.7, -0.8, -1.2], [1.7, -0.8, -1.2], [-1.7, -0.8, 1.2], [1.7, -0.8, 1.2]]
      .forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(lg, lm);
        leg.position.set(lx, ly, lz);
        leg.castShadow = leg.receiveShadow = true;
        g.add(leg);
      });
    this.scene.add(g);
  }

  // ─── 蛋糕 ───
  _createCake() {
    const g = new THREE.Group();
    const cm = new THREE.MeshStandardMaterial({ color: '#FFF5EE', roughness: 0.4, metalness: 0.02 });
    const pm = new THREE.MeshStandardMaterial({ color: '#FAFAFA', roughness: 0.3, metalness: 0.1 });
    const dm = new THREE.MeshStandardMaterial({ color: '#FFB7C5', roughness: 0.35, metalness: 0.02 });
    const addM = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
    };
    addM(new THREE.CylinderGeometry(1.2, 1.2, 0.05, 48), pm, 0, 0.025, 0);
    addM(new THREE.CylinderGeometry(1.0, 1.05, 0.5, 48), cm, 0, 0.3, 0);
    const drip = addM(new THREE.TorusGeometry(1.03, 0.06, 16, 48), dm, 0, 0.55, 0);
    drip.rotation.x = Math.PI / 2;
    addM(new THREE.CylinderGeometry(0.7, 0.75, 0.4, 48), cm, 0, 0.75, 0);
    const drip2 = addM(new THREE.TorusGeometry(0.73, 0.05, 16, 48), dm, 0, 0.95, 0);
    drip2.rotation.x = Math.PI / 2;

    const bg = new THREE.SphereGeometry(0.06, 16, 16);
    ['#DC143C', '#8B0000', '#FF6347', '#C71585', '#B22222'].forEach((c, i) => {
      const v = circle(6, 0.25, 0.98)[i];
      addM(bg, new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 }), v.x, v.y, v.z);
    });
    addM(new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshStandardMaterial({ color: '#DC143C', roughness: 0.3 }), 0, 1.01, 0);

    g.position.y = 0.15; this.cakeGroup = g; this.scene.add(g);
  }

  // ─── 蜡烛 ───
  _createCandles() {
    const cm = new THREE.MeshStandardMaterial({ color: '#FFF8F0', roughness: 0.5, metalness: 0.02 });
    const wm = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 });
    const cGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 16);
    const hGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.04, 16);
    const wGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.04, 8);
    [...circle(12, 0.78, 0.58), ...circle(8, 0.52, 0.98)].forEach(pos => {
      const grp = new THREE.Group();
      grp.position.set(pos.x, pos.y, pos.z);
      const c = new THREE.Mesh(cGeo, cm); c.position.y = 0.125; c.castShadow = true; grp.add(c);
      const h = new THREE.Mesh(hGeo, cm); h.position.y = 0.02; grp.add(h);
      const w = new THREE.Mesh(wGeo, wm); w.position.y = 0.27; grp.add(w);
      const fg = this._createFlame(); fg.position.y = 0.29; grp.add(fg);
      const pl = new THREE.PointLight('#ff9933', 0.5, 0.5);
      pl.position.copy(fg.position); grp.add(pl);
      this.flameGroup.push({ group: fg, light: pl, parentGroup: grp });
      (this.cakeGroup || this.scene).add(grp);
    });
  }

  _createFlame() {
    const g = new THREE.Group();
    const i = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 8, 1),
      new THREE.MeshBasicMaterial({ color: '#ffaa00' }));
    i.position.y = 0.04; g.add(i);
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#ffdd44' }));
    t.position.y = 0.075; g.add(t);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#ff7722', transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    gl.position.y = 0.04; g.add(gl);
    g.userData = { inner: i, tip: t, glow: gl };
    return g;
  }

  // ─── 星空 ───
  _createStarfield() {
    const N = 500, pa = new Float32Array(N * 3), sa = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = rand(12, 25);
      pa[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      pa[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r;
      pa[i * 3 + 2] = Math.cos(ph) * r;
      sa[i] = rand(0.02, 0.08);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pa, 3));

    const c = document.createElement('canvas'); c.width = c.height = 32;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.15, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.4, 'rgba(200,200,255,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 32, 32);

    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.08, map: new THREE.CanvasTexture(c), color: '#ccccee',
      blending: THREE.AdditiveBlending, depthWrite: false,
      transparent: true, opacity: 0.9, sizeAttenuation: true,
    }));
    this.scene.add(this.stars);
  }

  _spawnShootingStar() {
    const ph = rand(0.3, 0.8), th = Math.random() * Math.PI * 2, r = 15;
    const sx = Math.sin(ph) * Math.cos(th) * r, sy = Math.sin(ph) * Math.sin(th) * r, sz = Math.cos(ph) * r;
    const d = new THREE.Vector3(rand(0.5, 1), rand(-0.3, -0.1), rand(-0.2, 0.2)).normalize();
    const p1 = new THREE.Vector3(sx, sy, sz);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([p1, p1.clone().add(d.clone().multiplyScalar(1.5))]),
      new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    this.scene.add(line);
    this.shootingStars.push({ mesh: line, dir: d, speed: rand(3, 6), life: 0, maxLife: rand(1.2, 2.0), start: p1 });
  }

  // ─── start ───
  start() {
    if (this.animId !== null) return;
    this.nextShootingStar = performance.now() / 1000 + rand(3, 8);
    const loop = () => {
      this.animId = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.1);
      const t = performance.now() / 1000;
      this.controls.update();
      this._animFlames(t);
      this._animStars(t, dt);
      this._animPaper(t);
      this._animCrane(t);
      this._animConfetti(t, dt);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  _animFlames(t) {
    for (let i = 0; i < this.flameGroup.length; i++) {
      const { group, light } = this.flameGroup[i];
      if (!group || !group.parent) continue;
      const p = this.flamePhases[i];
      const f = 1 + Math.sin(t * 8 + p) * 0.12 + Math.sin(t * 13 + p * 1.7) * 0.08 + Math.sin(t * 19 + p * 2.3) * 0.05;
      const s = Math.max(0.3, f);
      group.scale.setScalar(s);
      if (light) light.intensity = 0.5 * s;
    }
  }

  _animStars(t, dt) {
    if (this.stars) this.stars.material.opacity = 0.85 + Math.sin(t * 1.5) * 0.05 + Math.sin(t * 3.7) * 0.03;
    if (t >= this.nextShootingStar) { this._spawnShootingStar(); this.nextShootingStar = t + rand(3, 8); }
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i]; s.life += dt; const p = s.life / s.maxLife;
      if (p >= 1) {
        this.scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose();
        this.shootingStars.splice(i, 1); continue;
      }
      s.start.add(s.dir.clone().multiplyScalar(s.speed * dt));
      s.mesh.geometry.dispose();
      s.mesh.geometry = new THREE.BufferGeometry().setFromPoints([
        s.start, s.start.clone().add(s.dir.clone().multiplyScalar(1.5))]);
      s.mesh.material.opacity = (p < 0.1 ? p / 0.1 : 1 - (p - 0.1) / 0.9) * 0.9;
    }
  }

  // ─── 许愿纸 ───
  showWishPaper() {
    if (this.wishPaper) return;
    const geo = new THREE.PlaneGeometry(1.5, 2.0, 6, 8);
    const mat = new THREE.MeshStandardMaterial({ color: '#FFF8E7', roughness: 0.6, metalness: 0.02, side: THREE.DoubleSide });
    this.wishPaper = new THREE.Mesh(geo, mat);
    this.wishPaper.position.set(0, 1.8, 2.2);
    this.wishPaper.rotation.x = -0.3;
    this.wishPaper.castShadow = this.wishPaper.receiveShadow = true;
    this.wishPaperBaseVerts = new Float32Array(geo.attributes.position.array);
    this.scene.add(this.wishPaper);
    this.paperAnimState = { phase: 'floating', startTime: 0, foldProgress: 0, flyProgress: 0, baseY: 1.8 };
  }

  _animPaper(t) {
    if (!this.wishPaper || !this.paperAnimState) return;
    const s = this.paperAnimState;
    if (s.phase === 'floating') {
      this.wishPaper.position.y = s.baseY + Math.sin(t * 1.5) * 0.08;
      this.wishPaper.rotation.z = Math.sin(t * 0.7) * 0.05;
    }
    if (s.phase === 'folding') {
      s.foldProgress = Math.min((t - s.startTime) / 1.5, 1.0);
      this._applyFold(s.foldProgress);
      if (s.foldProgress >= 1.0) { s.phase = 'folded'; s.startTime = t; }
    }
  }

  _applyFold(progress) {
    if (!this.wishPaper) return;
    const pos = this.wishPaper.geometry.attributes.position;
    const base = this.wishPaperBaseVerts, arr = pos.array;
    const cols = 7, rows = 9, hw = 0.75, hh = 1.0;

    const p1 = Math.min(progress / 0.33, 1), p2 = Math.min(Math.max((progress - 0.33) / 0.33, 0), 1),
      p3 = Math.min(Math.max((progress - 0.66) / 0.34, 0), 1);
    const e1 = eio(p1), e2 = eio(p2), e3 = eoc(p3);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const nx = c / (cols - 1) * 2 - 1, ny = r / (rows - 1) * 2 - 1;
        const cf = Math.abs(nx) * Math.abs(ny);
        let x = nx * hw * (1 - e1 * cf * 0.8);
        let y = ny * hh * (1 - e1 * cf * 0.8);
        const df = (Math.abs(nx) + Math.abs(ny)) / 2;
        y += e2 * df * 0.6 * Math.abs(x / hw);
        const wf = Math.abs(nx), ef = Math.abs(ny);
        const z = e3 * wf * (1 - ef) * 0.4 * Math.sign(nx);
        y += e3 * ef * (1 - wf) * 0.5 * Math.sign(ny) - e3 * (1 - wf) * (1 - ef) * 0.1;
        const i = (r * cols + c) * 3;
        arr[i] = x; arr[i + 1] = y; arr[i + 2] = z;
      }
    }
    pos.needsUpdate = true;
    this.wishPaper.geometry.computeVertexNormals();
  }

  // ─── foldToCrane ───
  foldToCrane() {
    return new Promise((resolve) => {
      if (!this.wishPaper) { resolve(); return; }
      const s = this.paperAnimState;
      s.phase = 'folding'; s.startTime = performance.now() / 1000; s.foldProgress = 0;
      const check = () => {
        if (s.phase === 'folded') { this._craneFly(resolve); return; }
        if (s.phase !== 'flying') requestAnimationFrame(check);
      };
      setTimeout(check, 100);
    });
  }

  _craneFly(resolve) {
    if (!this.wishPaper) { resolve(); return; }
    const s = this.paperAnimState, paper = this.wishPaper;
    this.craneGroup = new THREE.Group();
    this.craneGroup.position.copy(paper.position);
    this.craneGroup.rotation.copy(paper.rotation);
    this.scene.remove(paper);
    paper.position.set(0, 0, 0); paper.rotation.set(0, 0, 0);
    this.craneGroup.add(paper);
    this.scene.add(this.craneGroup);

    const wGeo = new THREE.ConeGeometry(0.3, 0.9, 4, 1);
    const wMat = new THREE.MeshStandardMaterial({ color: '#FFF8E7', roughness: 0.6, metalness: 0.02, side: THREE.DoubleSide });
    [{ pos: [-0.35, 0, 0], rz: Math.PI / 4, ry: -0.3, side: 'left' },
     { pos: [0.35, 0, 0], rz: -Math.PI / 4, ry: 0.3, side: 'right' }].forEach(cfg => {
      const wing = new THREE.Mesh(wGeo, wMat);
      wing.position.set(...cfg.pos);
      wing.rotation.z = cfg.rz; wing.rotation.y = cfg.ry;
      this.craneGroup.add(wing);
      this.craneParts.push({ mesh: wing, side: cfg.side });
    });

    s.phase = 'flying'; s.startTime = performance.now() / 1000; s.flyProgress = 0;
    s.flyPath = {
      start: this.craneGroup.position.clone(),
      cp1: new THREE.Vector3(1.5, 4, 1), cp2: new THREE.Vector3(2.5, 6, -2),
      end: new THREE.Vector3(3, 8, -5) };
    s.flyResolve = resolve;
  }

  _animCrane(t) {
    if (!this.craneGroup || !this.paperAnimState || this.paperAnimState.phase !== 'flying') return;
    const s = this.paperAnimState;
    s.flyProgress = Math.min((t - s.startTime) / 2.0, 1.0);
    const fp = eio(s.flyProgress);
    this.craneGroup.position.copy(bezier(fp, s.flyPath.start, s.flyPath.cp1, s.flyPath.cp2, s.flyPath.end));
    this.craneGroup.scale.setScalar(1 - fp * 0.9);
    this.craneGroup.rotation.y += 0.01;
    this.craneGroup.rotation.z = Math.sin(fp * Math.PI) * 0.3;
    const wf = Math.sin((t - s.startTime) * 12) * 0.5;
    this.craneParts.forEach(p => {
      const sign = p.side === 'left' ? 1 : -1;
      p.mesh.rotation.z = sign * (Math.PI / 4 + wf);
      p.mesh.rotation.x = wf * 0.3;
    });
    if (s.flyProgress >= 1.0) {
      this.scene.remove(this.craneGroup);
      if (s.flyResolve) s.flyResolve();
      s.flyResolve = null; s.phase = 'done';
    }
  }

  // ─── blowCandles ───
  blowCandles() {
    return new Promise((resolve) => {
      const alive = this.flameGroup.filter(f => f.group && f.group.parent);
      if (!alive.length) { resolve(); return; }
      let done = 0; const smoke = [];

      alive.forEach((fo, idx) => {
        setTimeout(() => {
          if (!fo.group || !fo.group.parent) { done++; return; }
          const sTime = performance.now() / 1000;
          const ext = () => {
            const elapsed = performance.now() / 1000 - sTime;
            const p = Math.min(elapsed / 0.3, 1.0);
            const sc = 1 - eoc(p);
            fo.group.scale.setScalar(sc);
            if (fo.light) fo.light.intensity = 0.5 * sc;
            if (p < 1.0) { requestAnimationFrame(ext); return; }
            // 烟雾
            const wp = new THREE.Vector3(); fo.group.getWorldPosition(wp);
            [0, 1, 2, 3, 4].forEach(() => {
              const sm = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8),
                new THREE.MeshBasicMaterial({ color: '#cccccc', transparent: true, opacity: 0.5, depthWrite: false }));
              sm.position.copy(wp).add(new THREE.Vector3(rand(-0.03, 0.03), 0, rand(-0.03, 0.03)));
              sm.userData = { vel: new THREE.Vector3(rand(-0.1, 0.1), rand(0.3, 0.8), rand(-0.1, 0.1)), life: 0, maxLife: rand(1.0, 2.0) };
              this.scene.add(sm); smoke.push(sm);
            });
            if (fo.group.parent) fo.group.parent.remove(fo.group);
            if (fo.light?.parent) fo.light.parent.remove(fo.light);
            fo.group = null; fo.light = null;
            done++;
            if (done >= alive.length) this._finishBlow(smoke, resolve);
          };
          ext();
        }, idx * 60 + rand(0, 40));
      });
    });
  }

  _finishBlow(smoke, resolve) {
    const up = () => {
      let more = false;
      smoke.forEach(s => {
        s.userData.life += 0.016;
        if (s.userData.life < s.userData.maxLife) {
          s.position.add(s.userData.vel.clone().multiplyScalar(0.016));
          s.material.opacity = 0.5 * (1 - s.userData.life / s.userData.maxLife); more = true;
        } else { this.scene.remove(s); s.geometry.dispose(); s.material.dispose(); }
      });
      if (more) requestAnimationFrame(up);
      else {
        this.scene.background = new THREE.Color('#1a0a1a');
        if (this.candleGlowLight) this.candleGlowLight.intensity = 0.3;
        this.showConfetti(); resolve();
      }
    };
    up();
  }

  // ─── 彩带 ───
  showConfetti() {
    const colors = ['#FF69B4', '#FFD700', '#FFFFFF', '#FFB7C5', '#FFA07A', '#DDA0DD'];
    const geo = new THREE.PlaneGeometry(0.08, 0.08);
    for (let i = 0; i < 120; i++) {
      const piece = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.4, side: THREE.DoubleSide,
        transparent: true, opacity: 0.9 }));
      piece.position.set(rand(-2, 2), rand(2.5, 6), rand(-2, 2));
      piece.rotation.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
      piece.userData = { vel: new THREE.Vector3(rand(-0.3, 0.3), rand(-0.8, -0.2), rand(-0.3, 0.3)),
        rot: new THREE.Vector3(rand(0.5, 2), rand(0.5, 2), rand(0.5, 2)) };
      this.scene.add(piece);
      this.confettiParticles.push(piece);
    }
  }

  _animConfetti(t, dt) {
    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i], u = p.userData;
      p.position.x += u.vel.x * dt; p.position.y += u.vel.y * dt; p.position.z += u.vel.z * dt;
      p.rotation.x += u.rot.x * dt; p.rotation.y += u.rot.y * dt; p.rotation.z += u.rot.z * dt;
      u.vel.x += Math.sin(t * 3 + i) * 0.01 * dt;
      if (p.position.y < -3) { this.scene.remove(p); p.geometry.dispose(); p.material.dispose(); this.confettiParticles.splice(i, 1); }
    }
  }

  // ─── 提示 ───
  showHint(text) { window.dispatchEvent(new CustomEvent('cake-hint', { detail: { text, visible: true } })); }
  hideHint() { window.dispatchEvent(new CustomEvent('cake-hint', { detail: { visible: false } })); }

  // ─── 响应式 ───
  onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const [w, h] = [this.container.clientWidth, this.container.clientHeight];
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h);
  }

  // ─── dispose ───
  dispose() {
    if (this.animId !== null) { cancelAnimationFrame(this.animId); this.animId = null; }
    this.shootingStars.forEach(s => { this.scene?.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
    this.shootingStars = [];
    this.confettiParticles.forEach(c => { this.scene?.remove(c); c.geometry.dispose(); c.material.dispose(); });
    this.confettiParticles = [];
    if (this.craneGroup) {
      this.scene?.remove(this.craneGroup);
      this.craneGroup.traverse(ch => { if (ch.geometry) ch.geometry.dispose(); if (ch.material) (Array.isArray(ch.material) ? ch.material : [ch.material]).forEach(m => m.dispose()); });
    }
    if (this.scene) {
      this.scene.traverse(ch => { if (ch.geometry && ch !== this.scene) ch.geometry.dispose(); if (ch.material) (Array.isArray(ch.material) ? ch.material : [ch.material]).forEach(m => m.dispose()); });
      this.scene.clear();
    }
    this.renderer?.dispose();
    if (this.container && this.renderer?.domElement?.parentElement === this.container) this.container.removeChild(this.renderer.domElement);
    this.controls?.dispose();
    Object.assign(this, { scene: null, camera: null, renderer: null, controls: null, flameGroup: [], confettiParticles: [], wishPaper: null, craneGroup: null, stars: null });
  }
}
