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
    this._starLayers = null;
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

  // ─── 星空 (「你的名字」风格) ───
  _createStarfield() {
    // ─ 背景深蓝紫渐变 ─
    const bgCanvas = document.createElement('canvas'); bgCanvas.width = 2; bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d');
    const bgGrad = bgCtx.createLinearGradient(0, 0, 0, 512);
    bgGrad.addColorStop(0, '#0a0a2e');    // 顶部：深蓝黑
    bgGrad.addColorStop(0.3, '#0d1040');  // 深靛蓝
    bgGrad.addColorStop(0.55, '#1a1045'); // 紫蓝过渡
    bgGrad.addColorStop(0.75, '#1a1545'); // 偏紫
    bgGrad.addColorStop(1, '#0d1535');    // 底部：深蓝
    bgCtx.fillStyle = bgGrad; bgCtx.fillRect(0, 0, 2, 512);
    const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.minFilter = THREE.LinearFilter;
    this.scene.background = bgTex;
    this.scene.fog = new THREE.Fog(0x0a0a2e, 20, 50);

    // ─ 星芒十字贴图 (4-point star flare) ─
    const starCanvas = document.createElement('canvas'); starCanvas.width = starCanvas.height = 64;
    const sctx = starCanvas.getContext('2d');
    // 十字光芒
    const sgradH = sctx.createLinearGradient(0, 32, 64, 32);
    sgradH.addColorStop(0, 'rgba(255,255,255,0)');
    sgradH.addColorStop(0.42, 'rgba(255,255,255,0.15)');
    sgradH.addColorStop(0.5, 'rgba(255,255,255,1)');
    sgradH.addColorStop(0.58, 'rgba(255,255,255,0.15)');
    sgradH.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = sgradH; sctx.fillRect(0, 0, 64, 64);
    const sgradV = sctx.createLinearGradient(0, 0, 0, 64);
    sgradV.addColorStop(0, 'rgba(255,255,255,0)');
    sgradV.addColorStop(0.42, 'rgba(255,255,255,0.15)');
    sgradV.addColorStop(0.5, 'rgba(255,255,255,1)');
    sgradV.addColorStop(0.58, 'rgba(255,255,255,0.15)');
    sgradV.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = sgradV; sctx.fillRect(0, 0, 64, 64);
    // 中心柔光
    const cgrad = sctx.createRadialGradient(32, 32, 0, 32, 32, 10);
    cgrad.addColorStop(0, 'rgba(255,255,255,1)');
    cgrad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    cgrad.addColorStop(0.7, 'rgba(255,255,255,0.2)');
    cgrad.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = cgrad; sctx.fillRect(16, 16, 32, 32);
    const starFlareTex = new THREE.CanvasTexture(starCanvas);
    starFlareTex.needsUpdate = true;

    // ─ 柔和光点贴图 ─
    const dotCanvas = document.createElement('canvas'); dotCanvas.width = dotCanvas.height = 32;
    const dctx = dotCanvas.getContext('2d');
    const dgrad = dctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    dgrad.addColorStop(0, 'rgba(255,255,255,1)');
    dgrad.addColorStop(0.08, 'rgba(255,255,255,0.9)');
    dgrad.addColorStop(0.25, 'rgba(255,255,255,0.5)');
    dgrad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    dgrad.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = dgrad; dctx.fillRect(0, 0, 32, 32);
    const dotTex = new THREE.CanvasTexture(dotCanvas);

    // ─ 第1层：银河带密集小星 (800颗) ─
    const N1 = 800, pa1 = new Float32Array(N1 * 3), ca1 = new Float32Array(N1 * 3), sa1 = new Float32Array(N1);
    for (let i = 0; i < N1; i++) {
      // 银河带状分布：沿赤道附近的一圈，带宽度约 ±20°
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      // 让星星集中在"银河带"：一个环绕天空的带状区域
      const bandCenter = Math.PI * 0.45; // 银河带中心纬度
      const bandWidth = 0.35;
      const bandPh = Math.acos(2 * Math.random() - 1);
      const ph2 = bandCenter + (bandPh - Math.PI / 2) * bandWidth;
      const r = rand(13, 22);
      pa1[i * 3] = Math.sin(ph2) * Math.cos(th) * r;
      pa1[i * 3 + 1] = Math.cos(ph2) * r;
      pa1[i * 3 + 2] = Math.sin(ph2) * Math.sin(th) * r;
      sa1[i] = rand(0.015, 0.05);
      // 颜色：偏蓝白到暖白
      const hue = rand(0.58, 0.68), sat = rand(0.05, 0.25), light = rand(0.7, 0.95);
      const col = new THREE.Color(); col.setHSL(hue, sat, light);
      ca1[i * 3] = col.r; ca1[i * 3 + 1] = col.g; ca1[i * 3 + 2] = col.b;
    }
    const layer1 = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ size: 0.06, map: dotTex, blending: THREE.AdditiveBlending, depthWrite: false,
        transparent: true, opacity: 0.75, vertexColors: true, sizeAttenuation: true })
    );
    layer1.geometry.setAttribute('position', new THREE.BufferAttribute(pa1, 3));
    layer1.geometry.setAttribute('color', new THREE.BufferAttribute(ca1, 3));
    layer1.geometry.setAttribute('size', new THREE.BufferAttribute(sa1, 1));
    this.scene.add(layer1);
    this.starLayers = [layer1];

    // ─ 第2层：亮星带星芒 (150颗) ─
    const N2 = 150, pa2 = new Float32Array(N2 * 3), ca2 = new Float32Array(N2 * 3);
    for (let i = 0; i < N2; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = rand(14, 24);
      pa2[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      pa2[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r;
      pa2[i * 3 + 2] = Math.cos(ph) * r;
      const hue = rand(0.55, 0.7), sat = rand(0.02, 0.15), light = rand(0.85, 1);
      const col = new THREE.Color(); col.setHSL(hue, sat, light);
      ca2[i * 3] = col.r; ca2[i * 3 + 1] = col.g; ca2[i * 3 + 2] = col.b;
    }
    const layer2 = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ size: 0.22, map: starFlareTex, blending: THREE.AdditiveBlending, depthWrite: false,
        transparent: true, opacity: 0.85, vertexColors: true, sizeAttenuation: true })
    );
    layer2.geometry.setAttribute('position', new THREE.BufferAttribute(pa2, 3));
    layer2.geometry.setAttribute('color', new THREE.BufferAttribute(ca2, 3));
    this.scene.add(layer2);
    this.starLayers.push(layer2);

    // ─ 第3层：散布小星点缀 (350颗，空间均匀分布) ─
    const N3 = 350, pa3 = new Float32Array(N3 * 3), ca3 = new Float32Array(N3 * 3), sa3 = new Float32Array(N3);
    for (let i = 0; i < N3; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = rand(15, 26);
      pa3[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      pa3[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r;
      pa3[i * 3 + 2] = Math.cos(ph) * r;
      sa3[i] = rand(0.01, 0.04);
      const hue = rand(0.55, 0.72), sat = rand(0.03, 0.3), light = rand(0.65, 0.9);
      const col = new THREE.Color(); col.setHSL(hue, sat, light);
      ca3[i * 3] = col.r; ca3[i * 3 + 1] = col.g; ca3[i * 3 + 2] = col.b;
    }
    const layer3 = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ size: 0.05, map: dotTex, blending: THREE.AdditiveBlending, depthWrite: false,
        transparent: true, opacity: 0.7, vertexColors: true, sizeAttenuation: true })
    );
    layer3.geometry.setAttribute('position', new THREE.BufferAttribute(pa3, 3));
    layer3.geometry.setAttribute('color', new THREE.BufferAttribute(ca3, 3));
    layer3.geometry.setAttribute('size', new THREE.BufferAttribute(sa3, 1));
    this.scene.add(layer3);
    this.starLayers.push(layer3);

    // ─ 第4层：星云光斑 (柔和大光点模拟星云) ─
    const nebulaCanvas = document.createElement('canvas'); nebulaCanvas.width = nebulaCanvas.height = 128;
    const nctx = nebulaCanvas.getContext('2d');
    const nGrad = nctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    nGrad.addColorStop(0, 'rgba(100,120,255,0.15)');
    nGrad.addColorStop(0.2, 'rgba(60,80,200,0.08)');
    nGrad.addColorStop(0.5, 'rgba(30,40,150,0.03)');
    nGrad.addColorStop(1, 'rgba(0,0,0,0)');
    nctx.fillStyle = nGrad; nctx.fillRect(0, 0, 128, 128);
    const nebulaTex = new THREE.CanvasTexture(nebulaCanvas);

    const N4 = 12, pa4 = new Float32Array(N4 * 3), ca4 = new Float32Array(N4 * 3);
    for (let i = 0; i < N4; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1) * 0.5 + Math.PI * 0.3, r = rand(16, 24);
      pa4[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      pa4[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r;
      pa4[i * 3 + 2] = Math.cos(ph) * r;
      const colTint = Math.random();
      let col;
      if (colTint < 0.4) col = new THREE.Color('#4455aa');
      else if (colTint < 0.7) col = new THREE.Color('#5533aa');
      else col = new THREE.Color('#3355aa');
      ca4[i * 3] = col.r; ca4[i * 3 + 1] = col.g; ca4[i * 3 + 2] = col.b;
    }
    const layer4 = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ size: 2.5, map: nebulaTex, blending: THREE.AdditiveBlending, depthWrite: false,
        transparent: true, opacity: 0.5, vertexColors: true, sizeAttenuation: true })
    );
    layer4.geometry.setAttribute('position', new THREE.BufferAttribute(pa4, 3));
    layer4.geometry.setAttribute('color', new THREE.BufferAttribute(ca4, 3));
    this.scene.add(layer4);
    this.starLayers.push(layer4);

    // 存储用于动画闪烁
    this._starLayers = [layer1, layer2, layer3, layer4];
    this._starFlareTex = starFlareTex;
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
    // ─ 星空闪烁：各层以不同频率呼吸 ─
    if (this._starLayers) {
      this._starLayers[0].material.opacity = 0.7 + Math.sin(t * 1.1) * 0.05 + Math.sin(t * 2.3) * 0.03;
      if (this._starLayers[1]) this._starLayers[1].material.opacity = 0.78 + Math.sin(t * 0.7) * 0.07 + Math.sin(t * 1.9) * 0.05;
      if (this._starLayers[2]) this._starLayers[2].material.opacity = 0.65 + Math.sin(t * 0.9) * 0.05 + Math.sin(t * 3.1) * 0.04;
      if (this._starLayers[3]) this._starLayers[3].material.opacity = 0.45 + Math.sin(t * 0.3) * 0.08;
      // 旋转银河带（缓慢自转）
      this._starLayers[0].rotation.y += dt * 0.015;
      this._starLayers[1].rotation.y += dt * 0.01;
    }
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

  // ─── 许愿纸（高分辨率正方形，支持顶点折叠动画）───
  showWishPaper() {
    if (this.wishPaper) return;
    const segs = 16, geo = new THREE.PlaneGeometry(1.5, 1.5, segs, segs);
    const mat = new THREE.MeshStandardMaterial({
      color: '#FFF8E7', roughness: 0.55, metalness: 0.02,
      side: THREE.DoubleSide, emissive: '#FFF8E7', emissiveIntensity: 0.08,
    });
    this.wishPaper = new THREE.Mesh(geo, mat);
    this.wishPaper.position.set(0, 1.8, 2.2);
    this.wishPaper.rotation.x = -0.3;
    this.wishPaper.castShadow = this.wishPaper.receiveShadow = true;
    // 折痕边线（随折叠过程动态更新）
    const edgeGeo = new THREE.EdgesGeometry(geo, 20);
    this._foldEdgeLine = new THREE.LineSegments(edgeGeo,
      new THREE.LineBasicMaterial({ color: '#c8b898', transparent: true, opacity: 0.4, depthTest: true }));
    this._foldEdgeLine.renderOrder = 1;
    this.wishPaper.add(this._foldEdgeLine);
    // 保存基础顶点 & 预计算 5 个折叠阶段的目标位置
    this._foldBaseVerts = new Float32Array(geo.attributes.position.array);
    this._initFoldStages(segs);
    this.scene.add(this.wishPaper);
    this.paperAnimState = { phase: 'floating', startTime: 0, foldProgress: 0, flyProgress: 0, baseY: 1.8 };
  }

  _animPaper(t) {
    if (!this.wishPaper || !this.paperAnimState) return;
    const s = this.paperAnimState;
    if (s.phase === 'floating') {
      // 纸张漂浮微动
      this.wishPaper.position.y = s.baseY + Math.sin(t * 1.5) * 0.08;
      this.wishPaper.rotation.z = Math.sin(t * 0.7) * 0.05;
    }
    if (s.phase === 'folding') {
      // 驱动顶点折叠动画，总时长 6 秒
      const elapsed = t - s.startTime;
      s.foldProgress = Math.min(elapsed / 6.0, 1.0);
      this._updateFoldGeometry(s.foldProgress);
      // 折叠过程中纸张轻微上下浮动
      this.wishPaper.position.y = s.baseY + Math.sin(t * 2.5) * 0.04 * (1 - s.foldProgress);
      if (s.foldProgress >= 1.0) { s.phase = 'folded'; s.startTime = t; }
    }
  }

  // ═══ 折纸折叠系统：预计算 5 个阶段顶点 + 逐帧插值 ═══
  _initFoldStages(segs) {
    const N = segs + 1, S = 0.75, total = N * N;
    this._foldStages = [];
    for (let s = 0; s < 5; s++) this._foldStages.push(new Float32Array(total * 3));
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const idx = (j * N + i) * 3, u = i / segs, v = j / segs;
        const px = (u - 0.5) * S * 2, py = (v - 0.5) * S * 2;
        for (let s = 0; s < 5; s++) {
          const p = this._stagePos(u, v, px, py, s + 1, S);
          this._foldStages[s][idx] = p[0];
          this._foldStages[s][idx + 1] = p[1];
          this._foldStages[s][idx + 2] = p[2];
        }
      }
    }
  }

  // 计算顶点在指定折叠阶段的三维位置（每阶段在上阶段基础上变形）
  _stagePos(u, v, px, py, stage, S) {
    // ── 阶段1：沿对角线 u=v 对折 ──
    let bx, by, bz;
    if (u >= v) { bx = px; by = py; bz = 0; }
    else { bx = (v - 0.5) * S * 2; by = (u - 0.5) * S * 2; bz = (v - u) * 0.015; }
    if (stage === 1) return [bx, by, bz];

    // ── 阶段2：兔耳折 — 两个底角向上折起 ──
    const bot2 = Math.max(0, Math.min(1, (-by / S + 1) * 0.5));
    const sid2 = Math.min(1, Math.abs(bx) / (S * 1.05));
    const l2 = bot2 * sid2;
    bx *= (1 - l2 * 0.45); by += l2 * 1.1; bz += l2 * 0.55;
    if (stage === 2) return [bx, by, bz];

    // ── 阶段3：收窄身体、纵向拉伸 ──
    bz += Math.abs(bx) * 0.18;
    bx *= 0.4; by *= 1.15;
    if (stage === 3) return [bx, by, bz];

    // ── 阶段4：头部下弯 + 尾部后伸 ──
    const hf = Math.max(0, Math.min(1, (by + 0.1) / (S * 1.5)));
    const tf = Math.max(0, Math.min(1, (-by + 0.1) / (S * 1.3)));
    by += -hf * 0.2 - tf * 0.15;
    bz += hf * 0.4 - tf * 0.5;
    if (stage === 4) return [bx, by, bz];

    // ── 阶段5：翅膀向外展开 ──
    const wf = Math.max(0, Math.min(1, (Math.abs(bx) - 0.06) / 0.35));
    return [bx + wf * (bx > 0 ? 0.5 : -0.5), by + wf * (-0.15), bz + wf * 0.1];
  }

  // 根据全局折叠进度 interpolate 顶点位置（每帧调用）
  _updateFoldGeometry(globalProgress) {
    const stageDefs = [
      { start: 0.00, end: 0.20 }, // 阶段1：对角折 6.0×0.20=1.2s
      { start: 0.20, end: 0.45 }, // 阶段2：兔耳折 6.0×0.25=1.5s
      { start: 0.45, end: 0.65 }, // 阶段3：收窄   6.0×0.20=1.2s
      { start: 0.65, end: 0.85 }, // 阶段4：头尾   6.0×0.20=1.2s
      { start: 0.85, end: 1.00 }, // 阶段5：展翅   6.0×0.15=0.9s
    ];
    // 确定当前阶段
    let si = 0;
    for (let i = 0; i < stageDefs.length; i++) {
      if (globalProgress >= stageDefs[i].start) si = i;
    }
    const stg = stageDefs[si];
    const localP = globalProgress >= stg.end ? 1.0
      : (globalProgress - stg.start) / (stg.end - stg.start);
    // easeInOutCubic
    const t = localP < 0.5 ? 4 * localP * localP * localP
      : 1 - Math.pow(-2 * localP + 2, 3) / 2;

    const posArr = this.wishPaper.geometry.attributes.position.array;

    // 阶段0→1：顶点绕对角线物理旋转折叠
    if (si === 0) {
      this._updateDiagonalFold(t, posArr);
    } else {
      // 阶段1→5：直接插值预计算数组（缓动已提供非线性）
      const startArr = this._foldStages[si - 1];
      const endArr = this._foldStages[si];
      for (let k = posArr.length - 1; k >= 0; k--) {
        posArr[k] = startArr[k] + (endArr[k] - startArr[k]) * t;
      }
    }

    this.wishPaper.geometry.attributes.position.needsUpdate = true;
    this.wishPaper.geometry.computeVertexNormals();
    // 同步更新折痕边线
    if (this._foldEdgeLine) {
      this._foldEdgeLine.geometry.dispose();
      this._foldEdgeLine.geometry = new THREE.EdgesGeometry(this.wishPaper.geometry, 20);
    }
  }

  // 阶段0→1：顶点绕对角线旋转（模拟真实纸张翻折，角速度 π rad）
  _updateDiagonalFold(t, posArr) {
    const segs = 16, N = segs + 1, S = 0.75;
    const theta = t * Math.PI; // 旋转角 0→180°
    const cosT = Math.cos(theta), sinT = Math.sin(theta);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const idx = (j * N + i) * 3;
        const u = i / segs, v = j / segs;
        const px = (u - 0.5) * S * 2, py = (v - 0.5) * S * 2;
        if (u >= v) {
          // 对角线下方：保持不动
          posArr[idx] = px; posArr[idx + 1] = py; posArr[idx + 2] = 0;
        } else {
          // 对角线上方：绕对角线轴 (1,1,0)/√2 旋转 theta
          const dAlong = (px + py) / Math.SQRT2;
          const dPerp = (py - px) / Math.SQRT2; // > 0 在对角线上方
          const dPerpRot = dPerp * cosT;
          const zRot = dPerp * sinT;
          posArr[idx] = (dAlong - dPerpRot) / Math.SQRT2;
          posArr[idx + 1] = (dAlong + dPerpRot) / Math.SQRT2;
          posArr[idx + 2] = zRot + (v - u) * 0.008 * (1 - cosT);
        }
      }
    }
  }

  // ─── foldToCrane：启动顶点折叠动画 ───
  foldToCrane() {
    return new Promise((resolve) => {
      if (!this.wishPaper) { resolve(); return; }
      const s = this.paperAnimState;
      // 开始 6 秒顶点折叠动画
      s.phase = 'folding'; s.startTime = performance.now() / 1000; s.foldProgress = 0;
      const check = () => {
        if (s.phase === 'folded') {
          // 折叠完成后停留 2 秒供欣赏，再起飞
          setTimeout(() => { this._startCraneAnimation(resolve); }, 2000);
          return;
        }
        if (s.phase !== 'flying') requestAnimationFrame(check);
      };
      setTimeout(check, 100);
    });
  }

  // ─── 千纸鹤飞行启动（折叠几何体直接起飞）───
  _startCraneAnimation(resolve) {
    const s = this.paperAnimState;
    s.flyPath = {
      start: this.wishPaper.position.clone(),
      cp1: new THREE.Vector3(1.0, 3.5, 1.0),
      cp2: new THREE.Vector3(2.0, 5.5, -1.5),
      end: new THREE.Vector3(3.5, 7.5, -4.5),
    };
    s.camTargetOrig = this.controls.target.clone();
    s.phase = 'flying';
    s.startTime = performance.now() / 1000;
    s.flyProgress = 0;
    s.flyResolve = resolve;
  }

  // ─── 千纸鹤飞行动画（折叠几何体直接飞，顶点级翅膀扑动）───
  _animCrane(t) {
    if (!this.wishPaper || !this.paperAnimState || this.paperAnimState.phase !== 'flying') return;
    const s = this.paperAnimState;
    const elapsed = t - s.startTime;
    s.flyProgress = Math.min(elapsed / 5.0, 1.0);
    const fp = eio(s.flyProgress);

    // 沿贝塞尔曲线移动
    const pos = bezier(fp, s.flyPath.start, s.flyPath.cp1, s.flyPath.cp2, s.flyPath.end);
    this.wishPaper.position.copy(pos);

    // 逐渐缩小
    const scale = 1.0 - fp * 0.95;
    this.wishPaper.scale.setScalar(scale);

    // 面朝飞行方向
    const nextFp = Math.min(fp + 0.03, 1.0);
    const lookTarget = bezier(nextFp, s.flyPath.start, s.flyPath.cp1, s.flyPath.cp2, s.flyPath.end);
    this.wishPaper.lookAt(lookTarget);
    this.wishPaper.rotateZ(Math.sin(fp * Math.PI * 0.7) * 0.25);

    // 翅膀顶点扑动
    this._applyWingFlap(Math.sin(elapsed * Math.PI * 2 * 3.5) * 0.15);

    // 相机跟随
    if (s.camTargetOrig && fp < 0.8) {
      this.controls.target.y = s.camTargetOrig.y + fp * 1.2;
    }

    // 末尾淡出
    if (fp > 0.8) {
      const fadeOut = 1.0 - (fp - 0.8) / 0.2;
      this.wishPaper.material.transparent = true;
      this.wishPaper.material.opacity = Math.max(0, fadeOut);
      if (this._foldEdgeLine) {
        this._foldEdgeLine.material.opacity = Math.max(0, 0.4 * fadeOut);
      }
    }

    // 飞行结束，清理资源
    if (s.flyProgress >= 1.0) {
      this.scene.remove(this.wishPaper);
      this.wishPaper.geometry.dispose();
      this.wishPaper.material.dispose();
      if (this._foldEdgeLine) { this._foldEdgeLine.geometry.dispose(); this._foldEdgeLine.material.dispose(); }
      this.wishPaper = null;
      this._foldEdgeLine = null;
      this._foldStages = null;
      this._foldBaseVerts = null;
      if (s.camTargetOrig) this.controls.target.copy(s.camTargetOrig);
      if (s.flyResolve) s.flyResolve();
      s.flyResolve = null;
      s.phase = 'done';
    }
  }

  // 飞行时翅膀顶点扑动：从阶段5静止姿态出发，绕 Z 轴旋转翅膀区域顶点
  _applyWingFlap(angle) {
    if (!this.wishPaper || !this._foldStages || this._foldStages.length < 5) return;
    const posArr = this.wishPaper.geometry.attributes.position.array;
    const stage5 = this._foldStages[4]; // 展翅静止姿态（阶段5）
    // 先恢复全部顶点到阶段5静止姿态
    posArr.set(stage5);
    // 再对翅膀区域顶点施加旋转
    for (let k = 0; k < posArr.length; k += 3) {
      const sx = stage5[k];
      const wf = Math.max(0, Math.min(1, (Math.abs(sx) - 0.08) / 0.3));
      if (wf <= 0) continue;
      const sign = sx > 0 ? 1 : -1;
      const a = angle * wf * sign;
      const ca = Math.cos(a), sa = Math.sin(a);
      const sy = stage5[k + 1], sz = stage5[k + 2];
      posArr[k] = sx * ca - sy * sa;
      posArr[k + 1] = sx * sa + sy * ca;
      posArr[k + 2] = sz;
    }
    this.wishPaper.geometry.attributes.position.needsUpdate = true;
    this.wishPaper.geometry.computeVertexNormals();
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
    if (this._starLayers) {
      this._starLayers.forEach(layer => {
        if (!layer) return;
        this.scene?.remove(layer);
        layer.geometry.dispose();
        if (layer.material.map) layer.material.map.dispose();
        layer.material.dispose();
      });
      this._starLayers = null;
    }
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
