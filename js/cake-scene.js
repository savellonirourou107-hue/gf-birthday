/**
 * cake-scene.js — 三维蛋糕场景模块 (自包含 ES Module)
 * 双层蛋糕 / 粒子火焰 / 星空流星 / 许愿纸星光消散 / 吹蜡烛 / 彩带
 * 后处理：UnrealBloomPass 泛光
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const MODEL_PATHS = {
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
// ═══ CakeScene ═══
export class CakeScene {
  constructor() {
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.composer = null;
    this.bloomPass = null;
    this.bokehPass = null;
    this.controls = null;
    this.clock = new THREE.Clock();
    this.animId = null;
    this.flameGroup = [];
    this.flameParticles = [];
    this.flamePhases = Array.from({ length: 20 }, () => Math.random() * Math.PI * 2);
    this._starLayers = null;
    this.shootingStars = [];
    this.nextShootingStar = 0;
    this.wishPaper = null;
    this.paperAnimState = null;
    this.wishSparkles = null;
    this.wishFireworks = null;
    this.wishTextSprite = null;
    this.wishTextGlow = null;
    this.confettiParticles = [];
    this.container = null;
    this._flameTex = null;
    this._smokeTex = null;
    this._glowTex = null;
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

    this._genTextures();
    this._setupPostProcessing(w, h);
    this._setupLights();
    this._createTable();
    this._createCake();
    this._createCandles();
    this._createStarfield();
  }

  // ─── 生成火焰/烟雾/光晕纹理 ───
  _genTextures() {
    // ─ 火焰纹理
    const fc = document.createElement('canvas'); fc.width = fc.height = 128;
    const fctx = fc.getContext('2d');
    const fgrad = fctx.createRadialGradient(64, 90, 4, 64, 50, 56);
    fgrad.addColorStop(0, 'rgba(255,255,255,1)');
    fgrad.addColorStop(0.08, 'rgba(255,255,200,1)');
    fgrad.addColorStop(0.2, 'rgba(255,180,40,0.95)');
    fgrad.addColorStop(0.45, 'rgba(255,100,20,0.7)');
    fgrad.addColorStop(0.7, 'rgba(255,40,0,0.25)');
    fgrad.addColorStop(1, 'rgba(0,0,0,0)');
    fctx.fillStyle = fgrad; fctx.fillRect(0, 0, 128, 128);
    this._flameTex = new THREE.CanvasTexture(fc);
    this._flameTex.needsUpdate = true;

    // ─ 烟雾纹理
    const sc = document.createElement('canvas'); sc.width = sc.height = 64;
    const sctx = sc.getContext('2d');
    const sgrad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    sgrad.addColorStop(0, 'rgba(220,220,220,0.6)');
    sgrad.addColorStop(0.25, 'rgba(200,200,200,0.35)');
    sgrad.addColorStop(0.55, 'rgba(170,170,170,0.1)');
    sgrad.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = sgrad; sctx.fillRect(0, 0, 64, 64);
    this._smokeTex = new THREE.CanvasTexture(sc);
    this._smokeTex.needsUpdate = true;

    // ─ 柔光纹理
    const gc = document.createElement('canvas'); gc.width = gc.height = 64;
    const gctx = gc.getContext('2d');
    const ggrad = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    ggrad.addColorStop(0, 'rgba(255,200,100,0.9)');
    ggrad.addColorStop(0.15, 'rgba(255,160,40,0.6)');
    ggrad.addColorStop(0.4, 'rgba(255,100,20,0.15)');
    ggrad.addColorStop(1, 'rgba(0,0,0,0)');
    gctx.fillStyle = ggrad; gctx.fillRect(0, 0, 64, 64);
    this._glowTex = new THREE.CanvasTexture(gc);
    this._glowTex.needsUpdate = true;
  }

  // ─── 后处理：泛光 + 景深 ───
  _setupPostProcessing(w, h) {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom 泛光
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      0.38,   // strength（降低，避免过曝）
      0.4,    // radius
      0.88    // threshold（提高，只让火焰/星光发光）
    );
    this.composer.addPass(this.bloomPass);

    // Bokeh 景深：对焦蛋糕中心 (0, 1.2, 0)，距离约 3.5
    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 3.5,
      aperture: 0.0005,
      maxBlur: 0.008,
    });
    this.composer.addPass(this.bokehPass);
  }

  _setupLights() {
    this.scene.add(new THREE.AmbientLight('#fff5e6', 0.45));
    this.scene.add(new THREE.HemisphereLight('#8899cc', '#443322', 0.35));
    this.candleGlowLight = new THREE.PointLight('#ff9933', 1.8, 5, 1.5);
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
    const cm = new THREE.MeshPhysicalMaterial({
      color: '#FFF8F0', roughness: 0.35, metalness: 0.01,
      clearcoat: 0.1, clearcoatRoughness: 0.4,
      sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffe4d0'),
    });
    const wm = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 });
    const cGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 16);
    const hGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.04, 16);
    const wGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.04, 8);

    const spriteMat = new THREE.SpriteMaterial({
      map: this._flameTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      transparent: true,
      opacity: 0.9,
    });

    const glowMat = new THREE.SpriteMaterial({
      map: this._glowTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      transparent: true,
      opacity: 0.35,
    });

    [...circle(12, 0.76, 0.42), ...circle(8, 0.42, 0.72)].forEach(pos => {
      const grp = new THREE.Group();
      grp.position.set(pos.x, pos.y, pos.z);
      const c = new THREE.Mesh(cGeo, cm); c.position.y = 0.125; c.castShadow = true; grp.add(c);
      const h = new THREE.Mesh(hGeo, cm); h.position.y = 0.02; grp.add(h);
      const w = new THREE.Mesh(wGeo, wm); w.position.y = 0.27; grp.add(w);

      // 粒子火焰：主焰 + 副焰 3 层 sprite
      const fg = new THREE.Group();
      fg.position.y = 0.30;
      const particles = [];
      // 主焰（较大，中心偏下）
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Sprite(spriteMat.clone());
        s.material.opacity = 0.4 + Math.random() * 0.25;
        const size = 0.04 + Math.random() * 0.05;
        s.scale.set(size, size * 1.4, 1);
        s.position.y = 0.01 + Math.random() * 0.045;
        s.position.x = (Math.random() - 0.5) * 0.015;
        s.position.z = (Math.random() - 0.5) * 0.015;
        s.userData = { baseY: s.position.y, baseS: size, phase: Math.random() * Math.PI * 2, speed: 6 + Math.random() * 8 };
        fg.add(s);
        particles.push(s);
      }
      // 光晕 sprite
      const gl = new THREE.Sprite(glowMat.clone());
      gl.scale.set(0.12, 0.12, 1);
      gl.position.y = 0.03;
      gl.userData = { baseS: 0.12 };
      fg.add(gl);
      particles.push(gl);

      grp.add(fg);
      const pl = new THREE.PointLight('#ff9933', 0.7, 0.6, 1.2);
      pl.position.y = 0.32; grp.add(pl);

      this.flameGroup.push({ group: fg, light: pl, parentGroup: grp, particles });
      (this.cakeGroup || this.scene).add(grp);
    });
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
      this._spawnFlameSparkles(t);
      this._animFlameSparkles(t, dt);
      this._animStars(t, dt);
      this._animPaper(t);
      this._animWishEffects(t, dt);
      this._animConfetti(t, dt);
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };
    loop();
  }

  _animFlames(t) {
    for (let i = 0; i < this.flameGroup.length; i++) {
      const { group, light, particles } = this.flameGroup[i];
      if (!group || !group.parent) continue;
      if (!particles) continue;

      const basePhase = this.flamePhases[i];
      const wind = Math.sin(t * 0.7 + basePhase) * 0.004;

      for (let j = 0; j < particles.length; j++) {
        const p = particles[j];
        if (!p || !p.userData || !p.userData.baseY) continue;
        const { baseY, baseS, phase, speed } = p.userData;
        // 呼吸抖动：上下浮动 + 水平微摆
        const breathe = 1 + Math.sin(t * speed + phase) * 0.18 + Math.sin(t * speed * 1.7 + phase) * 0.1;
        const sizeX = baseS * breathe;
        const sizeY = baseS * 1.4 * breathe;
        p.scale.set(Math.max(0.01, sizeX), Math.max(0.01, sizeY), 1);
        p.position.y = baseY + Math.sin(t * speed * 0.7 + phase) * 0.008;
        p.position.x = (p.userData.baseX ?? p.position.x) + wind * breathe;
        p.material.opacity = Math.min(0.9, 0.45 + breathe * 0.3);
      }
      if (light) {
        const ripple = 1 + Math.sin(t * 9 + basePhase) * 0.12 + Math.sin(t * 15 + basePhase * 2) * 0.06;
        light.intensity = 0.6 * Math.max(0.3, ripple);
      }
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

  // ═══ 许愿纸 → 星光消散与烟花祝福 ═══

  _createWishPaperTexture(wishText = '') {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#fffdf7');
    grad.addColorStop(1, '#fff2de');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(244, 160, 176, 0.26)';
    ctx.lineWidth = 3;
    for (let y = 210; y < 780; y += 76) {
      ctx.beginPath();
      ctx.moveTo(92, y);
      ctx.lineTo(676, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(244, 160, 176, 0.16)';
    ctx.beginPath();
    ctx.arc(384, 132, 66, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5c3d2e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 64px "Ma Shan Zheng", "KaiTi", serif';
    ctx.fillText('我的愿望', 384, 132);

    const text = (wishText || '愿你想要的温柔、幸运和快乐，都慢慢来到身边。').trim().slice(0, 120);
    const lines = [];
    let line = '';
    ctx.font = '46px "Ma Shan Zheng", "KaiTi", serif';
    for (const ch of text) {
      const next = line + ch;
      if (ctx.measureText(next).width > 560 && line) {
        lines.push(line);
        line = ch;
      } else {
        line = next;
      }
      if (lines.length >= 6) break;
    }
    if (line && lines.length < 7) lines.push(line);
    lines.slice(0, 7).forEach((item, i) => {
      ctx.fillText(item, 384, 270 + i * 76);
    });

    ctx.font = '42px "Ma Shan Zheng", cursive';
    ctx.fillStyle = 'rgba(92, 61, 46, 0.78)';
    ctx.fillText('小团生日快乐', 384, 850);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  // ─── 显示许愿纸（把弹窗里的文字做成纸张纹理）───
  showWishPaper(wishText = '') {
    if (this.wishPaper) return;
    const geo = new THREE.PlaneGeometry(1.75, 2.2, 1, 1);
    const paperTexture = this._createWishPaperTexture(wishText);
    const mat = new THREE.MeshStandardMaterial({
      color: '#fff9f0',
      map: paperTexture,
      roughness: 0.58,
      metalness: 0.02,
      side: THREE.DoubleSide,
      emissive: '#fff0d0',
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });
    this.wishPaper = new THREE.Mesh(geo, mat);
    this.wishPaper.position.set(0, 1.85, 2.25);
    this.wishPaper.rotation.x = -0.32;
    this.wishPaper.castShadow = this.wishPaper.receiveShadow = true;
    this.wishPaper.renderOrder = 4;
    this.scene.add(this.wishPaper);
    this.paperAnimState = { phase: 'floating', startTime: performance.now() / 1000, baseY: 1.85 };
  }

  _animPaper(t) {
    if (!this.wishPaper || !this.paperAnimState) return;
    const s = this.paperAnimState;
    if (s.phase === 'floating') {
      this.wishPaper.position.y = s.baseY + Math.sin(t * 1.5) * 0.08;
      this.wishPaper.rotation.z = Math.sin(t * 0.7) * 0.05;
      return;
    }
    if (s.phase === 'releasing') this._animWishRelease(t, s);
  }

  releaseWish() {
    if (!this.wishPaper) this.showWishPaper();
    if (!this.wishPaper || !this.paperAnimState) return Promise.resolve();
    if (this.paperAnimState.phase === 'settled') return Promise.resolve();
    if (this.paperAnimState._releasePromise) return this.paperAnimState._releasePromise;

    const s = this.paperAnimState;
    const start = this.wishPaper.position.clone();
    const end = new THREE.Vector3(0, 1.52, 0.22);
    const startedAt = performance.now() / 1000;

    this._cleanupWishEffects();
    this._createWishSparkles(start, startedAt);
    this._createWishFireworks(startedAt);
    this._createWishText(startedAt);

    s.phase = 'releasing';
    s.startTime = startedAt;
    s._paperStart = start;
    s._paperEnd = end;
    s._releasePromise = new Promise(resolve => { s._resolve = resolve; });
    return s._releasePromise;
  }

  _animWishRelease(t, s) {
    const elapsed = t - s.startTime;
    const travel = Math.min(elapsed / 1.35, 1);
    const travelEase = eoc(travel);
    const fade = Math.min(Math.max((elapsed - 0.85) / 1.35, 0), 1);

    this.wishPaper.position.lerpVectors(s._paperStart, s._paperEnd, travelEase);
    this.wishPaper.position.y += Math.sin(t * 2.5) * 0.025 * (1 - travel);
    this.wishPaper.rotation.x = -0.32 + travelEase * 0.42;
    this.wishPaper.rotation.z = Math.sin(t * 1.1) * 0.055 * (1 - travel);
    this.wishPaper.scale.setScalar(1 - travelEase * 0.18 + Math.sin(fade * Math.PI) * 0.05);
    this.wishPaper.material.emissiveIntensity = 0.08 + Math.min(elapsed / 1.6, 1) * 0.72;
    this.wishPaper.material.opacity = Math.max(0, 1 - eio(fade));

    if (elapsed >= 2.25) this.wishPaper.visible = false;
    if (elapsed < 4.8) return;

    s.phase = 'settled';
    const resolve = s._resolve;
    s._resolve = null;
    s._releasePromise = null;
    if (resolve) resolve();
  }

  _createWishSparkles(origin, startedAt) {
    const colors = ['#fff9f0', '#fff2a8', '#ffb7c5', '#ffd6df', '#ffffff'];
    this.wishSparkles = new THREE.Group();
    this.wishSparkles.userData = { startedAt };

    for (let i = 0; i < 145; i++) {
      const geo = new THREE.SphereGeometry(rand(0.012, 0.034), 7, 7);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      const pt = new THREE.Mesh(geo, mat);
      const angle = rand(0, Math.PI * 2);
      const velocity = new THREE.Vector3(
        Math.cos(angle) * rand(0.25, 1.0),
        rand(0.15, 1.05),
        -rand(0.45, 1.8) + Math.sin(angle) * 0.22,
      );
      pt.userData = {
        origin: origin.clone().add(new THREE.Vector3(rand(-0.55, 0.55), rand(-0.76, 0.76), rand(-0.03, 0.03))),
        velocity,
        delay: rand(0.48, 1.55),
        maxLife: rand(2.2, 4.0),
        phase: rand(0, Math.PI * 2),
        baseScale: rand(0.65, 1.8),
      };
      pt.position.copy(pt.userData.origin);
      pt.renderOrder = 5;
      this.wishSparkles.add(pt);
    }
    this.scene.add(this.wishSparkles);
  }

  _createWishFireworks(startedAt) {
    const colors = ['#fff6b7', '#ffb7c5', '#ffffff', '#ffd6e0', '#ffcf8a'];
    this.wishFireworks = new THREE.Group();
    this.wishFireworks.userData = { startedAt };
    const burstCenters = [
      new THREE.Vector3(-1.45, 3.35, -2.35),
      new THREE.Vector3(1.45, 3.32, -2.35),
      new THREE.Vector3(0, 3.82, -2.55),
      new THREE.Vector3(-0.82, 2.78, -2.2),
      new THREE.Vector3(0.82, 2.82, -2.2),
      new THREE.Vector3(-1.82, 3.86, -2.7),
      new THREE.Vector3(1.82, 3.85, -2.7),
    ];

    for (let burst = 0; burst < burstCenters.length; burst++) {
      const center = burstCenters[burst].clone().add(new THREE.Vector3(rand(-0.08, 0.08), rand(-0.08, 0.08), 0));
      const delay = 1.32 + burst * 0.16 + rand(-0.05, 0.08);
      const count = burst === 3 ? 78 : 62;
      const ringColor = colors[Math.floor(Math.random() * colors.length)];
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.38, 96), new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      }));
      ring.position.copy(center);
      ring.scale.setScalar(0.1);
      ring.renderOrder = 8;
      ring.userData = {
        kind: 'fireworkRing',
        delay,
        maxLife: 1.9,
        baseScale: rand(1.55, 2.35),
        phase: rand(0, Math.PI * 2),
      };
      this.wishFireworks.add(ring);

      for (let i = 0; i < count; i++) {
        const geo = new THREE.SphereGeometry(rand(0.018, 0.052), 7, 7);
        const mat = new THREE.MeshBasicMaterial({
          color: colors[Math.floor(Math.random() * colors.length)],
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
        });
        const pt = new THREE.Mesh(geo, mat);
        const a = rand(0, Math.PI * 2);
        const upward = rand(-0.38, 0.68);
        const dir = new THREE.Vector3(Math.cos(a), upward, Math.sin(a) * 0.55).normalize();
        pt.userData = {
          center,
          velocity: dir.multiplyScalar(rand(0.9, 1.85)),
          delay,
          maxLife: rand(1.45, 2.15),
          phase: rand(0, Math.PI * 2),
          baseScale: rand(0.8, 2.0),
        };
        pt.position.copy(center);
        pt.renderOrder = 4;
        this.wishFireworks.add(pt);
      }
    }
    this.scene.add(this.wishFireworks);
  }

  _createWishTextTexture(glow = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 162px "Ma Shan Zheng", "KaiTi", serif';
    ctx.shadowColor = glow ? 'rgba(255, 183, 197, 0.72)' : 'rgba(255, 217, 147, 0.46)';
    ctx.shadowBlur = glow ? 58 : 12;
    ctx.lineWidth = glow ? 4 : 8;
    ctx.strokeStyle = glow ? 'rgba(255, 183, 197, 0.34)' : 'rgba(173, 70, 98, 0.92)';
    ctx.fillStyle = glow ? 'rgba(255, 226, 234, 0.48)' : '#fff3e8';
    ctx.strokeText('心想事成', 512, 190);
    ctx.fillText('心想事成', 512, 190);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  _createWishText(startedAt) {
    const glowMat = new THREE.SpriteMaterial({
      map: this._createWishTextTexture(true),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    this.wishTextGlow = new THREE.Sprite(glowMat);
    this.wishTextGlow.position.set(0, 3.02, -2.75);
    this.wishTextGlow.scale.set(3.0, 0.95, 1);
    this.wishTextGlow.renderOrder = 5;
    this.wishTextGlow.userData = { startedAt };
    this.scene.add(this.wishTextGlow);

    const textMat = new THREE.SpriteMaterial({
      map: this._createWishTextTexture(false),
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    this.wishTextSprite = new THREE.Sprite(textMat);
    this.wishTextSprite.position.set(0, 3.02, -2.72);
    this.wishTextSprite.scale.set(2.55, 0.78, 1);
    this.wishTextSprite.renderOrder = 6;
    this.wishTextSprite.userData = { startedAt };
    this.scene.add(this.wishTextSprite);
  }

  _animWishEffects(t) {
    if (this.wishSparkles) {
      const elapsed = t - this.wishSparkles.userData.startedAt;
      this.wishSparkles.children.forEach(pt => {
        const age = elapsed - pt.userData.delay;
        if (age <= 0) {
          pt.material.opacity = 0;
          return;
        }
        const p = Math.min(age / pt.userData.maxLife, 1);
        const drift = eoc(p);
        pt.position.copy(pt.userData.origin)
          .addScaledVector(pt.userData.velocity, drift * 2.8);
        pt.position.x += Math.sin(age * 4.1 + pt.userData.phase) * 0.09 * (1 - p);
        pt.position.y += Math.sin(age * 3.4 + pt.userData.phase) * 0.06;
        pt.material.opacity = Math.max(0, Math.sin(p * Math.PI) * 0.9);
        const twinkle = 0.62 + Math.sin(t * 9.5 + pt.userData.phase) * 0.28;
        pt.scale.setScalar(pt.userData.baseScale * Math.max(0.25, twinkle));
      });
      if (elapsed > 6.4) {
        this._disposeWishObject(this.wishSparkles);
        this.wishSparkles = null;
      }
    }

    if (this.wishFireworks) {
      const elapsed = t - this.wishFireworks.userData.startedAt;
      this.wishFireworks.children.forEach(pt => {
        const age = elapsed - pt.userData.delay;
        if (age <= 0) {
          pt.material.opacity = 0;
          return;
        }
        const p = Math.min(age / pt.userData.maxLife, 1);
        if (pt.userData.kind === 'fireworkRing') {
          const size = pt.userData.baseScale * (0.18 + eoc(p) * 1.15);
          pt.scale.set(size, size, 1);
          pt.rotation.z = pt.userData.phase + p * 0.45;
          pt.material.opacity = Math.max(0, Math.sin(p * Math.PI) * 0.68);
          return;
        }
        pt.position.copy(pt.userData.center)
          .addScaledVector(pt.userData.velocity, eoc(p) * 1.35);
        pt.position.y -= p * p * 0.42;
        pt.material.opacity = Math.max(0, Math.sin(p * Math.PI) * (0.86 + Math.sin(t * 10 + pt.userData.phase) * 0.12));
        pt.scale.setScalar(pt.userData.baseScale * (1.2 + p * 1.8));
      });
      if (elapsed > 5.4) {
        this._disposeWishObject(this.wishFireworks);
        this.wishFireworks = null;
      }
    }

    const textStartedAt = this.wishTextSprite?.userData?.startedAt ?? this.wishTextGlow?.userData?.startedAt;
    if (textStartedAt) {
      const elapsed = t - textStartedAt;
      const show = eoc(Math.min(Math.max((elapsed - 2.12) / 1.05, 0), 1));
      if (this.wishTextGlow) {
        this.wishTextGlow.material.opacity = show * (0.24 + Math.sin(t * 2.4) * 0.035);
        const pulse = 1 + Math.sin(t * 1.8) * 0.025;
        this.wishTextGlow.scale.set(3.0 * pulse, 0.95 * pulse, 1);
      }
      if (this.wishTextSprite) {
        this.wishTextSprite.material.opacity = show * (0.9 + Math.sin(t * 1.5) * 0.03);
        const pulse = 1 + Math.sin(t * 1.5) * 0.018;
        this.wishTextSprite.scale.set(2.55 * pulse, 0.78 * pulse, 1);
      }
    }
  }

  _disposeWishObject(obj) {
    if (!obj) return;
    this.scene?.remove(obj);
    obj.traverse(ch => {
      if (ch.geometry) ch.geometry.dispose();
      if (!ch.material) return;
      const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
      mats.forEach(m => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    });
  }

  _cleanupWishEffects() {
    [this.wishSparkles, this.wishFireworks, this.wishTextSprite, this.wishTextGlow].forEach(obj => this._disposeWishObject(obj));
    this.wishSparkles = null;
    this.wishFireworks = null;
    this.wishTextSprite = null;
    this.wishTextGlow = null;
  }

  // ─── blowCandles ───
  blowCandles() {
    return new Promise((resolve) => {
      const alive = this.flameGroup.filter(f => f.group && f.group.parent);
      if (!alive.length) { resolve(); return; }
      let done = 0; const smoke = [];

      const smokeSpriteMat = new THREE.SpriteMaterial({
        map: this._smokeTex,
        blending: THREE.NormalBlending,
        depthWrite: false,
        depthTest: true,
        transparent: true,
        opacity: 0.55,
      });

      alive.forEach((fo, idx) => {
        setTimeout(() => {
          if (!fo.group || !fo.group.parent) { done++; return; }
          const origX = fo.group.position.x;
          const particles = fo.particles || [];
          // a. 抖动动画
          const shakeStart = performance.now() / 1000;
          const shakeDuration = 0.3;
          const shake = () => {
            const elapsed = performance.now() / 1000 - shakeStart;
            if (elapsed < shakeDuration && fo.group && fo.group.parent) {
              fo.group.position.x = origX + Math.sin(elapsed * 63) * 0.03 * (1 - elapsed / shakeDuration);
              if (fo.light) fo.light.intensity = 1.2 * (1 - elapsed / shakeDuration) + 0.15;
              requestAnimationFrame(shake);
            } else {
              // b. 粒子渐灭（opacity + scale → 0）
              if (fo.group) fo.group.position.x = origX;
              const sTime = performance.now() / 1000;
              const dur = 0.5;
              const ext = () => {
                const elapsed2 = performance.now() / 1000 - sTime;
                const p = Math.min(elapsed2 / dur, 1.0);
                const fade = 1 - eoc(p);
                // 粒子缩小变透明
                for (const sp of particles) {
                  if (!sp || !sp.material) continue;
                  sp.material.opacity = Math.max(0, (sp.material.opacity ?? 0.5) * fade);
                  const s = sp.scale;
                  sp.scale.set(
                    Math.max(0.001, s.x * fade),
                    Math.max(0.001, s.y * fade),
                    1
                  );
                }
                if (fo.light) fo.light.intensity = 0.5 * fade;
                if (p < 1.0) { requestAnimationFrame(ext); return; }
                // c. 纹理烟雾 sprite
                const wp2 = new THREE.Vector3(); fo.group.getWorldPosition(wp2);
                for (let s = 0; s < 6; s++) {
                  const smSprite = new THREE.Sprite(smokeSpriteMat.clone());
                  smSprite.position.copy(wp2).add(
                    new THREE.Vector3(rand(-0.04, 0.04), rand(0.01, 0.05), rand(-0.04, 0.04))
                  );
                  const smSize = rand(0.04, 0.09);
                  smSprite.scale.set(smSize, smSize, 1);
                  smSprite.userData = {
                    vel: new THREE.Vector3(rand(-0.06, 0.06), rand(0.18, 0.55), rand(-0.06, 0.06)),
                    life: 0, maxLife: rand(1.5, 2.5),
                  };
                  this.scene.add(smSprite);
                  smoke.push(smSprite);
                }
                // 清理火焰
                if (fo.group.parent) fo.group.parent.remove(fo.group);
                if (fo.light?.parent) fo.light.parent.remove(fo.light);
                fo.group = null; fo.light = null; fo.particles = null;
                done++;
                if (done >= alive.length) this._finishBlow(smoke, resolve);
              };
              ext();
            }
          };
          shake();
        }, idx * 60 + rand(0, 40));
      });
    });
  }

  _finishBlow(smoke, resolve) {
    const up = () => {
      let more = false;
      const dt = 0.016;
      smoke.forEach(s => {
        if (!s.userData) return;
        s.userData.life += dt;
        const progress = s.userData.life / s.userData.maxLife;
        if (progress < 1) {
          s.position.add(s.userData.vel.clone().multiplyScalar(dt));
          // 上浮 + 扩散
          const grow = 1 + progress * 2.5;
          s.scale.setScalar((s.userData.baseScale ?? 0.06) * grow);
          s.material.opacity = 0.5 * (1 - progress) * (1 - progress * 0.3);
          more = true;
        } else {
          this.scene.remove(s);
          if (s.material) s.material.dispose();
        }
      });
      if (more) requestAnimationFrame(up);
      else {
        this.scene.background = new THREE.Color('#0d0820');
        this.scene.fog = new THREE.Fog('#0d0820', 18, 45);
        if (this.candleGlowLight) this.candleGlowLight.intensity = 0.15;
        this.showConfetti(); resolve();
      }
    };
    up();
  }

  // ─── 彩带 ───
  showConfetti() {
    const colors = ['#FF69B4', '#FFD700', '#FFFFFF', '#FFB7C5', '#FFA07A', '#DDA0DD', '#FFE4E1', '#87CEEB'];
    // 多种形状：方片 + 细长条
    for (let i = 0; i < 200; i++) {
      const isStrip = Math.random() < 0.4;
      const w = isStrip ? rand(0.02, 0.04) : rand(0.05, 0.10);
      const h = isStrip ? rand(0.08, 0.18) : rand(0.05, 0.10);
      const geo = new THREE.PlaneGeometry(w, h);
      const mat = new THREE.MeshPhysicalMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.35,
        metalness: 0.05,
        clearcoat: 0.15,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      });
      const piece = new THREE.Mesh(geo, mat);
      piece.position.set(rand(-2.5, 2.5), rand(2.2, 7), rand(-2.5, 2.5));
      piece.rotation.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
      piece.userData = {
        vel: new THREE.Vector3(rand(-0.4, 0.4), rand(-1.2, -0.3), rand(-0.4, 0.4)),
        rot: new THREE.Vector3(rand(0.8, 3), rand(0.8, 3), rand(0.8, 3)),
        windPhase: Math.random() * Math.PI * 2,
        windAmp: rand(0.3, 0.8),
        damping: rand(0.92, 0.98),
      };
      this.scene.add(piece);
      this.confettiParticles.push(piece);
    }
  }

  _animConfetti(t, dt) {
    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i], u = p.userData;
      // 风：正弦水平推力 + 轻微随机
      const windX = Math.sin(t * 1.3 + u.windPhase) * u.windAmp * dt;
      const windZ = Math.cos(t * 0.9 + u.windPhase) * u.windAmp * 0.5 * dt;
      u.vel.x += windX;
      u.vel.z += windZ;
      // 重力 + 阻尼
      u.vel.y -= 0.3 * dt;
      u.vel.x *= u.damping;
      u.vel.z *= u.damping;
      p.position.x += u.vel.x * dt;
      p.position.y += u.vel.y * dt;
      p.position.z += u.vel.z * dt;
      // 旋转加速（空气阻力）
      p.rotation.x += u.rot.x * dt;
      p.rotation.y += u.rot.y * dt;
      p.rotation.z += u.rot.z * dt;
      u.rot.x *= 0.995;
      u.rot.y *= 0.995;
      u.rot.z *= 0.995;
      // 超出范围回收
      if (p.position.y < -4 || Math.abs(p.position.x) > 6 || Math.abs(p.position.z) > 6) {
        this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.confettiParticles.splice(i, 1);
      }
    }
  }

  // ─── 烛光微粒子 ───
  _spawnFlameSparkles(t) {
    if (this.flameGroup.length === 0) return;
    if (!this._sparklePool) {
      this._sparklePool = [];
      const sparkTex = this._glowTex; // 复用光晕纹理
      for (let i = 0; i < 60; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: sparkTex,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: true,
          transparent: true,
          opacity: 0,
        }));
        sp.scale.set(0.008, 0.008, 1);
        sp.visible = false;
        sp.userData = { life: 0, maxLife: 0, vel: new THREE.Vector3(), active: false };
        this.scene.add(sp);
        this._sparklePool.push(sp);
      }
    }

    const now = t;
    // 定期从随机蜡烛生成火花
    if (!this._lastSparkleSpawn || now - this._lastSparkleSpawn > 0.04) {
      this._lastSparkleSpawn = now;
      const fo = this.flameGroup[Math.floor(Math.random() * this.flameGroup.length)];
      if (fo && fo.group && fo.group.parent) {
        const wp = new THREE.Vector3(); fo.group.getWorldPosition(wp);
        // 找一个空闲池中粒子
        const sp = this._sparklePool.find(s => !s.userData.active);
        if (sp) {
          sp.position.copy(wp).add(new THREE.Vector3(rand(-0.02, 0.02), rand(0.02, 0.06), rand(-0.02, 0.02)));
          sp.visible = true;
          sp.material.opacity = rand(0.5, 0.9);
          const s = rand(0.004, 0.014);
          sp.scale.set(s, s, 1);
          sp.userData.active = true;
          sp.userData.life = 0;
          sp.userData.maxLife = rand(0.6, 1.5);
          sp.userData.vel.set(rand(-0.012, 0.012), rand(0.03, 0.08), rand(-0.012, 0.012));
        }
      }
    }
  }

  _animFlameSparkles(t, dt) {
    if (!this._sparklePool) return;
    for (const sp of this._sparklePool) {
      if (!sp.userData.active) continue;
      sp.userData.life += dt;
      const p = sp.userData.life / sp.userData.maxLife;
      if (p >= 1) {
        sp.visible = false;
        sp.userData.active = false;
        sp.material.opacity = 0;
        continue;
      }
      sp.position.x += sp.userData.vel.x * dt;
      sp.position.y += sp.userData.vel.y * dt;
      sp.position.z += sp.userData.vel.z * dt;
      sp.userData.vel.x += Math.sin(sp.userData.life * 10) * 0.003 * dt;
      sp.material.opacity = Math.max(0, 0.8 * (1 - p) * (1 - p * 0.4));
      const s = sp.scale.x * (1 + dt * 0.8);
      sp.scale.setScalar(Math.min(0.025, s));
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
    if (this.composer) this.composer.setSize(w, h);
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
    // 清理火花池
    if (this._sparklePool) {
      this._sparklePool.forEach(sp => {
        this.scene?.remove(sp);
        sp.material.dispose();
      });
      this._sparklePool = null;
    }
    // 清理纹理
    [this._flameTex, this._smokeTex, this._glowTex].forEach(tex => {
      if (tex) tex.dispose();
    });
    this._flameTex = null; this._smokeTex = null; this._glowTex = null;
    // 清理许愿纸
    if (this.wishPaper) {
      this.scene?.remove(this.wishPaper);
      if (this.wishPaper.geometry) this.wishPaper.geometry.dispose();
      if (this.wishPaper.material?.map) this.wishPaper.material.map.dispose();
      if (this.wishPaper.material) this.wishPaper.material.dispose();
      this.wishPaper = null;
    }
    this._cleanupWishEffects?.();
    // 清理 composer
    if (this.composer) {
      this.composer.passes.forEach(p => {
        if (p.dispose) p.dispose();
      });
      this.composer = null;
    }
    this.bloomPass = null;
    this.bokehPass = null;
    if (this.scene) {
      this.scene.traverse(ch => {
        if (ch.geometry && ch !== this.scene) ch.geometry.dispose();
        if (ch.material) {
          const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
          mats.forEach(m => {
            if (m.map && m.map !== this._flameTex && m.map !== this._smokeTex && m.map !== this._glowTex) m.map.dispose();
            m.dispose();
          });
        }
      });
      this.scene.clear();
    }
    this.renderer?.dispose();
    if (this.container && this.renderer?.domElement?.parentElement === this.container) this.container.removeChild(this.renderer.domElement);
    this.controls?.dispose();
    Object.assign(this, {
      scene: null, camera: null, renderer: null, composer: null, bloomPass: null, bokehPass: null, controls: null,
      flameGroup: [], confettiParticles: [], wishPaper: null, paperAnimState: null,
      wishSparkles: null, wishFireworks: null, wishTextSprite: null, wishTextGlow: null,
      _flameTex: null, _smokeTex: null, _glowTex: null,
    });
  }
}
