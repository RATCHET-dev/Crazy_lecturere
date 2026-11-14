export type PlayerStance = 'crouch' | 'walk' | 'sprint';
export type FloorSurface = 'carpet' | 'tile' | 'creaky_wood';
export type BellPhase = 1 | 2 | 3;
export type LecturerAiState =
  | 'LECTURING'
  | 'SUSPICIOUS'
  | 'INVESTIGATING'
  | 'PURSUIT'
  | 'SEARCHING';

export interface NoiseInput {
  stance: PlayerStance;
  surface: FloorSurface;
  carryingHeavyProp: boolean;
}

export interface NoiseOutput {
  radiusMeters: number;
  decibels: number;
  tier: 'Silent' | 'Low' | 'Moderate' | 'Alerting';
}

export interface VisionCheckInput {
  lecturerX: number;
  lecturerZ: number;
  /** Facing yaw in radians (0 = +Z, Math.PI/2 = +X) */
  lecturerYaw: number;
  playerX: number;
  playerZ: number;
  playerCrouched: boolean;
  inShadow: boolean;
  hasDeskCover: boolean;
  bellPhase: BellPhase;
}

export interface VisionCheckResult {
  distanceMeters: number;
  angleDeg: number;
  withinCone: boolean;
  occluded: boolean;
  detected: boolean;
  suspicionPerSecond: number;
}

export interface BellPhaseConfig {
  phase: BellPhase;
  label: string;
  patrolSpeedMps: number;
  pursuitSpeedMps: number;
  visionRangeLitM: number;
  visionRangeDarkM: number;
  fovDegrees: number;
  hearingMultiplier: number;
  lightingState: string;
  doorLockState: string;
}

export interface LecturerSimState {
  aiState: LecturerAiState;
  bellPhase: BellPhase;
  x: number;
  z: number;
  yaw: number;
  suspicion: number; // 0..100
  stateTimer: number;
  targetX: number | null;
  targetZ: number | null;
  waypointIndex: number;
}

export interface PatrolWaypoint {
  x: number;
  z: number;
  lookYaw: number;
  dwellSeconds: number;
}

export const LECTURE_WAYPOINTS: PatrolWaypoint[] = [
  { x: 0, z: -5.4, lookYaw: 0, dwellSeconds: 3.5 },       // Front lectern facing rows
  { x: 3.8, z: -5.2, lookYaw: -0.35, dwellSeconds: 2.0 },  // Right chalkboard corner
  { x: 3.6, z: 0.4, lookYaw: -1.4, dwellSeconds: 1.8 },    // Right aisle mid-tier
  { x: 0, z: 3.6, lookYaw: Math.PI, dwellSeconds: 2.2 },   // Back aisle sweep
  { x: -3.6, z: 0.4, lookYaw: 1.4, dwellSeconds: 1.8 },    // Left aisle mid-tier
  { x: -3.8, z: -5.2, lookYaw: 0.35, dwellSeconds: 2.0 },  // Left chalkboard corner
];

export function getBellPhaseConfig(phase: BellPhase): BellPhaseConfig {
  switch (phase) {
    case 1:
      return {
        phase: 1,
        label: 'Bell 1: Late Seminar',
        patrolSpeedMps: 1.85,
        pursuitSpeedMps: 4.35,
        visionRangeLitM: 12.5,
        visionRangeDarkM: 6.5,
        fovDegrees: 72,
        hearingMultiplier: 1.0,
        lightingState: 'Flickering ceiling fluorescents + warm lectern lamp',
        doorLockState: 'Main corridor unlocked after Breaker + Keycard',
      };
    case 2:
      return {
        phase: 2,
        label: 'Bell 2: Mandatory Attendance',
        patrolSpeedMps: 2.35,
        pursuitSpeedMps: 4.75,
        visionRangeLitM: 14.5,
        visionRangeDarkM: 8.0,
        fovDegrees: 80,
        hearingMultiplier: 1.2,
        lightingState: 'Half-hall brownout; projector strobe sweep active',
        doorLockState: 'Side prep-lab shutter drops periodically',
      };
    case 3:
      return {
        phase: 3,
        label: 'Bell 3: Overtime Lockdown',
        patrolSpeedMps: 2.85,
        pursuitSpeedMps: 5.2,
        visionRangeLitM: 16.0,
        visionRangeDarkM: 10.5,
        fovDegrees: 88,
        hearingMultiplier: 1.4,
        lightingState: 'Full power cut; lecturer carries narrow high-beam flashlight',
        doorLockState: 'Emergency keypad countdown armed (90s patrol sweeps)',
      };
  }
}

export function calculateNoiseRadius(input: NoiseInput): NoiseOutput {
  const stanceBase: Record<PlayerStance, number> = {
    crouch: 1.4,
    walk: 5.2,
    sprint: 11.8,
  };

  const surfaceFactor: Record<FloorSurface, number> = {
    carpet: 0.75,
    tile: 1.05,
    creaky_wood: 1.45,
  };

  const weightBonus = input.carryingHeavyProp ? 1.25 : 1.0;
  const radius = Number(
    (stanceBase[input.stance] * surfaceFactor[input.surface] * weightBonus).toFixed(2),
  );

  // Approximate dB mapping for player clarity in HUD/PRD tuning
  const decibels = Math.round(24 + radius * 4.1);

  let tier: NoiseOutput['tier'] = 'Silent';
  if (radius >= 10) {
    tier = 'Alerting';
  } else if (radius >= 5.5) {
    tier = 'Moderate';
  } else if (radius >= 2.2) {
    tier = 'Low';
  }

  return {
    radiusMeters: radius,
    decibels,
    tier,
  };
}

function normalizeAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function evaluateVisionDetection(input: VisionCheckInput): VisionCheckResult {
  const cfg = getBellPhaseConfig(input.bellPhase);
  const dx = input.playerX - input.lecturerX;
  const dz = input.playerZ - input.lecturerZ;
  const distanceMeters = Math.hypot(dx, dz);

  const angleToPlayer = Math.atan2(dx, dz);
  const deltaAngle = Math.abs(normalizeAngle(angleToPlayer - input.lecturerYaw));
  const angleDeg = (deltaAngle * 180) / Math.PI;

  const baseRange = input.inShadow ? cfg.visionRangeDarkM : cfg.visionRangeLitM;
  const effectiveRange = input.playerCrouched ? baseRange * 0.82 : baseRange;
  const halfFov = cfg.fovDegrees / 2;

  const withinCone = distanceMeters <= effectiveRange && angleDeg <= halfFov;
  const occluded = input.playerCrouched && input.hasDeskCover;
  const detected = withinCone && !occluded;

  let suspicionPerSecond = 0;
  if (detected) {
    const proximityRatio = Math.max(0.15, 1 - distanceMeters / Math.max(1, effectiveRange));
    const shadowFactor = input.inShadow ? 0.65 : 1.0;
    suspicionPerSecond = Math.round(35 + proximityRatio * 95 * shadowFactor);
  }

  return {
    distanceMeters: Number(distanceMeters.toFixed(2)),
    angleDeg: Number(angleDeg.toFixed(1)),
    withinCone,
    occluded,
    detected,
    suspicionPerSecond,
  };
}

export function createInitialLecturerState(bellPhase: BellPhase = 1): LecturerSimState {
  const first = LECTURE_WAYPOINTS[0];
  return {
    aiState: 'LECTURING',
    bellPhase,
    x: first.x,
    z: first.z,
    yaw: first.lookYaw,
    suspicion: 0,
    stateTimer: first.dwellSeconds,
    targetX: null,
    targetZ: null,
    waypointIndex: 0,
  };
}

export function triggerNoiseStimulus(
  state: LecturerSimState,
  sourceX: number,
  sourceZ: number,
  noiseRadiusMeters: number,
): LecturerSimState {
  const cfg = getBellPhaseConfig(state.bellPhase);
  const dist = Math.hypot(sourceX - state.x, sourceZ - state.z);
  const effectiveHearing = noiseRadiusMeters * cfg.hearingMultiplier;

  if (dist > effectiveHearing) {
    return state;
  }

  // Loud close sounds immediately escalate to Investigating or Pursuit
  if (dist <= 3.5 && noiseRadiusMeters >= 9) {
    return {
      ...state,
      aiState: 'PURSUIT',
      suspicion: 100,
      targetX: sourceX,
      targetZ: sourceZ,
      stateTimer: 5.0,
    };
  }

  return {
    ...state,
    aiState: 'INVESTIGATING',
    suspicion: Math.max(state.suspicion, 55),
    targetX: sourceX,
    targetZ: sourceZ,
    stateTimer: 4.5,
  };
}

function moveToward(
  x: number,
  z: number,
  tx: number,
  tz: number,
  speed: number,
  dt: number,
): { x: number; z: number; yaw: number; arrived: boolean } {
  const dx = tx - x;
  const dz = tz - z;
  const dist = Math.hypot(dx, dz);
  if (dist <= 0.12) {
    return { x: tx, z: tz, yaw: Math.atan2(dx, dz), arrived: true };
  }
  const step = Math.min(dist, speed * dt);
  const nx = x + (dx / dist) * step;
  const nz = z + (dz / dist) * step;
  return {
    x: nx,
    z: nz,
    yaw: Math.atan2(dx, dz),
    arrived: dist - step <= 0.12,
  };
}

export function stepLecturerState(
  state: LecturerSimState,
  dt: number,
  waypoints: PatrolWaypoint[] = LECTURE_WAYPOINTS,
): LecturerSimState {
  const clampedDt = Math.min(Math.max(dt, 0), 0.1);
  const cfg = getBellPhaseConfig(state.bellPhase);

  if (state.aiState === 'INVESTIGATING' || state.aiState === 'PURSUIT') {
    if (state.targetX !== null && state.targetZ !== null) {
      const speed =
        state.aiState === 'PURSUIT' ? cfg.pursuitSpeedMps : cfg.patrolSpeedMps * 1.25;
      const moved = moveToward(state.x, state.z, state.targetX, state.targetZ, speed, clampedDt);
      if (moved.arrived) {
        return {
          ...state,
          x: moved.x,
          z: moved.z,
          aiState: 'SEARCHING',
          stateTimer: 3.2,
          targetX: null,
          targetZ: null,
        };
      }
      return {
        ...state,
        x: moved.x,
        z: moved.z,
        yaw: moved.yaw,
      };
    }
  }

  if (state.aiState === 'SEARCHING') {
    const nextTimer = state.stateTimer - clampedDt;
    const scanYaw = state.yaw + Math.sin(nextTimer * 2.4) * clampedDt * 1.6;
    if (nextTimer <= 0) {
      const nextWp = waypoints[state.waypointIndex];
      return {
        ...state,
        aiState: 'LECTURING',
        suspicion: 0,
        stateTimer: nextWp.dwellSeconds,
      };
    }
    return {
      ...state,
      yaw: scanYaw,
      stateTimer: nextTimer,
      suspicion: Math.max(0, state.suspicion - clampedDt * 18),
    };
  }

  // Default LECTURING / SUSPICIOUS patrol loop
  const wp = waypoints[state.waypointIndex];
  const distToWp = Math.hypot(wp.x - state.x, wp.z - state.z);

  if (distToWp > 0.15) {
    const moved = moveToward(state.x, state.z, wp.x, wp.z, cfg.patrolSpeedMps, clampedDt);
    return {
      ...state,
      x: moved.x,
      z: moved.z,
      yaw: moved.yaw,
    };
  }

  const remaining = state.stateTimer - clampedDt;
  if (remaining <= 0) {
    const nextIdx = (state.waypointIndex + 1) % waypoints.length;
    return {
      ...state,
      waypointIndex: nextIdx,
      stateTimer: waypoints[nextIdx].dwellSeconds,
      yaw: wp.lookYaw,
    };
  }

  // Smoothly turn toward waypoint lookYaw while dwelling
  const yawDiff = normalizeAngle(wp.lookYaw - state.yaw);
  return {
    ...state,
    yaw: state.yaw + yawDiff * Math.min(1, clampedDt * 4),
    stateTimer: remaining,
    suspicion: Math.max(0, state.suspicion - clampedDt * 12),
  };
}
