import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BellPhase,
  createInitialLecturerState,
  getBellPhaseConfig,
  LECTURE_WAYPOINTS,
  LecturerAiState,
  stepLecturerState,
  triggerNoiseStimulus,
} from '../prd/simulation';

type CameraPresetId = 'overview' | 'lectern' | 'backrow' | 'exit';

interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'overview',
    label: 'Overview',
    position: [11.5, 11.2, 12.5],
    target: [0, 1.2, -1.0],
  },
  {
    id: 'lectern',
    label: 'Lectern',
    position: [-4.8, 3.2, -1.6],
    target: [0.4, 1.4, -6.2],
  },
  {
    id: 'backrow',
    label: 'Back Row',
    position: [-4.5, 3.1, 6.8],
    target: [0, 1.1, -3.5],
  },
  {
    id: 'exit',
    label: 'East Exit',
    position: [1.5, 3.4, -0.5],
    target: [8.4, 1.6, -2.5],
  },
];

function createChalkboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#18241e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle chalk dust smudges
    ctx.fillStyle = 'rgba(235, 240, 232, 0.06)';
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc((i * 53) % 512, (i * 37) % 256, 28 + (i % 4) * 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(232, 234, 224, 0.65)';
    ctx.lineWidth = 2;
    ctx.font = '600 22px Georgia, serif';
    ctx.fillStyle = 'rgba(238, 240, 232, 0.8)';
    ctx.fillText('LECTURE IV: ATTENDANCE IS MANDATORY', 28, 48);

    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(217, 155, 67, 0.85)';
    ctx.fillText('CIPHER KEY: ROW D -> BREAKER -> KEYCARD', 28, 92);

    ctx.fillStyle = 'rgba(220, 226, 218, 0.65)';
    ctx.fillText('NO ONE LEAVES BEFORE THE FINAL BELL', 28, 134);

    // Chalk underline & diagram
    ctx.beginPath();
    ctx.moveTo(28, 156);
    ctx.lineTo(440, 156);
    ctx.stroke();

    ctx.strokeRect(32, 174, 120, 52);
    ctx.fillText('A-104', 65, 206);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#4a3222';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) {
      ctx.fillStyle = y % 12 === 0 ? 'rgba(24, 14, 8, 0.28)' : 'rgba(98, 68, 44, 0.16)';
      ctx.fillRect(0, y, 256, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildDeskRowGroup(
  width: number,
  woodMat: THREE.Material,
  steelMat: THREE.Material,
  benchMat: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();

  // Primary silhouette: continuous oak writing plank
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 0.62), woodMat);
  top.position.set(0, 0.76, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Secondary read: front modesty panel (provides crouch occlusion!)
  const modesty = new THREE.Mesh(new THREE.BoxGeometry(width - 0.06, 0.56, 0.05), woodMat);
  modesty.position.set(0, 0.44, -0.26);
  modesty.castShadow = true;
  modesty.receiveShadow = true;
  group.add(modesty);

  // Secondary read: attached student bench behind desk
  const bench = new THREE.Mesh(new THREE.BoxGeometry(width - 0.08, 0.06, 0.36), benchMat);
  bench.position.set(0, 0.44, 0.48);
  bench.castShadow = true;
  bench.receiveShadow = true;
  group.add(bench);

  // Accent details: steel stanchion legs at ends & center
  const legPositions = [-width * 0.44, 0, width * 0.44];
  const legGeo = new THREE.BoxGeometry(0.06, 0.74, 0.06);
  for (const lx of legPositions) {
    const frontLeg = new THREE.Mesh(legGeo, steelMat);
    frontLeg.position.set(lx, 0.37, -0.22);
    group.add(frontLeg);

    const rearLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.05), steelMat);
    rearLeg.position.set(lx, 0.22, 0.48);
    group.add(rearLeg);
  }

  return group;
}

function buildLecternGroup(woodMat: THREE.Material, brassMat: THREE.Material): THREE.Group {
  const group = new THREE.Group();

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.9), woodMat);
  plinth.position.set(0, 0.05, 0);
  plinth.receiveShadow = true;
  group.add(plinth);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 0.65), woodMat);
  body.position.set(0, 0.62, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const slantedDeck = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.07, 0.76), woodMat);
  slantedDeck.position.set(0, 1.18, 0.03);
  slantedDeck.rotation.x = 0.14;
  group.add(slantedDeck);

  // Brass desk lamp assembly
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.05, 16), brassMat);
  lampBase.position.set(0.36, 1.24, -0.14);
  group.add(lampBase);

  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 10), brassMat);
  lampStem.position.set(0.36, 1.4, -0.14);
  group.add(lampStem);

  const lampShadeMat = new THREE.MeshStandardMaterial({
    color: 0xd99b43,
    emissive: 0xd99b43,
    emissiveIntensity: 0.7,
    roughness: 0.25,
    metalness: 0.6,
  });
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 16), lampShadeMat);
  lampShade.position.set(0.32, 1.54, -0.06);
  lampShade.rotation.x = 0.35;
  group.add(lampShade);

  return group;
}

function buildLecturerGroup(): {
  group: THREE.Group;
  sightCone: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  pointerArm: THREE.Group;
} {
  const group = new THREE.Group();

  const coatMat = new THREE.MeshStandardMaterial({
    color: 0x20252c,
    roughness: 0.82,
    metalness: 0.08,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: 0x3b2c2a,
    roughness: 0.72,
    metalness: 0.05,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc8bdb2,
    roughness: 0.65,
    metalness: 0.02,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xd99b43,
    emissive: 0xd99b43,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.85,
  });

  // Contact shadow disc grounded at floor
  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    new THREE.MeshBasicMaterial({
      color: 0x050608,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.02;
  group.add(contactShadow);

  // Articulated legs
  const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.85, 10);
  const leftLeg = new THREE.Mesh(legGeo, coatMat);
  leftLeg.position.set(-0.14, 0.44, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, coatMat);
  rightLeg.position.set(0.14, 0.44, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Coat torso & shoulder mantle
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.88, 12), coatMat);
  torso.position.set(0, 1.25, 0);
  torso.castShadow = true;
  group.add(torso);

  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.3), vestMat);
  shoulders.position.set(0, 1.64, 0);
  shoulders.castShadow = true;
  group.add(shoulders);

  // Head + glinting spectacles
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 14), skinMat);
  head.position.set(0, 1.92, 0);
  head.castShadow = true;
  group.add(head);

  const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.06), metalMat);
  glasses.position.set(0, 1.93, 0.15);
  group.add(glasses);

  // Pointer stick arm (+Z facing)
  const pointerArm = new THREE.Group();
  pointerArm.position.set(0.32, 1.56, 0.06);
  const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.56, 8), coatMat);
  armMesh.rotation.x = Math.PI / 2.6;
  armMesh.position.set(0, -0.1, 0.2);
  pointerArm.add(armMesh);

  const cane = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.012, 0.92, 8),
    new THREE.MeshStandardMaterial({ color: 0x7b5638, roughness: 0.5, metalness: 0.1 }),
  );
  cane.rotation.x = Math.PI / 2.2;
  cane.position.set(0, -0.22, 0.62);
  pointerArm.add(cane);
  group.add(pointerArm);

  // Floor-projected sight cone wedge (+Z forward)
  const coneShape = new THREE.Shape();
  const range = 7.6;
  const halfAngle = THREE.MathUtils.degToRad(36);
  coneShape.moveTo(0, 0);
  coneShape.absarc(0, 0, range, Math.PI / 2 - halfAngle, Math.PI / 2 + halfAngle, false);
  coneShape.closePath();

  const coneGeo = new THREE.ShapeGeometry(coneShape, 18);
  coneGeo.rotateX(Math.PI / 2);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xd99b43,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const sightCone = new THREE.Mesh(coneGeo, coneMat);
  sightCone.position.y = 0.05;
  group.add(sightCone);

  return { group, sightCone, leftLeg, rightLeg, pointerArm };
}

function getFloorYAtZ(z: number): number {
  if (z < -1.5) return 0;
  if (z < 1.3) return 0.35;
  if (z < 4.1) return 0.7;
  return 1.05;
}

export function LectureHall3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [presetId, setPresetId] = useState<CameraPresetId>('overview');
  const [bellPhase, setBellPhase] = useState<BellPhase>(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSightCone, setShowSightCone] = useState(true);
  const [showPatrolPath, setShowPatrolPath] = useState(true);
  const [aiStateLabel, setAiStateLabel] = useState<LecturerAiState>('LECTURING');
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const controlsRef = useRef<{
    setPreset: (id: CameraPresetId) => void;
    triggerNoise: () => void;
    setBell: (b: BellPhase) => void;
    setPlaying: (v: boolean) => void;
    setConeVisible: (v: boolean) => void;
    setPathVisible: (v: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0e12);
    scene.fog = new THREE.FogExp2(0x0b0e12, 0.026);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    camera.position.set(...CAMERA_PRESETS[0].position);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(...CAMERA_PRESETS[0].target);
    orbit.enableDamping = !isSoftwareGl;
    orbit.dampingFactor = 0.08;
    orbit.maxPolarAngle = Math.PI / 2 - 0.05;
    orbit.minDistance = 4;
    orbit.maxDistance = 28;
    orbit.update();

    // Lighting: warm desk lamp + cool gothic window moonlight + hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0x88a2c4, 0x2a2018, 0.85);
    scene.add(hemiLight);

    const moonKey = new THREE.DirectionalLight(0xaec4e8, 1.35);
    moonKey.position.set(-14, 14, 4);
    if (!isSoftwareGl) {
      moonKey.castShadow = true;
      moonKey.shadow.mapSize.set(1024, 1024);
      moonKey.shadow.camera.near = 1;
      moonKey.shadow.camera.far = 36;
      moonKey.shadow.camera.left = -12;
      moonKey.shadow.camera.right = 12;
      moonKey.shadow.camera.top = 12;
      moonKey.shadow.camera.bottom = -12;
      moonKey.shadow.bias = -0.0005;
      moonKey.shadow.normalBias = 0.02;
    }
    scene.add(moonKey);

    const lecternLampLight = new THREE.PointLight(0xffb454, 4.5, 11, 1.8);
    lecternLampLight.position.set(0.36, 1.75, -5.2);
    scene.add(lecternLampLight);

    const exitSignLight = new THREE.PointLight(0x4ade80, 1.4, 6, 2);
    exitSignLight.position.set(8.2, 2.7, -2.5);
    scene.add(exitSignLight);

    // Materials & procedural textures
    const woodTex = createWoodTexture();
    woodTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const oakMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodTex,
      roughness: 0.72,
      metalness: 0.06,
    });
    const benchMat = new THREE.MeshStandardMaterial({
      color: 0x3b2a1e,
      roughness: 0.8,
      metalness: 0.04,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x2a3038,
      roughness: 0.35,
      metalness: 0.78,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc9933b,
      roughness: 0.25,
      metalness: 0.85,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1f26,
      roughness: 0.86,
      metalness: 0.05,
    });
    const aisleMat = new THREE.MeshStandardMaterial({
      color: 0x2b1d1d,
      roughness: 0.92,
      metalness: 0.02,
    });
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 0.85,
      metalness: 0.05,
    });

    // Main well floor + 3 stepped auditorium tiers
    const wellFloor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 10), floorMat);
    wellFloor.position.set(0, -0.1, -3.5);
    wellFloor.receiveShadow = true;
    scene.add(wellFloor);

    const tierConfigs = [
      { y: 0.35, z: -0.1, depth: 2.8 },
      { y: 0.7, z: 2.7, depth: 2.8 },
      { y: 1.05, z: 5.5, depth: 3.4 },
    ];
    for (const t of tierConfigs) {
      const riser = new THREE.Mesh(new THREE.BoxGeometry(18, t.y + 0.2, t.depth), floorMat);
      riser.position.set(0, (t.y - 0.2) / 2, t.z);
      riser.receiveShadow = true;
      scene.add(riser);
    }

    // Center aisle runner (2.4m wide clear path, offset +0.02 to prevent Z-fighting)
    const runner = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.02, 11.5), aisleMat);
    runner.position.set(0, 0.015, -2.5);
    runner.receiveShadow = true;
    scene.add(runner);

    // Architectural walls (cutaway south side for camera visibility)
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(18.4, 6.2, 0.4), wallMat);
    frontWall.position.set(0, 3.0, -8.5);
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.2, 16.0), wallMat);
    westWall.position.set(-9.0, 3.0, -0.6);
    westWall.receiveShadow = true;
    scene.add(westWall);

    // Gothic window glow panels on West wall
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x627c9c,
      emissive: 0x3b5375,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    });
    for (const wz of [-4.8, -0.6, 3.6]) {
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 1.5), oakMat);
      winFrame.position.set(-8.76, 3.4, wz);
      scene.add(winFrame);

      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.0, 1.15), windowMat);
      glass.position.set(-8.7, 3.4, wz);
      scene.add(glass);
    }

    // East wall with framed Corridor Exit Door jambs
    const eastWallNorth = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.2, 4.6), wallMat);
    eastWallNorth.position.set(9.0, 3.0, -6.2);
    scene.add(eastWallNorth);

    const eastWallSouth = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.2, 8.8), wallMat);
    eastWallSouth.position.set(9.0, 3.0, 3.0);
    scene.add(eastWallSouth);

    const eastHeader = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, 2.6), wallMat);
    eastHeader.position.set(9.0, 4.4, -2.5);
    scene.add(eastHeader);

    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 2.65, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x3a261a, roughness: 0.65, metalness: 0.1 }),
    );
    doorPanel.position.set(8.92, 1.325, -2.5);
    scene.add(doorPanel);

    const exitSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.24, 0.72),
      new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x22c55e,
        emissiveIntensity: 1.2,
      }),
    );
    exitSign.position.set(8.75, 2.9, -2.5);
    scene.add(exitSign);

    // Chalkboard on Front Wall
    const chalkTex = createChalkboardTexture();
    chalkTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const chalkboard = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 2.3, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: chalkTex,
        roughness: 0.88,
        metalness: 0.02,
      }),
    );
    chalkboard.position.set(0, 2.35, -8.24);
    scene.add(chalkboard);

    const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(7.45, 2.5, 0.06), oakMat);
    boardFrame.position.set(0, 2.35, -8.28);
    scene.add(boardFrame);

    // Grounded Projection Booth Balcony Ledge + Projector Housing + Aligned Beam Cone
    const boothWall = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.8, 1.4), wallMat);
    boothWall.position.set(0, 2.9, 6.8);
    boothWall.receiveShadow = true;
    scene.add(boothWall);

    const boothParapet = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.16, 1.5), oakMat);
    boothParapet.position.set(0, 4.82, 6.8);
    scene.add(boothParapet);

    const projectorBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.44, 0.9), steelMat);
    projectorBody.position.set(0, 5.12, 6.45);
    scene.add(projectorBody);

    const projectorLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.18, 14),
      brassMat,
    );
    projectorLens.rotation.x = Math.PI / 2;
    projectorLens.position.set(0, 5.12, 5.95);
    scene.add(projectorLens);

    const beamLength = 14.2;
    const beamGeo = new THREE.CylinderGeometry(0.13, 2.5, beamLength, 24, 1, true);
    beamGeo.translate(0, -beamLength / 2, 0);
    beamGeo.rotateX(-Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xd9b372,
      transparent: true,
      opacity: 0.065,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const projectorBeam = new THREE.Mesh(beamGeo, beamMat);
    projectorBeam.position.set(0, 5.12, 5.9);
    projectorBeam.lookAt(0, 2.45, -8.2);
    scene.add(projectorBeam);

    // Front Lectern (podium + brass lamp)
    const lectern = buildLecternGroup(oakMat, brassMat);
    lectern.position.set(0, 0, -5.8);
    scene.add(lectern);

    // Bolted Oak Student Desks across 3 tiers (left & right wings leaving clear 2.4m center aisle)
    const deskRowSpecs = [
      { z: -2.6, y: 0 },
      { z: -0.1, y: 0.35 },
      { z: 2.7, y: 0.7 },
      { z: 5.5, y: 1.05 },
    ];
    for (const row of deskRowSpecs) {
      const leftRow = buildDeskRowGroup(4.6, oakMat, steelMat, benchMat);
      leftRow.position.set(-4.2, row.y, row.z);
      scene.add(leftRow);

      const rightRow = buildDeskRowGroup(4.6, oakMat, steelMat, benchMat);
      rightRow.position.set(4.2, row.y, row.z);
      scene.add(rightRow);
    }

    // Lecturer AI Actor
    const lecturerActor = buildLecturerGroup();
    scene.add(lecturerActor.group);

    // Patrol Waypoint Path Line
    const pathPoints = LECTURE_WAYPOINTS.map(
      (wp) => new THREE.Vector3(wp.x, getFloorYAtZ(wp.z) + 0.08, wp.z),
    );
    pathPoints.push(pathPoints[0].clone());
    const pathLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pathPoints),
      new THREE.LineBasicMaterial({ color: 0xd99b43, transparent: true, opacity: 0.55 }),
    );
    scene.add(pathLine);

    // Acoustic Noise Ripple Ring (hidden until noise triggered)
    const noiseRingMat = new THREE.MeshBasicMaterial({
      color: 0xc84b4b,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const noiseRing = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 32), noiseRingMat);
    noiseRing.rotation.x = -Math.PI / 2;
    noiseRing.position.set(-3.4, 0.76, 2.2);
    noiseRing.visible = false;
    scene.add(noiseRing);

    // Mutable simulation state inside ref/closure (zero React re-renders at 60Hz)
    let simState = createInitialLecturerState(1);
    let lastReportedAiState: LecturerAiState = simState.aiState;
    let playing = true;
    let noisePulseAge = 99;
    let walkPhase = 0;

    let cameraTransitionActive = false;
    const camTargetPos = new THREE.Vector3(...CAMERA_PRESETS[0].position);
    const camTargetLook = new THREE.Vector3(...CAMERA_PRESETS[0].target);

    const onOrbitStart = () => {
      cameraTransitionActive = false;
    };
    orbit.addEventListener('start', onOrbitStart);

    controlsRef.current = {
      setPreset: (id) => {
        const found = CAMERA_PRESETS.find((p) => p.id === id);
        if (!found) return;
        camTargetPos.set(...found.position);
        camTargetLook.set(...found.target);
        cameraTransitionActive = true;
      },
      triggerNoise: () => {
        const nx = -3.4;
        const nz = 2.2;
        simState = triggerNoiseStimulus(simState, nx, nz, 12.5);
        noiseRing.position.set(nx, getFloorYAtZ(nz) + 0.06, nz);
        noisePulseAge = 0;
        noiseRing.visible = true;
        if (simState.aiState !== lastReportedAiState) {
          lastReportedAiState = simState.aiState;
          setAiStateLabel(simState.aiState);
        }
      },
      setBell: (b) => {
        simState = { ...simState, bellPhase: b };
        // Adjust hall illumination mood to match Bell Phase
        if (b === 1) {
          moonKey.intensity = 1.35;
          lecternLampLight.intensity = 4.5;
          beamMat.opacity = 0.075;
        } else if (b === 2) {
          moonKey.intensity = 0.85;
          lecternLampLight.intensity = 3.2;
          beamMat.opacity = 0.13;
        } else {
          moonKey.intensity = 0.42;
          lecternLampLight.intensity = 1.8;
          beamMat.opacity = 0.16;
        }
      },
      setPlaying: (v) => {
        playing = v;
      },
      setConeVisible: (v) => {
        lecturerActor.sightCone.visible = v;
      },
      setPathVisible: (v) => {
        pathLine.visible = v;
      },
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let frameId = 0;
    let disposed = false;
    let lastTimeMs = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const rawDt = (nowMs - lastTimeMs) / 1000;
      lastTimeMs = nowMs;
      const dt = Math.min(rawDt, 0.05);

      if (playing) {
        const prevX = simState.x;
        const prevZ = simState.z;
        simState = stepLecturerState(simState, dt);
        const stepDist = Math.hypot(simState.x - prevX, simState.z - prevZ);

        if (stepDist > 0.001) {
          walkPhase += stepDist * 3.8;
          lecturerActor.leftLeg.rotation.x = Math.sin(walkPhase) * 0.42;
          lecturerActor.rightLeg.rotation.x = -Math.sin(walkPhase) * 0.42;
          lecturerActor.pointerArm.rotation.x = Math.sin(walkPhase * 0.5) * 0.14;
        } else {
          lecturerActor.leftLeg.rotation.x *= 0.85;
          lecturerActor.rightLeg.rotation.x *= 0.85;
        }

        if (simState.aiState !== lastReportedAiState) {
          lastReportedAiState = simState.aiState;
          setAiStateLabel(simState.aiState);
        }
      }

      // Ground lecturer cleanly onto stepped tiers
      const floorY = getFloorYAtZ(simState.z);
      lecturerActor.group.position.set(simState.x, floorY, simState.z);
      lecturerActor.group.rotation.y = simState.yaw;

      // Color sight cone by AI state
      const coneMat = lecturerActor.sightCone.material as THREE.MeshBasicMaterial;
      if (simState.aiState === 'PURSUIT') {
        coneMat.color.setHex(0xc84b4b);
        coneMat.opacity = 0.28;
      } else if (simState.aiState === 'INVESTIGATING' || simState.aiState === 'SEARCHING') {
        coneMat.color.setHex(0xe59838);
        coneMat.opacity = 0.24;
      } else {
        coneMat.color.setHex(0xd99b43);
        coneMat.opacity = 0.16;
      }

      // Noise ring expansion
      if (noisePulseAge < 1.8) {
        noisePulseAge += dt;
        const t = noisePulseAge / 1.8;
        const scale = 1 + t * 9.5;
        noiseRing.scale.set(scale, scale, 1);
        noiseRingMat.opacity = (1 - t) * 0.75;
      } else if (noiseRing.visible) {
        noiseRing.visible = false;
      }

      // Exponential camera preset damping
      if (cameraTransitionActive) {
        const damp = 1 - Math.exp(-5.5 * dt);
        camera.position.lerp(camTargetPos, damp);
        orbit.target.lerp(camTargetLook, damp);
        if (camera.position.distanceTo(camTargetPos) < 0.05) {
          cameraTransitionActive = false;
        }
      }
      orbit.update();

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      orbit.removeEventListener('start', onOrbitStart);
      orbit.dispose();
      chalkTex.dispose();
      woodTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handlePreset = (id: CameraPresetId) => {
    setPresetId(id);
    controlsRef.current?.setPreset(id);
  };

  const handleBell = (b: BellPhase) => {
    setBellPhase(b);
    controlsRef.current?.setBell(b);
  };

  const handleTogglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    controlsRef.current?.setPlaying(next);
  };

  const handleToggleCone = () => {
    const next = !showSightCone;
    setShowSightCone(next);
    controlsRef.current?.setConeVisible(next);
  };

  const handleTogglePath = () => {
    const next = !showPatrolPath;
    setShowPatrolPath(next);
    controlsRef.current?.setPathVisible(next);
  };

  const bellInfo = getBellPhaseConfig(bellPhase);

  return (
    <div className="border border-white/10 bg-[#0b0e12] rounded-lg overflow-hidden">
      <div className="relative w-full h-[460px] sm:h-[540px]">
        <div
          ref={mountRef}
          data-testid="lecture-hall-3d-canvas"
          className="w-full h-full cursor-grab active:cursor-grabbing"
          aria-label="Interactive 3D greybox level blockout of Lecture Hall A-104"
        />

        {/* Top-left compact title & live AI state readout (solid rgba surface, no backdrop-blur) */}
        <div className="pointer-events-none absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3">
          <div className="bg-[#0e1114]/90 border border-white/10 rounded-md px-3.5 py-2">
            <div className="text-xs text-[#a6adb5]">3D Greybox Blockout · Drag to Orbit</div>
            <div className="text-sm font-medium text-[#efece6] mt-0.5">
              Lecture Hall A-104 · {bellInfo.label}
            </div>
          </div>

          <div
            data-testid="lecturer-ai-state-badge"
            className="bg-[#0e1114]/90 border border-white/10 rounded-md px-3.5 py-2 font-mono text-xs tabular-nums"
          >
            <span className="text-[#89929c]">AI State: </span>
            <span
              className={
                aiStateLabel === 'PURSUIT'
                  ? 'text-[#c84b4b] font-semibold'
                  : aiStateLabel === 'INVESTIGATING' || aiStateLabel === 'SEARCHING'
                    ? 'text-[#d99b43] font-semibold'
                    : 'text-[#efece6] font-medium'
              }
            >
              {aiStateLabel}
            </span>
          </div>
        </div>

        {/* Collapsible Unified Bottom Control Dock */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(1060px,96%)] flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="mb-1.5 px-3 py-1 text-xs font-medium text-[#cfd4da] bg-[#0e1114]/95 border border-white/10 rounded-md hover:text-[#efece6] cursor-pointer whitespace-nowrap"
          >
            {dockCollapsed ? 'Show Controls' : 'Hide Controls'}
          </button>

          {!dockCollapsed && (
            <div className="w-full bg-[#0e1114]/95 border border-white/10 rounded-md px-3 py-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {CAMERA_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePreset(p.id)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      presetId === p.id
                        ? 'bg-[#efece6] text-[#0e1114]'
                        : 'text-[#cfd4da] hover:bg-white/5'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {([1, 2, 3] as BellPhase[]).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleBell(b)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      bellPhase === b
                        ? 'bg-[#d99b43] text-[#0e1114] border-[#d99b43]'
                        : 'border-white/10 text-[#cfd4da] hover:border-white/25'
                    }`}
                  >
                    Bell {b}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => controlsRef.current?.triggerNoise()}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[#c84b4b] text-[#efece6] hover:bg-[#b53e3e] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Trigger Noise
                </button>

                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="px-2.5 py-1.5 text-xs font-medium rounded border border-white/10 text-[#cfd4da] hover:border-white/25 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleCone}
                  className="px-2.5 py-1.5 text-xs font-medium rounded border border-white/10 text-[#cfd4da] hover:border-white/25 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {showSightCone ? 'Hide Cone' : 'Show Cone'}
                </button>

                <button
                  type="button"
                  onClick={handleTogglePath}
                  className="px-2.5 py-1.5 text-xs font-medium rounded border border-white/10 text-[#cfd4da] hover:border-white/25 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {showPatrolPath ? 'Hide Path' : 'Show Path'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
