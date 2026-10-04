/* ═══════════════════════════════════════════════════════════
   WORLD — persistent WebGL layer behind the DOM.
   Four scenes, one renderer, camera + lights driven by scroll.
   v2: procedural wood/marble/fabric textures, detailed models,
       per-aspect (mobile) camera layouts, chapter fade support.
   ═══════════════════════════════════════════════════════════ */
import * as THREE from "three";
import { SERVICES } from "./config.js";

const damp = (current, target, lambda, dt) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.isMobile = matchMedia("(max-width: 768px)").matches || innerWidth < 768;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.isMobile, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.isMobile ? 1.75 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.clock = new THREE.Clock();
    this.state = { chapter: "hero", p: 0, service: -1, finish: "fabric", mouse: { x: 0, y: 0 }, dragVel: 0 };
    this.turntable = { rot: 0, vel: 0.15 };

    this.mat = this.materials();
    this.buildHero();
    this.buildServices();
    this.buildFurniture();
    this.buildFloorplan();

    addEventListener("resize", () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => {
      try { this.tick(); }
      catch (err) {
        console.error("[world] tick failed:", err);
        window.__worldError = String(err?.stack ?? err);
        this.renderer.setAnimationLoop(null); // stop thrashing; DOM still works
      }
    });
  }

  /* ── procedural textures ─────────────────────────────── */
  canvasTexture(draw, { size = 512, rx = 1, ry = 1, srgb = true } = {}) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    draw(c.getContext("2d"), size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  woodTexture(rx = 2, ry = 2, base = "#5a3a22") {
    return this.canvasTexture((g, s) => {
      g.fillStyle = base; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 130; i++) {
        const l = 30 + Math.random() * 45;
        g.strokeStyle = `rgba(${l},${l * 0.62},${l * 0.34},${0.14 + Math.random() * 0.28})`;
        g.lineWidth = 0.8 + Math.random() * 2.4;
        const y = Math.random() * s;
        g.beginPath(); g.moveTo(-4, y);
        for (let x = 0; x <= s + 4; x += 28)
          g.lineTo(x, y + Math.sin(x * 0.018 + i * 1.7) * 5 + (Math.random() - 0.5) * 3);
        g.stroke();
      }
      // cathedral grain arcs
      for (let i = 0; i < 7; i++) {
        g.strokeStyle = `rgba(28,16,8,${0.10 + Math.random() * 0.12})`;
        g.lineWidth = 1.6;
        const cx = Math.random() * s, cy = Math.random() * s;
        for (let r = 8; r < 60; r += 7) { g.beginPath(); g.ellipse(cx, cy, r * 1.6, r, 0.3, 0, Math.PI * 1.4); g.stroke(); }
      }
      // plank seams
      g.strokeStyle = "rgba(18,10,5,.55)"; g.lineWidth = 3;
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, (s * i) / 4); g.lineTo(s, (s * i) / 4); g.stroke(); }
    }, { size: 512, rx, ry });
  }

  marbleTexture(rx = 5, ry = 5) {
    return this.canvasTexture((g, s) => {
      const grad = g.createLinearGradient(0, 0, s, s);
      grad.addColorStop(0, "#ece5d8"); grad.addColorStop(0.5, "#e4dccd"); grad.addColorStop(1, "#efe8db");
      g.fillStyle = grad; g.fillRect(0, 0, s, s);
      // soft clouds
      for (let i = 0; i < 26; i++) {
        g.fillStyle = `rgba(214,205,188,${0.05 + Math.random() * 0.09})`;
        g.beginPath();
        g.ellipse(Math.random() * s, Math.random() * s, 30 + Math.random() * 90, 16 + Math.random() * 50, Math.random() * 3, 0, 7);
        g.fill();
      }
      // veins: random-walk strokes with tiny branches
      for (let v = 0; v < 16; v++) {
        g.strokeStyle = `rgba(146,136,118,${0.16 + Math.random() * 0.2})`;
        g.lineWidth = 0.7 + Math.random() * 1.7;
        let x = Math.random() * s, y = Math.random() * s, a = Math.random() * Math.PI * 2;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 26; k++) {
          a += (Math.random() - 0.5) * 0.9;
          x += Math.cos(a) * 22; y += Math.sin(a) * 22;
          g.lineTo(x, y);
          if (Math.random() < 0.2) { g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30); g.moveTo(x, y); }
        }
        g.stroke();
      }
    }, { size: 512, rx, ry });
  }

  fabricTexture(base = "#e9e2d2") {
    return this.canvasTexture((g, s) => {
      g.fillStyle = base; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 9000; i++) {
        const l = Math.random();
        g.fillStyle = l > 0.5 ? "rgba(255,255,255,.05)" : "rgba(90,80,60,.05)";
        g.fillRect(Math.random() * s, Math.random() * s, 1.6, 1.6);
      }
      // weave lines
      g.strokeStyle = "rgba(120,108,86,.06)"; g.lineWidth = 1;
      for (let i = 0; i < s; i += 5) { g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke(); }
    }, { size: 256, rx: 3, ry: 3 }, );
  }

  /* ── shared material library ─────────────────────────── */
  materials() {
    const woodMap = this.woodTexture(1.4, 1.4);
    const floorMarble = this.marbleTexture(6, 6);
    const wallMarble = this.marbleTexture(2, 2);
    const fabricMap = this.fabricTexture();
    const ivoryMap = this.fabricTexture("#e6ddc9");

    const brass = new THREE.MeshPhysicalMaterial({
      color: 0xc9a227, metalness: 1, roughness: 0.24,
      clearcoat: 0.5, clearcoatRoughness: 0.25,
      emissive: 0x2a1f04, emissiveIntensity: 0.35,
    });
    const brassDark = new THREE.MeshPhysicalMaterial({ color: 0x8a6d15, metalness: 1, roughness: 0.35 });
    const walnut = new THREE.MeshPhysicalMaterial({ map: woodMap, bumpMap: woodMap, bumpScale: 0.35, roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.5 });
    const walnutDark = new THREE.MeshPhysicalMaterial({ map: this.woodTexture(1.2, 1.2, "#3f2817"), bumpMap: woodMap, bumpScale: 0.3, roughness: 0.5, clearcoat: 0.25 });
    const ivory = new THREE.MeshPhysicalMaterial({ map: ivoryMap, bumpMap: ivoryMap, bumpScale: 0.25, roughness: 0.8, sheen: 0.4, sheenColor: new THREE.Color(0xfff6e0) });
    const fabric = new THREE.MeshPhysicalMaterial({ map: fabricMap, bumpMap: fabricMap, bumpScale: 0.3, roughness: 0.85, sheen: 0.5, sheenColor: new THREE.Color(0xfff2d8) });
    const white = new THREE.MeshPhysicalMaterial({ color: 0xf4f1ea, roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.4 });
    const marble = new THREE.MeshPhysicalMaterial({ map: wallMarble, roughness: 0.16, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    const floorM = new THREE.MeshPhysicalMaterial({ map: floorMarble, bumpMap: floorMarble, bumpScale: 0.15, roughness: 0.14, clearcoat: 0.85, clearcoatRoughness: 0.2, envMapIntensity: 1.1 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a2129, roughness: 0.6 });
    const inkMatte = new THREE.MeshStandardMaterial({ color: 0x171d23, roughness: 0.55, metalness: 0.15 });
    const tealGlow = new THREE.MeshStandardMaterial({ color: 0x2ec4c6, emissive: 0x2ec4c6, emissiveIntensity: 2.2 });
    const warmGlow = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffbf6e, emissiveIntensity: 2.4 });
    const shadeMat = new THREE.MeshPhysicalMaterial({ color: 0xf3ead6, emissive: 0xffdca0, emissiveIntensity: 0.55, roughness: 0.6, side: THREE.DoubleSide });
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0xbfeef0, metalness: 0, roughness: 0.05, transmission: 0.9, transparent: true, opacity: 0.5 });
    return { brass, brassDark, walnut, walnutDark, ivory, fabric, white, marble, floorM, dark, inkMatte, tealGlow, warmGlow, shadeMat, glassM, woodMap, fabricMap };
  }

  box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }
  cyl(rt, rb, h, seg, mat, x = 0, y = 0, z = 0, parent) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }

  /* ═══════════ HERO — the threshold (detailed) ═══════════ */
  buildHero() {
    const s = new THREE.Scene();
    s.fog = new THREE.FogExp2(0x101418, 0.05);
    s.background = new THREE.Color(0x101418);
    const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 60);

    // marble floor + walnut inlay border
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), this.mat.floorM);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);
    const border = this.box(9.4, 0.012, 0.16, this.mat.brassDark, 0, 0.007, -0.6, s);
    border.castShadow = false;
    const border2 = border.clone(); border2.rotation.y = Math.PI / 2; border2.position.set(4.6, 0.007, 1.2); s.add(border2);
    const border3 = border2.clone(); border3.position.x = -4.6; s.add(border3);
    // rug
    const rug = this.box(3.4, 0.02, 1.8, new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.95 }), 0, 0.011, 0.9, s);
    rug.castShadow = false;
    const rugTrim = this.box(3.44, 0.005, 0.06, this.mat.brassDark, 0, 0.024, 0.9, s); rugTrim.castShadow = false;

    // walls with wainscot moulding
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x161c22, roughness: 0.85 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), wallMat);
    back.position.set(0, 5, -4.2); s.add(back);
    const wallL = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), wallMat);
    wallL.rotation.y = Math.PI / 2; wallL.position.set(-10, 5, 0); s.add(wallL);
    const wallR = wallL.clone(); wallR.position.x = 10; s.add(wallR);
    // wainscot strips on back wall
    for (let i = -3; i <= 3; i++) {
      if (Math.abs(i) < 1.6) continue; // leave the doorway clear
      const strip = this.box(0.05, 3.4, 0.05, new THREE.MeshStandardMaterial({ color: 0x232b33, roughness: 0.7, metalness: 0.2 }), i * 1.35, 1.7, -4.14, s);
      strip.castShadow = false;
    }
    const wainscotRail = this.box(9, 0.06, 0.04, this.mat.brassDark, 0, 1.05, -4.13, s); wainscotRail.castShadow = false;

    // console table (left) with vase + photo frame
    const console = new THREE.Group();
    this.box(1.5, 0.06, 0.5, this.mat.walnut, 0, 0.86, 0, console);
    this.box(1.36, 0.05, 0.4, this.mat.walnutDark, 0, 0.42, 0, console);
    for (const x of [-0.62, 0.62]) this.box(0.07, 0.86, 0.42, this.mat.brassDark, x, 0.43, 0, console);
    const vase = new THREE.Mesh(new THREE.LatheGeometry(
      Array.from({ length: 12 }, (_, i) => { const t = i / 11; return new THREE.Vector2(0.03 + Math.sin(t * Math.PI) * 0.11, t * 0.34); }), 20), this.mat.brass);
    vase.position.set(-0.3, 0.89, 0); vase.castShadow = true; console.add(vase);
    const stem = this.cyl(0.008, 0.012, 0.34, 6, new THREE.MeshStandardMaterial({ color: 0x2e7d4f, roughness: 0.8 }), -0.3, 1.2, 0, console);
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), new THREE.MeshStandardMaterial({ color: 0xb4552d, roughness: 0.7 }), );
    bloom.position.set(-0.3, 1.4, 0); console.add(bloom);
    const photoFrame = new THREE.Group();
    this.box(0.34, 0.44, 0.025, this.mat.brass, 0, 0, 0, photoFrame);
    this.box(0.28, 0.38, 0.03, new THREE.MeshStandardMaterial({ color: 0x0d1114, roughness: 0.4 }), 0, 0, 0.004, photoFrame);
    photoFrame.position.set(0.42, 1.14, 0.02); photoFrame.rotation.y = -0.25;
    console.add(photoFrame);
    console.position.set(-3.1, 0, -2.9);
    s.add(console);

    // brass pendant light (right)
    const pendant = new THREE.Group();
    this.cyl(0.008, 0.008, 1.1, 6, this.mat.brassDark, 0, 0, 0, pendant);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.34, 24, 1, true), this.mat.shadeMat);
    shade.position.y = -0.62; pendant.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), this.mat.warmGlow);
    bulb.position.y = -0.68; pendant.add(bulb);
    const pLight = new THREE.PointLight(0xffc477, 14, 7, 1.8);
    pLight.position.y = -0.75; pendant.add(pLight);
    pendant.position.set(3.2, 3.6, -2.6);
    s.add(pendant);

    // teal floor light strips
    for (const x of [-2.4, 2.4]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 9), this.mat.tealGlow);
      strip.position.set(x, 0.011, -1);
      s.add(strip);
      const pl = new THREE.PointLight(0x2ec4c6, 3, 5.5);
      pl.position.set(x, 0.3, 0);
      s.add(pl);
    }
    // warm sconce above the door — the welcome light
    const sconce = new THREE.PointLight(0xffc477, 7, 6, 1.8);
    sconce.position.set(0, 3.35, -2.1);
    s.add(sconce);

    // ── detailed double doors ──
    const frame = new THREE.Group();
    const jamb = new THREE.BoxGeometry(0.2, 3.24, 0.34);
    for (const x of [-1.16, 1.16]) { const j = new THREE.Mesh(jamb, this.mat.walnut); j.position.set(x, 1.62, 0); j.castShadow = true; frame.add(j); }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.2, 0.34), this.mat.walnut);
    lintel.position.set(0, 3.12, 0); lintel.castShadow = true; frame.add(lintel);
    const transom = this.box(2.2, 0.5, 0.06, this.mat.glassM, 0, 3.44, 0, frame); transom.castShadow = false;
    const transomBar = this.box(2.24, 0.05, 0.08, this.mat.brassDark, 0, 3.2, 0, frame); transomBar.castShadow = false;
    frame.position.set(0, 0, -2.5);
    s.add(frame);

    const doorWood = this.woodTexture(1, 1.6, "#4a2f1b");
    const doorMat = new THREE.MeshPhysicalMaterial({ map: doorWood, bumpMap: doorWood, bumpScale: 0.4, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    const makeDoor = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.06, 0, -2.5);
      const panel = this.box(1.06, 3.0, 0.09, doorMat, -side * 0.53, 1.5, 0, pivot);
      // two raised panels per leaf
      for (const py of [0.78, 2.14]) {
        const inset = this.box(0.62, 1.06, 0.03, doorMat, -side * 0.53, py, 0.055, pivot);
        inset.scale.setScalar(0.98);
        const raised = this.box(0.5, 0.94, 0.035, doorMat, -side * 0.53, py, 0.062, pivot);
        raised.material = new THREE.MeshPhysicalMaterial({ map: doorWood, roughness: 0.36, clearcoat: 0.6 });
      }
      // brass inlay strip + handle + hinges
      const inlay = this.box(0.03, 2.6, 0.02, this.mat.brass, -side * 0.2, 1.5, 0.056, pivot);
      const handleBase = this.cyl(0.035, 0.035, 0.06, 12, this.mat.brass, -side * 0.14, 1.5, 0.1, pivot);
      handleBase.rotation.x = Math.PI / 2;
      const handle = this.cyl(0.026, 0.026, 0.52, 14, this.mat.brass, -side * 0.14, 1.5, 0.13, pivot);
      handle.rotation.x = Math.PI / 2;
      const handleTip = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 12), this.mat.brass);
      handleTip.position.set(-side * 0.14, 1.5 + 0.26, 0.13); pivot.add(handleTip);
      for (const hy of [0.45, 2.55]) {
        const hinge = this.cyl(0.022, 0.022, 0.14, 10, this.mat.brassDark, -side * 0.06, hy, 0.06, pivot);
      }
      s.add(pivot);
      return pivot;
    };
    this.doorL = makeDoor(-1);
    this.doorR = makeDoor(1);

    // warm light behind the doors (the "home" glow)
    this.homeLight = new THREE.PointLight(0xffc477, 0, 18, 1.6);
    this.homeLight.position.set(0, 1.8, -4);
    s.add(this.homeLight);
    const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(4, 5), new THREE.MeshBasicMaterial({ color: 0xffc477, transparent: true, opacity: 0 }));
    glowPlane.position.set(0, 2.2, -3.4);
    s.add(glowPlane);
    this.glowPlane = glowPlane;

    const key = new THREE.DirectionalLight(0xfff1dd, 0.7);
    key.position.set(-6, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    s.add(key);
    s.add(new THREE.AmbientLight(0x223038, 1.15));

    const N = this.isMobile ? 130 : 260;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = Math.random() * 4.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffe3b3, size: 0.02, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.add(this.dust);

    this.heroScene = { scene: s, cam };
  }

  /* ═══════════ SERVICES — morphing objects on a pedestal ═══════════ */
  buildServices() {
    const s = new THREE.Scene();
    s.fog = new THREE.FogExp2(0x101418, 0.07);
    s.background = new THREE.Color(0x101418);
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 60);

    s.add(new THREE.AmbientLight(0x28323c, 1.6));
    const key = new THREE.DirectionalLight(0xfff1dd, 1.5);
    key.position.set(-4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    s.add(key);
    const rim = new THREE.PointLight(0x2ec4c6, 16, 14);
    rim.position.set(4, 3, -3);
    s.add(rim);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 48), this.mat.floorM);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);

    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.14, 64), this.mat.brass);
    ped.position.set(1.2, 0.07, 0);
    ped.receiveShadow = true;
    s.add(ped);
    const halo = new THREE.Mesh(new THREE.RingGeometry(1.95, 2.02, 64), new THREE.MeshBasicMaterial({ color: 0x2ec4c6, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(1.2, 0.012, 0);
    s.add(halo);

    const stage = new THREE.Group();
    stage.position.set(1.2, 0.14, 0);
    s.add(stage);
    this.svStage = stage;

    const builders = {
      sofa: () => {
        const g = new THREE.Group();
        const fabric = this.mat.ivory;
        this.box(2.4, 0.16, 1.05, this.mat.walnutDark, 0, 0.28, 0, g); // base rail
        this.box(2.4, 0.34, 1.05, fabric, 0, 0.52, 0, g);              // seat base
        this.box(2.4, 0.78, 0.26, fabric, 0, 1.05, -0.42, g);          // back
        for (const x of [-1.08, 1.08]) {
          this.box(0.24, 0.28, 1.05, fabric, x, 0.83, 0, g);           // arms lower
          this.box(0.24, 0.34, 1.05, fabric, x, 1.12, 0, g);           // arms upper
        }
        for (const x of [-0.8, 0, 0.8]) {
          const cush = this.box(0.74, 0.22, 0.8, fabric, x, 0.8, 0.04, g);
          cush.rotation.x = -0.03;
        }
        for (const x of [-0.8, 0, 0.8]) {
          const bc = this.box(0.7, 0.5, 0.2, fabric, x, 1.28, -0.36, g);
          bc.rotation.x = -0.12;
        }
        // throw pillows
        const p1 = this.box(0.42, 0.42, 0.14, this.mat.fabric, -0.85, 1.12, -0.14, g); p1.rotation.z = 0.6; p1.rotation.x = -0.15;
        const p2 = this.box(0.4, 0.4, 0.13, this.mat.fabric, 0.88, 1.1, -0.14, g); p2.rotation.z = -0.55; p2.rotation.x = -0.15;
        for (const x of [-1.0, 1.0]) for (const z of [-0.36, 0.36])
          this.cyl(0.05, 0.022, 0.24, 12, this.mat.walnut, x, 0.12, z, g); // tapered legs
        return g;
      },
      counter: () => {
        const g = new THREE.Group();
        this.box(2.6, 0.14, 0.7, this.mat.walnutDark, 0, 0.1, 0, g);          // kick
        this.box(2.6, 0.72, 0.7, this.mat.walnut, 0, 0.55, 0, g);             // body
        this.box(2.72, 0.07, 0.84, this.mat.marble, 0, 0.96, 0, g);           // top
        this.box(2.6, 1.7, 0.1, this.mat.inkMatte, 0, 1.85, -0.55, g);        // back wall
        // backlit shelves with products
        for (let r = 0; r < 3; r++) {
          this.box(2.3, 0.035, 0.26, this.mat.brassDark, 0, 1.32 + r * 0.5, -0.42, g);
          for (let i = 0; i < 5; i++) {
            const col = [0xb4552d, 0x2ec4c6, 0xc9a227, 0x8a6d15, 0x147c7e][(i + r) % 5];
            this.box(0.16, 0.3, 0.14, new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, emissive: col, emissiveIntensity: 0.22 }), -0.92 + i * 0.46, 1.51 + r * 0.5, -0.44, g);
          }
        }
        // sign: brass frame + teal plate
        this.box(1.9, 0.56, 0.05, this.mat.brass, 0, 3.0, -0.52, g);
        this.box(1.74, 0.4, 0.055, this.mat.tealGlow, 0, 3.0, -0.515, g);
        // counter display: two mannequin-ish forms
        this.cyl(0.12, 0.16, 0.5, 14, this.mat.ivory, -0.7, 1.25, 0.05, g);
        new THREE.Mesh(); // noop keep style
        const bust = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.34, 6, 14), this.mat.fabric);
        bust.position.set(0.6, 1.36, 0.02); bust.castShadow = true; g.add(bust);
        return g;
      },
      desk: () => {
        const g = new THREE.Group();
        this.box(2.5, 0.09, 1.2, this.mat.walnut, 0, 0.95, 0, g);              // top
        // drawer pedestal
        this.box(0.5, 0.86, 1.05, this.mat.walnutDark, 0.85, 0.51, 0, g);
        for (let i = 0; i < 3; i++) {
          this.box(0.4, 0.2, 0.02, this.mat.brassDark, 0.85, 0.3 + i * 0.28, 0.54, g);
          this.box(0.12, 0.03, 0.03, this.mat.brass, 0.85, 0.3 + i * 0.28, 0.56, g);
        }
        for (const x of [-1.1]) this.box(0.08, 0.9, 1.05, this.mat.dark, x, 0.5, 0, g);
        this.box(2.4, 0.06, 0.06, this.mat.brassDark, 0, 0.06, 0.5, g);        // stretcher
        // monitor + keyboard + lamp
        this.box(0.95, 0.55, 0.04, new THREE.MeshStandardMaterial({ color: 0x0c1116, emissive: 0x2ec4c6, emissiveIntensity: 0.75 }), -0.2, 1.42, -0.25, g);
        this.cyl(0.03, 0.13, 0.26, 12, this.mat.brass, -0.2, 1.11, -0.28, g);
        this.box(0.62, 0.02, 0.22, this.mat.inkMatte, -0.25, 1.005, 0.12, g);  // keyboard
        const lampArm = this.box(0.03, 0.5, 0.03, this.mat.brassDark, 0.55, 1.25, -0.3, g); lampArm.rotation.z = 0.3;
        const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 16, 1, true), this.mat.shadeMat);
        lampHead.position.set(0.42, 1.5, -0.3); lampHead.rotation.z = 1.2; g.add(lampHead);
        // task chair
        const ch = new THREE.Group();
        this.cyl(0.16, 0.16, 0.06, 16, this.mat.dark, 0, 0.03, 0, ch);
        this.cyl(0.03, 0.03, 0.34, 10, this.mat.brassDark, 0, 0.22, 0, ch);
        this.box(0.46, 0.07, 0.46, this.mat.fabric, 0, 0.42, 0, ch);
        this.box(0.44, 0.5, 0.07, this.mat.fabric, 0, 0.72, -0.2, ch);
        ch.position.set(-0.15, 0, 0.95); ch.rotation.y = 0.5;
        g.add(ch);
        return g;
      },
      plan: () => {
        const g = new THREE.Group();
        const paper = this.box(2.9, 0.05, 2.1, this.mat.ivory, 0, 0.03, 0, g);
        // room patches
        const patch = (w, d, x, z, color) => {
          const p = this.box(w, 0.012, d, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }), x, 0.062, z, g);
          p.castShadow = false;
        };
        patch(1.2, 1.8, -0.75, 0.05, 0xe8dcc4);
        patch(1.3, 0.9, 0.75, -0.5, 0xd9e6e0);
        patch(1.3, 0.8, 0.75, 0.6, 0xe4d2bd);
        // walls with door gaps
        const wm = this.mat.white;
        const seg = (w, d, x, z) => { const m = this.box(w, 0.5, d, wm, x, 0.31, z, g); return m; };
        seg(2.9, 0.07, 0, -1.0); seg(0.9, 0.07, -1.0, 1.0); seg(0.9, 0.07, 1.0, 1.0);
        seg(0.07, 2.1, -1.42, 0); seg(0.07, 2.1, 1.42, 0);
        seg(0.07, 0.75, -0.35, 0.15); seg(0.07, 0.75, 0.65, -0.55);
        this.planWalls = g.children.filter((c) => c.geometry?.parameters?.height === 0.5);
        // mini furniture
        this.box(0.7, 0.14, 0.34, this.mat.fabric, -1.0, 0.14, -0.6, g);
        this.box(0.5, 0.4, 0.06, this.mat.walnutDark, -1.0, 0.26, -0.94, g);
        this.box(0.5, 0.2, 0.32, this.mat.white, 1.1, 0.16, 0.75, g);
        this.box(0.6, 0.5, 0.3, this.mat.walnut, 1.0, 0.31, -0.75, g);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), this.mat.warmGlow);
        lamp.position.set(0, 1.05, 0.25); g.add(lamp);
        return g;
      },
      wardrobe: () => {
        const g = new THREE.Group();
        // plinth + carcass + crown
        this.box(1.8, 0.1, 0.82, this.mat.walnutDark, 0, 0.05, 0, g);
        this.box(1.7, 2.16, 0.75, this.mat.white, 0, 1.18, 0, g);
        this.box(1.78, 0.09, 0.82, this.mat.walnut, 0, 2.31, 0, g);
        // interior: shelves + rod (visible when doors open)
        for (const y of [0.72, 1.26, 1.8]) this.box(1.6, 0.025, 0.68, this.mat.ivory, 0, y, 0, g);
        this.cyl(0.014, 0.014, 1.56, 8, this.mat.brassDark, 0, 1.55, 0, g).rotation.z = Math.PI / 2;
        // hinged leaves with inset panels + mirrors
        const makeLeaf = (side) => {
          const pivot = new THREE.Group();
          pivot.position.set(side * 0.85, 1.18, 0.38);
          const leaf = this.box(0.82, 2.08, 0.05, new THREE.MeshPhysicalMaterial({ color: 0xefe9dd, roughness: 0.28, clearcoat: 0.65 }), -side * 0.41, 0, 0, pivot);
          this.box(0.34, 1.5, 0.02, this.mat.glassM, -side * 0.55, 0.2, 0.03, pivot); // mirror
          this.box(0.34, 0.44, 0.02, new THREE.MeshPhysicalMaterial({ color: 0xe2dac8, roughness: 0.4 }), -side * 0.55, -0.68, 0.03, pivot);
          this.cyl(0.014, 0.014, 0.36, 10, this.mat.brass, -side * 0.08, 0, 0.05, pivot);
          g.add(pivot);
          return pivot;
        };
        this.wardL = makeLeaf(-1);
        this.wardR = makeLeaf(1);
        return g;
      },
      chair: () => {
        const g = new THREE.Group();
        // seat + tufted back
        const seat = this.box(0.95, 0.24, 0.9, this.mat.fabric, 0, 0.62, 0.1, g); seat.rotation.x = -0.08;
        const back = this.box(0.95, 0.95, 0.2, this.mat.fabric, 0, 1.12, -0.38, g); back.rotation.x = 0.24;
        for (const [bx, by] of [[-0.24, 1.02], [0.24, 1.02], [0, 1.3], [-0.22, 1.34], [0.22, 1.34]]) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), this.mat.brassDark);
          b.position.set(bx, by, -0.27); g.add(b);
        }
        // arm rest frames
        for (const x of [-0.5, 0.5]) {
          this.box(0.13, 0.05, 0.85, this.mat.walnut, x, 0.72, 0.08, g);   // arm top
          this.box(0.05, 0.3, 0.05, this.mat.walnut, x, 0.9, -0.28, g);    // arm post
          this.box(0.12, 0.32, 0.06, this.mat.walnut, x, 0.66, 0.4, g);    // front post
        }
        // brass swivel base
        this.cyl(0.06, 0.28, 0.5, 20, this.mat.brass, 0, 0.28, 0, g);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const leg = this.box(0.5, 0.03, 0.05, this.mat.brass, Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3, g);
          leg.rotation.y = -a + Math.PI / 2;
        }
        // ottoman
        const ot = new THREE.Group();
        this.box(0.55, 0.18, 0.5, this.mat.fabric, 0, 0.24, 0, ot);
        this.cyl(0.05, 0.14, 0.16, 14, this.mat.brass, 0, 0.08, 0, ot);
        ot.position.set(0.95, 0, 0.55); ot.rotation.y = -0.4;
        g.add(ot);
        return g;
      },
    };

    this.svObjects = SERVICES.map((svc) => {
      const g = builders[svc.object]();
      g.visible = false;
      g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      stage.add(g);
      return g;
    });
    if (this.svObjects[0]) this.svObjects[0].visible = true;
    this.svCurrent = 0;
    this.svMeltT = 1;

    this.servicesScene = { scene: s, cam };
  }

  /* ═══════════ FURNITURE — showroom turntable (detailed) ═══════════ */
  buildFurniture() {
    const s = new THREE.Scene();
    s.fog = new THREE.FogExp2(0x101418, 0.04);
    s.background = new THREE.Color(0x101418);
    const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 60);

    s.add(new THREE.AmbientLight(0x26313a, 2.2));
    const spotA = new THREE.SpotLight(0xfff1dd, 160, 26, 0.5, 0.6);
    spotA.position.set(-5, 8, 5);
    spotA.castShadow = true;
    spotA.shadow.mapSize.set(1024, 1024);
    s.add(spotA);
    this.furnSpotA = spotA;
    const spotB = new THREE.SpotLight(0x2ec4c6, 20, 20, 0.6, 0.7);
    spotB.position.set(6, 6, -5);
    s.add(spotB);
    const fill = new THREE.PointLight(0xffd9a0, 12, 14);
    fill.position.set(0, 3, 4);
    s.add(fill);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 48), this.mat.floorM);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);
    // dark rug under the display
    const rug = new THREE.Mesh(new THREE.CircleGeometry(4.6, 48), new THREE.MeshStandardMaterial({ color: 0x1c232a, roughness: 0.95 }));
    rug.rotation.x = -Math.PI / 2; rug.position.y = 0.005; rug.receiveShadow = true;
    s.add(rug);
    // brass halo ring behind (depth + brand glow)
    const halo = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.022, 12, 90), new THREE.MeshStandardMaterial({ color: 0xc9a227, emissive: 0xc9a227, emissiveIntensity: 1.1, metalness: 1, roughness: 0.3 }));
    halo.position.set(0, 2.1, -3.6);
    s.add(halo);

    const tt = new THREE.Group();
    s.add(tt);
    this.tt = tt;

    const pieces = [];
    // ── lounge armchair with ottoman ──
    const chair = new THREE.Group();
    const fabric = new THREE.MeshPhysicalMaterial({ map: this.mat.fabricMap, bumpMap: this.mat.fabricMap, bumpScale: 0.3, color: 0xede6d6, roughness: 0.82, sheen: 0.5 });
    this.furnFabric = fabric;
    const seatC = this.box(1.0, 0.26, 0.95, fabric, 0, 0.6, 0.05, chair);
    const backC = this.box(1.0, 1.02, 0.22, fabric, 0, 1.12, -0.4, chair); backC.rotation.x = 0.22;
    for (const [bx, by] of [[-0.25, 1.0], [0.25, 1.0], [0, 1.28]]) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), this.mat.brassDark);
      btn.position.set(bx, by, -0.28); chair.add(btn);
    }
    for (const x of [-0.55, 0.55]) {
      this.box(0.14, 0.06, 0.9, this.mat.walnut, x, 0.86, 0.02, chair);
      this.box(0.05, 0.32, 0.05, this.mat.walnut, x, 1.0, -0.34, chair);
      this.box(0.12, 0.34, 0.06, this.mat.walnut, x, 0.68, 0.42, chair);
    }
    this.cyl(0.07, 0.32, 0.48, 20, this.mat.brass, 0, 0.26, 0.05, chair);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const leg = this.box(0.46, 0.03, 0.05, this.mat.brass, Math.cos(a) * 0.3, 0.04, 0.05 + Math.sin(a) * 0.3, chair);
      leg.rotation.y = -a + Math.PI / 2;
    }
    const otto = new THREE.Group();
    this.box(0.6, 0.2, 0.52, fabric, 0, 0.26, 0, otto);
    this.cyl(0.05, 0.16, 0.16, 14, this.mat.brass, 0, 0.08, 0, otto);
    otto.position.set(0.1, 0, 0.95); chair.add(otto);
    chair.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    pieces.push({ g: chair, x: -2.5, pedestal: 0.42 });

    // ── coffee table with shelf + books ──
    const table = new THREE.Group();
    const tTop = this.cyl(0.85, 0.85, 0.06, 44, this.mat.marble, 0, 0.74, 0, table);
    const tShelf = this.cyl(0.62, 0.62, 0.04, 40, this.mat.walnut, 0, 0.3, 0, table);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = this.cyl(0.028, 0.028, 0.72, 12, this.mat.brass, Math.cos(a) * 0.52, 0.36, Math.sin(a) * 0.52, table);
      leg.rotation.z = Math.cos(a) * 0.1; leg.rotation.x = -Math.sin(a) * 0.1;
    }
    // books on shelf
    for (let i = 0; i < 4; i++)
      this.box(0.22, 0.035, 0.16, new THREE.MeshStandardMaterial({ color: [0xb4552d, 0x147c7e, 0xc9a227, 0x5c3a21][i], roughness: 0.7 }), -0.2 + i * 0.05, 0.36 + i * 0.037, 0.1, table).rotation.y = 0.3;
    const vase = new THREE.Mesh(new THREE.LatheGeometry(
      Array.from({ length: 12 }, (_, i) => { const t = i / 11; return new THREE.Vector2(0.05 + Math.sin(t * Math.PI) * 0.13, t * 0.44); }), 22), this.mat.brass);
    vase.position.set(0.25, 0.77, -0.1); vase.castShadow = true; table.add(vase);
    const sprig = this.cyl(0.006, 0.008, 0.3, 6, new THREE.MeshStandardMaterial({ color: 0x2e7d4f, roughness: 0.8 }), 0.25, 1.0, -0.1, table);
    table.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    pieces.push({ g: table, x: 0, pedestal: 0.3 });

    // ── white bookshelf (their real product, detailed) ──
    const shelf = new THREE.Group();
    this.box(0.06, 2.06, 0.44, this.mat.white, -0.47, 1.06, 0, shelf);
    this.box(0.06, 2.06, 0.44, this.mat.white, 0.47, 1.06, 0, shelf);
    this.box(1.0, 0.05, 0.44, this.mat.white, 0, 2.06, 0, shelf);
    this.box(1.0, 0.05, 0.44, this.mat.white, 0, 0.06, 0, shelf);
    this.box(1.0, 1.3, 0.02, this.mat.white, 0, 1.06, -0.21, shelf);
    const inner = this.mat.white;
    for (let i = 1; i < 4; i++) this.box(0.9, 0.03, 0.4, inner, 0, i * 0.5, 0, shelf);
    const bookCols = [0xb4552d, 0x2ec4c6, 0x5c3a21, 0xc9a227, 0x147c7e, 0x8a2f2f];
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 6; i++) {
        const h = 0.2 + Math.random() * 0.1;
        const b = this.box(0.05, h, 0.18, new THREE.MeshStandardMaterial({ color: bookCols[(i + r * 2) % 6], roughness: 0.75 }), -0.3 + i * 0.09 + (Math.random() - 0.5) * 0.02, 0.09 + r * 0.5 + h / 2, 0.02, shelf);
        b.rotation.y = (Math.random() - 0.5) * 0.14;
      }
    }
    // top: plant + globe
    const pot = this.cyl(0.09, 0.07, 0.14, 14, this.mat.white, 0.28, 2.16, 0, shelf);
    const plant = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), new THREE.MeshStandardMaterial({ color: 0x3d8b4f, roughness: 0.9 }));
    plant.position.set(0.28, 2.32, 0); shelf.add(plant);
    const globe = this.cyl(0.06, 0.06, 0.02, 16, this.mat.brass, -0.28, 2.14, 0, shelf);
    const gSphere = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 14), new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.9, roughness: 0.3 }));
    gSphere.position.set(-0.28, 2.24, 0); shelf.add(gSphere);
    shelf.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    pieces.push({ g: shelf, x: 2.5, pedestal: 0.42 });

    for (const p of pieces) {
      const ped = this.cyl(0.95, 1.05, p.pedestal, 48, this.mat.inkMatte, p.x, p.pedestal / 2, 0, tt);
      const rimR = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.014, 10, 60), this.mat.brass);
      rimR.rotation.x = Math.PI / 2; rimR.position.set(p.x, p.pedestal + 0.005, 0); tt.add(rimR);
      p.g.position.set(p.x, p.pedestal, 0);
      tt.add(p.g);
    }

    this.furnitureScene = { scene: s, cam };
  }

  /* ═══════════ FLOOR PLAN → HOME (detailed) ═══════════ */
  buildFloorplan() {
    const s = new THREE.Scene();
    s.fog = new THREE.FogExp2(0x101418, 0.045);
    s.background = new THREE.Color(0x101418);
    const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 60);

    s.add(new THREE.AmbientLight(0x2a343e, 1.7));
    this.fpWarm = new THREE.PointLight(0xffc477, 0, 14, 1.3);
    this.fpWarm.position.set(0, 3.2, 0);
    s.add(this.fpWarm);
    const cool = new THREE.DirectionalLight(0x9adfe0, 0.4);
    cool.position.set(-6, 8, 4);
    s.add(cool);

    const table = new THREE.Mesh(new THREE.CircleGeometry(11, 48), this.mat.inkMatte);
    table.rotation.x = -Math.PI / 2;
    table.receiveShadow = true;
    s.add(table);

    const g = new THREE.Group();
    g.position.y = 0.02;
    s.add(g);
    this.fpGroup = g;

    // drafting paper
    const paper = this.box(6.8, 0.02, 5.0, this.mat.ivory, 0, 0.01, 0, g);
    paper.castShadow = false;
    // room floor patches
    const patch = (w, d, x, z, color) => {
      const p = this.box(w, 0.014, d, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }), x, 0.024, z, g);
      p.castShadow = false;
    };
    patch(3.1, 4.4, -1.65, 0, 0xe8dcc4);      // living
    patch(3.1, 2.1, 1.65, -1.15, 0xd9e6e0);   // kitchen
    patch(3.1, 2.1, 1.65, 1.15, 0xe4d2bd);    // bedroom

    const wallMat = new THREE.MeshPhysicalMaterial({ color: 0xf0e9db, roughness: 0.55 });
    const mkWall = (w, d, x, z) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), wallMat);
      wall.position.set(x, 0.02, z);
      wall.scale.y = 0.004;
      wall.castShadow = true;
      g.add(wall);
      return wall;
    };
    // outer walls (front has a door gap) + inner partitions
    this.fpWalls = [
      mkWall(6.8, 0.12, 0, -2.5),
      mkWall(2.6, 0.12, -2.1, 2.5), mkWall(2.6, 0.12, 2.1, 2.5), // door gap in middle
      mkWall(0.12, 5.0, -3.4, 0), mkWall(0.12, 5.0, 3.4, 0),
      mkWall(0.12, 2.4, -0.3, -1.3), mkWall(0.12, 1.4, -0.3, 1.8),   // divider w/ gap
      mkWall(2.0, 0.12, 1.4, 0.1),                                    // bedroom wall w/ gap
    ];

    const mkBox = (w, h, d, x, z, color) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhysicalMaterial({ color, roughness: 0.7 }));
      m.position.set(x, 0.02, z); m.scale.y = 0.01;
      m.castShadow = true;
      g.add(m);
      return m;
    };
    this.fpFurniture = [
      mkBox(1.5, 0.55, 0.65, -2.4, -0.6, 0xede6d6),   // sofa base
      mkBox(1.5, 0.75, 0.22, -2.4, -1.15, 0xede6d6),  // sofa back
      mkBox(1.3, 0.9, 0.08, -2.5, 0.9, 0x4a2f1b),     // tv panel
      mkBox(0.5, 0.5, 0.5, -0.9, 0.4, 0xc9a227),      // coffee table
      mkBox(1.5, 0.55, 1.9, 2.4, 1.3, 0xf4f1ea),      // bed
      mkBox(1.5, 0.9, 0.1, 2.4, 2.3, 0x5c3a21),       // headboard
      mkBox(0.9, 0.85, 0.6, 2.7, -1.8, 0xefe9dd),     // wardrobe
      mkBox(1.8, 0.8, 0.55, 1.0, -2.1, 0xe8e0d0),     // kitchen counter
    ];

    // warm ceiling lamps with visible light cones
    this.fpLamps = [];
    for (const [x, z] of [[-2.2, -0.3], [0.6, 0.6], [2.4, 1.3], [2.4, -1.5]]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), this.mat.warmGlow.clone());
      lamp.material.emissiveIntensity = 0;
      lamp.position.set(x, 0.05, z);
      g.add(lamp);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.85, 1.9, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffc477, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
      );
      cone.position.set(x, 0.05, z);
      g.add(cone);
      this.fpLamps.push({ lamp, cone });
    }

    this.floorplanScene = { scene: s, cam };
  }

  /* ── API called from scroll choreography ─────────────── */
  setChapter(name) {
    document.body.dataset.chapter = name; // CSS fades the canvas on non-3D chapters
    if (this.state.chapter === name) return;
    this.state.chapter = name;
    const vis = {
      heroScene: name === "hero",
      servicesScene: name === "services",
      furnitureScene: name === "furniture" || name === "stats",
      floorplanScene: name === "contact",
    };
    for (const key of ["heroScene", "servicesScene", "furnitureScene", "floorplanScene"])
      if (this[key]) this[key].scene.visible = vis[key];
  }
  setProgress(p) { this.state.p = p; }
  setService(i) {
    if (i === this.state.service) return;
    this.state.service = i;
    if (i >= 0 && i < this.svObjects.length && i !== this.svCurrent) {
      this.svPrev = this.svCurrent;
      this.svCurrent = i;
      this.svMeltT = 0;
    }
  }
  setFinish(name) { this.state.finish = name; }
  addDrag(dx) { this.turntable.vel = THREE.MathUtils.clamp(this.turntable.vel + dx * 0.02, -3, 3); }

  /* ── responsive camera layouts ───────────────────────── */
  layoutCameras() {
    const portrait = innerWidth / innerHeight < 0.9;
    this.portrait = portrait;
    if (portrait) {
      this.L = {
        hero: { pos: [0, 1.7, 10.8], look: [0, 1.6, -2.5], fov: 50, dolly: 4.4 },
        services: { pos: [0, 2.1, 9.8], look: [0, 0.32, 0], fov: 40, stageX: 0 },
        furniture: { pos: [0, 3.0, 12.8], look: [0, 0.85, 0], fov: 38, spotBase: -0.2 },
        floorplan: { r: [7.6, 12.6], y: [9.2, 5.0], a: 0.9, fov: 44, look: [0, 0.3, 0] },
      };
      if (this.svStage) this.svStage.position.x = 0;
    } else {
      this.L = {
        hero: { pos: [0, 1.6, 8.4], look: [0, 1.5, -2.5], fov: 42, dolly: 4.2 },
        services: { pos: [-1.2, 1.7, 6.6], look: [1.2, 1.0, 0], fov: 40, stageX: 1.2 },
        furniture: { pos: [-0.8, 2.6, 10.6], look: [0.5, 0.8, 0], fov: 36, spotBase: -5 },
        floorplan: { r: [7.2, 11.2], y: [8.5, 4.0], a: 0.9, fov: 42, look: [0, 0.3, 0] },
      };
      if (this.svStage) this.svStage.position.x = 1.2;
    }
    for (const key of ["heroScene", "servicesScene", "furnitureScene", "floorplanScene"]) {
      if (!this[key]) continue;
      const cam = this[key].cam;
      const name = { heroScene: "hero", servicesScene: "services", furnitureScene: "furniture", floorplanScene: "floorplan" }[key];
      cam.fov = this.L[name].fov;
      cam.aspect = innerWidth / innerHeight;
      cam.updateProjectionMatrix();
    }
  }

  /* ── per-frame ───────────────────────────────────────── */
  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const st = this.state;
    const t = this.clock.elapsedTime;
    const mx = st.mouse.x, my = st.mouse.y;
    const L = this.L ?? {};

    if (st.chapter === "hero" && this.heroScene) {
      const p = st.p;
      const { cam, scene } = this.heroScene;
      const open = THREE.MathUtils.smoothstep(p, 0.05, 0.55) * 1.9;
      this.doorL.rotation.y = open;
      this.doorR.rotation.y = -open;
      cam.position.z = damp(cam.position.z, L.hero.pos[2] - p * L.hero.dolly, 4, dt);
      cam.position.y = damp(cam.position.y, L.hero.pos[1] + Math.sin(t * 0.4) * 0.05 + my * 0.3, 3, dt);
      cam.position.x = damp(cam.position.x, mx * 0.6, 3, dt);
      cam.lookAt(L.hero.look[0], L.hero.look[1], L.hero.look[2]);
      const lit = THREE.MathUtils.smoothstep(p, 0.15, 0.7);
      this.homeLight.intensity = lit * 26;
      this.glowPlane.material.opacity = lit * 0.35;
      this.renderer.toneMappingExposure = damp(this.renderer.toneMappingExposure, 0.95 + lit * 0.35, 3, dt);
      this.dust.rotation.y = t * 0.014;
      this.renderer.render(scene, cam);
    } else if (st.chapter === "services" && this.servicesScene) {
      const { scene, cam } = this.servicesScene;
      cam.position.x = damp(cam.position.x, L.services.pos[0] + mx * 0.4, 3, dt);
      cam.position.y = damp(cam.position.y, L.services.pos[1] + my * 0.3, 3, dt);
      cam.position.z = damp(cam.position.z, L.services.pos[2], 3, dt);
      cam.lookAt(L.services.look[0], L.services.look[1], L.services.look[2]);
      if (this.svMeltT < 1) this.svMeltT = Math.min(1, this.svMeltT + dt * 1.4);
      const m = this.svMeltT;
      this.svObjects.forEach((g, i) => {
        const active = i === this.svCurrent;
        const leaving = i === this.svPrev && this.svPrev !== undefined && m < 1;
        g.visible = active || leaving;
        if (!g.visible) return;
        const wob = Math.sin(m * Math.PI);
        if (active) {
          const s = m < 1 ? 0.25 + 0.75 * (1 - Math.pow(1 - m, 3)) : 1;
          g.scale.set(s, s * (1 - wob * 0.35), s);
          g.rotation.y = t * 0.25 + (1 - m) * 2.4;
          g.position.y = (1 - m) * -0.5 + wob * 0.08;
        } else if (leaving) {
          const s = 1 - m;
          g.scale.set(s, s * (1 - wob * 0.5) + 0.01, s);
          g.rotation.y = t * 0.25 + m * 2.2;
          g.position.y = (1 - m) * 0.6 - wob * 0.25;
        }
      });
      if (this.planWalls) {
        const grow = this.svCurrent === 3;
        this.planWalls.forEach((w) => { w.scale.y = damp(w.scale.y, grow ? 1 : 0.06, 4, dt); });
      }
      if (this.wardL) {
        const open = this.svCurrent === 4 ? 0.75 : 0.1;
        this.wardL.rotation.y = damp(this.wardL.rotation.y, open, 4, dt);
        this.wardR.rotation.y = damp(this.wardR.rotation.y, -open, 4, dt);
      }
      this.renderer.render(scene, cam);
    } else if (st.chapter === "furniture" && this.furnitureScene) {
      const { scene, cam } = this.furnitureScene;
      this.turntable.vel = damp(this.turntable.vel, 0.15, 1.2, dt);
      this.turntable.rot += this.turntable.vel * dt;
      this.tt.rotation.y = this.turntable.rot;
      cam.position.x = damp(cam.position.x, L.furniture.pos[0] + mx * 1.2, 3, dt);
      cam.position.y = damp(cam.position.y, L.furniture.pos[1], 3, dt);
      cam.position.z = damp(cam.position.z, L.furniture.pos[2], 3, dt);
      cam.lookAt(L.furniture.look[0], L.furniture.look[1], L.furniture.look[2]);
      const spotA = this.furnSpotA;
      spotA.position.x = damp(spotA.position.x, L.furniture.spotBase + mx * 4, 3, dt);
      spotA.position.z = damp(spotA.position.z, 4 + my * 2, 3, dt);
      const finishes = { fabric: 0xede6d6, walnut: 0x6b4527, teal: 0x1d9e9f };
      const target = new THREE.Color(finishes[st.finish] ?? 0xede6d6);
      this.furnFabric.color.lerp(target, 1 - Math.exp(-5 * dt));
      this.renderer.render(scene, cam);
    } else if (st.chapter === "contact" && this.floorplanScene) {
      const p = st.p;
      const { scene, cam } = this.floorplanScene;
      const tilt = THREE.MathUtils.smoothstep(p, 0.1, 0.6);
      const a = THREE.MathUtils.lerp(0.02, L.floorplan.a, tilt);
      const r = THREE.MathUtils.lerp(L.floorplan.r[0], L.floorplan.r[1], tilt);
      cam.position.set(Math.sin(a * 0.9 + mx * 0.2) * r, THREE.MathUtils.lerp(L.floorplan.y[0], L.floorplan.y[1], tilt), Math.cos(a * 0.9) * r);
      cam.lookAt(L.floorplan.look[0], L.floorplan.look[1], L.floorplan.look[2]);
      this.fpWalls.forEach((w, i) => {
        const local = THREE.MathUtils.smoothstep(p, 0.18 + i * 0.04, 0.42 + i * 0.04);
        w.scale.y = damp(w.scale.y, Math.max(0.004, local), 6, dt);
        w.position.y = damp(w.position.y, (local * 1.5) / 2 + 0.02, 6, dt);
      });
      this.fpFurniture.forEach((f, i) => {
        const local = THREE.MathUtils.smoothstep(p, 0.5 + i * 0.045, 0.64 + i * 0.045);
        f.scale.y = damp(f.scale.y, Math.max(0.01, local), 5, dt);
        f.position.y = damp(f.position.y, (f.geometry.parameters.height * local) / 2 + 0.02, 5, dt);
      });
      const lit = THREE.MathUtils.smoothstep(p, 0.68, 0.9);
      this.fpLamps.forEach(({ lamp, cone }, i) => {
        lamp.material.emissiveIntensity = damp(lamp.material.emissiveIntensity, lit * 3, 4, dt);
        lamp.position.y = damp(lamp.position.y, 0.05 + lit * 1.95, 4, dt);
        cone.material.opacity = damp(cone.material.opacity, lit * 0.12, 4, dt);
        cone.position.y = damp(cone.position.y, 0.05 + lit * 1.0, 4, dt);
      });
      this.fpWarm.intensity = damp(this.fpWarm.intensity, lit * 34, 3, dt);
      this.renderer.render(scene, cam);
    }

    st.mouse.x = damp(st.mouse.x, st.mouseTarget?.x ?? 0, 2, dt);
    st.mouse.y = damp(st.mouse.y, st.mouseTarget?.y ?? 0, 2, dt);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.layoutCameras();
  }

  setMouse(x, y) {
    this.state.mouseTarget = { x: (x / innerWidth - 0.5) * 2, y: -(y / innerHeight - 0.5) * 2 };
  }
}
