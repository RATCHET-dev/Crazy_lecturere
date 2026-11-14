import { AabbBox, CarpetZone } from './types';
import { WORLD_BOUNDS } from './worldLayout';

export const DEFAULT_CARPET_ZONES: CarpetZone[] = [
  { minX: -1.15, maxX: 1.15, minZ: -8.8, maxZ: 9.8 },
  { minX: 4.0, maxX: 11.6, minZ: -12.5, maxZ: -7.0 },
];

export type SurfaceMaterial = 'concrete_tile' | 'carpet' | 'wood_desk';

export interface PlayerPhysicsState {
  x: number;
  footY: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  grounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  rollBufferTimer: number;
  rollTimer: number;
  rollCooldown: number;
  rollDirX: number;
  rollDirZ: number;
}

export interface PlayerPhysicsInput {
  moveForward: number; // -1..1
  moveStrafe: number; // -1..1
  yaw: number;
  crouching: boolean;
  sprinting: boolean;
  jumpPressed: boolean;
  rollPressed: boolean;
  stamina: number;
  hiddenInLocker: boolean;
}

export interface PlayerPhysicsStepResult {
  next: PlayerPhysicsState;
  distMoved: number;
  horizontalSpeed: number;
  jumped: boolean;
  startedRoll: boolean;
  landedImpactSpeed: number;
  surface: SurfaceMaterial;
  staminaDelta: number;
}

export const PHYSICS_CONSTANTS = {
  playerRadius: 0.42,
  gravity: 13.8,
  jumpVelocity: 5.55, // Peak height ~1.11m -> comfortably clears 0.95m desks!
  walkSpeed: 3.35,
  sprintSpeed: 5.65,
  crouchSpeed: 1.9,
  rollSpeed: 7.4,
  rollDuration: 0.46,
  rollCooldown: 0.72,
  rollStaminaCost: 18,
  groundAccel: 26,
  groundFriction: 19,
  airAccel: 9.5,
  airDrag: 1.8,
  vaultForgiveness: 0.16,
  coyoteTime: 0.11,
  jumpBufferTime: 0.12,
  rollBufferTime: 0.18,
};

export function createInitialPhysicsState(x: number, z: number): PlayerPhysicsState {
  return {
    x,
    footY: 0,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    rollBufferTimer: 0,
    rollTimer: 0,
    rollCooldown: 0,
    rollDirX: 0,
    rollDirZ: -1,
  };
}

/**
 * Determines the acoustic surface beneath the player for dynamic footsteps & landings.
 */
export function getSurfaceAt(
  x: number,
  z: number,
  footY: number,
  colliders: AabbBox[],
  radius: number = PHYSICS_CONSTANTS.playerRadius,
  carpetZones: CarpetZone[] = DEFAULT_CARPET_ZONES,
): SurfaceMaterial {
  if (footY >= 0.45) {
    for (const box of colliders) {
      if (box.kind !== 'desk') continue;
      if (
        x + radius * 0.6 >= box.minX &&
        x - radius * 0.6 <= box.maxX &&
        z + radius * 0.6 >= box.minZ &&
        z - radius * 0.6 <= box.maxZ &&
        Math.abs(footY - box.height) <= 0.35
      ) {
        return 'wood_desk';
      }
    }
  }

  for (const zone of carpetZones) {
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
      return 'carpet';
    }
  }

  return 'concrete_tile';
}

/**
 * Finds the highest horizontal supporting floor or desk top underneath the player's footprint.
 */
export function findSupportingSurfaceY(
  x: number,
  z: number,
  footY: number,
  radius: number,
  colliders: AabbBox[],
): number {
  let supportY = 0;
  const footMargin = radius * 0.68;

  for (const box of colliders) {
    if (box.kind !== 'desk') continue;
    const overlapsX = x + footMargin >= box.minX && x - footMargin <= box.maxX;
    const overlapsZ = z + footMargin >= box.minZ && z - footMargin <= box.maxZ;
    if (!overlapsX || !overlapsZ) continue;

    if (footY >= box.height - PHYSICS_CONSTANTS.vaultForgiveness && box.height > supportY) {
      supportY = box.height;
    }
  }

  return supportY;
}

/**
 * Resolves 2D horizontal collision while respecting vertical clearance:
 * desks (height ~0.95m) can be jumped onto and vaulted right over!
 */
export function resolveHorizontalCollision3D(
  x: number,
  z: number,
  footY: number,
  radius: number,
  colliders: AabbBox[],
): { x: number; z: number; clippedX: boolean; clippedZ: boolean } {
  let px = Math.min(Math.max(x, WORLD_BOUNDS.minX + radius), WORLD_BOUNDS.maxX - radius);
  let pz = Math.min(Math.max(z, WORLD_BOUNDS.minZ + radius), WORLD_BOUNDS.maxZ - radius);
  let clippedX = px !== x;
  let clippedZ = pz !== z;

  for (const box of colliders) {
    // Allow clearing or landing onto desks once feet reach vault height
    if (box.kind === 'desk' && footY >= box.height - PHYSICS_CONSTANTS.vaultForgiveness) {
      continue;
    }

    const closestX = Math.max(box.minX, Math.min(px, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(pz, box.maxZ));

    const dx = px - closestX;
    const dz = pz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        const pushX = (dx / dist) * push;
        const pushZ = (dz / dist) * push;
        px += pushX;
        pz += pushZ;
        if (Math.abs(pushX) > 0.001) clippedX = true;
        if (Math.abs(pushZ) > 0.001) clippedZ = true;
      } else {
        const leftPen = Math.abs(px - box.minX);
        const rightPen = Math.abs(box.maxX - px);
        const topPen = Math.abs(pz - box.minZ);
        const botPen = Math.abs(box.maxZ - pz);
        const minPen = Math.min(leftPen, rightPen, topPen, botPen);
        if (minPen === leftPen) {
          px = box.minX - radius;
          clippedX = true;
        } else if (minPen === rightPen) {
          px = box.maxX + radius;
          clippedX = true;
        } else if (minPen === topPen) {
          pz = box.minZ - radius;
          clippedZ = true;
        } else {
          pz = box.maxZ + radius;
          clippedZ = true;
        }
      }
    }
  }

  return { x: px, z: pz, clippedX, clippedZ };
}

/**
 * Steps player 3D kinematics: momentum, sprinting, coyote-time jumping over desks,
 * tactical dodge rolling, gravity, and landing impact velocity.
 */
export function stepPlayerPhysics(
  state: PlayerPhysicsState,
  input: PlayerPhysicsInput,
  colliders: AabbBox[],
  dt: number,
  carpetZones: CarpetZone[] = DEFAULT_CARPET_ZONES,
): PlayerPhysicsStepResult {
  if (input.hiddenInLocker) {
    return {
      next: {
        ...state,
        vx: 0,
        vy: 0,
        vz: 0,
        rollTimer: 0,
      },
      distMoved: 0,
      horizontalSpeed: 0,
      jumped: false,
      startedRoll: false,
      landedImpactSpeed: 0,
      surface: getSurfaceAt(state.x, state.z, state.footY, colliders, PHYSICS_CONSTANTS.playerRadius, carpetZones),
      staminaDelta: dt * 14,
    };
  }

  const safeDt = Math.min(Math.max(dt, 0), 0.08);
  let {
    x,
    footY,
    z,
    vx,
    vy,
    vz,
    grounded,
    coyoteTimer,
    jumpBufferTimer,
    rollBufferTimer,
    rollTimer,
    rollCooldown,
    rollDirX,
    rollDirZ,
  } = state;

  if (rollCooldown > 0) rollCooldown = Math.max(0, rollCooldown - safeDt);
  if (input.jumpPressed) {
    jumpBufferTimer = PHYSICS_CONSTANTS.jumpBufferTime;
  } else if (jumpBufferTimer > 0) {
    jumpBufferTimer = Math.max(0, jumpBufferTimer - safeDt);
  }
  if (input.rollPressed) {
    rollBufferTimer = PHYSICS_CONSTANTS.rollBufferTime;
  } else if (rollBufferTimer > 0) {
    rollBufferTimer = Math.max(0, rollBufferTimer - safeDt);
  }

  const fwdX = -Math.sin(input.yaw);
  const fwdZ = -Math.cos(input.yaw);
  const rightX = Math.cos(input.yaw);
  const rightZ = -Math.sin(input.yaw);

  let moveMag = Math.hypot(input.moveForward, input.moveStrafe);
  let wishX = fwdX * input.moveForward + rightX * input.moveStrafe;
  let wishZ = fwdZ * input.moveForward + rightZ * input.moveStrafe;
  if (moveMag > 0.001) {
    const inv = 1 / Math.hypot(wishX, wishZ);
    wishX *= inv;
    wishZ *= inv;
    moveMag = Math.min(1, moveMag);
  } else {
    wishX = 0;
    wishZ = 0;
    moveMag = 0;
  }

  let staminaDelta = 0;
  let startedRoll = false;

  // Trigger tactical dodge roll (supports buffered parkour landing roll)
  if (
    rollBufferTimer > 0 &&
    rollTimer <= 0 &&
    rollCooldown <= 0 &&
    grounded &&
    input.stamina >= PHYSICS_CONSTANTS.rollStaminaCost
  ) {
    startedRoll = true;
    rollBufferTimer = 0;
    rollTimer = PHYSICS_CONSTANTS.rollDuration;
    rollCooldown = PHYSICS_CONSTANTS.rollCooldown;
    rollDirX = moveMag > 0.1 ? wishX : fwdX;
    rollDirZ = moveMag > 0.1 ? wishZ : fwdZ;
    vx = rollDirX * PHYSICS_CONSTANTS.rollSpeed;
    vz = rollDirZ * PHYSICS_CONSTANTS.rollSpeed;
    staminaDelta -= PHYSICS_CONSTANTS.rollStaminaCost;
  }

  if (rollTimer > 0) {
    rollTimer = Math.max(0, rollTimer - safeDt);
    const progress = 1 - rollTimer / PHYSICS_CONSTANTS.rollDuration;
    const rollCurve = 1.0 - progress * 0.48;
    vx = rollDirX * PHYSICS_CONSTANTS.rollSpeed * rollCurve;
    vz = rollDirZ * PHYSICS_CONSTANTS.rollSpeed * rollCurve;
  } else {
    const canSprint = input.sprinting && !input.crouching && moveMag > 0.1 && input.stamina > 2;
    const topSpeed = input.crouching
      ? PHYSICS_CONSTANTS.crouchSpeed
      : canSprint
        ? PHYSICS_CONSTANTS.sprintSpeed
        : PHYSICS_CONSTANTS.walkSpeed;

    if (canSprint) {
      staminaDelta -= safeDt * 22;
    } else {
      staminaDelta += safeDt * 14;
    }

    const targetVx = wishX * topSpeed * moveMag;
    const targetVz = wishZ * topSpeed * moveMag;
    const accel = grounded
      ? moveMag > 0.05
        ? PHYSICS_CONSTANTS.groundAccel
        : PHYSICS_CONSTANTS.groundFriction
      : moveMag > 0.05
        ? PHYSICS_CONSTANTS.airAccel
        : PHYSICS_CONSTANTS.airDrag;

    const blend = 1 - Math.exp(-accel * safeDt);
    vx = vx + (targetVx - vx) * blend;
    vz = vz + (targetVz - vz) * blend;
    if (moveMag === 0 && Math.hypot(vx, vz) < 0.03) {
      vx = 0;
      vz = 0;
    }
  }

  // Coyote time & buffered jump
  if (grounded) {
    coyoteTimer = PHYSICS_CONSTANTS.coyoteTime;
  } else if (coyoteTimer > 0) {
    coyoteTimer = Math.max(0, coyoteTimer - safeDt);
  }

  let jumped = false;
  if (jumpBufferTimer > 0 && coyoteTimer > 0 && !input.crouching && rollTimer <= 0) {
    vy = PHYSICS_CONSTANTS.jumpVelocity;
    grounded = false;
    coyoteTimer = 0;
    jumpBufferTimer = 0;
    jumped = true;
    // Slight forward hop boost if jumping while moving
    if (moveMag > 0.1) {
      vx += wishX * 0.65;
      vz += wishZ * 0.65;
    }
  }

  // Vertical integration + desk/floor support
  if (!grounded) {
    vy -= PHYSICS_CONSTANTS.gravity * safeDt;
    footY += vy * safeDt;
  }

  // Horizontal integration with 3D desk-clearance collision
  const nextX = x + vx * safeDt;
  const nextZ = z + vz * safeDt;
  const resolved = resolveHorizontalCollision3D(
    nextX,
    nextZ,
    footY,
    PHYSICS_CONSTANTS.playerRadius,
    colliders,
  );
  const distMoved = Math.hypot(resolved.x - x, resolved.z - z);
  x = resolved.x;
  z = resolved.z;
  if (resolved.clippedX) vx *= 0.25;
  if (resolved.clippedZ) vz *= 0.25;

  const supportY = findSupportingSurfaceY(
    x,
    z,
    footY,
    PHYSICS_CONSTANTS.playerRadius,
    colliders,
  );

  let landedImpactSpeed = 0;
  if (footY <= supportY) {
    if (!grounded && vy < -0.8) {
      landedImpactSpeed = Math.abs(vy);
    }
    footY = supportY;
    vy = 0;
    grounded = true;
  } else if (footY > supportY + 0.03) {
    grounded = false;
  }

  const surface = getSurfaceAt(x, z, footY, colliders, PHYSICS_CONSTANTS.playerRadius, carpetZones);

  return {
    next: {
      x,
      footY,
      z,
      vx,
      vy,
      vz,
      grounded,
      coyoteTimer,
      jumpBufferTimer,
      rollBufferTimer,
      rollTimer,
      rollCooldown,
      rollDirX,
      rollDirZ,
    },
    distMoved,
    horizontalSpeed: Math.hypot(vx, vz),
    jumped,
    startedRoll,
    landedImpactSpeed,
    surface,
    staminaDelta,
  };
}
