/**
 * cake-scene.js — 三维蛋糕场景模块 (自包含 ES Module)
 * 双层蛋糕 / 蜡烛火焰 / 星空流星 / 许愿纸折千纸鹤 / 吹蜡烛 / 彩带
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_PATHS = {
  crane: 'assets/models/origami-crane.glb',
  cake: 'assets/models/birthday-cake.glb',
  table: 'assets/models/wood-table.glb',
};

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
    this.paperAnimState = null;
    this.craneGroup = null;
    this.craneModel = null;        // 缓存的千纸鹤 GLB 模型
    this._loadingModel = false;
    this.transformationParticles = null;
    this.flashSphere = null;
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

  _standardMaterial(material) {
    if (!material) return new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.65, metalness: 0.02 });
    if (material.isMeshStandardMaterial) {
      material.roughness = material.roughness ?? 0.65;
      material.metalness = material.metalness ?? 0.02;
      material.needsUpdate = true;
      return material;
    }
    return new THREE.MeshStandardMaterial({
      color: material.color ? material.color.clone() : new THREE.Color('#ffffff'),
      map: material.map || null,
      normalMap: material.normalMap || null,
      roughnessMap: material.roughnessMap || null,
      metalnessMap: material.metalnessMap || null,
      emissive: material.emissive ? material.emissive.clone() : new THREE.Color('#000000'),
      emissiveMap: material.emissiveMap || null,
      transparent: material.transparent || material.opacity < 1,
      opacity: material.opacity ?? 1,
      side: material.side ?? THREE.FrontSide,
      roughness: material.roughness ?? 0.65,
      metalness: material.metalness ?? 0.02,
    });
  }

  _prepareLoadedModel(root) {
    root.traverse(ch => {
      if (!ch.isMesh) return;
      ch.castShadow = true;
      ch.receiveShadow = true;
      if (Array.isArray(ch.material)) ch.material = ch.material.map(m => this._standardMaterial(m));
      else ch.material = this._standardMaterial(ch.material);
    });
    return root;
  }

  _disposeObject(root) {
    if (!root) return;
    root.traverse(ch => {
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) {
        const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
        mats.forEach(m => m.dispose());
      }
    });
  }

  _replaceGroupContents(group, object) {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      this._disposeObject(child);
    }
    group.add(object);
  }

  _loadModelIntoGroup(url, group, fallback) {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => this._replaceGroupContents(group, this._prepareLoadedModel(gltf.scene)),
      undefined,
      () => {
        if (fallback) fallback(group);
      },
    );
  }

  _cloneModelWithMaterials(root) {
    const clone = root.clone(true);
    clone.traverse(ch => {
      if (!ch.material) return;
      ch.material = Array.isArray(ch.material)
        ? ch.material.map(m => m.clone())
        : ch.material.clone();
    });
    return clone;
  }

  // ─── 桌子 ───
  _createTable() {
    this.tableGroup = new THREE.Group();
    this.scene.add(this.tableGroup);
    this._loadModelIntoGroup(MODEL_PATHS.table, this.tableGroup, group => this._createFallbackTable(group));
  }

  _createFallbackTable(targetGroup) {
    const g = targetGroup || new THREE.Group();
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
    if (!targetGroup) this.scene.add(g);
  }

  // ─── 蛋糕 ───
  _createCake() {
    this.cakeGroup = new THREE.Group();
    this.cakeGroup.position.y = 0.03;
    this.cakeModelGroup = new THREE.Group();
    this.cakeGroup.add(this.cakeModelGroup);
    this.scene.add(this.cakeGroup);
    this._loadModelIntoGroup(MODEL_PATHS.cake, this.cakeModelGroup, group => this._createFallbackCake(group));
  }

  _createFallbackCake(targetGroup) {
    const g = targetGroup || new THREE.Group();
    const cm = new THREE.MeshStandardMaterial({ color: '#FFF5EE', roughness: 0.4, metalness: 0.02 });
    const pm = new THREE.MeshStandardMaterial({ color: '#FAFAFA', roughness: 0.3, metalness: 0.1 });
    const dm = new THREE.MeshStandardMaterial({ color: '#FFB7C5', roughness: 0.35, metalness: 0.02 });
    const addM = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
    };
    addM(new THREE.CylinderGeometry(1.2, 1.2, 0.05, 48), pm, 0, 0.025, 0);
    addM(new THREE.CylinderGeometry(1.0, 1.05, 0.32, 48), cm, 0, 0.22, 0);
    const drip = addM(new THREE.TorusGeometry(1.03, 0.06, 16, 48), dm, 0, 0.55, 0);
    drip.rotation.x = Math.PI / 2;
    drip.position.y = 0.39;
    addM(new THREE.CylinderGeometry(0.58, 0.62, 0.25, 48), cm, 0, 0.55, 0);
    const drip2 = addM(new THREE.TorusGeometry(0.6, 0.05, 16, 48), dm, 0, 0.69, 0);
    drip2.rotation.x = Math.PI / 2;

    const bg = new THREE.SphereGeometry(0.06, 16, 16);
    ['#DC143C', '#8B0000', '#FF6347', '#C71585', '#B22222'].forEach((c, i) => {
      const v = circle(6, 0.35, 0.75)[i];
      addM(bg, new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 }), v.x, v.y, v.z);
    });
    addM(new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshStandardMaterial({ color: '#DC143C', roughness: 0.3 }), 0, 0.78, 0);

    if (!targetGroup) {
      g.position.y = 0.03;
      this.cakeGroup = g;
      this.scene.add(g);
    }
  }

  // ─── 蜡烛 ───
  _createCandles() {
    const cm = new THREE.MeshStandardMaterial({ color: '#FFF8F0', roughness: 0.5, metalness: 0.02 });
    const wm = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 });
    const cGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 16);
    const hGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.04, 16);
    const wGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.04, 8);
    [...circle(12, 0.76, 0.42), ...circle(8, 0.42, 0.72)].forEach(pos => {
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

  // ═══ 许愿纸 → 千纸鹤魔法变身 ═══

  // ─── 显示许愿纸（简洁平面，无细分）───
  showWishPaper() {
    if (this.wishPaper) return;
    const geo = new THREE.PlaneGeometry(2.0, 2.5, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: '#FFF8E7', roughness: 0.55, metalness: 0.02,
      side: THREE.DoubleSide, emissive: '#FFF8E7', emissiveIntensity: 0.08,
      transparent: true, opacity: 1.0,
    });
    this.wishPaper = new THREE.Mesh(geo, mat);
    this.wishPaper.position.set(0, 1.8, 2.2);
    this.wishPaper.rotation.x = -0.3;
    this.wishPaper.castShadow = this.wishPaper.receiveShadow = true;
    this.scene.add(this.wishPaper);
    this.paperAnimState = { phase: 'floating', startTime: 0, baseY: 1.8 };
  }

  _animPaper(t) {
    if (!this.wishPaper || !this.paperAnimState) return;
    const s = this.paperAnimState;
    if (s.phase === 'floating') {
      // 纸张漂浮微动
      this.wishPaper.position.y = s.baseY + Math.sin(t * 1.5) * 0.08;
      this.wishPaper.rotation.z = Math.sin(t * 0.7) * 0.05;
      return;
    }
    if (s.phase === 'transforming') this._animTransform(t, s);
  }

  // ─── 魔法变身动画：发光 → 爆发 → 揭示 (总计 3.5s) ───
  _animTransform(t, s) {
    const elapsed = t - s.startTime;
    if (elapsed >= 3.5) {
      // 变身完成 → 千纸鹤接手悬停
      s.phase = 'pausing'; s.startTime = t;
      this.wishPaper.visible = false;
      if (this.flashSphere) this.flashSphere.visible = false;
      return;
    }
    // 阶段1：发光 (0~1.5s) — 纸发光 + 粒子螺旋汇聚
    if (elapsed < 1.5) {
      const p = eio(elapsed / 1.5);
      this.wishPaper.material.emissiveIntensity = 0.08 + p * 0.72;
      if (this.transformationParticles) {
        this.transformationParticles.children.forEach((pt, i) => {
          const a = pt.userData.baseAngle + t * 3 * (1 + i * 0.01);
          const r = pt.userData.baseRadius * (1 - p * 0.5);
          pt.position.set(Math.cos(a) * r, pt.userData.baseY + Math.sin(a * 0.3) * 0.15 * p, Math.sin(a) * r);
          pt.material.opacity = 0.3 + p * 0.6;
        });
      }
      return;
    }
    // 阶段2：爆发 (1.5~2.5s) — 闪光球膨胀 + 纸淡出 + 粒子炸开
    if (elapsed < 2.5) {
      const p = (elapsed - 1.5) / 1.0;
      this.wishPaper.material.opacity = 1 - eoc(p);
      if (this.flashSphere) {
        this.flashSphere.visible = true;
        const fSub = Math.min(p, 0.5) * 2;
        this.flashSphere.scale.setScalar(eio(fSub) * 3);
        this.flashSphere.material.opacity = Math.max(0, 0.8 * (1 - p));
      }
      if (this.transformationParticles) {
        this.transformationParticles.children.forEach(pt => {
          const dir = pt.position.clone().normalize();
          pt.position.addScaledVector(dir, p * 4 * 0.016);
          pt.material.opacity = Math.max(0, 0.9 - p * 0.6);
        });
      }
      return;
    }
    // 阶段3：揭示 (2.5~3.5s) — 千纸鹤从 0 放大显现 + 粒子消退
    const p = eoc((elapsed - 2.5) / 1.0);
    if (this.craneGroup) {
      this.craneGroup.scale.setScalar(s._craneTargetScale * p);
      this.craneGroup.traverse(ch => {
        if (ch.material?.transparent) ch.material.opacity = p;
      });
    }
    if (this.flashSphere) this.flashSphere.visible = false;
    if (this.transformationParticles) {
      this.transformationParticles.children.forEach(pt => { pt.material.opacity = Math.max(0, 0.4 * (1 - p)); });
    }
  }

  // ─── 加载千纸鹤 GLB 模型（缓存单例，仅加载一次）───
  _loadCraneModel() {
    if (this.craneModel) return Promise.resolve(this.craneModel);
    if (this._loadingModel) return this._loadingModel;
    this._loadingModel = new Promise((resolve) => {
      const loader = new GLTFLoader();
      loader.load(
        MODEL_PATHS.crane,
        (gltf) => {
          this.craneModel = this._prepareLoadedModel(gltf.scene);
          this._loadingModel = null;
          resolve(this.craneModel);
        },
        undefined,
        () => {
          // 加载失败 → 降级为简易纸飞机
          const g = new THREE.Group();
          const bm = new THREE.MeshStandardMaterial({ color: '#FFF8E7', roughness: 0.5, side: THREE.DoubleSide });
          const body = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 4), bm);
          body.rotation.x = Math.PI / 2; body.castShadow = body.receiveShadow = true; g.add(body);
          const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), bm);
          wing.position.y = 0.04; wing.castShadow = wing.receiveShadow = true; g.add(wing);
          this.craneModel = g; this._loadingModel = null; resolve(g);
        }
      );
    });
    return this._loadingModel;
  }

  // ─── 创建变身粒子（65个金/白/粉色光点，螺旋环绕）───
  _createTransformParticles(center, baseY) {
    if (this.transformationParticles) {
      this.scene.remove(this.transformationParticles);
      this.transformationParticles.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
    }
    const colors = ['#FFD700', '#FFF8DC', '#FFB6C1'];
    this.transformationParticles = new THREE.Group();
    for (let i = 0; i < 65; i++) {
      const geo = new THREE.SphereGeometry(0.03, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const pt = new THREE.Mesh(geo, mat);
      const angle = Math.random() * Math.PI * 2;
      const radius = rand(0.8, 1.6);
      pt.userData = { baseAngle: angle, baseRadius: radius, baseY: baseY + rand(-0.4, 0.4) };
      pt.position.set(center.x + Math.cos(angle) * radius, pt.userData.baseY, center.z + Math.sin(angle) * radius);
      this.transformationParticles.add(pt);
    }
    this.scene.add(this.transformationParticles);
  }

  // ─── foldToCrane：启动魔法变身，返回 Promise ───
  foldToCrane() {
    return new Promise((resolve) => {
      if (!this.wishPaper) { resolve(); return; }
      const s = this.paperAnimState;
      const paperPos = this.wishPaper.position.clone();
      const paperY = paperPos.y;
      s._resolve = resolve;
      this._loadCraneModel().then(() => {
        // 克隆千纸鹤模型，定位到纸张位置
        if (this.craneModel) {
          this.craneGroup = this._cloneModelWithMaterials(this.craneModel);
          this.craneGroup.position.copy(paperPos);
          this.craneGroup.rotation.set(0, 0, 0);
          this.craneGroup.scale.setScalar(0);
          // 自动计算目标缩放：翼展约 1.35 单位，避免飞行时贴到镜头顶部
          const box = new THREE.Box3().setFromObject(this.craneGroup);
          const size = new THREE.Vector3(); box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          s._craneTargetScale = maxDim > 0 ? 1.35 / maxDim : 1.2;
          // 金色发光
          this.craneGroup.traverse(ch => {
            if (ch.material) {
              const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
              mats.forEach(m => {
                m.emissive = new THREE.Color('#FFD700');
                m.emissiveIntensity = 0.25;
                m.transparent = true; m.opacity = 0;
              });
            }
          });
          this.scene.add(this.craneGroup);
        }
        // 变身粒子 + 闪光球
        this._createTransformParticles(paperPos, paperY);
        const fGeo = new THREE.SphereGeometry(2, 32, 32);
        const fMat = new THREE.MeshBasicMaterial({
          color: '#FFFFFF', transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        this.flashSphere = new THREE.Mesh(fGeo, fMat);
        this.flashSphere.position.copy(paperPos);
        this.flashSphere.scale.setScalar(0);
        this.flashSphere.visible = false;
        this.scene.add(this.flashSphere);
        // 启动动画
        s.phase = 'transforming';
        s.startTime = performance.now() / 1000;
      });
    });
  }

  // ─── 千纸鹤悬停 & 飞行（GLB 模型）───
  _animCrane(t) {
    if (!this.craneGroup || !this.paperAnimState) return;
    const s = this.paperAnimState;
    // 悬停（变身完成后静置 2s，温柔浮动）
    if (s.phase === 'pausing') {
      const baseY = s._craneBaseY ?? (s._craneBaseY = this.craneGroup.position.y);
      this.craneGroup.position.y = baseY + Math.sin(t * 1.5) * 0.06;
      this.craneGroup.rotation.z = Math.sin(t * 0.6) * 0.04;
      if (t - s.startTime >= 2.0) {
        s.phase = 'flying'; s.startTime = t;
        const cp = this.craneGroup.position.clone();
        s.flyPath = {
          start: cp.clone(),
          cp1: new THREE.Vector3(cp.x + 1.2, cp.y + 2.5, cp.z + 1.2),
          cp2: new THREE.Vector3(cp.x + 2.5, cp.y + 4.5, cp.z - 1.8),
          end: new THREE.Vector3(cp.x + 4.5, cp.y + 7.0, cp.z - 5.5),
        };
      }
      return;
    }
    if (s.phase !== 'flying') return;
    // 飞行 (5s 贝塞尔路径)
    const elapsed = t - s.startTime;
    const fp = Math.min(elapsed / 5.0, 1.0);
    const ep = eio(fp);
    const pos = bezier(ep, s.flyPath.start, s.flyPath.cp1, s.flyPath.cp2, s.flyPath.end);
    this.craneGroup.position.copy(pos);
    // 面朝飞行方向 + 微妙倾斜（无翅膀扑动，纸鹤是折纸模型）
    const nEp = Math.min(ep + 0.02, 1.0);
    const lookPt = bezier(nEp, s.flyPath.start, s.flyPath.cp1, s.flyPath.cp2, s.flyPath.end);
    this.craneGroup.lookAt(lookPt);
    this.craneGroup.rotation.z = Math.sin(fp * Math.PI * 0.7) * 0.25;
    // 逐渐缩小
    const ts = s._craneTargetScale || 1.5;
    this.craneGroup.scale.setScalar(ts * (1 - fp * 0.9));
    // 末尾 20% 淡出
    if (fp > 0.8) {
      const fade = 1 - (fp - 0.8) / 0.2;
      this.craneGroup.traverse(ch => {
        if (ch.material?.transparent) ch.material.opacity = Math.max(0, fade);
      });
    }
    // 完成清理
    if (fp >= 1.0) {
      this._cleanupCraneAndParticles();
      s.phase = 'done';
      if (s._resolve) { s._resolve(); s._resolve = null; }
    }
  }

  // 清理千纸鹤、粒子、闪光球
  _cleanupCraneAndParticles() {
    [this.craneGroup, this.transformationParticles, this.flashSphere].forEach(obj => {
      if (!obj) return;
      this.scene.remove(obj);
      obj.traverse(ch => { if (ch.geometry) ch.geometry.dispose(); if (ch.material) (Array.isArray(ch.material) ? ch.material : [ch.material]).forEach(m => m.dispose()); });
    });
    this.craneGroup = null;
    this.transformationParticles = null;
    this.flashSphere = null;
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
    // 清理许愿纸（如未在动画中清理）
    if (this.wishPaper) {
      this.scene?.remove(this.wishPaper);
      if (this.wishPaper.geometry) this.wishPaper.geometry.dispose();
      if (this.wishPaper.material) this.wishPaper.material.dispose();
      this.wishPaper = null;
    }
    // 清理千纸鹤、粒子、闪光球（统一清理函数）
    this._cleanupCraneAndParticles?.();
    if (this.scene) {
      this.scene.traverse(ch => { if (ch.geometry && ch !== this.scene) ch.geometry.dispose(); if (ch.material) (Array.isArray(ch.material) ? ch.material : [ch.material]).forEach(m => m.dispose()); });
      this.scene.clear();
    }
    this.renderer?.dispose();
    if (this.container && this.renderer?.domElement?.parentElement === this.container) this.container.removeChild(this.renderer.domElement);
    this.controls?.dispose();
    Object.assign(this, { scene: null, camera: null, renderer: null, controls: null, flameGroup: [],
      confettiParticles: [], wishPaper: null, paperAnimState: null,
      craneGroup: null, craneModel: null, transformationParticles: null, flashSphere: null });
  }
}
