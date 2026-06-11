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
    this.craneAll = [];
    this.craneWings = null;
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
    // 随机半球方向：流星从上方区域划过
    const ph = rand(0.2, 0.7), th = Math.random() * Math.PI * 2, r = 14 + Math.random() * 4;
    const sx = Math.cos(ph) * Math.sin(th) * r;
    const sy = Math.sin(ph) * r + 3;
    const sz = Math.cos(ph) * Math.cos(th) * r;
    const head = new THREE.Vector3(sx, sy, sz);
    // 方向：带轻微弧度，向右下方或左下方划过
    const d = new THREE.Vector3(rand(0.4, 1.2), rand(-0.6, -0.15), rand(-0.3, 0.3)).normalize();
    const speed = rand(4, 8);
    const maxLife = rand(1.5, 2.5);
    const trailLen = rand(1.8, 3.2);

    // ── 拖尾：构建多段线 (8 个点) ──
    const trailPts = [];
    for (let j = 7; j >= 0; j--) {
      trailPts.push(head.clone().addScaledVector(d, -j * trailLen / 7));
    }
    const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPts);
    const trailMat = new THREE.LineBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    this.scene.add(trailLine);

    // ── 头部光晕球 ──
    const glowGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: '#fff8e0',
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(head);
    this.scene.add(glow);

    // ── 尾部火花粒子 (3-5 个) ──
    const sparkles = [];
    const sparkCount = Math.floor(rand(3, 6));
    for (let j = 0; j < sparkCount; j++) {
      const sGeo = new THREE.SphereGeometry(0.02, 4, 4);
      const sMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.13, 1, rand(0.6, 1)),
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.position.copy(head).addScaledVector(d, -rand(0.3, 2.5))
        .add(new THREE.Vector3(rand(-0.15, 0.15), rand(-0.15, 0.15), rand(-0.15, 0.15)));
      sMesh.userData = { offset: new THREE.Vector3(rand(-0.2, 0.2), rand(-0.2, 0.2), rand(-0.2, 0.2)), life: rand(0.2, 0.8) };
      this.scene.add(sMesh);
      sparkles.push(sMesh);
    }

    this.shootingStars.push({
      head, dir: d, speed, life: 0, maxLife,
      trailLine, trailLen, glow, sparkles,
    });
  }

  // ─── start ───
  start() {
    if (this.animId !== null) return;
    this.nextShootingStar = performance.now() / 1000 + rand(0.5, 1.5);
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
    // 流星出现频率：每 1~2.5 秒一颗，最多同时 4 颗
    if (t >= this.nextShootingStar) {
      this._spawnShootingStar();
      this.nextShootingStar = t + rand(1.0, 2.5);
    }
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i]; s.life += dt; const p = s.life / s.maxLife;
      if (p >= 1) {
        // 清理流星
        this.scene.remove(s.trailLine); s.trailLine.geometry.dispose(); s.trailLine.material.dispose();
        this.scene.remove(s.glow); s.glow.geometry.dispose(); s.glow.material.dispose();
        s.sparkles.forEach(sp => {
          this.scene.remove(sp); sp.geometry.dispose(); sp.material.dispose();
        });
        this.shootingStars.splice(i, 1); continue;
      }
      // 移动头部
      s.head.addScaledVector(s.dir, s.speed * dt);
      s.glow.position.copy(s.head);
      // 更新拖尾：从头部向后排列
      const tp = [];
      for (let j = 7; j >= 0; j--) {
        tp.push(s.head.clone().addScaledVector(s.dir, -j * s.trailLen / 7));
      }
      s.trailLine.geometry.dispose();
      s.trailLine.geometry = new THREE.BufferGeometry().setFromPoints(tp);
      // 淡入淡出
      s.trailLine.material.opacity = (p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85) * 0.85;
      s.glow.material.opacity = (p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85) * 0.95;
      // 移动火花
      s.sparkles.forEach(sp => {
        const spLife = sp.userData.life + dt;
        sp.userData.life = spLife;
        if (spLife > 1) {
          sp.userData.life = 0;
          sp.position.copy(s.head).addScaledVector(s.dir, -rand(0.3, 2.5))
            .add(new THREE.Vector3(rand(-0.2, 0.2), rand(-0.2, 0.2), rand(-0.2, 0.2)));
        }
        sp.material.opacity = Math.max(0, sp.userData.life < 0.3 ? sp.userData.life / 0.3 : 1 - (sp.userData.life - 0.3) / 0.7) * 0.8;
      });
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
      // 折叠持续 4.0 秒，纸张淡出，千纸鹤同步淡入
      const elapsed = t - s.startTime;
      s.foldProgress = Math.min(elapsed / 4.0, 1.0);
      if (this.wishPaper.material.opacity !== undefined) {
        this.wishPaper.material.transparent = true;
        this.wishPaper.material.opacity = 1.0 - s.foldProgress;
      }
      // 千纸鹤同步淡入（加速曲线，让造型快速显现）
      if (this.craneAll && this.craneAll.length) {
        const craneOpacity = eoc(s.foldProgress) * 0.95;
        this.craneAll.forEach(m => { m.material.opacity = craneOpacity; });
      }
      if (s.foldProgress >= 1.0) { s.phase = 'folded'; s.startTime = t; }
    }
  }

  // ─── 构建折纸千纸鹤模型 ───
  _buildOrigamiCrane() {
    const group = new THREE.Group();
    const allMeshes = [];

    // 纸张材质：暖白、微粗糙、带暗光
    const mat = new THREE.MeshStandardMaterial({
      color: '#FFF8E7',
      roughness: 0.5,
      metalness: 0.02,
      side: THREE.DoubleSide,
      emissive: '#FFF8E7',
      emissiveIntensity: 0.1,
      transparent: true,
      opacity: 0.95,
    });

    // 折痕线材质
    const lineMat = new THREE.LineBasicMaterial({
      color: '#c8b898',
      transparent: true,
      opacity: 0.35,
      depthTest: true,
    });

    // 辅助：创建一个三角面 + 折痕边线
    const makeTri = (v1, v2, v3, parent) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z,
      ]), 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.renderOrder = 0;
      // 折痕边线
      const edges = new THREE.EdgesGeometry(geo, 15);
      const line = new THREE.LineSegments(edges, lineMat);
      line.renderOrder = 1;
      mesh.add(line);
      parent.add(mesh);
      allMeshes.push(mesh);
      return mesh;
    };

    // ── 身体顶点 ──
    const ct = new THREE.Vector3(0, 0.2, 0);       // 中心脊线上端
    const cb = new THREE.Vector3(0, -0.15, 0);     // 中心脊线下端
    const fr = new THREE.Vector3(0, -0.05, 0.3);   // 前（颈部连接处）
    const bk = new THREE.Vector3(0, -0.05, -0.35); // 后（尾部连接处）
    const lt = new THREE.Vector3(-0.25, -0.05, 0); // 左
    const rt = new THREE.Vector3(0.25, -0.05, 0);  // 右

    // ── 身体子组 ──
    const bodyGroup = new THREE.Group();
    // 右侧身体面
    makeTri(ct, fr, rt, bodyGroup);
    makeTri(cb, fr, rt, bodyGroup);
    makeTri(ct, rt, bk, bodyGroup);
    makeTri(cb, rt, bk, bodyGroup);
    // 左侧身体面
    makeTri(ct, lt, fr, bodyGroup);
    makeTri(cb, lt, fr, bodyGroup);
    makeTri(ct, bk, lt, bodyGroup);
    makeTri(cb, bk, lt, bodyGroup);

    // ── 左翅膀子组（枢轴在身体左侧） ──
    const leftWingGroup = new THREE.Group();
    leftWingGroup.position.copy(lt);
    const lwTip = new THREE.Vector3(-0.3, 0.6, 0.05);   // 翼尖：左上方
    const lwBack = new THREE.Vector3(0.15, -0.05, -0.2); // 翼后缘
    makeTri(new THREE.Vector3(0, 0, 0), lwTip, lwBack, leftWingGroup);

    // ── 右翅膀子组（枢轴在身体右侧） ──
    const rightWingGroup = new THREE.Group();
    rightWingGroup.position.copy(rt);
    const rwTip = new THREE.Vector3(0.3, 0.6, 0.05);    // 翼尖：右上方
    const rwBack = new THREE.Vector3(-0.15, -0.05, -0.2); // 翼后缘
    makeTri(new THREE.Vector3(0, 0, 0), rwTip, rwBack, rightWingGroup);

    // ── 颈部子组（枢轴在身体前方） ──
    const neckGroup = new THREE.Group();
    neckGroup.position.copy(fr);
    const nkMid = new THREE.Vector3(0, 0.12, 0.18);  // 颈中部
    const nkTip = new THREE.Vector3(0, 0.18, 0.32);  // 颈尖（头顶折点）
    makeTri(new THREE.Vector3(0, 0, 0), nkMid, nkTip, neckGroup);
    // 头部小折角（从颈尖向前下折）
    const hdTip = new THREE.Vector3(0, 0.1, 0.4);    // 头尖
    makeTri(nkTip, hdTip, nkMid, neckGroup);

    // ── 尾部子组（枢轴在身体后方） ──
    const tailGroup = new THREE.Group();
    tailGroup.position.copy(bk);
    const tlTip = new THREE.Vector3(0, 0.1, -0.32);  // 尾尖：后上方
    const tlBase = new THREE.Vector3(0.03, -0.05, 0); // 尾根微宽
    makeTri(new THREE.Vector3(0, 0, 0), tlTip, tlBase, tailGroup);

    // ── 组装 ──
    group.add(bodyGroup);
    group.add(leftWingGroup);
    group.add(rightWingGroup);
    group.add(neckGroup);
    group.add(tailGroup);

    // 翅膀初始旋转（向上展开约 30°）
    leftWingGroup.rotation.z = -0.3;
    rightWingGroup.rotation.z = 0.3;

    this.craneGroup = group;
    this.craneAll = allMeshes;
    this.craneWings = { left: leftWingGroup, right: rightWingGroup };
  }

  // ─── foldToCrane ───
  foldToCrane() {
    return new Promise((resolve) => {
      if (!this.wishPaper) { resolve(); return; }
      const s = this.paperAnimState;
      // 构建千纸鹤模型
      this._buildOrigamiCrane();
      // 将千纸鹤放在纸张位置
      this.craneGroup.position.copy(this.wishPaper.position);
      this.craneGroup.rotation.copy(this.wishPaper.rotation);
      // 初始不可见
      this.craneAll.forEach(m => { m.material.opacity = 0; });
      this.scene.add(this.craneGroup);
      // 开始折叠过渡（纸张淡出 + 千纸鹤淡入）
      s.phase = 'folding'; s.startTime = performance.now() / 1000; s.foldProgress = 0;
      const check = () => {
        if (s.phase === 'folded') {
          // 千纸鹤完成后停留 1.5 秒，让用户看清楚
          setTimeout(() => { this._startCraneAnimation(resolve); }, 1500);
          return;
        }
        if (s.phase !== 'flying') requestAnimationFrame(check);
      };
      setTimeout(check, 100);
    });
  }

  // ─── 千纸鹤飞行启动 ───
  _startCraneAnimation(resolve) {
    // 移除已不可见的纸张
    if (this.wishPaper) {
      this.scene.remove(this.wishPaper);
      this.wishPaper.geometry.dispose();
      this.wishPaper.material.dispose();
      this.wishPaper = null;
    }

    const s = this.paperAnimState;
    const crane = this.craneGroup;

    // 贝塞尔飞行路径：当前位置 → 右上弧线 → 略回左 → 上升飞远
    s.flyPath = {
      start: crane.position.clone(),
      cp1: new THREE.Vector3(1.0, 3.5, 1.0),
      cp2: new THREE.Vector3(2.0, 5.5, -1.5),
      end: new THREE.Vector3(3.5, 7.5, -4.5),
    };

    // 保存相机初始状态用于飞行时微调
    s.camTargetOrig = this.controls.target.clone();

    s.phase = 'flying';
    s.startTime = performance.now() / 1000;
    s.flyProgress = 0;
    s.flyResolve = resolve;
  }

  // ─── 千纸鹤飞行动画 ───
  _animCrane(t) {
    if (!this.craneGroup || !this.paperAnimState || this.paperAnimState.phase !== 'flying') return;
    const s = this.paperAnimState;
    const elapsed = t - s.startTime;
    s.flyProgress = Math.min(elapsed / 5.0, 1.0);
    const fp = eio(s.flyProgress);

    // 位置：沿贝塞尔曲线移动
    const pos = bezier(fp, s.flyPath.start, s.flyPath.cp1, s.flyPath.cp2, s.flyPath.end);
    this.craneGroup.position.copy(pos);

    // 缩放：逐渐变小，最终缩到 0.05
    const scale = 1.0 - fp * 0.95;
    this.craneGroup.scale.setScalar(scale);

    // 朝向：始终面朝飞行方向
    const nextFp = Math.min(fp + 0.03, 1.0);
    const lookTarget = bezier(nextFp, s.flyPath.start, s.flyPath.cp1, s.flyPath.cp2, s.flyPath.end);
    this.craneGroup.lookAt(lookTarget);

    // 轻微横滚（转弯时倾斜）
    this.craneGroup.rotateZ(Math.sin(fp * Math.PI * 0.7) * 0.25);

    // 翅膀柔和扑动：幅度约 0.18，频率约 3.5 Hz
    const wingAngle = Math.sin(elapsed * Math.PI * 2 * 3.5) * 0.18;
    if (this.craneWings) {
      this.craneWings.left.rotation.z = -0.3 + wingAngle;
      this.craneWings.right.rotation.z = 0.3 - wingAngle;
    }

    // 相机微妙跟随：千纸鹤上升时 camera target 略上移
    if (s.camTargetOrig && fp < 0.8) {
      this.controls.target.y = s.camTargetOrig.y + fp * 1.2;
    }

    // 最后阶段千纸鹤淡出
    if (fp > 0.8) {
      const fadeOut = 1.0 - (fp - 0.8) / 0.2;
      const opacity = Math.max(0, 0.95 * fadeOut);
      this.craneAll.forEach(m => { m.material.opacity = opacity; });
    }

    // 飞行结束
    if (s.flyProgress >= 1.0) {
      this.scene.remove(this.craneGroup);
      // 恢复相机 target
      if (s.camTargetOrig) this.controls.target.copy(s.camTargetOrig);
      if (s.flyResolve) s.flyResolve();
      s.flyResolve = null;
      s.phase = 'done';
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
    this.shootingStars.forEach(s => {
      this.scene?.remove(s.trailLine); s.trailLine.geometry.dispose(); s.trailLine.material.dispose();
      this.scene?.remove(s.glow); s.glow.geometry.dispose(); s.glow.material.dispose();
      s.sparkles.forEach(sp => { this.scene?.remove(sp); sp.geometry.dispose(); sp.material.dispose(); });
    });
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
