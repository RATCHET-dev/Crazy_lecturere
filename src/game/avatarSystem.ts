import { MadukaAiState, StudentRank } from './types';
import { AabbBox } from './types';

export type AvatarId = 'tunde' | 'amara' | 'daniel' | 'victor';
export type AvatarExpression =
  | 'neutral'
  | 'frightened'
  | 'surprised'
  | 'exhausted'
  | 'determined';
export type AvatarEmoteId = 'wave' | 'boogie' | 'spin' | 'taunt' | 'throw_plane';

export interface PlayableAvatarDef {
  id: AvatarId;
  defaultName: string;
  roleLabel: string;
  startingRank: StudentRank;
  hoodieColor: string;
  skinColor: string;
  accentColor: string;
  hasGlasses: boolean;
  packStyle: 'backpack' | 'satchel';
  headbandColor: string | null;
  tagline: string;
}

export const PLAYABLE_AVATARS: PlayableAvatarDef[] = [
  {
    id: 'tunde',
    defaultName: 'Tunde Adeyemi',
    roleLabel: 'Late Arrival',
    startingRank: 'C',
    hoodieColor: '#2a7f86',
    skinColor: '#a06c48',
    accentColor: '#e0a526',
    hasGlasses: false,
    packStyle: 'backpack',
    headbandColor: null,
    tagline: 'Teal hoodie, fast feet, questionable punctuality.',
  },
  {
    id: 'amara',
    defaultName: 'Amara Johnson',
    roleLabel: 'Library Sleuth',
    startingRank: 'B',
    hoodieColor: '#246b5c',
    skinColor: '#8f5a38',
    accentColor: '#d99b43',
    hasGlasses: false,
    packStyle: 'satchel',
    headbandColor: '#d99b43',
    tagline: 'Calm strategist investigating Project Merit archives.',
  },
  {
    id: 'daniel',
    defaultName: 'Daniel Okafor',
    roleLabel: 'Lab Observer',
    startingRank: 'B',
    hoodieColor: '#2563eb',
    skinColor: '#9b6440',
    accentColor: '#6fd0c8',
    hasGlasses: true,
    packStyle: 'backpack',
    headbandColor: null,
    tagline: 'Knows every blind spot in Lecture Hall A-104.',
  },
  {
    id: 'victor',
    defaultName: 'Victor Adebayo',
    roleLabel: 'Honors Rival',
    startingRank: 'A',
    hoodieColor: '#991b1b',
    skinColor: '#7e4e31',
    accentColor: '#f59e0b',
    hasGlasses: false,
    packStyle: 'satchel',
    headbandColor: null,
    tagline: 'Refuses to lose an academic duel to Maduka.',
  },
];

export function getAvatarDef(id: AvatarId): PlayableAvatarDef {
  return PLAYABLE_AVATARS.find((a) => a.id === id) ?? PLAYABLE_AVATARS[0];
}

export function resolveAvatarExpression(input: {
  madukaState: MadukaAiState;
  lockdownTriggered: boolean;
  stamina: number;
  activeEmote: AvatarEmoteId | null;
  determinedTimer: number;
}): AvatarExpression {
  if (input.lockdownTriggered && input.madukaState === 'CHASE') {
    return 'frightened';
  }
  if (
    input.lockdownTriggered &&
    (input.madukaState === 'SUSPICIOUS' || input.madukaState === 'INVESTIGATE')
  ) {
    return 'surprised';
  }
  if (input.determinedTimer > 0 || input.activeEmote === 'spin' || input.activeEmote === 'throw_plane') {
    return 'determined';
  }
  if (input.stamina < 30) {
    return 'exhausted';
  }
  return 'neutral';
}

export interface PaperAirplaneState {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  age: number;
  landed: boolean;
}

export function createPaperAirplane(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
): PaperAirplaneState {
  const speed = 11.5;
  const cosP = Math.cos(Math.max(-0.5, Math.min(0.7, pitch + 0.12)));
  const sinP = Math.sin(Math.max(-0.5, Math.min(0.7, pitch + 0.12)));
  return {
    active: true,
    x: x - Math.sin(yaw) * 0.45,
    y: y - 0.15,
    z: z - Math.cos(yaw) * 0.45,
    vx: -Math.sin(yaw) * cosP * speed,
    vy: sinP * speed + 1.4,
    vz: -Math.cos(yaw) * cosP * speed,
    yaw,
    age: 0,
    landed: false,
  };
}

export function stepPaperAirplane(
  plane: PaperAirplaneState,
  dt: number,
  colliders: AabbBox[],
): { next: PaperAirplaneState; justLanded: boolean } {
  if (!plane.active) {
    return { next: plane, justLanded: false };
  }

  const nextAge = plane.age + dt;
  if (plane.landed) {
    // Keep visible on floor for a moment before fading
    return {
      next: { ...plane, age: nextAge, active: nextAge < 6.5 },
      justLanded: false,
    };
  }

  // Gentle paper glide physics (low gravity + slight lift + air drag)
  const drag = Math.exp(-0.65 * dt);
  const vx = plane.vx * drag;
  const vz = plane.vz * drag;
  const vy = (plane.vy - 4.2 * dt) * drag;

  const nx = plane.x + vx * dt;
  const ny = plane.y + vy * dt;
  const nz = plane.z + vz * dt;

  // Check collision against walls/pillars/lockers above desk height, or floor
  let hitWall = nx < -11.4 || nx > 11.4 || nz < -12.0 || nz > 12.0;
  if (!hitWall) {
    for (const box of colliders) {
      if (nx >= box.minX && nx <= box.maxX && nz >= box.minZ && nz <= box.maxZ && ny <= box.height) {
        hitWall = true;
        break;
      }
    }
  }

  if (ny <= 0.06 || hitWall) {
    return {
      next: {
        ...plane,
        x: hitWall ? plane.x : nx,
        y: Math.max(0.06, hitWall ? plane.y : 0.06),
        z: hitWall ? plane.z : nz,
        vx: 0,
        vy: 0,
        vz: 0,
        age: nextAge,
        landed: true,
      },
      justLanded: true,
    };
  }

  return {
    next: {
      ...plane,
      x: nx,
      y: ny,
      z: nz,
      vx,
      vy,
      vz,
      age: nextAge,
    },
    justLanded: false,
  };
}

export const PLAYFUL_MADUKA_LINES: Record<AvatarEmoteId, string[]> = {
  wave: [
    'Put your hand down! Attendance closed seventeen minutes ago!',
    'Waving will not earn extra credit during a lockdown.',
  ],
  boogie: [
    'WHO IS DANCING IN MY LECTURE HALL?!',
    'Save that footwork for running toward your graduation requirements!',
  ],
  spin: [
    'Acrobatics in Computer Science 301?! Stop spinning immediately!',
    'Centrifugal motion will not dodge an F grade!',
  ],
  taunt: [
    'Was that a cheeky cough? Speak up and define Dijkstra’s algorithm!',
    'Mocking the syllabus? Bold choice for someone on thin ice!',
  ],
  throw_plane: [
    'A PAPER AIRPLANE?! Who folded CS-301 lecture notes?!',
    'Aviation in Lecture Hall A-104 is strictly unauthorized!',
  ],
};
