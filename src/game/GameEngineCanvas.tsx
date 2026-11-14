import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  DifficultyLevel,
  GameHudSnapshot,
  GamePhase,
  HazardBeamDef,
  InventoryItem,
  ItemId,
  LecturerId,
  LevelDef,
  NpcDef,
  ProtagonistProfile,
} from './types';
import { getLecturerDef } from './lecturers';
import {
  ITEM_CATALOG,
  hasLineOfSight,
  resolvePlayerCollision,
} from './worldLayout';
import {
  CAMPAIGN_LEVELS,
  NPC_PALETTES,
  getLevelDef,
} from './levels';
import {
  createMadukaBrain,
  MadukaBrainState,
  stepMadukaAi,
} from './madukaAi';
import { GameAudioEngine } from './audio';
import {
  AvatarEmoteId,
  AvatarId,
  PLAYFUL_MADUKA_LINES,
  PaperAirplaneState,
  createPaperAirplane,
  getAvatarDef,
  resolveAvatarExpression,
  stepPaperAirplane,
} from './avatarSystem';
import {
  computeHeadBobOffsets,
  computeTargetCameraFov,
  computeTargetCameraRig,
} from './cameraSystem';
import {
  PHYSICS_CONSTANTS,
  PlayerPhysicsState,
  SurfaceMaterial,
  createInitialPhysicsState,
  resolveHorizontalCollision3D,
  stepPlayerPhysics,
} from './physics';

export interface MobileInputState {
  moveX: number; // -1..1
  moveY: number; // -1..1 (up is +1)
  lookDeltaX: number;
  lookDeltaY: number;
}

export interface GameEngineHandle {
  resetRun: () => void;
  toggleFlashlight: () => void;
  toggleCrouch: () => void;
  toggleCameraMode: () => void;
  triggerEmote: (emote: AvatarEmoteId) => void;
  triggerInteract: () => void;
  triggerJump: () => void;
  triggerRoll: () => void;
  toggleSprint: () => void;
  setMuted: (muted: boolean) => void;
  applyMobileLook: (dx: number, dy: number) => void;
  setMobileMove: (mx: number, my: number) => void;
  setMobileSprint: (sprinting: boolean) => void;
}

interface GameEngineCanvasProps {
  gamePhase: GamePhase;
  difficulty: DifficultyLevel;
  profile: ProtagonistProfile;
  levelId: number;
  lecturerId: LecturerId;
  runNonce: number;
  onHudUpdate: (snapshot: GameHudSnapshot) => void;
  onPhaseChange: (phase: GamePhase, snapshot: GameHudSnapshot) => void;
  engineHandleRef: React.MutableRefObject<GameEngineHandle | null>;
}

function createChalkboardTex(heading: string, lines: string[]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#16221c';
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = 'rgba(235, 240, 230, 0.88)';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(heading, 26, 44, 460);

    const line0 = lines[0] ?? 'PROF. AUGUSTUS B. MADUKA';
    ctx.font = line0.length > 50 ? '12px monospace' : '13px monospace';
    ctx.fillStyle = '#d99b43';
    ctx.fillText(line0, 26, 78, 460);

    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(220, 226, 218, 0.78)';
    ctx.fillText(lines[1] ?? '', 26, 120, 460);
    ctx.fillText(lines[2] ?? '', 26, 152, 460);

    ctx.strokeStyle = 'rgba(235, 240, 230, 0.4)';
    ctx.strokeRect(26, 194, 235, 38);
    ctx.fillText('THE BLACKWOOD EXPERIMENT', 38, 218);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTileFloorTex(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1b2028';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

function buildMadukaMesh(): {
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  pointerArm: THREE.Group;
  flashlight: THREE.SpotLight;
  flashlightTarget: THREE.Object3D;
} {
  // Matches maduka_turnaround_4c84d9fe.svg (178 cm)
  const group = new THREE.Group();

  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x26272c, roughness: 0.78, metalness: 0.06 });
  const trousersMat = new THREE.MeshStandardMaterial({ color: 0x33353b, roughness: 0.82, metalness: 0.04 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.45, metalness: 0.15 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.65 });
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x6a1b25, roughness: 0.55 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 0.6, metalness: 0.03 });
  const neckMat = new THREE.MeshStandardMaterial({ color: 0x7a4d33, roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1e22, roughness: 0.85 });
  const templeMat = new THREE.MeshStandardMaterial({ color: 0x8c8c92, roughness: 0.75 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.25, metalness: 0.8 });
  const watchMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.2, metalness: 0.9 });
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });

  // Ground contact shadow
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 24),
    new THREE.MeshBasicMaterial({ color: 0x050608, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  group.add(shadowDisc);

  // Legs + Shoes pivoted at hip (y = 0.86)
  const buildLeg = (xOff: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOff, 0.86, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.16), trousersMat);
    leg.position.set(0, -0.4, 0);
    leg.castShadow = true;
    legPivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.075, 0.25), shoeMat);
    shoe.position.set(0, -0.822, 0.04);
    shoe.castShadow = true;
    legPivot.add(shoe);
    group.add(legPivot);
    return legPivot;
  };
  const leftLeg = buildLeg(-0.115);
  const rightLeg = buildLeg(0.115);

  // Shirt torso + open dark charcoal blazer panels revealing collar & burgundy tie
  const shirtBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.56, 0.21), shirtMat);
  shirtBody.position.set(0, 1.15, 0.005);
  group.add(shirtBody);

  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.59, 0.235), jacketMat);
    lapel.position.set(side * 0.135, 1.14, 0);
    lapel.castShadow = true;
    group.add(lapel);
  }
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.59, 0.11), jacketMat);
  backPanel.position.set(0, 1.14, -0.065);
  backPanel.castShadow = true;
  group.add(backPanel);

  // Collar + Burgundy Tie
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.2), shirtMat);
  collar.position.set(0, 1.43, 0.02);
  group.add(collar);

  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.34, 0.03), tieMat);
  tie.position.set(0, 1.24, 0.125);
  group.add(tie);

  // Left resting arm with white cuff, silver watch & hand
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.26, 1.38, 0);
  const leftSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.52, 0.12), jacketMat);
  leftSleeve.position.set(0, -0.25, 0);
  leftArm.add(leftSleeve);
  const leftCuff = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.04, 0.125), shirtMat);
  leftCuff.position.set(0, -0.52, 0);
  leftArm.add(leftCuff);
  const watch = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.03, 0.13), watchMat);
  watch.position.set(0, -0.49, 0);
  leftArm.add(watch);
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), skinMat);
  leftHand.position.set(0, -0.58, 0);
  leftArm.add(leftHand);
  group.add(leftArm);

  // Right pointer/flashlight arm
  const pointerArm = new THREE.Group();
  pointerArm.position.set(0.26, 1.38, 0);
  const rightSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.52, 0.12), jacketMat);
  rightSleeve.rotation.x = -Math.PI / 4.2;
  rightSleeve.position.set(0, -0.18, 0.16);
  pointerArm.add(rightSleeve);
  const rightCuff = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.04, 0.125), shirtMat);
  rightCuff.rotation.x = -Math.PI / 4.2;
  rightCuff.position.set(0, -0.36, 0.34);
  pointerArm.add(rightCuff);
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), skinMat);
  rightHand.position.set(0, -0.41, 0.39);
  pointerArm.add(rightHand);
  const ruler = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.018, 0.62),
    new THREE.MeshStandardMaterial({ color: 0x9b6b3b, roughness: 0.45 }),
  );
  ruler.position.set(0, -0.41, 0.66);
  pointerArm.add(ruler);
  group.add(pointerArm);

  // Neck + Head + Silvering Temples + Stern Brows + Rectangular Spectacles
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.068, 0.12, 10), neckMat);
  neck.position.set(0, 1.49, 0);
  group.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.21), skinMat);
  head.position.set(0, 1.66, 0);
  head.castShadow = true;
  group.add(head);

  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.085, 0.225), hairMat);
  hairTop.position.set(0, 1.775, -0.01);
  group.add(hairTop);

  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.17, 0.06), hairMat);
  hairBack.position.set(0, 1.67, -0.095);
  group.add(hairBack);

  for (const side of [-1, 1]) {
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.07, 0.075), templeMat);
    temple.position.set(side * 0.112, 1.71, -0.01);
    group.add(temple);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.018, 0.02), hairMat);
    brow.position.set(side * 0.052, 1.7, 0.108);
    brow.rotation.z = side * -0.12;
    group.add(brow);

    const sclera = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.024, 0.015), scleraMat);
    sclera.position.set(side * 0.048, 1.665, 0.106);
    group.add(sclera);

    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.018), pupilMat);
    pupil.position.set(side * 0.048, 1.665, 0.11);
    group.add(pupil);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.046, 0.016), frameMat);
    frame.position.set(side * 0.05, 1.665, 0.116);
    group.add(frame);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.012, 0.016), frameMat);
  bridge.position.set(0, 1.668, 0.116);
  group.add(bridge);

  // Maduka SpotLight beam (+Z local)
  const flashlight = new THREE.SpotLight(0xffe1a6, 6.5, 18, Math.PI / 4.2, 0.48, 1.6);
  flashlight.position.set(0, 1.55, 0.32);
  const flashlightTarget = new THREE.Object3D();
  flashlightTarget.position.set(0, 0.6, 7.5);
  group.add(flashlight);
  group.add(flashlightTarget);
  flashlight.target = flashlightTarget;

  return { group, leftLeg, rightLeg, pointerArm, flashlight, flashlightTarget };
}

function buildMisaMesh(): ReturnType<typeof buildMadukaMesh> {
  // Wicked female Sociology lecturer Mrs. Misa with glowing red eyes
  const group = new THREE.Group();

  const blazerMat = new THREE.MeshStandardMaterial({ color: 0x351022, roughness: 0.68, metalness: 0.08 });
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x210b16, roughness: 0.78, metalness: 0.05 });
  const blouseMat = new THREE.MeshStandardMaterial({ color: 0x8f1d32, roughness: 0.52 });
  const heelMat = new THREE.MeshStandardMaterial({ color: 0x160a10, roughness: 0.35, metalness: 0.25 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x845238, roughness: 0.58, metalness: 0.03 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x140f17, roughness: 0.8 });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 });
  const eyeSocketMat = new THREE.MeshStandardMaterial({ color: 0x1d0408, roughness: 0.4 });
  const redEyeMat = new THREE.MeshStandardMaterial({
    color: 0xff1e2d,
    emissive: 0xff0019,
    emissiveIntensity: 2.8,
    roughness: 0.15,
  });

  // Ground contact shadow
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 24),
    new THREE.MeshBasicMaterial({ color: 0x050608, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  group.add(shadowDisc);

  // Legs + Stiletto Heels
  const buildLeg = (xOff: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOff, 0.84, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.78, 0.12), skinMat);
    leg.position.set(0, -0.39, 0);
    leg.castShadow = true;
    legPivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.23), heelMat);
    shoe.position.set(0, -0.805, 0.04);
    shoe.castShadow = true;
    legPivot.add(shoe);
    group.add(legPivot);
    return legPivot;
  };
  const leftLeg = buildLeg(-0.095);
  const rightLeg = buildLeg(0.095);

  // Tailored Pencil Skirt (hip flare)
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.46, 12), skirtMat);
  skirt.position.set(0, 0.74, 0);
  skirt.castShadow = true;
  group.add(skirt);

  // Crimson Silk Blouse + Open Plum Blazer
  const blouse = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.5, 0.19), blouseMat);
  blouse.position.set(0, 1.17, 0.01);
  group.add(blouse);

  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.53, 0.21), blazerMat);
    lapel.position.set(side * 0.12, 1.17, 0);
    lapel.castShadow = true;
    group.add(lapel);
  }
  const backBlazer = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.53, 0.1), blazerMat);
  backBlazer.position.set(0, 1.17, -0.06);
  backBlazer.castShadow = true;
  group.add(backBlazer);

  // Left arm
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.23, 1.39, 0);
  const leftSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.5, 0.105), blazerMat);
  leftSleeve.position.set(0, -0.24, 0);
  leftArm.add(leftSleeve);
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 10), skinMat);
  leftHand.position.set(0, -0.54, 0);
  leftArm.add(leftHand);
  group.add(leftArm);

  // Right pointer arm holding crimson Sociology grading baton
  const pointerArm = new THREE.Group();
  pointerArm.position.set(0.23, 1.39, 0);
  const rightSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.5, 0.105), blazerMat);
  rightSleeve.rotation.x = -Math.PI / 4.2;
  rightSleeve.position.set(0, -0.17, 0.15);
  pointerArm.add(rightSleeve);
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 10), skinMat);
  rightHand.position.set(0, -0.39, 0.37);
  pointerArm.add(rightHand);
  const baton = new THREE.Mesh(
    new THREE.BoxGeometry(0.026, 0.02, 0.64),
    new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.35, metalness: 0.2 }),
  );
  baton.position.set(0, -0.39, 0.65);
  pointerArm.add(baton);
  group.add(pointerArm);

  // Neck + Head + Wicked Updo Hair + Sharp Brows + Crimson Smirk + GLOWING RED EYES
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.12, 10), skinMat);
  neck.position.set(0, 1.49, 0);
  group.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.24, 0.2), skinMat);
  head.position.set(0, 1.66, 0);
  head.castShadow = true;
  group.add(head);

  const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.215), hairMat);
  hairCap.position.set(0, 1.775, -0.008);
  group.add(hairCap);

  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.215, 0.24, 0.075), hairMat);
  hairBack.position.set(0, 1.64, -0.092);
  group.add(hairBack);

  const hairBun = new THREE.Mesh(new THREE.SphereGeometry(0.088, 12, 12), hairMat);
  hairBun.position.set(0, 1.84, -0.085);
  group.add(hairBun);

  for (const side of [-1, 1]) {
    // Wicked angled eyebrows
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.016, 0.02), hairMat);
    brow.position.set(side * 0.048, 1.702, 0.105);
    brow.rotation.z = side * -0.22;
    group.add(brow);

    // Dark socket + bright glowing RED eyes
    const socket = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.026, 0.014), eyeSocketMat);
    socket.position.set(side * 0.046, 1.666, 0.101);
    group.add(socket);

    const redEye = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.02, 0.018), redEyeMat);
    redEye.position.set(side * 0.046, 1.666, 0.106);
    group.add(redEye);
  }

  // Crimson lipstick smirk
  const lips = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.016, 0.015), lipMat);
  lips.position.set(0, 1.592, 0.102);
  lips.rotation.z = -0.06;
  group.add(lips);

  // Subtle crimson eye glow light
  const eyeGlow = new THREE.PointLight(0xff1e2d, 1.5, 2.8, 1.5);
  eyeGlow.position.set(0, 1.67, 0.22);
  group.add(eyeGlow);

  // Mrs. Misa crimson-tinted SpotLight beam
  const flashlight = new THREE.SpotLight(0xffb4b4, 6.8, 18.5, Math.PI / 4.2, 0.48, 1.6);
  flashlight.position.set(0, 1.55, 0.32);
  const flashlightTarget = new THREE.Object3D();
  flashlightTarget.position.set(0, 0.6, 7.5);
  group.add(flashlight);
  group.add(flashlightTarget);
  flashlight.target = flashlightTarget;

  return { group, leftLeg, rightLeg, pointerArm, flashlight, flashlightTarget };
}

function buildProtagonistMesh(initialProfile: ProtagonistProfile): {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  glassesGroup: THREE.Group;
  headbandMesh: THREE.Mesh;
  backpackGroup: THREE.Group;
  satchelGroup: THREE.Group;
  hoodieMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
} {
  const def = getAvatarDef(initialProfile.avatarId);
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const hoodieMat = new THREE.MeshStandardMaterial({
    color: initialProfile.jacketColor,
    roughness: 0.72,
    metalness: 0.05,
  });
  const trimColor = new THREE.Color(initialProfile.jacketColor).multiplyScalar(0.78);
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.78, metalness: 0.05 });
  const jeansMat = new THREE.MeshStandardMaterial({ color: 0x2b3445, roughness: 0.85 });
  const sneakerMat = new THREE.MeshStandardMaterial({ color: 0xedeadc, roughness: 0.55 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xe0a526, roughness: 0.6 });
  const skinMat = new THREE.MeshStandardMaterial({ color: def.skinColor, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.85 });
  const packMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3f, roughness: 0.75 });
  const packPocketMat = new THREE.MeshStandardMaterial({ color: 0x2f2f34, roughness: 0.75 });
  const accentMat = new THREE.MeshStandardMaterial({ color: def.accentColor, roughness: 0.45 });
  const stringMat = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.6 });
  const watchBandMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.4 });
  const watchScreenMat = new THREE.MeshStandardMaterial({
    color: 0x6fd0c8,
    emissive: 0x6fd0c8,
    emissiveIntensity: 0.65,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e2228, roughness: 0.3, metalness: 0.8 });
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.44, 24),
    new THREE.MeshBasicMaterial({ color: 0x050608, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  group.add(shadowDisc);

  // Jeans + Cream/Mustard-Sole Sneakers
  const buildLeg = (xOff: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOff, 0.84, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.77, 0.16), jeansMat);
    leg.position.set(0, -0.385, 0);
    leg.castShadow = true;
    legPivot.add(leg);
    const sneaker = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.068, 0.25), sneakerMat);
    sneaker.position.set(0, -0.785, 0.04);
    legPivot.add(sneaker);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.026, 0.255), soleMat);
    sole.position.set(0, -0.827, 0.04);
    legPivot.add(sole);
    bodyPivot.add(legPivot);
    return legPivot;
  };
  const leftLeg = buildLeg(-0.115);
  const rightLeg = buildLeg(0.115);

  // Hoodie Torso + Hem + Kangaroo Pocket + Drawstrings + Chest Badge
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.23), hoodieMat);
  torso.position.set(0, 1.13, 0);
  torso.castShadow = true;
  bodyPivot.add(torso);

  const hem = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.065, 0.238), trimMat);
  hem.position.set(0, 0.87, 0);
  bodyPivot.add(hem);

  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.16, 0.04), trimMat);
  pocket.position.set(0, 0.99, 0.125);
  bodyPivot.add(pocket);

  const chestBadge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), accentMat);
  chestBadge.position.set(0.12, 1.29, 0.122);
  bodyPivot.add(chestBadge);

  for (const side of [-1, 1]) {
    const drawstring = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.18, 0.015), stringMat);
    drawstring.position.set(side * 0.032, 1.29, 0.124);
    bodyPivot.add(drawstring);
  }

  const hoodCollar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.25), trimMat);
  hoodCollar.position.set(0, 1.43, -0.01);
  bodyPivot.add(hoodCollar);

  // Backpack Style (Tunde & Daniel)
  const backpackGroup = new THREE.Group();
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.54, 0.17), packMat);
  backpack.position.set(0, 1.16, -0.19);
  backpack.castShadow = true;
  backpackGroup.add(backpack);
  const packPocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.05), packPocketMat);
  packPocket.position.set(0, 1.04, -0.28);
  backpackGroup.add(packPocket);
  const packStripe = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.024, 0.055), accentMat);
  packStripe.position.set(0, 1.15, -0.28);
  backpackGroup.add(packStripe);
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.25), accentMat);
    strap.position.set(side * 0.135, 1.21, 0);
    backpackGroup.add(strap);
  }
  backpackGroup.visible = def.packStyle === 'backpack';
  bodyPivot.add(backpackGroup);

  // Crossbody Satchel Style (Amara & Victor)
  const satchelGroup = new THREE.Group();
  const satchelStrap = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.55, 0.26), accentMat);
  satchelStrap.position.set(0, 1.15, 0);
  satchelStrap.rotation.z = 0.55;
  satchelGroup.add(satchelStrap);
  const satchelBag = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.28), packMat);
  satchelBag.position.set(-0.24, 0.9, -0.05);
  satchelGroup.add(satchelBag);
  satchelGroup.visible = def.packStyle === 'satchel';
  bodyPivot.add(satchelGroup);

  // Left Arm (with smartwatch!) + Right Arm
  const buildArm = (side: number, hasWatch: boolean) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.27, 1.36, 0);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.5, 0.12), hoodieMat);
    sleeve.position.set(0, -0.24, 0);
    armPivot.add(sleeve);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.055, 0.126), trimMat);
    cuff.position.set(0, -0.5, 0);
    armPivot.add(cuff);
    if (hasWatch) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.035, 0.132), watchBandMat);
      band.position.set(0, -0.525, 0);
      armPivot.add(band);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.024, 0.02), watchScreenMat);
      screen.position.set(0, -0.525, 0.068);
      armPivot.add(screen);
    }
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), skinMat);
    hand.position.set(0, -0.58, 0);
    armPivot.add(hand);
    bodyPivot.add(armPivot);
    return armPivot;
  };
  const leftArm = buildArm(1, true);
  const rightArm = buildArm(-1, false);

  // Pivoted Head Group (tilts, nods, shakes during playful emotes!)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.44, 0);
  bodyPivot.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.066, 0.11, 10), skinMat);
  neck.position.set(0, 0.03, 0);
  headGroup.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.215, 0.24, 0.205), skinMat);
  head.position.set(0, 0.19, 0);
  head.castShadow = true;
  headGroup.add(head);

  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.226, 0.085, 0.218), hairMat);
  hairTop.position.set(0, 0.3, -0.01);
  headGroup.add(hairTop);

  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.06), hairMat);
  hairBack.position.set(0, 0.2, -0.09);
  headGroup.add(hairBack);

  const headbandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.232, 0.032, 0.225), accentMat);
  headbandMesh.position.set(0, 0.265, -0.005);
  headbandMesh.visible = Boolean(def.headbandColor);
  headGroup.add(headbandMesh);

  const glassesGroup = new THREE.Group();
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.016, 0.018), hairMat);
    brow.position.set(side * 0.048, 0.23, 0.104);
    headGroup.add(brow);
    const sclera = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.024, 0.015), scleraMat);
    sclera.position.set(side * 0.048, 0.195, 0.104);
    headGroup.add(sclera);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.018), pupilMat);
    pupil.position.set(side * 0.048, 0.195, 0.108);
    headGroup.add(pupil);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.042, 0.016), frameMat);
    rim.position.set(side * 0.048, 0.195, 0.114);
    glassesGroup.add(rim);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.016), frameMat);
  bridge.position.set(0, 0.198, 0.114);
  glassesGroup.add(bridge);
  glassesGroup.visible = def.hasGlasses;
  headGroup.add(glassesGroup);

  return {
    group,
    bodyPivot,
    headGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    glassesGroup,
    headbandMesh,
    backpackGroup,
    satchelGroup,
    hoodieMat,
    trimMat,
    skinMat,
    accentMat,
  };
}

function buildFirstPersonArm(initialProfile: ProtagonistProfile): {
  group: THREE.Group;
  hoodieMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
} {
  const def = getAvatarDef(initialProfile.avatarId);
  const group = new THREE.Group();
  const hoodieMat = new THREE.MeshStandardMaterial({ color: initialProfile.jacketColor, roughness: 0.72 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialProfile.jacketColor).multiplyScalar(0.78),
    roughness: 0.78,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: def.skinColor, roughness: 0.6 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.35, metalness: 0.8 });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xfff1d6,
    emissive: 0xffe4b3,
    emissiveIntensity: 0.85,
  });

  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.095, 0.42), hoodieMat);
  sleeve.position.set(0.28, -0.24, -0.34);
  sleeve.rotation.x = 0.08;
  group.add(sleeve);

  const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.102, 0.055), trimMat);
  cuff.position.set(0.275, -0.22, -0.54);
  cuff.rotation.x = 0.08;
  group.add(cuff);

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), skinMat);
  hand.position.set(0.27, -0.21, -0.59);
  group.add(hand);

  const torchBody = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.022, 0.22, 10), metalMat);
  torchBody.rotation.x = Math.PI / 2;
  torchBody.position.set(0.27, -0.19, -0.62);
  group.add(torchBody);

  const torchHead = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.026, 0.055, 12), metalMat);
  torchHead.rotation.x = Math.PI / 2;
  torchHead.position.set(0.27, -0.19, -0.73);
  group.add(torchHead);

  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), lensMat);
  lens.rotation.y = Math.PI;
  lens.position.set(0.27, -0.19, -0.76);
  group.add(lens);

  return { group, hoodieMat, trimMat, skinMat };
}

function buildPaperAirplaneMesh(): THREE.Group {
  const g = new THREE.Group();
  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xf7f3e8,
    emissive: 0xd99b43,
    emissiveIntensity: 0.25,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 3), paperMat);
  body.rotation.x = -Math.PI / 2;
  body.scale.set(1.6, 1, 0.22);
  g.add(body);
  return g;
}

function buildStudentDeskMesh(
  width: number,
  woodMat: THREE.Material,
  steelMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 0.75), woodMat);
  top.position.set(0, 0.88, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);

  const modesty = new THREE.Mesh(new THREE.BoxGeometry(width - 0.1, 0.62, 0.06), woodMat);
  modesty.position.set(0, 0.52, -0.32);
  modesty.castShadow = true;
  modesty.receiveShadow = true;
  g.add(modesty);

  const legGeo = new THREE.BoxGeometry(0.07, 0.86, 0.07);
  for (const lx of [-width * 0.45, 0, width * 0.45]) {
    const leg = new THREE.Mesh(legGeo, steelMat);
    leg.position.set(lx, 0.43, -0.28);
    g.add(leg);
  }
  return g;
}

function buildLockerMesh(lockerMat: THREE.Material, accentMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 1.2), lockerMat);
  body.position.set(0, 1.1, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.6), accentMat);
  vent.position.set(0.56, 1.65, 0);
  g.add(vent);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.05), accentMat);
  handle.position.set(0.57, 1.1, 0.38);
  g.add(handle);
  return g;
}

function buildNpcMesh(npc: NpcDef): {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  rightArm: THREE.Group;
  ringMesh: THREE.Mesh;
} {
  const pal = NPC_PALETTES[npc.id];
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const coatMat = new THREE.MeshStandardMaterial({ color: pal.coatColor, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pal.pantsColor, roughness: 0.85 });
  const skinMat = new THREE.MeshStandardMaterial({ color: pal.skinColor, roughness: 0.6 });
  const accentMat = new THREE.MeshStandardMaterial({ color: pal.accentColor, roughness: 0.45 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x151518, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.5 });

  // Ground beacon ring so player immediately spots Blackwood NPCs
  const ringColor = npc.behavior === 'rival_snitch' ? 0xef4444 : pal.accentColor;
  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.52, 24),
    new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.02;
  group.add(ringMesh);

  const makeLeg = (xOff: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOff, 0.82, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.76, 0.15), pantsMat);
    leg.position.set(0, -0.38, 0);
    leg.castShadow = true;
    legPivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.07, 0.23), shoeMat);
    shoe.position.set(0, -0.785, 0.035);
    legPivot.add(shoe);
    bodyPivot.add(legPivot);
    return legPivot;
  };
  const leftLeg = makeLeg(-0.11);
  const rightLeg = makeLeg(0.11);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.22), coatMat);
  torso.position.set(0, 1.12, 0);
  torso.castShadow = true;
  bodyPivot.add(torso);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.03), accentMat);
  stripe.position.set(0, 1.18, 0.115);
  bodyPivot.add(stripe);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.26, 1.34, 0);
  const lSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.11), coatMat);
  lSleeve.position.set(0, -0.23, 0);
  leftArm.add(lSleeve);
  const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), skinMat);
  lHand.position.set(0, -0.51, 0);
  leftArm.add(lHand);
  bodyPivot.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.26, 1.34, 0);
  const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.11), coatMat);
  rSleeve.position.set(0, -0.23, 0);
  rightArm.add(rSleeve);
  const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), skinMat);
  rHand.position.set(0, -0.51, 0);
  rightArm.add(rHand);
  if (pal.prop === 'book' || pal.prop === 'clipboard' || pal.prop === 'folder') {
    const propMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.04, 0.24),
      new THREE.MeshStandardMaterial({ color: pal.accentColor, roughness: 0.5 }),
    );
    propMesh.position.set(0, -0.49, 0.13);
    rightArm.add(propMesh);
  } else if (pal.prop === 'torch') {
    const torch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.4 }),
    );
    torch.rotation.x = Math.PI / 2;
    torch.position.set(0, -0.48, 0.12);
    rightArm.add(torch);
  }
  bodyPivot.add(rightArm);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.23, 0.2), skinMat);
  head.position.set(0, 1.59, 0);
  head.castShadow = true;
  bodyPivot.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.215), hairMat);
  hair.position.set(0, 1.71, -0.01);
  bodyPivot.add(hair);

  if (pal.hasCap) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.075, 0.25), coatMat);
    cap.position.set(0, 1.74, 0.02);
    bodyPivot.add(cap);
  }
  if (pal.hasGlasses) {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e2228, metalness: 0.7 });
    for (const side of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.04, 0.015), frameMat);
      rim.position.set(side * 0.046, 1.6, 0.108);
      bodyPivot.add(rim);
    }
  }

  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const side of [-1, 1]) {
    const sc = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.022, 0.014), scleraMat);
    sc.position.set(side * 0.045, 1.6, 0.102);
    bodyPivot.add(sc);
    const pu = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.016), pupilMat);
    pu.position.set(side * 0.045, 1.6, 0.106);
    bodyPivot.add(pu);
  }

  group.position.set(npc.x, 0, npc.z);
  group.rotation.y = npc.yaw;
  return { group, bodyPivot, leftLeg, rightLeg, rightArm, ringMesh };
}

export function GameEngineCanvas({
  gamePhase,
  difficulty,
  profile,
  levelId,
  lecturerId,
  runNonce,
  onHudUpdate,
  onPhaseChange,
  engineHandleRef,
}: GameEngineCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const phaseRef = useRef<GamePhase>(gamePhase);
  const difficultyRef = useRef<DifficultyLevel>(difficulty);
  const profileRef = useRef<ProtagonistProfile>(profile);
  const levelIdRef = useRef<number>(levelId);
  const lecturerIdRef = useRef<LecturerId>(lecturerId);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onPhaseChangeRef = useRef(onPhaseChange);

  phaseRef.current = gamePhase;
  difficultyRef.current = difficulty;
  profileRef.current = profile;
  levelIdRef.current = levelId;
  lecturerIdRef.current = lecturerId;
  onHudUpdateRef.current = onHudUpdate;
  onPhaseChangeRef.current = onPhaseChange;

  const resetFnRef = useRef<(() => void) | null>(null);
  const syncProfileRef = useRef<((prof: ProtagonistProfile) => void) | null>(null);
  const syncLecturerRef = useRef<((id: LecturerId) => void) | null>(null);

  useEffect(() => {
    if (runNonce > 0 || levelId > 0) {
      resetFnRef.current?.();
    }
  }, [runNonce, levelId]);

  useEffect(() => {
    syncProfileRef.current?.(profile);
  }, [profile]);

  useEffect(() => {
    syncLecturerRef.current?.(lecturerId);
  }, [lecturerId]);

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

    const audio = new GameAudioEngine();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1118);
    scene.fog = new THREE.FogExp2(0x0d1118, 0.028);

    const camera = new THREE.PerspectiveCamera(64, width / height, 0.1, 80);
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Lighting rig: Cool Campus Hemisphere + Moonlight Directional + Hall Ceiling Lamps + Player Flashlight
    const hemiLight = new THREE.HemisphereLight(0xa3c0e6, 0x332820, 1.35);
    scene.add(hemiLight);

    const moonDir = new THREE.DirectionalLight(0xb8d0f2, 0.9);
    moonDir.position.set(-14, 15, 6);
    if (!isSoftwareGl) {
      moonDir.castShadow = true;
      moonDir.shadow.mapSize.set(1024, 1024);
      moonDir.shadow.camera.near = 1;
      moonDir.shadow.camera.far = 40;
      moonDir.shadow.camera.left = -14;
      moonDir.shadow.camera.right = 14;
      moonDir.shadow.camera.top = 14;
      moonDir.shadow.camera.bottom = -14;
      moonDir.shadow.bias = -0.0005;
    }
    scene.add(moonDir);

    const hallLampA = new THREE.PointLight(0xffdca3, 8.5, 24, 1.0);
    hallLampA.position.set(0, 4.1, -5.0);
    scene.add(hallLampA);

    const hallLampB = new THREE.PointLight(0xffdca3, 7.5, 24, 1.0);
    hallLampB.position.set(0, 4.1, 4.8);
    scene.add(hallLampB);

    const officeLamp = new THREE.PointLight(0xffb454, 6.0, 12, 1.1);
    officeLamp.position.set(7.8, 2.5, -9.8);
    scene.add(officeLamp);

    const exitLight = new THREE.PointLight(0xef4444, 3.2, 9, 1.2);
    exitLight.position.set(0, 3.3, 11.4);
    scene.add(exitLight);

    // Player Flashlight mounted to camera
    const playerFlashlight = new THREE.SpotLight(0xfff1d6, 12.0, 26, Math.PI / 4.8, 0.45, 1.1);
    const playerFlashTarget = new THREE.Object3D();
    playerFlashTarget.position.set(0, -0.05, -10);
    camera.add(playerFlashlight);
    camera.add(playerFlashTarget);
    playerFlashlight.target = playerFlashTarget;
    scene.add(camera);

    // Materials
    const floorTex = createTileFloorTex();
    floorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: floorTex,
      roughness: 0.78,
      metalness: 0.08,
    });
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2c3442,
      roughness: 0.82,
      metalness: 0.06,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6b4830,
      roughness: 0.68,
      metalness: 0.05,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x3b4452,
      roughness: 0.35,
      metalness: 0.75,
    });
    const lockerMat = new THREE.MeshStandardMaterial({
      color: 0x435161,
      roughness: 0.42,
      metalness: 0.62,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd99b43,
      roughness: 0.25,
      metalness: 0.85,
    });

    // Persistent Room Shell
    const floor = new THREE.Mesh(new THREE.BoxGeometry(24.5, 0.2, 26), floorMat);
    floor.position.set(0, -0.1, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(24.5, 0.2, 26),
      new THREE.MeshStandardMaterial({ color: 0x1e242e, roughness: 0.9 }),
    );
    ceiling.position.set(0, 4.9, 0);
    scene.add(ceiling);

    // Dynamic Level Container (rebuilt cleanly whenever levelId changes)
    const levelGroup = new THREE.Group();
    scene.add(levelGroup);

    const exitSignMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.3,
    });
    const breakerLedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.6,
    });

    let activeLevel: LevelDef = getLevelDef(levelIdRef.current);
    let rearDoorMesh: THREE.Mesh | null = null;
    let activeChalkTex: THREE.CanvasTexture | null = null;
    const pickupMeshes = new Map<string, THREE.Object3D>();

    interface NpcRuntimeActor {
      def: NpcDef;
      visual: ReturnType<typeof buildNpcMesh>;
      x: number;
      z: number;
      yaw: number;
      talkIndex: number;
      rewarded: boolean;
      distractTimer: number;
      snitchCooldown: number;
    }
    let npcActors: NpcRuntimeActor[] = [];

    interface HazardBeamRuntime {
      def: HazardBeamDef;
      beamMesh: THREE.Mesh;
      currentX: number;
      currentZ: number;
    }
    let hazardBeamActors: HazardBeamRuntime[] = [];

    const rebuildLevelScene = (lvl: LevelDef) => {
      activeLevel = lvl;
      while (levelGroup.children.length > 0) {
        const child = levelGroup.children[0];
        levelGroup.remove(child);
      }
      pickupMeshes.clear();
      npcActors = [];
      hazardBeamActors = [];
      rearDoorMesh = null;
      if (activeChalkTex) {
        activeChalkTex.dispose();
        activeChalkTex = null;
      }

      // Apply Level Theme
      scene.background = new THREE.Color(lvl.theme.fogColor);
      scene.fog = new THREE.FogExp2(lvl.theme.fogColor, lvl.theme.fogDensity);
      floorMat.color.setHex(lvl.theme.floorColor).lerp(new THREE.Color(0xffffff), 0.72);
      wallMat.color.setHex(lvl.theme.wallColor);
      woodMat.color.setHex(lvl.theme.deskColor);
      hallLampA.color.setHex(lvl.theme.lampColor);
      hallLampB.color.setHex(lvl.theme.lampColor);

      // Build Architecture from lvl.colliders (1:1 match with collision)
      for (const box of lvl.colliders) {
        const w = box.maxX - box.minX;
        const d = box.maxZ - box.minZ;
        const cx = (box.minX + box.maxX) / 2;
        const cz = (box.minZ + box.maxZ) / 2;

        if (box.kind === 'desk') {
          if (box.id.includes('lectern') || box.id === 'office_desk' || box.id.includes('plinth') || box.id.includes('counter')) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, box.height, d), woodMat);
            m.position.set(cx, box.height / 2, cz);
            m.castShadow = true;
            m.receiveShadow = true;
            levelGroup.add(m);
          } else {
            const desk = buildStudentDeskMesh(w, woodMat, steelMat);
            desk.position.set(cx, 0, cz);
            levelGroup.add(desk);
          }
        } else if (box.kind === 'locker') {
          const locker = buildLockerMesh(lockerMat, brassMat);
          if (cx > 0) locker.rotation.y = Math.PI;
          locker.position.set(cx, 0, cz);
          levelGroup.add(locker);
        } else if (box.kind === 'door_locked') {
          const doorMat = new THREE.MeshStandardMaterial({
            color: 0x4b2f20,
            roughness: 0.65,
            metalness: 0.12,
          });
          rearDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(w, box.height, d), doorMat);
          rearDoorMesh.position.set(cx, box.height / 2, cz);
          levelGroup.add(rearDoorMesh);
        } else {
          const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, box.height, d), wallMat);
          wallMesh.position.set(cx, box.height / 2, cz);
          wallMesh.receiveShadow = true;
          levelGroup.add(wallMesh);
        }
      }

      // Build Level Carpet Zones
      for (const zone of lvl.carpetZones) {
        const zw = zone.maxX - zone.minX;
        const zd = zone.maxZ - zone.minZ;
        const carpetMesh = new THREE.Mesh(
          new THREE.BoxGeometry(zw, 0.02, zd),
          new THREE.MeshStandardMaterial({ color: zone.color ?? 0x3b1f23, roughness: 0.92 }),
        );
        carpetMesh.position.set((zone.minX + zone.maxX) / 2, 0.015, (zone.minZ + zone.maxZ) / 2);
        carpetMesh.receiveShadow = true;
        levelGroup.add(carpetMesh);
      }

      // Chalkboard (adapts heading/signature quote to active lecturer)
      const lecturerForBoard = getLecturerDef(lecturerIdRef.current);
      const boardHeading =
        lecturerForBoard.id === 'misa' && lvl.id === 1
          ? 'BLACKWOOD UNIVERSITY · SOC-204'
          : lvl.theme.chalkboardHeading;
      const boardLines =
        lecturerForBoard.id === 'misa' && lvl.id === 1
          ? [
              'MRS. MISA · SOCIOLOGY (WICKED)',
              '08:00 AM — DEVIANCE IS UNFORGIVEN',
              'COLLECT SOC-204 FILE: NE OFFICE',
            ]
          : lvl.theme.chalkboardLines;
      activeChalkTex = createChalkboardTex(boardHeading, boardLines);
      activeChalkTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const chalkboardMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: activeChalkTex,
        roughness: 0.85,
      });
      const chalkboard = new THREE.Mesh(
        new THREE.BoxGeometry(6.8, 2.2, 0.1),
        chalkboardMat,
      );
      chalkboard.position.set(-1.5, 2.45, -12.02);
      levelGroup.add(chalkboard);

      // Exit Sign above South Door
      const exitSign = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.15), exitSignMat);
      exitSign.position.set(0, 3.35, 11.98);
      levelGroup.add(exitSign);

      // Auxiliary Breaker Box positioned cleanly at level's breaker interactable
      const breakerDef = lvl.interactables.find((i) => i.kind === 'breaker');
      if (breakerDef) {
        const breakerGroup = new THREE.Group();
        breakerGroup.position.set(breakerDef.x - 0.05, 1.45, breakerDef.z);
        const breakerBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.65), steelMat);
        breakerGroup.add(breakerBox);
        const breakerLed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), breakerLedMat);
        breakerLed.position.set(0.16, 0.24, 0.16);
        breakerGroup.add(breakerLed);
        levelGroup.add(breakerGroup);
      }

      // Pickup Visual Meshes
      for (const item of lvl.interactables) {
        if (item.kind === 'pickup' || item.kind === 'office_desk' || item.kind === 'npc_note') {
          const g = new THREE.Group();
          g.position.set(item.x, item.y, item.z);
          const color =
            item.itemId === 'rear_exit_key'
              ? 0xf59e0b
              : item.itemId === 'breaker_fuse'
                ? 0x38bdf8
                : item.itemId === 'assignment_note'
                  ? 0xfef3c7
                  : item.itemId === 'merit_dossier'
                    ? 0xc084fc
                    : 0x34d399;

          const mesh = new THREE.Mesh(
            item.itemId === 'rear_exit_key'
              ? new THREE.TorusGeometry(0.14, 0.04, 10, 18)
              : new THREE.BoxGeometry(0.32, 0.1, 0.4),
            new THREE.MeshStandardMaterial({
              color,
              emissive: color,
              emissiveIntensity: 0.65,
              roughness: 0.35,
              metalness: 0.4,
            }),
          );
          g.add(mesh);
          levelGroup.add(g);
          pickupMeshes.set(item.id, g);
        }
      }

      // Build 3D Blackwood University NPCs
      for (const npc of lvl.npcs) {
        const visual = buildNpcMesh(npc);
        levelGroup.add(visual.group);
        npcActors.push({
          def: npc,
          visual,
          x: npc.x,
          z: npc.z,
          yaw: npc.yaw,
          talkIndex: 0,
          rewarded: false,
          distractTimer: 0,
          snitchCooldown: 0,
        });
      }

      // Build Sweeping Security / Clocktower Hazard Beams
      for (const hb of lvl.hazardBeams) {
        const beamMat = new THREE.MeshStandardMaterial({
          color: hb.color ?? 0xef4444,
          emissive: hb.color ?? 0xef4444,
          emissiveIntensity: 1.5,
          transparent: true,
          opacity: 0.85,
        });
        const beamGeo =
          hb.orientation === 'x'
            ? new THREE.CylinderGeometry(0.032, 0.032, hb.length, 8)
            : new THREE.CylinderGeometry(0.032, 0.032, hb.length, 8);
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        if (hb.orientation === 'x') {
          beamMesh.rotation.z = Math.PI / 2;
        } else {
          beamMesh.rotation.x = Math.PI / 2;
        }
        beamMesh.position.set(hb.baseX, hb.beamHeight, hb.baseZ);
        levelGroup.add(beamMesh);
        hazardBeamActors.push({
          def: hb,
          beamMesh,
          currentX: hb.baseX,
          currentZ: hb.baseZ,
        });
      }
    };

    // Antagonist Lecturers (Prof. Maduka + Wicked Red-Eyed Mrs. Misa) & Protagonist 3D Actors
    const madukaVisual = buildMadukaMesh();
    const misaVisual = buildMisaMesh();
    madukaVisual.group.visible = lecturerIdRef.current === 'maduka';
    misaVisual.group.visible = lecturerIdRef.current === 'misa';
    scene.add(madukaVisual.group);
    scene.add(misaVisual.group);
    const getActiveLecturerVisual = () =>
      lecturerIdRef.current === 'misa' ? misaVisual : madukaVisual;

    const protagonistVisual = buildProtagonistMesh(profileRef.current);
    scene.add(protagonistVisual.group);

    const fpArm = buildFirstPersonArm(profileRef.current);
    camera.add(fpArm.group);

    const paperPlaneMesh = buildPaperAirplaneMesh();
    paperPlaneMesh.visible = false;
    scene.add(paperPlaneMesh);

    syncProfileRef.current = (prof: ProtagonistProfile) => {
      const def = getAvatarDef(prof.avatarId as AvatarId);
      protagonistVisual.hoodieMat.color.set(prof.jacketColor);
      protagonistVisual.trimMat.color.set(prof.jacketColor).multiplyScalar(0.78);
      protagonistVisual.skinMat.color.set(def.skinColor);
      protagonistVisual.accentMat.color.set(def.accentColor);
      protagonistVisual.glassesGroup.visible = def.hasGlasses;
      protagonistVisual.headbandMesh.visible = Boolean(def.headbandColor);
      protagonistVisual.backpackGroup.visible = def.packStyle === 'backpack';
      protagonistVisual.satchelGroup.visible = def.packStyle === 'satchel';

      fpArm.hoodieMat.color.set(prof.jacketColor);
      fpArm.trimMat.color.set(prof.jacketColor).multiplyScalar(0.78);
      fpArm.skinMat.color.set(def.skinColor);
    };

    syncLecturerRef.current = (id: LecturerId) => {
      madukaVisual.group.visible = id === 'maduka';
      misaVisual.group.visible = id === 'misa';
      if (activeLevel.id === 1 && phaseRef.current === 'title') {
        rebuildLevelScene(activeLevel);
      }
    };

    rebuildLevelScene(activeLevel);

    // --- Mutable Game Simulation State (Zero-GC inside RAF) ---
    let physicsState: PlayerPhysicsState = createInitialPhysicsState(
      activeLevel.playerSpawn.x,
      activeLevel.playerSpawn.z,
    );
    let currentSurface: SurfaceMaterial = 'carpet';
    let queuedJump = false;
    let queuedRoll = false;
    let playerX = activeLevel.playerSpawn.x;
    let playerZ = activeLevel.playerSpawn.z;
    let playerYaw = activeLevel.playerSpawn.yaw;
    let playerPitch = -0.06;
    let playerEyeY = 1.65;
    let grounded = true;
    let stamina = 100;
    let battery = 100;
    let flashlightOn = true;
    let crouching = false;
    let cameraMode: '1p' | '3p' = '3p';
    let hiddenInLockerId: string | null = null;
    let preHideX = activeLevel.playerSpawn.x;
    let preHideZ = activeLevel.playerSpawn.z;
    let playerWalkPhase = 0;
    let camSmoothX = activeLevel.playerSpawn.x;
    let camSmoothY = 1.65;
    let camSmoothZ = activeLevel.playerSpawn.z + 2.35;
    let camOffsetBack = 2.35;
    let camOffsetRight = 0.56;
    let camOffsetUp = 0.23;
    let camBobIntensity = 0;
    let camRoll = 0;

    let activeEmote: AvatarEmoteId | null = null;
    let emoteTimer = 0;
    let emoteDuration = 1.0;
    let determinedTimer = 0;
    let planeCooldown = 0;
    let squashSpring = 1.0;
    let squashVel = 0;
    let titleTurntableSpin = 0;
    let paperPlaneState: PaperAirplaneState = {
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      age: 0,
      landed: false,
    };

    let lockdownTriggered = activeLevel.startsInLockdown;
    let powerRestored = false;
    let collectedIds = new Set<string>();
    let inventory: InventoryItem[] = [];
    let madukaBrain: MadukaBrainState = createMadukaBrain(activeLevel.madukaSpawn);
    let elapsedSeconds = 0;
    let alertsTriggered = 0;
    let footstepAccum = 0;
    let madukaWalkPhase = 0;
    let hudEmitTimer = 0;
    let titleOrbitAngle = 0;
    let beamHitCooldown = 0;
    let npcTalkedIds = new Set<string>();
    let npcLineSpeaker: string | null = null;
    let npcLineText: string | null = null;
    let npcLineTimer = 0;

    // Input Tracking (Edge vs Held)
    const keysHeld = new Set<string>();
    const mobileMove = { x: 0, y: 0 };
    let sprintToggled = false;
    let sprintExhausted = false;
    let isActivelySprinting = false;
    let isPointerDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let activeTouchId: number | null = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let touchTotalDist = 0;

    const getInventoryHas = (id: ItemId) => inventory.some((i) => i.id === id);

    const computeObjectiveText = (): string => {
      const activeLecturer = getLecturerDef(lecturerIdRef.current);
      if (!lockdownTriggered) {
        return `Collect your ${activeLecturer.courseCode} Assignment from ${activeLecturer.shortName}'s Office (North-East)`;
      }
      if (!powerRestored && !getInventoryHas('breaker_fuse')) {
        return `Find the 30A Ceramic Fuse · ${activeLevel.crazyTwist}`;
      }
      if (!powerRestored) {
        return 'Insert the 30A Fuse into the Electrical Breaker (West Wall)';
      }
      if (!getInventoryHas('rear_exit_key')) {
        return 'Retrieve the Exit Key to unlock the South Escape Door!';
      }
      return 'Unlock the South Exit Door and escape!';
    };

    const buildHudSnapshot = (
      nearPrompt: string | null,
      nearId: string | null,
      endingKind: GameHudSnapshot['endingKind'] = null,
    ): GameHudSnapshot => {
      const activeLecturer = getLecturerDef(lecturerIdRef.current);
      return {
        levelId: activeLevel.id,
        totalLevels: CAMPAIGN_LEVELS.length,
        levelTitle: activeLevel.title,
        crazyTwist: activeLevel.crazyTwist,
        chapterTitle: `${activeLevel.shortCode} · ${activeLevel.title}`,
        objectiveText: computeObjectiveText(),
        stamina: Math.round(stamina),
        battery: Math.round(battery),
        flashlightOn,
        crouching,
        sprinting: isActivelySprinting || (sprintToggled && !sprintExhausted && !crouching),
        hiddenInLockerId,
        nearPrompt,
        nearInteractableId: nearId,
        inventory: [...inventory],
        powerRestored,
        lockdownTriggered,
        lecturerId: activeLecturer.id,
        lecturerName: activeLecturer.name,
        madukaState: madukaBrain.aiState,
        madukaDistance: Math.round(Math.hypot(madukaBrain.x - playerX, madukaBrain.z - playerZ)),
        suspicionLevel: Math.round(madukaBrain.suspicion),
        dialogueSpeaker:
          npcLineTimer > 0 && npcLineText
            ? npcLineSpeaker
            : madukaBrain.activeLine
              ? activeLecturer.name
              : null,
        dialogueText: npcLineTimer > 0 && npcLineText ? npcLineText : madukaBrain.activeLine,
        elapsedSeconds: Math.round(elapsedSeconds),
        alertsTriggered,
        evidenceCollected: getInventoryHas('merit_dossier') ? 1 : 0,
        npcsTalkedCount: npcTalkedIds.size,
        npcsTotalCount: activeLevel.npcs.length,
        rank: profileRef.current.rank,
        cameraMode,
        expression: resolveAvatarExpression({
          madukaState: madukaBrain.aiState,
          lockdownTriggered,
          stamina,
          activeEmote,
          determinedTimer,
        }),
        activeEmote,
        planeReady: planeCooldown <= 0,
        rolling: physicsState.rollTimer > 0,
        grounded: physicsState.grounded,
        surface: currentSurface,
        endingKind,
      };
    };

    const resetRun = () => {
      const targetLevel = getLevelDef(levelIdRef.current);
      if (targetLevel.id !== activeLevel.id || levelGroup.children.length === 0) {
        rebuildLevelScene(targetLevel);
      }

      physicsState = createInitialPhysicsState(
        targetLevel.playerSpawn.x,
        targetLevel.playerSpawn.z,
      );
      currentSurface = 'carpet';
      queuedJump = false;
      queuedRoll = false;
      playerX = targetLevel.playerSpawn.x;
      playerZ = targetLevel.playerSpawn.z;
      playerYaw = targetLevel.playerSpawn.yaw;
      playerPitch = -0.06;
      playerEyeY = 1.65;
      grounded = true;
      stamina = 100;
      battery = 100;
      flashlightOn = true;
      crouching = false;
      hiddenInLockerId = null;
      const startRig = computeTargetCameraRig({
        mode: cameraMode,
        aspect: camera.aspect,
        pitch: playerPitch,
        crouching: false,
      });
      camOffsetBack = startRig.offsetBack;
      camOffsetRight = startRig.offsetRight;
      camOffsetUp = startRig.offsetUp;
      camBobIntensity = 0;
      camRoll = 0;
      camSmoothX = targetLevel.playerSpawn.x;
      camSmoothY = 1.65;
      camSmoothZ = targetLevel.playerSpawn.z + Math.max(0, startRig.offsetBack);
      sprintToggled = false;
      sprintExhausted = false;
      isActivelySprinting = false;
      activeEmote = null;
      emoteTimer = 0;
      determinedTimer = 0;
      planeCooldown = 0;
      squashSpring = 1.0;
      squashVel = 0;
      paperPlaneState.active = false;
      paperPlaneMesh.visible = false;

      lockdownTriggered = targetLevel.startsInLockdown;
      powerRestored = false;
      collectedIds = new Set<string>();
      inventory = [];
      madukaBrain = createMadukaBrain(targetLevel.madukaSpawn);
      elapsedSeconds = 0;
      alertsTriggered = 0;
      footstepAccum = 0;
      beamHitCooldown = 0;
      npcTalkedIds = new Set<string>();
      npcLineSpeaker = null;
      npcLineText = null;
      npcLineTimer = 0;
      keysHeld.clear();

      for (const npcActor of npcActors) {
        npcActor.x = npcActor.def.x;
        npcActor.z = npcActor.def.z;
        npcActor.yaw = npcActor.def.yaw;
        npcActor.talkIndex = 0;
        npcActor.rewarded = false;
        npcActor.distractTimer = 0;
        npcActor.snitchCooldown = 0;
        npcActor.visual.group.position.set(npcActor.x, 0, npcActor.z);
        npcActor.visual.group.rotation.y = npcActor.yaw;
      }

      for (const [, mesh] of pickupMeshes) {
        mesh.visible = true;
      }
      hemiLight.intensity = targetLevel.theme.hemiIntensity * (targetLevel.startsInLockdown ? 0.72 : 1.0);
      hallLampA.intensity = targetLevel.startsInLockdown ? 3.2 : 8.5;
      hallLampB.intensity = targetLevel.startsInLockdown ? 2.8 : 7.5;
      exitSignMat.color.setHex(0xef4444);
      exitSignMat.emissive.setHex(0xef4444);
      exitLight.color.setHex(0xef4444);
      breakerLedMat.color.setHex(0xef4444);
      breakerLedMat.emissive.setHex(0xef4444);
      if (rearDoorMesh) {
        rearDoorMesh.position.x = 0;
      }

      onHudUpdateRef.current(buildHudSnapshot(null, null));
    };

    resetFnRef.current = resetRun;

    const findNearestInteractable = (): { prompt: string; id: string } | null => {
      if (hiddenInLockerId) {
        return { prompt: '[E] Exit Locker', id: hiddenInLockerId };
      }

      let bestDist = Infinity;
      let best: { prompt: string; id: string } | null = null;

      // Check friendly/helper NPCs first within 2.8m (always takes priority over locked door notices)
      for (const npcActor of npcActors) {
        if (npcActor.def.behavior === 'rival_snitch') continue;
        const d = Math.hypot(npcActor.x - playerX, npcActor.z - playerZ);
        if (d <= 2.8 && d < bestDist) {
          bestDist = d;
          best = {
            id: `npc_${npcActor.def.id}`,
            prompt: `[E] Talk to ${npcActor.def.name} (${npcActor.def.role})`,
          };
        }
      }

      if (best) return best;

      for (const item of activeLevel.interactables) {
        if (collectedIds.has(item.id)) continue;
        const d = Math.hypot(item.x - playerX, item.z - playerZ);
        const effectiveRadius =
          item.kind === 'exit_door' && (!lockdownTriggered || !powerRestored || !getInventoryHas('rear_exit_key'))
            ? Math.min(item.radius, 1.85)
            : item.radius;
        if (d <= effectiveRadius && d < bestDist) {
          if (item.kind === 'breaker') {
            if (powerRestored) continue;
            bestDist = d;
            best = {
              id: item.id,
              prompt: getInventoryHas('breaker_fuse')
                ? '[E] Insert Fuse & Restore Power'
                : 'Electrical Breaker (Needs 30A Ceramic Fuse)',
            };
          } else if (item.kind === 'exit_door') {
            bestDist = d;
            if (!lockdownTriggered) {
              best = { id: item.id, prompt: 'Exit Locked — Collect Assignment First' };
            } else if (!powerRestored) {
              best = { id: item.id, prompt: 'Electronic Lock Unpowered — Restore Breaker' };
            } else if (!getInventoryHas('rear_exit_key')) {
              best = { id: item.id, prompt: 'Locked — Needs Exit Key' };
            } else {
              best = { id: item.id, prompt: `[E] Unlock ${item.label}` };
            }
          } else if (item.kind === 'locker') {
            bestDist = d;
            best = { id: item.id, prompt: `[E] Hide in ${item.label}` };
          } else {
            bestDist = d;
            best = { id: item.id, prompt: `[E] ${item.label}` };
          }
        }
      }
      return best;
    };

    const handleInteract = () => {
      if (phaseRef.current !== 'playing') return;

      if (hiddenInLockerId) {
        hiddenInLockerId = null;
        playerX = preHideX;
        playerZ = preHideZ;
        physicsState = createInitialPhysicsState(preHideX, preHideZ);
        audio.playClick();
        onHudUpdateRef.current(buildHudSnapshot(null, null));
        return;
      }

      const nearest = findNearestInteractable();
      if (!nearest) return;

      // Handle NPC conversation & helpful buffs
      if (nearest.id.startsWith('npc_')) {
        const npcId = nearest.id.replace('npc_', '');
        const npcActor = npcActors.find((n) => n.def.id === npcId);
        if (npcActor) {
          npcTalkedIds.add(npcActor.def.id);
          const line =
            npcActor.def.dialogueLines[npcActor.talkIndex % npcActor.def.dialogueLines.length];
          npcActor.talkIndex += 1;
          npcLineSpeaker = `${npcActor.def.name} · ${npcActor.def.role}`;
          npcLineText = line;
          npcLineTimer = 4.6;
          audio.playPickup();

          if (!npcActor.rewarded && npcActor.def.rewardType) {
            npcActor.rewarded = true;
            if (npcActor.def.rewardType === 'battery_boost') {
              battery = Math.min(100, battery + 38);
              if (npcActor.def.rewardText) npcLineText = npcActor.def.rewardText;
            } else if (npcActor.def.rewardType === 'distract_maduka') {
              const decoyX = playerX > 0 ? -8.2 : 8.2;
              const decoyZ = -6.0;
              madukaBrain = {
                ...madukaBrain,
                aiState: 'INVESTIGATE',
                targetX: decoyX,
                targetZ: decoyZ,
                suspicion: Math.max(madukaBrain.suspicion, 55),
                stateTimer: 5.5,
                activeLine: 'WHO MADE THAT RACKET?! WAIT RIGHT THERE!',
                lineTimer: 3.5,
              };
              if (npcActor.def.rewardText) npcLineText = npcActor.def.rewardText;
            }
          }
          onHudUpdateRef.current(buildHudSnapshot(nearest.prompt, nearest.id));
        }
        return;
      }

      const def = activeLevel.interactables.find((i) => i.id === nearest.id);
      if (!def) return;

      if (def.kind === 'locker') {
        preHideX = playerX;
        preHideZ = playerZ;
        hiddenInLockerId = def.id;
        crouching = true;
        playerX = def.x;
        playerZ = def.z;
        physicsState = createInitialPhysicsState(def.x, def.z);
        playerYaw = def.x < 0 ? -Math.PI / 2 : Math.PI / 2;
        audio.playClick();
        onHudUpdateRef.current(buildHudSnapshot('[E] Exit Locker', def.id));
        return;
      }

      if (def.kind === 'breaker') {
        if (!getInventoryHas('breaker_fuse') || powerRestored) {
          audio.playClick();
          return;
        }
        powerRestored = true;
        inventory = inventory.filter((i) => i.id !== 'breaker_fuse');
        hemiLight.intensity = activeLevel.theme.hemiIntensity;
        hallLampA.intensity = 6.8;
        hallLampB.intensity = 6.2;
        breakerLedMat.color.setHex(0x22c55e);
        breakerLedMat.emissive.setHex(0x22c55e);
        exitSignMat.color.setHex(0x22c55e);
        exitSignMat.emissive.setHex(0x22c55e);
        exitLight.color.setHex(0x22c55e);
        audio.playLockdownBell();
        madukaBrain = {
          ...madukaBrain,
          aiState: 'INVESTIGATE',
          targetX: def.x + 1.5,
          targetZ: def.z,
          suspicion: 65,
          stateTimer: 5.0,
          activeLine: 'WHO TOUCHED THE AUXILIARY BREAKER?!',
          lineTimer: 3.5,
        };
        onHudUpdateRef.current(buildHudSnapshot(null, null));
        return;
      }

      if (def.kind === 'exit_door') {
        if (lockdownTriggered && powerRestored && getInventoryHas('rear_exit_key')) {
          if (rearDoorMesh) rearDoorMesh.position.x = 2.1;
          audio.playVictoryChime();
          document.exitPointerLock?.();
          onPhaseChangeRef.current('victory', buildHudSnapshot(null, null, 'freedom_ch1'));
        } else {
          audio.playClick();
        }
        return;
      }

      // Pickups / Office Assignment / Project Merit Dossier
      if (def.itemId && !collectedIds.has(def.id)) {
        collectedIds.add(def.id);
        const mesh = pickupMeshes.get(def.id);
        if (mesh) mesh.visible = false;

        if (def.itemId === 'battery_pack') {
          battery = Math.min(100, battery + 45);
          audio.playPickup();
        } else {
          inventory = [...inventory, ITEM_CATALOG[def.itemId]];
          audio.playPickup();
        }

        if (def.id === 'pickup_assignment' && !lockdownTriggered) {
          lockdownTriggered = true;
          determinedTimer = 2.5;
          hemiLight.intensity = 0.85;
          hallLampA.intensity = 3.0;
          hallLampB.intensity = 2.6;
          audio.playLockdownBell();
          const activeLecturer = getLecturerDef(lecturerIdRef.current);
          madukaBrain = {
            ...madukaBrain,
            aiState: 'PATROL',
            activeLine: activeLecturer.lines.lockdown,
            lineTimer: 4.5,
          };
        } else {
          determinedTimer = 1.6;
          if (def.id === 'pickup_merit_memo') {
            madukaBrain = {
              ...madukaBrain,
              activeLine:
                madukaBrain.activeLine ??
                (lecturerIdRef.current === 'misa'
                  ? 'Snooping through confidential records? Mrs. Misa remembers every face.'
                  : 'Reading confidential Project Merit memos? How very Rank C of you.'),
              lineTimer: 4.0,
            };
          }
        }

        onHudUpdateRef.current(buildHudSnapshot(null, null));
      }
    };

    const triggerEmote = (emote: AvatarEmoteId) => {
      if (hiddenInLockerId) return;
      if (phaseRef.current !== 'playing' && phaseRef.current !== 'title') return;

      if (emote === 'throw_plane') {
        if (phaseRef.current === 'playing' && planeCooldown > 0) return;
        planeCooldown = 1.6;
        const originX = phaseRef.current === 'title' ? 1.1 : playerX;
        const originY = phaseRef.current === 'title' ? 1.38 : playerEyeY - 0.1;
        const originZ = phaseRef.current === 'title' ? -2.1 : playerZ;
        const launchYaw = phaseRef.current === 'title' ? 0.45 : playerYaw;
        const launchPitch = phaseRef.current === 'title' ? 0.08 : playerPitch;
        paperPlaneState = createPaperAirplane(originX, originY, originZ, launchYaw, launchPitch);
        paperPlaneMesh.visible = true;
        audio.playPaperWhoosh();
        squashSpring = 1.14;
        activeEmote = 'throw_plane';
        emoteDuration = 0.55;
        emoteTimer = emoteDuration;
      } else if (emote === 'wave') {
        audio.playPickup();
        squashSpring = 1.16;
        activeEmote = 'wave';
        emoteDuration = 1.3;
        emoteTimer = emoteDuration;
      } else if (emote === 'boogie') {
        audio.playBoogiePop();
        squashSpring = 0.84;
        activeEmote = 'boogie';
        emoteDuration = 2.2;
        emoteTimer = emoteDuration;
      } else if (emote === 'spin') {
        if (phaseRef.current === 'playing') {
          if (stamina < 16) return;
          stamina = Math.max(0, stamina - 16);
          const dashX = playerX - Math.sin(playerYaw) * 1.4;
          const dashZ = playerZ - Math.cos(playerYaw) * 1.4;
          const res = resolvePlayerCollision(dashX, dashZ, 0.42, activeLevel.colliders);
          playerX = res.x;
          playerZ = res.z;
        }
        audio.playSpinWhoosh();
        squashSpring = 1.24;
        activeEmote = 'spin';
        emoteDuration = 0.65;
        emoteTimer = emoteDuration;
      } else if (emote === 'taunt') {
        audio.playTauntAhem();
        squashSpring = 1.12;
        activeEmote = 'taunt';
        emoteDuration = 1.0;
        emoteTimer = emoteDuration;
      }

      if (phaseRef.current === 'playing') {
        const activeLecturer = getLecturerDef(lecturerIdRef.current);
        const lines = PLAYFUL_MADUKA_LINES[emote];
        const chosenLine =
          activeLecturer.id === 'misa'
            ? activeLecturer.lines.playfulReact
            : lines[Math.floor(Math.random() * lines.length)];
        const dist = Math.hypot(madukaBrain.x - playerX, madukaBrain.z - playerZ);

        if (emote === 'taunt' || emote === 'boogie') {
          const lureRadius = emote === 'taunt' ? 10.5 : 5.5;
          if (lockdownTriggered && dist <= lureRadius + 4) {
            madukaBrain = {
              ...madukaBrain,
              aiState: 'INVESTIGATE',
              targetX: playerX,
              targetZ: playerZ,
              suspicion: Math.max(madukaBrain.suspicion, 58),
              stateTimer: 4.5,
              activeLine: chosenLine,
              lineTimer: 3.2,
            };
          } else {
            madukaBrain = { ...madukaBrain, activeLine: chosenLine, lineTimer: 3.0 };
          }
        } else if (emote !== 'throw_plane' && dist < 12) {
          madukaBrain = { ...madukaBrain, activeLine: chosenLine, lineTimer: 3.0 };
        }
        const near = findNearestInteractable();
        onHudUpdateRef.current(buildHudSnapshot(near?.prompt ?? null, near?.id ?? null));
      }
    };

    engineHandleRef.current = {
      resetRun,
      toggleFlashlight: () => {
        if (battery > 0) {
          flashlightOn = !flashlightOn;
          audio.playClick();
        }
      },
      toggleCrouch: () => {
        if (!hiddenInLockerId) {
          crouching = !crouching;
          if (crouching) sprintToggled = false;
          const near = findNearestInteractable();
          onHudUpdateRef.current(buildHudSnapshot(near?.prompt ?? null, near?.id ?? null));
        }
      },
      toggleCameraMode: () => {
        cameraMode = cameraMode === '1p' ? '3p' : '1p';
        audio.playClick();
        const near = findNearestInteractable();
        onHudUpdateRef.current(buildHudSnapshot(near?.prompt ?? null, near?.id ?? null));
      },
      triggerEmote,
      triggerInteract: handleInteract,
      triggerJump: () => {
        if (phaseRef.current === 'playing' && !hiddenInLockerId) {
          crouching = false;
          queuedJump = true;
        }
      },
      triggerRoll: () => {
        if (phaseRef.current === 'playing' && !hiddenInLockerId) {
          queuedRoll = true;
        }
      },
      toggleSprint: () => {
        if (phaseRef.current === 'playing' && !hiddenInLockerId) {
          if (sprintExhausted && !sprintToggled) return;
          sprintToggled = !sprintToggled;
          if (sprintToggled && crouching) crouching = false;
          audio.playClick();
          const near = findNearestInteractable();
          onHudUpdateRef.current(buildHudSnapshot(near?.prompt ?? null, near?.id ?? null));
        }
      },
      setMuted: (muted) => {
        audio.setMuted(muted);
      },
      applyMobileLook: (dx, dy) => {
        const clampedDx = THREE.MathUtils.clamp(dx, -65, 65);
        const clampedDy = THREE.MathUtils.clamp(dy, -65, 65);
        playerYaw -= clampedDx * 0.0048;
        playerPitch = THREE.MathUtils.clamp(playerPitch - clampedDy * 0.0042, -1.25, 1.25);
      },
      setMobileMove: (mx, my) => {
        mobileMove.x = mx;
        mobileMove.y = my;
      },
      setMobileSprint: (sprinting) => {
        sprintToggled = sprinting;
        if (sprinting && crouching) crouching = false;
        const near = findNearestInteractable();
        onHudUpdateRef.current(buildHudSnapshot(near?.prompt ?? null, near?.id ?? null));
      },
    };

    // Window & Canvas Input Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return;

      if (e.code === 'KeyE' && !e.repeat) {
        e.preventDefault();
        handleInteract();
        return;
      }
      if (e.code === 'KeyQ' && !e.repeat) {
        e.preventDefault();
        triggerEmote('throw_plane');
        return;
      }
      if (e.code === 'KeyR' && !e.repeat) {
        e.preventDefault();
        if (!hiddenInLockerId) queuedRoll = true;
        return;
      }
      if (e.code === 'Digit1' && !e.repeat) {
        triggerEmote('wave');
        return;
      }
      if (e.code === 'Digit2' && !e.repeat) {
        triggerEmote('boogie');
        return;
      }
      if (e.code === 'Digit3' && !e.repeat) {
        triggerEmote('spin');
        return;
      }
      if (e.code === 'KeyG' && !e.repeat) {
        triggerEmote('taunt');
        return;
      }
      if (e.code === 'KeyV' && !e.repeat) {
        cameraMode = cameraMode === '1p' ? '3p' : '1p';
        audio.playClick();
        const near = findNearestInteractable();
        onHudUpdateRef.current(buildHudSnapshot(near?.prompt ?? null, near?.id ?? null));
        return;
      }
      if (e.code === 'KeyF' && !e.repeat) {
        if (battery > 0) {
          flashlightOn = !flashlightOn;
          audio.playClick();
        }
        return;
      }
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat && !hiddenInLockerId) {
        if (crouching) crouching = false;
      }
      if ((e.code === 'KeyC' || e.code === 'ControlLeft') && !e.repeat) {
        if (!hiddenInLockerId) {
          crouching = !crouching;
          if (crouching) sprintToggled = false;
        }
        return;
      }
      if (e.code === 'Space' && !e.repeat && !hiddenInLockerId) {
        e.preventDefault();
        if (crouching) crouching = false;
        queuedJump = true;
        return;
      }

      keysHeld.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const clearHeldInputs = () => {
      keysHeld.clear();
      isPointerDragging = false;
      activeTouchId = null;
      mobileMove.x = 0;
      mobileMove.y = 0;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (phaseRef.current === 'title') {
        isPointerDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        const emotes: AvatarEmoteId[] = ['wave', 'boogie', 'spin', 'throw_plane'];
        triggerEmote(emotes[Math.floor(Math.random() * emotes.length)]);
        return;
      }
      if (phaseRef.current !== 'playing') return;
      isPointerDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock?.();
      }
    };

    const onMouseUp = () => {
      isPointerDragging = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (phaseRef.current === 'title' && isPointerDragging) {
        const dx = THREE.MathUtils.clamp(e.clientX - lastMouseX, -65, 65);
        lastMouseX = e.clientX;
        titleTurntableSpin += dx * 0.015;
        return;
      }
      if (phaseRef.current !== 'playing') return;
      if (document.pointerLockElement === renderer.domElement) {
        const mx = THREE.MathUtils.clamp(e.movementX, -65, 65);
        const my = THREE.MathUtils.clamp(e.movementY, -65, 65);
        playerYaw -= mx * 0.0022;
        playerPitch = THREE.MathUtils.clamp(playerPitch - my * 0.0022, -1.3, 1.3);
      } else if (isPointerDragging) {
        const dx = THREE.MathUtils.clamp(e.clientX - lastMouseX, -65, 65);
        const dy = THREE.MathUtils.clamp(e.clientY - lastMouseY, -65, 65);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        playerYaw -= dx * 0.004;
        playerPitch = THREE.MathUtils.clamp(playerPitch - dy * 0.004, -1.3, 1.3);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (phaseRef.current !== 'playing' && phaseRef.current !== 'title') return;
      if (activeTouchId !== null) return;
      const t = e.changedTouches[0];
      if (!t) return;
      activeTouchId = t.identifier;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;
      touchTotalDist = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier !== activeTouchId) continue;
        e.preventDefault();
        const dx = THREE.MathUtils.clamp(t.clientX - lastTouchX, -65, 65);
        const dy = THREE.MathUtils.clamp(t.clientY - lastTouchY, -65, 65);
        lastTouchX = t.clientX;
        lastTouchY = t.clientY;
        touchTotalDist += Math.hypot(dx, dy);

        if (phaseRef.current === 'title') {
          titleTurntableSpin += dx * 0.018;
        } else if (phaseRef.current === 'playing') {
          playerYaw -= dx * 0.0052;
          playerPitch = THREE.MathUtils.clamp(playerPitch - dy * 0.0044, -1.25, 1.25);
        }
        break;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier !== activeTouchId) continue;
        if (
          phaseRef.current === 'title' &&
          touchTotalDist < 12 &&
          Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY) < 12
        ) {
          const emotes: AvatarEmoteId[] = ['wave', 'boogie', 'spin', 'throw_plane'];
          triggerEmote(emotes[Math.floor(Math.random() * emotes.length)]);
        }
        activeTouchId = null;
        break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeldInputs);
    document.addEventListener('visibilitychange', clearHeldInputs);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onTouchEnd);
    renderer.domElement.addEventListener('touchcancel', onTouchEnd);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(onResize);
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
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const forwardVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3();

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const rawDt = (nowMs - lastTimeMs) / 1000;
      lastTimeMs = nowMs;
      const dt = Math.min(rawDt, 0.12);

      // Rotate floating pickups gently
      for (const [, mesh] of pickupMeshes) {
        if (mesh.visible) {
          mesh.rotation.y += dt * 1.6;
        }
      }

      // Step playful timers, squash-stretch spring & paper airplane projectile
      if (planeCooldown > 0) planeCooldown = Math.max(0, planeCooldown - dt);
      if (determinedTimer > 0) determinedTimer = Math.max(0, determinedTimer - dt);
      if (emoteTimer > 0) {
        emoteTimer = Math.max(0, emoteTimer - dt);
        if (emoteTimer === 0) activeEmote = null;
      }
      const springForce = (1.0 - squashSpring) * 140 - squashVel * 16;
      squashVel += springForce * dt;
      squashSpring = THREE.MathUtils.clamp(squashSpring + squashVel * dt, 0.72, 1.32);

      if (npcLineTimer > 0) {
        npcLineTimer = Math.max(0, npcLineTimer - dt);
        if (npcLineTimer === 0) {
          npcLineText = null;
          npcLineSpeaker = null;
        }
      }
      if (beamHitCooldown > 0) {
        beamHitCooldown = Math.max(0, beamHitCooldown - dt);
      }

      if (paperPlaneState.active) {
        const planeStep = stepPaperAirplane(paperPlaneState, dt, activeLevel.colliders);
        paperPlaneState = planeStep.next;
        paperPlaneMesh.visible = paperPlaneState.active;
        paperPlaneMesh.position.set(paperPlaneState.x, paperPlaneState.y, paperPlaneState.z);
        paperPlaneMesh.rotation.y = paperPlaneState.yaw;
        paperPlaneMesh.rotation.z = paperPlaneState.landed ? 0.15 : Math.sin(paperPlaneState.age * 9) * 0.25;
        if (planeStep.justLanded) {
          audio.playClick();
          // Distract Victor snitch AI if throwing paper airplane near him!
          for (const npcActor of npcActors) {
            if (npcActor.def.behavior === 'rival_snitch') {
              const dPlane = Math.hypot(npcActor.x - paperPlaneState.x, npcActor.z - paperPlaneState.z);
              if (dPlane <= 11.5) {
                npcActor.distractTimer = 6.5;
                npcLineSpeaker = npcActor.def.name;
                npcLineText = npcActor.def.dialogueLines[1] ?? 'Wait—who threw a paper airplane?!';
                npcLineTimer = 4.0;
              }
            }
          }
          if (phaseRef.current === 'playing' && lockdownTriggered) {
            madukaBrain = {
              ...madukaBrain,
              aiState: 'INVESTIGATE',
              targetX: paperPlaneState.x,
              targetZ: paperPlaneState.z,
              suspicion: Math.max(madukaBrain.suspicion, 70),
              stateTimer: 5.5,
              activeLine: PLAYFUL_MADUKA_LINES.throw_plane[0],
              lineTimer: 3.8,
            };
          }
        }
      }

      const applyEmotePose = (
        baseYaw: number,
        moveSwing: number,
        chasedPanic: boolean,
      ) => {
        const progress = activeEmote ? 1 - emoteTimer / emoteDuration : 0;
        protagonistVisual.bodyPivot.position.set(0, 0, 0);
        protagonistVisual.bodyPivot.rotation.set(0, 0, 0);
        protagonistVisual.headGroup.rotation.set(0, 0, 0);
        protagonistVisual.leftArm.rotation.set(-moveSwing * 0.65, 0, 0);
        protagonistVisual.rightArm.rotation.set(moveSwing * 0.65, 0, 0);
        protagonistVisual.leftLeg.rotation.x = moveSwing;
        protagonistVisual.rightLeg.rotation.x = -moveSwing;

        if (chasedPanic) {
          // Hilarious comic panic flail while sprinting away from Maduka
          const flail = Math.sin(nowMs * 0.022);
          protagonistVisual.leftArm.rotation.set(-2.3 + flail * 0.45, 0, 0.35);
          protagonistVisual.rightArm.rotation.set(-2.3 - flail * 0.45, 0, -0.35);
          protagonistVisual.headGroup.rotation.z = flail * 0.14;
        }

        if (activeEmote === 'wave') {
          protagonistVisual.rightArm.rotation.set(-2.5, 0, -0.35 + Math.sin(progress * Math.PI * 6) * 0.38);
          protagonistVisual.headGroup.rotation.z = 0.16;
          protagonistVisual.bodyPivot.position.y = Math.abs(Math.sin(progress * Math.PI * 2)) * 0.08;
        } else if (activeEmote === 'boogie') {
          const beat = progress * Math.PI * 8;
          protagonistVisual.bodyPivot.position.y = Math.abs(Math.sin(beat)) * 0.12;
          protagonistVisual.bodyPivot.rotation.z = Math.sin(beat * 0.5) * 0.12;
          protagonistVisual.leftArm.rotation.set(-1.3 + Math.sin(beat) * 0.9, 0, 0.4);
          protagonistVisual.rightArm.rotation.set(-1.3 - Math.sin(beat) * 0.9, 0, -0.4);
          protagonistVisual.leftLeg.rotation.x = Math.sin(beat) * 0.35;
          protagonistVisual.rightLeg.rotation.x = -Math.sin(beat) * 0.35;
          protagonistVisual.headGroup.rotation.z = -Math.sin(beat * 0.5) * 0.18;
        } else if (activeEmote === 'spin') {
          protagonistVisual.group.rotation.y = baseYaw + progress * Math.PI * 2;
          protagonistVisual.leftArm.rotation.z = 1.1;
          protagonistVisual.rightArm.rotation.z = -1.1;
          protagonistVisual.bodyPivot.position.y = Math.sin(progress * Math.PI) * 0.25;
        } else if (activeEmote === 'throw_plane') {
          protagonistVisual.rightArm.rotation.x = -2.2 + Math.min(1, progress * 2.5) * 2.0;
          protagonistVisual.bodyPivot.rotation.x = 0.12 * Math.sin(progress * Math.PI);
        } else if (activeEmote === 'taunt') {
          protagonistVisual.leftArm.rotation.set(-1.4, 0, 0.3);
          protagonistVisual.headGroup.rotation.z = Math.sin(progress * Math.PI * 4) * 0.2;
          protagonistVisual.bodyPivot.position.y = Math.abs(Math.sin(progress * Math.PI * 3)) * 0.07;
        }

        if (physicsState.rollTimer > 0 && phaseRef.current === 'playing') {
          const rollProgress = 1 - physicsState.rollTimer / PHYSICS_CONSTANTS.rollDuration;
          protagonistVisual.bodyPivot.position.y = 0.56;
          protagonistVisual.bodyPivot.rotation.x = -rollProgress * Math.PI * 2;
          protagonistVisual.leftArm.rotation.set(-1.5, 0, 0.25);
          protagonistVisual.rightArm.rotation.set(-1.5, 0, -0.25);
          protagonistVisual.leftLeg.rotation.x = 0.85;
          protagonistVisual.rightLeg.rotation.x = 0.85;
        }

        const invXZ = 1 / Math.sqrt(squashSpring);
        protagonistVisual.bodyPivot.scale.set(
          invXZ,
          squashSpring *
            (physicsState.rollTimer > 0 && phaseRef.current === 'playing'
              ? 0.78
              : crouching && phaseRef.current === 'playing'
                ? 0.72
                : 1.0),
          invXZ,
        );
      };

      if (phaseRef.current === 'title') {
        // Title screen: Showcase BOTH turnaround characters with responsive desktop/mobile FOV
        const targetTitleFov = computeTargetCameraFov({
          phase: 'title',
          mode: '3p',
          aspect: camera.aspect,
          sprinting: false,
          crouching: false,
        });
        const nextTitleFov = THREE.MathUtils.damp(camera.fov, targetTitleFov, 9, dt);
        if (Math.abs(nextTitleFov - camera.fov) > 0.02) {
          camera.fov = nextTitleFov;
          camera.updateProjectionMatrix();
        }
        fpArm.group.visible = false;
        protagonistVisual.group.visible = true;

        titleOrbitAngle += dt * 0.22;
        const isNarrowMobile = camera.aspect < 0.85;
        camera.position.set(
          (isNarrowMobile ? 0.65 : 1.4) + Math.sin(titleOrbitAngle) * 0.18,
          1.58,
          (isNarrowMobile ? 1.85 : 1.2) + Math.cos(titleOrbitAngle) * 0.15,
        );
        camera.lookAt(isNarrowMobile ? 0.15 : -1.6, 1.22, -6.5);

        // Protagonist stands in open right foreground looking toward Maduka & chalkboard (plus interactive poke/spin!)
        protagonistVisual.group.position.set(1.1, 0, -2.1);
        const titleBaseYaw = 2.35 + titleTurntableSpin;
        protagonistVisual.group.rotation.y = titleBaseYaw;
        applyEmotePose(titleBaseYaw, 0, false);

        // Active Lecturer stands clearly beside the lectern in front of the chalkboard
        madukaVisual.group.visible = lecturerIdRef.current === 'maduka';
        misaVisual.group.visible = lecturerIdRef.current === 'misa';
        const titleLecturer = getActiveLecturerVisual();
        titleLecturer.group.position.set(-0.85, 0, -7.6);
        titleLecturer.group.rotation.y = 0.35 + Math.sin(titleOrbitAngle * 1.4) * 0.12;
        titleLecturer.leftLeg.rotation.x = 0;
        titleLecturer.rightLeg.rotation.x = 0;
      } else if (phaseRef.current === 'playing') {
        elapsedSeconds += dt;

        // Realistic 3D Kinematics (Momentum, Table Vaulting/Jumping, Sprinting, Rolling & Surface Audio)
        let moveForward =
          (keysHeld.has('KeyW') || keysHeld.has('ArrowUp') ? 1 : 0) -
          (keysHeld.has('KeyS') || keysHeld.has('ArrowDown') ? 1 : 0) +
          mobileMove.y;
        let moveStrafe =
          (keysHeld.has('KeyD') || keysHeld.has('ArrowRight') ? 1 : 0) -
          (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft') ? 1 : 0) +
          mobileMove.x;

        const moveMag = Math.hypot(moveForward, moveStrafe);
        if (moveMag > 1) {
          moveForward /= moveMag;
          moveStrafe /= moveMag;
        }

        if (stamina <= 1.5) {
          sprintExhausted = true;
          sprintToggled = false;
        } else if (stamina >= 18) {
          sprintExhausted = false;
        }

        const wantSprint =
          (keysHeld.has('ShiftLeft') || keysHeld.has('ShiftRight') || sprintToggled) &&
          !crouching &&
          !hiddenInLockerId &&
          !sprintExhausted &&
          moveMag > 0.1 &&
          stamina > 1.5;
        isActivelySprinting = wantSprint;

        const physStep = stepPlayerPhysics(
          physicsState,
          {
            moveForward,
            moveStrafe,
            yaw: playerYaw,
            crouching,
            sprinting: wantSprint,
            jumpPressed: queuedJump,
            rollPressed: queuedRoll,
            stamina,
            hiddenInLocker: Boolean(hiddenInLockerId),
          },
          activeLevel.colliders,
          dt,
          activeLevel.carpetZones,
        );
        queuedJump = false;
        queuedRoll = false;
        physicsState = physStep.next;
        playerX = physicsState.x;
        playerZ = physicsState.z;
        grounded = physicsState.grounded;
        currentSurface = physStep.surface;
        stamina = THREE.MathUtils.clamp(stamina + physStep.staminaDelta, 0, 100);

        if (physStep.jumped) {
          squashSpring = 1.18;
          audio.playJumpPush(physStep.surface);
        }
        if (physStep.startedRoll) {
          squashSpring = 0.76;
          audio.playRollWhoosh(physStep.surface);
        }
        if (physStep.landedImpactSpeed > 0.8) {
          squashSpring = THREE.MathUtils.clamp(0.86 - physStep.landedImpactSpeed * 0.03, 0.7, 0.86);
          audio.playLandImpact(physStep.landedImpactSpeed, physStep.surface);
        }

        const isRolling = physicsState.rollTimer > 0;
        let noiseRadius = 0;

        if (!hiddenInLockerId && physStep.distMoved > 0.001 && grounded && !isRolling) {
          playerWalkPhase += physStep.distMoved * 4.2;

          const surfaceMult =
            physStep.surface === 'carpet'
              ? 0.65
              : physStep.surface === 'wood_desk'
                ? 1.18
                : 1.05;
          noiseRadius =
            (crouching ? 1.5 : wantSprint ? 11.4 : 4.9) * surfaceMult;

          footstepAccum += physStep.distMoved;
          const stepStride = crouching ? 0.92 : wantSprint ? 1.52 : 1.24;
          if (footstepAccum >= stepStride) {
            footstepAccum = 0;
            audio.playDynamicFootstep({
              surface: physStep.surface,
              speedRatio: physStep.horizontalSpeed / PHYSICS_CONSTANTS.walkSpeed,
              crouching,
              sprinting: wantSprint,
            });
          }
        } else if (isRolling) {
          noiseRadius = physStep.surface === 'carpet' ? 2.4 : 4.5;
        } else {
          playerWalkPhase *= 0.9;
        }

        if (physStep.landedImpactSpeed > 2.2) {
          noiseRadius = Math.max(noiseRadius, physStep.surface === 'carpet' ? 3.5 : 6.8);
        }

        // Smooth Stance Eye Elevation separately from physics footY so jump arcs & falls never double-damp
        const stanceEye = hiddenInLockerId
          ? 1.35
          : isRolling
            ? 0.78
            : crouching
              ? 0.92
              : 1.65;
        playerEyeY = THREE.MathUtils.damp(playerEyeY, stanceEye, 14, dt);
        const worldEyeY = physicsState.footY + playerEyeY;

        // Flashlight battery drain
        if (flashlightOn && battery > 0) {
          battery = Math.max(0, battery - dt * 1.45);
          if (battery === 0) flashlightOn = false;
        }
        playerFlashlight.intensity = flashlightOn && battery > 0 ? 12.0 : 0;

        // Sync Protagonist 3D model + playful emotes + Smooth 1P/3P Camera System
        const effectiveMode: '1p' | '3p' =
          cameraMode === '3p' && !hiddenInLockerId ? '3p' : '1p';

        const targetFov = computeTargetCameraFov({
          phase: 'playing',
          mode: effectiveMode,
          aspect: camera.aspect,
          sprinting: wantSprint || isRolling,
          crouching: crouching || isRolling,
        });
        const nextFov = THREE.MathUtils.damp(camera.fov, targetFov, 9, dt);
        if (Math.abs(nextFov - camera.fov) > 0.02) {
          camera.fov = nextFov;
          camera.updateProjectionMatrix();
        }

        const rigTarget = computeTargetCameraRig({
          mode: effectiveMode,
          aspect: camera.aspect,
          pitch: playerPitch,
          crouching,
        });
        camOffsetBack = THREE.MathUtils.damp(camOffsetBack, rigTarget.offsetBack, 14, dt);
        camOffsetRight = THREE.MathUtils.damp(camOffsetRight, rigTarget.offsetRight, 14, dt);
        camOffsetUp = THREE.MathUtils.damp(camOffsetUp, rigTarget.offsetUp, 14, dt);

        const targetBobIntensity =
          physStep.horizontalSpeed > 0.25 && grounded && !hiddenInLockerId && !isRolling
            ? crouching
              ? 0.55
              : wantSprint
                ? 1.4
                : 1.0
            : 0;
        camBobIntensity = THREE.MathUtils.damp(camBobIntensity, targetBobIntensity, 10, dt);
        const bob = computeHeadBobOffsets({
          walkPhase: playerWalkPhase,
          intensity: camBobIntensity,
          mode: effectiveMode,
        });
        const rollCameraTilt =
          isRolling && effectiveMode === '1p'
            ? Math.sin((1 - physicsState.rollTimer / PHYSICS_CONSTANTS.rollDuration) * Math.PI) * 0.24
            : 0;
        camRoll = THREE.MathUtils.damp(camRoll, bob.roll + rollCameraTilt, 12, dt);

        protagonistVisual.group.position.set(playerX, physicsState.footY, playerZ);
        const basePlayYaw = playerYaw + Math.PI;
        protagonistVisual.group.rotation.y = basePlayYaw;
        const pSwing =
          physStep.horizontalSpeed > 0.25 && grounded && !hiddenInLockerId && !isRolling
            ? Math.sin(playerWalkPhase) * 0.45
            : 0;
        const chasedPanic = lockdownTriggered && madukaBrain.aiState === 'CHASE' && wantSprint;
        applyEmotePose(basePlayYaw, pSwing, chasedPanic);

        const showThirdPersonModel = camOffsetBack > 0.38 && !hiddenInLockerId;
        protagonistVisual.group.visible = showThirdPersonModel;
        fpArm.group.visible = !showThirdPersonModel && !hiddenInLockerId;
        fpArm.group.position.set(
          -bob.horizontal * 0.45,
          bob.vertical * 0.45 + Math.sin(playerWalkPhase * 2) * 0.005 - (isRolling ? 0.14 : 0),
          0,
        );
        fpArm.group.rotation.x = activeEmote === 'throw_plane' ? -0.35 : isRolling ? -0.45 : 0;

        const sinY = Math.sin(playerYaw);
        const cosY = Math.cos(playerYaw);
        const totalRight = camOffsetRight + bob.horizontal;
        const desiredX = playerX + sinY * camOffsetBack + cosY * totalRight;
        const desiredZ = playerZ + cosY * camOffsetBack - sinY * totalRight;
        const camResolved = resolveHorizontalCollision3D(
          desiredX,
          desiredZ,
          physicsState.footY + 0.85,
          effectiveMode === '1p' ? 0.22 : 0.3,
          activeLevel.colliders,
        );
        const desiredY = worldEyeY + camOffsetUp + bob.vertical;

        const camLambda = effectiveMode === '1p' ? 24 : 18;
        camSmoothX = THREE.MathUtils.damp(camSmoothX, camResolved.x, camLambda, dt);
        camSmoothY = THREE.MathUtils.damp(camSmoothY, desiredY, 22, dt);
        camSmoothZ = THREE.MathUtils.damp(camSmoothZ, camResolved.z, camLambda, dt);

        camera.position.set(camSmoothX, camSmoothY, camSmoothZ);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = playerYaw;
        camera.rotation.x = playerPitch;
        camera.rotation.z = camRoll;

        // Animate NPCs + Victor Snitch Patrol AI
        for (const npcActor of npcActors) {
          if (npcActor.distractTimer > 0) npcActor.distractTimer = Math.max(0, npcActor.distractTimer - dt);
          if (npcActor.snitchCooldown > 0) npcActor.snitchCooldown = Math.max(0, npcActor.snitchCooldown - dt);

          const idleBob = Math.sin(elapsedSeconds * 2.4 + npcActor.def.x) * 0.02;
          npcActor.visual.bodyPivot.position.y = idleBob;

          if (npcActor.def.behavior === 'rival_snitch' && npcActor.def.patrolSpan) {
            if (npcActor.distractTimer <= 0) {
              const spd = npcActor.def.patrolSpeed ?? 2.4;
              const offset = Math.sin(elapsedSeconds * (spd / Math.max(1, npcActor.def.patrolSpan)) * 2.0) * npcActor.def.patrolSpan;
              const prevPos = npcActor.def.patrolAxis === 'z' ? npcActor.z : npcActor.x;
              if (npcActor.def.patrolAxis === 'z') {
                npcActor.z = npcActor.def.z + offset;
              } else {
                npcActor.x = npcActor.def.x + offset;
              }
              const deltaP = (npcActor.def.patrolAxis === 'z' ? npcActor.z : npcActor.x) - prevPos;
              npcActor.yaw = npcActor.def.patrolAxis === 'z'
                ? deltaP >= 0 ? 0 : Math.PI
                : deltaP >= 0 ? Math.PI / 2 : -Math.PI / 2;
              const stride = Math.sin(elapsedSeconds * 7.5) * 0.35;
              npcActor.visual.leftLeg.rotation.x = stride;
              npcActor.visual.rightLeg.rotation.x = -stride;

              // Snitch check if Victor sees player
              const dPlayer = Math.hypot(playerX - npcActor.x, playerZ - npcActor.z);
              if (
                !hiddenInLockerId &&
                dPlayer <= 7.5 &&
                npcActor.snitchCooldown <= 0 &&
                hasLineOfSight(npcActor.x, npcActor.z, playerX, playerZ, crouching, activeLevel.colliders)
              ) {
                npcActor.snitchCooldown = 5.5;
                alertsTriggered += 1;
                audio.playAlertStinger();
                npcLineSpeaker = npcActor.def.name;
                npcLineText = npcActor.def.dialogueLines[0];
                npcLineTimer = 3.8;
                const activeLecturer = getLecturerDef(lecturerIdRef.current);
                madukaBrain = {
                  ...madukaBrain,
                  aiState: 'INVESTIGATE',
                  targetX: playerX,
                  targetZ: playerZ,
                  suspicion: Math.max(madukaBrain.suspicion, 80),
                  stateTimer: 5.5,
                  activeLine: activeLecturer.lines.snitchAlert,
                  lineTimer: 3.5,
                };
              }
            } else {
              npcActor.visual.leftLeg.rotation.x *= 0.8;
              npcActor.visual.rightLeg.rotation.x *= 0.8;
            }
            npcActor.visual.group.position.set(npcActor.x, 0, npcActor.z);
            npcActor.visual.group.rotation.y = npcActor.yaw;
          } else {
            // Friendly Blackwood NPCs subtly turn toward nearby player
            const distP = Math.hypot(playerX - npcActor.x, playerZ - npcActor.z);
            if (distP < 5.5) {
              const lookAngle = Math.atan2(playerX - npcActor.x, playerZ - npcActor.z);
              npcActor.visual.group.rotation.y = lookAngle;
            }
          }
        }

        // Step Sweeping Security / Clocktower Hazard Beams
        for (const hb of hazardBeamActors) {
          const sweep = Math.sin(elapsedSeconds * hb.def.sweepSpeed) * hb.def.sweepAmplitude;
          if (hb.def.orientation === 'x') {
            hb.currentX = hb.def.baseX;
            hb.currentZ = hb.def.baseZ + sweep;
          } else {
            hb.currentX = hb.def.baseX + sweep;
            hb.currentZ = hb.def.baseZ;
          }
          hb.beamMesh.position.set(hb.currentX, hb.def.beamHeight, hb.currentZ);

          if (!hiddenInLockerId && beamHitCooldown <= 0) {
            const halfLen = hb.def.length / 2;
            const withinBeam =
              hb.def.orientation === 'x'
                ? Math.abs(playerX - hb.currentX) <= halfLen && Math.abs(playerZ - hb.currentZ) <= 0.34
                : Math.abs(playerZ - hb.currentZ) <= halfLen && Math.abs(playerX - hb.currentX) <= 0.34;

            if (withinBeam) {
              const clearedLow = hb.def.beamHeight <= 0.55 && physicsState.footY >= 0.34;
              const clearedHigh = hb.def.beamHeight >= 0.85 && (crouching || isRolling);
              if (!clearedLow && !clearedHigh) {
                beamHitCooldown = 1.8;
                stamina = Math.max(0, stamina - 20);
                alertsTriggered += 1;
                audio.playAlertStinger();
                if (lockdownTriggered) {
                  const activeLecturer = getLecturerDef(lecturerIdRef.current);
                  madukaBrain = {
                    ...madukaBrain,
                    aiState: 'INVESTIGATE',
                    targetX: playerX,
                    targetZ: playerZ,
                    suspicion: Math.max(madukaBrain.suspicion, 72),
                    stateTimer: 5.0,
                    activeLine: activeLecturer.lines.tripwireHit,
                    lineTimer: 3.4,
                  };
                }
              }
            }
          }
        }

        // Step Active Lecturer AI (Prof. Maduka or wicked red-eyed Mrs. Misa)
        const activeLecturer = getLecturerDef(lecturerIdRef.current);
        madukaVisual.group.visible = activeLecturer.id === 'maduka';
        misaVisual.group.visible = activeLecturer.id === 'misa';
        const activeLecturerVisual = getActiveLecturerVisual();

        if (lockdownTriggered) {
          const prevX = madukaBrain.x;
          const prevZ = madukaBrain.z;
          const aiRes = stepMadukaAi(
            madukaBrain,
            {
              playerX,
              playerZ,
              playerCrouching: crouching,
              playerHidden: Boolean(hiddenInLockerId),
              flashlightOn,
              hallLit: powerRestored,
              noiseRadius,
            },
            difficultyRef.current,
            dt,
            activeLevel.colliders,
            activeLevel.patrolRoute,
            activeLevel.madukaSpeedMultiplier * activeLecturer.speedMultiplier,
            activeLecturer.lines,
          );
          madukaBrain = aiRes.next;

          if (aiRes.stateChanged && madukaBrain.aiState === 'CHASE') {
            alertsTriggered += 1;
            audio.playAlertStinger();
          }

          const mdDist = Math.hypot(madukaBrain.x - prevX, madukaBrain.z - prevZ);
          if (mdDist > 0.001) {
            madukaWalkPhase += mdDist * 3.6;
            activeLecturerVisual.leftLeg.rotation.x = Math.sin(madukaWalkPhase) * 0.45;
            activeLecturerVisual.rightLeg.rotation.x = -Math.sin(madukaWalkPhase) * 0.45;
            activeLecturerVisual.pointerArm.rotation.x = Math.sin(madukaWalkPhase * 0.5) * 0.16;
          } else {
            activeLecturerVisual.leftLeg.rotation.x *= 0.85;
            activeLecturerVisual.rightLeg.rotation.x *= 0.85;
          }

          if (aiRes.caughtPlayer) {
            madukaBrain = {
              ...madukaBrain,
              activeLine: activeLecturer.lines.caught,
              lineTimer: 6.0,
            };
            audio.playLockdownBell();
            document.exitPointerLock?.();
            onPhaseChangeRef.current('gameover', buildHudSnapshot(null, null, 'caught'));
          }
        }

        activeLecturerVisual.group.position.set(madukaBrain.x, 0, madukaBrain.z);
        activeLecturerVisual.group.rotation.y = madukaBrain.yaw;

        // Throttled HUD snapshot sync (<= 10Hz)
        hudEmitTimer += dt;
        if (hudEmitTimer >= 0.1) {
          hudEmitTimer = 0;
          const near = findNearestInteractable();
          onHudUpdateRef.current(buildHudSnapshot(near?.prompt ?? null, near?.id ?? null));
        }
      }

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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeldInputs);
      document.removeEventListener('visibilitychange', clearHeldInputs);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      renderer.domElement.removeEventListener('touchcancel', onTouchEnd);
      audio.dispose();
      floorTex.dispose();
      activeChalkTex?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="game-webgl-canvas"
      className="fixed inset-0 w-full h-full bg-[#0a0d12] touch-none"
    />
  );
}
