import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVEL_COLLIDERS,
  PLAYER_SPAWN,
  hasLineOfSight,
  resolvePlayerCollision,
} from './worldLayout';
import { createMadukaBrain, stepMadukaAi } from './madukaAi';
import {
  createDefaultSave,
  getHighestUnlockedLevel,
  isLevelUnlocked,
  loadGameProgress,
  saveGameProgress,
} from './saveSystem';
import {
  PLAYABLE_AVATARS,
  createPaperAirplane,
  resolveAvatarExpression,
  stepPaperAirplane,
} from './avatarSystem';
import {
  computeHeadBobOffsets,
  computeTargetCameraFov,
  computeTargetCameraRig,
} from './cameraSystem';

test('resolvePlayerCollision keeps player inside bounds and out of solid walls/desks', () => {
  // Spawn is open and unaltered
  const atSpawn = resolvePlayerCollision(PLAYER_SPAWN.x, PLAYER_SPAWN.z, 0.42, LEVEL_COLLIDERS);
  assert.equal(atSpawn.x, PLAYER_SPAWN.x);
  assert.equal(atSpawn.z, PLAYER_SPAWN.z);

  // Pushing into North wall gets clamped outside wall_north (maxZ = -12.1)
  const intoWall = resolvePlayerCollision(0, -12.5, 0.42, LEVEL_COLLIDERS);
  assert.ok(intoWall.z >= -12.1 + 0.41);

  // Pushing into front lectern gets pushed out
  const intoLectern = resolvePlayerCollision(0, -8.8, 0.42, LEVEL_COLLIDERS);
  const insideLectern =
    intoLectern.x > -1.2 && intoLectern.x < 1.2 && intoLectern.z > -9.4 && intoLectern.z < -8.2;
  assert.equal(insideLectern, false);
});

test('hasLineOfSight blocks vision through walls and crouched desk cover', () => {
  // Wall occlusion across office divider (x = 3.6..4.1, z = -12.1..-7.0)
  const throughWall = hasLineOfSight(1.0, -9.5, 7.5, -9.5, false, LEVEL_COLLIDERS);
  assert.equal(throughWall, false);

  // Desk occlusion across desk_l1 (z = -4.8..-3.8)
  const crouchedBehindDesk = hasLineOfSight(-5.0, -6.5, -5.0, -2.5, true, LEVEL_COLLIDERS);
  assert.equal(crouchedBehindDesk, false);

  // Standing player is visible over low 0.95m desk
  const standingOverDesk = hasLineOfSight(-5.0, -6.5, -5.0, -2.5, false, LEVEL_COLLIDERS);
  assert.equal(standingOverDesk, true);

  // Open center aisle has clear line of sight
  const centerAisle = hasLineOfSight(0, -6.2, 0, 5.0, true, LEVEL_COLLIDERS);
  assert.equal(centerAisle, true);
});

test('Maduka AI transitions through all 6 states without wall-vision or teleporting', () => {
  let brain = createMadukaBrain();
  brain = { ...brain, x: 0, z: -6.0, yaw: 0 }; // Facing +Z down center aisle
  assert.equal(brain.aiState, 'PATROL');

  // Player hidden behind office wall at (7.5, -9.5) cannot be seen
  const behindWallStep = stepMadukaAi(
    brain,
    {
      playerX: 7.5,
      playerZ: -9.5,
      playerCrouching: false,
      playerHidden: false,
      flashlightOn: true,
      hallLit: true,
      noiseRadius: 0,
    },
    'standard',
    0.05,
  );
  assert.equal(behindWallStep.next.aiState, 'PATROL');

  // Loud noise in aisle triggers SUSPICIOUS -> INVESTIGATE
  const heardStep = stepMadukaAi(
    brain,
    {
      playerX: 0,
      playerZ: 2.0,
      playerCrouching: false,
      playerHidden: false,
      flashlightOn: false,
      hallLit: true,
      noiseRadius: 11.0,
    },
    'standard',
    0.05,
  );
  assert.equal(heardStep.next.aiState, 'SUSPICIOUS');

  // Player standing directly in front of Maduka escalates to CHASE
  let chasingBrain = heardStep.next;
  for (let i = 0; i < 40; i++) {
    const res = stepMadukaAi(
      chasingBrain,
      {
        playerX: 0,
        playerZ: -1.5,
        playerCrouching: false,
        playerHidden: false,
        flashlightOn: true,
        hallLit: true,
        noiseRadius: 4.5,
      },
      'standard',
      0.05,
    );
    chasingBrain = res.next;
  }
  assert.equal(chasingBrain.aiState, 'CHASE');

  // Player hides inside locker -> Maduka reaches last known point, enters SEARCH, then RETURN_TO_PATROL, then PATROL
  const statesSeen = new Set<string>([chasingBrain.aiState]);
  for (let i = 0; i < 360; i++) {
    const res = stepMadukaAi(
      chasingBrain,
      {
        playerX: -9.8,
        playerZ: -1.5,
        playerCrouching: true,
        playerHidden: true,
        flashlightOn: false,
        hallLit: false,
        noiseRadius: 0,
      },
      'standard',
      0.05,
    );
    chasingBrain = res.next;
    statesSeen.add(chasingBrain.aiState);
  }
  assert.ok(statesSeen.has('SEARCH'));
  assert.ok(statesSeen.has('RETURN_TO_PATROL'));
  assert.equal(chasingBrain.aiState, 'PATROL');
});

test('saveGameProgress and loadGameProgress round-trip cleanly', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;

  const sample = createDefaultSave();
  sample.profile.name = 'Chidi Nwosu';
  sample.profile.avatarId = 'amara';
  sample.bestChapter1TimeSec = 142.5;
  sample.evidenceCollected = 1;

  saveGameProgress(sample, mockStorage);
  const loaded = loadGameProgress(mockStorage);
  assert.ok(loaded !== null);
  assert.equal(loaded.profile.name, 'Chidi Nwosu');
  assert.equal(loaded.profile.avatarId, 'amara');
  assert.equal(loaded.bestChapter1TimeSec, 142.5);
  assert.equal(loaded.evidenceCollected, 1);
});

test('avatarSystem resolves all 5 expressions and glides/lands paper airplane cleanly', () => {
  assert.equal(PLAYABLE_AVATARS.length, 4);
  assert.equal(
    resolveAvatarExpression({
      madukaState: 'CHASE',
      lockdownTriggered: true,
      stamina: 80,
      activeEmote: null,
      determinedTimer: 0,
    }),
    'frightened',
  );
  assert.equal(
    resolveAvatarExpression({
      madukaState: 'INVESTIGATE',
      lockdownTriggered: true,
      stamina: 80,
      activeEmote: null,
      determinedTimer: 0,
    }),
    'surprised',
  );
  assert.equal(
    resolveAvatarExpression({
      madukaState: 'PATROL',
      lockdownTriggered: true,
      stamina: 20,
      activeEmote: null,
      determinedTimer: 0,
    }),
    'exhausted',
  );
  assert.equal(
    resolveAvatarExpression({
      madukaState: 'PATROL',
      lockdownTriggered: true,
      stamina: 90,
      activeEmote: 'spin',
      determinedTimer: 0,
    }),
    'determined',
  );

  let plane = createPaperAirplane(0, 1.5, 4.0, 0, -0.05);
  let landed = false;
  for (let i = 0; i < 120; i++) {
    const res = stepPaperAirplane(plane, 0.05, LEVEL_COLLIDERS);
    plane = res.next;
    if (res.justLanded) {
      landed = true;
      break;
    }
  }
  assert.equal(landed, true);
  assert.ok(plane.z < 4.0);
});

test('cameraSystem adapts FOV for 1P spatial awareness, mobile portrait viewports, and head-bob', () => {
  const desktop1p = computeTargetCameraFov({
    phase: 'playing',
    mode: '1p',
    aspect: 16 / 9,
    sprinting: false,
    crouching: false,
  });
  const desktop3p = computeTargetCameraFov({
    phase: 'playing',
    mode: '3p',
    aspect: 16 / 9,
    sprinting: false,
    crouching: false,
  });
  const mobile1p = computeTargetCameraFov({
    phase: 'playing',
    mode: '1p',
    aspect: 390 / 844,
    sprinting: false,
    crouching: false,
  });
  const sprint1p = computeTargetCameraFov({
    phase: 'playing',
    mode: '1p',
    aspect: 16 / 9,
    sprinting: true,
    crouching: false,
  });

  assert.ok(desktop1p > desktop3p, '1P FOV should be wider than 3P for spatial awareness');
  assert.ok(mobile1p > desktop1p, 'Mobile portrait FOV should widen to preserve sightlines');
  assert.ok(sprint1p > desktop1p, 'Sprinting should widen FOV slightly');

  const rig1p = computeTargetCameraRig({
    mode: '1p',
    aspect: 16 / 9,
    pitch: 0,
    crouching: false,
  });
  assert.ok(rig1p.offsetBack < 0, '1P camera should sit with a slight forward eye offset');

  const mobileRig3p = computeTargetCameraRig({
    mode: '3p',
    aspect: 390 / 844,
    pitch: 0,
    crouching: false,
  });
  const desktopRig3p = computeTargetCameraRig({
    mode: '3p',
    aspect: 16 / 9,
    pitch: 0,
    crouching: false,
  });
  assert.ok(mobileRig3p.offsetRight < desktopRig3p.offsetRight);

  const bob1p = computeHeadBobOffsets({ walkPhase: Math.PI / 4, intensity: 1.0, mode: '1p' });
  const bob3p = computeHeadBobOffsets({ walkPhase: Math.PI / 4, intensity: 1.0, mode: '3p' });
  assert.ok(Math.abs(bob1p.vertical) > 0 && Math.abs(bob1p.horizontal) > 0);
  assert.equal(bob3p.vertical, 0);
  assert.equal(bob3p.horizontal, 0);
  assert.equal(bob3p.roll, 0);
});

import {
  createInitialPhysicsState,
  getSurfaceAt,
  stepPlayerPhysics,
} from './physics';

test('physics engine allows jumping onto/over desks, tactical rolling, and detects floor surfaces', () => {
  assert.equal(getSurfaceAt(0, 2.0, 0, LEVEL_COLLIDERS), 'carpet');
  assert.equal(getSurfaceAt(7.2, -9.0, 0, LEVEL_COLLIDERS), 'carpet');
  assert.equal(getSurfaceAt(-4.5, 2.0, 0, LEVEL_COLLIDERS), 'concrete_tile');
  assert.equal(getSurfaceAt(5.0, -4.3, 0.95, LEVEL_COLLIDERS), 'wood_desk');

  // Stand just south of desk_r1 (z = -3.8), sprint & jump north (-Z) over the desk
  let phys = createInitialPhysicsState(5.0, -3.2);
  let jumped = false;
  let reachedDeskHeightOrOver = false;
  for (let i = 0; i < 40; i++) {
    const res = stepPlayerPhysics(
      phys,
      {
        moveForward: 1,
        moveStrafe: 0,
        yaw: 0,
        crouching: false,
        sprinting: true,
        jumpPressed: i === 2,
        rollPressed: false,
        stamina: 100,
        hiddenInLocker: false,
      },
      LEVEL_COLLIDERS,
      0.03,
    );
    phys = res.next;
    if (res.jumped) jumped = true;
    if (phys.footY >= 0.95 && phys.z <= -3.8) {
      reachedDeskHeightOrOver = true;
    }
  }
  assert.equal(jumped, true);
  assert.equal(reachedDeskHeightOrOver, true, 'Player should jump onto or over the 0.95m desk');

  // Trigger tactical dodge roll from grounded stance
  const rollStart = stepPlayerPhysics(
    createInitialPhysicsState(0, 5.0),
    {
      moveForward: 1,
      moveStrafe: 0,
      yaw: 0,
      crouching: false,
      sprinting: false,
      jumpPressed: false,
      rollPressed: true,
      stamina: 100,
      hiddenInLocker: false,
    },
    LEVEL_COLLIDERS,
    0.03,
  );
  assert.equal(rollStart.startedRoll, true);
  assert.ok(rollStart.next.rollTimer > 0);
  assert.ok(rollStart.horizontalSpeed > 6.5);
  assert.ok(rollStart.staminaDelta < 0);
});

import { CAMPAIGN_LEVELS, getLevelDef } from './levels';

test('10 class levels + Principal finale have valid geometry, unique themes, and distinct lecturers', () => {
  assert.equal(CAMPAIGN_LEVELS.length, 11);

  const npcsSeen = new Set<string>();
  const titlesSeen = new Set<string>();
  const classLecturerIds = new Set<string>();

  for (let i = 0; i < CAMPAIGN_LEVELS.length; i++) {
    const lvl = CAMPAIGN_LEVELS[i];
    assert.equal(lvl.id, i + 1);
    assert.ok(!titlesSeen.has(lvl.title), `Duplicate title: ${lvl.title}`);
    titlesSeen.add(lvl.title);

    if (lvl.id <= 10) {
      assert.ok(
        !classLecturerIds.has(lvl.lecturerId),
        `Duplicate class lecturer ${lvl.lecturerId} on Level ${lvl.id}`,
      );
      classLecturerIds.add(lvl.lecturerId);
      assert.notEqual(lvl.lecturerId, 'principal');
    } else {
      assert.equal(lvl.lecturerId, 'principal');
    }

    assert.ok(lvl.npcs.length >= 2, `Level ${lvl.id} should feature at least 2 NPCs`);
    assert.ok(lvl.patrolRoute.length >= 4, `Level ${lvl.id} needs >= 4 patrol waypoints`);

    // Player spawn and lecturer spawn must be free of colliders
    const pSpawnCheck = resolvePlayerCollision(
      lvl.playerSpawn.x,
      lvl.playerSpawn.z,
      0.42,
      lvl.colliders,
    );
    assert.ok(
      Math.hypot(pSpawnCheck.x - lvl.playerSpawn.x, pSpawnCheck.z - lvl.playerSpawn.z) < 0.05,
      `Level ${lvl.id} playerSpawn (${lvl.playerSpawn.x}, ${lvl.playerSpawn.z}) overlaps collider`,
    );

    const mSpawnCheck = resolvePlayerCollision(
      lvl.madukaSpawn.x,
      lvl.madukaSpawn.z,
      0.42,
      lvl.colliders,
    );
    assert.ok(
      Math.hypot(mSpawnCheck.x - lvl.madukaSpawn.x, mSpawnCheck.z - lvl.madukaSpawn.z) < 0.05,
      `Level ${lvl.id} madukaSpawn (${lvl.madukaSpawn.x}, ${lvl.madukaSpawn.z}) overlaps collider`,
    );

    // Every NPC must sit outside colliders
    for (const npc of lvl.npcs) {
      npcsSeen.add(npc.id);
      const npcCheck = resolvePlayerCollision(npc.x, npc.z, 0.42, lvl.colliders);
      assert.ok(
        Math.hypot(npcCheck.x - npc.x, npcCheck.z - npc.z) < 0.05,
        `Level ${lvl.id} NPC ${npc.name} overlaps collider`,
      );
    }

    // Must contain breaker, exit door, fuse, and exit key
    assert.ok(lvl.interactables.some((it) => it.kind === 'breaker'), `Level ${lvl.id} missing breaker`);
    assert.ok(lvl.interactables.some((it) => it.kind === 'exit_door'), `Level ${lvl.id} missing exit_door`);
    assert.ok(lvl.interactables.some((it) => it.itemId === 'breaker_fuse'), `Level ${lvl.id} missing fuse`);
    assert.ok(lvl.interactables.some((it) => it.itemId === 'rear_exit_key'), `Level ${lvl.id} missing key`);
  }

  assert.equal(classLecturerIds.size, 10, 'Expected 10 distinct class lecturers before Principal');

  for (const requiredNpc of ['daniel', 'amara', 'victor', 'nneka', 'bako']) {
    assert.ok(npcsSeen.has(requiredNpc), `Missing NPC ${requiredNpc} across campaign`);
  }

  // Test Level 2 custom emerald carpet zone & Level 11 Principal Sanctum patrol
  const lvl2 = getLevelDef(2);
  assert.equal(getSurfaceAt(-4.0, 0, 0, lvl2.colliders, 0.42, lvl2.carpetZones), 'carpet');
  assert.equal(getSurfaceAt(0, 0, 0, lvl2.colliders, 0.42, lvl2.carpetZones), 'concrete_tile');

  const lvl11 = getLevelDef(11);
  assert.equal(lvl11.npcs.length, 4, 'Principal Sanctum rallies all 4 allies');
  assert.equal(lvl11.lecturerId, 'principal');
  let b11 = createMadukaBrain(lvl11.madukaSpawn);
  const step11 = stepMadukaAi(
    b11,
    {
      playerX: lvl11.playerSpawn.x,
      playerZ: lvl11.playerSpawn.z,
      playerCrouching: false,
      playerHidden: true,
      flashlightOn: false,
      hallLit: false,
      noiseRadius: 0,
    },
    'standard',
    0.05,
    lvl11.colliders,
    lvl11.patrolRoute,
    lvl11.madukaSpeedMultiplier,
  );
  b11 = step11.next;
  assert.equal(b11.aiState, 'PATROL');
});

test('sprint physics increases speed over walking, drains stamina, and recovers when stationary', () => {
  let walkState = createInitialPhysicsState(0, 8.0);
  let sprintState = createInitialPhysicsState(0, 8.0);
  let sprintStamina = 100;

  for (let i = 0; i < 15; i++) {
    const w = stepPlayerPhysics(
      walkState,
      {
        moveForward: 1,
        moveStrafe: 0,
        yaw: 0,
        crouching: false,
        sprinting: false,
        jumpPressed: false,
        rollPressed: false,
        stamina: 100,
        hiddenInLocker: false,
      },
      LEVEL_COLLIDERS,
      0.03,
    );
    walkState = w.next;

    const s = stepPlayerPhysics(
      sprintState,
      {
        moveForward: 1,
        moveStrafe: 0,
        yaw: 0,
        crouching: false,
        sprinting: true,
        jumpPressed: false,
        rollPressed: false,
        stamina: sprintStamina,
        hiddenInLocker: false,
      },
      LEVEL_COLLIDERS,
      0.03,
    );
    sprintState = s.next;
    sprintStamina += s.staminaDelta;
  }

  assert.ok(sprintState.z < walkState.z, 'Sprinting should cover more ground than walking');
  assert.ok(sprintStamina < 100, 'Sprinting should drain stamina');

  const recoverStep = stepPlayerPhysics(
    sprintState,
    {
      moveForward: 0,
      moveStrafe: 0,
      yaw: 0,
      crouching: false,
      sprinting: true,
      jumpPressed: false,
      rollPressed: false,
      stamina: sprintStamina,
      hiddenInLocker: false,
    },
    LEVEL_COLLIDERS,
    0.05,
  );
  assert.ok(recoverStep.staminaDelta > 0, 'Standing still should regenerate stamina even if sprint key held');
});

import { LECTURERS, getLecturerDef, getLecturerForLevel } from './lecturers';
import { computeProximityCueParams } from './audio';

test('lecturers catalog includes 10 distinct class lecturers + Principal Blackwood with cutting-edge stories', () => {
  assert.equal(LECTURERS.length, 11);
  const stories = new Set<string>();
  LECTURERS.forEach((lec, idx) => {
    assert.equal(lec.assignedLevelId, idx + 1);
    assert.ok(lec.storyHook.length > 35, `${lec.id} needs a cutting-edge storyHook`);
    assert.ok(!stories.has(lec.storyHook), `Duplicate storyHook on ${lec.id}`);
    stories.add(lec.storyHook);
  });

  const maduka = getLecturerDef('maduka');
  const misa = getLecturerDef('misa');
  const principal = getLecturerDef('principal');

  assert.equal(maduka.department, 'Computer Science');
  assert.equal(misa.name, 'Mrs. Misa');
  assert.equal(misa.department, 'Sociology');
  assert.equal(misa.eyeColor, '#ff1e2d');
  assert.ok(misa.speedMultiplier > maduka.speedMultiplier);
  assert.equal(principal.isPrincipal, true);
  assert.equal(getLecturerForLevel(11).id, 'principal');

  // Verify stepMadukaAi emits Mrs. Misa's wicked sociology lines when selected
  let brain = createMadukaBrain();
  brain = { ...brain, x: 0, z: -6.0, yaw: 0 };
  const chaseStep = stepMadukaAi(
    brain,
    {
      playerX: 0,
      playerZ: -3.5,
      playerCrouching: false,
      playerHidden: false,
      flashlightOn: true,
      hallLit: true,
      noiseRadius: 0,
    },
    'standard',
    0.05,
    LEVEL_COLLIDERS,
    undefined,
    misa.speedMultiplier,
    misa.lines,
  );
  assert.equal(chaseStep.next.aiState, 'CHASE');
  assert.ok(misa.lines.chase.includes(chaseStep.next.activeLine ?? ''));
});

test('sequential level unlocking enforces clearing previous level before next unlocks', () => {
  assert.equal(isLevelUnlocked(1, []), true);
  assert.equal(isLevelUnlocked(2, []), false);
  assert.equal(isLevelUnlocked(11, [1, 2, 3]), false);
  assert.equal(getHighestUnlockedLevel([], 11), 1);

  assert.equal(isLevelUnlocked(2, [1]), true);
  assert.equal(isLevelUnlocked(3, [1]), false);
  assert.equal(getHighestUnlockedLevel([1], 11), 2);

  assert.equal(isLevelUnlocked(11, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), true);
  assert.equal(getHighestUnlockedLevel([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 11), 11);
});

test('proximity warning audio cue scales louder and faster as lecturer approaches', () => {
  const preLockdown = computeProximityCueParams(3.0, 'PATROL', false);
  assert.equal(preLockdown.active, false);

  const outOfRange = computeProximityCueParams(15.0, 'PATROL', true);
  assert.equal(outOfRange.active, false);

  const far = computeProximityCueParams(11.0, 'PATROL', true);
  const mid = computeProximityCueParams(6.0, 'INVESTIGATE', true);
  const closeChase = computeProximityCueParams(2.5, 'CHASE', true);

  assert.equal(far.active, true);
  assert.equal(mid.active, true);
  assert.equal(closeChase.active, true);

  assert.ok(mid.volume > far.volume, 'Volume should increase as lecturer moves from 11m to 6m');
  assert.ok(closeChase.volume > mid.volume, 'Volume should peak during close CHASE');
  assert.ok(mid.intervalSec < far.intervalSec, 'Pulse interval should tighten as lecturer closes in');
  assert.ok(closeChase.intervalSec < mid.intervalSec, 'Pulse interval should be fastest during close CHASE');
  assert.equal(closeChase.isChase, true);
});

import {
  DEFAULT_CONTROL_SETTINGS,
  computeJoystickVector,
  computeLookDeltas,
  loadControlSettings,
  saveControlSettings,
} from './controls';

test('mobile thumbstick computes deadzone, circular clamping, diagonals, and rim auto-sprint', () => {
  // Micro-jitter inside 14% deadzone produces zero movement
  const tiny = computeJoystickVector(3, -2, 40);
  assert.equal(tiny.moveX, 0);
  assert.equal(tiny.moveY, 0);
  assert.equal(tiny.autoSprinting, false);

  // Mid push up (-dy) walks forward without triggering rim sprint
  const walkUp = computeJoystickVector(0, -24, 40, 0.14, 0.86, true);
  assert.equal(walkUp.moveX, 0);
  assert.ok(walkUp.moveY > 0.45 && walkUp.moveY < 0.7);
  assert.equal(walkUp.autoSprinting, false);

  // Full diagonal push beyond 86% clamps circularly and enables autoSprinting
  const diagSprint = computeJoystickVector(60, -60, 40, 0.14, 0.86, true);
  assert.ok(Math.hypot(diagSprint.moveX, diagSprint.moveY) <= 1.0001);
  assert.ok(diagSprint.moveX > 0.65 && diagSprint.moveY > 0.65);
  assert.equal(diagSprint.autoSprinting, true);

  // Auto-sprint respects opt-out toggle
  const noAuto = computeJoystickVector(0, -40, 40, 0.14, 0.86, false);
  assert.equal(noAuto.autoSprinting, false);
});

test('cross-device look deltas scale with sensitivity, clamp spikes, and respect invertY', () => {
  const normalWheel = computeLookDeltas({
    rawDx: 20,
    rawDy: -15,
    sensitivity: 1.0,
    invertY: false,
    source: 'wheel_trackpad',
  });
  const fastWheel = computeLookDeltas({
    rawDx: 20,
    rawDy: -15,
    sensitivity: 2.0,
    invertY: false,
    source: 'wheel_trackpad',
  });
  const invertedWheel = computeLookDeltas({
    rawDx: 20,
    rawDy: -15,
    sensitivity: 1.0,
    invertY: true,
    source: 'wheel_trackpad',
  });

  assert.ok(normalWheel.dYaw < 0 && normalWheel.dPitch > 0);
  assert.ok(Math.abs(fastWheel.dYaw - normalWheel.dYaw * 2) < 1e-6);
  assert.ok(Math.abs(invertedWheel.dPitch + normalWheel.dPitch) < 1e-6);

  // Extreme glitch spikes are safely clamped
  const hugeTouch = computeLookDeltas({
    rawDx: 900,
    rawDy: -900,
    sensitivity: 1.0,
    invertY: false,
    source: 'touch',
  });
  const maxAllowedTouch = computeLookDeltas({
    rawDx: 65,
    rawDy: -65,
    sensitivity: 1.0,
    invertY: false,
    source: 'touch',
  });
  assert.equal(hugeTouch.dYaw, maxAllowedTouch.dYaw);
  assert.equal(hugeTouch.dPitch, maxAllowedTouch.dPitch);
});

test('control settings persist and load cleanly across sessions', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;

  assert.deepEqual(loadControlSettings(mockStorage), DEFAULT_CONTROL_SETTINGS);

  saveControlSettings(
    {
      lookSensitivity: 1.6,
      invertY: true,
      autoSprintJoystick: false,
      sprintToggleMode: true,
    },
    mockStorage,
  );

  const loaded = loadControlSettings(mockStorage);
  assert.equal(loaded.lookSensitivity, 1.6);
  assert.equal(loaded.invertY, true);
  assert.equal(loaded.autoSprintJoystick, false);
  assert.equal(loaded.sprintToggleMode, true);
});



