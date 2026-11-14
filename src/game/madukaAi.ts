import { AabbBox, DifficultyLevel, MadukaAiState } from './types';
import { LecturerDialogueSet } from './lecturers';
import { hasLineOfSight, LEVEL_COLLIDERS, MADUKA_SPAWN } from './worldLayout';

export interface MadukaWaypoint {
  x: number;
  z: number;
  lookYaw: number;
  dwellSeconds: number;
}

export const MADUKA_PATROL_ROUTE: MadukaWaypoint[] = [
  { x: 0, z: -6.2, lookYaw: 0, dwellSeconds: 2.2 },          // Center front near lectern
  { x: 0, z: -1.8, lookYaw: 0, dwellSeconds: 1.4 },          // Center aisle front-mid
  { x: 0, z: 2.2, lookYaw: Math.PI / 2, dwellSeconds: 1.5 }, // Center aisle mid-rear
  { x: 9.6, z: 1.8, lookYaw: Math.PI, dwellSeconds: 1.6 },   // East aisle sweep
  { x: 9.6, z: -5.8, lookYaw: -Math.PI / 2, dwellSeconds: 1.8 }, // East front corner (outside office)
  { x: -9.4, z: -6.0, lookYaw: 0, dwellSeconds: 1.8 },       // West front near breaker
  { x: -9.4, z: 2.0, lookYaw: -Math.PI / 2, dwellSeconds: 1.6 }, // West aisle rear
];

export interface MadukaDifficultyTuning {
  patrolSpeed: number;
  investigateSpeed: number;
  chaseSpeed: number;
  fovDeg: number;
  sightRangeLit: number;
  sightRangeDark: number;
  hearingScale: number;
  suspicionGainRate: number;
}

export function getMadukaTuning(difficulty: DifficultyLevel): MadukaDifficultyTuning {
  switch (difficulty) {
    case 'relaxed':
      return {
        patrolSpeed: 1.8,
        investigateSpeed: 2.4,
        chaseSpeed: 4.1,
        fovDeg: 74,
        sightRangeLit: 13.5,
        sightRangeDark: 7.5,
        hearingScale: 0.85,
        suspicionGainRate: 42,
      };
    case 'honors':
      return {
        patrolSpeed: 2.5,
        investigateSpeed: 3.3,
        chaseSpeed: 5.05,
        fovDeg: 92,
        sightRangeLit: 17.5,
        sightRangeDark: 10.5,
        hearingScale: 1.25,
        suspicionGainRate: 78,
      };
    case 'standard':
    default:
      return {
        patrolSpeed: 2.15,
        investigateSpeed: 2.85,
        chaseSpeed: 4.6,
        fovDeg: 82,
        sightRangeLit: 15.5,
        sightRangeDark: 9.0,
        hearingScale: 1.0,
        suspicionGainRate: 58,
      };
  }
}

export const MADUKA_LINES = {
  patrol: [
    'In my class, even the clock must seek permission to stop.',
    'Attendance is a moral contract. Nobody leaves CS-301 ungraded.',
    'Keep quiet. I can hear careless footnotes from across the aisle.',
  ],
  suspicious: [
    'WHO IS MAKING THAT NOISE?',
    'A movement in Row B? Show your student ID.',
    'Do not test my peripheral vision.',
  ],
  investigate: [
    'Interesting. Let us inspect that disturbance personally.',
    'Hiding under an oak desk is a Rank C strategy.',
  ],
  chase: [
    'You are late. Your survival is now an assignment.',
    'Intelligence is knowing the answer. Wisdom is knowing when to run.',
    'You may escape this building, but you cannot escape your academic responsibilities!',
  ],
  search: [
    'Come out. Your GPA drops every second you waste my time.',
    'Lockers are for textbooks, not terrified undergraduates.',
  ],
  returnToPatrol: [
    'Tch. Disorganized, undisciplined... back to the podium.',
    'The syllabus waits for no coward.',
  ],
  caught: 'Since you seem to enjoy my company, we shall have another semester together.',
};

export interface MadukaBrainState {
  aiState: MadukaAiState;
  x: number;
  z: number;
  yaw: number; // 0 = +Z, Math.PI = -Z, Math.PI/2 = +X
  suspicion: number; // 0..100
  stateTimer: number;
  waypointIndex: number;
  targetX: number | null;
  targetZ: number | null;
  lastKnownPlayerX: number | null;
  lastKnownPlayerZ: number | null;
  activeLine: string | null;
  lineTimer: number;
  catchCooldown: number;
}

export interface PlayerPerceptionInput {
  playerX: number;
  playerZ: number;
  playerCrouching: boolean;
  playerHidden: boolean;
  flashlightOn: boolean;
  hallLit: boolean;
  noiseRadius: number;
}

export function createMadukaBrain(
  spawn: { x: number; z: number; yaw: number } = MADUKA_SPAWN,
): MadukaBrainState {
  return {
    aiState: 'PATROL',
    x: spawn.x,
    z: spawn.z,
    yaw: spawn.yaw,
    suspicion: 0,
    stateTimer: 1.5,
    waypointIndex: 0,
    targetX: null,
    targetZ: null,
    lastKnownPlayerX: null,
    lastKnownPlayerZ: null,
    activeLine: null,
    lineTimer: 0,
    catchCooldown: 0,
  };
}

function normalizeAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function pickLine(pool: string[], seed: number): string {
  return pool[Math.abs(Math.floor(seed * 13)) % pool.length];
}

function moveTowardPoint(
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
  if (dist <= 0.16) {
    return { x: tx, z: tz, yaw: Math.atan2(dx, dz), arrived: true };
  }
  const step = Math.min(dist, speed * dt);
  return {
    x: x + (dx / dist) * step,
    z: z + (dz / dist) * step,
    yaw: Math.atan2(dx, dz),
    arrived: dist - step <= 0.16,
  };
}

function findNearestWaypointIndex(
  x: number,
  z: number,
  patrolRoute: MadukaWaypoint[] = MADUKA_PATROL_ROUTE,
): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < patrolRoute.length; i++) {
    const wp = patrolRoute[i];
    const d = Math.hypot(wp.x - x, wp.z - z);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function stepMadukaAi(
  brain: MadukaBrainState,
  player: PlayerPerceptionInput,
  difficulty: DifficultyLevel,
  dt: number,
  colliders: AabbBox[] = LEVEL_COLLIDERS,
  patrolRoute: MadukaWaypoint[] = MADUKA_PATROL_ROUTE,
  speedMultiplier: number = 1.0,
  dialogueLines: Pick<
    LecturerDialogueSet,
    'patrol' | 'suspicious' | 'investigate' | 'chase' | 'search' | 'returnToPatrol'
  > = MADUKA_LINES,
): { next: MadukaBrainState; caughtPlayer: boolean; stateChanged: boolean } {
  const clampedDt = Math.min(Math.max(dt, 0), 0.05);
  const tuning = getMadukaTuning(difficulty);
  const effectivePatrolSpeed = tuning.patrolSpeed * speedMultiplier;
  const effectiveInvestigateSpeed = tuning.investigateSpeed * speedMultiplier;
  const effectiveChaseSpeed = tuning.chaseSpeed * speedMultiplier;
  const prevState = brain.aiState;

  let next: MadukaBrainState = {
    ...brain,
    lineTimer: Math.max(0, brain.lineTimer - clampedDt),
    catchCooldown: Math.max(0, brain.catchCooldown - clampedDt),
  };
  if (next.lineTimer === 0) next.activeLine = null;

  // 1. Evaluate believable perception (NO wall vision, NO hidden-locker vision)
  const dx = player.playerX - next.x;
  const dz = player.playerZ - next.z;
  const distToPlayer = Math.hypot(dx, dz);

  const angleToPlayer = Math.atan2(dx, dz);
  const deltaAngleDeg = (Math.abs(normalizeAngle(angleToPlayer - next.yaw)) * 180) / Math.PI;

  const baseRange = player.hallLit ? tuning.sightRangeLit : tuning.sightRangeDark;
  const flashlightBonus = player.flashlightOn ? 3.2 : 0;
  const crouchMultiplier = player.playerCrouching ? 0.78 : 1.0;
  const effectiveSightRange = (baseRange + flashlightBonus) * crouchMultiplier;

  const hasLos =
    !player.playerHidden &&
    distToPlayer <= effectiveSightRange &&
    deltaAngleDeg <= tuning.fovDeg / 2 &&
    hasLineOfSight(next.x, next.z, player.playerX, player.playerZ, player.playerCrouching, colliders);

  const canHear =
    !player.playerHidden &&
    player.noiseRadius > 0.5 &&
    distToPlayer <= player.noiseRadius * tuning.hearingScale;

  // 2. Perception -> State Transitions
  if (hasLos) {
    const closeness = Math.max(0.25, 1 - distToPlayer / Math.max(1, effectiveSightRange));
    const gain = tuning.suspicionGainRate * (0.65 + closeness * 1.35) * clampedDt;
    next.suspicion = Math.min(100, next.suspicion + gain);
    next.lastKnownPlayerX = player.playerX;
    next.lastKnownPlayerZ = player.playerZ;

    if (next.suspicion >= 85 || distToPlayer <= 4.0) {
      if (next.aiState !== 'CHASE') {
        next.aiState = 'CHASE';
        next.activeLine = pickLine(dialogueLines.chase, distToPlayer + next.x);
        next.lineTimer = 4.0;
      }
      next.targetX = player.playerX;
      next.targetZ = player.playerZ;
      next.stateTimer = 4.5;
    } else if (next.aiState === 'PATROL' || next.aiState === 'RETURN_TO_PATROL') {
      next.aiState = 'SUSPICIOUS';
      next.stateTimer = 1.4;
      next.targetX = player.playerX;
      next.targetZ = player.playerZ;
      next.activeLine = pickLine(dialogueLines.suspicious, next.z);
      next.lineTimer = 3.0;
    }
  } else {
    // Decay suspicion gently when out of LOS
    next.suspicion = Math.max(0, next.suspicion - clampedDt * 16);

    if (canHear && next.aiState !== 'CHASE') {
      next.lastKnownPlayerX = player.playerX;
      next.lastKnownPlayerZ = player.playerZ;
      next.targetX = player.playerX;
      next.targetZ = player.playerZ;
      if (next.aiState === 'PATROL' || next.aiState === 'RETURN_TO_PATROL') {
        next.aiState = 'SUSPICIOUS';
        next.stateTimer = 1.0;
        next.suspicion = Math.max(next.suspicion, 38);
        next.activeLine = pickLine(dialogueLines.suspicious, player.playerX);
        next.lineTimer = 3.0;
      } else if (next.aiState === 'SUSPICIOUS' || next.aiState === 'SEARCH') {
        next.aiState = 'INVESTIGATE';
        next.stateTimer = 4.5;
        next.suspicion = Math.max(next.suspicion, 60);
      }
    }
  }

  // 3. Execute Current AI State Behavior
  let caughtPlayer = false;

  switch (next.aiState) {
    case 'PATROL': {
      const wpIdx = next.waypointIndex % patrolRoute.length;
      const wp = patrolRoute[wpIdx];
      const distWp = Math.hypot(wp.x - next.x, wp.z - next.z);
      if (distWp > 0.2) {
        const moved = moveTowardPoint(next.x, next.z, wp.x, wp.z, effectivePatrolSpeed, clampedDt);
        next.x = moved.x;
        next.z = moved.z;
        next.yaw = moved.yaw;
      } else {
        next.stateTimer -= clampedDt;
        const yawDiff = normalizeAngle(wp.lookYaw - next.yaw);
        next.yaw += yawDiff * Math.min(1, clampedDt * 4);
        if (next.stateTimer <= 0) {
          next.waypointIndex = (wpIdx + 1) % patrolRoute.length;
          next.stateTimer = patrolRoute[next.waypointIndex].dwellSeconds;
          if (!next.activeLine && next.waypointIndex % 2 === 0) {
            next.activeLine = pickLine(dialogueLines.patrol, next.waypointIndex);
            next.lineTimer = 3.6;
          }
        }
      }
      break;
    }

    case 'SUSPICIOUS': {
      if (next.targetX !== null && next.targetZ !== null) {
        const lookAtStimulus = Math.atan2(next.targetX - next.x, next.targetZ - next.z);
        const diff = normalizeAngle(lookAtStimulus - next.yaw);
        next.yaw += diff * Math.min(1, clampedDt * 5);
      }
      next.stateTimer -= clampedDt;
      if (next.stateTimer <= 0) {
        if (next.suspicion >= 35 && next.targetX !== null && next.targetZ !== null) {
          next.aiState = 'INVESTIGATE';
          next.stateTimer = 5.0;
          next.activeLine = pickLine(dialogueLines.investigate, next.x);
          next.lineTimer = 3.2;
        } else {
          next.aiState = 'RETURN_TO_PATROL';
          next.waypointIndex = findNearestWaypointIndex(next.x, next.z, patrolRoute);
        }
      }
      break;
    }

    case 'INVESTIGATE': {
      if (next.targetX === null || next.targetZ === null) {
        next.aiState = 'SEARCH';
        next.stateTimer = 3.2;
        break;
      }
      const moved = moveTowardPoint(
        next.x,
        next.z,
        next.targetX,
        next.targetZ,
        effectiveInvestigateSpeed,
        clampedDt,
      );
      next.x = moved.x;
      next.z = moved.z;
      next.yaw = moved.yaw;
      if (moved.arrived) {
        next.aiState = 'SEARCH';
        next.stateTimer = 3.5;
        next.activeLine = pickLine(dialogueLines.search, next.z);
        next.lineTimer = 3.2;
      }
      break;
    }

    case 'CHASE': {
      // Catch check (never catches player locked inside a locker unless caught entering!)
      if (!player.playerHidden && distToPlayer <= 1.25 && hasLos && next.catchCooldown <= 0) {
        caughtPlayer = true;
        break;
      }

      const tx = next.lastKnownPlayerX ?? next.targetX ?? 0;
      const tz = next.lastKnownPlayerZ ?? next.targetZ ?? 0;
      const moved = moveTowardPoint(next.x, next.z, tx, tz, effectiveChaseSpeed, clampedDt);
      next.x = moved.x;
      next.z = moved.z;
      next.yaw = moved.yaw;

      if (!hasLos) {
        next.stateTimer -= clampedDt;
        if (moved.arrived || next.stateTimer <= 0) {
          next.aiState = 'SEARCH';
          next.stateTimer = 4.0;
          next.activeLine = pickLine(dialogueLines.search, next.x + next.z);
          next.lineTimer = 3.4;
        }
      }
      break;
    }

    case 'SEARCH': {
      next.stateTimer -= clampedDt;
      next.yaw += Math.sin(next.stateTimer * 2.8) * clampedDt * 2.1;
      if (next.stateTimer <= 0) {
        next.aiState = 'RETURN_TO_PATROL';
        next.waypointIndex = findNearestWaypointIndex(next.x, next.z, patrolRoute);
        next.activeLine = pickLine(dialogueLines.returnToPatrol, next.waypointIndex);
        next.lineTimer = 3.0;
      }
      break;
    }

    case 'RETURN_TO_PATROL': {
      const wpIdx = next.waypointIndex % patrolRoute.length;
      const wp = patrolRoute[wpIdx];
      const moved = moveTowardPoint(next.x, next.z, wp.x, wp.z, effectivePatrolSpeed, clampedDt);
      next.x = moved.x;
      next.z = moved.z;
      next.yaw = moved.yaw;
      if (moved.arrived) {
        next.aiState = 'PATROL';
        next.stateTimer = wp.dwellSeconds;
        next.targetX = null;
        next.targetZ = null;
      }
      break;
    }
  }

  return {
    next,
    caughtPlayer,
    stateChanged: next.aiState !== prevState,
  };
}
