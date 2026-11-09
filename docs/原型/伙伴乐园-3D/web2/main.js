// 小伙伴乐园 · 大场景：模型来自 Blender（park2），网页负责地面、草树、路、灯光后期、界面和动作。
// 动作照原帖：开场镜头俯冲 → 名牌依次弹出 → 镜头缓慢漂移；倒粮时爆炸框 → 粮箱上传送带 → 镜头跟拍 → 跳进食盆 → 伙伴蹦一下冒爱心；看一天 = 延时昼夜。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const Q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const rnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const backOut = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- 渲染器 ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
const DPR = Math.min(devicePixelRatio || 1, Number(Q.get('dpr')) || 2);
renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, .3, 500);
const ctl = new OrbitControls(cam, renderer.domElement);
ctl.enableDamping = true; ctl.enablePan = false; ctl.minPolarAngle = .35; ctl.maxPolarAngle = 1.2; ctl.minDistance = 6; ctl.maxDistance = 75;
ctl.autoRotateSpeed = .12;                                   // 待机：镜头缓慢漂移（原帖镜头从不静止）
const HOME = { pos: V3(0, 30, 38), tgt: V3(0, 0, -6) };
const TOP = { pos: V3(0, 72, -5.9), tgt: V3(0, 0, -6) };
cam.position.copy(Q.get('intro') === '0' ? HOME.pos : TOP.pos); ctl.target.copy(HOME.tgt);

// ---------- 天、光 ----------
const skyU = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bot: { value: new THREE.Color() } };
scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top, mid, bot; varying vec3 vp; void main(){ float h = vp.y; vec3 c = h > .1 ? mix(mid, top, smoothstep(.1, .7, h)) : mix(bot, mid, smoothstep(-.1, .1, h)); gl_FragColor = vec4(c, 1.); }' })));
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
const hemi = new THREE.HemisphereLight(0xd6ecff, 0x5d7a3a, .75); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe9c8, 3.6); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .04;
sun.target.position.set(0, 0, -6); scene.add(sun, sun.target);
const nightLights = [];

// ---------- 地：草岛、步道、池塘、树 ----------
const clay = o => new THREE.MeshStandardMaterial({ roughness: .85, metalness: 0, ...o });
const IC = V3(0, 0, -4), IR = 27;
{ const top = new THREE.Mesh(new THREE.CylinderGeometry(IR, IR + .2, .3, 96), clay({ color: 0x5c9d3c })); top.position.set(IC.x, -.15, IC.z); top.receiveShadow = true; scene.add(top);
  const dirt = new THREE.Mesh(new THREE.CylinderGeometry(IR + .2, IR - 2, 2.4, 96), clay({ color: 0x9a6c45 })); dirt.position.set(IC.x, -1.5, IC.z); scene.add(dirt);
  const water = new THREE.Mesh(new THREE.CircleGeometry(220, 48), new THREE.MeshStandardMaterial({ color: 0x79c6dc, roughness: .12 })); water.rotation.x = -Math.PI / 2; water.position.y = -2.2; scene.add(water); }

const layout = await (await fetch('./layout.json')).json();
const SAND = clay({ color: 0xe8dcbf, roughness: .95 });
const flat = (geo, m, y = .015) => { const o = new THREE.Mesh(geo, m); o.rotation.x = -Math.PI / 2; o.position.y = y; o.receiveShadow = true; scene.add(o); return o; };
flat(new THREE.RingGeometry(5.4, 7.0, 96), SAND);                                   // 广场外一圈步道
const walks = [];
for (const p of layout.plots) {                                                     // 通往各家的小路（偏开传送带一点）
  const t = p.angle * Math.PI / 180, dir = V3(Math.cos(t), 0, -Math.sin(t)), side = V3(-dir.z, 0, dir.x);
  const a = dir.clone().multiplyScalar(6.8).addScaledVector(side, -1.1), b = dir.clone().multiplyScalar(11.8).addScaledVector(side, -1.1);
  const L = a.distanceTo(b), m = flat(new THREE.PlaneGeometry(L, 1.4), SAND, .02); m.position.x = (a.x + b.x) / 2; m.position.z = (a.z + b.z) / 2; m.rotation.z = Math.atan2(-(b.z - a.z), b.x - a.x);
  walks.push([a, b]);
}
const POND = { x: -8.5, z: 13, r: 3.0 };
flat(new THREE.CircleGeometry(POND.r + .35, 48), clay({ color: 0xa99d8a }), .02);
flat(new THREE.CircleGeometry(POND.r, 48), new THREE.MeshStandardMaterial({ color: 0x4eb4d2, roughness: .06, envMapIntensity: 1.4 }), .05).position.set(POND.x, .05, POND.z);
scene.children.slice(-2).forEach(o => o.position.set(POND.x, o.position.y, POND.z));
{ const R = rnd(5); for (let i = 0; i < 9; i++) { const a = R() * 6.28, d = R() * (POND.r - .6); const pad = new THREE.Mesh(new THREE.CylinderGeometry(.3 + R() * .25, .3, .04, 20), clay({ color: 0x62b35a, roughness: .6 })); pad.position.set(POND.x + Math.cos(a) * d, .09, POND.z + Math.sin(a) * d); scene.add(pad);
  if (i % 3 === 0) { const f = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8), clay({ color: 0xff9dc2, roughness: .5 })); f.position.copy(pad.position).add(V3(0, .1, 0)); scene.add(f); } } }
// 草地要让开的地方：广场、各家地块、小路、池塘
function plotLocal(p, x, z) { const cx = p.center[0], cy = -p.center[2], dx = x - cx, dy = -z - cy, c = Math.cos(p.rot), s = Math.sin(p.rot); return [c * dx + s * dy, -s * dx + c * dy]; }
const segDist = (P, A, B) => { const ab = B.clone().sub(A), t = Math.max(0, Math.min(1, P.clone().sub(A).dot(ab) / ab.lengthSq())); return P.distanceTo(A.clone().addScaledVector(ab, t)); };
function clear(x, z) {
  if (Math.hypot(x, z) < 7.2) return true;
  if (Math.hypot(x - POND.x, z - POND.z) < POND.r + .5) return true;
  for (const p of layout.plots) { const [lx, ly] = plotLocal(p, x, z); if (p.who ? (lx > -3.5 && lx < 3.5 && ly > -4.8 && ly < 2.7) : (Math.abs(lx) < .35 && Math.abs(ly + 2.6) < .35)) return true; }   // 空地里照样长草，只让开牌子
  const P = V3(x, 0, z); for (const [a, b] of walks) if (segDist(P, a, b) < .85) return true;
  return false;
}
const grassU = { time: { value: 0 } };
{ const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-.026, 0, 0, .026, 0, 0, -.017, .085, 0, .017, .085, 0, 0, .2, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, .3, 0, 1, .3, 0, 1, .3, 0, 1, .3, 0, 1, .2], 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute([.35, .35, .35, .35, .35, .35, .8, .8, .8, .8, .8, .8, 1.15, 1.15, 1.1], 3));
  g.setIndex([0, 1, 3, 0, 3, 2, 2, 3, 4]);
  const m = new THREE.MeshStandardMaterial({ roughness: .8, side: THREE.DoubleSide, vertexColors: true });
  m.onBeforeCompile = sh => { sh.uniforms.time = grassU.time; sh.vertexShader = 'uniform float time;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.); float sw = sin(time*1.6 + wp.x*.7 + wp.z*.5)*.5 + sin(time*2.7 + wp.x*1.9)*.25; transformed.x += sw*position.y*.55; transformed.z += sw*position.y*.25;`); };
  const N = Number(Q.get('grass')) || 110000, im = new THREE.InstancedMesh(g, m, N), o = new THREE.Object3D(), c = new THREE.Color(), R = rnd(7); let k = 0, guard = 0;
  while (k < N && guard++ < N * 4) { const a = R() * 6.283, r = Math.sqrt(R()) * (IR - .3), x = IC.x + Math.cos(a) * r, z = IC.z + Math.sin(a) * r; if (clear(x, z)) continue;
    o.position.set(x, 0, z); o.rotation.y = R() * 3.14; const s = .8 + R() * 1.0; o.scale.set(s, s * (.8 + R() * .8), s); o.updateMatrix(); im.setMatrixAt(k, o.matrix); im.setColorAt(k, c.setHSL(.25 + R() * .07, .62 + R() * .2, .36 + R() * .14)); k++; }
  im.count = k; im.receiveShadow = true; scene.add(im);
  const NF = 2200, fl = new THREE.InstancedMesh(new THREE.SphereGeometry(.04, 8, 6), clay({ roughness: .6 }), NF), cols = ['#ffffff', '#ffd6e6', '#fff1a8', '#d9c8ff', '#b9a3ff'], R2 = rnd(99); k = 0; guard = 0;
  while (k < NF && guard++ < NF * 5) { const a = R2() * 6.28, r = Math.sqrt(R2()) * (IR - .5), x = IC.x + Math.cos(a) * r, z = IC.z + Math.sin(a) * r; if (clear(x, z)) continue; o.position.set(x, .14 + R2() * .05, z); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); fl.setMatrixAt(k, o.matrix); fl.setColorAt(k, c.set(cols[k % 5])); k++; }
  fl.count = k; scene.add(fl); }
// 蓬蓬树：一圈围住岛，前方镜头一侧留空（同色的球合并成一块，省绘制次数）
{ const R = rnd(31), PAL = [[.27, .36], [.28, .42], [.30, .40], [.29, .33], [.12, .40], [.13, .47]].map(([h, l]) => clay({ color: new THREE.Color().setHSL(h, .58, l), roughness: .9 }));
  const trunkM = clay({ color: 0x8a5a36 }), bins = PAL.map(() => []), trunks = [], tmp = new THREE.Object3D();
  const pts = []; for (let i = 0; i < 70; i++) { const a = R() * 6.283, r = IR - 1.2 - R() * 4.5, x = IC.x + Math.cos(a) * r, z = IC.z + Math.sin(a) * r; if (z > 6 && Math.abs(x) < 15) continue; if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.5) continue; if (clear(x, z)) continue; if (pts.some(([u, v]) => Math.hypot(u - x, v - z) < 2.2)) continue; pts.push([x, z]); }
  pts.forEach(([x, z]) => { const s = .8 + R() * .7, autumn = R() < .18;
    const tg = new THREE.CylinderGeometry(.16 * s, .24 * s, 1.6 * s, 10); tg.translate(x, .8 * s, z); trunks.push(tg);
    for (let j = 0; j < 8; j++) { const r = (.5 + R() * .45) * s, a = R() * 6.28, d = R() * .7 * s, g = new THREE.IcosahedronGeometry(r, 3);
      g.translate(x + Math.cos(a) * d, 1.8 * s + R() * 1.1 * s, z + Math.sin(a) * d); bins[autumn ? 4 + (j % 2) : j % 4].push(g); } });
  const add = (gs, m) => { if (!gs.length) return; const mesh = new THREE.Mesh(mergeGeometries(gs, false), m); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); };
  add(trunks, trunkM); bins.forEach((gs, k) => add(gs, PAL[k])); }
// 路灯：沿广场步道
{ const pm = clay({ color: 0x4c3f35, roughness: .5 }), lm = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffc46b, emissiveIntensity: 0 });
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 + .3, x = Math.cos(a) * 7.4, z = Math.sin(a) * 7.4; if (z < -4 && Math.abs(x) < 3) continue;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, 1.7, 8), pm); p.position.set(x, .85, z); p.castShadow = true; scene.add(p);
    const l = new THREE.Mesh(new THREE.BoxGeometry(.26, .3, .26), lm); l.position.set(x, 1.8, z); scene.add(l); }
  nightLights.push(lm); }

// ---------- 后期 ----------
const rt = new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(DPR); composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, cam));
const ao = new GTAOPass(scene, cam, innerWidth, innerHeight); ao.updateGtaoMaterial({ radius: .6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 16 }); composer.addPass(ao);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .16, .45, .9); composer.addPass(bloom);
const dof = new BokehPass(scene, cam, { focus: 40, aperture: .0008, maxblur: .006 }); composer.addPass(dof);
composer.addPass(new OutputPass());
const fx = new THREE.Scene();                                   // 爱心、烟单独一层：精灵贴片进主场景会被 AO 画成黑块

// ---------- 模型 ----------
async function loadPark(url) {
  const res = await fetch(url); if (!res.ok) throw new Error('模型文件读取失败 ' + res.status);
  if (!url.endsWith('.json')) return new GLTFLoader().parseAsync(await res.arrayBuffer(), './');
  const js = await res.json(), uri = js.buffers[0].uri, raw = atob(uri.slice(uri.indexOf(',') + 1));
  const bin = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bin[i] = raw.charCodeAt(i);
  delete js.buffers[0].uri;
  const jb = new TextEncoder().encode(JSON.stringify(js)), pad4 = n => (n + 3) & ~3, jl = pad4(jb.length), bl = pad4(bin.length);
  const out = new Uint8Array(28 + jl + bl), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true); out.fill(0x20, 20, 20 + jl); out.set(jb, 20);
  dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004E4942, true); out.set(bin, 28 + jl);
  return new GLTFLoader().parseAsync(out.buffer, './');
}
const gltf = await loadPark(Q.get('glb') || './park2.glb');
scene.add(gltf.scene);
const N = {}, glass = [], lampMats = [];
gltf.scene.traverse(o => {
  if (o.isMesh) { o.castShadow = o.receiveShadow = true; const n = o.material.name;
    if (n === '玻璃') { glass.push(o.material); o.material.roughness = .05; o.material.envMapIntensity = 1.6; }
    if (n === '灯芯' || n === '传送门光') lampMats.push(o.material); }
  if (!N[o.name]) N[o.name] = o;
});
const bbCenter = o => new THREE.Box3().setFromObject(o).getCenter(V3());
// 不会动的零件按材质合并：3000 多个零件 → 几十次绘制（画面不变，只是画得少）
function mergeStatic() {
  const keep = new Set();
  for (const id of ['小狼', '熊猫', '美西螈']) for (const n of ['', '狗粮', '水', '食盆', '水槽']) { const o = N[id + n] || N[id + '/' + n] || (n && id === '小狼' ? N[n] : null); if (o) o.traverse(c => keep.add(c)); }
  gltf.scene.updateMatrixWorld(true);
  const groups = new Map(), drop = [];
  gltf.scene.traverse(o => { if (!o.isMesh || keep.has(o) || o.material.transparent) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    const key = o.material.uuid; if (!groups.has(key)) groups.set(key, { m: o.material, gs: [] }); groups.get(key).gs.push(g); drop.push(o); });
  for (const o of drop) o.parent.remove(o);
  for (const { m, gs } of groups.values()) { const mg = mergeGeometries(gs, false); if (!mg) continue; const mesh = new THREE.Mesh(mg, m); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); }
  return { before: drop.length, after: groups.size };
}

// ---------- 伙伴 ----------
const PETS = [
  { id: '小狼', line: '红围巾是它的记号，耳朵一竖就是听见你了', food: 6, water: 6 },
  { id: '熊猫', line: '背着一根竹子走来走去，随时能啃一口', food: 6, water: 4 },
  { id: '美西螈', line: '住在水边，两边的小鳃一扇一扇', food: 0, water: 5 },
];
const pre = (p, n) => N[p.id + n] || N[p.id + '/' + n] || null;   // GLTFLoader 会去掉节点名里的「/」：熊猫/头 → 熊猫头
for (const p of PETS) {
  p.root = N[p.id]; p.head = pre(p, '头'); p.earL = pre(p, '耳朵左'); p.earR = pre(p, '耳朵右'); p.tail = pre(p, '尾巴');
  p.foodN = pre(p, '狗粮'); p.waterN = pre(p, '水'); p.bowlN = pre(p, '食盆'); p.troughN = pre(p, '水槽');
  p.home = p.root.position.clone(); p.head0 = p.head.rotation.x; p.legs = [];
  p.root.traverse(o => { if (/腿\d$/.test(o.name) && !o.isMesh) p.legs.push(o); });
  const local = v => p.root.parent.worldToLocal(v.clone());
  p.bowlLocal = local(bbCenter(p.bowlN)); p.bowlLocal.y = p.home.y;
  // 溜达的点：家门口附近三处 + 食盆旁
  p.spots = [p.home.clone(), p.home.clone().add(V3(-1.4, 0, .5)), p.home.clone().add(V3(.6, 0, .9)), p.bowlLocal.clone().add(V3(.35, 0, .45))];
  p.walk = { to: 0, wait: 1 + Math.random() * 2 };
  p.tagPt = new THREE.Object3D(); p.head.add(p.tagPt); p.tagPt.position.set(0, .75, 0);
  p.belt = layout.belts[p.id].map(a => V3(...a));
}
const MERGE = Q.get('merge') === '0' ? null : mergeStatic();
const mood = p => p.food === 0 && p.water === 0 ? 'wilt' : (p.food === 0 || p.water === 0) ? 'want' : 'happy';
const MOOD = { happy: '开心', want: '想吃', wilt: '蔫蔫' };
let sel = PETS[0];

// ---------- 名牌（原帖的白色胶囊）----------
const tags = [];
function addTag(html, cls, pos, onClick) { const el = document.createElement('div'); el.className = 'pill ' + cls; el.innerHTML = html; el.style.setProperty('--s', 0); document.body.appendChild(el); if (onClick) el.onclick = onClick; const t = { el, pos, born: -1 }; tags.push(t); return t; }
for (const p of PETS) p.tag = addTag(`<i></i>${p.id} <small>开心</small>`, '', () => p.tagPt.getWorldPosition(V3()), () => select(p, true));
addTag('<i style="background:#e0533d"></i>小卖部', '', () => V3(layout.shop[0], 3.4, layout.shop[2]), null);
for (const pl of layout.plots) if (!pl.who) addTag('<i></i>待开放', 'lock', () => V3(pl.center[0], 1.9, pl.center[2]), null);

// ---------- 界面 ----------
$('tabs').innerHTML = PETS.map((p, i) => `<button data-i="${i}">${p.id}</button>`).join('');
$('tabs').onclick = e => { const b = e.target.closest('button'); if (b) select(PETS[b.dataset.i], true); };
function select(p, fly) { sel = p; ui(); if (fly && !busy) flyPet(p); }
function ui() {
  const m = mood(sel);
  $('pName').textContent = sel.id; $('pLine').textContent = sel.line; $('pSt').textContent = MOOD[m]; $('pSt').className = 'st ' + m;
  $('bF').innerHTML = Array.from({ length: 6 }, (_, i) => `<i class="${i < sel.food ? 'on' : ''}"></i>`).join('');
  $('bW').innerHTML = Array.from({ length: 6 }, (_, i) => `<i class="${i < sel.water ? 'on' : ''}"></i>`).join('');
  $('aF').disabled = busy || sel.food >= 6; $('aW').disabled = busy || sel.water >= 6;
  $('aF').textContent = sel.food >= 6 ? '食盆已满' : '倒粮'; $('aW').textContent = sel.water >= 6 ? '水槽已满' : '倒水';
  [...$('tabs').children].forEach((b, i) => b.classList.toggle('on', PETS[i] === sel));
  for (const p of PETS) { const mm = mood(p); p.tag.el.className = 'pill ' + (mm === 'happy' ? '' : mm) + (p === sel ? ' sel' : ''); p.tag.el.querySelector('small').textContent = MOOD[mm]; }
}
function stats(final) {
  const v = { sN: PETS.length, sH: PETS.filter(p => mood(p) === 'happy').length, sW: PETS.filter(p => mood(p) !== 'happy').length, sL: layout.plots.filter(p => !p.who).length };
  for (const [k, n] of Object.entries(v)) { const el = $(k); if (el.textContent !== String(n)) { el.textContent = n; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } }
}

// ---------- 镜头 ----------
let fly = null, follow = null, idleT = 0;
function flyTo(pos, tgt, ms = 900, done) { fly = { p0: cam.position.clone(), t0: ctl.target.clone(), p1: pos.clone(), t1: tgt.clone(), s: performance.now(), ms: REDUCE ? 1 : ms, done }; }
function flyPet(p, done) { const c = p.root.getWorldPosition(V3()), out = c.clone().setY(0).normalize(); const pos = c.clone().addScaledVector(out, -8.5).add(V3(0, 5.5, 0)).addScaledVector(V3(-out.z, 0, out.x), 2.2); flyTo(pos, c.clone().add(V3(0, .9, 0)), 900, done); }
const orbit = (da, dr) => { const off = cam.position.clone().sub(ctl.target), sph = new THREE.Spherical().setFromVector3(off); sph.theta += da; sph.radius = THREE.MathUtils.clamp(sph.radius * dr, ctl.minDistance, ctl.maxDistance); flyTo(ctl.target.clone().add(V3().setFromSpherical(sph)), ctl.target.clone()); };
$('tHome').onclick = () => !busy && flyTo(HOME.pos, HOME.tgt, 1100);
$('tL').onclick = () => !busy && orbit(-Math.PI / 4, 1); $('tR').onclick = () => !busy && orbit(Math.PI / 4, 1);
$('tIn').onclick = () => !busy && orbit(0, .65); $('tOut').onclick = () => !busy && orbit(0, 1.5);
let showTags = true; $('tTag').onclick = () => { showTags = !showTags; $('tTag').classList.toggle('on', !showTags); };
renderer.domElement.addEventListener('pointerdown', () => { idleT = 0; ctl.autoRotate = false; });
// 点伙伴：选中 + 镜头拉过去
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => downAt = [e.clientX, e.clientY]);
renderer.domElement.addEventListener('pointerup', e => { if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  ptr.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ptr, cam);
  for (const p of PETS) if (ray.intersectObject(p.root, true).length) { select(p, true); break; } });

// ---------- 爆炸框（原帖「叮！登录不上！」那种）----------
{ const pts = []; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, r = i % 2 ? 36 : 55 + (i % 4 === 0 ? 8 : 0); pts.push((75 + Math.cos(a) * r * 1.25).toFixed(1) + ',' + (55 + Math.sin(a) * r * .9).toFixed(1)); } $('burstPoly').setAttribute('points', pts.join(' ')); }
let burst = null;
function popBurst(text, worldPos, ms = 1600) { $('burstT').textContent = text; burst = { pos: worldPos.clone(), t0: clock.elapsedTime, ms: ms / 1000 }; }

// ---------- 送粮：粮箱从小卖部上传送带，镜头跟拍，跳进食盆 ----------
const crateTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#d9a35e'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#e8892e'; g.fillRect(54, 0, 20, 128); g.fillRect(0, 54, 128, 20); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const crateM = new THREE.MeshStandardMaterial({ map: crateTex, roughness: .8 });
let busy = false, job = null;
function makeCrate(kind) {
  const g = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(.55, .45, .55), kind === 'food' ? crateM : new THREE.MeshStandardMaterial({ color: 0x6fb6de, roughness: .35 }));
  b.castShadow = true; g.add(b); if (kind === 'water') { const cap = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .1, 16), clay({ color: 0xf7f1e3 })); cap.position.y = .27; g.add(cap); }
  scene.add(g); return g;
}
function deliver(kind) {
  if (busy) return; busy = true; ctl.autoRotate = false; ui();
  const p = sel, crate = makeCrate(kind), shop = V3(layout.shop[0], 1.3, layout.shop[2]);
  const [b0, b1] = p.belt, bowl = (kind === 'food' ? p.bowlN : p.troughN).getWorldPosition(V3());
  const bowlW = bbCenter(kind === 'food' ? p.bowlN : p.troughN).setY(.55);
  crate.position.copy(shop); crate.scale.setScalar(.001);
  // 先把镜头带到小卖部
  const toShop = b0.clone().sub(shop).setY(0).normalize();
  flyTo(shop.clone().addScaledVector(toShop, -10).addScaledVector(V3(-toShop.z, 0, toShop.x), 4).add(V3(0, 9, 0)), shop.clone().addScaledVector(toShop, 2), 800, () => {
    popBurst(kind === 'food' ? '送粮啦' : '送水啦', shop.clone().add(V3(0, 1.4, 0)));
    job = { p, kind, crate, shop, b0, b1, bowlW, t0: clock.elapsedTime, legs: [.45, .55, 2.6, .7] };
  });
}
$('aF').onclick = () => deliver('food'); $('aW').onclick = () => deliver('water');
function arc(a, b, u, h) { const v = a.clone().lerp(b, u); v.y += Math.sin(u * Math.PI) * h; return v; }
function runJob(t) {
  const J = job, k = t - J.t0, [d0, d1, d2, d3] = J.legs, c = J.crate;
  if (k < d0) { const u = k / d0; c.scale.setScalar(backOut(u)); c.position.copy(J.shop).add(V3(0, u * .3, 0)); }   // 冒出来
  else if (k < d0 + d1) { const u = (k - d0) / d1; c.scale.setScalar(1); c.position.copy(arc(J.shop.clone().add(V3(0, .3, 0)), J.b0.clone().add(V3(0, .23, 0)), u, 1.2)); }   // 跳上传送带
  else if (k < d0 + d1 + d2) { const u = (k - d0 - d1) / d2; c.position.copy(J.b0.clone().lerp(J.b1, u)).add(V3(0, .23 + Math.abs(Math.sin(u * 40)) * .02, 0)); }   // 传送带上走
  else if (k < d0 + d1 + d2 + d3) { const u = (k - d0 - d1 - d2) / d3; c.position.copy(arc(J.b1.clone().add(V3(0, .23, 0)), J.bowlW, u, 1.0)); c.rotation.z = u * Math.PI * 2; c.scale.setScalar(1 - u * .6); }   // 跳进食盆
  else { scene.remove(c); finishJob(t); return; }
  // 镜头跟拍：低机位，在粮箱后上方
  if (k > d0) { const dir = J.b1.clone().sub(J.b0).setY(0).normalize(), side = V3(-dir.z, 0, dir.x);
    const want = c.position.clone().addScaledVector(dir, -7).addScaledVector(side, 3.5).add(V3(0, 4.8, 0));
    cam.position.lerp(want, .08); ctl.target.lerp(c.position, .12); }
}
function finishJob(t) {
  const J = job; job = null;
  if (J.kind === 'food') J.p.food = 6; else J.p.water = 6;
  J.p.joyT = t; J.p.grow = { kind: J.kind, t0: t };
  for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthTest: false })); fx.add(s); hearts.push({ s, p: J.p, t0: t + .25 + i * .14, x: (i - 1) * .35 }); }
  ui(); stats();
  setTimeout(() => { busy = false; ui(); flyPet(J.p); }, 900);
}
const heartTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#ff6f8f'; g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(4, 32, 14, 8, 32, 22); g.bezierCurveTo(50, 8, 60, 32, 32, 54); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const hearts = [];

// ---------- 烟囱冒烟 ----------
const smokeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 4, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const chimney = Object.values(N).find(o => o.isMesh && /烟囱/.test(o.name));
const puffs = []; if (chimney) { const top = new THREE.Box3().setFromObject(chimney); const base = V3((top.min.x + top.max.x) / 2, top.max.y + .1, (top.min.z + top.max.z) / 2);
  for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: .0 })); fx.add(s); puffs.push({ s, base, ph: i / 7 }); } }

// ---------- 时间：本机时间；「看一天」= 12 秒延时 ----------
const KEYS = [  // [小时, 天顶, 天中, 地平, 太阳色, 太阳强度, 半球光, 曝光]
  [0, '#0b1430', '#1d2a52', '#2c3660', '#7f98ff', .22, .16, .95], [5.5, '#2b3a6b', '#e2a27a', '#f3c79a', '#ffb070', 1.0, .4, 1.0],
  [8, '#7fb6e2', '#cfe6f2', '#f3efe2', '#ffe9c8', 3.4, .75, .95], [16.5, '#7fb6e2', '#d6e7ee', '#f6ecd8', '#ffe2b8', 3.2, .72, .95],
  [18.5, '#5d6fa8', '#e9a77f', '#ffd9a0', '#ffa860', 2.0, .5, 1.0], [20, '#121c40', '#2b3562', '#3c4470', '#7f98ff', .3, .2, .98], [24, '#0b1430', '#1d2a52', '#2c3660', '#7f98ff', .22, .16, .95]];
const cA = new THREE.Color(), cB = new THREE.Color();
function applyHour(h) {
  let i = 0; while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const A = KEYS[i], B = KEYS[i + 1], u = THREE.MathUtils.clamp((h - A[0]) / (B[0] - A[0]), 0, 1), mix = j => cA.set(A[j]).lerp(cB.set(B[j]), u).clone(), num = j => A[j] + (B[j] - A[j]) * u;
  skyU.top.value.copy(mix(1)); skyU.mid.value.copy(mix(2)); skyU.bot.value.copy(mix(3));
  scene.fog = new THREE.Fog(mix(3).lerp(new THREE.Color('#cfe3ee'), .3), 45, 150);
  sun.color.copy(mix(4)); sun.intensity = num(5); hemi.intensity = num(6); renderer.toneMappingExposure = num(7);
  const ang = (h - 6) / 24 * Math.PI * 2; sun.position.set(Math.cos(ang) * 40, Math.max(8, Math.sin(ang) * 45 + 10), -6 + 18);   // 太阳东升西落
  const night = h < 6 || h > 18.6 ? 1 : 0, dusk = THREE.MathUtils.clamp((h - 17.8) / .8, 0, 1) * (h < 23 ? 1 : 0);
  const glow = Math.max(night, dusk);
  scene.environmentIntensity = .35 - .29 * glow;
  hemi.color.set('#d6ecff').lerp(new THREE.Color('#3f4f8c'), glow); hemi.groundColor.set('#5d7a3a').lerp(new THREE.Color('#1e2a3a'), glow);
  glass.forEach(m => { m.emissive = new THREE.Color('#ffb85a'); m.emissiveIntensity = 1.4 * glow; });
  nightLights.forEach(m => m.emissiveIntensity = 3 * glow); lampMats.forEach(m => m.emissiveIntensity = 1 + 3 * glow);
}
let lapse = null;
const realHour = () => { const d = new Date(); return Q.has('hour') ? Number(Q.get('hour')) : d.getHours() + d.getMinutes() / 60; };
const season = m => m >= 3 && m <= 5 ? '春' : m >= 6 && m <= 8 ? '夏' : m >= 9 && m <= 11 ? '秋' : '冬';
function clockText(h) { const d = new Date(); $('cT').textContent = `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.floor(h % 1 * 60)).padStart(2, '0')}`; $('cD').textContent = `${d.getMonth() + 1}月${d.getDate()}日周${'日一二三四五六'[d.getDay()]} · ${season(d.getMonth() + 1)}天`; }
$('tDay').onclick = () => { if (lapse) return; lapse = { t0: clock.elapsedTime, h0: realHour() }; $('tDay').classList.add('on'); $('clock').classList.add('fast'); };

// ---------- 每帧 ----------
const clock = new THREE.Clock(); let frames = 0, acc = 0, fps = 0, slow = 0, tier = '高', introT = Q.get('intro') === '0' ? -1 : 0;
ui(); stats(); applyHour(realHour()); clockText(realHour());
if (introT === 0) { setTimeout(() => flyTo(HOME.pos, HOME.tgt, 3000, () => { document.body.classList.remove('intro'); popTags(); }), 300); }
else { document.body.classList.remove('intro'); tags.forEach(t => t.born = 0); }
function popTags() { tags.forEach((t, i) => t.born = clock.elapsedTime + .15 + i * .16); setTimeout(() => { ctl.autoRotate = !REDUCE; }, 2500); }
function frame() {
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime; grassU.time.value = t;
  if (fly) { const k = Math.min(1, (performance.now() - fly.s) / fly.ms), e = ease(k); cam.position.lerpVectors(fly.p0, fly.p1, e); ctl.target.lerpVectors(fly.t0, fly.t1, e); if (k >= 1) { const d = fly.done; fly = null; d && d(); } }
  if (job) runJob(t);
  ctl.update();
  idleT += dt; if (idleT > 6 && !busy && !fly && !REDUCE) ctl.autoRotate = true;
  // 时间
  if (lapse) { const u = (t - lapse.t0) / 12; const h = (lapse.h0 + u * 24) % 24; applyHour(h); clockText(h); if (u >= 1) { lapse = null; $('tDay').classList.remove('on'); $('clock').classList.remove('fast'); applyHour(realHour()); clockText(realHour()); } }
  else if (frames === 0) clockText(realHour());
  // 伙伴：溜达、摆腿、摇尾巴、蔫蔫低头；开心时被喂会蹦一下转一圈
  for (const p of PETS) {
    const m = mood(p), wl = m === 'wilt' ? 1 : 0; p.k = (p.k ?? wl) + (wl - (p.k ?? wl)) * Math.min(1, dt * 4);
    const W = p.walk, target = p.spots[W.to], pos = p.root.position; let moving = false;
    if (p.joyT !== undefined && t - p.joyT < 1.4) { const j = (t - p.joyT) / 1.4; pos.y = p.home.y + Math.abs(Math.sin(j * Math.PI * 3)) * .4 * (1 - j); p.root.rotation.y = p.face + j * Math.PI * 2; }
    else if (busy && job && job.p === p) { /* 等粮：站好望向食盆 */ }
    else if (W.wait > 0) { W.wait -= dt; pos.y = p.home.y + (m === 'happy' ? Math.abs(Math.sin(t * 2.6)) * .03 : 0); }
    else { const d = target.clone().sub(pos); d.y = 0; const L = d.length(), sp = (m === 'wilt' ? .35 : .9) * dt;
      if (L < .05) { W.to = (W.to + 1 + Math.floor(Math.random() * 2)) % p.spots.length; W.wait = 1.5 + Math.random() * 3; }
      else { pos.addScaledVector(d.normalize(), Math.min(sp, L)); moving = true; const want = Math.atan2(d.x, d.z); p.face = p.face ?? want; let df = want - p.face; df = Math.atan2(Math.sin(df), Math.cos(df)); p.face += df * Math.min(1, dt * 6); p.root.rotation.y = p.face; pos.y = p.home.y + Math.abs(Math.sin(t * 12)) * .05; } }
    if (p.face === undefined) p.face = p.root.rotation.y;
    p.legs.forEach((l, i) => l.rotation.x = moving ? Math.sin(t * 12 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * .45 : 0);
    p.head.rotation.x = p.head0 + .32 * p.k + (m === 'want' ? Math.sin(t * 2) * .06 : 0);
    if (p.earL) p.earL.rotation.z = .75 * p.k; if (p.earR) p.earR.rotation.z = -.75 * p.k;
    if (p.tail) { p.tail.rotation.x = -.9 * p.k; p.tail.rotation.y = m === 'happy' ? Math.sin(t * 10) * .35 : 0; }
    // 粮堆、水面：被倒满时回弹长出来
    const gk = p.grow ? Math.min(1, (t - p.grow.t0) / .45) : 1;
    p.foodN.visible = p.food > 0; p.foodN.scale.setScalar(p.grow && p.grow.kind === 'food' ? Math.max(.05, backOut(gk)) : 1);
    p.waterN.visible = p.water > 0; p.waterN.scale.y = p.grow && p.grow.kind === 'water' ? Math.max(.05, backOut(gk)) : 1;
  }
  for (let i = hearts.length - 1; i >= 0; i--) { const h = hearts[i], u = (t - h.t0) / 1.2; if (u < 0) { h.s.visible = false; continue; } if (u > 1) { fx.remove(h.s); hearts.splice(i, 1); continue; } h.s.visible = true; const sc = .42 * backOut(Math.min(1, u * 3)) * (1 - Math.max(0, u - .7) / .3); h.s.scale.set(sc, sc, 1); const c = h.p.root.getWorldPosition(V3()); h.s.position.set(c.x + h.x, 1.6 + u * 1.1, c.z); }
  for (const pf of puffs) { const u = (t * .25 + pf.ph) % 1; pf.s.position.copy(pf.base).add(V3(Math.sin(u * 6 + pf.ph * 9) * .15 + u * .5, u * 2.2, 0)); const s = .25 + u * .7; pf.s.scale.set(s, s, 1); pf.s.material.opacity = (1 - u) * .55 * Math.min(1, u * 5); }
  dof.uniforms.focus.value = cam.position.distanceTo(ctl.target);
  renderer.info.autoReset = false; renderer.info.reset();
  composer.render(dt);
  renderer.autoClear = false; renderer.toneMapping = THREE.NoToneMapping; renderer.render(fx, cam); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.autoClear = true;
  // 名牌：弹出（回弹）+ 跟随
  const H = innerHeight, Wd = innerWidth;
  for (const tg of tags) { const v = tg.pos().project(cam); const show = showTags && tg.born >= 0 && t >= tg.born && v.z < 1;
    tg.el.style.display = show ? '' : 'none'; if (!show) continue;
    const s = tg.born === 0 ? 1 : backOut(Math.min(1, (t - tg.born) / .35)); tg.el.style.setProperty('--s', s.toFixed(3));
    tg.el.style.left = (v.x * .5 + .5) * Wd + 'px'; tg.el.style.top = (-v.y * .5 + .5) * H - 22 + 'px'; }
  // 爆炸框
  const bu = $('burst'); if (burst) { const u = (t - burst.t0) / burst.ms; if (u > 1) { burst = null; bu.style.setProperty('--s', 0); } else { const v = burst.pos.clone().project(cam); bu.style.left = (v.x * .5 + .5) * Wd + 'px'; bu.style.top = (-v.y * .5 + .5) * H + 'px'; bu.style.setProperty('--s', (u < .2 ? backOut(u / .2) : u > .85 ? 1 - (u - .85) / .15 : 1).toFixed(3)); } }
  // 帧率：连续 3 秒低于 40 帧自动降档
  frames++; acc += dt; if (acc >= 1) { fps = frames / acc; frames = 0; acc = 0; if (fps < 40 && !Q.get('lock')) { if (++slow >= 3) { slow = 0; if (dof.enabled) { dof.enabled = false; tier = '中'; } else if (ao.enabled) { ao.enabled = false; tier = '低'; } else if (renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); composer.setPixelRatio(1); tier = '最低'; } } } else slow = 0; }
  $('hud').textContent = `${fps.toFixed(0)} 帧/秒 · 画质${tier} · ${renderer.info.render.calls} 次绘制`;
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); });
window.__park = { MERGE, PETS, select, deliver, flyTo, flyPet, applyHour, cam, ctl, N, THREE, HOME, layout };
window.__ready = true;
requestAnimationFrame(frame);
